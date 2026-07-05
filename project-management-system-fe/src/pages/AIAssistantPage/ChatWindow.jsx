import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaRobot, FaFileUpload, FaTimes } from 'react-icons/fa';
import apiClient from '../../services/apiClient';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

const AI_REQUEST_TIMEOUT_MS = 60000;
const TASK_TEMPLATE_HEADERS = [
  'taskName',
  'projectName',
  'assigneeName',
  'sprintName',
  'platformName',
  'priorityLevel',
  'taskTypeName',
  'statusName',
  'startDate',
  'dueDate',
  'description',
  'estimatedTime',
];

const TASK_TEMPLATE_SAMPLE_ROW = {
  taskName: 'Thiết kế màn hình đăng nhập',
  projectName: 'Project Alpha',
  assigneeName: 'Nguyễn Văn A',
  sprintName: 'Sprint 1',
  platformName: 'FE',
  priorityLevel: '1',
  taskTypeName: 'Task',
  statusName: 'To Do',
  startDate: '2026-07-10',
  dueDate: '2026-07-15',
  description: 'Thiết kế UI cho màn hình đăng nhập và validate input cơ bản',
  estimatedTime: 8,
};

const ChatWindow = ({ sessionId, onSessionChange }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (sessionId) {
        try {
          setIsLoading(true);
          const response = await apiClient.get(`/ai-assistant/sessions/${sessionId}/messages`);
          setMessages(response.data?.data || response.data || []);
        } catch (error) {
          console.error('Error fetching messages:', error);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMessages([
          { role: 'assistant', content: 'Xin chào! Tôi là AI Assistant. Hãy bắt đầu một cuộc trò chuyện mới.' }
        ]);
      }
    };
    fetchMessages();
  }, [sessionId]);

  const parseImportFile = async (file) => {
    const fileName = file.name || '';
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.csv')) {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  };

  const handlePickImportFile = (event) => {
    const file = event.target.files?.[0] || null;
    setImportFile(file);
  };

  const handleClearImportFile = () => {
    setImportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([TASK_TEMPLATE_SAMPLE_ROW], { header: TASK_TEMPLATE_HEADERS });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'TaskTemplate');
    XLSX.writeFile(workbook, 'AI_Task_Import_Template.xlsx');
  };

  const handleImportTasks = async () => {
    if (!importFile || isImporting) return;

    try {
      setIsImporting(true);
      const tasks = await parseImportFile(importFile);

      if (!Array.isArray(tasks) || tasks.length === 0) {
        toast.error('File không có dữ liệu task hợp lệ.');
        return;
      }

      const userMessage = `Tôi đã import file ${importFile.name} với ${tasks.length} dòng dữ liệu.`;
      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

      const response = await apiClient.post('/ai-assistant/tasks/import', {
        tasks,
        sessionId,
        fileName: importFile.name,
      });

      const aiResponse = response.data?.recommendation || 'Không thể import task lúc này.';
      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);

      if (!sessionId && response.data?.sessionId) {
        onSessionChange(response.data.sessionId);
      }

      toast.success('Đã xử lý file import task.');
      handleClearImportFile();
    } catch (error) {
      console.error('Import task error:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.recommendation || 'Không thể import task từ file.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
      toast.error(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const payload = {
        question: userMessage.content,
        sessionId: sessionId,
        history: messages.slice(-5) 
      };
      
      const response = await apiClient.post('/ai-assistant/analyze-risk', payload, {
        timeout: AI_REQUEST_TIMEOUT_MS,
      });

      const aiResponse = response.data.recommendation || 'Xin lỗi, tôi không thể trả lời lúc này.';
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      if (!sessionId && response.data.sessionId) {
        onSessionChange(response.data.sessionId);
      }

    } catch (error) {
      console.error('AI Error:', error);
      const errorMsg = error.code === 'ECONNABORTED'
        ? 'AI mất quá nhiều thời gian để phản hồi. Vui lòng thử lại.'
        : error.response?.data?.message || 'Đã có lỗi xảy ra.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
          <p className="text-sm text-slate-500">Tối giản, rõ ràng, dễ theo dõi</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-indigo-600 shadow-sm">
                  <FaRobot className="text-[11px]" />
                </div>
              )}
              <div
                className={`max-w-[72%] rounded-2xl px-3 py-2.5 text-[14px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                }`}
              >
                <ReactMarkdown
                  components={{
                    a: ({node, ...props}) => <Link to={props.href} className="text-blue-500 hover:underline" {...props} />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-indigo-600 shadow-sm">
                  <FaRobot className="text-[11px]" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-slate-500 shadow-sm">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mb-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
              disabled={isImporting}
            >
              <FaFileUpload className="text-xs" />
              Import CSV/Excel
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
            >
              Tải file mẫu
            </button>
            {importFile && (
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-600 border border-slate-200">
                <span className="max-w-[180px] truncate">{importFile.name}</span>
                <button type="button" onClick={handleClearImportFile} className="text-slate-400 hover:text-rose-500">
                  <FaTimes className="text-[11px]" />
                </button>
              </div>
            )}
            <span className="text-xs text-slate-500">Cột gợi ý: taskName, projectName, assigneeName, sprintName, priorityLevel, taskTypeName, statusName, startDate, dueDate</span>
            <button
              type="button"
              onClick={handleImportTasks}
              disabled={!importFile || isImporting}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {isImporting ? 'Đang import...' : 'Tạo task từ file'}
            </button>
          </div>
        </div>
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI bất cứ điều gì..."
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <FaPaperPlane className="text-[13px]" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
