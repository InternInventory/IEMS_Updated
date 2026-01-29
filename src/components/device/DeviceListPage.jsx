import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoFilter } from "react-icons/io5";
import { TfiControlSkipBackward, TfiControlSkipForward } from "react-icons/tfi";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";
import { useTheme } from "../../context/ThemeContext";
import "../deviceManagement/device.css";

const DeviceListPage = () => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const dropdownRef = useRef(null);
  const { state } = useLocation();
  const incomingClientId = state?.clientId;
  const incomingOrgName = state?.org_name;
  
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
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [deviceTypeDropdownOpen, setDeviceTypeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [locationMap, setLocationMap] = useState({});
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationFilterOpen, setLocationFilterOpen] = useState(false);
  const [allLocations, setAllLocations] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientFilterOpen, setClientFilterOpen] = useState(false);

  const [allClients, setAllClients] = useState([]);

  // Refs for dropdowns
  const clientFilterRef = useRef(null);
  const locationFilterRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const deviceTypeDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        clientFilterRef.current && !clientFilterRef.current.contains(event.target) && clientFilterOpen
      ) {
        setClientFilterOpen(false);
      }
      if (
        locationFilterRef.current && !locationFilterRef.current.contains(event.target) && locationFilterOpen
      ) {
        setLocationFilterOpen(false);
      }
      if (
        filterDropdownRef.current && !filterDropdownRef.current.contains(event.target) && filterDropdownOpen
      ) {
        setFilterDropdownOpen(false);
      }
      if (
        deviceTypeDropdownRef.current && !deviceTypeDropdownRef.current.contains(event.target) && deviceTypeDropdownOpen
      ) {
        setDeviceTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clientFilterOpen, locationFilterOpen, filterDropdownOpen, deviceTypeDropdownOpen]);

  const options = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const apiURL = import.meta.env.VITE_API_BASE_URL;

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

      const locName = locRes?.data?.loc_name || locRes?.data?.location_name || locRes?.data?.name || `Location ${locId}`;
      setLocationMap((prev) => ({ ...prev, [locId]: locName }));
      return locName;
    } catch (err) {
      console.error(`Error fetching location ${locId}:`, err);
      setLocationMap((prev) => ({ ...prev, [locId]: `Location ${locId}` }));
      return `Location ${locId}`;
    }
  };

  // Helper function to determine device type
  const getDeviceType = (device) => {
    if (device.did || device.macid) {
      if (device.topic && device.topic.includes("3p")) {
        return "3p-libi";
      } else if (device.topic) {
        return "libi";
      } else if (device.device_type) {
        return "neon";
      }
      return "neon"; // default for did/macid
    }
    return "iatm"; // default for device_id
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
        
        const mappedDevices = {
          iatm: devRes.data.iatm_devices || [],
          bigio: devRes.data.bigio_devices || [],
          neon: devRes.data.neon_devices || [],
          libi: devRes.data.lib_devices || [],
          "3p-libi": devRes.data.lib_3p_devices || [],
        };
        setAllDevices(mappedDevices);
        // Combine all devices by default for "all" filter
        const allDevicesCombined = [
          ...mappedDevices.iatm,
          ...mappedDevices.bigio,
          ...mappedDevices.neon,
          ...mappedDevices.libi,
          ...mappedDevices["3p-libi"],
        ];
        setDevices(allDevicesCombined);

        // Fetch all locations once
        const locRes = await authFetch({
          url: `${apiURL}/device-location`,
          method: "GET"
        });
        
        const locMap = {};
        if (Array.isArray(locRes.data)) {
          locRes.data.forEach(loc => {
            locMap[loc.loc_id] = loc.loc_name || loc.location_name || loc.name || `Location ${loc.loc_id}`;
          });
          setAllLocations(locRes.data);
        }
        setLocationMap(locMap);
        setLocationsLoaded(true);

        // Fetch all clients
        const clientRes = await authFetch({
          url: `${apiURL}/client`,
          method: "GET"
        });
        if (Array.isArray(clientRes.data)) {
          setAllClients(clientRes.data);
        }
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
    // Only set if not already set (prevents overwriting user selection)
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

  useEffect(() => {
    if (deviceTypeFilter === "all") {
      // Combine all device types
      const allDevicesCombined = [
        ...allDevices.iatm,
        ...allDevices.bigio,
        ...allDevices.neon,
        ...allDevices.libi,
        ...allDevices["3p-libi"],
      ];
      setDevices(allDevicesCombined);
    } else {
      setDevices(allDevices[deviceTypeFilter] || []);
    }
    setCurrentPage(1);
    setSearchQuery("");
    setSelectedOption("");
  }, [deviceTypeFilter, allDevices, locationMap]);

  const filteredDevices = devices.filter((device) => {
    const q = searchQuery.toLowerCase();
    // Only match device_name and device_id for search
    const matchesSearch =
      device.device_name?.toLowerCase().includes(q) ||
      device.device_id?.toLowerCase().includes(q);

    const status = device.is_active ? "active" : "inactive";
    const matchesStatus = selectedOption === "" || status === selectedOption;

    const matchesLocation = selectedLocation === "" || device.loc_id == selectedLocation;

    // Client filtering: if client is selected, match device.org_name to selectedClient (fallback to clientName)
    let matchesClient = true;
    if (selectedClient !== "") {
      matchesClient = device.org_name === selectedClient || device.clientName === selectedClient;
    }

    return matchesSearch && matchesStatus && matchesLocation && matchesClient;
  });

  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeviceRowClick = (device, e) => {
    if (e.target.closest('.action-menu') || e.target.closest('svg')) {
      return;
    }

    // Determine device type for navigation
    let deviceType = deviceTypeFilter;
    if (deviceType === "all") {
      // Infer device type from device properties
      if (device.did || device.macid) {
        if (device.device_type) {
          // For neon devices with device_type property
          deviceType = "neon";
        } else if (device.topic) {
          // For libi devices with topic
          deviceType = "libi";
        } else {
          deviceType = "neon"; // default to neon for did/macid
        }
      } else if (device.device_id) {
        // For iatm/bigio devices
        deviceType = device.bigio_flag ? "bigio" : "iatm";
      } else {
        deviceType = "iatm"; // fallback
      }
    }

    switch (deviceType) {
      case "neon":
        if (!device.did && !device.macid) {
          alert("Cannot navigate: Device ID is missing.");
          return;
        }
        const neonId = encodeURIComponent(device.did || device.macid);
        const devType = device.device_type?.toUpperCase();
        
        switch (devType) {
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
        if (!device.did && !device.macid) {
          alert("Cannot navigate: Device ID is missing.");
          return;
        }
        navigate(`/lib/${encodeURIComponent(device.did || device.macid)}`);
        break;

      case "3p-libi":
        if (!device.did && !device.macid) {
          alert("Cannot navigate: Device ID is missing.");
          return;
        }
        navigate(`/lib3p/${encodeURIComponent(device.did || device.macid)}`);
        break;

      case "iatm":
      case "bigio":
      default:
        const locId = device.loc_id;
        if (!locId) {
          alert("Cannot navigate: Location ID is missing.");
          return;
        }
        navigate('/location', { 
          state: { 
            locationId: locId,
            tabIndex: 1
          } 
        });
        break;
    }
  };

  const getColumns = () => {
    if (deviceTypeFilter === "all") {
      return [
        "Device Type",
        "Device Name",
        "Device ID",
        "Location",
        "Status",
      ];
    }

    switch (deviceTypeFilter) {
      case "bigio":
        return [
          "Device Name",
          "Device ID",
          "Location",
          "Serial No",
          "Sim No",
          "Status",
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
        ];
      default:
        return [
          "Device Name",
          "Device ID",
          "Location",
          "Serial No",
          "Sim No",
          "Batteries",
          "Total Voltage",
          "Status",
        ];
    }
  };

  const getRowValues = (device) => {
    let locName = "Unknown Location";
    if (device.loc_id != null) {
      if (locationMap && locationMap[device.loc_id]) {
        locName = locationMap[device.loc_id] || "Unknown Location";
      } else {
        locName = "Unknown Location";
      }
    } else if (device.loc_name) {
      locName = device.loc_name;
    } else if (device.location_name) {
      locName = device.location_name;
    } else if (device.location) {
      locName = device.location;
    }
    
    if (deviceTypeFilter === "all") {
      // Return simplified row for "all" view
      const deviceType = getDeviceType(device);
      return [
        deviceType.toUpperCase(),
        device.device_name || "-",
        device.device_id || device.did || "-",
        locName,
        { text: device.is_active ? "Active" : "Inactive", isStatus: true },
      ];
    }

    switch (deviceTypeFilter) {
      case "bigio":
        return [
          device.device_name || "-",
          device.device_id || "-",
          locName,
          device.serial_no || "-",
          device.sim_no || "-",
          { text: device.is_active ? "Active" : "Inactive", isStatus: true },
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
          { text: locName, isLocation: true },
          { text: device.is_active ? "Active" : "Inactive", isStatus: true },
        ];
      default:
        return [
          device.device_name || "-",
          device.device_id || "-",
          locName,
          device.serial_no || "-",
          device.sim_no || "-",
          device.no_of_batteries || "-",
          device.total_battery_vol || "-",
          { text: device.is_active ? "Active" : "Inactive", isStatus: true },
        ];
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? "#22c55e" : "#ef4444";
  };

  if (loading) {
    return (
      <div className="component-body">
        <div className="text-center text-gray-400 p-4">Loading devices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="component-body">
        <div className="text-center text-red-400 p-4">{error}</div>
      </div>
    );
  }

  return (
    <div className={`w-full ${isDarkMode ? 'text-white bg-transparent' : 'text-black'}`} 
         style={isDarkMode ? { padding: '16px 20px', minHeight: 'calc(100vh - 70px)' } : { backgroundColor: '#f0f2f5', padding: '16px 20px', minHeight: 'calc(100vh - 70px)' }}>
      <div>
        <h1 className="page-header select-none">Device List</h1>
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

        {/* Location Filter */}
        <div className="relative" ref={locationFilterRef}>
          <div
            className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[220px] max-w-[300px] ${
              isDarkMode ? "border-white text-white" : "border-gray-300 text-gray-900 bg-white"
            }`}
            onClick={() => setLocationFilterOpen(!locationFilterOpen)}
            style={{ minWidth: 220, maxWidth: 300 }}
          >
            <span className="truncate w-full block">
              {selectedLocation
                ? (locationMap[selectedLocation] || "Location")
                : "All Locations"}
            </span>
            <IoFilter />
          </div>
          {locationFilterOpen && (
            <div className={`absolute top-full left-0 mt-1 w-full rounded-md z-10 max-h-60 overflow-y-auto ${
              isDarkMode ? "bg-[#0f172b] border border-white" : "bg-white border border-gray-300"
            }`} style={{ minWidth: 220, maxWidth: 300 }}>
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

        <div className="relative" ref={filterDropdownRef}>
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

        {/* Device Type Filter */}
        <div className="relative" ref={deviceTypeDropdownRef}>
          <div
            className={`flex items-center justify-between gap-2 border rounded-md px-4 py-2 h-10 cursor-pointer min-w-[130px] ${
              isDarkMode ? "border-white text-white" : "border-gray-300 text-gray-900 bg-white"
            }`}
            onClick={() => setDeviceTypeDropdownOpen(!deviceTypeDropdownOpen)}
          >
            <span>{deviceTypeFilter === "all" ? "All Devices" : deviceTypeFilter.toUpperCase()}</span>
            <IoFilter />
          </div>
          {deviceTypeDropdownOpen && (
            <div className={`absolute top-full left-0 mt-1 w-full rounded-md z-10 ${
              isDarkMode ? "bg-[#0f172b] border border-white" : "bg-white border border-gray-300"
            }`}>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                } ${
                  deviceTypeFilter === "all" 
                    ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                    : ""
                }`}
                onClick={() => {
                  setDeviceTypeFilter("all");
                  setDeviceTypeDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                All Devices
              </div>
              {["iatm", "bigio", "neon", "libi", "3p-libi"].map((type) => (
                <div
                  key={type}
                  className={`px-4 py-2 cursor-pointer ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } ${
                    deviceTypeFilter === type 
                      ? (isDarkMode ? "bg-gray-700 font-medium" : "bg-gray-200 font-medium")
                      : ""
                  }`}
                  onClick={() => {
                    setDeviceTypeFilter(type);
                    setDeviceTypeDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  {type.toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Total Devices Count */}
      <div className="mb-2">
        <span className={`text-sm font-semibold ${
          isDarkMode ? "text-white" : "text-gray-700"
        }`}>
          Showing {filteredDevices.length} devices
        </span>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className={`${
            isDarkMode ? "bg-[#0f172b] text-white" : "bg-[#2c3e50] text-white"
          }`}>
            <tr>
              {getColumns().map((col, idx) => (
                <th key={idx} className="px-4 py-2 text-left whitespace-nowrap">
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
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={getColumns().length}
                  className="text-center text-gray-400 p-4"
                >
                  {searchQuery || selectedOption || selectedLocation
                    ? "No devices found matching your search criteria"
                    : `No ${deviceTypeFilter.toUpperCase()} devices found`}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredDevices.length > 0 && (
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
                {Math.min(currentPage * itemsPerPage, filteredDevices.length)} of{" "}
                {filteredDevices.length}
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

export default DeviceListPage;
