import React, { useEffect, useState } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import { useParams, useLocation } from "react-router-dom";
import chatService from "../../services/chatService";
import { getProjects } from "../../services/projectService"; // Tái sử dụng service lấy list project
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import { FaTimes, FaExpandAlt, FaExchangeAlt } from "react-icons/fa";

const ChatWidget = () => {
    const { isChatOpen, closeChat, selectedConversation, setProjectChannels, setDirectChats, setActiveTab, activeTab } = useChat();
    const { user } = useAuth();
    
    // Lấy projectKey từ URL (nếu đang ở trang detail)
    const params = useParams(); // params.projectKey
    const location = useLocation();

    const [activeProjectId, setActiveProjectId] = useState(null);
    const [userProjects, setUserProjects] = useState([]); // List các project user tham gia (để switch)
    const [isLoading, setIsLoading] = useState(false);

    // 1. Logic xác định Active Project ID
    useEffect(() => {
        const determineActiveProject = async () => {
             // TH1: Nếu URL có projectKey (đang ở trang detail)
             // Cần gọi API convert Key -> ID (Hoặc tìm trong list projects đã load)
             if (params.projectKey) {
                 try {
                     // Cách tối ưu: Gọi API getProjectByKey để lấy _id chính xác
                     // Hoặc gọi list active project và find
                     const response = await getProjects(""); 
                     const currentProj = response.data.find(p => p.key === params.projectKey);
                     
                     if (currentProj) {
                         setActiveProjectId(currentProj._id);
                         return; // Done
                     }
                 } catch (err) {
                    console.error("Cannot resolve project from URL", err);
                 }
             }
             
             // TH2: Nếu chưa có activeID, load danh sách project để user tự chọn (hoặc auto select cái đầu tiên)
             if (!activeProjectId) {
                 try {
                    const response = await getProjects("");
                    setUserProjects(response.data);
                    
                    // Nếu list có data -> Auto select cái đầu tiên làm default
                    if (response.data.length > 0) {
                        setActiveProjectId(response.data[0]._id);
                    }
                 } catch (err) {
                     console.error("Cannot load user projects", err);
                 }
             }
        };

        if (isChatOpen && user) {
            determineActiveProject();
        }
    }, [isChatOpen, user, params.projectKey]);

    // 2. Load Chat Data khi activeProjectId thay đổi
    useEffect(() => {
        if (!isChatOpen || !user) return;

        const fetchData = async () => {
             setIsLoading(true);
             try {
                 // A. Load chat cá nhân (Luôn load)
                 const directs = await chatService.getDirectChats();
                 setDirectChats(directs);

                 // B. Load chat Project (Nếu có ID)
                 if (activeProjectId) {
                    console.log("Loading chat for project:", activeProjectId);
                    const channels = await chatService.getProjectChannels(activeProjectId);
                    setProjectChannels(channels);
                    
                    // Nếu đang ở Project Tab hoặc chưa ở tab nào -> Focus Project
                    if (activeTab === "PROJECTS") {
                        // Không cần làm gì, ChatList tự render
                    }
                 }
             } catch (error) {
                 console.error("Load chat list error", error);
             } finally {
                 setIsLoading(false);
             }
        };

        fetchData();
    }, [isChatOpen, user, activeProjectId]); // Reload khi đổi project

    // Handle user switch project thủ công
    const handleSwitchProject = (e) => {
        setActiveProjectId(e.target.value);
    };

    if (!isChatOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 w-[90vw] md:w-[800px] h-[80vh] md:h-[600px] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden z-[9999]">
            
            {/* Header Toolbar */}
            <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center shrink-0">
                <div className="font-semibold flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    ZenTask Chat
                    
                    {/* Project Switcher Dropdown (Chỉ hiện khi ở tab Projects) */}
                    {activeTab === "PROJECTS" && userProjects.length > 0 && (
                        <div className="flex items-center gap-1 ml-4 bg-slate-700 rounded px-2 py-1 text-xs">
                           <FaExchangeAlt className="text-gray-400" />
                           <select 
                             value={activeProjectId || ""} 
                             onChange={handleSwitchProject}
                             className="bg-transparent border-none text-white outline-none cursor-pointer max-w-[150px] truncate"
                           >
                             {userProjects.map(p => (
                                 <option key={p._id} value={p._id} className="text-black">
                                     {p.name}
                                 </option>
                             ))}
                           </select>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <button className="hover:text-gray-300"><FaExpandAlt /></button>
                    <button onClick={closeChat} className="hover:text-red-400 transition-colors"><FaTimes /></button>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Side */}
                <div className={`${selectedConversation ? 'hidden md:block' : 'w-full'} md:w-1/3 border-r h-full flex flex-col`}>
                    <ChatList />
                </div>

                {/* Right Side */}
                <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex w-full'} md:w-2/3 h-full items-center justify-center bg-gray-50`}>
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    ) : selectedConversation ? (
                        <div className="w-full h-full">
                            <ChatWindow />
                        </div>
                    ) : (
                        <div className="text-center text-gray-400">
                            <img src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" alt="chat" className="w-20 mx-auto mb-4 opacity-50"/>
                            <p>Select a conversation to start chatting</p>
                            {activeProjectId && <p className="text-xs mt-2">Current Project: {userProjects.find(p=>p._id===activeProjectId)?.name}</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWidget;