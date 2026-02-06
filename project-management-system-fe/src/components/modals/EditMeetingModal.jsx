import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { updateMeeting, addMeetingAttachment, addMeetingAttachmentFromDocuments, deleteMeetingAttachment } from "../../services/meetingService";
import InputField from "../common/InputField";
import Avatar from "../common/Avatar";
import ConfirmationModal from "../common/ConfirmationModal";
import { ProjectContext } from "../../contexts/ProjectContext";
import { getProjectDocuments } from "../../services/projectDocsService";

const EditMeetingModal = ({ isOpen, onClose, meeting, onMeetingUpdated }) => {
  const { selectedProjectKey } = useContext(ProjectContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [newAttachments, setNewAttachments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [projectDocs, setProjectDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);

  useEffect(() => {
    if (isOpen && meeting) {
      setTitle(meeting.title || "");
      setDescription(meeting.description || "");
      setStartTime(meeting.startTime?.slice(0, 16) || "");
      setAttachments(meeting.attachments || []);
      setNewAttachments([]);
      setSelectedDocIds([]);
    }
  }, [isOpen, meeting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title || !startTime || !endTime) {
      toast.error("Please fill in title, start time, and end time.");
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      toast.error("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        title,
        description,
        startTime,
        endTime,
      };
      await updateMeeting(meeting._id, updateData);

      // Upload new attachments
      if (newAttachments.length > 0) {
        for (const file of newAttachments) {
          try {
            await addMeetingAttachment(meeting._id, file);
          } catch (error) {
            toast.warn(`Failed to upload ${file.name}`);
          }
        }
      }

      if (selectedDocIds.length > 0) {
        try {
          await addMeetingAttachmentFromDocuments(meeting._id, selectedDocIds);
        } catch (error) {
          toast.warn("Failed to attach project documents.");
        }
      }

      toast.success("Meeting updated successfully!");
      onMeetingUpdated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setNewAttachments([...newAttachments, ...files]);
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(newAttachments.filter((_, i) => i !== index));
  };

  const fetchProjectDocs = async () => {
    if (!selectedProjectKey) return;
    setDocsLoading(true);
    try {
      const res = await getProjectDocuments(selectedProjectKey, "all");
      const allDocs = [
        ...(res.data.projectDocs || []),
        ...(res.data.taskAttachments || []),
        ...(res.data.commentAttachments || []),
        ...(res.data.meetingAttachments || []),
      ];
      setProjectDocs(allDocs);
    } catch (error) {
      console.error("Failed to load project documents:", error);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (showDocPicker) fetchProjectDocs();
  }, [showDocPicker]);

  const toggleDocSelection = (docId) => {
    setSelectedDocIds((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]));
  };

  const handleDeleteAttachment = (attachmentId) => {
    setAttachmentToDelete(attachmentId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;

    setDeletingAttachmentId(attachmentToDelete);
    try {
      await deleteMeetingAttachment(meeting._id, attachmentToDelete);
      setAttachments(attachments.filter((a) => a._id !== attachmentToDelete));
      toast.success("Attachment deleted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete attachment.");
    } finally {
      setDeletingAttachmentId(null);
      setIsDeleteConfirmOpen(false);
      setAttachmentToDelete(null);
    }
  };

  if (!isOpen || !meeting) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6 flex-shrink-0">Edit Meeting</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2">
          <div className="space-y-4">
            <InputField label="Title" id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <InputField
              label="Description"
              id="description"
              type="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Start Time"
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <InputField label="End Time" id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>

            {/* Existing Attachments */}
            {attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Current Attachments</label>
                <div className="space-y-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment._id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-neutral-200 hover:border-primary-300 group"
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 flex-1 min-w-0 text-primary-600 hover:text-primary-700"
                      >
                        <span className="material-symbols-outlined text-base flex-shrink-0">attach_file</span>
                        <span className="text-sm truncate">{attachment.filename}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(attachment._id)}
                        disabled={deletingAttachmentId === attachment._id}
                        className="ml-2 text-neutral-500 hover:text-red-600 flex-shrink-0 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Attachments */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Add Attachments</label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setShowDocPicker(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
                >
                  <span className="material-symbols-outlined text-sm">folder</span>
                  Attach from Documents
                </button>
              </div>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="new-file-input"
                  accept=".doc,.docx,.pptx,.pdf,.xlsx,.txt,.jpg,.png,.gif"
                />
                <label htmlFor="new-file-input" className="cursor-pointer">
                  <div className="text-neutral-600 hover:text-primary-600">
                    <p className="text-sm">Drag files here or click to select</p>
                    <p className="text-xs text-neutral-500 mt-1">Supported: Word, PPT, PDF, Excel, Images, etc.</p>
                  </div>
                </label>
              </div>

              {/* New Attachment List */}
              {newAttachments.length > 0 && (
                <div className="mt-3 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {newAttachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded border border-blue-200 hover:border-primary-300"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-base text-blue-500">add_circle</span>
                        <span className="text-sm text-neutral-700 truncate">{file.name}</span>
                        <span className="text-xs text-neutral-500 whitespace-nowrap">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewAttachment(index)}
                        className="ml-2 text-neutral-500 hover:text-red-600 flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedDocIds.length > 0 && (
                <div className="mt-3 space-y-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  {selectedDocIds.map((docId) => {
                    const doc = projectDocs.find((d) => d._id === docId);
                    if (!doc) return null;
                    return (
                      <div key={docId} className="flex items-center justify-between p-2 bg-white rounded border border-neutral-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="material-symbols-outlined text-base text-primary-500">description</span>
                          <span className="text-sm text-neutral-700 truncate">{doc.filename}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDocSelection(docId)}
                          className="ml-2 text-neutral-500 hover:text-red-600 flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-neutral-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:bg-primary-300"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
        {showDocPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-5 w-[520px] max-h-[70vh] flex flex-col">
              <h4 className="text-lg font-semibold mb-3">Attach from Documents</h4>
              <div className="mb-3">
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto border border-neutral-200 rounded-md">
                {docsLoading ? (
                  <div className="p-4 text-center text-neutral-500">Loading documents...</div>
                ) : projectDocs.length === 0 ? (
                  <div className="p-4 text-center text-neutral-500">No documents available</div>
                ) : (
                  <div className="divide-y">
                    {projectDocs
                      .filter((doc) => {
                        const q = docSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (doc.filename || "").toLowerCase().includes(q);
                      })
                      .map((doc) => (
                        <label key={doc._id} className="flex items-center p-3 gap-3 hover:bg-neutral-50">
                          <input type="checkbox" checked={selectedDocIds.includes(doc._id)} onChange={() => toggleDocSelection(doc._id)} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-neutral-900 truncate">{doc.filename}</div>
                            <div className="text-xs text-neutral-500 truncate">
                              {doc.sourceType || "project"} • {doc.category || "other"}
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowDocPicker(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setAttachmentToDelete(null);
        }}
        onConfirm={confirmDeleteAttachment}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default EditMeetingModal;
