const groupService = require("../services/GroupService");

class GroupController {
  async getAllGroups(req, res) {
    try {
      const groups = await groupService.getAllGroupsWithCounts();
      res.status(200).json({
        message: "Groups fetched successfully",
        data: groups,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  }

  async createGroup(req, res) {
    try {
      const { name, description, status } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
      const newGroup = await groupService.createGroup({ name, description, status }, userId);
      res.status(201).json({
        message: "Group created successfully",
        data: newGroup,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  }

  async updateGroup(req, res) {
    try {
      const groupId = req.params.id;
      const updateData = req.body;
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
      const updatedGroup = await groupService.updateGroup(groupId, updateData, userId);
      res.status(200).json({
        message: "Group updated successfully",
        data: updatedGroup,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async deleteGroup(req, res) {
    try {
      const groupId = req.params.id;
      await groupService.deleteGroup(groupId);
      res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async addMember(req, res) {
    try {
      const { id: groupId } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const updatedGroup = await groupService.addMember(groupId, userId);
      res.status(200).json({
        message: "Member added successfully",
        data: updatedGroup,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getMembers(req, res) {
    try {
      const { id: groupId } = req.params;
      const filters = req.query;
      const members = await groupService.getMembers(groupId, filters);
      res.status(200).json({
        message: "Members fetched successfully",
        data: members,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
  async getGroupById(req, res) {
    try {
      const group = await groupService.getGroupById(req.params.id);
      res.status(200).json({
        message: "Group fetched successfully",
        data: group,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async removeMember(req, res) {
    try {
      const { id: groupId, userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const removedBy = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
      const updatedGroup = await groupService.removeMember(groupId, userId, removedBy);
      res.status(200).json({
        message: "Member removed successfully",
        data: updatedGroup,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}

module.exports = new GroupController();
