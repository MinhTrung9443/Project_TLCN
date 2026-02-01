const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Project = require("../models/Project"); 
const Group = require("../models/Group");

class ChatService {
  // 1. Gửi tin nhắn
  async sendMessage(senderId, content, conversationId, attachments) {
    if (!content && (!attachments || attachments.length === 0)) {
      throw new Error("Message must contain content or attachments");
    }

    const newMessage = {
      sender: senderId,
      content: content,
      conversationId: conversationId,
      attachments: attachments || [],
    };

    let message = await Message.create(newMessage);

    // Populate sender info
    message = await message.populate("sender", "username email avatar");
    message = await message.populate("conversationId");
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

  // 2. Lấy tin nhắn của hội thoại
  async getAllMessages(conversationId) {
    const messages = await Message.find({ conversationId: conversationId })
      .populate("sender", "username email avatar")
      .sort({ createdAt: 1 });
    return messages;
  }

  // 3. Truy cập/Tạo Chat 1-1
  async accessChat(currentUserId, targetUserId) {
    if (!targetUserId) {
      throw new Error("UserId param not sent with request");
    }

    let isChat = await Conversation.find({
      isGroupChat: false,
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
        isGroupChat: false,
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

    return finalResult;
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
            const isTeamMem = t.members && t.members.some((m) => m.toString() === currentUserId.toString());
            return isLeader || isTeamMember; 
        });
         targetTeams = project.teams.filter((t) => {
            const isLeader = t.leaderId && t.leaderId.toString() === currentUserId.toString();
            const isMem = t.members && t.members.some((m) => m.toString() === currentUserId.toString());
            return isLeader || isMem;
        });
    }

    const teamChats = [];
    for (const teamConfig of targetTeams) {
      let tChat = await Conversation.findOne({
        projectId: projectId,
        teamId: teamConfig.teamId._id,
        type: "TEAM",
      }).populate("lastMessage");

      if (!tChat) {
        const teamName = teamConfig.teamId ? teamConfig.teamId.name : "Unknown Team";
        tChat = await Conversation.create({
          name: teamName, 
          type: "TEAM",
          projectId: projectId,
          teamId: teamConfig.teamId._id,
        });
      }
      teamChats.push(tChat);
    }

    return {
      general: generalChat,
      teams: teamChats,
    };
  }
}

module.exports = new ChatService();