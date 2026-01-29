import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FaEllipsisV, FaPencilAlt, FaTrash } from "react-icons/fa";
import { IoFilter } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import "../../assets/styles/common.css";
import useClickAway from "../hooks/useClickAway";
import "./system-management.css";
import SuccessPopup from "./successPopUP";
import { TfiControlSkipBackward, TfiControlSkipForward } from "react-icons/tfi";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import useAuthFetch from '../hooks/useAuthFetch';
import { useTheme } from "../../context/ThemeContext";

const SI = () => {
  const navigate = useNavigate();
  const { isDark: isDarkMode } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSI, setSelectedSI] = useState(null);
  //   const [selectedClient, setSelectedClient] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const authFetch = useAuthFetch();
  const modalRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState(""); //search query state
  const [si, setSI] = useState([]); // state for SI data   
  //   const [clients, setClients] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const apiURL = import.meta.env.VITE_API_BASE_URL;

  const filteredsi = Array.isArray(si)
    ? si.filter((si) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        si.siName?.toLowerCase().includes(query) ||
        si.siId?.toString().toLowerCase().includes(query);
      const matchesStatus =
        selectedOption === "" ||
        (selectedOption === "active" && si.status === true) ||
        (selectedOption === "inactive" && si.status === false);
      return matchesSearch && matchesStatus;
    })
    : [];

  const totalPages = Math.ceil(filteredsi.length / itemsPerPage);
  const paginatedsi = filteredsi.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // reset to first page
  };


  const options = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  // Check if coming from create client page with success
  useEffect(() => {
    if (location.state?.siCreated) {
      setShowSuccessPopup(true);
      // Clear the state to prevent showing popup on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchSi = async () => {
      try {
        const res = await authFetch({
          url: `${apiURL}/si`,
          method: 'GET'
        });


        // Try accessing the right layer:
        const siList = Array.isArray(res.data) ? res.data :
          Array.isArray(res.data.data) ? res.data.data :
            [];
        setSI(siList);

        if (Array.isArray(res.data)) {
          setSI(res.data);
        } else {
          setSI([]); // fallback
          console.error("Expected an array but got:", typeof res.data);
        }
      } catch (err) {
        console.error("Error fetching si:", err);
        setSI([]);
      }
    };

    fetchSi();
  }, []);

  const handleSelect = (option) => {
    setSelectedOption(option.value);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen !== null) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [dropdownOpen]);
  const handleRowClick = (siId) => {
    console.log("Row clicked with siId:", siId);
    navigate(`/si-details/${siId}`);
  };

  const toggleDropdown = (index, event) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === index ? null : index);
  };

  const handleEdit = (siId, event) => {
    event.stopPropagation();
    navigate(`/edit-si/${siId}`);
  };

  const handleDelete = (si, event) => {
    event.stopPropagation();
    setSelectedSI(si);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSI) return;

    const apiURL = import.meta.env.VITE_API_BASE_URL;
    const userId = localStorage.getItem("userId");

    try {
      const response = await authFetch({
        url: `${apiURL}/si/${selectedSI.siId}`,
        method: "POST",
        body: { deleted_by: userId },
      });

      if (response.status === 200) {
        console.log("si deleted successfully:", response.data);

        // Optionally show a toast or popup
        setDeleteModalOpen(false);
        setSelectedSI(null);

        // Refetch clients or filter out the deleted one
        setSI((prevSI) =>
          prevSI.filter((si) => si.siId !== selectedSI.siId)
        );
        // Show delete success popup
        setShowDeleteSuccessPopup(true);
      }
    } catch (error) {
      console.error("Error deleting si:", error);
      alert("Failed to delete si. Please try again.");
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
  };

  useClickAway(modalRef, () => setDeleteModalOpen(false));


  // Helper function to get status color
  const getStatusColor = (status) => {
    if (status === true) return "#10B981";   // green
    if (status === false) return "#EF4444";  // red
    return "#6B7280";// Default gray color
  };

  return (
    <div className="component-body">
      <div className="si-body">
        <div>
          <h1 className="page-header select-none ml-2">System Management</h1>
          
        </div>
        <div className="si-utility flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search SI..."
                className={`border rounded-md px-4 pr-10 py-2 h-10 focus:outline-none ${
                  isDarkMode
                    ? "border-white text-white bg-transparent"
                    : "border-gray-300 text-gray-900 bg-white"
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              onClick={() => {
                setSelectedOption("");
                setSearchQuery("");
                setIsOpen(false);
              }}
            >
              <lord-icon
                src="https://cdn.lordicon.com/rsbokaso.json"
                trigger="hover"
                colors={isDarkMode ? "primary:#ffffff" : "primary:#111827"}
                style={{ width: "20px", height: "20px" }}
              ></lord-icon>
            </div>

            {/* Create si Button */}
            <button
              className="h-10 px-4 font-bold text-white rounded-md hover:opacity-90 transition duration-300"
              style={{ backgroundColor: "#76df23" }}
              onClick={() => navigate("/create-si")}
            >
              + Add SI
            </button>
          </div>
        </div>
      </div>
      <div className="si-table-container">
        <div className="overflow-x-auto">
          <table className="si-table-body">
            <thead className={`border-separate border-spacing-x-5 border-spacing-y-2 select-none ${
              isDarkMode ? "bg-[#0f172b]" : "bg-[#2c3e50]"
            }`}>
              <tr>
                <th className="si-table-header text-white">SI Name</th>
                <th className="si-table-header text-white">Status</th>
                <th className="si-table-header text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedsi.map((si, index) => (

                <tr key={index} className="si-table-row text" onClick={() => handleRowClick(si.siId)}>

                  <td
                    className="si-table-cell flex items-center"
                    // onClick={() => handleRowClick(client.clientId)}
                    style={{ paddingLeft: "2rem" }}
                  >
                    <div className="flex items-center">
                      <img
                        src={si.logoUrl || "https://via.placeholder.com/30"}
                        alt={`${si.siName} logo`}
                        className="w-10 h-10 rounded-md object-contain bg-white p-1 shadow-sm border border-gray-300 mr-3"
                      />
                      {si.siName}
                    </div>
                  </td>
                  <td className="client-table-cell">
                    <span
                      style={{
                        color: getStatusColor(si.status),
                        fontWeight: "500",
                      }}
                    >
                      {si.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="client-table-cell relative">
                  <div className="relative inline-block">
                    <FaEllipsisV
                      className="ml-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(index, e);
                      }}
                    />

                    {dropdownOpen === index && (
                      <div
                        className={`absolute top-1/2 left-1/2 z-[9999] shadow-lg rounded-md px-4 py-2 ${
                          isDarkMode
                            ? "bg-[#0f172b] text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                        style={{
                          minWidth: '120px',
                          transform: 'translate(-50%, -50%)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`flex items-center justify-between cursor-pointer px-2 py-1 rounded ${
                            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(si.siId, e);
                          }}
                        >
                          Edit
                          <FaPencilAlt />
                        </div>
                        <div
                          className={`flex items-center justify-between cursor-pointer px-2 py-1 rounded mt-1 ${
                            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                          }`}
                          onClick={(e) => handleDelete(si, e)}
                        >
                          Delete
                          <FaTrash />
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="si-table-footer border-spacing-x-5 border-spacing-y-2 select-none">
              <tr>
                <td colSpan="5" className="p-2">
                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 px-2 w-full">
                    <div className="flex items-center gap-2">
                      <label htmlFor="itemsPerPage" className={isDarkMode ? "text-white" : "text-gray-900"}>Items per page</label>
                      <select
                        id="itemsPerPage"
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className={`px-2 py-1 rounded-md border ${
                          isDarkMode
                            ? "bg-[#0f172b] text-white border-gray-600"
                            : "bg-white text-gray-900 border-gray-300"
                        }`}
                      >
                        {[5, 10, 15, 20, 25].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={isDarkMode ? "text-white" : "text-gray-900"}>
                      Page {currentPage} of {totalPages}
                    </div>

                    <div className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      <button onClick={() => handlePageChange(1)} disabled={currentPage === 1}><TfiControlSkipBackward /></button>
                      <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><IoIosArrowBack /></button>
                      <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><IoIosArrowForward /></button>
                      <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}> <TfiControlSkipForward /></button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <div className={`rounded-lg p-8 ${
            isDarkMode ? "bg-[#0c1220] text-white" : "bg-white text-gray-900"
          }`} ref={modalRef}>
            <h2 className="font-bold mb-4 text-lg">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete SI <strong>{selectedSI?.siName}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="font-bold py-2 px-4 rounded"
                style={{ backgroundColor: "#76df23", color: "white" }}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={handleCloseSuccessPopup}
        message="SI Created Successfully"
      />
      {/* Delete Success Popup */}
      <SuccessPopup
        isOpen={showDeleteSuccessPopup}
        onClose={() => setShowDeleteSuccessPopup(false)}
        message="SI Deleted Successfully"
      />
    </div>
  );
};

export default SI;
