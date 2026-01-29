import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  FaEllipsisV,
  FaTrash,
  FaPencilAlt,
} from "react-icons/fa";
import {
  IoIosArrowForward,
  IoIosArrowBack,
} from "react-icons/io";
import {
  TfiControlSkipForward,
  TfiControlSkipBackward,
} from "react-icons/tfi";
import { IoFilter } from "react-icons/io5";
import { useTheme } from '../../context/ThemeContext';
import useAuthFetch from '../hooks/useAuthFetch';

const TableComponent = ({ users }) => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const filterRef = useRef(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutsideFilter = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideFilter);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideFilter);
    };
  }, []);


  const options = [
    { value: "", label: "All" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ];

  // 1. Filter users
  const filteredUsers = users.filter((user) =>
    (
      selectedFilter === "" ||
      (selectedFilter === "Active" && user.is_active) ||
      (selectedFilter === "Inactive" && !user.is_active)
    ) &&
    (
      `${user.fname} ${user.lname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contact_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // 2. Apply pagination
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 3. Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter]);

  const handleCreateUser = () => navigate("/create-user");

  const toggleDropdown = (index, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === index ? null : index);
  };

  const handleEdit = (id, e) => {
    e.stopPropagation();
    if (!id || id === "undefined") {
      alert("Invalid user ID");
      return;
    }
    navigate(`/edit-user/${id}`);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    console.log("Selected User ID:", id); // Debugging
    setSelectedUser(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const deleted_by = localStorage.getItem("userId");

      const response = await authFetch({
        url: `${apiURL}/users/${selectedUser}`,
        method: "DELETE"
      });

      if (response.status !== 200) throw new Error("Failed to delete user");

      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 5000);
      window.location.reload(); // or call fetchUsers() to reload data without full refresh
    } catch (error) {
      console.error("Delete failed:", error.message);
      alert("An error occurred: " + error.message);
    } finally {
      setDeleteModalOpen(false);
      setSelectedUser(null);
    }
  };


  const handleSelect = (option) => {
    setSelectedFilter(option.value);
    setIsOpen(false);
    setCurrentPage(1);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto pt-2 w-full px-2">

        <h1 className="page-header select-none ml-0">User Management</h1>
       
        {/* Popup */}
        {showPopup && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center">
              <span
                className="absolute top-4 right-6 text-gray-400 text-2xl cursor-pointer"
                onClick={() => setShowPopup(false)}
              >
                ×
              </span>
              <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
                ✅
              </div>
              <h2 className="text-2xl font-semibold mb-2">User Deleted Successfully</h2>
              <p className="text-base text-slate-400">Redirecting to user list...</p>
            </div>
          </div>
        )}
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mb-4">
          <input
            type="text"
            placeholder="Search user..."
            className="px-4 py-2 pr-10 rounded-md border border-gray-600 bg-[#0a101f] text-white placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="relative" ref={filterRef}>
            <div
              className="flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-md bg-[#0a101f] text-white cursor-pointer"
              onClick={() => setIsOpen(!isOpen)}
            >
              {selectedFilter
                ? options.find((opt) => opt.value === selectedFilter).label
                : "Filter By"}
              <IoFilter />
            </div>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#0f172b] rounded-md shadow-lg z-10">
                {options.map((option) => (
                  <div
                    key={option.value}
                    className="py-2 px-4 hover:bg-[#1a253f] cursor-pointer"
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>


          <button
            onClick={handleCreateUser}
            className="text-white font-bold py-2 px-4 rounded-md shadow-md hover:brightness-110 transition"
            style={{ backgroundColor: "#76df23" }}
          >
            + Add User
          </button>

        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className={`w-full min-w-full table-auto ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            <thead className={isDarkMode ? "bg-[#0f172b]" : "bg-[#2c3e50] text-white"}>
              <tr>
                <th className="px-4 py-2 text-left">Username</th>
                <th className="px-4 py-2 text-left">First Name</th>
                <th className="px-4 py-2 text-left">Last Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">Contact No</th>
                <th className="px-4 py-2 text-left">Designation</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, index) => (
                <tr key={index} className={`border-b transition-colors ${
                  isDarkMode
                    ? "border-gray-700 bg-[#0f172b] hover:bg-[#1a253f]"
                    : index % 2 === 0
                    ? "border-gray-200 bg-white hover:bg-gray-50"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-50"
                }`}>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.username}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.fname}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.lname}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.email}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.country_name}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.contact_no}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.designation || '-'}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.role_name}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>{user.entity_name || user.org_name || '-'}</td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    {user.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className={`px-4 py-2 relative flex items-center ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    <FaEllipsisV
                      className={`ml-2 cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-600'}`}
                      onClick={(e) => toggleDropdown(index, e)}
                    />
                    {dropdownOpen === index && (
                      <div
                        ref={dropdownRef}
                        className={`absolute right-0 mt-2 w-32 rounded-md shadow-lg z-10 ${
                          isDarkMode ? "bg-[#0f172b]" : "bg-white border border-gray-200"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`flex items-center justify-between py-2 px-4 cursor-pointer rounded-md ${
                            isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-100 text-gray-700"
                          }`}
                          onClick={(e) => handleEdit(user.id, e)}
                        >
                          Edit <FaPencilAlt className="ml-2" />
                        </div>
                        <div
                          className={`flex items-center justify-between py-2 px-4 cursor-pointer rounded-md ${
                            isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-100 text-gray-700"
                          }`}
                          onClick={(e) => handleDelete(user.id, e)}
                        >
                          Delete <FaTrash className={`ml-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="alert-table-footer border-spacing-x-5 border-spacing-y-2 select-none">
              <tr>
                <td colSpan="11" className="p-4">
                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 w-full">
                    <div className="flex items-center gap-2 text-white">
                      <label htmlFor="itemsPerPage">Items/page:</label>
                      <select
                        id="itemsPerPage"
                        className="bg-[#0f172b] border border-gray-600 rounded px-2 py-1"
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      >
                        {[5, 10, 25, 50].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-white">
                      Page {currentPage} of {Math.ceil(filteredUsers.length / itemsPerPage)}
                    </div>

                    <div className="flex items-center gap-2 text-white">
                      <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        <TfiControlSkipBackward />
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <IoIosArrowBack />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(p + 1, Math.ceil(filteredUsers.length / itemsPerPage)))
                        }
                        disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage)}
                      >
                        <IoIosArrowForward />
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.ceil(filteredUsers.length / itemsPerPage))}
                        disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage)}
                      >
                        <TfiControlSkipForward />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Floating Button */}
        {/* Floating Create User Button - Fixed Position */}



        {/* Delete Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-[#0f172b] p-6 rounded-lg text-white">
              <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
              <p className="mb-4">Are you sure you want to delete this user?</p>
              <div className="flex justify-end gap-2">
                <button className="bg-gray-600 px-4 py-2 rounded" onClick={() => setDeleteModalOpen(false)}>
                  Cancel
                </button>
                <button className="bg-red-600 px-4 py-2 rounded" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

TableComponent.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      username: PropTypes.string,
      fname: PropTypes.string,
      lname: PropTypes.string,
      email: PropTypes.string,
      contact_no: PropTypes.string,
      designation: PropTypes.string,
      country_name: PropTypes.string,
      entity_name: PropTypes.string,
      role_name: PropTypes.string,
      org_name: PropTypes.string,
      is_active: PropTypes.bool,
    })
  ).isRequired,
};

export default TableComponent;