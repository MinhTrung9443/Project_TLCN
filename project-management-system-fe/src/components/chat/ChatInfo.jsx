import React, { useState, useEffect } from "react";
import chatService from "../../services/chatService";
import { useAuth } from "../../contexts/AuthContext";
import { FaTimes, FaSearch, FaUser, FaImage, FaFile, FaHashtag } from "react-icons/fa";

const ChatInfo = ({ conversation, onClose, onJumpToMessage, onChatWithUser }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("MEMBERS"); // MEMBERS | MEDIA | FILES
    const [details, setDetails] = useState(null);
    const [media, setMedia] = useState([]);
    const [files, setFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null); // For profile modal

    useEffect(() => {
        if (conversation) {
            loadDetails();
            loadAttachments();
        }
    }, [conversation]);

    const loadDetails = async () => {
        try {
            const data = await chatService.getDetails(conversation._id);
            setDetails(data);
        } catch (error) {
            console.error("Load details error", error);
        }
    };

    const loadAttachments = async () => {
        try {
            const all = await chatService.getAttachments(conversation._id, 'all');
            setMedia(all.filter(f => f.type === 'image' || f.type === 'video'));
            setFiles(all.filter(f => f.type === 'raw'));
        } catch (error) {
            console.error(error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await chatService.searchMessages(conversation._id, searchQuery);
            setSearchResults(res);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    // --- Helper: Lấy thông tin hiển thị (Tên, Avatar) ---
    const getDisplayInfo = () => {
        if (!details) return { name: "Loading...", avatar: null, type: "" };
        
        if (details.type === 'DIRECT') {
            const otherMember = details.members?.find(m => m._id !== user?._id);
            return {
                name: otherMember ? (otherMember.username || otherMember.fullname) : "User",
                avatar: otherMember?.avatar,
                type: "Direct Message"
            };
        }
        return {
            name: details.name,
            avatar: null, 
            type: details.type === 'PROJECT' ? 'Project Channel' : 'Team Channel'
        };
    };

    const displayInfo = getDisplayInfo();

    // --- Sub-components ---
    const MemberList = () => {
        const members = details?.members || [];
        return (
            <div className="space-y-3 mt-4">
                <h4 className="font-bold text-gray-700 text-sm">Members ({members.length})</h4>
                {members.map(m => (
                    <div 
                        key={m._id} 
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => setSelectedMember(m)}
                    >
                        <img src={m.avatar || "https://via.placeholder.com/32"} className="w-8 h-8 rounded-full" alt="avt"/>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{m.fullname || m.username}</p>
                            <p className="text-xs text-gray-500 truncate">{m.email}</p>
                        </div>
                        {m.role && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded ml-auto">{m.role}</span>}
                    </div>
                ))}
            </div>
        );
    };

    const MediaList = () => (
        <div className="grid grid-cols-3 gap-2 mt-4">
            {media.map((item, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer border">
                    <img src={item.url} className="w-full h-full object-cover" alt="media" onClick={() => window.open(item.url, '_blank')} />
                </div>
            ))}
            {media.length === 0 && <p className="text-xs text-gray-400 col-span-3 text-center py-4">No media</p>}
        </div>
    );

    const FileList = () => (
        <div className="space-y-2 mt-4">
            {files.map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 border rounded hover:bg-gray-100">
                    <FaFile className="text-gray-500" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                </a>
            ))}
            {files.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No files</p>}
        </div>
    );

    const ProfileModal = () => {
        if (!selectedMember) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative animate-fade-in">
                    <button onClick={() => setSelectedMember(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                        <FaTimes />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-blue-500">
                            <img src={selectedMember.avatar || "https://via.placeholder.com/80"} className="w-full h-full object-cover" alt="avt"/> 
                        </div>
                        <h3 className="text-xl font-bold">{selectedMember.fullname || selectedMember.username}</h3>
                        <p className="text-gray-500 text-sm">@{selectedMember.username}</p>
                        
                        <div className="w-full mt-6 space-y-3">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-600 text-sm">Email</span>
                                <span className="text-gray-800 text-sm font-medium">{selectedMember.email}</span>
                            </div>
                        </div>
                        
                        <button 
                            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                            onClick={() => {
                                if (onChatWithUser && selectedMember._id) {
                                    setSelectedMember(null); // Đóng modal trước
                                    onChatWithUser(selectedMember._id);
                                } else {
                                    console.error("onChatWithUser missing");
                                }
                            }}
                        >
                            Message
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden shadow-xl z-20">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center shrink-0">
                <h3 className="font-bold text-gray-700">Chat Info</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {/* Search Box */}
                <form onSubmit={handleSearch} className="mb-6">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search in conversation..." 
                            className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                    </div>
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="mt-2 bg-gray-50 rounded border max-h-40 overflow-y-auto">
                            {searchResults.map(msg => (
                                <div key={msg._id} className="p-2 text-xs border-b last:border-0 cursor-pointer hover:bg-white" 
                                    onClick={() => {
                                        if (onJumpToMessage) onJumpToMessage(msg._id);
                                    }}
                                >
                                    <span className="font-bold">{msg.sender.username}:</span> {msg.content}
                                    <div className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                 <div className="flex flex-col items-center mb-6">
                    {displayInfo.avatar ? (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500 mb-2 overflow-hidden border">
                             <img src={displayInfo.avatar} alt="avt" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center text-2xl text-blue-500 mb-2">
                             {displayInfo.type === 'Direct Message' ? <FaUser /> : <FaHashtag />}
                        </div>
                    )}
                    <h2 className="font-bold text-lg text-center break-words px-4">{displayInfo.name}</h2>
                    <p className="text-xs text-gray-500 uppercase">{displayInfo.type}</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b mb-4">
                    <button 
                         onClick={() => setActiveTab("MEMBERS")}
                         className={`flex-1 py-2 text-xs font-semibold ${activeTab==="MEMBERS"?'text-blue-600 border-b-2 border-blue-600':'text-gray-500'}`}
                    >
                        Members
                    </button>
                    <button 
                         onClick={() => setActiveTab("MEDIA")}
                         className={`flex-1 py-2 text-xs font-semibold ${activeTab==="MEDIA"?'text-blue-600 border-b-2 border-blue-600':'text-gray-500'}`}
                    >
                        Media
                    </button>
                    <button 
                         onClick={() => setActiveTab("FILES")}
                         className={`flex-1 py-2 text-xs font-semibold ${activeTab==="FILES"?'text-blue-600 border-b-2 border-blue-600':'text-gray-500'}`}
                    >
                        Files
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === "MEMBERS" && <MemberList />}
                {activeTab === "MEDIA" && <MediaList />}
                {activeTab === "FILES" && <FileList />}

            </div>

            {/* Profile Modal */}
            <ProfileModal />
        </div>
    );
};

export default ChatInfo;