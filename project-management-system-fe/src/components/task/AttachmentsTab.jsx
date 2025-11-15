import React from 'react';
import { FaFile, FaFileImage, FaFileVideo, FaFilePdf, FaFileArchive, FaFileCode, FaPlus } from 'react-icons/fa';
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

const AttachmentsTab = ({ attachments = [], onAdd }) => {
    return (
        <div className="attachments-section">
            <div className="attachments-header">
                <h4 className="attachments-title">Attachment(s) ({attachments.length})</h4>
            </div>

            <div className="attachments-scroll-container">
                {attachments.map((att, index) => (
                    <div key={index} className="attachment-item">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="attachment-thumbnail-link">
                            <div className="attachment-thumbnail">
                                {att.filename.match(/\.(jpeg|jpg|gif|png|svg)$/i) ? (
                                    <img src={att.url} alt={att.filename} />
                                ) : (
                                    <div className="file-icon">{getFileIcon(att.filename)}</div>
                                )}
                            </div>
                        </a>
                        <div className="attachment-details">
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="attachment-filename">
                                {att.filename}
                            </a>
                            <span className="attachment-date">
                                {new Date(att.uploadedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {/* NÚT THÊM MỚI */}
                <button className="add-attachment-button" onClick={onAdd} title="Add attachment">
                    <FaPlus />
                </button>
            </div>
        </div>
    );
};

export default AttachmentsTab;