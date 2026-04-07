const Meeting = require("../models/Meeting");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const Workflow = require("../models/Workflow");
const notificationService = require("./NotificationService");
const sendSystemEmail = require("../utils/sendSystemEmail");

const MEETING_REMINDERS = [
  { minutesBefore: 15, field: "reminder15SentAt" },
  { minutesBefore: 5, field: "reminder5SentAt" },
];

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => value.toString()))];
}

function isSameDateTime(left, right) {
  if (!left || !right) {
    return false;
  }

  return new Date(left).getTime() === new Date(right).getTime();
}

async function loadWorkflowMap(projectIds) {
  const validIds = projectIds.filter(Boolean);
  if (validIds.length === 0) return new Map();
  const workflows = await Workflow.find({ projectId: { $in: validIds } })
    .select("projectId statuses")
    .lean();
  return new Map(workflows.filter((workflow) => workflow.projectId != null).map((workflow) => [workflow.projectId.toString(), workflow]));
}

function isTaskCompleted(task, workflowMap) {
  if (!task?.projectId || !task?.statusId) {
    return false;
  }

  const projectId = task.projectId._id ? task.projectId._id.toString() : task.projectId.toString();
  const workflow = workflowMap.get(projectId);
  const status = workflow?.statuses?.find((item) => item._id?.toString() === task.statusId.toString());

  return status?.category?.toLowerCase() === "done";
}

function getProjectManagerIds(project) {
  return uniqueIds((project?.members || []).filter((member) => member.role === "PROJECT_MANAGER").map((member) => member.userId));
}

class AutomationService {
  async syncMeetingsToOngoing() {
    const now = new Date();
    const result = await Meeting.updateMany(
      {
        status: "scheduled",
        startTime: { $lte: now },
        endTime: { $gt: now },
      },
      {
        $set: { status: "ongoing" },
      },
    );

    return {
      updatedMeetings: result.modifiedCount || 0,
    };
  }

  async sendMeetingReminders() {
    const now = new Date();
    const summary = [];

    for (const reminder of MEETING_REMINDERS) {
      const upperBound = new Date(now.getTime() + reminder.minutesBefore * 60 * 1000);
      const lowerBound = new Date(now.getTime() + (reminder.minutesBefore - 1) * 60 * 1000);

      const meetings = await Meeting.find({
        status: "scheduled",
        startTime: { $gt: lowerBound, $lte: upperBound },
        [reminder.field]: { $exists: false },
      })
        .populate("createdBy", "fullname email")
        .populate("participants.userId", "fullname email")
        .populate("projectId", "key")
        .lean();

      for (const meeting of meetings) {
        const recipients = new Map();

        (meeting.participants || []).forEach((participant) => {
          if (participant.status !== "accepted" || !participant.userId?._id) {
            return;
          }

          recipients.set(participant.userId._id.toString(), participant.userId);
        });

        if (meeting.createdBy?._id) {
          recipients.set(meeting.createdBy._id.toString(), meeting.createdBy);
        }

        const startTimeLabel = new Date(meeting.startTime).toLocaleString("vi-VN");
        const recipientList = [...recipients.values()];

        await Promise.all(
          recipientList.map(async (recipient) => {
            await notificationService.notifyMeetingReminder({
              meetingId: meeting._id,
              meetingTitle: meeting.title || "Meeting",
              recipientId: recipient._id,
              minutesBefore: reminder.minutesBefore,
              startTime: meeting.startTime,
              projectKey: meeting.projectId?.key || null,
            });

            if (recipient.email) {
              const subject = `[Meeting Reminder] ${meeting.title || "Meeting"} starts in ${reminder.minutesBefore} minutes`;
              const text = [
                `Xin chào ${recipient.fullname || recipient.email},`,
                "",
                `Cuộc họp \"${meeting.title || "Meeting"}\" sẽ bắt đầu sau ${reminder.minutesBefore} phút.`,
                `Thời gian bắt đầu: ${startTimeLabel}`,
                meeting.meetingLink ? `Link họp: ${meeting.meetingLink}` : null,
                "",
                "Đây là email tự động từ hệ thống.",
              ]
                .filter(Boolean)
                .join("\n");

              const html = `
                <p>Xin chào ${recipient.fullname || recipient.email},</p>
                <p>Cuộc họp <strong>${meeting.title || "Meeting"}</strong> sẽ bắt đầu sau <strong>${reminder.minutesBefore} phút</strong>.</p>
                <p>Thời gian bắt đầu: <strong>${startTimeLabel}</strong></p>
                ${meeting.meetingLink ? `<p>Link họp: <a href="${meeting.meetingLink}">${meeting.meetingLink}</a></p>` : ""}
                <p>Đây là email tự động từ hệ thống.</p>
              `;

              await sendSystemEmail({
                to: recipient.email,
                subject,
                text,
                html,
              });
            }
          }),
        );

        await Meeting.findByIdAndUpdate(meeting._id, {
          $set: { [reminder.field]: now },
        });

        summary.push({
          meetingId: meeting._id.toString(),
          minutesBefore: reminder.minutesBefore,
          recipients: recipientList.length,
        });
      }
    }

    return {
      reminders: summary,
      processedMeetings: summary.length,
    };
  }

  async monitorTaskDeadlines() {
    const now = new Date();
    const deadlineSoonHours = parseInt(process.env.TASK_DEADLINE_SOON_HOURS || "24", 10);
    const upcomingThreshold = new Date(now.getTime() + deadlineSoonHours * 60 * 60 * 1000);

    const candidateTasks = await Task.find({
      assigneeId: { $ne: null },
      dueDate: { $ne: null, $lte: upcomingThreshold },
    })
      .populate("assigneeId", "fullname email")
      .populate("projectId", "key members")
      .lean();

    const workflowMap = await loadWorkflowMap(uniqueIds(candidateTasks.map((task) => task.projectId?._id || task.projectId)));

    let deadlineSoonCount = 0;
    let overdueCount = 0;

    for (const task of candidateTasks) {
      if (!task.dueDate || !task.assigneeId?._id || isTaskCompleted(task, workflowMap)) {
        continue;
      }

      const dueDate = new Date(task.dueDate);
      const projectManagerIds = getProjectManagerIds(task.projectId);

      if (dueDate > now) {
        if (isSameDateTime(task.deadlineSoonReminderFor, task.dueDate)) {
          continue;
        }

        const hoursLeft = Math.max(1, Math.ceil((dueDate.getTime() - now.getTime()) / (60 * 60 * 1000)));
        await notificationService.notifyTaskDeadlineSoon({
          taskId: task._id,
          taskName: task.name,
          assigneeId: task.assigneeId._id,
          hoursLeft,
        });

        await Task.findByIdAndUpdate(task._id, {
          $set: {
            deadlineSoonReminderFor: task.dueDate,
          },
        });

        deadlineSoonCount += 1;
        continue;
      }

      if (isSameDateTime(task.overdueReminderFor, task.dueDate)) {
        continue;
      }

      await notificationService.notifyTaskOverdue({
        taskId: task._id,
        taskName: task.name,
        assigneeId: task.assigneeId._id,
        projectLeadIds: projectManagerIds,
      });

      await Task.findByIdAndUpdate(task._id, {
        $set: {
          overdueReminderFor: task.dueDate,
        },
      });

      overdueCount += 1;
    }

    return {
      deadlineSoonCount,
      overdueCount,
    };
  }

  async monitorSprintLifecycle() {
    const now = new Date();
    const startDateReached = await this.notifySprintStartDateReached(now);
    const endingSoon = await this.notifySprintsEndingSoon(now);
    const endReached = await this.notifySprintEndReached(now);

    return {
      startDateReached,
      endingSoon,
      endReached,
    };
  }

  async notifySprintStartDateReached(now = new Date()) {
    const sprints = await Sprint.find({
      startDate: { $ne: null, $lte: now },
      startDateNotifiedAt: { $exists: false },
    })
      .populate("projectId", "name key members")
      .lean();

    let notifiedCount = 0;

    for (const sprint of sprints) {
      const tasks = await Task.find({ sprintId: sprint._id }).lean();
      const pmIds = getProjectManagerIds(sprint.projectId);

      if (pmIds.length > 0) {
        await notificationService.notifySprintStarted({
          sprintId: sprint._id,
          sprintName: sprint.name,
          recipientIds: pmIds,
          customTitle: "Sprint Start Date Reached",
          customMessage: `Sprint "${sprint.name}" has reached its start date. Current tasks in sprint: ${tasks.length}`,
        });
      }

      await Sprint.findByIdAndUpdate(sprint._id, {
        $set: { startDateNotifiedAt: now },
      });

      notifiedCount += 1;
    }

    return notifiedCount;
  }

  async notifySprintsEndingSoon(now = new Date()) {
    const threshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const sprints = await Sprint.find({
      status: "Started",
      endDate: { $ne: null, $gt: now, $lte: threshold },
      endingSoonNotifiedAt: { $exists: false },
    })
      .populate("projectId", "name key members")
      .lean();

    let notifiedCount = 0;

    for (const sprint of sprints) {
      const tasks = await Task.find({ sprintId: sprint._id }).lean();
      const projectIdForWf = sprint.projectId?._id ?? sprint.projectId;
      const workflowMap = await loadWorkflowMap(projectIdForWf ? [projectIdForWf] : []);
      const pmIds = getProjectManagerIds(sprint.projectId);
      let incompleteCount = 0;

      tasks.forEach((task) => {
        if (isTaskCompleted(task, workflowMap)) {
          return;
        }

        incompleteCount += 1;
      });

      if (pmIds.length > 0) {
        await notificationService.notifySprintEndingSoon({
          sprintId: sprint._id,
          sprintName: sprint.name,
          recipientIds: pmIds,
          customTitle: "Sprint Ending Soon",
          customMessage: `Sprint "${sprint.name}" ends in 1 day. Remaining incomplete tasks: ${incompleteCount}`,
        });
      }

      await Sprint.findByIdAndUpdate(sprint._id, {
        $set: { endingSoonNotifiedAt: now },
      });

      notifiedCount += 1;
    }

    return notifiedCount;
  }

  async notifySprintEndReached(now = new Date()) {
    const sprints = await Sprint.find({
      endDate: { $ne: null, $lte: now },
      endDateNotifiedAt: { $exists: false },
    })
      .populate("projectId", "name key members")
      .lean();

    let notifiedCount = 0;

    for (const sprint of sprints) {
      const tasks = await Task.find({ sprintId: sprint._id }).lean();
      const projectIdForWf = sprint.projectId?._id ?? sprint.projectId;
      const workflowMap = await loadWorkflowMap(projectIdForWf ? [projectIdForWf] : []);
      const incompleteCount = tasks.filter((task) => !isTaskCompleted(task, workflowMap)).length;
      const pmIds = getProjectManagerIds(sprint.projectId);

      if (pmIds.length > 0) {
        await notificationService.notifySprintEndDateReached({
          sprintId: sprint._id,
          sprintName: sprint.name,
          projectKey: sprint.projectId?.key || null,
          recipientIds: pmIds,
          incompleteCount,
        });
      }

      await Sprint.findByIdAndUpdate(sprint._id, {
        $set: { endDateNotifiedAt: now },
      });

      notifiedCount += 1;
    }

    return notifiedCount;
  }
}

module.exports = new AutomationService();
