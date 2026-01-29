import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FaEllipsisV, FaPencilAlt, FaTrash } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoFilter } from "react-icons/io5";
import { TfiControlSkipBackward, TfiControlSkipForward } from "react-icons/tfi";
import { useNavigate } from "react-router-dom";
import "../../assets/styles/common.css";
import useClickAway from "../hooks/useClickAway";
import { useTheme } from "../../context/ThemeContext";
import "./client.css";
import SuccessPopup from "./successPopUP";
import useAuthFetch from '../hooks/useAuthFetch';
const Client = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState(""); //search query state
  const [clients, setClients] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Compute filtered + paginated data
  const filteredClients = Array.isArray(clients)
    ? clients.filter((client) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        client.clientName?.toLowerCase().includes(query) ||
        client.clientId?.toString().toLowerCase().includes(query);
      const matchesStatus =
        selectedOption === "" ||
        client.status?.toLowerCase() === selectedOption;
      return matchesSearch && matchesStatus;
    })
    : [];

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
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
    if (location.state?.clientCreated) {
      setShowSuccessPopup(true);
      // Clear the state to prevent showing popup on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchClients = async () => {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      try {
        //const res = await axios.get(`${apiURL}/client`);
        const res = await authFetch({
          url: `${apiURL}/client`,
          method: "GET"
        });
        //setClients(res.data);

        // Ensure the data is an array
        if (Array.isArray(res.data)) {
          setClients(res.data);
        } else {
          setClients([]); // fallback
          console.error("Expected an array but got:", typeof res.data);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
        setClients([]);
      }
    };

    fetchClients();
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


  const handleRowClick = (clientId) => {
    navigate(`/client-details/${clientId}`);
  };

  const toggleDropdown = (index, event) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === index ? null : index);
  };

  const handleEdit = (clientId, event) => {
    event.stopPropagation();
    navigate(`/client/edit/${clientId}`);
  };

  const handleDelete = (client, event) => {
    event.stopPropagation();
    setSelectedClient(client);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;

    const apiURL = import.meta.env.VITE_API_BASE_URL;


    try {

      const response = await authFetch({
        url: `${apiURL}/client/${selectedClient.clientId}`,
        method: "POST"
      });

      if (response.status === 200) {
        console.log("Client deleted successfully:", response.data);

        // Optionally show a toast or popup
        setDeleteModalOpen(false);
        setSelectedClient(null);

        // Refetch clients or filter out the deleted one
        setClients((prevClients) =>
          prevClients.filter((client) => client.clientId !== selectedClient.clientId)
        );
        // Show delete success popup
        setShowDeleteSuccessPopup(true);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client. Please try again.");
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
  };

  useClickAway(modalRef, () => setDeleteModalOpen(false));

  // Helper function to get status color
  const getStatusColor = (status) => {
    if (status?.toLowerCase() === "active") {
      return "#10B981"; // Green color
    } else if (status?.toLowerCase() === "inactive") {
      return "#EF4444"; // Red color
    }
    return "#6B7280"; // Default gray color
  };

  return (
    <div className={`component-body mb-4 ${!isDarkMode ? 'bg-[#f8f9fa]' : ''}`}>
      <div className="client-body">
        <div>
          <h1 className="page-header select-none ml-3 pt-4">Clients</h1>

        </div>
        <div className="client-utility flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-7 ml-5">
          {/* Search Bar */}
          <div className="flex items-center gap-2 w-full md:w-auto ">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search Client..."
                className={`border rounded-md px-4 pr-10 py-2 h-10 ml-2 focus:outline-none ${
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
            {/* <div
  className="flex items-center justify-center h-10 w-10 border border-white rounded-md cursor-pointer "
  onClick={() => {
    setSelectedOption("");
    setSearchQuery("");
    setIsOpen(false);
  }}
>
  
              <lord-icon
                src="https://cdn.lordicon.com/rsbokaso.json"
                trigger="hover"
                colors="primary:#ffffff"
                style={{ width: "20px", height: "20px" }}
              ></lord-icon>
            </div> */}

            {/* Create Client Button */}
            <button
              className="h-10 px-4 font-bold text-white rounded-md hover:opacity-90 transition duration-300"
              style={{ backgroundColor: "#76df23" }}
              // onClick={() => navigate("/create-client")}
              onClick={() => navigate("/client/create")}
            >
              + Add Client
            </button>
          </div>


        </div>


      </div>


      <div className="client-table-container">
        <div className="overflow-hidden">
          <table className="client-table-body">
            <thead className={`border-separate border-spacing-x-5 border-spacing-y-2 select-none ${
              isDarkMode ? "bg-[#0f172b]" : "bg-[#2c3e50] text-white"
            }`}>
              <tr>
                <th className="client-table-header">Client Name</th>
                {/* <th className="client-table-header">Client ID</th> */}
                <th className="client-table-header">No. of Locations</th>
                <th className="client-table-header">Registration Number</th>
                {/* <th className="client-table-header">Contact Number</th>
                <th className="client-table-header">E-mail ID</th> */}
                <th className="client-table-header">Status</th>
                <th className="client-table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client, index) => (
                <tr key={index} className={`client-table-row text transition-colors ${
                  isDarkMode
                    ? "text-white"
                    : index % 2 === 0
                    ? "bg-white text-gray-900"
                    : "bg-gray-50 text-gray-900"
                }`} onClick={() => handleRowClick(client.clientId)}>
                  <td
                    className="client-table-cell flex items-center"
                    // onClick={() => handleRowClick(client.clientId)}
                    style={{ paddingLeft: "2rem" }}
                  >
                    <div className="flex items-center">
                      <img
                        src={client.logoUrl || "https://via.placeholder.com/30"}
                        alt={`${client.clientName} logo`}
                        className="w-10 h-10 rounded-md object-contain bg-white p-1 shadow-sm border border-gray-300 mr-3"
                      />
                      {client.clientName}
                    </div>
                  </td>
                  {/* <td className="client-table-cell">{client.clientId}</td> */}
                  <td className="client-table-cell">{client.locations}</td>
                  <td className="client-table-cell">{client.regNumber}</td>

                  {/* <td className="client-table-cell">{client.contact}</td>
                  <td className="client-table-cell">{client.email}</td> */}
                  <td className="client-table-cell">
                    <span
                      style={{
                        color: getStatusColor(client.status),
                        fontWeight: "500",
                      }}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="client-table-cell relative">
                    <FaEllipsisV
                      className="ml-2 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); toggleDropdown(index, e); }}
                    />
                    {dropdownOpen === index && (
                      <div
                        className="action-dropdown-container shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="action-dropdown-element"
                          onClick={(e) => { e.stopPropagation(); handleEdit(client.clientId, e); }}
                        >
                          Edit{" "}
                          <FaPencilAlt className="ml-2" />
                        </div>
                        <div
                          className="action-dropdown-element"
                          onClick={(e) => handleDelete(client, e)}
                        >
                          Delete <FaTrash className="ml-2" />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="client-table-footer border-spacing-x-5 border-spacing-y-2 select-none">
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
        <div className="client-delete-modal-container">
          <div className="client-delete-modal-body" ref={modalRef}>
            <h2 className="client-delete-modal-header">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete client  <strong>{selectedClient?.clientName}</strong>?
            </p>
            <div className="flex justify-end">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
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
        message="Client Created Successfully"
      />
      {/* Delete Success Popup */}
      <SuccessPopup
        isOpen={showDeleteSuccessPopup}
        onClose={() => setShowDeleteSuccessPopup(false)}
        message="Client Deleted Successfully"
      />
    </div>
  );
};

export default Client;
