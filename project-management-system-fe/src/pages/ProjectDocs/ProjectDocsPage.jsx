import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { getProjectDocuments, uploadProjectDocument, deleteProjectDocument } from "../../services/projectDocsService";
import { toast } from "react-toastify";

const CATEGORY_OPTIONS = [
  { value: "requirement", label: "Requirement" },
  { value: "api_spec", label: "API Spec" },
  { value: "db_design", label: "DB Design" },
  { value: "guide", label: "Guide" },
  { value: "decision", label: "Decision" },
  { value: "other", label: "Other" },
];

const TABS = [
  { key: "project", label: "Project Docs" },
  { key: "task", label: "Task Attachments" },
  { key: "comment", label: "Comment Attachments" },
  { key: "meeting", label: "Meeting Attachments" },
];

const ProjectDocsPage = () => {
  const { projectKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("project");
  const [data, setData] = useState({
    projectDocs: [],
    taskAttachments: [],
    commentAttachments: [],
    meetingAttachments: [],
  });

  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("requirement");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [version, setVersion] = useState("v1");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");

  const fetchDocuments = async () => {
    if (!projectKey) return;
    try {
      setLoading(true);
      const res = await getProjectDocuments(projectKey, "all");
      setData({
        projectDocs: res.data.projectDocs || [],
        taskAttachments: res.data.taskAttachments || [],
        commentAttachments: res.data.commentAttachments || [],
        meetingAttachments: res.data.meetingAttachments || [],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectKey]);

  const handleUpload = async () => {
    if (!file) {
      toast.warn("Please select a file");
      return;
    }
    try {
      await uploadProjectDocument(projectKey, file, { category, version, tags });
      toast.success("Document uploaded");
      setFile(null);
      setTags("");
      setVersion("v1");
      await fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
    }
  };

  const handleDelete = async (docId) => {
    try {
      await deleteProjectDocument(projectKey, docId);
      toast.success("Document deleted");
      await fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const activeList = useMemo(() => {
    if (activeTab === "project") return data.projectDocs;
    if (activeTab === "task") return data.taskAttachments;
    if (activeTab === "comment") return data.commentAttachments;
    return data.meetingAttachments;
  }, [activeTab, data]);

  const filteredList = useMemo(() => {
    return activeList.filter((item) => {
      const filename = item.filename?.toLowerCase() || "";
      const queryMatch = !search || filename.includes(search.toLowerCase());
      if (activeTab !== "project") return queryMatch;
      const categoryMatch = categoryFilter === "all" || item.category === categoryFilter;
      return queryMatch && categoryMatch;
    });
  }, [activeList, search, activeTab, categoryFilter]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading documents..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <PageHeader icon="description" badge={projectKey} title="Project Documents" subtitle="Upload and manage project documentation" />

      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col">
          {/* Tabs */}
          <div className="p-4 border-b border-neutral-200 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Upload section (Project Docs only) */}
          {activeTab === "project" && (
            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs text-neutral-500 mb-1">File</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 bg-white"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 bg-white"
                    placeholder="v1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Tags (comma)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 bg-white"
                    placeholder="api, backend"
                  />
                </div>
                <div>
                  <button
                    onClick={handleUpload}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600"
                  >
                    Upload Document
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filters */}
          <div className="p-4 border-b border-neutral-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              <div className="relative md:col-span-3">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {activeTab === "project" && (
                <div className="md:col-span-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 bg-white"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredList.length === 0 ? (
              <EmptyState icon="folder" title="No documents" description="No files available in this section." />
            ) : (
              <div className="space-y-2">
                {filteredList.map((item) => (
                  <div key={item._id || item.id} className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{item.filename}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {item.category && `Category: ${item.category}`} {item.version && `• Version: ${item.version}`}
                        {item.parent?.taskKey && ` • Task: ${item.parent.taskKey}`}
                        {item.parent?.meetingTitle && ` • Meeting: ${item.parent.meetingTitle}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100"
                      >
                        Open
                      </a>
                      {activeTab === "project" && (
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-accent-600 rounded-md hover:bg-accent-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDocsPage;
