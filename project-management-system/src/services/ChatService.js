const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Project = require("../models/Project"); 
const Group = require("../models/Group");

class ChatService {
  async getConversationDetails(conversationId) {
      const conv = await Conversation.findById(conversationId)
          .populate("participants", "username email avatar fullname")
          .populate("projectId", "name members")
          .populate("teamId", "name members leaderId");
      
      if (!conv) throw new Error("Conversation not found");

      let members = [];
      if (conv.type === "DIRECT") {
          members = conv.participants;
      } else if (conv.type === "PROJECT") {
          // Fetch from Project - Aggregate all members from Project.members and Project.teams
          const project = await Project.findById(conv.projectId)
              .populate("members.userId", "username email avatar fullname")
              .populate("teams.members", "username email avatar fullname")
              .populate("teams.leaderId", "username email avatar fullname");

          if (project) {
              const fullMembers = new Map();

              // 1. Add direct project members
              if (project.members) {
                  project.members.forEach(m => {
                      if (m.userId) {
                          fullMembers.set(m.userId._id.toString(), {
                              ...m.userId.toObject(),
                              role: m.role
                          });
                      }
                  });
              }

              // 2. Add members from teams
              if (project.teams) {
                  project.teams.forEach(team => {
                        // Leader
                        if (team.leaderId) {
                            const leaderId = team.leaderId._id.toString();
                            if (!fullMembers.has(leaderId)) {
                                fullMembers.set(leaderId, { ...team.leaderId.toObject(), role: "TEAM_LEADER" });
                            }
                        }
                        // Members
                        if (team.members) {
                            team.members.forEach(tm => {
                                const tmId = tm._id.toString();
                                if (!fullMembers.has(tmId)) {
                                    fullMembers.set(tmId, { ...tm.toObject(), role: "TEAM_MEMBER" });
                                }
                            });
                        }
                  });
              }
              
              members = Array.from(fullMembers.values());
          }
      } else if (conv.type === "TEAM") {
           // Fetch from Team (Group) which is embedded in Project usually, OR referenced by teamId if Group model is used separately
           // In getProjectChannels logic: teams are inside Project.teams
           // But here we have teamId ref to Group? 
           // Let's check getProjectChannels... it uses project.teams which has teamId (Group)
           // So yes, fetch Group
           const group = await Group.findById(conv.teamId).populate("members", "username email avatar fullname");
           if (group) {
              members = group.members || [];
              // Add leader if not in members? Usually leader is separate or included.
              if (group.leaderId) {
                  const leader = await User.findById(group.leaderId).select("username email avatar fullname");
                  if (leader && !members.find(m => m._id.toString() === leader._id.toString())) {
                      members.push({ ...leader.toObject(), role: "LEADER" });
                  }
              }
           }
      }
      return { ...conv.toObject(), members };
  }

  async searchMessages(conversationId, keyword) {
      const regex = new RegExp(keyword, 'i');
      return await Message.find({
          conversationId,
          content: { $regex: regex }
      })
      .populate("sender", "username email avatar")
      .sort({ createdAt: -1 });
  }

  async getAttachments(conversationId, type = 'all') {
      const query = { conversationId, attachments: { $not: { $size: 0 } } };
      if (type !== 'all') {
          query['attachments.type'] = type; 
      }
      
      const messages = await Message.find(query)
          .select("attachments sender createdAt")
          .populate("sender", "username avatar")
          .sort({ createdAt: -1 });

      // Flatten attachments
      const files = [];
      messages.forEach(msg => {
          msg.attachments.forEach(att => {
              if (type === 'all' || att.type === type) {
                  files.push({
                      ...att.toObject(),
                      sender: msg.sender,
                      createdAt: msg.createdAt,
                      messageId: msg._id
                  });
              }
          });
      });
      return files;
  }

  async _getUnreadCount(conversationId, userId) {
    return await Message.countDocuments({
      conversationId: conversationId,
      readBy: { $ne: userId }
    });
  }

  // 1. Gửi tin nhắn
  async sendMessage(senderId, content, conversationId, attachments, replyTo = null) {
    if (!content && (!attachments || attachments.length === 0)) {
      throw new Error("Message must contain content or attachments");
    }

    const newMessage = {
      sender: senderId,
      content: content,
      conversationId: conversationId,
      attachments: attachments || [],
      replyTo: replyTo,
    };

    let message = await Message.create(newMessage);

    // Populate sender info
    message = await message.populate("sender", "username email avatar");
    message = await message.populate("conversationId");
    message = await message.populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" }
    });
    
    // Auto add sender to readBy (optional, already handled by update logic usually)
    message.readBy.push(senderId);
    await message.save();

    message = await User.populate(message, {
      path: "conversationId.participants",
      select: "username email avatar",
    });

    // Cập nhật lastMessage
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    return message;
  }

  async recallMessage(messageId, userId) {
      const message = await Message.findById(messageId);
      if (!message) throw new Error("Message not found");
      
      if (message.sender.toString() !== userId.toString()) {
          throw new Error("You can only recall your own messages");
      }

      // Check time limit (e.g. 5 minutes)
      const diff = new Date() - new Date(message.createdAt);
      if (diff > 5 * 60 * 1000) {
           throw new Error("Message is too old to recall (limit 5m)");
      }

      message.isRecalled = true;
      await message.save();
      return message;
  }
  
  async toggleReaction(messageId, userId, type) {
      const message = await Message.findById(messageId);
      if (!message) throw new Error("Message not found");

      const existingIndex = message.reactions.findIndex(r => r.userId.toString() === userId.toString());
      
      if (existingIndex > -1) {
          // If clicking same reaction -> remove it
          if (message.reactions[existingIndex].type === type) {
              message.reactions.splice(existingIndex, 1);
          } else {
              // Change reaction
              message.reactions[existingIndex].type = type;
          }
      } else {
          // Add new
          message.reactions.push({ userId, type });
      }
      
      await message.save();
      return message; // Return full message for easy updates
  }

  // 2. Lấy tin nhắn của hội thoại
  async getAllMessages(conversationId) {
    const messages = await Message.find({ conversationId: conversationId })
      .populate("sender", "username email avatar")
      .populate({
          path: "replyTo",
          select: "content sender attachments",
          populate: { path: "sender", select: "username" }
      })
      .sort({ createdAt: 1 });
    return messages;
  }

  // 3. Truy cập/Tạo Chat 1-1
  async accessChat(currentUserId, targetUserId) {
    if (!targetUserId) {
      throw new Error("UserId param not sent with request");
    }

    let isChat = await Conversation.find({
      type: "DIRECT",
      $and: [
        { participants: { $elemMatch: { $eq: currentUserId } } },
        { participants: { $elemMatch: { $eq: targetUserId } } },
      ],
    })
      .populate("participants", "-password")
      .populate("lastMessage");

    isChat = await User.populate(isChat, {
      path: "lastMessage.sender",
      select: "username email avatar",
    });

    if (isChat.length > 0) {
      return isChat[0];
    } else {
      const chatData = {
        name: "sender",
        participants: [currentUserId, targetUserId],
        type: "DIRECT",
      };

      const createdChat = await Conversation.create(chatData);
      const fullChat = await Conversation.findOne({ _id: createdChat._id }).populate(
        "participants",
        "-password"
      );
      return fullChat;
    }
  }

  // 4. Lấy danh sách Chat 1-1
  async fetchChats(currentUserId) {
    const result = await Conversation.find({
      participants: { $elemMatch: { $eq: currentUserId } },
      type: "DIRECT",
    })
      .populate("participants", "-password")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    const finalResult = await User.populate(result, {
      path: "lastMessage.sender",
      select: "username email avatar",
    });

    // Attach unread count
    const chatsWithCount = await Promise.all(finalResult.map(async (chat) => {
        const unread = await this._getUnreadCount(chat._id, currentUserId);
        return { ...chat.toObject(), unreadCount: unread };
    }));

    return chatsWithCount;
  }

  // 5. Lấy cấu trúc Chat Project (Project + Teams)
  async getProjectChannels(currentUserId, projectId) {
    const project = await Project.findOne({
      _id: projectId,
      isDeleted: false,
    }).populate("teams.teamId");

    if (!project) {
        throw new Error("Project not found or deleted");
    }

    const memberRecord = (project.members || []).find(m => m.userId.toString() === currentUserId.toString());
    
    let isTeamMember = false;
    if (project.teams) {
        isTeamMember = project.teams.some(team => {
             const isLeader = team.leaderId && team.leaderId.toString() === currentUserId.toString();
             const isMem = team.members && team.members.some(m => m.toString() === currentUserId.toString());
             return isLeader || isMem;
        });
    }

    if (!memberRecord && !isTeamMember) {
        throw new Error("Access denied: You are not a member of this project");
    }

    const isManager = memberRecord && (memberRecord.role === "PROJECT_MANAGER" || memberRecord.role === "LEADER");

    let generalChat = await Conversation.findOne({
      projectId: projectId,
      type: "PROJECT",
    }).populate("lastMessage");

    if (!generalChat) {
      generalChat = await Conversation.create({
        name: "General",
        type: "PROJECT",
        projectId: projectId,
      });
    }

    let targetTeams = [];

    if (isManager) {
        targetTeams = project.teams;
    } else {
        targetTeams = project.teams.filter((t) => {
            const isLeader = t.leaderId && t.leaderId.toString() === currentUserId.toString();
            const isMem = t.members && t.members.some((m) => m.toString() === currentUserId.toString());
            return isLeader || isMem;
        });
    }

    // Attach unread for General
    const generalUnread = await this._getUnreadCount(generalChat._id, currentUserId);
    const generalChatObj = { ...generalChat.toObject(), unreadCount: generalUnread };

    const teamChats = [];
    for (const teamConfig of targetTeams) {
      if (!teamConfig.teamId) continue;
      
      let tChat = await Conversation.findOne({
        projectId: projectId,
        teamId: teamConfig.teamId._id,
        type: "TEAM",
      }).populate("lastMessage");

      if (!tChat) {
        tChat = await Conversation.create({
          name: teamConfig.teamId.name || "Team Chat", 
          type: "TEAM",
          projectId: projectId,
          teamId: teamConfig.teamId._id,
        });
      }
      
      const unread = await this._getUnreadCount(tChat._id, currentUserId);
      teamChats.push({ ...tChat.toObject(), unreadCount: unread });
    }
    
    teamChats.sort((a, b) => {
        const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
        const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
        return dateB - dateA;
    });

    return {
      general: generalChatObj,
      teams: teamChats,
    };
  }
}

module.exports = new ChatService();