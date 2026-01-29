import React, { useState, useRef, useEffect } from "react";
import {
  IoIosArrowForward,
  IoIosArrowBack,
} from "react-icons/io";
import { IoSearchOutline } from "react-icons/io5";
import { RiArrowDropDownLine } from "react-icons/ri";
import {
  TfiControlSkipForward,
  TfiControlSkipBackward,
} from "react-icons/tfi";
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import { MdDevices } from "react-icons/md";
import { FaMoneyCheckAlt } from "react-icons/fa";
import { FaRegLightbulb } from "react-icons/fa";
import { LuLightbulb } from "react-icons/lu";
import { MdDevicesOther } from "react-icons/md";

import useClickAway from "../hooks/useClickAway";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const AlertsLog = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [deviceCards, setDeviceCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const [checkedState, setCheckedState] = useState([]);
  const [isHeaderChecked, setIsHeaderChecked] = useState(false);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeviceType, setSelectedDeviceType] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [actionFeedback, setActionFeedback] = useState(null);

  // NEW: Client and Location State
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(false);

  const apiURL = import.meta.env.VITE_API_BASE_URL;

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / itemsPerPage));
  const getGlobalIndex = (pageIdx) => (currentPage - 1) * itemsPerPage + pageIdx;

  // NEW: Fetch user's assigned clients
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${apiURL}/user-clients`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const json = await res.json();
      if (Array.isArray(json)) {
        setClients(json);
      }
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  };

  // NEW: Fetch locations for selected client
  const fetchLocations = async (clientId) => {
    try {
      setLocationsLoading(true);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${apiURL}/${clientId}/locations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const json = await res.json();
      if (Array.isArray(json)) {
        setLocations(json);
      }
    } catch (e) {
      console.error("Error fetching locations:", e);
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  const fetchAlertsLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      const params = new URLSearchParams();
      if (selectedClient) params.append("orgId", selectedClient);
      if (selectedLocation) params.append("locId", selectedLocation);
      params.append("limit", "10000");

      const res = await fetch(`${apiURL}/device-alerts?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch alerts");
      }

      const rawAlerts = Array.isArray(json.alerts) ? json.alerts : [];

      const mapped = rawAlerts.map((a) => ({
        alertId: a.alert_id,
        did: a.did || "—",
        deviceType: a.device_type || "—",
        deviceName: a.device_name || "—",
        errorCode: a.error_code || "—",
        category: a.category || "—",
        message: a.message || "—",
        description: a.message || "—", // Alias for backward compatibility
        severity: a.severity || "low",
        status: a.status || "open",
        locationName: a.loc_name || "—",
        orgName: a.org_name || "—",
        alertTimestamp: a.alert_timestamp ? new Date(a.alert_timestamp).toLocaleString() : "—",
        createdAt: a.created_at ? new Date(a.created_at).toLocaleString() : "—",
        acknowledgedBy: a.acknowledged_by,
        acknowledgedAt: a.acknowledged_at ? new Date(a.acknowledged_at).toLocaleString() : null,
        resolvedAt: a.resolved_at ? new Date(a.resolved_at).toLocaleString() : null,
        metadata: a.metadata || {},
      }));

      setAlerts(mapped);
      setFilteredAlerts(mapped);
      setCheckedState(new Array(mapped.length).fill(false));

      // Device Cards - Count by device type
      const deviceTypeCounts = {};
      mapped.forEach(alert => {
        const type = alert.deviceType.toLowerCase();
        deviceTypeCounts[type] = (deviceTypeCounts[type] || 0) + 1;
      });

      const iconMap = {
        bigio: { Icon: MdDevices, label: "BIGIO", bg: "bg-gradient-to-tl from-blue-600 via-blue-500 to-blue-400" },
        iatm:  { Icon: FaMoneyCheckAlt, label: "IATM", bg: "bg-gradient-to-tl from-red-600 via-red-500 to-red-400" },
        lib:   { Icon: FaRegLightbulb, label: "LIB", bg: "bg-gradient-to-tl from-green-600 via-green-500 to-green-400" },
        lib3p: { Icon: LuLightbulb, label: "LIB3P", bg: "bg-gradient-to-tl from-purple-600 via-purple-500 to-purple-400" },
        neon:  { Icon: MdDevices, label: "NEON", bg: "bg-gradient-to-tl from-yellow-600 via-yellow-500 to-yellow-400" },
        unknown: { Icon: MdDevicesOther, label: "Unknown", bg: "bg-gradient-to-tl from-gray-600 via-gray-500 to-gray-400" },
      };

      const cards = Object.entries(deviceTypeCounts).map(([type, count]) => {
        const config = iconMap[type] || iconMap.unknown;
        return { label: config.label.toUpperCase(), data: count, Icon: config.Icon, bg: config.bg };
      });

      setDeviceCards(cards);
    } catch (e) {
      console.error("fetchAlertsLogs error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // Fetch alerts on mount without requiring client/location selection
    fetchAlertsLogs();
  }, []);

  // When client changes, fetch its locations and reset location
  useEffect(() => {
    if (selectedClient) {
      fetchLocations(selectedClient);
      setSelectedLocation(""); // Reset location when client changes
    } else {
      setLocations([]);
      setSelectedLocation("");
    }
  }, [selectedClient]);

  // Refetch when client or location changes
  useEffect(() => {
    fetchAlertsLogs();
  }, [selectedClient, selectedLocation]);

  // Search + Multiple Filters
useEffect(() => {
  let data = [...alerts];

  // SEARCH TERM FILTER
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();

    data = data.filter((a) => {
      return (
        // Alert ID - supports "#123" or just "123"
        String(a.alertId).includes(term) ||
        
        // DID
        (a.did && a.did.toLowerCase().includes(term)) ||
        
        // Device Type
        (a.deviceType && a.deviceType.toLowerCase().includes(term)) ||
        
        // Device Name
        (a.deviceName && a.deviceName.toLowerCase().includes(term)) ||
        
        // Error Code
        (a.errorCode && a.errorCode.toLowerCase().includes(term)) ||
        
        // Location
        (a.locationName && a.locationName.toLowerCase().includes(term)) ||
        
        // Organization
        (a.orgName && a.orgName.toLowerCase().includes(term)) ||
        
        // Message / Description
        (a.message && a.message.toLowerCase().includes(term))
      );
    });
  }

  // APPLY DROPDOWN FILTERS
  if (selectedDeviceType) {
    data = data.filter((a) => 
      a.deviceType.toLowerCase() === selectedDeviceType.toLowerCase()
    );
  }

  if (selectedSeverity) {
    data = data.filter((a) => a.severity === selectedSeverity);
  }

  if (selectedCategory) {
    data = data.filter((a) => a.category === selectedCategory);
  }

  if (selectedStatus) {
    data = data.filter((a) => a.status === selectedStatus);
  }

  if (selectedPriority) {
    data = data.filter((a) => a.priority === selectedPriority);
  }

  setFilteredAlerts(data);
  setCurrentPage(1); // Reset to first page on filter
}, [searchTerm, alerts, selectedDeviceType, selectedSeverity, selectedCategory, selectedStatus, selectedPriority]);

  // Pagination reset
  useEffect(() => {
    const newTotal = Math.max(1, Math.ceil(filteredAlerts.length / itemsPerPage));
    setCurrentPage((p) => Math.min(p, newTotal));
  }, [filteredAlerts.length, itemsPerPage]);

  // Checkbox Logic
  const toggleHeader = () => {
    const newVal = !isHeaderChecked;
    setCheckedState(new Array(filteredAlerts.length).fill(newVal));
    setIsHeaderChecked(newVal);
  };

  const toggleRow = (globalIdx) => {
    setCheckedState((prev) => {
      const next = [...prev];
      next[globalIdx] = !next[globalIdx];
      setIsHeaderChecked(next.every(Boolean));
      return next;
    });
  };

  // Update Alert Status
  const updateAlertStatus = async (alertId, newStatus) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const res = await fetch(`${apiURL}/device-alerts/${alertId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const json = await res.json();
      
      if (json.success) {
        setActionFeedback({ type: "success", message: `Alert ${newStatus} successfully!` });
        setTimeout(() => setActionFeedback(null), 3000);
        fetchAlertsLogs(); // Refresh the list
      } else {
        throw new Error(json.error || "Failed to update alert status");
      }
    } catch (error) {
      console.error("Error updating alert status:", error);
      setActionFeedback({ type: "error", message: error.message || "Failed to update status" });
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleAcknowledge = (alertId) => {
    if (window.confirm("Acknowledge this alert?")) {
      updateAlertStatus(alertId, "acknowledged");
    }
  };

  const handleResolve = (alertId) => {
    if (window.confirm("Mark this alert as resolved?")) {
      updateAlertStatus(alertId, "resolved");
    }
  };

  // Export Selected or All as CSV
  const exportLogs = () => {
    const selected = checkedState
      .map((checked, i) => (checked ? filteredAlerts[i] : null))
      .filter(Boolean);

    const rows = selected.length > 0 ? selected : filteredAlerts;

    if (rows.length === 0) {
      alert("No logs to export.");
      return;
    }

    const headers = [
      "Alert ID", "DID", "Device Type", "Device Name", "Error Code", 
      "Category", "Severity", "Status", "Message", "Location", 
      "Organization", "Alert Timestamp", "Created At"
    ];
    const csvRows = [headers.join(",")];

    rows.forEach((r) => {
      const values = [
        r.alertId, r.did, r.deviceType, r.deviceName, r.errorCode,
        r.category, r.severity, r.status, r.message, r.locationName,
        r.orgName, r.alertTimestamp, r.createdAt
      ];
      const escaped = values
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
      csvRows.push(escaped);
    });

    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alerts_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paginated = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const changeItemsPerPage = (v) => {
    setItemsPerPage(Number(v) || 10);
    setCurrentPage(1);
  };

  const goFirst = () => setCurrentPage(1);
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setCurrentPage(totalPages);

  return (
    <div className="component-body" data-theme={isDarkMode ? "dark" : "light"}>
      {/* Loading Overlay */}
      {loading && (
        <div className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center ${
          isDarkMode ? 'bg-black/50' : 'bg-white/40'
        }`}>
          <div className={`p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-300'
          }`}>
            <div className="relative w-20 h-20">
              <div className={`absolute inset-0 border-4 rounded-full ${
                isDarkMode ? 'border-blue-500/30' : 'border-blue-400/30'
              }`}></div>
              <div className={`absolute inset-0 border-4 border-transparent rounded-full animate-spin ${
                isDarkMode ? 'border-t-blue-500' : 'border-t-blue-600'
              }`}></div>
              <div className={`absolute inset-2 border-4 border-transparent rounded-full animate-spin ${
                isDarkMode ? 'border-t-purple-500' : 'border-t-purple-600'
              }`} style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
            </div>
            <div className={`text-lg font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Loading Alert Logs...</div>
            <div className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Please wait while we fetch the data</div>
          </div>
        </div>
      )}
      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className={`fixed top-20 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in ${
          actionFeedback.type === "success" 
            ? "bg-green-600 text-white" 
            : "bg-red-600 text-white"
        }`}>
          {actionFeedback.type === "success" ? (
            <FaCheckCircle className="w-5 h-5" />
          ) : (
            <FaTimesCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{actionFeedback.message}</span>
        </div>
      )}

  {/* TOP HEADER: Alerts Title + Alerts Logs Button (Top-Right Corner) */}
  <div className="flex justify-between items-start w-full mb-6">
    <h1 className="page-header select-none">Alerts Logs</h1>

    {/* Alerts Logs Button - Perfect Top-Right Position */}
    <button
      onClick={() => navigate("/alert")}
      className="btn-primary flex items-center gap-2.5 rounded-full shadow-lg hover:shadow-xl"
    >
     <svg
  className="w-4 h-4"
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2.5}
    d="M10 19l-7-7 7-7M3 12h18"
  />
</svg>


      Back to Alerts
    </button>
  </div>

      {/* Device Cards */}
      <div className="grid w-full card-container mb-8">
        {deviceCards.length > 0 ? (
          deviceCards.map((c, i) => {
            const isSelected = selectedDeviceType === c.label;
            return (
              <div
                key={i}
                className={`alert-card select-none cursor-pointer transition-all hover:scale-105 ${
                  isSelected ? 'ring-4 ring-blue-400 shadow-lg shadow-blue-500/50' : ''
                }`}
                onClick={() => setSelectedDeviceType(isSelected ? "" : c.label)}
              >
                <div className="pl-3">
                  <div className={`circle-dimension ${c.bg}`} style={{ display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "50%" }}>
                    <c.Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="pl-4">
                  <div className="alert-card-label">{c.label}</div>
                  <div className="font-bold alert-card-data">{c.data}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center text-gray-400 py-6">
            No device data available.
          </div>
        )}
      </div>

     {/* Search & Filters – ONE ROW */}
<div className="mb-6 w-full">
  <div className="selection-filter">

    {/* Client Dropdown */}
    <select
      value={selectedClient}
      onChange={(e) => setSelectedClient(e.target.value)}
      className="selection-item pr-10 text-sm"
    >
      <option value="">All Clients</option>
      {clients && clients.map((c) => (
        <option key={c.clientId || c.id} value={c.clientId || c.id}>
          {c.clientName || c.name}
        </option>
      ))}
    </select>

    {/* Location Dropdown */}
    <select
      value={selectedLocation}
      onChange={(e) => setSelectedLocation(e.target.value)}
      className="selection-item pr-10 text-sm"
      disabled={locationsLoading}
    >
      <option value="">{locationsLoading ? "⏳ Loading locations..." : "All Locations"}</option>
      {!locationsLoading && locations && locations.map((l) => (
        <option key={l.loc_id || l.id} value={l.loc_id || l.id}>
          {l.loc_name || l.name}
        </option>
      ))}
    </select>

    {/* Search */}
    <div className="flex items-center relative">
      <input
          type="text"
          placeholder="Search by Alert ID, DID, Device..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="selection-item pr-10 text-sm placeholder-gray-500"
        />
      <IoSearchOutline className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white opacity-50 pointer-events-none" />
    </div>

    {/* Severity */}
    <select
      value={selectedSeverity}
      onChange={(e) => setSelectedSeverity(e.target.value)}
      className="selection-item pr-10 text-sm"
    >
      <option value="">All Severities</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>

    {/* Category */}
    <select
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
      className="selection-item pr-10 text-sm"
    >
      <option value="">All Categories</option>
      <option value="power">Power</option>
      <option value="connectivity">Connectivity</option>
      <option value="sensor">Sensor</option>
      <option value="hardware">Hardware</option>
      <option value="temperature">Temperature</option>
      <option value="battery">Battery</option>
      <option value="configuration">Configuration</option>
      <option value="data">Data</option>
    </select>

    {/* Status */}
    <select
      value={selectedStatus}
      onChange={(e) => setSelectedStatus(e.target.value)}
      className="selection-item pr-10 text-sm"
    >
      <option value="">All Status</option>
      <option value="open">Open</option>
      <option value="acknowledged">Acknowledged</option>
      <option value="resolved">Resolved</option>
    </select>

    {/* Priority */}
    <select
      value={selectedPriority}
      onChange={(e) => setSelectedPriority(e.target.value)}
      className="selection-item pr-10 text-sm"
    >
      <option value="">All Priorities</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>

    {/* Clear Filters Button (only shows when something is filtered) */}
    {(searchTerm || selectedSeverity || selectedCategory || selectedStatus || selectedClient || selectedLocation || selectedPriority) && (
      <button
        onClick={() => {
          setSearchTerm("");
          setSelectedSeverity("");
          setSelectedCategory("");
          setSelectedStatus("");
          setSelectedClient("");
          setSelectedLocation("");
          setSelectedPriority("");
        }}
        className="clear-filter-button px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
      >
        Clear Filters
      </button>
    )}

    {/* Download Button */}
    {filteredAlerts.length > 0 && (
      <button
        onClick={exportLogs}
        className="download-alert-button flex items-center gap-2 whitespace-nowrap text-sm ml-auto"
      >
        <img src="src/assets/img/alerts/excel.svg" alt="excel" className="w-4 h-4" />
        Download Logs
      </button>
    )}
  </div>
</div>  


      {/* Table - Only 4 Columns */}
      <div className="alert-table-container" style={{ width: '100%', overflowX: 'auto' }}>
        {filteredAlerts.length === 0 ? (
          <div className="text-center p-10 text-gray-400">
            <div className="text-xl mb-2">📊 No alert logs found</div>
            <div className="text-sm">Try adjusting your filters or selecting a different client/location</div>
          </div>
        ) : (
          <table className="alert-table-body rounded-xl" style={{ width: '100%', minWidth: 1200 }}>
            <thead className="bg-[#0f172b]">
              <tr>
                <th className="alert-table-header">Alert ID</th>
                <th className="alert-table-header">Device</th>
                <th className="alert-table-header">Error Code</th>
                <th className="alert-table-header">Category</th>
                <th className="alert-table-header">Severity</th>
                <th className="alert-table-header">Status</th>
                <th className="alert-table-header">Message</th>
                <th className="alert-table-header">Location</th>
                <th className="alert-table-header">Timestamp</th>
                <th className="alert-table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map((a, i) => {
                  const gIdx = getGlobalIndex(i);
                  
                  // Severity color mapping
                  const severityColors = {
                    low: "bg-green-500",
                    medium: "bg-yellow-500",
                    high: "bg-orange-500",
                    critical: "bg-red-600"
                  };

                  // Status color mapping
                  const statusColors = {
                    open: "bg-red-500",
                    acknowledged: "bg-yellow-500",
                    resolved: "bg-green-500"
                  };

                  return (
                    <tr key={a.alertId} className="alert-table-row hover:bg-slate-800/50 transition-colors">
                      <td className="alert-table-cell font-medium text-blue-400">#{a.alertId}</td>
                      <td className="alert-table-cell">
                        <div className="text-white font-medium">{a.deviceType}</div>
                        <div className="text-gray-400 text-xs">{a.did}</div>
                      </td>
                      <td className="alert-table-cell">
                        <code className="text-xs bg-slate-700 px-3 py-2 rounded text-gray-300 font-mono inline-block min-w-[60px]">{a.errorCode || "N/A"}</code>
                      </td>
                      <td className="alert-table-cell capitalize text-gray-300">{a.category}</td>
                      <td className="alert-table-cell">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase ${severityColors[a.severity] || 'bg-gray-500'}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="alert-table-cell">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase ${statusColors[a.status] || 'bg-gray-500'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="alert-table-cell text-left">
                        <div className="text-gray-300 break-words word-wrap whitespace-normal max-w-md text-sm" title={a.message}>{a.message}</div>
                      </td>
                      <td className="alert-table-cell text-gray-300">{a.locationName}</td>
                      <td className="alert-table-cell text-sm text-gray-400">{a.alertTimestamp}</td>
                      <td className="alert-table-cell">
                        <div className="flex gap-2">
                          {a.status === "open" && (
                            <button
                              onClick={() => handleAcknowledge(a.alertId)}
                              className="px-3 py-1 bg-[#76df23] hover:bg-[#6acc1f] text-white rounded text-xs font-medium transition-colors"
                              title="Acknowledge Alert"
                            >
                              Acknowledge
                            </button>
                          )}
                          {(a.status === "open" || a.status === "acknowledged") && (
                            <button
                              onClick={() => handleResolve(a.alertId)}
                              className="px-3 py-1 bg-[#76df23] hover:bg-[#6acc1f] text-white rounded text-xs font-medium transition-colors"
                              title="Resolve Alert"
                            >
                              Resolve
                            </button>
                          )}
                          {a.status === "resolved" && (
                            <span className="text-green-400 text-xs flex items-center gap-1">
                              <FaCheckCircle /> Resolved
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="text-center text-gray-400 py-10">
                    No logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Pagination */}
            <tfoot className="alert-table-footer">
              <tr>
                <td colSpan="10" className="p-4">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-white">
                      <label>Items/page:</label>
                      <select
                        className="bg-[#0f172b] border border-gray-600 rounded px-2 py-1"
                        value={itemsPerPage}
                        onChange={(e) => changeItemsPerPage(e.target.value)}
                      >
                        {[10, 25, 50, 100].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-white">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={goFirst} disabled={currentPage === 1} className="pagination-btn"><TfiControlSkipBackward /></button>
                      <button onClick={goPrev} disabled={currentPage === 1} className="pagination-btn"><IoIosArrowBack /></button>
                      <button onClick={goNext} disabled={currentPage === totalPages} className="pagination-btn"><IoIosArrowForward /></button>
                      <button onClick={goLast} disabled={currentPage === totalPages} className="pagination-btn"><TfiControlSkipForward /></button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default AlertsLog;