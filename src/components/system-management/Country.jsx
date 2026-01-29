import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoFilter } from "react-icons/io5";
import { FaEllipsisV, FaTrash, FaPencilAlt } from "react-icons/fa";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import Dropdown from "../Dropdown/Dropdown";
import useAuthFetch from "../hooks/useAuthFetch";
import { useTheme } from "../../context/ThemeContext";

const Country = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [countries, setCountries] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [successPopup, setSuccessPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCountries = async () => {
  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    const response = await authFetch({ url: `${apiURL}/countries1` });
    setCountries(response.data); // Axios puts your data in .data
    setLoading(false);
  } catch (err) {
    setError("Failed to fetch countries");
    setLoading(false);
  }
};
    fetchCountries();
  }, []);

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (!event.target.closest(".dropdown-menu") && !event.target.closest(".dropdown-toggle")) {
      setDropdownOpen(null);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);


  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/edit-country/${id}`);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setSelectedCountry(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
const res = await authFetch({
  url: `${apiURL}/master/country/${selectedCountry}`,
  method: "DELETE"
});
if (res.data?.error) throw new Error(res.data.error);



      setDeleteModalOpen(false);
      setSuccessPopup(true);
      setCountries((prev) => prev.filter((c) => c.country_id !== selectedCountry));
      setTimeout(() => setSuccessPopup(false), 2000);
    } catch (err) {
      alert("Error deleting country. Please try again.");
    }
  };

  const toggleDropdown = (index, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === index ? null : index);
  };

  const filteredCountries = countries
    .filter((c) => c.country_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((c) =>
      selectedStatus === ""
        ? true
        : selectedStatus === "Active"
        ? c.is_active
        : !c.is_active
    );

  const paginatedCountries = filteredCountries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);

  return (
    <div className={`flex flex-col items-start justify-start p-3 pt-4 pl-1 ${
      !isDarkMode ? 'bg-[#f8f9fa] min-h-screen' : ''
    }`}>
      {/* Header */}
      <div className="flex justify-between w-full pb-4 pr-3">
        <div>
          <h1 className={`font-bold text-2xl pl-3 ml-4 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>Country Master</h1>
          
        </div>

        {/* Search / Filter / Add */}
        <div className="flex gap-3 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`px-3 py-2 pr-12 border rounded-md ${
                isDarkMode
                  ? "bg-transparent text-white border-gray-600 placeholder-gray-400"
                  : "bg-white text-gray-900 border-gray-300 placeholder-gray-500"
              }`}
              style={{ paddingRight: "3rem" }}
            />
            <lord-icon
              src="https://cdn.lordicon.com/pagmnkiz.json"
              trigger="hover"
              colors={isDarkMode ? "primary:#ffffff,secondary:#9ce5f4" : "primary:#4b5563,secondary:#6366f1"}
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

          <div className="relative">
            <select
              className={`px-3 py-2 pr-10 border rounded-md ${
                isDarkMode ? "bg-[#0a101f] text-white border-gray-300" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            
          </div>

          <button
            className="text-white font-bold py-2 px-4 rounded-md shadow-md hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
            onClick={() => navigate("/create-country")}
          >
            + Add Country
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-visible p-3 w-full ml-5">
        {loading ? (
          <div className={`text-center ${isDarkMode ? "text-white" : "text-gray-900"}`}>Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <table className="table-auto w-full">
            <thead className={isDarkMode ? "bg-[#0f172b] text-white" : "bg-[#2c3e50] text-white"}>
              <tr>
                <th className="px-4 py-2 text-left">Country Name</th>
                <th className="px-4 py-2 text-left">Country Code</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCountries.map((c, index) => (
                <tr
                  key={c.country_id}
                  className={`border-b text-sm cursor-default ${
                    isDarkMode
                      ? "border-gray-600 hover:bg-[#1a253f] text-white"
                      : "border-gray-200 hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <td className="px-4 py-2">{c.country_name || "—"}</td>
                  <td className="px-4 py-2">{c.country_code || "—"}</td>
                  <td className="px-4 py-2">{c.is_active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-2 relative">
                  <FaEllipsisV onClick={(e) => toggleDropdown(index, e)} className={`cursor-pointer dropdown-toggle ${
                    isDarkMode ? "text-white" : "text-gray-600"
                  }`} />
                  {dropdownOpen === index && (
                    <div
                        className={`absolute top-8 right-3 w-36 rounded-md shadow-lg z-10 dropdown-menu ${
                          isDarkMode ? "bg-[#0f172b]" : "bg-white border border-gray-200"
                        }`}
                        style={{
                          minWidth: '120px',
                          maxWidth: '180px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                      <div
                        className={`py-2 px-4 cursor-pointer flex justify-between ${
                          isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-100 text-gray-700"
                        }`}
                        onClick={(e) => handleEdit(c.country_id, e)}
                      >
                        Edit <FaPencilAlt />
                      </div>
                      <div
                        className={`py-2 px-4 cursor-pointer flex justify-between ${
                          isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-100 text-gray-700"
                        }`}
                        onClick={(e) => handleDelete(c.country_id, e)}
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
              <tr className={isDarkMode ? "text-white" : "text-gray-900"}>
                <td colSpan="2" className="p-3">
                  <div className="flex gap-4 items-center">
                    Items per page:
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
                <td colSpan="2" className="p-3 text-right">
                  <div className="flex justify-end gap-2 items-center">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={isDarkMode ? "text-white disabled:opacity-50" : "text-gray-600 disabled:opacity-50"}>
                      <TfiControlSkipBackward />
                    </button>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className={isDarkMode ? "text-white disabled:opacity-50" : "text-gray-600 disabled:opacity-50"}>
                      <IoIosArrowBack />
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className={isDarkMode ? "text-white disabled:opacity-50" : "text-gray-600 disabled:opacity-50"}>
                      <IoIosArrowForward />
                    </button>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className={isDarkMode ? "text-white disabled:opacity-50" : "text-gray-600 disabled:opacity-50"}>
                      <TfiControlSkipForward />
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Modals */}
      {deleteModalOpen && (
        <div className={`fixed inset-0 flex items-center justify-center z-20 ${
          isDarkMode ? "bg-black bg-opacity-50" : "bg-gray-900/20"
        }`}>
          <div className={`rounded-lg p-4 w-1/3 ${
            isDarkMode ? "bg-[#0a101f] text-white" : "bg-white text-gray-900"
          }`}>
            <h2 className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Confirm Delete</h2>
            <p className={`mb-4 ${
              isDarkMode ? "text-white" : "text-gray-600"
            }`}>Are you sure you want to delete this country?</p>
            <div className="flex justify-end">
              <button className={`px-4 py-2 rounded mr-2 ${
                isDarkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`} onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {successPopup && (
        <div className={`fixed inset-0 flex items-center justify-center z-30 ${
          isDarkMode ? "bg-black bg-opacity-50" : "bg-gray-900/20"
        }`}>
          <div className={`px-10 py-10 rounded-2xl shadow-2xl w-[500px] text-center relative ${
            isDarkMode ? "bg-[#0c1220] text-white" : "bg-white text-gray-900"
          }`}>
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              ✅
            </div>
            <h2 className={`text-2xl font-semibold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Country Deleted Successfully</h2>
            <p className={`text-base ${
              isDarkMode ? "text-slate-400" : "text-gray-500"
            }`}>Refreshing list...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Country;
