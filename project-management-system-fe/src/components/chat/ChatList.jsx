import React, { useState, useEffect } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext"; // Import useAuth để lấy current user
import { FaHashtag, FaUsers, FaSearch, FaUserPlus } from "react-icons/fa";
import chatService from "../../services/chatService";
import userService from "../../services/userService"; 

const ChatList = () => {
    const { activeTab, setActiveTab, directChats, projectChannels, setSelectedConversation, selectedConversation, setDirectChats } = useChat();
    const { user: currentUser } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]); // Lưu kết quả tìm kiếm user mới
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
             // Chỉ search khi có từ khóa và đang ở tab INDIVIDUALS
             if (activeTab === "INDIVIDUALS" && searchTerm.trim().length > 0) {
                 setIsSearching(true);
                 try {
                     // Gọi service user có sẵn để lấy danh sách
                     // Lưu ý: Nếu user quá nhiều (>100), cách này sẽ không tối ưu
                     // Cần Backend hỗ trợ filter server-side
                     const response = await userService.getAllUsers(1, 100); 
                     
                     // Response của bạn trả về { data: [...users], total: ... } hay mảng trực tiếp?
                     // Kiểm tra lại cấu trúc response của getAllUsers
                     const allUsers = Array.isArray(response) ? response : (response.users || response.data || []);
                     // Client-side filtering
                     const keyword = searchTerm.toLowerCase();
                     const filtered = allUsers.filter(u => 
                        u._id !== currentUser._id && // Không tìm chính mình
                        (
                            (u.fullname && u.fullname.toLowerCase().includes(keyword)) ||
                            (u.email && u.email.toLowerCase().includes(keyword)) ||
                            (u.username && u.username.toLowerCase().includes(keyword))
                        )
                     );
                     
                     setSearchResults(filtered);
                 } catch (error) {
                     console.error("Search users failed", error);
                 } finally {
                     setIsSearching(false);
                 }
             } else {
                 setSearchResults([]);
             }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, activeTab, currentUser._id]);

    // Handle click vào User tìm thấy -> Tạo chat
    const handleAccessChat = async (userId) => {
        try {
            // Gọi API accessChat (Find or Create)
            const chat = await chatService.accessChat(userId);
            
            // Cập nhật lại list direct chats nếu chưa có
            if (!directChats.find(c => c._id === chat._id)) {
                setDirectChats([chat, ...directChats]);
            }
            
            // Clear search và mở chat
            setSearchTerm("");
            setSearchResults([]);
            setSelectedConversation(chat);
        } catch (error) {
            console.error("Access chat failed", error);
        }
    };

    // Helper: Lấy tên đối phương trong Direct Chat
    const getDirectChatName = (chat) => {
        const other = chat.participants.find(p => p._id !== currentUser._id);
        return other ? other.fullname : "Unknown User";
    };
    
    const getDirectChatAvatar = (chat) => {
        const other = chat.participants.find(p => p._id !== currentUser._id);
        return other?.avatar;
    };

    const ChatItem = ({ item, isProject = false }) => {
        const isActive = selectedConversation?._id === item._id;
        
        // Tên & Avatar
        let name = item.name;
        let avatarUrl = null;

        if (!isProject && item.type === "DIRECT") {
             name = getDirectChatName(item);
             avatarUrl = getDirectChatAvatar(item);
        }

        return (
            <div 
                onClick={() => setSelectedConversation(item)}
                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
            >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="avt" className="w-full h-full object-cover" />
                    ) : (
                        item.type === "PROJECT" ? <FaHashtag /> : (item.type === "TEAM" ? <FaUsers /> : <FaUsers />)
                    )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 truncate">{name}</h4>
                    <p className={`text-xs truncate ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {item.lastMessage 
                            ? (item.lastMessage.sender._id === currentUser._id ? "You: " : "") + item.lastMessage.content 
                            : "No messages yet"}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white border-r">
            {/* Search */}
            <div className="p-4 border-b">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                <button 
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === "PROJECTS" ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab("PROJECTS")}
                >
                    Projects
                </button>
                <button 
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === "INDIVIDUALS" ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab("INDIVIDUALS")}
                >
                    Individuals
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                
                {/* CASE 1: Đang tìm kiếm User (Chỉ áp dụng cho tab Individuals) */}
                {searchTerm && searchResults.length > 0 && (
                    <>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Found Users</div>
                        {searchResults.map(user => (
                            <div 
                                key={user._id} 
                                onClick={() => handleAccessChat(user._id)}
                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-blue-50 rounded-lg group"
                            >
                                <div className="flex items-center gap-3">
                                    <img src={user.avatar || "https://via.placeholder.com/40"} alt="avt" className="w-10 h-10 rounded-full object-cover"/>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-800">{user.fullname}</h4>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <FaUserPlus className="text-gray-400 group-hover:text-blue-600" />
                            </div>
                        ))}
                    </>
                )}
                
                {/* CASE 2: Hiển thị List bình thường khi không search */}
                {!searchTerm && (
                    activeTab === "PROJECTS" ? (
                        <>
                            {projectChannels.general ? (
                                <>
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">General</div>
                                    <ChatItem item={projectChannels.general} isProject={true} />
                                </>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Select a project to view channels</div>
                            )}
                            
                            {projectChannels.teams.length > 0 && (
                                <>
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase mt-2">Teams</div>
                                    {projectChannels.teams.map(team => (
                                        <ChatItem key={team._id} item={team} isProject={true} />
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        // Tab INDIVIDUALS
                        directChats.length > 0 ? (
                            directChats.map(chat => <ChatItem key={chat._id} item={chat} />)
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center px-4">
                                <FaSearch className="text-2xl mb-2 opacity-30" />
                                <p className="text-sm">No conversations yet.</p>
                                <p className="text-xs mt-1">Type a name above to find people.</p>
                            </div>
                        )
                    )
                )}
            </div>
        </div>
    );
};

export default ChatList;