import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FaEllipsisV, FaPencilAlt, FaTrash } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoFilter } from "react-icons/io5";
import { TfiControlSkipBackward, TfiControlSkipForward } from "react-icons/tfi";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";
import SuccessPopup from "../system-management/successPopUP";
import { useTheme } from "../../context/ThemeContext";
import "./device.css";

const DeviceList = () => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const dropdownRef = useRef(null);
  const { state } = useLocation();
  const incomingClientId = state?.clientId;
  
  const [allDevices, setAllDevices] = useState({
    iatm: [],
    bigio: [],
    neon: [],
    libi: [],
    "3p-libi": [],
  });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [activeTab, setActiveTab] = useState("iatm");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);
  const [locationMap, setLocationMap] = useState({});
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationFilterOpen, setLocationFilterOpen] = useState(false);
  const [allLocations, setAllLocations] = useState([]);

  const options = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // Extract user_id from JWT token
  const getUserIdFromToken = () => {
    if (!token) return 1; // Fallback
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.user_id || payload.id || 1;
    } catch (e) {
      console.error("Failed to parse token:", e);
      return 1;
    }
  };

  // Fetch location name by loc_id
  const fetchLocationName = async (locId) => {
    if (!locId || locationMap[locId]) {
      return locationMap[locId] || locId;
    }

    try {
      const locRes = await authFetch({
        url: `${apiURL}/locations/${locId}`,
        method: "GET"
      });

      console.log(`✅ Location ${locId} Response:`, locRes?.data); // ← DEBUG

      const locName = locRes?.data?.loc_name || locRes?.data?.location_name || locRes?.data?.name || `Location ${locId}`;
      setLocationMap((prev) => ({ ...prev, [locId]: locName }));
      return locName;
    } catch (err) {
      console.error(`❌ Error fetching location ${locId}:`, err);
      // Fallback to ID
      setLocationMap((prev) => ({ ...prev, [locId]: `Location ${locId}` }));
      return `Location ${locId}`;
    }
  };
  useEffect(() => {
    const fetchAllDevicesAndLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiURL = import.meta.env.VITE_API_BASE_URL;

        // Fetch devices
        const devRes = await authFetch({
          url: `${apiURL}/deviceManagement`,
          method: "GET"
        });
        // Map response keys correctly
        const mappedDevices = {
          iatm: devRes.data.iatm_devices || [],
          bigio: devRes.data.bigio_devices || [],
          neon: devRes.data.neon_devices || [],
          libi: devRes.data.lib_devices || [],
          "3p-libi": devRes.data.lib_3p_devices || [],
        };
        setAllDevices(mappedDevices);
        setDevices(mappedDevices.iatm);

        // Fetch all locations once
        const locRes = await authFetch({
          url: `${apiURL}/device-location`,
          method: "GET"
        });
        // Build locationMap: loc_id -> loc_name
        const locMap = {};
        if (Array.isArray(locRes.data)) {
          locRes.data.forEach(loc => {
            locMap[loc.loc_id] = loc.loc_name || loc.location_name || loc.name || `Location ${loc.loc_id}`;
          });
          setAllLocations(locRes.data);
        }
        setLocationMap(locMap);
        setLocationsLoaded(true);
      } catch (err) {
        console.error("Error fetching devices or locations:", err);
        setError("Failed to fetch devices or locations. Please try again.");
        setAllDevices({ iatm: [], bigio: [], neon: [], libi: [], "3p-libi": [] });
      } finally {
        setLoading(false);
      }
    };
    fetchAllDevicesAndLocations();
  }, [authFetch]);

  // Handle incoming clientId from client dashboard
  useEffect(() => {
    if (!incomingClientId || !locationsLoaded || allLocations.length === 0) return;
    
    const fetchClientLocations = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await authFetch({
          url: `${apiURL}/${incomingClientId}/locations`,
          method: "GET"
        });
        
        // If client has locations, set the first one as filter
        if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
          // Set first location of the client
          const firstClientLocation = response.data[0];
          if (firstClientLocation?.loc_id) {
            setSelectedLocation(firstClientLocation.loc_id);
          }
        }
      } catch (err) {
        console.error("Error fetching client locations:", err);
        // Fallback: don't set any filter if fetch fails
      }
    };

    fetchClientLocations();
  }, [incomingClientId, locationsLoaded, allLocations, authFetch]);

  /* -------------------------------------------------
     SWITCH TABS (Client-side)
  ------------------------------------------------- */
  useEffect(() => {
    setDevices(allDevices[activeTab] || []);
    setCurrentPage(1);
    setSearchQuery("");
    setSelectedOption("");
    // Don't clear location filter when switching tabs
  }, [activeTab, allDevices, locationMap]);

  /* -------------------------------------------------
     FILTER & SEARCH
  ------------------------------------------------- */
  const filteredDevices = devices.filter((device) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      device.device_name?.toLowerCase().includes(q) ||
      device.device_id?.toLowerCase().includes(q) ||
      device.did?.toLowerCase().includes(q) ||
      device.dev_id?.toLowerCase().includes(q) ||
      device.macid?.toLowerCase().includes(q);

    const status = device.is_active ? "active" : "inactive";
    const matchesStatus = selectedOption === "" || status === selectedOption;

    const matchesLocation = selectedLocation === "" || device.loc_id == selectedLocation;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  /* -------------------------------------------------
     PAGINATION
  ------------------------------------------------- */
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* -------------------------------------------------
     HANDLERS
  ------------------------------------------------- */
  const handleAddDevice = () => {
    const routes = {
      iatm: "/device-add",
      bigio: "/bigio-device-add",
      neon: "/neon-device-add",
      libi: "/libi-device-add",
      "3p-libi": "/3p-libi-device-add",
    };
    navigate(routes[activeTab] || "/device-add");
  };

  const handleEdit = (device) => {
    const id = device.dev_id || device.did || device.device_id;
    const routes = {
      iatm: `/device-edit/${id}`,
      bigio: `/bigio-device-edit/${id}`,
      neon: `/neon-device-edit/${id}`,
      libi: `/libi-device-edit/${id}`,
      "3p-libi": `/3p-libi-device-edit/${id}`,
    };
    navigate(routes[activeTab] || `/device-edit/${id}`);
  };

  const handleDeleteClick = (device) => {
    const id = device.dev_id || device.did || device.device_id;
    if (!id) {
      alert("Cannot delete: Device has no ID.");
      return;
    }
    setSelectedDevice({ ...device, dev_id: id });
    setDeleteModalOpen(true);
  };

  const handleDeviceRowClick = (device, e) => {
    // Don't navigate if clicking on action menu or buttons
    if (e.target.closest('.action-menu') || e.target.closest('svg')) {
      return;
    }

    // Navigate to specific device page based on device type
    switch (activeTab) {
      case "neon":
        // For Neon devices, navigate based on device_type (IR, MODBUS, RELAY, etc.)
        if (!device.did && !device.macid) {
          alert("Cannot navigate: Device ID is missing.");
          return;
        }
        const neonId = encodeURIComponent(device.did || device.macid);
        const deviceType = device.device_type?.toUpperCase();
        
        switch (deviceType) {
          case "IR":
            navigate(`/neonir/${neonId}`);
            break;
          case "MODBUS":
            navigate(`/neonmodbus/${neonId}`);
            break;
          case "RELAY":
            navigate(`/neonrelay/${neonId}`);
            break;
          default:
            navigate(`/neon/${neonId}`);
            break;
        }
        break;

      case "libi":
        // For LIB devices
        if (!device.did && !device.macid) {
          alert("Cannot navigate: Device ID is missing.");
          return;
        }
        navigate(`/lib/${encodeURIComponent(device.did || device.macid)}`);
        break;

      case "3p-libi":
        // For 3P-LIB devices
        if (!device.did && !device.macid) {
          alert("Cannot navigate: Device ID is missing.");
          return;
        }
        navigate(`/lib3p/${encodeURIComponent(device.did || device.macid)}`);
        break;

      case "iatm":
      case "bigio":
      default:
        // For iATM and BigIO, navigate to location view with AI IoT tab
        // as they don't have individual device pages
        const locId = device.loc_id;
        if (!locId) {
          alert("Cannot navigate: Location ID is missing.");
          return;
        }
        navigate('/location', { 
          state: { 
            locationId: locId,
            tabIndex: 1 // AI IoT tab
          } 
        });
        break;
    }
  };
const confirmDeleteDevice = async () => {
  if (!selectedDevice) return;

  const id = selectedDevice.dev_id || selectedDevice.did || selectedDevice.device_id;
  if (!id) {
    alert("Device ID is missing.");
    return;
  }

  // ← CRITICAL: Map tab → device type EXACTLY as backend expects
  const deviceTypeMap = {
    iatm: "iatm",
    bigio: "bigio",
    neon: "neon",
    libi: "libi",           // ← Must match DB table or controller
    "3p-libi": "3p-libi",   // ← Must match
  };

  const deviceType = deviceTypeMap[activeTab];
  if (!deviceType) {
    alert(`Unknown device type: ${activeTab}`);
    return;
  }

  const userId = getUserIdFromToken();

  // ← BUILD URL CORRECTLY
  const endpoint = `${apiURL}/deviceManagement/${id}?device=${deviceType}`;

  console.log("DELETE Request:", { endpoint, userId }); // ← DEBUG

  try {
    await authFetch({
      url: endpoint,
      method: "DELETE",
      data: {
        user: { user_id: userId },
      },
    });

    // Success
    setShowDeleteSuccessPopup(true);
    setAllDevices((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((d) => (d.dev_id || d.did || d.device_id) !== id),
    }));
  } catch (err) {
    console.error("Delete failed:", err.response?.data || err);
    alert("Delete failed: " + (err.response?.data?.message || "Unknown error"));
  } finally {
    setDeleteModalOpen(false);
    setSelectedDevice(null);
  }
};

  /* -------------------------------------------------
     COLUMNS & ROW VALUES (Enhanced)
  ------------------------------------------------- */
  const getColumns = () => {
    switch (activeTab) {
      case "bigio":
        return [
          "Device Name",
          "Device ID",
          "Location",
          "Serial No",
          "Sim No",
          "Status",
          "Action",
        ];
      case "neon":
        return [
          "DID",
          "Device Name",
          "MAC ID",
          "Device Type",
          "Topic",
          "Response",
          "Location",
          "Status",
          "Action",
        ];
      case "libi":
      case "3p-libi":
        return [
          "DID",
          "Device Name",
          "MAC ID",
          "Device Type",
          "Topic",
          "Response",
          "Location",
          "Status",
          "Action",
        ];
      default: // iatm
        return [
          "Device Name",
          "Device ID",
          "Location",
          "Serial No",
          "Sim No",
          "Batteries",
          "Total Voltage",
          "Status",
          "Action",
        ];
    }
  };

  const getRowValues = (device) => {
    // Get location name from the map, or use device fields, or fallback to 'Unknown Location'
    let locName = "Unknown Location";
    if (device.loc_id != null) {
      if (locationMap && locationMap[device.loc_id]) {
        locName = locationMap[device.loc_id] || "Unknown Location";
      } else {
        // If not in map but has loc_id, use 'Unknown Location'
        locName = "Unknown Location";
      }
    } else if (device.loc_name) {
      locName = device.loc_name;
    } else if (device.location_name) {
      locName = device.location_name;
    } else if (device.location) {
      locName = device.location;
    }
    
    switch (activeTab) {
      case "bigio":
        return [
          device.device_name || "-",
          device.device_id || "-",
          locName,
          device.serial_no || "-",
          device.sim_no || "-",
          device.is_active ? "Active" : "Inactive",
        ];
      case "neon":
      case "libi":
      case "3p-libi":
        return [
          device.did || "-",
          device.device_name || "-",
          device.macid || "-",
          device.device_type || "-",
          device.topic || "-",
          device.response || "-",
          locName,
          device.is_active ? "Active" : "Inactive",
        ];
      default: // iatm
        return [
          device.device_name || "-",
          device.device_id || "-",
          locName,
          device.serial_no || "-",
          device.sim_no || "-",
          device.no_of_batteries || "-",
          device.total_battery_vol || "-",
          device.is_active ? "Active" : "Inactive",
        ];
    }
  };

  const getStatusColor = (isActive) => (isActive ? "#10B981" : "#EF4444");

  /* -------------------------------------------------
     DROPDOWN OUTSIDE CLICK
  ------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) {
    return <div className="flex-1 p-3 text-white">Loading devices...</div>;
  }

  if (error) {
    return <div className="flex-1 p-3 text-red-400">Error: {error}</div>;
  }

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <div className="flex-1 overflow-visible p-3 w-full text-white">
      <div>
          <h1 className="page-header select-none ml-4">Device Management</h1>
      </div>
      <br />
      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-700 mb-4 ml-5">
        {["iatm", "bigio", "neon", "libi", "3p-libi"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2 text-sm font-medium transition-colors duration-200 ${
              activeTab === tab
                ? "text-[rgb(210,222,7)]"
                : "text-gray-300 hover:text-gray-100"
            }`}
            style={{ background: "transparent" }}
          >
            {tab.toUpperCase()}
            {activeTab === tab && (
              <span
                className="absolute left-0 bottom-0 w-full h-[2px] rounded"
                style={{ backgroundColor: "rgb(210, 222, 7)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Search / Filter / Add */}
      <div className="flex flex-wrap justify-end items-center gap-4 mb-4 ml-4">
        {/* Location Filter */}
        <div className="relative">
          <div
            className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[150px] ${
              isDarkMode ? "border-white text-white" : "border-gray-300 text-gray-900 bg-white"
            }`}
            onClick={() => setLocationFilterOpen(!locationFilterOpen)}
          >
            <span>
              {selectedLocation
                ? (locationMap[selectedLocation] || "Location")
                : "All Locations"}
            </span>
            <IoFilter />
          </div>
          {locationFilterOpen && (
            <div className={`absolute top-full left-0 mt-1 w-full rounded-md z-10 max-h-60 overflow-y-auto ${
              isDarkMode ? "bg-[#0f172b] border border-white" : "bg-white border border-gray-300"
            }`}>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                } ${
                  selectedLocation === "" 
                    ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                    : ""
                }`}
                onClick={() => {
                  setSelectedLocation("");
                  setLocationFilterOpen(false);
                  setCurrentPage(1);
                }}
              >
                All Locations
              </div>
              {allLocations.map((loc) => (
                <div
                  key={loc.loc_id}
                  className={`px-4 py-2 cursor-pointer ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } ${
                    selectedLocation == loc.loc_id 
                      ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedLocation(loc.loc_id);
                    setLocationFilterOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  {loc.loc_name || loc.location_name || loc.name || `Location ${loc.loc_id}`}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Search Device"
          className={`pl-4 pr-10 py-2 h-10 rounded-md border ${
            isDarkMode ? "border-white bg-transparent text-white" : "border-gray-300 bg-white text-gray-900"
          }`}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />

        <div className="relative">
          <div
            className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[130px] ${
              isDarkMode ? "border-white text-white" : "border-gray-300 text-gray-900 bg-white"
            }`}
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
          >
            <span>
              {selectedOption
                ? options.find((o) => o.value === selectedOption)?.label
                : "Filter By"}
            </span>
            <IoFilter />
          </div>
          {filterDropdownOpen && (
            <div className={`absolute top-full left-0 mt-1 w-full rounded-md z-10 ${
              isDarkMode ? "bg-[#0f172b] border border-white" : "bg-white border border-gray-300"
            }`}>
              {options.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-4 py-2 cursor-pointer ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } ${
                    selectedOption === opt.value 
                      ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedOption(opt.value);
                    setFilterDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="px-4 py-2 font-bold text-white rounded-md transition-colors"
          style={{ backgroundColor: "#76df23" }}
          onClick={handleAddDevice}
        >
          + Add Device
        </button>
      </div>

      {/* Total Devices Count */}
      <div className="ml-4 mb-2">
        <span className={`text-sm font-semibold ${
          isDarkMode ? "text-white" : "text-gray-700"
        }`}>
          Showing {filteredDevices.length} devices
        </span>
      </div>

      {/* Table */}
      <div className="overflow-visible relative ml-4">
        <table className="table-auto w-full min-w-full">
          <thead className={`border-separate border-spacing-x-5 border-spacing-y-2 ${
            isDarkMode ? "bg-[#0f172b] text-white" : "bg-[#2c3e50] text-white"
          }`}>
            <tr>
              {getColumns().map((col, idx) => (
                <th key={idx} className="px-4 py-2 text-left">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
                {paginatedDevices.length > 0 ? (
              paginatedDevices.map((device, index) => {
                const rowKey = `device-${device.loc_id}-${index}`;
                const rowValues = getRowValues(device);
                return (
                  <tr
                    key={rowKey}
                    onClick={(e) => handleDeviceRowClick(device, e)}
                    className={`text-sm border-b transition-colors cursor-pointer ${
                      isDarkMode
                        ? "border-gray-600 hover:bg-[#1a253f] bg-[#0f172b] text-white"
                        : index % 2 === 0
                        ? "border-gray-200 hover:bg-gray-50 bg-white text-gray-900"
                        : "border-gray-200 hover:bg-gray-50 bg-gray-50 text-gray-900"
                    }`}
                  >
                    {rowValues.map((rv, idx) => {
                      const text = rv && typeof rv === 'object' ? rv.text : rv;
                      const isStatus = rv && rv.isStatus;
                      const isLocation = rv && rv.isLocation;
                      const style = isStatus
                        ? { color: getStatusColor(text === 'Active'), fontWeight: 500 }
                        : isLocation
                        ? isDarkMode ? { color: '#FFFFFF' } : { color: '#111827' }
                        : {};
                      return (
                        <td key={idx} className={`px-4 py-2 ${!isDarkMode && !isStatus ? 'text-gray-900' : ''}`} style={style}>
                          {text}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 relative action-menu">
                      <FaEllipsisV
                        className={`cursor-pointer ${
                          isDarkMode ? "text-white" : "text-gray-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(
                            dropdownOpen === rowKey ? null : rowKey
                          );
                        }}
                      />
                      {dropdownOpen === rowKey && (
                        <div
                          className={`absolute right-0 mt-2 w-32 rounded-md shadow-lg z-10 ${
                            isDarkMode ? "bg-[#0f172b]" : "bg-white border border-gray-200"
                          }`}
                          ref={dropdownRef}
                        >
                          <div
                            className={`flex items-center justify-between py-2 px-4 cursor-pointer rounded-md ${
                              isDarkMode ? "text-white" : "text-gray-700"
                            }`}
                            onClick={() => {
                              handleEdit(device);
                              setDropdownOpen(null);
                            }}
                          >
                            Edit <FaPencilAlt className="ml-2" />
                          </div>
                          <div
                            className={`flex items-center justify-between py-2 px-4 cursor-pointer rounded-md ${
                              isDarkMode ? "text-white" : "text-gray-700"
                            }`}
                            onClick={() => {
                              handleDeleteClick(device);
                              setDropdownOpen(null);
                            }}
                          >
                            Delete <FaTrash className={`ml-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={getColumns().length + 1} // +1 for Action column
                  className="text-center text-gray-400 p-4"
                >
                  {searchQuery || selectedOption
                    ? "No devices found matching your search criteria"
                    : `No ${activeTab.toUpperCase()} devices found`}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredDevices.length > 0 && (
          <div className={`flex justify-between items-center mt-4 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            <div className="flex items-center gap-4">
              <span>Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={isDarkMode ? "bg-[#0f172b] border border-gray-600 rounded px-2 py-1" : "bg-white border border-gray-300 rounded px-2 py-1 text-gray-900"}
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={`disabled:opacity-50 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`}
              >
                <TfiControlSkipBackward />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`disabled:opacity-50 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`}
              >
                <IoIosArrowBack />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`disabled:opacity-50 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`}
              >
                <IoIosArrowForward />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`disabled:opacity-50 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`}
              >
                <TfiControlSkipForward />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 ${
          isDarkMode ? "bg-black bg-opacity-50" : "bg-gray-900/20"
        }`}>
          <div className={`p-6 rounded-lg w-[400px] ${
            isDarkMode ? "bg-[#0f172b] text-white" : "bg-white text-gray-900"
          }`}>
            <h2 className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>Confirm Delete</h2>
            <p className={`mb-4 ${
              isDarkMode ? "text-white" : "text-gray-600"
            }`}>
              Are you sure you want to delete "{selectedDevice?.device_name || 'this device'}?"
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                onClick={confirmDeleteDevice}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessPopup
        isOpen={showDeleteSuccessPopup}
        onClose={() => setShowDeleteSuccessPopup(false)}
        message="Device Deleted Successfully"
      />
    </div>
  );
};

export default DeviceList;