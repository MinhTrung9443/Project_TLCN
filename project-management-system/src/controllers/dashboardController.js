const dashboardService = require("../services/dashboardService");

exports.getUserOverview = async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await dashboardService.getUserOverview(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await dashboardService.getMyTasks(userId, req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getUserActivityFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;
    const data = await dashboardService.getUserActivityFeed(userId, limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await dashboardService.getUserStats(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await dashboardService.getUserProjects(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
