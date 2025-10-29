import React, { useState, useMemo } from 'react';
import { FaTimes } from 'react-icons/fa';
import Select from 'react-select';
// Import CSS cho component này nếu bạn có
// import '../../styles/components/FilterBar.css';

// Component này giờ nhận props là dữ liệu đã được định dạng
const FilterBar = ({ onApplyFilters, projects, users, statuses = [] }) => {
  const [activeFilters, setActiveFilters] = useState([]);

  // Dùng useMemo để FILTER_OPTIONS chỉ được tạo lại khi props thay đổi
  const FILTER_OPTIONS = useMemo(() => [
    { value: 'projectId', label: 'Project', type: 'select', options: projects },
    { value: 'assigneeId', label: 'Assignee', type: 'select', options: users },
    { value: 'reporterId', label: 'Reporter', type: 'select', options: users },
    { value: 'statusId', label: 'Status', type: 'select', options: statuses },
    // Thêm các loại khác như Priority, Type... khi bạn có dữ liệu
  ].filter(opt => opt.options && opt.options.length > 0), [projects, users, statuses]);
  
  const [availableFilters, setAvailableFilters] = useState(FILTER_OPTIONS);

  // Cập nhật availableFilters khi FILTER_OPTIONS thay đổi (dữ liệu được load về)
  React.useEffect(() => {
      const activeFilterKeys = activeFilters.map(f => f.key);
      setAvailableFilters(FILTER_OPTIONS.filter(f => !activeFilterKeys.includes(f.value)));
  }, [FILTER_OPTIONS, activeFilters]);


  const handleAddFilter = (selectedOption) => {
    setActiveFilters([...activeFilters, { key: selectedOption.value, label: selectedOption.label, type: selectedOption.type, options: selectedOption.options, selectedValue: null }]);
    setAvailableFilters(availableFilters.filter(f => f.value !== selectedOption.value));
  };

  const handleRemoveFilter = (filterToRemove) => {
    setActiveFilters(activeFilters.filter(f => f.key !== filterToRemove.key));
    const optionToAddBack = FILTER_OPTIONS.find(f => f.value === filterToRemove.key);
    if (optionToAddBack) {
      setAvailableFilters([...availableFilters, optionToAddBack].sort((a, b) => a.label.localeCompare(b.label)));
    }
  };

  const handleFilterValueChange = (filterKey, selectedOption) => {
    setActiveFilters(activeFilters.map(f =>
      f.key === filterKey ? { ...f, selectedValue: selectedOption } : f
    ));
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
      case 'select':
        return (
          <Select
            options={filter.options}
            onChange={(selected) => handleFilterValueChange(filter.value, selected)}
            placeholder={`Select ${filter.label}...`}
            className="filter-select-input"
            classNamePrefix="react-select"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="advanced-filter-bar">
        <div className="active-filters-container">
            {activeFilters.map(filter => (
                <div key={filter.value} className="filter-pill">
                    <span className="filter-pill-label">{filter.label}:</span>
                    {renderFilterInput(filter)}
                    <button onClick={() => handleRemoveFilter(filter)} className="remove-filter-btn">
                        <FaTimes />
                    </button>
                </div>
            ))}
        </div>
        <div className="filter-actions">
             <Select
                options={availableFilters}
                onChange={handleAddFilter}
                placeholder="Add Filter..."
                className="add-filter-select"
                classNamePrefix="react-select"
                value={null}
            />
            <button onClick={handleApply} className="search-btn">Search</button>
        </div>
    </div>
  );
};

export default FilterBar;