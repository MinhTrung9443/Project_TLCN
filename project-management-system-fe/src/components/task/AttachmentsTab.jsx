import React, { useRef, useEffect } from "react";
import { FaFile, FaFileImage, FaFileVideo, FaFilePdf, FaFileArchive, FaFileCode, FaPlus, FaTrash, FaDownload } from "react-icons/fa";

const getFileIcon = (filename) => {
  const extension = filename.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "svg"].includes(extension)) {
    return <FaFileImage />;
  }
  if (["mp4", "mov", "avi", "mkv"].includes(extension)) {
    return <FaFileVideo />;
  }
  if (["pdf"].includes(extension)) {
    return <FaFilePdf />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return <FaFileArchive />;
  }
  if (["js", "jsx", "ts", "html", "css", "json", "py", "java"].includes(extension)) {
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
    container.addEventListener("wheel", handleWheelScroll);
    return () => container.removeEventListener("wheel", handleWheelScroll);
  }, []);

  // Hàm xử lý xóa, có thêm stopPropagation để không kích hoạt link cha
  const handleDeleteClick = (event, attachmentId) => {
    event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
    event.preventDefault(); // Ngăn hành vi mặc định của thẻ <a> nếu có
    onDelete(attachmentId);
  };

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-neutral-200">
        <h4 className="text-lg font-semibold text-neutral-900">Attachments ({Array.isArray(attachments) ? attachments.length : 0})</h4>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2" ref={scrollContainerRef}>
        {Array.isArray(attachments) &&
          attachments.length > 0 &&
          attachments.map((att) => (
            <div key={att._id} className="relative flex-shrink-0 group">
              <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <a
                  href={att.url}
                  download={att.filename}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-white text-neutral-900 hover:bg-neutral-100 transition-colors"
                  title="Download"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FaDownload className="text-lg" />
                </a>
                <button
                  onClick={(e) => handleDeleteClick(e, att._id)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  title="Delete Attachment"
                >
                  <FaTrash className="text-lg" />
                </button>
              </div>

              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 bg-white border border-neutral-200 rounded-lg hover:shadow-md transition-shadow min-w-max"
              >
                <div className="w-16 h-16 flex items-center justify-center bg-neutral-50 rounded-lg text-2xl text-neutral-600">
                  {att.filename.match(/\.(jpeg|jpg|gif|png|svg)$/i) ? (
                    <img src={att.url} alt={att.filename} className="w-full h-full object-cover rounded" />
                  ) : (
                    getFileIcon(att.filename)
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-neutral-900 truncate max-w-[120px]">{att.filename}</span>
                  <span className="text-xs text-neutral-500 mt-1">
                    {new Date(att.uploadedAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </a>
            </div>
          ))}

        <button
          className="flex-shrink-0 flex items-center justify-center w-20 h-24 border-2 border-dashed border-neutral-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-neutral-400 hover:text-primary-600 text-3xl"
          onClick={onAdd}
          title="Add attachment"
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
};

export default AttachmentsTab;
