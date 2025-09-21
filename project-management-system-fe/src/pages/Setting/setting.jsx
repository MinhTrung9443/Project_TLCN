import SettingMenu from "../../components/Setting/SettingMenu";
import DraggableList from "../../components/Setting/DraggableList";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useState, useEffect } from "react";
import typeTaskService from "../../services/typeTaskService";
import PopUpCreate from "../../components/common/PopUpCreate";

const SettingPage = () => {
  // Khởi tạo giá trị mặc định luôn trong useState
  const [menuList] = useState(["TypeTasks", "Prioritys", "Platforms"]);
  const [draggableItems, setDraggableItems] = useState([]);

  // Lấy danh sách loại công việc
  const fetchTypeTasks = async () => {
    try {
      const response = await typeTaskService.getAllTypeTask();
      console.log("Fetched type tasks:", response);
      setDraggableItems(response.data || []);
    } catch (error) {
      console.error("Error fetching type tasks:", error);
    }
  };

  // Gọi hàm fetchTypeTasks khi component được mount
  useEffect(() => {
    fetchTypeTasks();
  }, []);

  // State để quản lý popup tạo mới
  const [openCreate, setOpenCreate] = useState(false);

  // Nhận object từ PopUpCreate
  const handleTaskTypeCreate = async (newItem) => {
    try {
      console.log("Creating new item:", newItem);
      const response = await typeTaskService.createTypeTask(newItem);
      console.log("Created new item:", response);
      setOpenCreate(false);
      fetchTypeTasks();
    } catch (error) {
      console.error("Error creating new item:", error);
    }
  };

  return (
    <div id="webcrumbs">
      <div className="w-full bg-white">
        <SettingMenu MenuList={menuList} onCreate={() => setOpenCreate(true)} />
        <PopUpCreate
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSubmit={handleTaskTypeCreate}
          title="Create Item"
        />
        <div className="draggable-list-wrapper">
          <DndProvider backend={HTML5Backend}>
            <DraggableList items={draggableItems} onRefresh={fetchTypeTasks} />
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
