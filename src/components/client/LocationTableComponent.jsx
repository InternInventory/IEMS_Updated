import React, { useState, useMemo } from "react";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
import { IoFilter } from "react-icons/io5";
import Dropdown from "../Dropdown/Dropdown";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const LocationTableComponent = ({ locations }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  // 🔎 Search & Filter states
  const [searchLocation, setSearchLocation] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const navigate = useNavigate();

  const handleRowClick = (locId) => {
    navigate("/location", { state: { locationId: locId } }); // 👈 route to ViewLocation
  };
  const options = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleSelect = (option) => {
    setSelectedOption(option.value);
    setIsOpen(false);
  };

  const handleRefresh = () => {
    setSelectedOption("");
    setSearchLocation("");
    setIsOpen(false);
  };

  // ✅ Filtered data based on search and filter
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch = loc.loc_name
        ?.toLowerCase()
        .includes(searchLocation.toLowerCase());
      const matchesFilter =
        !selectedOption ||
        (selectedOption === "active" && loc.is_active) ||
        (selectedOption === "inactive" && !loc.is_active);
      return matchesSearch && matchesFilter;
    });
  }, [locations, searchLocation, selectedOption]);

  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex-1 overflow-visible p-3 w-full">
      {/* 🔎 Search & Filter bar */}
      <div className="client-utility flex flex-col md:flex-row md:items-center md:justify-end gap-4 mb-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search Location..."
              className={`border rounded-md px-4 pr-10 py-2 h-10 focus:outline-none ${
                isDarkMode
                  ? "border-white text-white bg-transparent"
                  : "border-gray-300 text-gray-900 bg-white"
              }`}
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
            />
            <lord-icon
              src="https://cdn.lordicon.com/pagmnkiz.json"
              trigger="hover"
              colors={isDarkMode ? "primary:#ffffff,secondary:#9ce5f4" : "primary:#111827,secondary:#6366f1"}
              style={{ width: "20px", height: "20px" }}
              class="absolute right-3 top-1/2 transform -translate-y-1/2"
            ></lord-icon>
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <div
              className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[130px] ${
                isDarkMode
                  ? "border-white text-white"
                  : "border-gray-300 text-gray-900 bg-white"
              }`}
              onClick={() => setIsOpen(!isOpen)}
            >
              <span>
                {selectedOption
                  ? options.find((opt) => opt.value === selectedOption)?.label
                  : "Filter By"}
              </span>
              <IoFilter />
            </div>
            {isOpen && (
              <div className={`absolute top-full left-0 mt-1 w-full border rounded-md z-10 ${
                isDarkMode
                  ? "bg-[#0f172b] border-white"
                  : "bg-white border-gray-200"
              }`}>
                {options.map((option) => (
                  <div
                    key={option.value}
                    className={`px-4 py-2 cursor-pointer ${
                      isDarkMode
                        ? `hover:bg-gray-700 text-white ${selectedOption === option.value ? "bg-gray-700 font-medium" : ""}`
                        : `hover:bg-gray-50 text-gray-900 ${selectedOption === option.value ? "bg-gray-100 font-medium" : ""}`
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Icon */}
          <div
            className={`flex items-center justify-center h-10 w-10 border rounded-md cursor-pointer ${
              isDarkMode
                ? "border-white hover:bg-gray-700"
                : "border-gray-300 bg-white hover:bg-gray-50"
            }`}
            onClick={handleRefresh}
          >
            <lord-icon
              src="https://cdn.lordicon.com/rsbokaso.json"
              trigger="hover"
              colors={isDarkMode ? "primary:#ffffff" : "primary:#111827"}
              style={{ width: "20px", height: "20px" }}
            ></lord-icon>
          </div>
        </div>
      </div>

      {/* 📋 Location Table */}
      <div className={`overflow-visible relative rounded-lg shadow-md ${
        isDarkMode ? "" : "border border-gray-200"
      }`}>
        <table className="table-auto w-full min-w-full rounded-lg">
          <thead className={isDarkMode ? "bg-[#0f172b] text-white" : "bg-[#2c3e50] text-white"}>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Location Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Branch Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Country</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Region</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">State</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">City</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${
            isDarkMode
              ? "divide-gray-700 bg-[#121f3d] text-gray-100"
              : "divide-gray-200 bg-white text-gray-900"
          }`}>
            {paginatedLocations.length > 0 ? (
              paginatedLocations.map((loc) => (
                <tr
                  key={loc.loc_id}
                  className={`transition-colors duration-150 cursor-pointer ${
                    isDarkMode ? "hover:bg-[#1a253f]" : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleRowClick(loc.loc_id)}
                >
                  <td className="px-4 py-3">{loc.loc_name}</td>
                  <td className="px-4 py-3">{loc.branch_code}</td>
                  <td className="px-4 py-3">{loc.country_name}</td>
                  <td className="px-4 py-3">{loc.region_name}</td>
                  <td className="px-4 py-3">{loc.state_name}</td>
                  <td className="px-4 py-3">{loc.city_name}</td>
                  <td className="px-4 py-3">
                    {loc.is_active ? (
                      <span className="text-green-400 font-medium">Active</span>
                    ) : (
                      <span className="text-red-400 font-medium">Inactive</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className={`px-4 py-6 text-center italic ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  No locations found.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className={isDarkMode ? "bg-[#0f172b] text-gray-300" : "bg-[#2c3e50] text-white"}>
            <tr>
              <td colSpan="4" className="px-4 py-3">
                <div className="flex gap-4 items-center">
                  Items per page
                  <Dropdown
                    header={`${itemsPerPage}`}
                    values={[5, 10, 25, 50]}
                    containerWidth="70px"
                    bgColor={isDarkMode ? "#0f172b" : "#ffffff"}
                    textColor={isDarkMode ? "#e2e8f0" : "#1f2937"}
                    borderColor={isDarkMode ? "#374151" : "#d1d5db"}
                    onChange={handleItemsPerPageChange}
                    dropDirection={"100%"}
                    dropBorder={"1px solid"}
                  />
                </div>
              </td>
              <td colSpan="2" className="px-4 py-3 text-right">
                Page {currentPage} of{" "}
                {Math.ceil(filteredLocations.length / itemsPerPage)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 hover:text-white disabled:opacity-50"
                  >
                    <TfiControlSkipBackward />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                    className="p-1 hover:text-white disabled:opacity-50"
                  >
                    <IoIosArrowBack />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={
                      currentPage ===
                      Math.ceil(filteredLocations.length / itemsPerPage)
                    }
                    className="p-1 hover:text-white disabled:opacity-50"
                  >
                    <IoIosArrowForward />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(
                        Math.ceil(filteredLocations.length / itemsPerPage)
                      )
                    }
                    disabled={
                      currentPage ===
                      Math.ceil(filteredLocations.length / itemsPerPage)
                    }
                    className="p-1 hover:text-white disabled:opacity-50"
                  >
                    <TfiControlSkipForward />
                  </button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default LocationTableComponent;
