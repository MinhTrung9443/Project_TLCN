import React, { useRef, useEffect } from 'react'; // <<< THÊM useRef và useEffect
import { FaFile, FaFileImage, FaFileVideo, FaFilePdf, FaFileArchive, FaFileCode, FaPlus, FaTrash, FaDownload } from 'react-icons/fa'; 
import '../../styles/components/AttachmentsTab.css'; // Tạo file CSS này

const getFileIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)) {
        return <FaFileImage />;
    }
    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) {
        return <FaFileVideo />;
    }
    if (['pdf'].includes(extension)) {
        return <FaFilePdf />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        return <FaFileArchive />;
    }
    if (['js', 'jsx', 'ts', 'html', 'css', 'json', 'py', 'java'].includes(extension)) {
        return <FaFileCode />;
    }
    return <FaFile />;
};

const AttachmentsTab = ({ attachments = [], onAdd, onDelete }) => {
    const scrollContainerRef = useRef(null);

    // Xử lý cuộn ngang bằng con lăn chuột (giữ lại vì nó hữu ích)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleWheelScroll = (event) => {
            if (event.deltaY !== 0) {
                event.preventDefault();
                container.scrollLeft += event.deltaY;
            }
        };
        container.addEventListener('wheel', handleWheelScroll);
        return () => container.removeEventListener('wheel', handleWheelScroll);
    }, []);

    // Hàm xử lý xóa, có thêm stopPropagation để không kích hoạt link cha
    const handleDeleteClick = (event, attachmentId) => {
        event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
        event.preventDefault();  // Ngăn hành vi mặc định của thẻ <a> nếu có
        onDelete(attachmentId);
    };

    return (
        <div className="attachments-section">
            <div className="attachments-header">
                <h4 className="attachments-title">Attachment(s) ({Array.isArray(attachments) ? attachments.length : 0})</h4>
            </div>

            <div className="attachments-scroll-container" ref={scrollContainerRef}>
                {Array.isArray(attachments) && attachments.length > 0 && attachments.map((att) => (
                    <div key={att._id} className="attachment-item">
                        {/* Lớp phủ chứa các nút hành động */}
                        <div className="attachment-overlay">
                            <a 
                                href={att.url} 
                                download={att.filename} 
                                className="attachment-action-btn" 
                                title="Download"
                                onClick={(e) => e.stopPropagation()} // Ngăn click lan ra ngoài
                            >
                                <FaDownload />
                            </a>
                            <button 
                                onClick={(e) => handleDeleteClick(e, att._id)} 
                                className="attachment-action-btn" 
                                title="Delete Attachment"
                            >
                                <FaTrash />
                            </button>
                        </div>
                        
                        {/* Link chính để mở file trong tab mới */}
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="attachment-content-link">
                            <div className="attachment-thumbnail">
                                {att.filename.match(/\.(jpeg|jpg|gif|png|svg)$/i) ? (
                                    <img src={att.url} alt={att.filename} />
                                ) : (
                                    <div className="file-icon">{getFileIcon(att.filename)}</div>
                                )}
                            </div>
                            <div className="attachment-details">
                                <span className="attachment-filename">{att.filename}</span>
                                <span className="attachment-date">
                                    {new Date(att.uploadedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </a>
                    </div>
                ))}
                
                <button className="add-attachment-button" onClick={onAdd} title="Add attachment">
                    <FaPlus />
                </button>
            </div>
        </div>
    );
};

export default AttachmentsTab;