import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaChartLine, FaCopy, FaRegImage, FaSpinner, FaWandMagicSparkles } from "react-icons/fa6";
import { getProjectByKey } from "../../services/projectService";
import projectReportService from "../../services/projectReportService";

const formatPercentage = (value) => (Number.isFinite(value) ? `${value.toFixed(1)}%` : "N/A");
const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const ReportMetricCard = ({ label, value, hint, valueColor = "text-slate-900" }) => (
  <div className="rounded-2xl border border-white/10 bg-white/80 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className={`mt-2 text-2xl font-black ${valueColor}`}>{value}</p>
      </div>
      <div className="h-12 w-12 rounded-2xl bg-slate-100" />
    </div>
    {hint ? <p className="mt-3 text-sm text-slate-500">{hint}</p> : null}
  </div>
);

const JsonBlock = ({ data }) => (
  <pre className="max-h-[360px] overflow-auto rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-100 shadow-inner">
    {JSON.stringify(data, null, 2)}
  </pre>
);

const palette = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4", "#4f46e5", "#d946ef"];

const objectEntriesDesc = (obj = {}, top = 8) =>
  Object.entries(obj)
    .map(([label, value]) => ({ label, value: Number(value) || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);

const HorizontalBars = ({ title, description, data = [] }) => {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 space-y-3">
        {data.length === 0 ? <p className="text-sm text-slate-400">No data available.</p> : null}
        {data.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span className="truncate pr-3">{item.label}</span>
              <span className="font-semibold text-slate-900">{item.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100">
              <div
                className="h-2.5 rounded-full"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: palette[index % palette.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SprintBars = ({ title, description, items = [], valueKey, labelKey }) => {
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey]) || 0));

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="text-sm text-slate-400">No sprint data available.</p> : null}
        {items.map((item, index) => {
          const value = Number(item[valueKey]) || 0;
          return (
            <div key={`${item[labelKey]}-${index}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span className="truncate pr-3">{item[labelKey]}</span>
                <span className="font-semibold text-slate-900">{value}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full"
                  style={{ width: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: palette[index % palette.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProjectReportPage = () => {
  const { projectKey } = useParams();
  const [project, setProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);

  const [report, setReport] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loadingLatestReport, setLoadingLatestReport] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const isCompletedProject = project?.status === "completed";

  useEffect(() => {
    if (!projectKey) return;

    setProjectLoading(true);
    setError("");

    getProjectByKey(projectKey)
      .then((response) => {
        setProject(response?.data || null);
      })
      .catch((loadError) => {
        console.error(loadError);
        setProject(null);
        setError(loadError?.response?.data?.message || "Failed to load project details.");
      })
      .finally(() => {
        setProjectLoading(false);
      });
  }, [projectKey]);

  useEffect(() => {
    if (!projectKey || projectLoading || !isCompletedProject) return;

    const loadLatestReport = async () => {
      setLoadingLatestReport(true);
      try {
        const response = await projectReportService.getLatestProjectReportByProjectKey(projectKey);
        const latestReport = response?.data || null;
        if (latestReport) {
          setReport(latestReport);
          setChartData(latestReport?.chartData || null);
        } else {
          setReport(null);
          setChartData(null);
        }
      } catch (latestError) {
        console.error(latestError);
      } finally {
        setLoadingLatestReport(false);
      }
    };

    loadLatestReport();
  }, [projectKey, projectLoading, isCompletedProject]);

  const handleGenerate = async () => {
    if (!projectKey) return;

    setLoadingReport(true);
    setError("");

    try {
      const response = await projectReportService.generateProjectReportByProjectKey(projectKey);
      const reportData = response?.data || response;

      setReport(reportData);
      setChartData(reportData?.chartData || null);
      toast.success("Project report generated from real project data.");
    } catch (generationError) {
      console.error(generationError);
      const isTimeout = generationError?.code === "ECONNABORTED";
      const message = isTimeout
        ? "Report generation timed out. Please try again; the server may still be processing AI narrative content."
        : generationError?.response?.data?.message || generationError.message || "Failed to generate report.";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!report?.markdown) return;
    await navigator.clipboard.writeText(report.markdown);
    toast.success("Markdown copied to clipboard.");
  };

  const handleCopyJson = async () => {
    if (!chartData) return;
    await navigator.clipboard.writeText(JSON.stringify(chartData, null, 2));
    toast.success("Chart JSON copied to clipboard.");
  };

  const summary = report?.summary || {};
  const health = report?.healthScoreBreakdown || {};
  const snapshotVersion = report?.snapshot?.version;
  const snapshotGeneratedAt = report?.snapshot?.generatedAt;
  const taskStatusSeries = objectEntriesDesc(chartData?.taskStatus || {});
  const tasksPerMemberSeries = objectEntriesDesc(chartData?.tasksPerMember || {});
  const timeSpentPerMemberSeries = objectEntriesDesc(chartData?.timeSpentPerMember || {});

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-6 border-b border-slate-200 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <FaChartLine className="text-sky-600" />
                Project intelligence report
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Auto-generate completed project report</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Report data is loaded directly from the current project key in the URL. No manual JSON input is required.
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Project key</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{projectKey || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Project status</p>
                  <p className={`mt-1 text-sm font-semibold ${isCompletedProject ? "text-emerald-700" : "text-amber-700"}`}>
                    {projectLoading ? "Loading..." : project?.status || "N/A"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Project name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{projectLoading ? "Loading..." : project?.name || "N/A"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loadingReport || projectLoading || !isCompletedProject}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingReport ? <FaSpinner className="animate-spin" /> : <FaWandMagicSparkles />}
                  {loadingReport ? "Generating..." : "Generate from project data"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  disabled={!report?.markdown}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaCopy />
                  Copy markdown
                </button>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  disabled={!chartData}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaRegImage />
                  Copy chart JSON
                </button>
              </div>

              {isCompletedProject && !loadingLatestReport ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {report?.snapshot
                    ? `Loaded latest saved report (v${snapshotVersion || "?"}) generated at ${formatDateTime(snapshotGeneratedAt)}.`
                    : "No saved report snapshot yet. Click Generate to create version 1."}
                </div>
              ) : null}

              {loadingLatestReport ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Loading latest saved report snapshot...
                </div>
              ) : null}

              {!projectLoading && !isCompletedProject ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Project Report is only available when project status is completed.
                </div>
              ) : null}

              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <ReportMetricCard
                label="Overall score"
                value={report ? `${report.overallScore}/100` : "--"}
                hint="Weighted health score from completion, overdue, estimate, bug density, and workload balance."
                valueColor="text-sky-700"
              />
              <ReportMetricCard
                label="Evaluation"
                value={report?.evaluation || "--"}
                hint="SUCCESS, PARTIAL, or FAILED based on real project delivery signals."
                valueColor="text-slate-800"
              />
              <ReportMetricCard
                label="Confidence"
                value={report ? `${report.confidence}%` : "--"}
                hint="Confidence depends on available tasks, users, workflows, and timelogs in the project."
                valueColor="text-emerald-700"
              />
            </div>
          </div>

          <div className="space-y-4 p-6 lg:p-8">
            <h2 className="text-lg font-bold text-slate-900">Data source used for generation</h2>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p>The backend generates report data directly from:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Project and status (must be completed)</li>
                <li>Sprints in this project</li>
                <li>Tasks and workflow status mapping</li>
                <li>Task types, priorities, users, timelogs</li>
              </ul>
              <p className="mt-4 text-slate-500">This follows the same project key flow as project settings and avoids manual data injection.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tasks</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{summary.totalTasks ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completion</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{formatPercentage(summary.completionRate)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sprints</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{summary.totalSprints ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Health score</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{report?.overallScore ?? 0}/100</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Generated report</h2>
              {report ? (
                <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_15px_40px_rgba(15,23,42,0.05)]">
                  <article className="prose prose-slate max-w-none prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-pre:bg-slate-950 prose-table:table-auto prose-table:w-full prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ ...props }) => <table className="w-full table-auto border-collapse" {...props} />,
                        thead: ({ ...props }) => <thead className="bg-slate-100" {...props} />,
                        th: ({ ...props }) => <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold" {...props} />,
                        td: ({ ...props }) => <td className="border border-slate-200 px-3 py-2 text-sm" {...props} />,
                      }}
                    >
                      {report.markdown}
                    </ReactMarkdown>
                  </article>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500 shadow-[0_15px_40px_rgba(15,23,42,0.04)]">
                  Click Generate to build the report from current completed project data.
                </div>
              )}
            </div>
          </div>
        </section>

        {chartData ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <h3 className="text-base font-bold text-slate-900">Visual charts</h3>
              <p className="mt-1 text-sm text-slate-500">
                Real-time visualization from generated chartData. JSON is available below if you need export/debug.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <HorizontalBars
                title="Task status distribution"
                description="Snapshot of To Do, In Progress, and Done tasks."
                data={taskStatusSeries}
              />
              <HorizontalBars title="Tasks per member" description="Top contributors by assigned task count." data={tasksPerMemberSeries} />
              <HorizontalBars
                title="Time spent per member"
                description="Top contributors by logged effort (hours)."
                data={timeSpentPerMemberSeries}
              />
              <SprintBars
                title="Bugs per sprint"
                description="Bug counts by sprint from the generated dataset."
                items={chartData?.bugsPerSprint || []}
                valueKey="bugs"
                labelKey="sprint"
              />
              <SprintBars
                title="Sprint completion trend"
                description="Completed tasks by sprint."
                items={chartData?.sprintProgress || []}
                valueKey="completedTasks"
                labelKey="sprint"
              />
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_rgba(15,23,42,0.05)]">
                <h3 className="text-lg font-bold text-slate-900">Health breakdown</h3>
                <p className="mt-2 text-sm text-slate-500">The backend combines these factor scores into the final project health score.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ReportMetricCard label="Completion" value={health.completionScore ?? "--"} valueColor="text-sky-700" />
                  <ReportMetricCard label="Overdue" value={health.overdueScore ?? "--"} valueColor="text-amber-700" />
                  <ReportMetricCard label="Estimation" value={health.estimationScore ?? "--"} valueColor="text-emerald-700" />
                  <ReportMetricCard label="Bug density" value={health.bugScore ?? "--"} valueColor="text-rose-700" />
                </div>
              </div>
            </div>

            <details className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_rgba(15,23,42,0.05)]">
              <summary className="cursor-pointer text-lg font-bold text-slate-900">Raw chart JSON</summary>
              <p className="mt-2 text-sm text-slate-500">
                Only open this when you need payload export/debug. Main UI above is the visual chart section.
              </p>
              <div className="mt-4">
                <JsonBlock data={chartData} />
              </div>
            </details>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default ProjectReportPage;
