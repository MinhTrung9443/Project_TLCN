import SettingMenu from "../../components/Setting/SettingMenu";
import DraggableList from "../../components/Setting/DraggableList";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useState, useEffect } from "react";
import typeTaskService from "../../services/typeTaskService";
import PopUpCreate from "../../components/common/PopUpCreate";
import { toast } from "react-toastify";

const SettingPage = () => {
  const [menuList] = useState(["TypeTasks", "Prioritys", "Platforms"]);
  const [draggableItems, setDraggableItems] = useState([]);

  // Lấy danh sách loại công việc
  const fetchTypeTasks = async () => {
    try {
      const response = await typeTaskService.getAllTypeTask();
      setDraggableItems(response.data || []);
    } catch (error) {
      toast.error("Error fetching type tasks:", error);
    }
  };

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
    handleTaskTypeCreate(newItem);
  };
  return (
    <div id="webcrumbs">
      <div className="w-full bg-white">
        <SettingMenu
          MenuList={menuList}
          onCreate={() => setOpenCreate(true)}
          btnCreateVal="Create TaskType"
        />
        <PopUpCreate
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSubmit={handleCreate}
          title="Create new Tasktype"
          isPri={false}
        />
        <div className="draggable-list-wrapper">
          <DndProvider backend={HTML5Backend}>
            <DraggableList
              items={draggableItems}
              onRefresh={handleRefresh}
              currentTab={"tasktypes"}
            />
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
