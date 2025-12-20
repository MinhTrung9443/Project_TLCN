const Group = require("../models/Group");
const User = require("../models/User");
const createError = require("http-errors");
const { logAction } = require("./AuditLogHelper");
const notificationService = require("./NotificationService");

class GroupService {
  async getAllGroupsWithCounts() {
    const groups = await Group.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "memberDetails",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          status: 1,
          createdAt: 1,
          members: 1,
          totalActives: {
            $size: {
              $filter: {
                input: "$memberDetails",
                as: "member",
                cond: { $eq: ["$$member.status", "active"] },
              },
            },
          },
          totalInactives: {
            $size: {
              $filter: {
                input: "$memberDetails",
                as: "member",
                cond: { $eq: ["$$member.status", "inactive"] },
              },
            },
          },
        },
      },
      { $sort: { name: 1 } },
    ]);

    return groups;
  }

  async createGroup(groupData, userId) {
    const { name, description, status } = groupData;
    const newGroup = new Group({ name, description, status });
    await newGroup.save();
    await logAction({
      userId,
      action: "create_group",
      tableName: "Group",
      recordId: newGroup._id,
      newData: newGroup,
    });
    return newGroup;
  }

  async updateGroup(groupId, updateData, userId) {
    const allowedUpdates = ["name", "description", "status"];
    const updates = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const group = await Group.findById(groupId);
    if (!group) throw new Error("Group not found");
    const oldGroup = group.toObject();
    Object.assign(group, updates);
    await group.save();
    await logAction({
      userId,
      action: "update_group",
      tableName: "Group",
      recordId: group._id,
      oldData: oldGroup,
      newData: group,
    });
    return group;
  }

  async deleteGroup(groupId) {
    const result = await Group.findByIdAndDelete(groupId);
    if (!result) {
      throw createError(404, "Group not found");
    }
  }

  async addMember(groupId, userId, addedBy = null) {
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      throw createError(404, "User to add not found");
    }
    if (userToAdd.status !== "active") {
      throw createError(400, "Only active users can be added to a group");
    }
    const group = await Group.findByIdAndUpdate(groupId, { $addToSet: { members: userId } }, { new: true });

    await User.findByIdAndUpdate(userId, { $addToSet: { group: groupId } });

    if (!group) {
      throw createError(404, "Group not found");
    }

    // Gửi thông báo cho member mới
    try {
      let addedByName = "Group Admin";
      if (addedBy) {
        const adder = await User.findById(addedBy);
        addedByName = adder?.fullname || "Group Admin";
      }

      await notificationService.notifyGroupMemberAdded({
        groupId: group._id,
        groupName: group.name,
        newMemberId: userId,
        addedByName,
      });
    } catch (notificationError) {
      console.error("Failed to send group member added notification:", notificationError);
    }

    return group;
  }

  async addMembers(groupId, userIds, addedBy = null) {
    // Validate all users exist and are active
    const users = await User.find({ _id: { $in: userIds } });

    if (users.length !== userIds.length) {
      throw createError(404, "One or more users not found");
    }

    const inactiveUsers = users.filter((u) => u.status !== "active");
    if (inactiveUsers.length > 0) {
      throw createError(400, "Only active users can be added to a group");
    }

    // Add all members to group
    const group = await Group.findByIdAndUpdate(groupId, { $addToSet: { members: { $each: userIds } } }, { new: true });

    if (!group) {
      throw createError(404, "Group not found");
    }

    // Update all users to include this group
    await User.updateMany({ _id: { $in: userIds } }, { $addToSet: { group: groupId } });

    // Send notifications to all new members
    try {
      let addedByName = "Group Admin";
      if (addedBy) {
        const adder = await User.findById(addedBy);
        addedByName = adder?.fullname || "Group Admin";
      }

      for (const userId of userIds) {
        await notificationService.notifyGroupMemberAdded({
          groupId: group._id,
          groupName: group.name,
          newMemberId: userId,
          addedByName,
        });
      }
    } catch (notificationError) {
      console.error("Failed to send group member added notifications:", notificationError);
    }

    return group;
  }

  async getMembers(groupId, filters = {}) {
    const group = await Group.findById(groupId).populate({
      path: "members",
      match: filters,
      select: "-password",
    });

    if (!group) {
      throw createError(404, "Group not found");
    }

    return group.members;
  }
  async getGroupById(groupId) {
    const group = await Group.findById(groupId).select("name description status");
    if (!group) {
      throw createError(404, "Group not found");
    }
    return group;
  }

  async removeMember(groupId, userId, removedBy = null) {
    const userToRemove = await User.findById(userId);
    if (!userToRemove) {
      throw createError(404, "User not found");
    }

    const group = await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } }, { new: true });

    if (!group) {
      throw createError(404, "Group not found");
    }

    // Remove group from user's group array
    await User.findByIdAndUpdate(userId, { $pull: { group: groupId } });

    // Log action
    if (removedBy) {
      await logAction({
        userId: removedBy,
        action: "remove_group_member",
        tableName: "Group",
        recordId: group._id,
        oldData: { memberId: userId, memberName: userToRemove.fullname },
      });
    }

    // Send notification
    try {
      let removedByName = "Group Admin";
      if (removedBy) {
        const remover = await User.findById(removedBy);
        removedByName = remover?.fullname || "Group Admin";
      }

      await notificationService.createAndSend({
        recipientId: userId,
        type: "group_member_removed",
        title: "Removed from Group",
        message: `You have been removed from group "${group.name}" by ${removedByName}`,
        relatedEntityType: "Group",
        relatedEntityId: group._id,
      });
    } catch (notificationError) {
      console.error("Failed to send group member removed notification:", notificationError);
    }

    return group;
  }
}
module.exports = new GroupService();
