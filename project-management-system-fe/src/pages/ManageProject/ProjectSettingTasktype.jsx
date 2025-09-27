import SettingMenu from "../../components/project/ProjectSettingMenu";
import DraggableList from "../../components/Setting/DraggableList";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useState, useEffect } from "react";
import typeTaskService from "../../services/typeTaskService";
import PopUpCreate from "../../components/common/PopUpCreate";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";

const SettingPage = () => {
  const { projectKey } = useParams();
  const [draggableItems, setDraggableItems] = useState([]);

  // Lấy danh sách loại công việc
  const fetchTypeTasks = async () => {
    try {
      const response = await typeTaskService.getAllTypeTask(projectKey);
      setDraggableItems(response.data || []);
    } catch (error) {
      toast.error("Error fetching type tasks:", error);
    }
  };

  // Gọi hàm fetchTypeTasks khi component được mount
  useEffect(() => {
    fetchTypeTasks();
  }, []);

  const handleRefresh = () => {
    fetchTypeTasks();
  };

  // State để quản lý popup tạo mới
  const [openCreate, setOpenCreate] = useState(false);

  // Nhận object từ PopUpCreate
  const handleTaskTypeCreate = async (newItem) => {
    try {
      await typeTaskService.createTypeTask(newItem);
      setOpenCreate(false);
      fetchTypeTasks();
      toast.success("Add Type Task success.");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error creating new item.");
    }
  };

  // Xử lý sự kiện tạo mới dựa trên hashValue
  const handleCreate = (newItem) => {
    newItem.projectKey = projectKey;
    handleTaskTypeCreate(newItem);
  };
  return (
    <div id="webcrumbs">
      <div className="w-full bg-white">
        <SettingMenu
          onCreate={() => setOpenCreate(true)}
          btnCreateVal={"Create New TaskType"}
        />
        <PopUpCreate
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSubmit={handleCreate}
          title="Create New TaskType"
          isPri={false}
        />
        <div className="draggable-list-wrapper">
          <DndProvider backend={HTML5Backend}>
            <DraggableList
              items={draggableItems}
              onRefresh={handleRefresh}
              currentTab={"tasktypes"}
              isPri={false}
            />
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
