import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import {
  getProjectDocuments,
  uploadProjectDocument,
  deleteProjectDocument,
  shareProjectDocument,
  getProjectMembers,
} from "../../services/projectDocsService";
import { useAuth } from "../../contexts/AuthContext";
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
  const { user } = useAuth();
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
  const [shareModal, setShareModal] = useState({ open: false, docId: null, docName: "", sharedWith: [] });
  const [projectMembers, setProjectMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

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

  const fetchProjectMembers = async () => {
    if (!projectKey) return;
    try {
      const res = await getProjectMembers(projectKey);
      console.log("📋 [ProjectMembers] Response:", res.data);

      // Flatten members từ members array + teams
      let allMembers = [];

      // Add direct members
      if (res.data.members && Array.isArray(res.data.members)) {
        allMembers = res.data.members.map((m) => ({
          _id: m.userId._id || m.userId,
          fullname: m.userId.fullname,
          email: m.userId.email,
          avatar: m.userId.avatar,
        }));
      }

      // Add team members and leaders
      if (res.data.teams && Array.isArray(res.data.teams)) {
        res.data.teams.forEach((team) => {
          // Add team leader
          if (team.leaderId) {
            const leaderId = team.leaderId._id || team.leaderId;
            if (!allMembers.find((m) => m._id === leaderId)) {
              allMembers.push({
                _id: leaderId,
                fullname: team.leaderId.fullname,
                email: team.leaderId.email,
                avatar: team.leaderId.avatar,
              });
            }
          }

          // Add team members
          if (team.members && Array.isArray(team.members)) {
            team.members.forEach((member) => {
              const memberId = member._id || member;
              if (!allMembers.find((m) => m._id === memberId)) {
                allMembers.push({
                  _id: memberId,
                  fullname: member.fullname,
                  email: member.email,
                  avatar: member.avatar,
                });
              }
            });
          }
        });
      }

      console.log("📋 [ProjectMembers] Flattened members:", allMembers.length);
      setProjectMembers(allMembers);
    } catch (error) {
      console.error("❌ Failed to load members:", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchProjectMembers();
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

  const handleShareClick = (docId, docName, sharedWith = []) => {
    console.log("🔓 [handleShareClick] docId:", docId);
    console.log("🔓 [handleShareClick] sharedWith:", sharedWith);
    console.log(
      "🔓 [handleShareClick] sharedWith types:",
      sharedWith.map((s) => typeof s),
    );
    setShareModal({ open: true, docId, docName, sharedWith });
    setSelectedMembers([]);
  };

  const handleShare = async () => {
    if (selectedMembers.length === 0) {
      toast.warn("Please select at least one member");
      return;
    }
    try {
      const emails = selectedMembers.map((m) => m.email);
      await shareProjectDocument(projectKey, shareModal.docId, emails);
      toast.success("Document shared successfully");
      setShareModal({ open: false, docId: null, docName: "" });
      setSelectedMembers([]);
      await fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Share failed");
    }
  };

  const toggleMember = (member) => {
    setSelectedMembers((prev) => (prev.find((m) => m._id === member._id) ? prev.filter((m) => m._id !== member._id) : [...prev, member]));
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
                      {activeTab !== "project" && item.uploadedBy?._id === user?._id && (
                        <button
                          onClick={() => handleShareClick(item._id, item.filename, item.sharedWith || [])}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                          title="Share document"
                        >
                          Share
                        </button>
                      )}
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

      {/* Share Modal */}
      {shareModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] max-h-[600px] flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Share Document</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Document: <strong>{shareModal.docName}</strong>
            </p>

            {shareModal.sharedWith.length > 0 && (
              <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-green-700 font-medium mb-2 text-xs">
                  Already shared with {shareModal.sharedWith.length} member{shareModal.sharedWith.length > 1 ? "s" : ""}:
                </div>
                <div className="flex gap-1">
                  {shareModal.sharedWith.map((userId) => {
                    const member = projectMembers.find((m) => m._id.toString() === userId.toString());
                    if (!member) return null;
                    const avatarUrl =
                      member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullname)}&background=random&color=fff`;
                    return (
                      <img key={userId} src={avatarUrl} alt={member.fullname} className="w-5 h-5 rounded-full object-cover" title={member.fullname} />
                    );
                  })}
                </div>
                {console.log("🟢 [Modal] sharedWith:", shareModal.sharedWith)}
                {console.log("🟢 [Modal] projectMembers:", projectMembers)}
              </div>
            )}

            <div className="flex-1 overflow-y-auto mb-4 border border-neutral-200 rounded-lg">
              {projectMembers.length === 0 ? (
                <div className="p-4 text-center text-neutral-500">No members found</div>
              ) : (
                <div className="divide-y">
                  {(() => {
                    console.log("🔍 [Render] shareModal.sharedWith:", shareModal.sharedWith);
                    console.log(
                      "🔍 [Render] shareModal.sharedWith stringified:",
                      shareModal.sharedWith.map((s) => s?.toString?.() || s),
                    );
                    return projectMembers
                      .filter((member) => {
                        const isShared = shareModal.sharedWith.some((shared) => shared.toString() === member._id.toString());
                        console.log(`📌 [Filter] Member ${member.fullname} (${member._id}): isShared=${isShared}`);
                        return !isShared;
                      })
                      .map((member) => (
                        <label key={member._id} className="flex items-center p-3 hover:bg-neutral-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMembers.some((m) => m._id === member._id)}
                            onChange={() => toggleMember(member)}
                            className="w-4 h-4 rounded border-neutral-300"
                          />
                          <span className="ml-3 text-sm">
                            <div className="font-medium">{member.fullname}</div>
                            <div className="text-xs text-neutral-500">{member.email}</div>
                          </span>
                        </label>
                      ));
                  })()}
                </div>
              )}
            </div>

            {selectedMembers.length > 0 && (
              <div className="mb-4 p-2 bg-blue-50 rounded text-xs text-blue-700">
                {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""} selected
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShareModal({ open: false, docId: null, docName: "", sharedWith: [] })}
                className="px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50"
                disabled={selectedMembers.length === 0}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDocsPage;
