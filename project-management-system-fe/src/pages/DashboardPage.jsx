import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ProjectContext } from "../contexts/ProjectContext";
import { getDashboardOverview, getDashboardMyTasks } from "../services/dashboardService";
import { getProjectById } from "../services/projectService";
import { getMySchedule } from "../services/meetingService";
import sprintService from "../services/sprintService";
import { toast } from "react-toastify";

// New UI Components
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setProject } = useContext(ProjectContext);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [monthStats, setMonthStats] = useState({
    total: 0,
    done: 0,
    upcoming: 0,
    overdue: 0,
    meetings: 0,
  });
  const [hoveredDayPopup, setHoveredDayPopup] = useState(null);
  const popupCloseTimeoutRef = useRef(null);

  const getMonthRange = (monthDate) => {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isTaskDone = (task) => {
    const statusCategory = task?.statusId?.category?.toLowerCase() || "";
    const statusName = task?.statusId?.name?.toLowerCase() || "";
    const progress = Number(task?.progress || 0);
    return statusCategory === "done" || statusName.includes("done") || statusName.includes("complete") || progress === 100;
  };

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const formatDateShort = (date) => {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const expandEventsByRange = (events, monthStart, monthEnd) => {
    const expanded = [];

    events.forEach((event) => {
      const rangeStart = startOfDay(event.spanStart || event.date);
      const rangeEnd = endOfDay(event.spanEnd || event.date);

      const displayStart = rangeStart > monthStart ? rangeStart : monthStart;
      const displayEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;

      if (displayStart > displayEnd) {
        return;
      }

      let current = new Date(displayStart);
      while (current <= displayEnd) {
        const dayKey = toDateKey(current);
        expanded.push({
          ...event,
          instanceId: `${event.type}-${event.id}-${dayKey}`,
          date: new Date(current),
          dayKey,
        });
        current.setDate(current.getDate() + 1);
      }
    });

    return expanded.sort((a, b) => {
      const aStart = new Date(a.spanStart || a.date).getTime();
      const bStart = new Date(b.spanStart || b.date).getTime();
      if (aStart !== bStart) return aStart - bStart;
      return a.type.localeCompare(b.type);
    });
  };

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      const isInitialLoad = !overview;
      if (isInitialLoad) {
        setLoading(true);
      }

      try {
        const { start, end } = getMonthRange(selectedMonth);
        const requestConfig = { timeout: 20000 };

        const [overviewRes, myTasksRes, myScheduleRes] = await Promise.allSettled([
          getDashboardOverview(requestConfig),
          getDashboardMyTasks(
            {
              startDate: start.toISOString(),
              endDate: end.toISOString(),
            },
            requestConfig,
          ),
          getMySchedule({
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          }, requestConfig),
        ]);

        const failedEndpoints = [];

        if (overviewRes.status === "rejected") {
          failedEndpoints.push("overview");
          console.error("Error loading dashboard overview:", overviewRes.reason);
        }
        if (myTasksRes.status === "rejected") {
          failedEndpoints.push("my-tasks");
          console.error("Error loading dashboard tasks:", myTasksRes.reason);
        }
        if (myScheduleRes.status === "rejected") {
          failedEndpoints.push("my-schedule");
          console.error("Error loading dashboard schedule:", myScheduleRes.reason);
        }

        const tasks = myTasksRes.status === "fulfilled" && Array.isArray(myTasksRes.value?.data) ? myTasksRes.value.data : [];
        const meetings = myScheduleRes.status === "fulfilled" && Array.isArray(myScheduleRes.value?.data) ? myScheduleRes.value.data : [];

        const monthTasks = tasks.filter((task) => {
          const startDate = task?.startDate ? new Date(task.startDate) : task?.dueDate ? new Date(task.dueDate) : null;
          const dueDate = task?.dueDate ? new Date(task.dueDate) : startDate;
          if (!startDate || !dueDate) return false;

          const taskStart = startOfDay(startDate);
          const taskEnd = endOfDay(dueDate);
          return taskEnd >= start && taskStart <= end;
        });

        const now = new Date();
        const doneCount = monthTasks.filter((task) => isTaskDone(task)).length;
        const overdueCount = monthTasks.filter((task) => !isTaskDone(task) && task?.dueDate && new Date(task.dueDate) < now).length;
        const upcomingCount = monthTasks.filter((task) => !isTaskDone(task) && (!task?.dueDate || new Date(task.dueDate) >= now)).length;

        const taskEvents = monthTasks.map((task) => {
          const taskStartRaw = task?.startDate ? new Date(task.startDate) : task?.dueDate ? new Date(task.dueDate) : null;
          const taskEndRaw = task?.dueDate ? new Date(task.dueDate) : taskStartRaw;
          const taskStart = taskStartRaw || new Date();
          const taskEnd = taskEndRaw || taskStart;
          const done = isTaskDone(task);

          const rangeLabel =
            task.startDate && task.dueDate ? `${formatDateShort(taskStart)} → ${formatDateShort(taskEnd)}` : formatDateShort(taskEnd);

          return {
            id: task._id,
            type: "task",
            title: task.name || "Untitled task",
            subtitle: task.projectId?.name || "Unknown project",
            date: taskStart,
            spanStart: taskStart,
            spanEnd: taskEnd,
            status: done ? "completed" : taskEnd < now ? "overdue" : "upcoming",
            href: task.key ? `/app/task/${task.key}` : null,
            timeLabel: rangeLabel,
          };
        });

        const meetingEvents = meetings
          .filter((meeting) => meeting?.startTime)
          .map((meeting) => {
            const startTime = new Date(meeting.startTime);
            const endTime = meeting?.endTime ? new Date(meeting.endTime) : startTime;
            const sameDay = toDateKey(startTime) === toDateKey(endTime);
            const rangeLabel = sameDay
              ? `${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : `${formatDateShort(startTime)} ${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → ${formatDateShort(endTime)} ${endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

            return {
              id: meeting._id,
              type: "meeting",
              title: meeting.title || "Meeting",
              subtitle: meeting.projectId?.name || "Unknown project",
              date: startTime,
              spanStart: startTime,
              spanEnd: endTime,
              status: meeting.status || "scheduled",
              href: meeting._id ? `/meeting-room/${meeting._id}` : null,
              timeLabel: rangeLabel,
            };
          });

        const monthEvents = [...taskEvents, ...meetingEvents];
        const expandedEvents = expandEventsByRange(monthEvents, startOfDay(start), endOfDay(end));

        if (overviewRes.status === "fulfilled") {
          setOverview(overviewRes.value?.data || { projectProgress: [], recentActivity: [] });
        } else if (!overview) {
          setOverview({ projectProgress: [], recentActivity: [] });
        }

        setCalendarEvents(expandedEvents);
        setMonthStats({
          total: monthTasks.length,
          done: doneCount,
          upcoming: upcomingCount,
          overdue: overdueCount,
          meetings: meetingEvents.length,
        });

        if (failedEndpoints.length === 3) {
          toast.error("Could not load dashboard data");
        } else if (failedEndpoints.length > 0 && isInitialLoad) {
          toast.warn(`Some dashboard data could not be loaded (${failedEndpoints.join(", ")})`);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
        toast.error("Could not load dashboard calendar");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, selectedMonth]);

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const dayOffset = (startOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(startOfMonth.getDate() - dayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [selectedMonth]);

  const eventsByDay = useMemo(() => {
    return calendarEvents.reduce((acc, event) => {
      const key = event.dayKey || toDateKey(event.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [calendarEvents]);

  const goToPrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const getEventChipClass = (event) => {
    if (event.type === "meeting") {
      return "bg-primary-100 text-primary-700 hover:bg-primary-200";
    }
    if (event.status === "completed") {
      return "bg-success-100 text-success-700 hover:bg-success-200";
    }
    if (event.status === "overdue") {
      return "bg-accent-100 text-accent-700 hover:bg-accent-200";
    }
    return "bg-warning-100 text-warning-700 hover:bg-warning-200";
  };

  const openDayPopup = (day, items, targetRect) => {
    if (popupCloseTimeoutRef.current) {
      clearTimeout(popupCloseTimeoutRef.current);
      popupCloseTimeoutRef.current = null;
    }

    const viewportPadding = 8;
    const popupWidth = Math.min(320, Math.max(260, window.innerWidth - viewportPadding * 2));
    const estimatedRowHeight = 48;
    const estimatedHeaderHeight = 56;
    const estimatedPopupHeight = Math.min(320, estimatedHeaderHeight + items.length * estimatedRowHeight);

    const centeredLeft = targetRect.left + targetRect.width / 2 - popupWidth / 2;
    const left = Math.max(viewportPadding, Math.min(centeredLeft, window.innerWidth - popupWidth - viewportPadding));

    const belowTop = targetRect.bottom + 8;
    const aboveTop = targetRect.top - estimatedPopupHeight - 8;
    let top = belowTop;

    if (belowTop + estimatedPopupHeight > window.innerHeight - viewportPadding) {
      top = aboveTop >= viewportPadding ? aboveTop : window.innerHeight - estimatedPopupHeight - viewportPadding;
    }

    top = Math.max(viewportPadding, top);

    setHoveredDayPopup({
      key: toDateKey(day),
      dayLabel: day.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      items,
      top,
      left,
      width: popupWidth,
    });
  };

  const scheduleClosePopup = () => {
    if (popupCloseTimeoutRef.current) {
      clearTimeout(popupCloseTimeoutRef.current);
    }
    popupCloseTimeoutRef.current = setTimeout(() => {
      setHoveredDayPopup(null);
    }, 120);
  };

  const cancelClosePopup = () => {
    if (popupCloseTimeoutRef.current) {
      clearTimeout(popupCloseTimeoutRef.current);
      popupCloseTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (popupCloseTimeoutRef.current) {
        clearTimeout(popupCloseTimeoutRef.current);
      }
    };
  }, []);

  // Handle clicking on entity links in recent activity
  const handleEntityClick = async (log, e) => {
    e.preventDefault();

    if (log.entityType === "sprint" && log.relatedId) {
      // Sprint: fetch sprint to get project and navigate to backlog (tương tự NotificationBell)
      try {
        const sprint = await sprintService.getSprintById(log.relatedId);
        const projectId = sprint.projectId?._id || sprint.projectId;

        // Fetch full project data to set context
        const response = await getProjectById(projectId);
        const project = response.data;
        const projectKey = project?.key;

        if (projectKey) {
          // Set project data to context before navigating
          setProject(project);
          navigate(`/app/task-mgmt/projects/${projectKey}/backlog`);
        }
      } catch (error) {
        console.error("Error navigating to sprint:", error);
        toast.error("Could not navigate to sprint");
      }
    } else if (log.entityUrl) {
      // For other entities with URL, just navigate
      navigate(log.entityUrl);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Page Header */}
      <PageHeader
        icon="dashboard"
        badge="Productivity Hub"
        title={`Welcome back, ${user.fullname}!`}
        subtitle="Here's your productivity overview and recent activities"
        actions={
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <span className="material-symbols-outlined">calendar_today</span>
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        }
      />

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100">
                  <span className="material-symbols-outlined text-primary-700">assignment</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Tasks This Month</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{monthStats.total}</p>
                  <p className="text-xs text-neutral-500 mt-2">Based on selected month</p>
                </div>
              </div>
            </Card>

            {/* Completed Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-success-100">
                  <span className="material-symbols-outlined text-success-600">check_circle</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Completed</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{monthStats.done}</p>
                  <p className="text-xs text-neutral-500 mt-2">Completed in selected month</p>
                </div>
              </div>
            </Card>

            {/* Upcoming Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-warning-100">
                  <span className="material-symbols-outlined text-warning-600">schedule</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Upcoming</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{monthStats.upcoming}</p>
                  <p className="text-xs text-neutral-500 mt-2">Not done and not overdue</p>
                </div>
              </div>
            </Card>

            {/* Overdue Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent-100">
                  <span className="material-symbols-outlined text-accent-600">warning</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Overdue</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{monthStats.overdue}</p>
                  <p className="text-xs text-neutral-500 mt-2">Need immediate attention</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <Card
              className="lg:col-span-2"
              header={
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                    <span className="material-symbols-outlined">calendar_month</span>
                    Monthly Planner
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{monthStats.meetings} meetings</Badge>
                    <button onClick={goToPrevMonth} className="px-2 py-1 text-xs rounded border border-neutral-200 hover:bg-neutral-100">
                      Prev
                    </button>
                    <button onClick={goToCurrentMonth} className="px-2 py-1 text-xs rounded border border-neutral-200 hover:bg-neutral-100">
                      Today
                    </button>
                    <button onClick={goToNextMonth} className="px-2 py-1 text-xs rounded border border-neutral-200 hover:bg-neutral-100">
                      Next
                    </button>
                  </div>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-neutral-900">
                    {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-warning-500"></span> Upcoming task
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-success-500"></span> Completed task
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-accent-500"></span> Overdue task
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary-500"></span> Meeting
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-xs font-semibold text-neutral-500 border border-neutral-200 rounded-t-lg overflow-hidden">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="px-2 py-2 text-center bg-neutral-50 border-r border-neutral-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 border border-t-0 border-neutral-200 rounded-b-lg">
                  {calendarDays.map((day) => {
                    const dayKey = toDateKey(day);
                    const items = eventsByDay[dayKey] || [];
                    const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
                    const isToday = toDateKey(day) === toDateKey(new Date());

                    return (
                      <div
                        key={dayKey}
                        className={`min-h-[130px] p-2 border-r border-b border-neutral-200 last:border-r-0 ${
                          isCurrentMonth ? "bg-white" : "bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-xs font-semibold ${
                              isToday
                                ? "bg-primary-600 text-white px-2 py-0.5 rounded-full"
                                : isCurrentMonth
                                  ? "text-neutral-800"
                                  : "text-neutral-400"
                            }`}
                          >
                            {day.getDate()}
                          </span>
                          {items.length > 0 && <span className="text-[10px] text-neutral-500">{items.length}</span>}
                        </div>

                        <div className="space-y-1">
                          {items.slice(0, 3).map((event) => (
                            <button
                              key={event.instanceId || `${event.type}-${event.id}`}
                              onClick={() => event.href && navigate(event.href)}
                              className={`w-full text-left text-[11px] px-2 py-1 rounded transition-colors truncate ${getEventChipClass(event)}`}
                              title={`${event.timeLabel} • ${event.title} • ${event.subtitle}`}
                            >
                              {event.type === "meeting" ? "[Meeting]" : "[Task]"} {event.title}
                            </button>
                          ))}
                          {items.length > 3 && (
                            <button
                              className="text-[10px] text-neutral-500 px-1 hover:text-primary-600"
                              onMouseEnter={(e) => openDayPopup(day, items, e.currentTarget.getBoundingClientRect())}
                              onMouseLeave={scheduleClosePopup}
                              type="button"
                            >
                              +{items.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hoveredDayPopup && (
                  <div
                    className="fixed z-[1000] rounded-xl border border-neutral-200 bg-white shadow-lg"
                    style={{ top: hoveredDayPopup.top, left: hoveredDayPopup.left, width: hoveredDayPopup.width }}
                    onMouseEnter={cancelClosePopup}
                    onMouseLeave={scheduleClosePopup}
                  >
                    <div className="px-3 py-2 border-b border-neutral-200">
                      <div className="text-sm font-semibold text-neutral-900">{hoveredDayPopup.dayLabel}</div>
                      <div className="text-xs text-neutral-500">{hoveredDayPopup.items.length} events</div>
                    </div>
                    <div className="max-h-64 overflow-auto p-2 space-y-1">
                      {hoveredDayPopup.items.map((event) => (
                        <button
                          key={`popup-${event.instanceId || `${event.type}-${event.id}`}`}
                          onClick={() => {
                            setHoveredDayPopup(null);
                            if (event.href) {
                              navigate(event.href);
                            }
                          }}
                          className={`w-full text-left px-2 py-2 rounded text-xs transition-colors ${getEventChipClass(event)}`}
                          type="button"
                        >
                          <div className="font-semibold truncate">
                            {event.type === "meeting" ? "[Meeting]" : "[Task]"} {event.title}
                          </div>
                          <div className="text-[11px] opacity-80 truncate">
                            {event.timeLabel} • {event.subtitle}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                    <span className="material-symbols-outlined">trending_up</span>
                    Project Progress
                  </h3>
                  <Badge variant="success">{overview?.projectProgress?.length ?? 0}</Badge>
                </div>
              }
            >
              <div className="divide-y divide-neutral-200">
                {!overview?.projectProgress || overview.projectProgress.length === 0 ? (
                  <EmptyState icon="folder_off" title="No active projects" description="Projects you're involved in will appear here" />
                ) : (
                  overview.projectProgress.map((proj) => (
                    <div key={proj.projectKey} className="p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-neutral-900">{proj.project}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                            <span className="font-medium text-neutral-700 bg-neutral-100 px-2 py-1 rounded">{proj.role}</span>
                            {proj.endDate && (
                              <span className="flex items-center gap-1 text-neutral-600">
                                <span className="material-symbols-outlined text-sm">event</span>
                                {new Date(proj.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary-600">{proj.progress}%</div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
                          style={{ width: `${proj.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card
            header={
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                  <span className="material-symbols-outlined">notifications_active</span>
                  Recent Activity
                </h3>
                <Badge variant="neutral">{overview?.recentActivity?.length ?? 0}</Badge>
              </div>
            }
          >
            <div className="divide-y divide-neutral-200">
              {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
                <EmptyState icon="history" title="No recent activity" description="Activity logs will appear here as you work" />
              ) : (
                overview.recentActivity.map((log, idx) => (
                  <div key={log._id || idx} className="p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                        {log.user.avatar ? (
                          <img src={log.user.avatar} alt={log.user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{log.user.name?.[0] || "?"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-neutral-900">{log.user.name}</span>
                          <span className="text-neutral-600 text-sm">{log.action}</span>
                          {log.entityUrl ? (
                            <button
                              onClick={(e) => handleEntityClick(log, e)}
                              className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                            >
                              {log.entityKey}
                            </button>
                          ) : log.entityKey ? (
                            <span className="text-primary-600 font-semibold">{log.entityKey}</span>
                          ) : null}
                          {log.entityName && <span className="text-neutral-600 text-sm">{log.entityName}</span>}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
