// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { IoFilter } from "react-icons/io5";
// import { FaEllipsisV, FaTrash, FaPencilAlt } from "react-icons/fa";
// import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
// import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
// import Dropdown from "../Dropdown/Dropdown";
// import useAuthFetch from "../hooks/useAuthFetch"; // adjust the path


// const City = () => {
//   const navigate = useNavigate();
//   const authFetch = useAuthFetch();

//   const [cities, setCities] = useState([]);
//   const [dropdownOpen, setDropdownOpen] = useState(null);
//   const [deleteModalOpen, setDeleteModalOpen] = useState(false);
//   const [selectedCityId, setSelectedCityId] = useState(null);
//   const [itemsPerPage, setItemsPerPage] = useState(5);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [selectedRegion, setSelectedRegion] = useState("");
//   const [selectedState, setSelectedState] = useState("");
//   const [selectedCountry, setSelectedCountry] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState("");
//   const [successPopup, setSuccessPopup] = useState(false);

//  useEffect(() => {
//   const fetchCities = async () => {
//     try {
//       const apiURL = import.meta.env.VITE_API_BASE_URL;
//       const response = await authFetch({ url: `${apiURL}/citymaster` });
//       setCities(response.data);
//       setLoading(false);
//     } catch (err) {
//       setError(err.message);
//       setLoading(false);
//     }
//   };

//   fetchCities();
// }, [authFetch]);


  

//   const handleEdit = (id, e) => {
//     e.stopPropagation();
//     navigate(`/edit-city/${id}`);

//   };

//   const handleDelete = (id, e) => {
//     e.stopPropagation();
//     setSelectedCityId(id);
//     setDeleteModalOpen(true);
//   };

//   const confirmDelete = async () => {
//   try {
//     const apiUrl = import.meta.env.VITE_API_BASE_URL;
//     await authFetch({
//       url: `${apiUrl}/citymaster/${selectedCityId}`,
//       method: "DELETE",
//     });

//     setDeleteModalOpen(false);
//     setSuccessPopup(true);
//     setCities((prev) => prev.filter((city) => city.city_id !== selectedCityId));
//     setTimeout(() => setSuccessPopup(false), 2000);
//   } catch (err) {
//     alert("Error deleting city. Please try again.");
//   }
// };


//   const toggleDropdown = (index, e) => {
//     e.stopPropagation();
//     setDropdownOpen(dropdownOpen === index ? null : index);
//   };

//   const filteredCities = cities
//     .filter((c) => c.city_name?.toLowerCase().includes(searchQuery.toLowerCase()))
//     .filter((c) => (selectedCountry ? c.country_name === selectedCountry : true))
//     .filter((c) => (selectedRegion ? c.region_name === selectedRegion : true))
//     .filter((c) => (selectedState ? c.state_name === selectedState : true))
//     .filter((c) =>
//       selectedStatus === ""
//         ? true
//         : selectedStatus === "Active"
//         ? c.is_active
//         : !c.is_active
//     );

//   const paginatedCities = filteredCities.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   const totalPages = Math.ceil(filteredCities.length / itemsPerPage);

//   return (
//     <div className="p-4">
//       <div className="flex justify-between items-center mb-4">
//         <div>
//           <h1 className="font-bold text-2xl">City Master</h1>
//           <h4 className="text-sm text-gray-400">City list /</h4>
//         </div>
//         <div className="flex items-center gap-3">
//           <input
//             type="text"
//             placeholder="Search City..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="px-3 py-2 pr-10 border bg-[#0a101f] text-white border-gray-300 rounded-md"
//           />
//           <select
//             value={selectedStatus}
//             onChange={(e) => setSelectedStatus(e.target.value)}
//             className="px-3 py-2 pr-10 border bg-[#0a101f] text-white border-gray-300 rounded-md"
//           >
//             <option value="">All</option>
//             <option value="Active">Active</option>
//             <option value="Inactive">Inactive</option>
//           </select>
//           <button
//             className="bg-[#D2DE07] text-black font-bold py-2 px-4 rounded-md shadow-md hover:brightness-110 transition"
//             onClick={() => navigate("/create-city")}
//           >
//             + Add City
//           </button>
//         </div>
//       </div>

//       <table className="w-full table-auto text-left">
//         <thead className="bg-[#0f172b] text-white">
//           <tr>
//             <th className="p-2">City Id</th>
//             <th className="p-2">City Name</th>
//             <th className="p-2">State</th>
//             <th className="p-2">Region</th>
//             <th className="p-2">Country</th>
//             <th className="p-2">Status</th>
//             <th className="p-2">Actions</th>
//           </tr>
//         </thead>
//         <tbody className="border-b border-gray-600 hover:bg-[#1a253f] cursor-default text-sm">
//   {paginatedCities.map((citymaster, index) => (
//     <tr key={citymaster.id}>
//       <td className="px-4 py-2">{citymaster.city_id}</td>
//       <td className="px-4 py-2">{citymaster.city_name}</td>
//       <td className="px-4 py-2">{citymaster.state_name}</td>
//       <td className="px-4 py-2">{citymaster.region_name}</td>
//       <td className="px-4 py-2">{citymaster.country_name}</td>
//       <td className="px-4 py-2">{citymaster.is_active ? "Active" : "Inactive"}</td>
//       <td className="px-4 py-2 relative">
//                           <FaEllipsisV onClick={(e) => toggleDropdown(index, e)} className="cursor-pointer" />
//                           {dropdownOpen === index && (
//                             <div className="absolute right-0 mt-2 w-32 bg-[#0f172b] rounded-md shadow-lg z-10">
//                               <div
//                                 className="py-2 px-4 hover:bg-[#1a253f] cursor-pointer flex justify-between"
//                                 onClick={(e) => handleEdit(citymaster.city_id, e)}
//                               >
//                                 Edit <FaPencilAlt />
//                               </div>
//                               <div
//                                 className="py-2 px-4 hover:bg-[#1a253f] cursor-pointer flex justify-between"
//                                 onClick={(e) => handleDelete(citymaster.city_id, e)}
//                               >
//                                 Delete <FaTrash />
//                               </div>
//                             </div>
//                           )}
//                         </td>
//     </tr>
//   ))}
// </tbody>


//       </table>

//       {/* Pagination */}
//       <div className="flex justify-between items-center p-3">
//         <div className="flex items-center gap-2">
//           Items per page:
//           <Dropdown
//             header={`${itemsPerPage}`}
//             values={[5, 10, 25, 50]}
//             onChange={(val) => {
//               setItemsPerPage(val);
//               setCurrentPage(1);
//             }}
//           />
//         </div>
//         <div className="flex items-center gap-2">
//           <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
//             <TfiControlSkipBackward />
//           </button>
//           <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
//             <IoIosArrowBack />
//           </button>
//           <span>
//             Page {currentPage} of {totalPages}
//           </span>
//           <button
//             disabled={currentPage === totalPages}
//             onClick={() => setCurrentPage((p) => p + 1)}
//           >
//             <IoIosArrowForward />
//           </button>
//           <button
//             disabled={currentPage === totalPages}
//             onClick={() => setCurrentPage(totalPages)}
//           >
//             <TfiControlSkipForward />
//           </button>
//         </div>
//       </div>

      // {/* Delete Modal */}
      // {deleteModalOpen && (
      //   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
      //     <div className="bg-[#0a101f] text-white rounded-lg p-4 w-1/3">
      //       <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
      //       <p className="mb-4">Are you sure you want to delete this city?</p>
      //       <div className="flex justify-end">
      //         <button className="px-4 py-2 rounded mr-2" onClick={() => setDeleteModalOpen(false)}>
      //           Cancel
      //         </button>
      //         <button className="px-4 py-2 bg-red-500 rounded" onClick={confirmDelete}>
      //           Delete
      //         </button>
      //       </div>
      //     </div>
      //   </div>
      // )}

//       {successPopup && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
//           <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] text-center relative">
//             <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
//               ✅
//             </div>
//             <h2 className="text-2xl font-semibold mb-2">City Deleted Successfully</h2>
//             <p className="text-base text-slate-400">Refreshing list...</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default City;


import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoFilter } from "react-icons/io5";
import { FaEllipsisV, FaTrash, FaPencilAlt } from "react-icons/fa";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import Dropdown from "../Dropdown/Dropdown";
import useAuthFetch from "../hooks/useAuthFetch"; // adjust the path
import { useTheme } from "../../context/ThemeContext";


const City = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  const [cities, setCities] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [successPopup, setSuccessPopup] = useState(false);

  // For showing filter dropdowns
  const [regionFilterOpen, setRegionFilterOpen] = useState(false);
  const [stateFilterOpen, setStateFilterOpen] = useState(false);
  const [countryFilterOpen, setCountryFilterOpen] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await authFetch({ url: `${apiURL}/citymaster` });
        setCities(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCities();
  }, [authFetch]);

  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/edit-city/${id}`);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setSelectedCityId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      await authFetch({
        url: `${apiUrl}/citymaster/${selectedCityId}`,
        method: "DELETE",
      });

      setDeleteModalOpen(false);
      setSuccessPopup(true);
      setCities((prev) => prev.filter((city) => city.city_id !== selectedCityId));
      setTimeout(() => setSuccessPopup(false), 2000);
    } catch (err) {
      alert("Error deleting city. Please try again.");
    }
  };

  const toggleDropdown = (index, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === index ? null : index);
  };

  // Get unique values for filters
  const uniqueStates = [...new Set(cities.map((c) => c.state_name))];
  const uniqueRegions = [...new Set(cities.map((c) => c.region_name))];
  const uniqueCountries = [...new Set(cities.map((c) => c.country_name))];

  const filteredCities = cities
    .filter((c) => c.city_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((c) => (selectedCountry ? c.country_name === selectedCountry : true))
    .filter((c) => (selectedRegion ? c.region_name === selectedRegion : true))
    .filter((c) => (selectedState ? c.state_name === selectedState : true))
    .filter((c) =>
      selectedStatus === ""
        ? true
        : selectedStatus === "Active"
        ? c.is_active
        : !c.is_active
    );

  const paginatedCities = filteredCities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCities.length / itemsPerPage);

  return (
    <div className={`p-4 ${
      !isDarkMode ? 'bg-[#f8f9fa] min-h-screen' : ''
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
<h1 className={`font-bold text-2xl ml-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>City Master</h1>
          
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`px-3 py-2 pr-10 border rounded-md ${
              isDarkMode
                ? 'bg-transparent text-white border-gray-600 placeholder-gray-400'
                : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
            }`}
          />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`px-3 py-2 pr-10 border rounded-md ${
              isDarkMode ? "bg-[#0a101f] text-white border-gray-300" : "bg-white text-gray-900 border-gray-300"
            }`}
          >
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            className="text-white font-bold py-2 px-4 rounded-md shadow-md hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
            onClick={() => navigate("/create-city")}
          >
            + Add City
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full table-auto text-left ml-6">
        <thead className={isDarkMode ? "bg-[#0f172b] text-white" : "bg-[#2c3e50] text-white"}>
          <tr>
            <th className="p-2">City Id</th>
            <th className="p-2">City Name</th>
            <th className="p-2 relative">
              <div className="flex items-center space-x-1">
                <span>State</span>
                <IoFilter
                  className="cursor-pointer"
                  onClick={() => setStateFilterOpen((prev) => !prev)}
                />
              </div>
              {stateFilterOpen && (
                <div className={`absolute top-full mt-1 border rounded-md shadow-lg z-10 ${
                  isDarkMode ? "bg-[#0f172b] border-gray-300" : "bg-white border-gray-300"
                }`}>
                  <select
                    className={`p-2 text-sm w-40 ${
                      isDarkMode ? "bg-[#0f172b] text-white" : "bg-white text-gray-900"
                    }`}
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setStateFilterOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All States</option>
                    {uniqueStates.map((state, idx) => (
                      <option key={idx} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </th>
            <th className="p-2 relative">
              <div className="flex items-center space-x-1">
                <span>Region</span>
                <IoFilter
                  className="cursor-pointer"
                  onClick={() => setRegionFilterOpen((prev) => !prev)}
                />
              </div>
              {regionFilterOpen && (
                <div className={`absolute top-full mt-1 border rounded-md shadow-lg z-10 ${
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
                    {uniqueRegions.map((region, idx) => (
                      <option key={idx} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </th>
            <th className="p-2 relative">
              <div className="flex items-center space-x-1">
                <span>Country</span>
                <IoFilter
                  className="cursor-pointer"
                  onClick={() => setCountryFilterOpen((prev) => !prev)}
                />
              </div>
              {countryFilterOpen && (
                <div className={`absolute top-full mt-1 border rounded-md shadow-lg z-10 ${
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
                    {uniqueCountries.map((country, idx) => (
                      <option key={idx} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody className={`border-b text-sm ${
          isDarkMode ? "border-gray-600" : "border-gray-200"
        }`}>
          {paginatedCities.map((citymaster, index) => (
            <tr key={citymaster.city_id} className={`${
              isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-50 text-gray-900"
            }`}>
              <td className="px-4 py-2">{citymaster.city_id}</td>
              <td className="px-4 py-2">{citymaster.city_name}</td>
              <td className="px-4 py-2">{citymaster.state_name}</td>
              <td className="px-4 py-2">{citymaster.region_name}</td>
              <td className="px-4 py-2">{citymaster.country_name}</td>
              <td className="px-4 py-2">{citymaster.is_active ? "Active" : "Inactive"}</td>
              <td className="px-4 py-2 relative">
                <FaEllipsisV
                  onClick={(e) => toggleDropdown(index, e)}
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
                      onClick={(e) => handleEdit(citymaster.city_id, e)}
                    >
                      Edit <FaPencilAlt />
                    </div>
                    <div
                      className={`py-2 px-4 cursor-pointer flex justify-between ${
                        isDarkMode ? "hover:bg-[#1a253f] text-white" : "hover:bg-gray-50 text-gray-700"
                      }`}
                      onClick={(e) => handleDelete(citymaster.city_id, e)}
                    >
                      Delete <FaTrash />
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className={`flex justify-between items-center p-3 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <div className="flex items-center gap-2 ml-3">
          Items per page:
          <Dropdown
            header={`${itemsPerPage}`}
            values={[5, 10, 25, 50]}
            bgColor={isDarkMode ? "#0f172b" : "white"}
            textColor={isDarkMode ? "white" : "#111827"}
            borderColor={!isDarkMode ? "#d1d5db" : ""}
            onChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className={`fixed inset-0 flex items-center justify-center z-30 ${
          isDarkMode ? 'bg-black bg-opacity-50' : 'bg-gray-900 bg-opacity-20'
        }`}>
          <div className={`rounded-lg p-4 w-1/3 ${
            isDarkMode ? 'bg-[#0c1220] text-white' : 'bg-white text-gray-900'
          }`}>
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete this city?</p>
            <div className="flex justify-end">
              <button
                className={`px-4 py-2 rounded mr-2 ${
                  isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'
                }`}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-red-500 rounded" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
            }`}>City Deleted Successfully</h2>
            <p className={`text-base ${
              isDarkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>Refreshing list...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default City;