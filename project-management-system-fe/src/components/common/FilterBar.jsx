import React, { useState, useMemo } from "react";
import { FaTimes } from "react-icons/fa";
import Select from "react-select";

// Component này giờ nhận props là dữ liệu đã được định dạng
const FilterBar = ({ onApplyFilters, projects, users, statuses = [] }) => {
  const [activeFilters, setActiveFilters] = useState([]);

  // Dùng useMemo để FILTER_OPTIONS chỉ được tạo lại khi props thay đổi
  const FILTER_OPTIONS = useMemo(
    () =>
      [
        { value: "projectId", label: "Project", type: "select", options: projects },
        { value: "assigneeId", label: "Assignee", type: "select", options: users },
        { value: "reporterId", label: "Reporter", type: "select", options: users },
        { value: "statusId", label: "Status", type: "select", options: statuses },
        // Thêm các loại khác như Priority, Type... khi bạn có dữ liệu
      ].filter((opt) => opt.options && opt.options.length > 0),
    [projects, users, statuses],
  );

  const [availableFilters, setAvailableFilters] = useState(FILTER_OPTIONS);

  // Cập nhật availableFilters khi FILTER_OPTIONS thay đổi (dữ liệu được load về)
  React.useEffect(() => {
    const activeFilterKeys = activeFilters.map((f) => f.key);
    setAvailableFilters(FILTER_OPTIONS.filter((f) => !activeFilterKeys.includes(f.value)));
  }, [FILTER_OPTIONS, activeFilters]);

  const handleAddFilter = (selectedOption) => {
    setActiveFilters([
      ...activeFilters,
      { key: selectedOption.value, label: selectedOption.label, type: selectedOption.type, options: selectedOption.options, selectedValue: null },
    ]);
    setAvailableFilters(availableFilters.filter((f) => f.value !== selectedOption.value));
  };

  const handleRemoveFilter = (filterToRemove) => {
    setActiveFilters(activeFilters.filter((f) => f.key !== filterToRemove.key));
    const optionToAddBack = FILTER_OPTIONS.find((f) => f.value === filterToRemove.key);
    if (optionToAddBack) {
      setAvailableFilters([...availableFilters, optionToAddBack].sort((a, b) => a.label.localeCompare(b.label)));
    }
  };

  const handleFilterValueChange = (filterKey, selectedOption) => {
    setActiveFilters(activeFilters.map((f) => (f.key === filterKey ? { ...f, selectedValue: selectedOption } : f)));
  };

  const handleApply = () => {
    const queryParams = activeFilters.reduce((acc, filter) => {
      if (filter.selectedValue) {
        acc[filter.key] = filter.selectedValue.value;
      }
      return acc;
    }, {});
    onApplyFilters(queryParams);
  };

  const renderFilterInput = (filter) => {
    switch (filter.type) {
      case "select":
        return (
          <Select
            options={filter.options}
            onChange={(selected) => handleFilterValueChange(filter.value, selected)}
            placeholder={`Select ${filter.label}...`}
            className="flex-1"
            classNamePrefix="react-select"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg border border-neutral-200">
      <div className="flex flex-wrap gap-3">
        {activeFilters.map((filter) => (
          <div key={filter.value} className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 min-w-max">
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{filter.label}:</span>
            <div className="min-w-0 flex-shrink-0" style={{ width: "150px" }}>\n              {renderFilterInput(filter)}\n            </div>\n            <button onClick={() => handleRemoveFilter(filter)} className=\"flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors\">\n              <FaTimes size={14} />\n            </button>\n          </div>\n        ))}\n      </div>\n      <div className=\"flex items-center gap-2\">\n        <div className=\"flex-1 min-w-0\" style={{ maxWidth: \"300px\" }}>\n          <Select\n            options={availableFilters}\n            onChange={handleAddFilter}\n            placeholder=\"Add Filter...\"\n            classNamePrefix=\"react-select\"\n            value={null}\n          />\n        </div>\n        <button onClick={handleApply} className=\"px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors\">\n          Search\n        </button>\n      </div>\n    </div>\n  );\n};\n\nexport default FilterBar;
