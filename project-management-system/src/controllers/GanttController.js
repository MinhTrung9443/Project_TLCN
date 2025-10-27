const gantService = require("../services/GanttService.js");

const GanttController = {
  getGanttData: async (req, res) => {
    try {
      const { filter, groupby } = req.body;
      const gantData = await gantService.getGanttData(filter, groupby);
      res.status(200).json({
        message: "Gantt data retrieved successfully",
        data: gantData,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },
};

module.exports = GanttController;
