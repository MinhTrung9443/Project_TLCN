import SettingMenu from "../../components/Setting/SettingMenu";
import DraggableList from "../../components/Setting/DraggableList";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useState, useEffect } from "react";
import priorityService from "../../services/priorityService.js";
import PopUpCreate from "../../components/common/PopUpCreate";
import { toast } from "react-toastify";

const SettingPage = () => {
  const [menuList] = useState(["TypeTasks", "Prioritys", "Platforms"]);
  const [draggableItems, setDraggableItems] = useState([]);

  const fetchPrioritys = async () => {
    try {
      const response = await priorityService.getAllPriorities();
      setDraggableItems(response.data || []);
    } catch (error) {
      toast.error("Error fetching prioritys:", error);
    }
  };

  // Gọi hàm fetchTypeTasks khi component được mount
  useEffect(() => {
    fetchPrioritys();
  }, []);

  const handleRefresh = () => {
    fetchPrioritys();
  };

  // State để quản lý popup tạo mới
  const [openCreate, setOpenCreate] = useState(false);

  const handlePriorityCreate = async (newItem) => {
    const newPriority = {
      name: newItem.name,
      icon: newItem.icon,
      projectId: null,
    };
    try {
      await priorityService.createPriority(newPriority);
      setOpenCreate(false);
      fetchPrioritys();
      toast.success("Add Priority success.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error creating new priority."
      );
    }
  };

  // Xử lý sự kiện tạo mới dựa trên hashValue
  const handleCreate = (newItem) => {
    handlePriorityCreate(newItem);
  };
  return (
    <div id="webcrumbs">
      <div className="w-full bg-white">
        <SettingMenu
          MenuList={menuList}
          onCreate={() => setOpenCreate(true)}
          btnCreateVal="Create Priority"
        />
        <PopUpCreate
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSubmit={handleCreate}
          title="Create new Priority"
          isPri={true}
        />
        <div className="draggable-list-wrapper">
          <DndProvider backend={HTML5Backend}>
            <DraggableList
              items={draggableItems}
              onRefresh={handleRefresh}
              isPri={true}
              currentTab={"prioritys"}
            />
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
