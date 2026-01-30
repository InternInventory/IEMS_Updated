import React, { useState, useRef, useEffect } from "react";
import AlertStatusBadge from "./AlertStatusBadge";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { IoSearchOutline } from "react-icons/io5";
import { FiDownload } from "react-icons/fi";
import { RiArrowDropDownLine } from "react-icons/ri";
import { TfiControlSkipForward, TfiControlSkipBackward } from "react-icons/tfi";

// React Icons for device cards
import { MdDevices, MdDevicesOther } from "react-icons/md";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { FaMoneyCheckAlt, FaRegLightbulb } from "react-icons/fa";
import { LuLightbulb } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

import useClickAway from "../hooks/useClickAway";
import "./alert.css";
import "../../assets/styles/common.css";

const Alert = () => {
  /* ------------------------------------------------------------------ *
   *  STATE
   * ------------------------------------------------------------------ */
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [deviceCards, setDeviceCards] = useState([]);
  const navigate = useNavigate();
  // Sorting for Raised On
  const [raisedOnSortOrder, setRaisedOnSortOrder] = useState("");
  // "" | "asc" | "desc"

  const [loading, setLoading] = useState(false);

  // Checkboxes
  const [checkedState, setCheckedState] = useState([]);
  const [isHeaderChecked, setIsHeaderChecked] = useState(false);

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters & search
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeviceType, setSelectedDeviceType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // NEW: Client and Location State
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(false);

  // Priority filter
  const [selectedPriority, setSelectedPriority] = useState("");

  // Sorting for Alert ID
  const [alertIdSortOrder, setAlertIdSortOrder] = useState(""); // "asc" | "desc"

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAlerts.length / itemsPerPage),
  );
  const getGlobalIndex = (pageIdx) =>
    (currentPage - 1) * itemsPerPage + pageIdx;

  // NEW: Fetch user's assigned clients
  const fetchClients = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const res = await fetch(`${apiURL}/user-clients`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      const json = await res.json();
      console.log("🧾 /user-clients raw response:", json);

      if (Array.isArray(json)) {
        // 🔑 normalize ONLY the keys you already use
        setClients(
          json.map((c) => ({
            // 🔑 extract the REAL client id
            clientId: c.client?.id ?? c.client_id ?? c.clientId,
            clientName:
              c.client?.name ?? c.client_name ?? c.clientName ?? c.name,
          })),
        );
      }
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  };

  // NEW: Fetch locations for selected client
  const fetchLocations = async (clientId) => {
    try {
      setLocationsLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
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
  const fetchAlerts = async (status = "", type = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (type) params.append("alert_type", type);
      if (selectedClient) params.append("clientId", selectedClient);
      if (selectedLocation) params.append("locId", selectedLocation);
      params.append("limit", "1000000"); // Fetch all alerts

      const url = `${apiURL}/alerts${params.toString() ? `?${params}` : ""}`;
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      console.log("🔍 Fetching alerts:", {
        url,
        hasToken: !!token,
        tokenLength: token?.length,
      });

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      console.log("📡 API Response status:", res.status, res.statusText);

      const json = await res.json();
      console.log("📄 API Response data:", json);
      // Handle response structure: json.data is the array (corrected from json.alerts)
      const rawAlerts = Array.isArray(json.data) ? json.data : [];

      console.log("📊 Raw alerts data:", {
        isArray: Array.isArray(json.data),
        alertsCount: rawAlerts.length,
        sampleAlert: rawAlerts[0],
      });

      // ---------- Map alerts ----------
      const mapped = rawAlerts.map((a) => ({
        alertId: a.alert_id ?? a.id ?? "—",
        clientName: a.client_name ?? "—",

        alertTitle: a.alert_title,
        alertDescription: a.alert_description || "—",
        alertType: a.alert_type || "—",
        alertCategory: a.alert_category || "—",

        priority: a.priority || "—",
        deviceType: a.device_type || "—",
        did: a.did || "—",

        location: a.loc_name || "—",
        locationId: a.loc_id ?? "",

        status: a.status || "—",

        raisedOn: a.raised_on ? new Date(a.raised_on).toLocaleString() : "—",

        raisedOnRaw: a.raised_on ? new Date(a.raised_on).getTime() : null,

        closedOn: a.closed_on ? new Date(a.closed_on).toLocaleString() : "—",

        dueDays: a.due_days ?? "—",
        assignTo: a.assigned_user_name || "—",
      }));

      setAlerts(mapped);
      setFilteredAlerts(mapped);
      setCheckedState(new Array(mapped.length).fill(false));
      setIsHeaderChecked(false);
      setCurrentPage(1);

      // ---------- Build device cards with React Icons - Count by device type ----------
      const deviceTypeCounts = {};
      mapped.forEach((alert) => {
        const type = alert.deviceType.toLowerCase();
        deviceTypeCounts[type] = (deviceTypeCounts[type] || 0) + 1;
      });

      const iconMap = {
        bigio: {
          Icon: MdDevices,
          label: "BIGIO",
          bg: "bg-gradient-to-tl from-blue-600 via-blue-500 to-blue-400",
        },
        iatm: {
          Icon: FaMoneyCheckAlt,
          label: "IATM",
          bg: "bg-gradient-to-tl from-red-600 via-red-500 to-red-400",
        },
        lib: {
          Icon: FaRegLightbulb,
          label: "LIB",
          bg: "bg-gradient-to-tl from-green-600 via-green-500 to-green-400",
        },
        lib3p: {
          Icon: LuLightbulb,
          label: "LIB3P",
          bg: "bg-gradient-to-tl from-purple-600 via-purple-500 to-purple-400",
        },
        neon: {
          Icon: LuLightbulb,
          label: "NEON",
          bg: "bg-gradient-to-tl from-yellow-600 via-yellow-500 to-yellow-400",
        },
        unknown: {
          Icon: MdDevicesOther,
          label: "Unknown",
          bg: "bg-gradient-to-tl from-gray-600 via-gray-500 to-gray-400",
        },
      };
      const cards = Object.entries(deviceTypeCounts).map(([type, count]) => {
        const config = iconMap[type] || iconMap.unknown;
        return {
          label: config.label,
          data: count,
          Icon: config.Icon,
          bg: config.bg,
        };
      });

      setDeviceCards(cards);
    } catch (e) {
      console.error("❌ fetchAlerts error:", {
        message: e.message,
        stack: e.stack,
        url: `${apiURL}/alerts`,
        hasToken: !!(
          localStorage.getItem("token") || sessionStorage.getItem("token")
        ),
      });
      // Show user-friendly error message
      alert(
        "Failed to load alerts. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRaisedOnSortOrder("desc"); // newest first by default
  }, []);

  useEffect(() => {
    fetchClients();
    // Fetch alerts on mount without requiring client/location selection
    fetchAlerts("", "");
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

  useEffect(() => {
    // Fetch alerts when filters change
    fetchAlerts(selectedStatus, selectedAlertType);
  }, [selectedStatus, selectedAlertType, selectedClient, selectedLocation]);

  useEffect(() => {
    let data = [...alerts];

    // --- LOCATION FILTER (by location ID) ---
    if (selectedLocation) {
      data = data.filter(
        (a) => String(a.locationId) === String(selectedLocation),
      );
    }

    // --- SEARCH FILTER ---
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (a) =>
          a.did.toLowerCase().includes(term) ||
          a.alertDescription.toLowerCase().includes(term) ||
          a.deviceType.toLowerCase().includes(term) ||
          a.location.toLowerCase().includes(term),
      );
    }

    // --- DEVICE TYPE FILTER ---
    if (selectedDeviceType) {
      data = data.filter(
        (a) => a.deviceType.toLowerCase() === selectedDeviceType.toLowerCase(),
      );
    }

    // --- PRIORITY FILTER ---
    if (selectedPriority) {
      data = data.filter((a) => a.priority === selectedPriority);
    }

    // --- DATE RANGE FILTER (Raised On) ---
    if (fromDate || toDate) {
      data = data.filter((alert) => {
        // Extract date from the raisedOn field - handle case where it might be "—" or invalid
        if (alert.raisedOn === "—") return true;

        let alertDate;
        try {
          // Parse the date - handle both locale string and ISO string formats
          alertDate = new Date(alert.raisedOn.split(",")[0]); // Extract date part from locale string
          // If the date is invalid, try parsing the full string
          if (isNaN(alertDate)) {
            alertDate = new Date(alert.raisedOn);
          }
          // If still invalid, skip this alert
          if (isNaN(alertDate)) return true;
        } catch (e) {
          return true;
        }

        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;

        if (from && to) {
          return alertDate >= from && alertDate <= to;
        }
        if (from) return alertDate >= from;
        if (to) return alertDate <= to;
        return true;
      });
    }

    // --- SORT ALERT ID ---
    if (alertIdSortOrder === "asc") {
      data.sort((a, b) => a.alertId - b.alertId);
    }
    if (alertIdSortOrder === "desc") {
      data.sort((a, b) => b.alertId - a.alertId);
    }
    // --- SORT BY RAISED ON DATE ---

    if (raisedOnSortOrder) {
      data.sort((a, b) => {
        if (a.raisedOnRaw == null && b.raisedOnRaw == null) return 0;
        if (a.raisedOnRaw == null) return 1;
        if (b.raisedOnRaw == null) return -1;

        return raisedOnSortOrder === "asc"
          ? a.raisedOnRaw - b.raisedOnRaw // oldest first
          : b.raisedOnRaw - a.raisedOnRaw; // newest first
      });
    }

    setFilteredAlerts(data);
  }, [
    alerts,
    searchTerm,
    selectedDeviceType,
    selectedPriority,
    fromDate,
    toDate,
    alertIdSortOrder,
    raisedOnSortOrder, // 👈 MUST be here
    selectedClient,
    selectedLocation,
  ]);

  useEffect(() => {
    const newTotal = Math.max(
      1,
      Math.ceil(filteredAlerts.length / itemsPerPage),
    );
    setCurrentPage((p) => Math.min(p, newTotal));

    setCheckedState((prev) => {
      const needed = filteredAlerts.length;
      if (prev.length === needed) return prev;
      const next = new Array(needed).fill(false);
      for (let i = 0; i < Math.min(prev.length, needed); i++) next[i] = prev[i];
      return next;
    });
  }, [filteredAlerts.length, itemsPerPage]);

  useEffect(
    () => setCurrentPage(1),
    [searchTerm, selectedAlertType, selectedStatus, selectedDeviceType],
  );

  /* ------------------------------------------------------------------ *
   *  CHECKBOX LOGIC
   * ------------------------------------------------------------------ */
  const toggleHeader = () => {
    const newVal = !isHeaderChecked;
    setCheckedState(new Array(filteredAlerts.length).fill(newVal));
    setIsHeaderChecked(newVal);
  };

  const toggleRow = (globalIdx) => {
    setCheckedState((prev) => {
      const next = [...prev];
      next[globalIdx] = !next[globalIdx];
      setIsHeaderChecked(next.length > 0 && next.every(Boolean));
      return next;
    });
  };

  /* ------------------------------------------------------------------ *
   *  EXPORT / DOWNLOAD
   *  Exports selected alerts (if any) otherwise all filtered alerts as CSV
   * ------------------------------------------------------------------ */
  const exportAlerts = () => {
    // Use selected rows if any checkbox is checked, otherwise export all filtered alerts
    const selectedIndices = checkedState
      .map((v, i) => (v ? i : -1))
      .filter((i) => i >= 0);

    const rows = selectedIndices.length
      ? selectedIndices.map((i) => filteredAlerts[i]).filter(Boolean)
      : filteredAlerts;

    if (!rows || rows.length === 0) {
      // friendly feedback
      alert("No alerts to export.");
      return;
    }


    const headers = [
      "Client name",
      "Device Type",
      "DID",
      "Location",
      "Description",
      "Assign To",
      "Priority",
      "Raised On",
      "Status",
    ];

    const csvRows = [headers.join(",")];

    rows.forEach((r) => {
      const values = [
        r.alertId,
        r.deviceType,
        r.did,
        r.location,
        r.alertDescription,
        r.assignTo,
        r.priority,
        r.raisedOn,
        r.status,
      ];

      const escaped = values
        .map((v) => {
          const s = v == null ? "" : String(v);
          return '"' + s.replace(/"/g, '""') + '"';
        })
        .join(",");

      csvRows.push(escaped);
    });

    const csvString = csvRows.join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    a.download = `alerts_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ------------------------------------------------------------------ *
   *  PAGINATION HELPERS
   * ------------------------------------------------------------------ */
  const changeItemsPerPage = (v) => {
    const n = Number(v) || 5;
    setItemsPerPage(n);
    setCurrentPage(1);
  };
  const goFirst = () => setCurrentPage(1);
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setCurrentPage(totalPages);

  const paginated = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="component-body" data-theme={isDarkMode ? "dark" : "light"}>
      {/* Debug Panel - Remove this after troubleshooting */}

      {/* Loading Overlay */}
      {loading && (
        <div
          className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center ${
            isDarkMode ? "bg-black/50" : "bg-white/40"
          }`}
        >
          <div
            className={`p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 ${
              isDarkMode ? "bg-gray-800" : "bg-white border border-gray-300"
            }`}
          >
            <div className="relative w-20 h-20">
              <div
                className={`absolute inset-0 border-4 rounded-full ${
                  isDarkMode ? "border-blue-500/30" : "border-blue-400/30"
                }`}
              ></div>
              <div
                className={`absolute inset-0 border-4 border-transparent rounded-full animate-spin ${
                  isDarkMode ? "border-t-blue-500" : "border-t-blue-600"
                }`}
              ></div>
              <div
                className={`absolute inset-2 border-4 border-transparent rounded-full animate-spin ${
                  isDarkMode ? "border-t-purple-500" : "border-t-purple-600"
                }`}
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1s",
                }}
              ></div>
            </div>
            <div
              className={`text-lg font-medium ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Loading Alerts...
            </div>
            <div
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Please wait while we fetch the data
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER: Alerts Title + Alerts Logs Button (Top-Right Corner) */}
      <div
        className="flex justify-between items-start w-full mb-1"
        style={{ marginLeft: "-9px" }}
      >
        <h1 className="page-header select-none">Alerts</h1>

        {/* Alerts Logs Button - Perfect Top-Right Position */}
        <button
          onClick={() => navigate("/alerts-log")}
          className="flex items-center gap-2.5 rounded-full shadow-lg hover:shadow-xl"
          style={{
            backgroundColor: "#76df23",
            color: "black",
            padding: "10px 16px",
            fontSize: "14px",
            border: "1px solid #76df23",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Alerts Logs
        </button>
      </div>

      {/* ==== DEVICE CARDS (React Icons) ====
        <div className="grid w-full card-container">
          {deviceCards.length > 0 ? (
            deviceCards.map((c, i) => {
              const isSelected = selectedDeviceType && selectedDeviceType.toLowerCase() === c.label.toLowerCase();
              return (
                <div 
                  key={i} 
                  className={`alert-card select-none cursor-pointer transition-all hover:scale-105 ${
                    isSelected ? 'ring-4 ring-blue-400 shadow-lg shadow-blue-500/50' : ''
                  }`}
                  onClick={() => {
                    if (selectedDeviceType === c.label) {
                      setSelectedDeviceType("");
                    } else {
                      setSelectedDeviceType(c.label);
                    }
                  }}
                  title={`Click to filter by ${c.label}`}
                >
                  <div className="pl-3">
                    <div
                      className={`circle-dimension ${c.bg}`}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "50%",
                      }}
                    >
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
              No device alerts data available.
            </div>
          )}
        </div> */}

      {/* ==== TABLE HEADER ==== */}

      {/* ==== FILTERS ==== */}
      {/* ==== FILTERS (Client → Location → Other Filters) ==== */}
      <div
        className="selection-filter"
        style={{
          marginBottom: "-40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Client Dropdown - Native Select */}
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="selection-item pr-10 text-sm"
        >
          <option value="">All Clients</option>
          {clients &&
            clients.map((c) => (
              <option key={c.clientId || c.id} value={c.clientId || c.id}>
                {c.clientName || c.name}
              </option>
            ))}
        </select>

        {/* Location Dropdown - Native Select */}
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="selection-item pr-10 text-sm"
          disabled={locationsLoading}
        >
          <option value="">
            {locationsLoading ? "⏳ Loading locations..." : "All Locations"}
          </option>
          {!locationsLoading &&
            locations &&
            locations.map((l) => (
              <option key={l.loc_id || l.id} value={l.loc_id || l.id}>
                {l.loc_name || l.name}
              </option>
            ))}
        </select>

        {/* Search */}
        <div className="flex items-center relative">
          <input
            type="text"
            placeholder="Search DID, Location or Description"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="selection-item pr-10 text-sm"
          />
          <IoSearchOutline className="absolute w-5 h-5 right-3 text-white opacity-50 pointer-events-none" />
        </div>

        {/* Alert Type Dropdown - Native Select */}
        <select
          value={selectedAlertType}
          onChange={(e) => setSelectedAlertType(e.target.value)}
          className="selection-item pr-10 text-sm"
        >
          <option value="">All Alert Types</option>
          <option value="manual_override">Info alert</option>
          <option value="device_offline">System alert</option>
          <option value="energy_spike">Electrical alert</option>
        </select>

        {/* Status Dropdown - Native Select */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="selection-item pr-10 text-sm"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        {/* From Date */}
        {/* <input
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
      className="selection-item text-sm"
    /> */}

        {/* To Date */}
        {/* <input
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
      min={fromDate}
      className="selection-item text-sm"
    /> */}

        {/* Priority Filter */}
       <select
  value={selectedPriority}
  onChange={(e) => setSelectedPriority(e.target.value)}
className="pr-10 text-xsm"
style={{
  color: '#000000',                 // ✅ black text
  padding: '10px 20px',
  backgroundColor: '#ffffff',        // ✅ fixed camelCase
  border: '1px solid #475569',
  width: '100%',
  borderRadius: '9999px',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
}}

>
  <option value="" style={{ color: "#000" }}>All Priorities</option>
  <option value="low" style={{ color: "#000" }}>Low</option>
  <option value="medium" style={{ color: "#000" }}>Medium</option>
  <option value="high" style={{ color: "#000" }}>High</option>
  <option value="critical" style={{ color: "#000" }}>Critical</option>
</select>

        {/* Clear All Filters Button */}
        {(searchTerm ||
          selectedAlertType ||
          selectedStatus ||
          selectedClient ||
          selectedLocation ||
          fromDate ||
          toDate ||
          selectedDeviceType ||
          selectedPriority ||
          alertIdSortOrder) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedAlertType("");
              setSelectedStatus("");
              setSelectedClient("");
              setSelectedLocation("");
              setFromDate("");
              setToDate("");
              setSelectedDeviceType("");
              setSelectedPriority("");
              setAlertIdSortOrder("");
            }}
            className="clear-filter-button px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
            title="Clear all filters"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ==== ALERT COUNT ==== */}
      <div
        className="alerts-header-row"
        style={{
          margin: "16px 0 8px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontWeight: 500,
            fontSize: "1.1rem",
            color: isDarkMode ? "#fff" : "#222",
          }}
        >
          Showing {filteredAlerts.length} alert
          {filteredAlerts.length === 1 ? "" : "s"}
        </div>

        {filteredAlerts.length > 0 && (
          <button
            onClick={exportAlerts}
            title="Download alerts"
            className="download-icon-btn"
          >
            <FiDownload size={24} />
          </button>
        )}
      </div>

      {/* ==== TABLE ==== */}
      <div
        className="alert-table-container hide-scrollbar  center-table"
        style={{
          width: "100%",
          maxWidth: "100%",
          marginTop: "-20px",
          overflowX: "auto",
          overflowY: "visible",
        }}
      >
        {paginated.length === 0 ? (
          <div className="text-center p-10 text-gray-400">
            <div className="text-xl mb-2">📊 No alerts found</div>
            <div className="text-sm">
              Try adjusting your filters or selecting a different
              client/location
            </div>
          </div>
        ) : (
          <>
            {/* Sticky Table Header */}
            <div
              style={{
                width: "100%",
                minWidth: "1200px",
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: "#0f172b",
              }}
            >
              <table
                classname="hide-scrollbar"
                style={{ width: "100%", tableLayout: "fixed" }}
              >
                <thead className="bg-[#0f172b] h-10 w-full">
                  <tr>
                    <th className="alert-table-header">Client</th>
                    <th className="alert-table-header">Location</th>
                    <th
                      className="alert-table-header"
                      style={{
                        minWidth: "180px",
                        maxWidth: "240px",
                        width: "200px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Alert Type
                    </th>
                    <th className="alert-table-header">Device Type</th>
                    <th className="alert-table-header">Description</th>
                    <th
                      className="alert-table-header cursor-pointer select-none"
                      onClick={() => {
                        setRaisedOnSortOrder((prev) =>
                          prev === "desc" ? "asc" : "desc",
                        );
                        setCurrentPage(1); // reset pagination on sort
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Raised On
                        {raisedOnSortOrder === "desc" && (
                          <IoIosArrowDown size={14} />
                        )}
                        {raisedOnSortOrder === "asc" && (
                          <IoIosArrowUp size={14} />
                        )}
                      </div>
                    </th>

                    <th className="alert-table-header">Priority</th>
                    <th className="alert-table-header">Status</th>
                    <th className="alert-table-header">Assign To</th>
                    {/* <th className="alert-table-header">Due Days</th> */}
                    {/* <th className="alert-table-header">Closed On</th> */}
                  </tr>
                </thead>
              </table>
            </div>
            {/* Scrollable Table Body */}
            <div
              className="overflow-x-auto  hide-scrollbar"
              style={{
                width: "100%",
                minWidth: "100%",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              <table
                className="alert-table-body rounded-xl"
                style={{
                  width: "100%",
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                <tbody>
                  {paginated.length ? (
                    paginated.map((a, i) => {
                      const gIdx = getGlobalIndex(i);
                      const checked = !!checkedState[gIdx];
                      return (
                        <tr
                          key={a.alertId}
                          className="alert-table-row cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 transition"
                          onClick={() =>
                            navigate(`/alerts/${a.alertId}`, {
                              state: { alert: a },
                            })
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td className="alert-table-cell">
                            {/* <input
                                type="checkbox"
                                className="m-2"
                                checked={checked}
                                onChange={() => toggleRow(gIdx)}
                                aria-label={`select ${a.alertId}`}
                              /> */}
                            {a.clientName}
                          </td>
                          <td className="alert-table-cell">{a.location}</td>
                          <td
                            className="alert-table-cell"
                            style={{
                              minWidth: "180px",
                              maxWidth: "240px",
                              width: "200px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {a.alertType}
                          </td>
                          <td className="alert-table-cell">{a.deviceType}</td>
                          <td className="alert-table-cell one-line-text">
                            {a.alertTitle}
                          </td>
                          <td className="alert-table-cell">{a.raisedOn}</td>
                          <td className="alert-table-cell ">
                            <span
                              className={`px-2 py-2 rounded-full text-m font-medium ${
                                a.priority === "critical"
                                  ? "bg-red-500 text-white"
                                  : a.priority === "high"
                                    ? "bg-orange-500 text-white"
                                    : a.priority === "medium"
                                      ? "bg-yellow-500 text-white"
                                      : "bg-gray-500 text-white"
                              }`}
                              style={{
                                whiteSpace: "nowrap",
                                minWidth: 80,
                                display: "inline-block",
                                textAlign: "center",
                                color: "#fff",
                              }}
                            >
                              {a.priority}
                            </span>
                          </td>

                          <td className="alert-table-cell">
                            <AlertStatusBadge status={a.status} />
                          </td>
                          <td className="alert-table-cell">{a.assignTo}</td>
                          {/* <td className="alert-table-cell">{a.dueDays}</td> */}
                          {/* <td className="alert-table-cell">{a.closedOn}</td> */}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center text-gray-400 py-6"
                      >
                        No alerts match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* ==== PAGINATION ==== */}
                <tfoot className="alert-table-footer border-spacing-x-5 border-spacing-y-2 select-none">
                  <tr>
                    <td colSpan="9" className="p-4">
                      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 w-full">
                        <div className="flex items-center gap-2 text-white">
                          <label htmlFor="itemsPerPage">Items/page:</label>
                          <select
                            id="itemsPerPage"
                            className="bg-[#0f172b] border border-gray-600 rounded px-2 py-1"
                            value={itemsPerPage}
                            onChange={(e) => changeItemsPerPage(e.target.value)}
                            style={{ position: "relative", zIndex: 2000 }}
                          >
                            {[5, 10, 25, 50].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="text-white">
                          Page {currentPage} of {totalPages}
                        </div>

                        <div className="flex items-center gap-2 text-white">
                          <button
                            onClick={goFirst}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                            title="First"
                          >
                            <TfiControlSkipBackward />
                          </button>
                          <button
                            onClick={goPrev}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                            title="Prev"
                          >
                            <IoIosArrowBack />
                          </button>
                          <button
                            onClick={goNext}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                            title="Next"
                          >
                            <IoIosArrowForward />
                          </button>
                          <button
                            onClick={goLast}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                            title="Last"
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
          </>
        )}
      </div>
    </div>
  );
};

export default Alert;
