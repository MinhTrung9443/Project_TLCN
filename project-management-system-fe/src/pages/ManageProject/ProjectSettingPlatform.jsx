import SettingMenu from "../../components/project/ProjectSettingMenu";
import DraggableList from "../../components/Setting/DraggableList";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useState, useEffect } from "react";
import platformService from "../../services/platformService";
import PopUpCreate from "../../components/common/PopUpCreate";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";

const SettingPage = () => {
  const { projectKey } = useParams();
  const [draggableItems, setDraggableItems] = useState([]);

  const fetchPlatforms = async () => {
    try {
      const response = await platformService.getAllPlatforms(projectKey);
      setDraggableItems(response.data || []);
    } catch (error) {
      toast.error("Error fetching platforms:", error);
    }
  };

  // Gọi hàm fetchTypeTasks khi component được mount
  useEffect(() => {
    fetchPlatforms();
  }, []);

  const handleRefresh = () => {
    fetchPlatforms();
  };

  // State để quản lý popup tạo mới
  const [openCreate, setOpenCreate] = useState(false);

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
    }
  };

  // Xử lý sự kiện tạo mới dựa trên hashValue
  const handleCreate = (newItem) => {
    newItem.projectKey = projectKey;
    handlePlatformCreate(newItem);
  };
  return (
    <div id="webcrumbs">
      <div className="w-full bg-white">
        <SettingMenu
          onCreate={() => setOpenCreate(true)}
          btnCreateVal={"Create New Platform"}
        />
        <PopUpCreate
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSubmit={handleCreate}
          title="Create Item"
          isPri={false}
        />
        <div className="draggable-list-wrapper">
          <DndProvider backend={HTML5Backend}>
            <DraggableList
              items={draggableItems}
              onRefresh={handleRefresh}
              currentTab={"platforms"}
              isPri={false}
            />
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
