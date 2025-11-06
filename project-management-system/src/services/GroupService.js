const Group = require("../models/Group");
const User = require("../models/User");
const createError = require("http-errors");
const { logAction } = require("./AuditLogHelper");

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

  async addMember(groupId, userId) {
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
}
module.exports = new GroupService();
