const Group = require('../models/Group');
const User = require('../models/User');
const createError = require('http-errors');

class GroupService {
  async getAllGroupsWithCounts() {
    const groups = await Group.aggregate([
      {
        $lookup: {
          from: 'users', 
          localField: 'members',
          foreignField: '_id',
          as: 'memberDetails',
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
                input: '$memberDetails',
                as: 'member',
                cond: { $eq: ['$$member.status', 'active'] },
              },
            },
          },
          totalInactives: {
            $size: {
              $filter: {
                input: '$memberDetails',
                as: 'member',
                cond: { $eq: ['$$member.status', 'inactive'] },
              },
            },
          },
        },
      },
      { $sort: { name: 1 } }
    ]);

    return groups;
  }

  async createGroup(groupData) {
    const { name, description, status } = groupData;
    const newGroup = new Group({ name, description, status });
    await newGroup.save();
    return newGroup;
  }

  async updateGroup(groupId, updateData) {
    const allowedUpdates = ['name', 'description', 'status'];
    const updates = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const updatedGroup = await Group.findByIdAndUpdate(groupId, updates, { new: true });
    
    if (!updatedGroup) {
      throw createError(404, 'Group not found');
    }
    
    return updatedGroup;
  }

  async deleteGroup(groupId) {
    const result = await Group.findByIdAndDelete(groupId);
    if (!result) {
      throw createError(404, 'Group not found');
    }
  }

  async addMember(groupId, userId) {
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      throw createError(404, 'User to add not found');
    }
    if (userToAdd.status !== 'active') {
      throw createError(400, 'Only active users can be added to a group');
    }
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true }
    );

    if (!group) {
      throw createError(404, 'Group not found');
    }

    return group;
  }

  async getMembers(groupId, filters = {}) {
    const group = await Group.findById(groupId).populate({
        path: 'members',
        match: filters,
        select: '-password'
    });

    if (!group) {
        throw createError(404, 'Group not found');
    }

    return group.members;
  }
  async getGroupById(groupId) {
    const group = await Group.findById(groupId).select('name description status');
    if (!group) {
      throw createError(404, 'Group not found');
    }
    return group;
  }
}
module.exports = new GroupService();