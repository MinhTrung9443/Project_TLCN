import React, { useState, useRef, useEffect } from "react";
import { FaRobot, FaTimes, FaPaperPlane, FaExternalLinkAlt, FaBars, FaPlus, FaTrashAlt, FaClock, FaMicrophone, FaMicrophoneSlash, FaFileUpload } from "react-icons/fa";
import apiClient from "../../services/apiClient";
import ReactMarkdown from "react-markdown";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Link } from "react-router-dom";
import Draggable from 'react-draggable';
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const AI_REQUEST_TIMEOUT_MS = 60000;
const TASK_TEMPLATE_HEADERS = [
  "taskName",
  "projectName",
  "assigneeName",
  "sprintName",
  "platformName",
  "priorityLevel",
  "taskTypeName",
  "statusName",
  "startDate",
  "dueDate",
  "description",
  "estimatedTime",
];

const TASK_TEMPLATE_SAMPLE_ROW = {
  taskName: "Thiết kế màn hình đăng nhập",
  projectName: "Project Alpha",
  assigneeName: "Nguyễn Văn A",
  sprintName: "Sprint 1",
  platformName: "FE",
  priorityLevel: "1",
  taskTypeName: "Task",
  statusName: "To Do",
  startDate: "2026-07-10",
  dueDate: "2026-07-15",
  description: "Thiết kế UI cho màn hình đăng nhập và validate input cơ bản",
  estimatedTime: 8,
};

const AIAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Xin chào! Tôi là AI Assistant. Tôi có thể giúp bạn phân tích dự án, quản lý công việc và rủi ro." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  
  // Sidebar and session management states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const messagesEndRef = useRef(null);
  const btnNodeRef = useRef(null);
  const chatNodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragRef = useRef(false);
  const prevInputRef = useRef("");
  const textareaRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    if (listening) {
      prevInputRef.current = input.trim() ? input.trim() + " " : "";
    }
  }, [listening]);

  useEffect(() => {
    if (listening) {
      setInput(prevInputRef.current + transcript);
    }
  }, [transcript, listening]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Giới hạn max-height khoảng 120px (tương đương 5-6 dòng)
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input]);

  // Fetch users for mentions on widget load
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get("/users/get-all-users");
        if (res.data) setUsers(res.data);
      } catch (err) {
        console.error("Error fetching users for AI mentions", err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch sessions when sidebar opens or widget opens
  useEffect(() => {
    if (isOpen && sidebarOpen) {
      fetchSessions();
    }
  }, [isOpen, sidebarOpen]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await apiClient.get("/ai-assistant/sessions");
      if (res.data) {
        setSessions(Array.isArray(res.data) ? res.data : res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleSessionClick = async (sessionId) => {
    setCurrentSessionId(sessionId);
    try {
      const res = await apiClient.get(`/ai-assistant/sessions/${sessionId}/messages`);
      const sessionMessages = res.data?.data || res.data || [];
      if (Array.isArray(sessionMessages)) {
        setMessages(sessionMessages);
      }
    } catch (err) {
      console.error("Error fetching session messages:", err);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      { role: "assistant", content: "Xin chào! Tôi là AI Assistant. Tôi có thể giúp bạn phân tích dự án, quản lý công việc và rủi ro." },
    ]);
    // Không tự động đóng sidebar khi tạo chat mới
    // setSidebarOpen(false); 
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/ai-assistant/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s._id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const lastWordMatch = val.match(/@([a-zA-Z0-9_.-]*)$/);
    if (lastWordMatch) {
      setMentionFilter(lastWordMatch[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (user) => {
    const newVal = input.replace(/@([a-zA-Z0-9_.-]*)$/, `@${user.email} `);
    setInput(newVal);
    setShowMentions(false);
    setMentionFilter("");
  };

  const filteredUsers = users
    .filter(
      (u) =>
        (u.fullname && u.fullname.toLowerCase().includes(mentionFilter.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(mentionFilter.toLowerCase())),
    )
    .slice(0, 5);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiClient.post(
        `/ai-assistant/analyze-risk`,
        {
          question: userMessage,
          history: messages.map((m) => ({ role: m.role, content: m.content })).slice(-5),
          targetProjectName: "",
          sessionId: currentSessionId, // Sending session ID to update context properly
        },
        {
          timeout: AI_REQUEST_TIMEOUT_MS,
        },
      );

      const data = response.data?.data || response.data;
      const aiResponse = data?.answer || response.data?.answer || response.data?.recommendation || "Xin lỗi, tôi không thể trả lời lúc này.";
      
      // Update session if it's new
      if (!currentSessionId && data?.sessionId) {
        setCurrentSessionId(data.sessionId);
        setSessionsLoading(true);
        // Refresh sessions list
        apiClient.get("/ai-assistant/sessions").then(res => {
          if (res.data) setSessions(Array.isArray(res.data) ? res.data : res.data.data || []);
          setSessionsLoading(false);
        });
      }

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);
    } catch (error) {
      console.error("AI Error:", error);
      const isTimeout = error?.code === "ECONNABORTED";
      const errorMsg = isTimeout
        ? "AI đang xử lý lâu hơn bình thường. Vui lòng thử lại sau ít giây hoặc đặt câu hỏi ngắn hơn."
        : error.response?.data?.message || "Đã có lỗi xảy ra khi kết nối tới AI. Vui lòng thử lại.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
    } finally {
      setIsLoading(false);
      resetTranscript();
    }
  };

  const parseImportFile = async (file) => {
    const fileName = file?.name || "";
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith(".csv")) {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  };

  const handlePickImportFile = (event) => {
    const file = event.target.files?.[0] || null;
    setImportFile(file);
  };

  const handleClearImportFile = () => {
    setImportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [TASK_TEMPLATE_SAMPLE_ROW];
    const worksheet = XLSX.utils.json_to_sheet(worksheetData, { header: TASK_TEMPLATE_HEADERS });

    XLSX.utils.book_append_sheet(workbook, worksheet, "TaskTemplate");
    XLSX.writeFile(workbook, "AI_Task_Import_Template.xlsx");
  };

  const handleImportTasks = async () => {
    if (!importFile || isImporting) return;

    try {
      setIsImporting(true);
      const tasks = await parseImportFile(importFile);

      if (!Array.isArray(tasks) || tasks.length === 0) {
        toast.error("File không có dữ liệu task hợp lệ.");
        return;
      }

      const userMessage = `Tôi đã import file ${importFile.name} với ${tasks.length} dòng dữ liệu.`;
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

      const response = await apiClient.post("/ai-assistant/tasks/import", {
        tasks,
        sessionId: currentSessionId,
        fileName: importFile.name,
      });

      const aiResponse = response.data?.recommendation || "Không thể import task lúc này.";
      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      if (!currentSessionId && response.data?.sessionId) {
        setCurrentSessionId(response.data.sessionId);
        setSessionsLoading(true);
        apiClient.get("/ai-assistant/sessions").then((res) => {
          if (res.data) setSessions(Array.isArray(res.data) ? res.data : res.data.data || []);
          setSessionsLoading(false);
        });
      }

      toast.success("Đã xử lý file import task.");
      handleClearImportFile();
    } catch (error) {
      console.error("Import task error:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.recommendation || "Không thể import task từ file.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
      toast.error(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Hôm qua";
      } else {
        return date.toLocaleDateString("vi-VN");
      }
    } catch {
      return "Không xác định";
    }
  };

  return (
    <>
      {/* 1. LAYER NÚT BẤM (BUTTON) - Kéo tự do, nhưng sẽ ẩn đi khi mở Chat */}
      <Draggable 
        nodeRef={btnNodeRef} 
        bounds="body"
        onStart={() => { dragRef.current = false; }}
        onDrag={() => { dragRef.current = true; }}
      >
        <div 
          ref={btnNodeRef} 
          className={`fixed z-[9999] ${isOpen ? 'hidden' : 'block'}`}
          style={{ bottom: '24px', right: '24px' }}
        >
          <button
            onClick={(e) => {
              if (!dragRef.current) setIsOpen(true);
            }}
            className="cursor-move rounded-full border border-slate-200 bg-white/95 p-3.5 text-slate-700 shadow-lg backdrop-blur hover:border-indigo-200 hover:text-indigo-600 transition-all transform hover:scale-105"
            title="Kéo tôi đi chỗ khác!"
          >
            <FaRobot className="text-xl pointer-events-none" />
          </button>
        </div>
      </Draggable>

      {/* 2. LAYER CỬA SỔ CHAT - Có thể kéo bằng thanh Header, cũng sẽ ẩn/chiếm không gian tùy state */}
      <Draggable 
        nodeRef={chatNodeRef} 
        handle=".drag-handle" 
        bounds="body"
      >
        <div 
          ref={chatNodeRef} 
          className={`fixed z-[9999] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl transform transition-all ${isOpen ? 'flex flex-col' : 'hidden'}`}
          style={{ 
            bottom: '24px', 
            right: '24px',
            width: sidebarOpen ? 'calc(100vw - 48px)' : '340px',
            maxWidth: sidebarOpen ? '1000px' : '380px',
            height: sidebarOpen ? 'min(88vh, 680px)' : '520px',
          }}
        >
          {/* Header */}
          <div className="drag-handle cursor-move border-b border-slate-200 bg-slate-950 px-4 py-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 pointer-events-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                <FaRobot className="text-sm" />
              </div>
              <div className="leading-tight">
                <h3 className="font-semibold text-[15px] text-white">AI Assistant</h3>
                <p className="text-[11px] text-slate-300">Tóm tắt, phân tích, gợi ý nhanh</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-full p-1.5 text-white/90 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                title={sidebarOpen ? "Ẩn lịch sử" : "Hiện lịch sử"}
              >
                <FaBars className="text-base" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-full p-1.5 text-white/90 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
              >
                <FaTimes className="text-base" />
              </button>
            </div>
          </div>

          {/* Main Content Area - Flex row with sidebar and chat */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar - Sessions History */}
            {sidebarOpen && (
              <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
                {/* New Chat Button */}
                <button
                  onClick={handleNewChat}
                  className="m-3 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                >
                  <FaPlus className="text-sm" />
                  New Chat
                </button>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto px-2">
                  {sessionsLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <div className="animate-spin inline-block">
                          <FaClock className="text-xl" />
                        </div>
                        <p className="text-xs mt-2">Đang tải...</p>
                      </div>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p className="text-xs text-center">Chưa có cuộc trò chuyện nào</p>
                    </div>
                  ) : (
                    <div className="space-y-1 pb-2">
                      {sessions.map((session) => (
                        <div
                          key={session._id}
                          className={`group p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                            currentSessionId === session._id
                              ? 'bg-indigo-100 text-indigo-900'
                              : 'hover:bg-gray-200 text-gray-800'
                          }`}
                          onClick={() => handleSessionClick(session._id)}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-sm font-medium truncate">
                              {session.title || `Chat ${formatDate(session.createdAt)}`}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {formatDate(session.createdAt)}
                            </p>
                          </div>
                          
                          {/* Delete button container */}
                          <div className="flex-shrink-0 flex items-center">
                            {deleteConfirm === session._id ? (
                              <div className="flex items-center gap-1 bg-red-100 px-1 py-1 rounded">
                                <button
                                  onClick={(e) => handleDeleteSession(session._id, e)}
                                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                >
                                  Xóa
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(null);
                                  }}
                                  className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(session._id);
                                }}
                                className="text-gray-400 hover:text-red-600 transition-colors p-2"
                                title="Xóa đoạn chat này"
                              >
                                <FaTrashAlt className="text-[14px]" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Area */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3 flex flex-col gap-3">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-indigo-600 shadow-sm">
                        <FaRobot className="text-[11px]" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-[14px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white rounded-br-sm shadow-sm"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
                      }`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {msg.role === "assistant" ? (
                        <>
                          {/* Nếu nội dung là danh sách task dạng JSON hoặc có key/link, render đẹp hơn */}
                          {(() => {
                            // Thử parse JSON nếu có thể
                            let parsed = null;
                            try {
                              parsed = typeof msg.content === 'string' && msg.content.trim().startsWith('[')
                                ? JSON.parse(msg.content)
                                : null;
                            } catch {}
                            if (Array.isArray(parsed) && parsed[0]?.taskKey) {
                              return (
                                <ul className="list-disc pl-4 mb-2">
                                  {parsed.map((task, idx) => (
                                    <li key={task.taskKey || idx} className="mb-2">
                                      <span className="font-semibold">[{task.taskKey}]</span>{' '}
                                      {task.taskLink ? (
                                        <Link to={task.taskLink} className="text-blue-600 hover:text-blue-800 underline font-medium" target="_blank" rel="noopener noreferrer">
                                          {task.taskName || 'Xem chi tiết'}
                                        </Link>
                                      ) : (
                                        <span>{task.taskName}</span>
                                      )}
                                      {task.status && (
                                        <span className="ml-2 text-xs text-gray-500">({task.status})</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            // Nếu không phải JSON, render markdown như cũ
                            return (
                              <ReactMarkdown
                                components={{
                                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />, 
                                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />, 
                                  ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />, 
                                  li: ({ node, ...props }) => <li className="mb-1" {...props} />, 
                                  strong: ({ node, ...props }) => <strong className="font-semibold text-indigo-900" {...props} />, 
                                  a: ({ node, ...props }) => {
                                    const isInternal = props.href?.startsWith("/");
                                    if (isInternal) {
                                      return (
                                        <Link to={props.href} className="text-blue-600 hover:text-blue-800 underline font-medium" {...props}>
                                          {props.children}
                                        </Link>
                                      );
                                    }
                                    return (
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline font-medium flex items-center inline-flex gap-1"
                                        {...props}
                                      >
                                        {props.children} <FaExternalLinkAlt size={10} />
                                      </a>
                                    );
                                  },
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            );
                          })()}
                        </>
                      ) : (
                        <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Hiệu ứng đoạn chat Loading */}
                {isLoading && (
                  <div className="flex justify-start items-center">
                    <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-indigo-600 shadow-sm">
                      <FaRobot className="text-[11px]" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 shadow-sm text-slate-500">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area Group */}
              <div className="relative">
                {/* Mention Dropdown */}
                {showMentions && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 w-full bg-white border border-gray-200 rounded-t-lg shadow-[0_-4px_10px_rgba(0,0,0,0.1)] max-h-[250px] overflow-y-auto z-10 text-sm">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">Chọn thành viên</div>
                    {filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="p-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 cursor-pointer flex items-center gap-3 transition-colors"
                        onClick={() => handleSelectMention(user)}
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm">
                            {user.fullname?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-[14px]">{user.fullname}</span>
                          <span className="text-[12px] text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-200 bg-white px-2.5 py-2.5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xls,.xlsx"
                        onChange={handlePickImportFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
                        title="Chọn file CSV hoặc Excel"
                      >
                        <FaFileUpload className="text-[10px]" />
                        Import
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
                        title="Tải file mẫu để điền dữ liệu"
                      >
                        Mẫu
                      </button>
                      {importFile ? (
                        <div className="flex min-w-0 max-w-[145px] items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-600 border border-slate-200">
                          <span className="truncate">{importFile.name}</span>
                          <button type="button" onClick={handleClearImportFile} className="text-slate-400 hover:text-rose-500">
                            <FaTimes className="text-[10px]" />
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleImportTasks}
                        disabled={!importFile || isImporting}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:bg-slate-300"
                      >
                        {isImporting ? "Đang import..." : "Tạo task từ file"}
                      </button>
                    </div>

                    <form onSubmit={handleSendMessage} className="flex shrink-0 items-end gap-2 pt-0.5">
                  {browserSupportsSpeechRecognition && (
                    <button
                      type="button"
                      onClick={() => {
                        if (listening) {
                          SpeechRecognition.stopListening();
                        } else {
                          resetTranscript();
                          SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
                        }
                      }}
                      className={`rounded-full p-1.5 transition-colors z-[9999] ${listening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-indigo-600'}`}
                      title={listening ? "Dừng thu âm" : "Bắt đầu thu âm"}
                    >
                      {listening ? <FaMicrophoneSlash size={16} /> : <FaMicrophone size={16} />}
                    </button>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="Hỏi AI hoặc gõ @ để gắn thành viên... (Shift+Enter để xuống dòng)"
                    className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all custom-scrollbar"
                    style={{ minHeight: '38px', maxHeight: '96px', lineHeight: '1.45' }}
                    rows={1}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    onPointerDown={(e) => e.stopPropagation()} 
                    disabled={isLoading || !input.trim()}
                    className="z-[9999] flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <FaPaperPlane className="text-[13px]" />
                  </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Draggable>
    </>
  );
};

export default AIAssistantWidget;