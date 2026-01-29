// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { IoFilter } from "react-icons/io5";
// import { FaEllipsisV, FaTrash, FaPencilAlt } from "react-icons/fa";
// import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
// import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
// import Dropdown from "../Dropdown/Dropdown";
// import useAuthFetch from "../hooks/useAuthFetch";

// const State = () => {
//   const navigate = useNavigate();
//   const authFetch = useAuthFetch();
//   const [states, setStates] = useState([]);
//   const [dropdownOpen, setDropdownOpen] = useState(null);
//   const [deleteModalOpen, setDeleteModalOpen] = useState(false);
//   const [selectedStateId, setSelectedStateId] = useState(null);
//   const [itemsPerPage, setItemsPerPage] = useState(5);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [successPopup, setSuccessPopup] = useState(false);
//   const [selectedStatus, setSelectedStatus] = useState("");

//   useEffect(() => {
//     const fetchStates = async () => {
//       try {
//         const apiURL = import.meta.env.VITE_API_BASE_URL;
//         const response = await authFetch({ url: `${apiURL}/statemaster` });
//         setStates(response.data);
//         setLoading(false);
//       } catch (err) {
//         setError("Failed to fetch states");
//         setLoading(false);
//       }
//     };

//     fetchStates();
//   }, [authFetch]);


//   const handleEdit = (id, e) => {
//     e.stopPropagation();
//     navigate(`/edit-state/${id}`);
//   };

//   const handleDelete = (id, e) => {
//     e.stopPropagation();
//     setSelectedStateId(id);
//     setDeleteModalOpen(true);
//   };

//   const confirmDelete = async () => {
//     try {
//       const apiUrl = import.meta.env.VITE_API_BASE_URL;
//       const res = await authFetch({
//         url: `${apiUrl}/statemaster/${selectedStateId}`,
//         method: "DELETE",
//       });

//       if (res.data?.error) throw new Error(res.data.error);

//       setDeleteModalOpen(false);
//       setSuccessPopup(true);
//       setStates((prev) => prev.filter((state) => state.state_id !== selectedStateId));

//       setTimeout(() => setSuccessPopup(false), 2000);
//     } catch (err) {
//       console.error("Delete error:", err);
//       alert("Error deleting state. Please try again.");
//     }
//   };

//   const toggleDropdown = (index, e) => {
//     e.stopPropagation();
//     setDropdownOpen(dropdownOpen === index ? null : index);
//   };
//   const filteredStates = states
//     .filter((state) => state.state_name?.toLowerCase().includes(searchQuery.toLowerCase()))
//     .filter((state) =>
//       selectedStatus === ""
//         ? true
//         : selectedStatus === "Active"
//         ? state.is_active
//         : !state.is_active
//     );

//   const paginatedStates = filteredStates.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   const totalPages = Math.ceil(filteredStates.length / itemsPerPage);

//   return (
//     <div className="flex flex-col items-start justify-start p-3 pt-4 pl-1 2xl:gap-2 2xl:pt-6">
//       <div className="flex flex-col md:flex-row justify-between w-full pb-4 pr-3 space-y-4 md:space-y-0">
//         <div>
//           <h1 className="font-bold text-xl md:text-2xl 2xl:text-3xl pl-3">State Master</h1>
//           <h4 className="text-xs md:text-sm pl-3">State list /</h4>
//         </div>

//         <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-2 w-full md:w-auto px-3">
//           <div className="relative w-full md:w-auto flex items-center">
//             <input
//               type="text"
//               placeholder="Search State..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full px-3 py-2 pr-12 border border-gray-300 bg-transparent rounded-md focus:outline-none focus:ring-1"
//             />
//           </div>

//           <div className="relative w-full md:w-auto flex items-center">
//             <select
//               className="appearance-none px-3 py-2 pr-10 border bg-[#0a101f] text-white border-gray-300 rounded-md focus:outline-none focus:ring-1"
//               value={selectedStatus}
//               onChange={(e) => setSelectedStatus(e.target.value)}
//             >
//               <option value="">All</option>
//               <option value="Active">Active</option>
//               <option value="Inactive">Inactive</option>
//             </select>
//             <IoFilter className="absolute right-3 top-[50%] transform -translate-y-1/2 text-white pointer-events-none" />
//           </div>

//           <button
//             className="bg-[#D2DE07] text-black font-bold py-2 px-4 rounded-md shadow-md hover:brightness-110 transition"
//             onClick={() => navigate("/create-state")}
//           >
//             + Add State
//           </button>
//         </div>
//       </div>

//       <div className="flex-1 overflow-visible p-3 w-full">
//         <div className="overflow-visible relative">
//           {loading ? (
//             <div className="flex items-center justify-center h-[50vh] w-full">Loading...</div>
//           ) : error ? (
//             <div className="text-red-500 text-center">{error}</div>
//           ) : (
//             <table className="table-auto w-full min-w-full">
//               <thead className="border-separate border-spacing-x-5 border-spacing-y-4 bg-[#0f172b] select-none">
//                 <tr>
//                   <th className="px-4 py-2 text-left">State Name</th>
//                   <th className="px-4 py-2 text-left">Region Name</th>
//                   <th className="px-4 py-2 text-left">Status</th>
//                   <th className="px-4 py-2 text-left">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {paginatedStates.map((state, index) => (
//                   <tr
//                     key={state.state_id}
//                     className="text-sm border-b border-gray-600 cursor-default hover:bg-[#1a253f]"
//                   >
//                     <td className="px-6 py-2">{state.state_name || "—"}</td>
//                     <td className="px-6 py-2">{state.region_name || "—"}</td>
//                     <td className="px-6 py-2">{state.is_active ? "Active" : "Inactive"}</td>
//                     <td className="px-6 py-2 relative">
//                       <FaEllipsisV
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setDropdownOpen(dropdownOpen === index ? null : index);
//                         }}
//                         className="cursor-pointer"
//                       />

//                       {dropdownOpen === index && (
//                         <div
//                           className="absolute right-0 mt-2 w-32 bg-[#0f172b] rounded-md shadow-lg z-10"
//                           onClick={(e) => e.stopPropagation()}
//                         >
//                           <div
//                             className="py-2 px-4 hover:bg-[#1a253f] cursor-pointer flex justify-between"
//                             onClick={(e) => handleEdit(state.state_id, e)}
//                           >
//                             Edit <FaPencilAlt />
//                           </div>
//                           <div
//                             className="py-2 px-4 hover:bg-[#1a253f] cursor-pointer flex justify-between"
//                             onClick={(e) => handleDelete(state.state_id, e)}
//                           >
//                             Delete <FaTrash />
//                           </div>
//                         </div>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//               <tfoot>
//                 <tr>
//                   <td colSpan="2" className="p-3">
//                     <div className="flex gap-4 items-center">
//                       Items per page:
//                       <Dropdown
//                         header={`${itemsPerPage}`}
//                         values={[5, 10, 25, 50]}
//                         containerWidth="90px"
//                         bgColor="#0f172b"
//                         onChange={(val) => {
//                           setItemsPerPage(val);
//                           setCurrentPage(1);
//                         }}
//                       />
//                     </div>
//                   </td>
//                   <td className="p-3 text-right">
//                     <div className="flex justify-end gap-2 items-center">
//                       <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
//                         <TfiControlSkipBackward />
//                       </button>
//                       <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
//                         <IoIosArrowBack />
//                       </button>
//                       <span>
//                         Page {currentPage} of {totalPages}
//                       </span>
//                       <button
//                         disabled={currentPage === totalPages}
//                         onClick={() => setCurrentPage((p) => p + 1)}
//                       >
//                         <IoIosArrowForward />
//                       </button>
//                       <button
//                         disabled={currentPage === totalPages}
//                         onClick={() => setCurrentPage(totalPages)}
//                       >
//                         <TfiControlSkipForward />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               </tfoot>
//             </table>
//           )}
//         </div>
//       </div>

//       {deleteModalOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
//           <div className="bg-[#0a101f] text-white rounded-lg p-4 w-1/3">
//             <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
//             <p className="mb-4">Are you sure you want to delete this state?</p>
//             <div className="flex justify-end">
//               <button className="px-4 py-2 bg-black-300 rounded mr-2" onClick={() => setDeleteModalOpen(false)}>
//                 Cancel
//               </button>
//               <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={confirmDelete}>
//                 Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {successPopup && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
//           <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] text-center relative">
//             <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
//               ✅
//             </div>
//             <h2 className="text-2xl font-semibold mb-2">State Deleted Successfully</h2>
//             <p className="text-base text-slate-400">Refreshing list...</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default State;


import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoFilter } from "react-icons/io5";
import { FaEllipsisV, FaTrash, FaPencilAlt } from "react-icons/fa";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import Dropdown from "../Dropdown/Dropdown";
import useAuthFetch from "../hooks/useAuthFetch";
import { useTheme } from "../../context/ThemeContext";

const State = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [states, setStates] = useState([]);
  const [regions, setRegions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [regionFilterOpen, setRegionFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successPopup, setSuccessPopup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const [statesRes, regionsRes] = await Promise.all([
          authFetch({ url: `${apiURL}/statemaster` }),
          authFetch({ url: `${apiURL}/regionmaster` }),
        ]);
        setStates(statesRes.data || []);
        setRegions(regionsRes.data || []);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch states or regions");
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/edit-state/${id}`);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setSelectedStateId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiUrl}/statemaster/${selectedStateId}`,
        method: "DELETE",
      });

      if (res.data?.error) throw new Error(res.data.error);

      setDeleteModalOpen(false);
      setSuccessPopup(true);
      setStates((prev) => prev.filter((state) => state.state_id !== selectedStateId));

      setTimeout(() => setSuccessPopup(false), 2000);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting state. Please try again.");
    }
  };

  const filteredStates = states
    .filter((state) => state.state_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((state) => (selectedRegion ? state.region_name === selectedRegion : true))
    .filter((state) =>
      selectedStatus === ""
        ? true
        : selectedStatus === "Active"
        ? state.is_active
        : !state.is_active
    );

  const paginatedStates = filteredStates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredStates.length / itemsPerPage);

  return (
    <div className={`flex flex-col items-start justify-start p-3 pt-4 pl-1 2xl:gap-2 2xl:pt-6 ${
      !isDarkMode ? 'bg-[#f8f9fa] min-h-screen' : ''
    }`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between w-full pb-4 pr-3 space-y-4 md:space-y-0">
        <div>
          <h1 className={`font-bold text-xl md:text-2xl 2xl:text-3xl pl-3 ml-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>State Master</h1>
          
        </div>

        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-2 w-full md:w-auto px-3">
          <div className="relative w-full md:w-auto flex items-center">
            <input
              type="text"
              placeholder="Search State..."
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
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <IoFilter className="absolute right-3 top-[50%] transform -translate-y-1/2 text-white pointer-events-none" />
          </div>

          <button
            className="text-white font-bold py-2 px-4 rounded-md shadow-md hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
            onClick={() => navigate("/create-state")}
          >
            + Add State
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-visible p-3 w-full">
        {loading ? (
          <div className={`flex items-center justify-center h-[50vh] w-full ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Loading...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <table className="table-auto w-full min-w-full ml-5">
            <thead className={`border-separate border-spacing-x-5 border-spacing-y-4 ${
              isDarkMode ? "bg-[#0f172b] text-white" : "bg-[#2c3e50] text-white"
            }`}>
              <tr>
                <th className="px-4 py-2 text-left">State Name</th>
                <th className="px-4 py-2 text-left relative">
                  <div className="flex items-center space-x-1">
                    <span>Region Name</span>
                    <IoFilter
                      className="cursor-pointer text-white"
                      onClick={() => setRegionFilterOpen((prev) => !prev)}
                    />
                  </div>
                  {regionFilterOpen && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-md shadow-lg z-20 ${
                      isDarkMode ? "bg-[#0f172b] border-gray-300" : "bg-white border-gray-300"
                    }`}>
                      <select
                        className={`p-2 text-sm w-40 ${
                          isDarkMode ? "bg-[#0f172b] text-white" : "bg-white text-gray-900"
                        }`}
                        value={selectedRegion}
                        onChange={(e) => {
                          setSelectedRegion(e.target.value);
                          setRegionFilterOpen(false);
                          setCurrentPage(1);
                        }}
                      >
                        <option value="">All Regions</option>
                        {regions.map((region) => (
                          <option key={region.region_id} value={region.region_name}>
                            {region.region_name}
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
              {paginatedStates.map((state, index) => (
                <tr
                  key={state.state_id}
                  className={`text-sm border-b ${
                    isDarkMode ? "border-gray-600 hover:bg-[#1a253f] text-white" : "border-gray-200 hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <td className="px-6 py-2">{state.state_name || "—"}</td>
                  <td className="px-6 py-2">{state.region_name || "—"}</td>
                  <td className="px-6 py-2">{state.is_active ? "Active" : "Inactive"}</td>
                  <td className="px-6 py-2 relative">
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
                          onClick={(e) => handleEdit(state.state_id, e)}
                        >
                          Edit <FaPencilAlt />
                        </div>
                        <div
                          className={`py-2 px-4 cursor-pointer flex justify-between ${
                            isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-50 text-gray-700"
                          }`}
                          onClick={(e) => handleDelete(state.state_id, e)}
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
                <td className={`p-3 text-right ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`} colSpan="2">
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
            <p className="mb-4">Are you sure you want to delete this state?</p>
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
            }`}>State Deleted Successfully</h2>
            <p className={`text-base ${
              isDarkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>Refreshing list...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default State;
