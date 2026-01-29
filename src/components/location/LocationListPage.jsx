import { useRef } from "react";
import "./location-list-override.css";
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoFilter } from "react-icons/io5";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import useAuthFetch from "../hooks/useAuthFetch";
import { useTheme } from "../../context/ThemeContext";

const LocationListPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const authFetch = useAuthFetch();
  const { state } = useLocation();
  const incomingClientId = state?.clientId;
  const incomingOrgName = state?.org_name;
  
  const [locations, setLocations] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState("");
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientFilterOpen, setClientFilterOpen] = useState(false);
  const [allClients, setAllClients] = useState([]);

  // Refs for dropdowns
  const clientFilterRef = useRef(null);
  const regionFilterRef = useRef(null);
  const statusFilterRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        clientFilterRef.current && !clientFilterRef.current.contains(event.target) && clientFilterOpen
      ) {
        setClientFilterOpen(false);
      }
      if (
        regionFilterRef.current && !regionFilterRef.current.contains(event.target) && regionDropdownOpen
      ) {
        setRegionDropdownOpen(false);
      }
      if (
        statusFilterRef.current && !statusFilterRef.current.contains(event.target) && statusDropdownOpen
      ) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clientFilterOpen, regionDropdownOpen, statusDropdownOpen]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await authFetch({
          url: `${apiURL}/locations`,
          method: "GET"
        });

        const data = response.data;
        setLocations(data);

        // Fetch all clients
        const clientRes = await authFetch({
          url: `${apiURL}/client`,
          method: "GET"
        });
        if (Array.isArray(clientRes.data)) {
          setAllClients(clientRes.data);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLocations();
  }, [authFetch]);

  // Handle incoming clientId from client dashboard
  useEffect(() => {
    if (allClients.length === 0) return;
    if (incomingOrgName && selectedClient !== incomingOrgName) {
      setSelectedClient(incomingOrgName);
      setCurrentPage(1);
    } else if (incomingClientId && !selectedClient) {
      // fallback: try to find org_name from allClients
      const found = allClients.find(c => String(c.clientId) === String(incomingClientId));
      if (found) {
        setSelectedClient(found.org_name || found.clientName);
        setCurrentPage(1);
      }
    }
  }, [incomingOrgName, incomingClientId, allClients, selectedClient]);

  const handleRowClick = (id) => {
    navigate("/location", { state: { locationId: id } });
  };

  const filteredLocations = locations
    .filter((location) =>
      location.loc_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.branch_code?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((loc) => (regionFilter ? loc.region_name === regionFilter : true))
    // Client filtering: if client is selected, match org_name or clientName
    .filter((loc) => (selectedClient !== "" ? (loc.org_name === selectedClient || loc.clientName === selectedClient) : true))
    .filter((loc) =>
      selectedStatus === ""
        ? true
        : selectedStatus === "active"
          ? loc.is_active
          : !loc.is_active
    );

  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);

  const uniqueRegions = [...new Set(locations.map(loc => loc.region_name).filter(Boolean))];

  if (loading) {
    return (
      <div className="w-full p-4">
        <div className="text-center text-gray-400 p-4">Loading locations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <div className="text-center text-red-400 p-4">{error}</div>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${isDarkMode ? 'text-white bg-transparent' : 'text-black'}`}
      style={isDarkMode ? { padding: '16px 20px', minHeight: 'calc(100vh - 70px)' } : { backgroundColor: '#f0f2f5', padding: '16px 20px', minHeight: 'calc(100vh - 70px)' }}
    >
      <div>
        <h1 className="page-header select-none">Location List</h1>
      </div>
      <br />

      {/* Search / Filter */}
      <div className="flex flex-wrap justify-end items-center gap-4 mb-4 w-full">
        {/* Client Filter */}
        <div className="relative" ref={clientFilterRef}>
          <div
            className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[260px] max-w-[340px] ${
              isDarkMode ? "border-white text-white" : "border-gray-300 text-gray-900 bg-white"
            }`}
            onClick={() => setClientFilterOpen(!clientFilterOpen)}
            style={{ minWidth: 260, maxWidth: 340 }}
          >
            <span className="truncate w-full block">
              {selectedClient
                ? (allClients.find(c => c.org_name === selectedClient)?.org_name || allClients.find(c => c.clientName === selectedClient)?.clientName || selectedClient)
                : "All Clients"}
            </span>
            <IoFilter />
          </div>
          {clientFilterOpen && (
            <div className={`absolute top-full left-0 mt-1 w-full rounded-md z-10 max-h-60 overflow-y-auto ${
              isDarkMode ? "bg-[#0f172b] border border-white" : "bg-white border border-gray-300"
            }`} style={{ minWidth: 260, maxWidth: 340 }}>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                } ${
                  selectedClient === "" 
                    ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                    : ""
                }`}
                onClick={() => {
                  setSelectedClient("");
                  setClientFilterOpen(false);
                  setCurrentPage(1);
                }}
              >
                All Clients
              </div>
              {allClients.map((client) => {
                const key = client.org_name || client.clientName || client.clientId;
                const value = client.org_name || client.clientName;
                const label = client.org_name || client.clientName || "Unknown Client";
                return (
                  <div
                    key={key}
                    className={`px-4 py-2 cursor-pointer ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    } ${
                      selectedClient === value
                        ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedClient(value);
                      setClientFilterOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Region Filter */}
        <div className="relative" ref={regionFilterRef}>
          <div
            className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[220px] max-w-[300px] ${
              isDarkMode ? "border-white text-white" : "border-gray-300 text-gray-900 bg-white"
            }`}
            onClick={() => setRegionDropdownOpen(!regionDropdownOpen)}
            style={{ minWidth: 220, maxWidth: 300 }}
          >
            <span className="truncate w-full block">
              {regionFilter || "All Regions"}
            </span>
            <IoFilter />
          </div>
          {regionDropdownOpen && (
            <div className={`absolute top-full left-0 mt-1 w-full rounded-md z-10 max-h-60 overflow-y-auto ${
              isDarkMode ? "bg-[#0f172b] border border-white" : "bg-white border border-gray-300"
            }`} style={{ minWidth: 220, maxWidth: 300 }}>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                } ${
                  regionFilter === ""
                    ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                    : ""
                }`}
                onClick={() => {
                  setRegionFilter("");
                  setRegionDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                All Regions
              </div>
              {uniqueRegions.map((region, idx) => (
                <div
                  key={idx}
                  className={`px-4 py-2 cursor-pointer ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } ${
                    regionFilter === region
                      ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                      : ""
                  }`}
                  onClick={() => {
                    setRegionFilter(region);
                    setRegionDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  {region}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Search Location"
          className={`pl-4 pr-10 py-2 h-10 rounded-md border ${
            isDarkMode ? "border-white bg-transparent text-white" : "border-gray-300 bg-white text-gray-900"
          }`}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />

        <div className="relative" ref={statusFilterRef}>
          <div
            className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[130px] ${
              isDarkMode ? "border-white text-white" : "border-gray-300 text-gray-900 bg-white"
            }`}
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          >
            <span>
              {selectedStatus === "" ? "Filter By" : selectedStatus === "active" ? "Active" : "Inactive"}
            </span>
            <IoFilter />
          </div>
          {statusDropdownOpen && (
            <div className={`absolute top-full left-0 mt-1 w-full rounded-md z-10 ${
              isDarkMode ? "bg-[#0f172b] border border-white" : "bg-white border border-gray-300"
            }`}>
              {[
                { value: "", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ].map((opt) => (
                <div
                  key={opt.value}
                  className={`px-4 py-2 cursor-pointer ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } ${
                    selectedStatus === opt.value
                      ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedStatus(opt.value);
                    setStatusDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Total Locations Count */}
      <div className="mb-2">
        <span className={`text-sm font-semibold ${
          isDarkMode ? "text-white" : "text-gray-700"
        }`}>
          Showing {filteredLocations.length} locations
        </span>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead
            className={isDarkMode ? "bg-[#0f172b] text-grey" : "location-list-thead"}
          >
            <tr>
              <th className="px-4 py-2 text-left whitespace-nowrap">Location Name</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Branch Code</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Country</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Region</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">State</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">City</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLocations.length > 0 ? (
              paginatedLocations.map((location, index) => (
                <tr
                  key={location.loc_id}
                  onClick={() => handleRowClick(location.loc_id)}
                  className={`text-sm border-b transition-colors cursor-pointer ${
                    isDarkMode
                      ? "border-gray-600 hover:bg-[#1a253f] bg-[#0f172b] text-white"
                      : index % 2 === 0
                      ? "border-gray-200 hover:bg-gray-50 bg-white text-gray-900"
                      : "border-gray-200 hover:bg-gray-50 bg-gray-50 text-gray-900"
                  }`}
                >
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    {location.loc_name || "—"}
                  </td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    {location.branch_code || "—"}
                  </td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    {location.country_name || "—"}
                  </td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    {location.region_name || "—"}
                  </td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    {location.state_name || "—"}
                  </td>
                  <td className={`px-4 py-2 ${!isDarkMode ? 'text-gray-900' : ''}`}>
                    {location.city_name || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      style={{
                        color: location.is_active ? "#22c55e" : "#ef4444",
                        fontWeight: 500
                      }}
                    >
                      {location.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="text-center text-gray-400 p-4"
                >
                  {searchQuery || selectedStatus || regionFilter
                    ? "No locations found matching your search criteria"
                    : "No locations found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredLocations.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-4">
            <div className="flex items-center gap-2">
              <span className={isDarkMode ? "text-white" : "text-gray-700"}>Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded border ${
                  isDarkMode ? "bg-[#0f172b] border-white text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <span className={isDarkMode ? "text-white" : "text-gray-700"}>
                {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredLocations.length)} of{" "}
                {filteredLocations.length}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : isDarkMode ? "text-white hover:bg-gray-700" : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <TfiControlSkipBackward />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : isDarkMode ? "text-white hover:bg-gray-700" : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <IoIosArrowBack />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : isDarkMode ? "text-white hover:bg-gray-700" : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <IoIosArrowForward />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : isDarkMode ? "text-white hover:bg-gray-700" : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <TfiControlSkipForward />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationListPage;
