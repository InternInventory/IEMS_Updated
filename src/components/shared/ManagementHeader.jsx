import React, { useState, useRef, useEffect } from "react";
import { IoFilter } from "react-icons/io5";
import { useTheme } from "../../context/ThemeContext";
import "./management-header.css";

const ManagementHeader = ({
  title,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filterOptions = [],
  selectedFilter = "",
  onFilterChange,
  onRefresh,
  onAddClick,
  addButtonLabel = "+ Add",
}) => {
  const { isDark: isDarkMode } = useTheme();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterSelect = (option) => {
    onFilterChange(option.value);
    setIsFilterOpen(false);
  };

  return (
    <div className="management-container" data-theme={isDarkMode ? "dark" : "light"}>
      {/* Title Section */}
      <div className="management-title-section">
        <h1 className="management-page-header">{title}</h1>
      </div>

      {/* Controls Section */}
      <div className="management-controls-wrapper">
        {/* Search Bar */}
        <div className="management-search-wrapper">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="management-search-input"
          />
          <lord-icon
            src="https://cdn.lordicon.com/pagmnkiz.json"
            trigger="hover"
            colors={isDarkMode ? "primary:#ffffff,secondary:#9ce5f4" : "primary:#111827,secondary:#6366f1"}
            style={{ width: "20px", height: "20px" }}
            className="management-search-icon"
          ></lord-icon>
        </div>

        {/* Filter Dropdown */}
        {filterOptions.length > 0 && (
          <div className="management-filter-wrapper" ref={filterRef}>
            <div
              className="management-filter-button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <span className="management-filter-label">
                {filterOptions.find((opt) => opt.value === selectedFilter)?.label || "Filter By"}
              </span>
              <IoFilter className="management-filter-icon" />
            </div>

            {isFilterOpen && (
              <div className="management-filter-dropdown">
                {filterOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`management-filter-option ${
                      selectedFilter === option.value ? "management-filter-selected" : ""
                    }`}
                    onClick={() => handleFilterSelect(option)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            className="management-refresh-button"
            onClick={onRefresh}
            title="Refresh"
          >
            <lord-icon
              src="https://cdn.lordicon.com/rsbokaso.json"
              trigger="hover"
              colors={isDarkMode ? "primary:#ffffff" : "primary:#111827"}
              style={{ width: "20px", height: "20px" }}
            ></lord-icon>
          </button>
        )}

        {/* Add Button */}
        {onAddClick && (
          <button className="management-add-button" onClick={onAddClick}>
            {addButtonLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default ManagementHeader;
