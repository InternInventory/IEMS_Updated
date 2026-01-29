 
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoFilter } from "react-icons/io5";
import { FaEllipsisV, FaTrash, FaPencilAlt } from "react-icons/fa";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import Dropdown from "../Dropdown/Dropdown";
import useAuthFetch from "../hooks/useAuthFetch";
import { useTheme } from "../../context/ThemeContext";
const Location = ({ hideActions = false }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const authFetch = useAuthFetch();
  const [locations, setLocations] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegionFilter, setShowRegionFilter] = useState(false);
  const [showStateFilter, setShowStateFilter] = useState(false);
  const [showCityFilter, setShowCityFilter] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [successPopup, setSuccessPopup] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
 
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await authFetch({url:`${apiURL}/locations`, method:"GET"
        });
 
        // if (!response.data) {
        //   throw new Error("Failed to fetch locations");
        // }
 
        const data = response.data;
        setLocations(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
 
    fetchLocations();
  }, [authFetch]);
 
  const handleRowClick = (id) => {
    navigate("/location", { state: { locationId: id } });
  };
 
  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/edit-location/${id}`);
  };
 
 
 
  const handleDelete = (id, e) => {
    e.stopPropagation();
    console.log("Delete clicked:", id);
    setSelectedLocation(id);
    setDeleteModalOpen(true);
  };
 
 
  const confirmDelete = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({url:`${apiUrl}/locations/${selectedLocation}`,
        method: "DELETE"
      });
console.log("Delete response:", res);
 
      //if (!res.ok) throw new Error("Failed to delete location");
 
      setDeleteModalOpen(false);
      setSuccessPopup(true);
 
      setLocations((prev) => prev.filter((loc) => loc.loc_id !== selectedLocation));
 
      setTimeout(() => setSuccessPopup(false), 2000);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting location. Please try again.");
    }
  };
 
 
 
  const toggleDropdown = (index, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === index ? null : index);
  };
 
  const filteredLocations = locations
    .filter((location) =>
      location.loc_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((loc) => (selectedRegion ? loc.region_name === selectedRegion : true))
    .filter((loc) => (selectedState ? loc.state_name === selectedState : true))
    .filter((loc) => (selectedCity ? loc.city_name === selectedCity : true))
    .filter((loc) =>
      selectedStatus === ""
        ? true
        : selectedStatus === "Active"
          ? loc.is_active
          : !loc.is_active
    );
 
  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
 
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
 
  return (
    <div className="component-body">
      {/* Header */}
      {!hideActions && (
        <div className="w-full mt-0 flex flex-col">
          <div className="flex flex-row items-center justify-between w-full">
            <h1 className="page-header select-none ml-0">Location Master</h1>
            {/* Search / Filter / Add */}
            <div className="flex flex-row items-center gap-3  pt-14">
              <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 pr-12 border rounded-md focus:outline-none focus:ring-1 ${
                  isDarkMode
                    ? "border-slate-600 bg-[#020617] text-slate-100 placeholder-slate-500 focus:ring-slate-500"
                    : "border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500"
                }`}
                style={{ paddingRight: "3rem" }}
              />
              <lord-icon
                src="https://cdn.lordicon.com/pagmnkiz.json"
                trigger="hover"
                colors={
                  isDarkMode
                    ? "primary:#ffffff,secondary:#9ce5f4"
                    : "primary:#4b5563,secondary:#6366f1"
                }
                style={{
                  width: "30px",
                  height: "30px",
                  position: "absolute",
                  right: "0",
                  margin: "10px",
                  cursor: "pointer",
                }}
              ></lord-icon>
            </div>
 
          {/* <select
            className="appearance-none px-3 py-2 pr-10 border bg-[#0a101f] text-white border-gray-300 rounded-md focus:outline-none focus:ring-1"
          >
            <option value="">Filter By</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <IoFilter className="absolute right-3 top-[50%] transform -translate-y-1/2 text-white" /> */}
              <div className="relative flex items-center">
                <select
                  className={`appearance-none px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-1 ${
                    isDarkMode
                      ? "bg-[#020617] text-slate-100 border-slate-600 focus:ring-slate-500"
                      : "bg-white text-gray-900 border-gray-300 focus:ring-indigo-500"
                  }`}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <IoFilter
                  className={`absolute right-3 top-[50%] transform -translate-y-1/2 pointer-events-none ${
                    isDarkMode ? "text-slate-300" : "text-gray-500"
                  }`}
                />
              </div>
 
              <button
                className="text-white font-bold py-2 px-4 rounded-md shadow-md hover:brightness-110 transition"
                style={{ backgroundColor: "#76df23" }}
                onClick={() => navigate("/create-location")}
              >
                + Add Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar for dashboard view */}
      {hideActions && (
        <div className="w-full pb-2 px-3 flex-shrink-0">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              placeholder="Search Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-2 pr-12 border rounded-md focus:outline-none focus:ring-1 ${
                isDarkMode
                  ? "border-slate-600 bg-[#020617] text-slate-100 placeholder-slate-500 focus:ring-slate-500"
                  : "border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500"
              }`}
              style={{ paddingRight: "3rem" }}
            />
            <lord-icon
              src="https://cdn.lordicon.com/pagmnkiz.json"
              trigger="hover"
              colors={
                isDarkMode
                  ? "primary:#ffffff,secondary:#9ce5f4"
                  : "primary:#4b5563,secondary:#6366f1"
              }
              style={{
                width: "30px",
                height: "30px",
                position: "absolute",
                right: "0",
                margin: "10px",
                cursor: "pointer",
              }}
            ></lord-icon>
          </div>
        </div>
      )}
 
      {/* Table */}
      <div className="flex-1 overflow-hidden pt-2 w-full px-2">
        <div
          className={`flex-1 overflow-hidden relative rounded-lg border shadow-sm ${
            isDarkMode ? "bg-[#020617] border-slate-700" : "bg-white border-gray-200"
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center h-[50vh] w-full">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <table className="table-auto w-full min-w-full ">
              <thead
                className={`border-separate border-spacing-x-5 border-spacing-y-4 select-none ${
                  isDarkMode ? "bg-[#0f172b]" : "bg-[#e0e0e0]"
                }`}
              >
                <tr>
                  <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Location Name</th>
                  <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Branch Code</th>
                  <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Country</th>
 
                  {/* Region Header with Filter Icon */}
                  <th className={`px-4 py-3 text-left relative font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
                    Region
                    <IoFilter
                      className="inline ml-2 cursor-pointer text-gray-300"
                      onClick={() => setShowRegionFilter(!showRegionFilter)}
                    />
                    {showRegionFilter && (
                      <div
                        className={`absolute top-full mt-1 left-0 rounded-md shadow-lg z-20 border ${
                          isDarkMode
                            ? "bg-[#0f172b] text-slate-100 border-slate-700"
                            : "bg-white text-gray-900 border-gray-200"
                        }`}
                      >
                        <div className="max-h-40 overflow-y-auto p-2">
                          {[...new Set(locations.map(loc => loc.region_name))].map((region, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                setSelectedRegion(region);
                                setShowRegionFilter(false);
                              }}
                              className={`cursor-pointer px-2 py-1 rounded ${
                                isDarkMode
                                  ? "hover:bg-slate-800 text-slate-200"
                                  : "hover:bg-gray-100 text-gray-700"
                              }`}
                            >
                              {region}
                            </div>
                          ))}
                          <div
                            className={`text-sm mt-1 cursor-pointer px-2 py-1 rounded ${
                              isDarkMode
                                ? "text-red-400 hover:bg-slate-800"
                                : "text-red-600 hover:bg-gray-100"
                            }`}
                            onClick={() => {
                              setSelectedRegion("");
                              setShowRegionFilter(false);
                            }}
                          >
                            Clear
                          </div>
                        </div>
                      </div>
                    )}
                  </th>
 
                  {/* State Header with Filter Icon */}
                  <th className={`px-4 py-3 text-left relative font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
                    State
                    <IoFilter
                      className="inline ml-2 cursor-pointer text-gray-300"
                      onClick={() => setShowStateFilter(!showStateFilter)}
                    />
                    {showStateFilter && (
                      <div
                        className={`absolute top-full mt-1 left-0 rounded-md shadow-lg z-20 border ${
                          isDarkMode
                            ? "bg-[#0f172b] text-slate-100 border-slate-700"
                            : "bg-white text-gray-900 border-gray-200"
                        }`}
                      >
                        <div className="max-h-40 overflow-y-auto p-2">
                          {[...new Set(locations.map(loc => loc.state_name))].map((state, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                setSelectedState(state);
                                setShowStateFilter(false);
                              }}
                              className={`cursor-pointer px-2 py-1 rounded ${
                                isDarkMode
                                  ? "hover:bg-slate-800 text-slate-200"
                                  : "hover:bg-gray-100 text-gray-700"
                              }`}
                            >
                              {state}
                            </div>
                          ))}
                          <div
                            className={`text-sm mt-1 cursor-pointer px-2 py-1 rounded ${
                              isDarkMode
                                ? "text-red-400 hover:bg-slate-800"
                                : "text-red-600 hover:bg-gray-100"
                            }`}
                            onClick={() => {
                              setSelectedState("");
                              setShowStateFilter(false);
                            }}
                          >
                            Clear
                          </div>
                        </div>
                      </div>
                    )}
                  </th>
 
                  {/* City Header with Filter Icon */}
                  <th className={`px-4 py-3 text-left relative font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
                    City
                    <IoFilter
                      className="inline ml-2 cursor-pointer text-gray-300"
                      onClick={() => setShowCityFilter(!showCityFilter)}
                    />
                    {showCityFilter && (
                      <div
                        className={`absolute top-full mt-1 left-0 rounded-md shadow-lg z-20 border ${
                          isDarkMode
                            ? "bg-[#0f172b] text-slate-100 border-slate-700"
                            : "bg-white text-gray-900 border-gray-200"
                        }`}
                      >
                        <div className="max-h-40 overflow-y-auto p-2">
                          {[...new Set(locations.map(loc => loc.city_name))].map((city, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                setSelectedCity(city);
                                setShowCityFilter(false);
                              }}
                              className={`cursor-pointer px-2 py-1 rounded ${
                                isDarkMode
                                  ? "hover:bg-slate-800 text-slate-200"
                                  : "hover:bg-gray-100 text-gray-700"
                              }`}
                            >
                              {city}
                            </div>
                          ))}
                          <div
                            className={`text-sm mt-1 cursor-pointer px-2 py-1 rounded ${
                              isDarkMode
                                ? "text-red-400 hover:bg-slate-800"
                                : "text-red-600 hover:bg-gray-100"
                            }`}
                            onClick={() => {
                              setSelectedCity("");
                              setShowCityFilter(false);
                            }}
                          >
                            Clear
                          </div>
                        </div>
                      </div>
                    )}
                  </th>
 
                  <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Status</th>
                  {!hideActions && <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Actions</th>}
                </tr>
              </thead>
 
              <tbody>
                {paginatedLocations.map((location, index) => (
                  <tr
                    key={location.loc_id}
                    className={`text-sm border-b cursor-pointer transition-colors ${
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-900 text-slate-200 bg-[#0f172b]"
                        : index % 2 === 0
                        ? "border-gray-200 hover:bg-gray-50 text-gray-900 bg-white"
                        : "border-gray-200 hover:bg-gray-50 text-gray-900 bg-gray-50"
                    }`}
                    onClick={() => handleRowClick(location.loc_id)}
                  >
                    <td className={`px-4 py-3 ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{location.loc_name || "—"}</td>
                    <td className={`px-4 py-3 ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{location.branch_code || "—"}</td>
                    <td className={`px-4 py-3 ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{location.country_name || "—"}</td>
                    <td className={`px-4 py-3 ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{location.region_name || "—"}</td>
                    <td className={`px-4 py-3 ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{location.state_name || "—"}</td>
                    <td className={`px-4 py-3 ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{location.city_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          location.is_active
                            ? isDarkMode
                              ? "bg-emerald-900/60 text-emerald-300"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : isDarkMode
                              ? "bg-slate-800 text-slate-300"
                              : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {location.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {!hideActions && (
                      <td className={`px-4 py-3 relative ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>
                        <FaEllipsisV onClick={(e) => toggleDropdown(index, e)} className={`cursor-pointer ${isDarkMode ? "text-slate-300" : "text-gray-600"}`} />
                        {dropdownOpen === index && (
                          <div
                            className={`absolute right-0 mt-2 w-32 rounded-md shadow-lg z-10 ${
                              isDarkMode ? "bg-[#0f172b]" : "bg-white border border-gray-200"
                            }`}
                            onClick={(e) => e.stopPropagation()} // 🛑 Add this line
                          >
                            <div
                              className={`py-2 px-4 cursor-pointer flex justify-between items-center gap-2 ${
                                isDarkMode
                                  ? "hover:bg-[#1a253f] text-slate-200"
                                  : "hover:bg-gray-100 text-gray-700"
                              }`}
                              onClick={(e) => handleEdit(location.loc_id, e)}
                            >
                              <span>Edit</span> <FaPencilAlt className={isDarkMode ? "text-slate-300" : "text-gray-600"} />
                            </div>
                            <div
                              className={`py-2 px-4 cursor-pointer flex justify-between items-center gap-2 ${
                                isDarkMode
                                  ? "hover:bg-[#1a253f] text-slate-200"
                                  : "hover:bg-gray-100 text-gray-700"
                              }`}
                              onClick={(e) => handleDelete(location.loc_id, e)}
                            >
                              <span>Delete</span> <FaTrash className={isDarkMode ? "text-red-400" : "text-red-600"} />
                            </div>
 
                          </div>
                        )}
 
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
 
              <tfoot>
                <tr className={isDarkMode ? "bg-[#0f172b]" : "bg-white"}>
                  <td colSpan="6" className={`p-4 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                    <div className="flex gap-4 items-center">
                      <span className="text-sm">Items per page:</span>
                      <Dropdown
                        header={`${itemsPerPage}`}
                        values={[5, 10, 25, 50]}
                        containerWidth="90px"
                        bgColor={isDarkMode ? "#0f172b" : "#ffffff"}
                        textColor={isDarkMode ? "#e2e8f0" : "#1f2937"}
                        borderColor={isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#d1d5db"}
                        onChange={(val) => {
                          setItemsPerPage(val);
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </td>
                  <td colSpan="3" className={`p-4 text-right ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                    <div className="flex justify-end gap-3 items-center">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        className={`transition-colors ${
                          isDarkMode
                            ? "text-slate-400 disabled:text-slate-600 hover:text-slate-200"
                            : "text-gray-500 disabled:text-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <TfiControlSkipBackward />
                      </button>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className={`transition-colors ${
                          isDarkMode
                            ? "text-slate-400 disabled:text-slate-600 hover:text-slate-200"
                            : "text-gray-500 disabled:text-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <IoIosArrowBack />
                      </button>
                      <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className={`transition-colors ${
                          isDarkMode
                            ? "text-slate-400 disabled:text-slate-600 hover:text-slate-200"
                            : "text-gray-500 disabled:text-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <IoIosArrowForward />
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className={`transition-colors ${
                          isDarkMode
                            ? "text-slate-400 disabled:text-slate-600 hover:text-slate-200"
                            : "text-gray-500 disabled:text-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <TfiControlSkipForward />
                      </button>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
 
          )}
        </div>
      </div>
 
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-20 ${
            isDarkMode ? "bg-slate-900/60" : "bg-gray-900/20"
          }`}
        >
          <div
            className={`rounded-lg p-4 w-1/3 ${
              isDarkMode ? "bg-[#0a101f] text-white" : "bg-white text-gray-900"
            }`}
          >
            <h2 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Confirm Delete</h2>
            <p className={`mb-4 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>Are you sure you want to delete this location?</p>
            <div className="flex justify-end gap-2">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  isDarkMode
                    ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* ✅ Success Popup */}
      {successPopup && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-30 ${
            isDarkMode ? "bg-slate-900/60" : "bg-gray-900/20"
          }`}
        >
          <div
            className={`px-10 py-10 rounded-2xl shadow-2xl w-[500px] text-center relative ${
              isDarkMode ? "bg-[#0c1220] text-white" : "bg-white text-gray-900"
            }`}
          >
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              ✅
            </div>
            <h2 className={`text-2xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Location Deleted Successfully</h2>
            <p className={`text-base ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Refreshing list...</p>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default Location;
 
 
 