import SettingMenu from "../../components/Setting/SettingMenu";
import DraggableList from "../../components/Setting/DraggableList";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useState } from "react";

const SettingPage = () => {
  // Khởi tạo giá trị mặc định luôn trong useState
  const [menuList] = useState(["TypeTask", "Priority", "Platform"]);

  return (
    <div id="webcrumbs">
      <div className="w-full bg-white">
        <SettingMenu MenuList={menuList} />
        <div className="draggable-list-wrapper">
          <DndProvider backend={HTML5Backend}>
            <DraggableList />
          </DndProvider>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
