import React, { useState, useEffect } from "react";
import { getMeetingSummary, getSummaryStatus, generateSummary, getActionItems } from "../../services/meetingService";
import { toast } from "react-toastify";
import LoadingSpinner from "../ui/LoadingSpinner";

const MeetingSummaryPanel = ({ meetingId }) => {
  const [summary, setSummary] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null);

  const fetchSummary = async () => {
    if (!meetingId) return;
    try {
      setLoading(true);

      // Fetch summary
      let summaryData = null;
      try {
        const summaryRes = await getMeetingSummary(meetingId);
        summaryData = summaryRes.data?.summary || summaryRes.data; // Handle both formats
        console.log("[MeetingSummary] Summary data:", summaryData);
      } catch (error) {
        console.log("[MeetingSummary] No summary found:", error.response?.data?.message || error.message);
      }

      // Fetch status
      let statusData = { processingStatus: "none" };
      try {
        const statusRes = await getSummaryStatus(meetingId);
        statusData = statusRes.data;
        console.log("[MeetingSummary] Status data:", statusData);
      } catch (error) {
        console.log("[MeetingSummary] No status found:", error.response?.data?.message || error.message);
      }

      // Fetch action items
      let actionItemsData = [];
      try {
        const actionItemsRes = await getActionItems(meetingId);
        // Handle both { actionItems: [] } and direct array
        actionItemsData = actionItemsRes.data?.actionItems || actionItemsRes.data || [];
        console.log("[MeetingSummary] Action items:", actionItemsData.length);
      } catch (error) {
        console.log("[MeetingSummary] No action items found:", error.response?.data?.message || error.message);
      }

      setSummary(summaryData);
      setStatus(statusData);
      setActionItems(actionItemsData);
    } catch (error) {
      console.error("[MeetingSummary] Failed to load summary:", error);
      toast.error("Failed to load meeting summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [meetingId]);

  const handleGenerateSummary = async (regenerate = false) => {
    try {
      setGenerating(true);
      await generateSummary(meetingId, regenerate);
      toast.success(regenerate ? "Summary regeneration started" : "Summary generation started");

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        const statusRes = await getSummaryStatus(meetingId);
        setStatus(statusRes.data);

        if (statusRes.data.processingStatus === "completed") {
          clearInterval(pollInterval);
          fetchSummary();
          toast.success("Summary generated successfully!");
          setGenerating(false);
        } else if (statusRes.data.processingStatus === "failed") {
          clearInterval(pollInterval);
          toast.error("Summary generation failed");
          setGenerating(false);
        }
      }, 3000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setGenerating(false);
      }, 300000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate summary");
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading summary..." />
      </div>
    );
  }

  const priorityColors = {
    high: "bg-accent-100 text-accent-700 border-accent-200",
    medium: "bg-warning-100 text-warning-700 border-warning-200",
    low: "bg-success-100 text-success-700 border-success-200",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-600">summarize</span>
          <h3 className="text-lg font-semibold text-neutral-900">Meeting Summary</h3>
        </div>
        {!summary && status?.processingStatus !== "processing" && (
          <button
            onClick={() => handleGenerateSummary(false)}
            disabled={generating}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Generating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Generate Summary
              </>
            )}
          </button>
        )}
        {summary && (
          <button
            onClick={() => handleGenerateSummary(true)}
            disabled={generating}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Regenerate
          </button>
        )}
      </div>

      {/* Status */}
      {status?.processingStatus === "processing" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-blue-600">progress_activity</span>
          <div>
            <p className="text-sm font-medium text-blue-900">Processing Summary</p>
            <p className="text-xs text-blue-700 mt-0.5">AI is analyzing the meeting... This may take a few minutes.</p>
          </div>
        </div>
      )}

      {status?.processingStatus === "failed" && (
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-accent-600">error</span>
          <div>
            <p className="text-sm font-medium text-accent-900">Summary Generation Failed</p>
            <p className="text-xs text-accent-700 mt-0.5">Please try regenerating the summary.</p>
          </div>
        </div>
      )}

      {/* Summary Content */}
      {summary && (
        <div className="space-y-6">
          {/* Overview */}
          {summary.overview && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary-600 text-sm mt-0.5">lightbulb</span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-primary-900 mb-2">Overview</h4>
                  <p className="text-sm text-primary-800">{summary.overview}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sections */}
          {summary.sections && summary.sections.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">topic</span>
                Discussion Points
              </h4>
              <div className="space-y-3">
                {summary.sections.map((section, index) => (
                  <div key={index} className="bg-white border border-neutral-200 rounded-lg p-4">
                    <h5 className="font-medium text-neutral-900 mb-2">{section.title}</h5>
                    <p className="text-sm text-neutral-600 mb-2">{section.content}</p>
                    {section.keyPoints && section.keyPoints.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
                        {section.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700">
                            <span className="material-symbols-outlined text-primary-500 text-xs mt-0.5">arrow_right</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">task_alt</span>
                Action Items ({actionItems.length})
              </h4>
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div key={item._id} className="bg-white border border-neutral-200 rounded-lg p-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-neutral-400 text-lg">radio_button_unchecked</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                      {item.description && <p className="text-xs text-neutral-600 mt-1">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {item.priority && (
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${priorityColors[item.priority]}`}>{item.priority}</span>
                        )}
                        {item.dueDate && <span className="text-xs text-neutral-500">Due: {new Date(item.dueDate).toLocaleDateString()}</span>}
                        {item.status && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decisions */}
          {summary.decisions && summary.decisions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">gavel</span>
                Decisions Made
              </h4>
              <div className="space-y-2">
                {summary.decisions.map((decision, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm mt-0.5">check_circle</span>
                    <p className="text-sm text-green-900">{decision.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {summary.risks && summary.risks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                Risks Identified
              </h4>
              <div className="space-y-2">
                {summary.risks.map((risk, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-yellow-600 text-sm mt-0.5">error</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">{risk.title}</p>
                      {risk.description && <p className="text-xs text-yellow-700 mt-1">{risk.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="border-t border-neutral-200 pt-4">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-4">
                {summary.quality?.summaryScore && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">speed</span>
                    <span>Quality: {summary.quality.summaryScore}/100</span>
                  </div>
                )}
                {summary.version && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">history</span>
                    <span>Version {summary.version}</span>
                  </div>
                )}
                {summary.generationDetails?.model && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">smart_toy</span>
                    <span>{summary.generationDetails.model}</span>
                  </div>
                )}
              </div>
              {summary.quality?.generatedAt && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  <span>{new Date(summary.quality.generatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!summary && status?.processingStatus !== "processing" && !generating && (
        <div className="text-center py-12 text-neutral-500">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-30">description</span>
          <p className="text-sm">No summary available yet</p>
          <p className="text-xs mt-1">Generate a summary to analyze this meeting</p>
        </div>
      )}
    </div>
  );
};

export default MeetingSummaryPanel;
