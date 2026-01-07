const Task = require("../models/Task");
const TimeLog = require("../models/TimeLog");
const User = require("../models/User");
const Project = require("../models/Project");
const Workflow = require("../models/Workflow");
const TaskHistory = require("../models/TaskHistory");
const mongoose = require("mongoose");

const performanceService = {
  /**
   * Tính toán hiệu suất cho một task (chỉ áp dụng cho task Done)
   * Efficiency = (estimatedTime / actualTime) * 100%
   * > 100%: Hoàn thành nhanh hơn dự kiến
   * = 100%: Đúng kế hoạch
   * < 100%: Chậm hơn dự kiến
   */
  calculateTaskEfficiency: (task) => {
    if (!task.actualTime || task.actualTime === 0) {
      return null; // Chưa có dữ liệu
    }

    const estimatedTime = task.estimatedTime || 0;
    const actualTime = task.actualTime || 0;

    // Efficiency = (Est / Act) * 100%
    const efficiency = (estimatedTime / actualTime) * 100;

    return {
      efficiency: parseFloat(efficiency.toFixed(2)),
      estimatedTime,
      actualTime,
    };
  },

  /**
   * Kiểm tra task có hoàn thành đúng hạn không
   * Lấy ngày hoàn thành từ TaskHistory khi status chuyển sang Done
   */
  isCompletedOnTime: async (task, workflow) => {
    if (!task.dueDate) {
      return null; // Không có due date
    }

    // Tìm tất cả các status có category "Done" trong workflow
    const doneStatusIds = workflow.statuses.filter((status) => status.category === "Done").map((status) => status._id.toString());

    if (doneStatusIds.length === 0) {
      return null;
    }

    // Tìm lần đầu tiên task được chuyển sang status Done trong history
    const doneHistory = await TaskHistory.findOne({
      taskId: task._id,
      fieldName: "statusId",
      newValue: { $in: doneStatusIds },
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!doneHistory) {
      return null; // Không tìm thấy history chuyển sang Done
    }

    const completedDate = new Date(doneHistory.createdAt);
    const dueDate = new Date(task.dueDate);

    return completedDate <= dueDate;
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
      const allTasks = await Task.find(taskFilter).populate("taskTypeId", "name icon").populate("priorityId", "name").sort({ updatedAt: -1 });

      // Lấy workflow của project để get status details
      const workflow = await Workflow.findOne({ projectId });

      // Tạo map của statuses từ workflow
      const statusMap = new Map();
      if (workflow && workflow.statuses) {
        workflow.statuses.forEach((status) => {
          statusMap.set(status._id.toString(), status);
        });
      }

      // Map tasks với status info
      const tasksWithStatus = allTasks.map((task) => {
        const statusData = statusMap.get(task.statusId.toString());
        return {
          ...task.toObject(),
          statusInfo: statusData || { _id: task.statusId, name: "Unknown", category: "To Do" },
        };
      });

      // Lọc chỉ lấy tasks Done để tính hiệu suất
      const doneTasks = tasksWithStatus.filter((task) => task.statusInfo.category === "Done");

      // Tính toán efficiency cho từng task Done (sử dụng async/await cho isCompletedOnTime)
      const tasksWithEfficiency = await Promise.all(
        doneTasks.map(async (task) => {
          const efficiencyData = performanceService.calculateTaskEfficiency(task);
          const isOnTime = await performanceService.isCompletedOnTime(task, workflow);

          return {
            _id: task._id,
            key: task.key,
            name: task.name,
            estimatedTime: task.estimatedTime,
            actualTime: task.actualTime,
            progress: task.progress,
            status: task.statusInfo,
            taskType: task.taskTypeId,
            priority: task.priorityId,
            efficiency: efficiencyData ? efficiencyData.efficiency : null,
            isOnTime: isOnTime,
            dueDate: task.dueDate,
            completedAt: task.completedAt || task.updatedAt,
          };
        })
      );

      // Tính toán tổng hợp cho tất cả tasks
      let completedTasks = 0;
      let inProgressTasks = 0;
      let todoTasks = 0;

      tasksWithStatus.forEach((task) => {
        const category = task.statusInfo?.category;
        if (category === "Done") {
          completedTasks++;
        } else if (category === "In Progress") {
          inProgressTasks++;
        } else if (category === "To Do") {
          todoTasks++;
        }
      });

      // Tính toán hiệu suất chỉ từ Done tasks
      let totalEstimatedTime = 0;
      let totalActualTime = 0;
      let onTimeCount = 0;
      let tasksWithDueDate = 0;

      tasksWithEfficiency.forEach((task) => {
        totalEstimatedTime += task.estimatedTime || 0;
        totalActualTime += task.actualTime || 0;

        // Count on-time completion
        if (task.isOnTime !== null) {
          tasksWithDueDate++;
          if (task.isOnTime) {
            onTimeCount++;
          }
        }
      });

      // Hiệu suất tổng thể = (Tổng Est / Tổng Act) * 100%
      const overallEfficiency = totalActualTime > 0 ? parseFloat(((totalEstimatedTime / totalActualTime) * 100).toFixed(2)) : null;

      // % hoàn thành đúng tiến độ
      const onTimePercentage = tasksWithDueDate > 0 ? parseFloat(((onTimeCount / tasksWithDueDate) * 100).toFixed(2)) : null;

      // Phân loại hiệu suất
      let performanceRating = "No Data";
      if (overallEfficiency !== null) {
        if (overallEfficiency >= 100) performanceRating = "Excellent";
        else if (overallEfficiency >= 80) performanceRating = "Good";
        else if (overallEfficiency >= 60) performanceRating = "Average";
        else performanceRating = "Needs Improvement";
      }

      return {
        userId,
        projectId,
        tasks: tasksWithEfficiency,
        summary: {
          totalTasks: allTasks.length,
          completedTasks,
          inProgressTasks,
          todoTasks,
          totalEstimatedTime: parseFloat(totalEstimatedTime.toFixed(2)),
          totalActualTime: parseFloat(totalActualTime.toFixed(2)),
          overallEfficiency,
          onTimeCount,
          tasksWithDueDate,
          onTimePercentage,
          performanceRating,
          efficiency: overallEfficiency ? `${overallEfficiency.toFixed(0)}%` : "N/A",
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
        .populate("teams.leaderId", "_id fullname username email avatar status")
        .populate("teams.members", "_id fullname username email avatar status")
        .populate("members.userId", "_id fullname username email avatar status role");

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
        .populate("teams.leaderId", "_id fullname username email avatar status")
        .populate("teams.members", "_id fullname username email avatar status")
        .populate("members.userId", "_id fullname username email avatar status role");

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
