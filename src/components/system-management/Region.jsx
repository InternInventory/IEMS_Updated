// src/pages/Region.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoFilter } from "react-icons/io5";
import { FaEllipsisV, FaTrash, FaPencilAlt } from "react-icons/fa";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import Dropdown from "../Dropdown/Dropdown";
import useAuthFetch from "../hooks/useAuthFetch";
import { useTheme } from "../../context/ThemeContext";

const Region = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  const [regions, setRegions] = useState([]);
  const [countries, setCountries] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countryFilterOpen, setCountryFilterOpen] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const [regionsRes, countriesRes] = await Promise.all([
          authFetch({ url: `${apiURL}/regionmaster` }),
          authFetch({ url: `${apiURL}/countries1` }),
        ]);
        setRegions(regionsRes?.data || []);
        setCountries(countriesRes?.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to fetch regions or countries");
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/edit-region/${id}`);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setSelectedRegionId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      await authFetch({
        url: `${apiURL}/regionmaster/${selectedRegionId}`,
        method: "DELETE",
      });

      setRegions((prev) => prev.filter((r) => r.region_id !== selectedRegionId));
      setDeleteModalOpen(false);
      setSuccessPopup(true);
      setTimeout(() => setSuccessPopup(false), 2000);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting region.");
    }
  };

  const filteredRegions = regions
    .filter((region) =>
      region.region_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((region) =>
      selectedCountry ? region.country_name === selectedCountry : true
    )
    .filter((region) =>
      selectedStatus === ""
        ? true
        : selectedStatus === "Active"
        ? region.is_active
        : !region.is_active
    );

  const paginatedRegions = filteredRegions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredRegions.length / itemsPerPage);

  return (
    <div className={`flex flex-col items-start justify-start p-3 pt-4 pl-1 2xl:gap-2 2xl:pt-6 ${
      !isDarkMode ? 'bg-[#f8f9fa] min-h-screen' : ''
    }`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between w-full pb-4 pr-3 space-y-4 md:space-y-0">
        <div>
          <h1 className={`font-bold text-xl md:text-2xl 2xl:text-3xl pl-3 ml-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Region Master
          </h1>
        
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-2 w-full md:w-auto px-3">
          <div className="relative w-full md:w-auto flex items-center">
            <input
              type="text"
              placeholder="Search Region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-2 pr-12 border rounded-md ${
                isDarkMode
                  ? 'bg-transparent text-white border-gray-600 placeholder-gray-400'
                  : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
              }`}
            />
          </div>

          <div className="relative w-full md:w-auto flex items-center">
            <select
              className={`appearance-none px-3 py-2 pr-10 border rounded-md ${
                isDarkMode ? "bg-[#0a101f] text-white border-gray-300" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <IoFilter className="absolute right-3 top-[50%] transform -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            className="text-white font-bold py-2 px-4 rounded-md shadow-md hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
            onClick={() => navigate("/create-region")}
          >
            + Add Region
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-visible p-3 w-full ml-6">
        {loading ? (
          <div className={`flex items-center justify-center h-[50vh] w-full ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Loading...
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <table className="table-auto w-full min-w-full">
            <thead className={`border-separate border-spacing-x-5 border-spacing-y-4 ${
              isDarkMode ? "bg-[#0f172b] text-white" : "bg-[#2c3e50] text-white"
            }`}>
              <tr>
                <th className="px-4 py-2 text-left">Region Name</th>
                <th className="px-4 py-2 text-left relative">
                  <div className="flex items-center space-x-1">
                    <span>Country</span>
                    <IoFilter
                      className="cursor-pointer text-white"
                      onClick={() => setCountryFilterOpen((prev) => !prev)}
                    />
                  </div>
                  {countryFilterOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-md shadow-lg z-20 ${
                      isDarkMode ? "bg-[#0f172b] border-gray-300" : "bg-white border-gray-300"
                    }`}>
                      <select
                        className={`p-2 text-sm w-40 ${
                          isDarkMode ? "bg-[#0f172b] text-white" : "bg-white text-gray-900"
                        }`}
                        value={selectedCountry}
                        onChange={(e) => {
                          setSelectedCountry(e.target.value);
                          setCountryFilterOpen(false);
                          setCurrentPage(1);
                        }}
                      >
                        <option value="">All Countries</option>
                        {countries.map((country) => (
                          <option
                            key={country.country_id}
                            value={country.country_name}
                          >
                            {country.country_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRegions.map((region, index) => (
                <tr
                  key={region.region_id}
                  className={`text-sm border-b ${
                    isDarkMode ? "border-gray-600 hover:bg-[#1a253f] text-white" : "border-gray-200 hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <td className="px-4 py-2">{region.region_name || "—"}</td>
                  <td className="px-4 py-2">{region.country_name || "—"}</td>
                  <td className="px-4 py-2">
                    {region.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-2 relative">
                    <FaEllipsisV
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(dropdownOpen === index ? null : index);
                      }}
                      className={`cursor-pointer ${
                        isDarkMode ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                    {dropdownOpen === index && (
                      <div className={`absolute right-0 mt-2 w-32 rounded-md shadow-lg z-10 ${
                        isDarkMode ? "bg-[#0f172b]" : "bg-white border border-gray-200"
                      }`}>
                        <div
                          className={`py-2 px-4 cursor-pointer flex justify-between ${
                            isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-50 text-gray-700"
                          }`}
                          onClick={(e) => handleEdit(region.region_id, e)}
                        >
                          Edit <FaPencilAlt />
                        </div>
                        <div
                          className={`py-2 px-4 cursor-pointer flex justify-between ${
                            isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-50 text-gray-700"
                          }`}
                          onClick={(e) => handleDelete(region.region_id, e)}
                        >
                          Delete <FaTrash />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" className={`p-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <div className="flex gap-4 items-center">
                    Items per page:
                    <Dropdown
                      header={`${itemsPerPage}`}
                      values={[5, 10, 25, 50]}
                      containerWidth="90px"
                      bgColor={isDarkMode ? "#0f172b" : "white"}
                      textColor={isDarkMode ? "white" : "#111827"}
                      borderColor={!isDarkMode ? "#d1d5db" : ""}
                      onChange={(val) => {
                        setItemsPerPage(val);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </td>
                <td colSpan="2" className={`p-3 text-right ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <div className="flex justify-end gap-2 items-center">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className={`${
                        currentPage === 1
                          ? isDarkMode ? 'text-gray-600' : 'text-gray-400'
                          : isDarkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-600'
                      }`}
                    >
                      <TfiControlSkipBackward />
                    </button>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className={`${
                        currentPage === 1
                          ? isDarkMode ? 'text-gray-600' : 'text-gray-400'
                          : isDarkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-600'
                      }`}
                    >
                      <IoIosArrowBack />
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className={`${
                        currentPage === totalPages
                          ? isDarkMode ? 'text-gray-600' : 'text-gray-400'
                          : isDarkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-600'
                      }`}
                    >
                      <IoIosArrowForward />
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className={`${
                        currentPage === totalPages
                          ? isDarkMode ? 'text-gray-600' : 'text-gray-400'
                          : isDarkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-600'
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className={`fixed inset-0 flex items-center justify-center z-20 ${
          isDarkMode ? 'bg-black bg-opacity-50' : 'bg-gray-900 bg-opacity-20'
        }`}>
          <div className={`rounded-lg p-4 w-1/3 ${
            isDarkMode ? 'bg-[#0c1220] text-white' : 'bg-white text-gray-900'
          }`}>
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete this region?</p>
            <div className="flex justify-end">
              <button
                className={`px-4 py-2 rounded mr-2 ${
                  isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'
                }`}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {successPopup && (
        <div className={`fixed inset-0 flex items-center justify-center z-30 ${
          isDarkMode ? 'bg-black bg-opacity-50' : 'bg-gray-900 bg-opacity-20'
        }`}>
          <div className={`px-10 py-10 rounded-2xl shadow-2xl w-[500px] text-center relative ${
            isDarkMode ? 'bg-[#0c1220] text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              ✅
            </div>
            <h2 className={`text-2xl font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Region Deleted Successfully
            </h2>
            <p className={`text-base ${
              isDarkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>Refreshing list...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Region;
