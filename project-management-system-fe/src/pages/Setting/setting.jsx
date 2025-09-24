import SettingMenu from "../../components/Setting/SettingMenu";
import DraggableList from "../../components/Setting/DraggableList";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useState, useEffect } from "react";
import typeTaskService from "../../services/typeTaskService";
import priorityService from "../../services/priorityService.js";
import platformService from "../../services/platformService";
import PopUpCreate from "../../components/common/PopUpCreate";
import { toast } from "react-toastify";

const SettingPage = () => {
  const [menuList] = useState(["TypeTasks", "Prioritys", "Platforms"]);
  const [draggableItems, setDraggableItems] = useState([]);
  const [hashValue, setHashValue] = useState("");

  // Cập nhật hashValue khi url thay đổi
  useEffect(() => {
    const updateHashValue = () => {
      setHashValue(window.location.hash);
    };

    window.addEventListener("hashchange", updateHashValue);
    updateHashValue();
    return () => window.removeEventListener("hashchange", updateHashValue);
  }, []);

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

  const fetchPrioritys = async () => {
    try {
      const response = await priorityService.getAllPriorities();
      console.log("Fetched prioritys:", response);
      setDraggableItems(response.data || []);
    } catch (error) {
      console.error("Error fetching prioritys:", error);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const response = await platformService.getAllPlatforms();
      console.log("Fetched platforms:", response);
      setDraggableItems(response.data || []);
    } catch (error) {
      console.error("Error fetching platforms:", error);
    }
  };

  // Gọi hàm fetchTypeTasks khi component được mount
  useEffect(() => {
    handleRefresh();
  }, [hashValue]);

  const handleRefresh = () => {
    if (hashValue === "#typetasks" || hashValue === "") {
      fetchTypeTasks();
    } else if (hashValue === "#prioritys") {
      fetchPrioritys();
    } else if (hashValue === "#platforms") {
      fetchPlatforms();
    }
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
      console.error("Error creating new item:", error);
      toast.error(error?.response?.data?.error || "Error creating new item.");
    }
  };
  // Xử lý tạo mới platform
  const handlePlatformCreate = async (newItem) => {
    try {
      await platformService.createPlatform(newItem);
      setOpenCreate(false);
      fetchPlatforms();
      toast.success("Add Platform success.");
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Error creating new platform."
      );
      console.error("Error creating new platform:", error);
    }
  };

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
      console.error("Error creating new priority:", error);
    }
  };

  // Xử lý sự kiện tạo mới dựa trên hashValue
  const handleCreate = (newItem) => {
    if (hashValue === "#typetasks" || hashValue === "") {
      console.log("Creating platform with data:", newItem);
      handleTaskTypeCreate(newItem);
    } else if (hashValue === "#prioritys") {
      console.log("Creating priority with data:", newItem);
      handlePriorityCreate(newItem);
    } else if (hashValue === "#platforms") {
      console.log("Creating platform with data:", newItem);
      handlePlatformCreate(newItem);
    }
  };
  return (
    <div id="webcrumbs">
      <div className="w-full bg-white">
        <SettingMenu MenuList={menuList} onCreate={() => setOpenCreate(true)} />
        <PopUpCreate
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSubmit={handleCreate}
          title="Create Item"
          isPri={hashValue === "#prioritys"}
        />
        <div className="draggable-list-wrapper">
          <DndProvider backend={HTML5Backend}>
            <DraggableList items={draggableItems} onRefresh={handleRefresh} />
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
