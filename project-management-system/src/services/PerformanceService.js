const Task = require("../models/Task");
const TimeLog = require("../models/TimeLog");
const User = require("../models/User");
const Project = require("../models/Project");
const Workflow = require("../models/Workflow");
const mongoose = require("mongoose");

const performanceService = {
  /**
   * Tính toán SPI (Schedule Performance Index) cho một task
   * SPI = (estimatedTime × progress) / actualTime
   * SPI > 1.0: Hiệu suất tốt
   * SPI = 1.0: Đúng kế hoạch
   * SPI < 1.0: Chậm tiến độ
   */
  calculateTaskSPI: (task) => {
    if (!task.actualTime || task.actualTime === 0) {
      return null; // Chưa có dữ liệu
    }

    const estimatedTime = task.estimatedTime || 0;
    const progress = task.progress || 0;
    const actualTime = task.actualTime || 0;

    // SPI = (T_est × P_act) / T_act
    const spi = (estimatedTime * progress) / (actualTime * 100);

    return {
      spi: parseFloat(spi.toFixed(2)),
      estimatedTime,
      actualTime,
      progress,
      earnedValue: (estimatedTime * progress) / 100, // Công việc đã hoàn thành tính theo giờ
    };
  },

  /**
   * Lấy thống kê hiệu suất của một user trong một project
   */
  getUserPerformanceInProject: async (userId, projectId, options = {}) => {
    try {
      // Validate inputs
      if (!userId || !projectId) {
        throw { statusCode: 400, message: "userId and projectId are required" };
      }

      // Validate ObjectId format
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw { statusCode: 400, message: "Invalid userId format" };
      }
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw { statusCode: 400, message: "Invalid projectId format" };
      }

      const { startDate, endDate } = options;

      // Query filters
      const taskFilter = {
        projectId,
        assigneeId: userId,
      };

      if (startDate || endDate) {
        taskFilter.updatedAt = {};
        if (startDate) taskFilter.updatedAt.$gte = new Date(startDate);
        if (endDate) taskFilter.updatedAt.$lte = new Date(endDate);
      }

      // Lấy tất cả tasks của user
      const tasks = await Task.find(taskFilter).populate("taskTypeId", "name icon").populate("priorityId", "name").sort({ updatedAt: -1 });

      // Lấy workflow của project để get status details
      const workflow = await Workflow.findOne({ projectId });

      // Tạo map của statuses từ workflow
      const statusMap = new Map();
      if (workflow && workflow.statuses) {
        workflow.statuses.forEach((status) => {
          statusMap.set(status._id.toString(), status);
        });
      }

      // Tính toán SPI cho từng task
      const tasksWithSPI = tasks.map((task) => {
        const spiData = performanceService.calculateTaskSPI(task);
        const statusData = statusMap.get(task.statusId.toString());

        console.log(`Task ${task.key}: statusId=${task.statusId.toString()}, mapped status=${statusData?.name} (${statusData?.category})`);

        return {
          _id: task._id,
          key: task.key,
          name: task.name,
          estimatedTime: task.estimatedTime,
          actualTime: task.actualTime,
          progress: task.progress,
          status: statusData || { _id: task.statusId, name: "Unknown", category: "To Do" },
          taskType: task.taskTypeId,
          priority: task.priorityId,
          spi: spiData ? spiData.spi : null,
          earnedValue: spiData ? spiData.earnedValue : 0,
          isCompleted: task.progress === 100,
        };
      });

      // Tính toán tổng hợp
      let totalEstimatedTime = 0;
      let totalActualTime = 0;
      let totalEarnedValue = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;
      let todoTasks = 0;

      tasksWithSPI.forEach((task) => {
        totalEstimatedTime += task.estimatedTime || 0;
        totalActualTime += task.actualTime || 0;
        totalEarnedValue += task.earnedValue || 0;

        // Count based on status category
        const category = task.status?.category;

        if (category === "Done") {
          completedTasks++;
        } else if (category === "In Progress") {
          inProgressTasks++;
        } else if (category === "To Do") {
          todoTasks++;
        }
      });

      // SPI tổng thể = Tổng Earned Value / Tổng Actual Time
      const overallSPI = totalActualTime > 0 ? parseFloat((totalEarnedValue / totalActualTime).toFixed(2)) : null;

      // Phân loại hiệu suất
      let performanceRating = "No Data";
      if (overallSPI !== null) {
        if (overallSPI >= 1.2) performanceRating = "Excellent";
        else if (overallSPI >= 1.0) performanceRating = "Good";
        else if (overallSPI >= 0.8) performanceRating = "Average";
        else performanceRating = "Needs Improvement";
      }

      return {
        userId,
        projectId,
        tasks: tasksWithSPI,
        summary: {
          totalTasks: tasks.length,
          completedTasks,
          inProgressTasks,
          todoTasks,
          totalEstimatedTime: parseFloat(totalEstimatedTime.toFixed(2)),
          totalActualTime: parseFloat(totalActualTime.toFixed(2)),
          totalEarnedValue: parseFloat(totalEarnedValue.toFixed(2)),
          overallSPI,
          performanceRating,
          efficiency: overallSPI ? `${(overallSPI * 100).toFixed(0)}%` : "N/A",
        },
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy top performers trong một project
   */
  getTopPerformers: async (projectId, limit = 10) => {
    try {
      // Lấy tất cả tasks trong project đã có time log
      const tasks = await Task.find({
        projectId,
        actualTime: { $gt: 0 },
      }).populate("assigneeId", "fullname email avatar");

      // Nhóm theo user và tính SPI
      const userPerformanceMap = {};

      tasks.forEach((task) => {
        if (!task.assigneeId) return;

        const userId = task.assigneeId._id.toString();
        if (!userPerformanceMap[userId]) {
          userPerformanceMap[userId] = {
            user: task.assigneeId,
            totalEstimatedTime: 0,
            totalActualTime: 0,
            totalEarnedValue: 0,
            taskCount: 0,
          };
        }

        const spiData = performanceService.calculateTaskSPI(task);
        if (spiData) {
          userPerformanceMap[userId].totalEstimatedTime += task.estimatedTime || 0;
          userPerformanceMap[userId].totalActualTime += task.actualTime || 0;
          userPerformanceMap[userId].totalEarnedValue += spiData.earnedValue || 0;
          userPerformanceMap[userId].taskCount++;
        }
      });

      // Tính SPI cho từng user và sắp xếp
      const performers = Object.values(userPerformanceMap)
        .map((data) => {
          const spi = data.totalActualTime > 0 ? data.totalEarnedValue / data.totalActualTime : 0;
          return {
            userId: data.user._id,
            name: data.user.fullname,
            email: data.user.email,
            avatar: data.user.avatar,
            spi: parseFloat(spi.toFixed(2)),
            totalEstimatedTime: parseFloat(data.totalEstimatedTime.toFixed(2)),
            totalActualTime: parseFloat(data.totalActualTime.toFixed(2)),
            taskCount: data.taskCount,
          };
        })
        .sort((a, b) => b.spi - a.spi)
        .slice(0, limit);

      return performers;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy chi tiết time logs của user
   */
  getUserTimeLogs: async (userId, projectId, options = {}) => {
    try {
      const { startDate, endDate, limit = 50 } = options;

      // Lấy tất cả tasks của user trong project
      const tasks = await Task.find({
        projectId,
        assigneeId: userId,
      }).select("_id");

      const taskIds = tasks.map((t) => t._id);

      // Query time logs
      const timeLogFilter = {
        taskId: { $in: taskIds },
        userId,
      };

      if (startDate || endDate) {
        timeLogFilter.logDate = {};
        if (startDate) timeLogFilter.logDate.$gte = new Date(startDate);
        if (endDate) timeLogFilter.logDate.$lte = new Date(endDate);
      }

      const timeLogs = await TimeLog.find(timeLogFilter).populate("taskId", "key name").sort({ logDate: -1 }).limit(limit);

      return timeLogs;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get team progress statistics for a project
   */
  getTeamProgress: async (userId, projectId, teamId = null) => {
    try {
      // Get project with teams - populate Group for teamId to get group name
      const project = await Project.findById(projectId)
        .populate({
          path: "teams.teamId",
          model: "Group",
          select: "name status",
        })
        .populate("teams.leaderId", "fullname email")
        .populate("teams.members", "fullname email avatar")
        .populate("members.userId", "_id email");

      if (!project) {
        throw { statusCode: 404, message: "Project not found" };
      }

      console.log("Project teams:", JSON.stringify(project.teams, null, 2));

      // Check user permissions
      const user = await User.findById(userId);
      const isAdmin = user.role === "admin";
      const isPM = project.members.some((m) => (m.userId._id || m.userId).toString() === userId.toString() && m.role === "PROJECT_MANAGER");

      // If teamId specified, filter to that team only
      let teamsToAnalyze = project.teams || [];
      if (teamId) {
        teamsToAnalyze = teamsToAnalyze.filter((t) => (t.teamId?._id || t.teamId).toString() === teamId);
      }

      // If not admin or PM, filter to teams user leads
      if (!isAdmin && !isPM) {
        teamsToAnalyze = teamsToAnalyze.filter((t) => (t.leaderId?._id || t.leaderId).toString() === userId.toString());
      }

      // Calculate stats for each team
      const teamStats = {};

      for (const team of teamsToAnalyze) {
        const currentTeamId = team.teamId?._id || team.teamId;

        // Get member IDs from team.members (these are ObjectIds in the project.teams array)
        const memberIds = (team.members || []).map((m) => {
          // Handle both populated and non-populated members
          return mongoose.Types.ObjectId.isValid(m) ? m : m._id || m;
        });

        // IMPORTANT: Include leader in the member list for stats calculation
        const leaderId = team.leaderId?._id || team.leaderId;
        if (leaderId && !memberIds.some((id) => id.toString() === leaderId.toString())) {
          memberIds.push(leaderId);
        }

        console.log(`Processing team ${team.teamId?.name}, members (including leader):`, memberIds);

        if (memberIds.length === 0) {
          console.log(`Team ${team.teamId?.name} has no members`);
          teamStats[currentTeamId.toString()] = {
            totalTasks: 0,
            completedTasks: 0,
            totalTime: 0,
            completionRate: 0,
          };
          continue;
        }

        // Get tasks assigned to team members in this project
        const tasks = await Task.find({
          projectId: projectId,
          assigneeId: { $in: memberIds },
        }).select("_id status");

        console.log(`Team ${team.teamId?.name} tasks found:`, tasks.length);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === "done").length;

        // Get time logs for team members' tasks
        const taskIds = tasks.map((t) => t._id);
        const timeLogs = await TimeLog.find({
          taskId: { $in: taskIds },
          userId: { $in: memberIds },
        });

        const totalTime = timeLogs.reduce((sum, log) => sum + (log.timeSpent || 0), 0);

        console.log(`Team ${team.teamId?.name} stats:`, { totalTasks, completedTasks, totalTime });

        teamStats[currentTeamId.toString()] = {
          totalTasks,
          completedTasks,
          totalTime,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      }

      console.log("Final team stats:", teamStats);
      return teamStats;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get member progress statistics for a team
   */
  getMemberProgress: async (userId, projectId, teamId, memberId = null) => {
    try {
      // Get project with teams - populate Group for teamId to get group name
      const project = await Project.findById(projectId)
        .populate({
          path: "teams.teamId",
          model: "Group",
          select: "name status",
        })
        .populate("teams.leaderId", "fullname email")
        .populate("teams.members", "fullname email avatar")
        .populate("members.userId", "_id email");

      if (!project) {
        throw { statusCode: 404, message: "Project not found" };
      }

      // Find the specific team
      const team = project.teams.find((t) => (t.teamId?._id || t.teamId).toString() === teamId);

      if (!team) {
        throw { statusCode: 404, message: "Team not found" };
      }

      // Check user permissions
      const user = await User.findById(userId);
      const isAdmin = user.role === "admin";
      const isPM = project.members.some((m) => (m.userId._id || m.userId).toString() === userId.toString() && m.role === "PROJECT_MANAGER");
      const isLeader = (team.leaderId?._id || team.leaderId).toString() === userId.toString();

      if (!isAdmin && !isPM && !isLeader) {
        throw { statusCode: 403, message: "You don't have permission to view this team's progress" };
      }

      // Get members to analyze - INCLUDE LEADER
      let membersToAnalyze = [...(team.members || [])];

      // Add leader to members list if not already included
      const leaderId = team.leaderId?._id || team.leaderId;
      const leaderInMembers = membersToAnalyze.some((m) => {
        const mId = mongoose.Types.ObjectId.isValid(m) ? m : m._id || m;
        return mId.toString() === leaderId.toString();
      });

      if (!leaderInMembers && leaderId) {
        // Need to fetch leader info since it's not in members array
        const leaderUser = await User.findById(leaderId).select("fullname email avatar");
        if (leaderUser) {
          membersToAnalyze.push(leaderUser);
        }
      }

      if (memberId) {
        membersToAnalyze = membersToAnalyze.filter((m) => {
          const mId = mongoose.Types.ObjectId.isValid(m) ? m : m._id || m;
          return mId.toString() === memberId;
        });
      }

      console.log(`Analyzing ${membersToAnalyze.length} members (including leader) for team ${team.teamId?.name}`);

      // Calculate stats for each member
      const memberStats = {};

      for (const member of membersToAnalyze) {
        // Handle both populated and non-populated member IDs
        const currentMemberId = mongoose.Types.ObjectId.isValid(member) ? member : member._id || member;

        console.log(`Processing member ${currentMemberId}`);

        // Get tasks assigned to this member in this project
        const tasks = await Task.find({
          projectId: projectId,
          assigneeId: currentMemberId,
        }).select("_id status");

        const tasksAssigned = tasks.length;
        const tasksCompleted = tasks.filter((t) => t.status === "done").length;

        // Get time logs for this member's tasks
        const taskIds = tasks.map((t) => t._id);
        const timeLogs = await TimeLog.find({
          taskId: { $in: taskIds },
          userId: currentMemberId,
        });

        const totalTime = timeLogs.reduce((sum, log) => sum + (log.timeSpent || 0), 0);

        console.log(`Member ${currentMemberId} stats:`, { tasksAssigned, tasksCompleted, totalTime });

        memberStats[currentMemberId.toString()] = {
          tasksAssigned,
          tasksCompleted,
          totalTime,
          completionRate: tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0,
        };
      }

      console.log("Final member stats:", memberStats);
      return memberStats;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = performanceService;
