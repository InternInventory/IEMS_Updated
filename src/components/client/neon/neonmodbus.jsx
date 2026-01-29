// --- Relay ON/OFF Info Helpers (above component) ---
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
library.add(faInfoCircle);

// Helper: Extract relay ON/OFF intervals and counts from daily data
function getRelayIntervals(data) {
  if (!Array.isArray(data) || data.length === 0) return { intervals: [], onCount: 0, offCount: 0 };
  let intervals = [];
  let prevState = null;
  let startTime = null;
  let onCount = 0;
  let offCount = 0;
  data.forEach((item, idx) => {
    const relay = item.relay;
    const time = item.time || item.time_bucket || item.period;
    if (relay !== prevState) {
      if (prevState !== null) {
        intervals.push({
          state: prevState === 1 ? 'ON' : 'OFF',
          start: startTime,
          end: time,
        });
        if (prevState === 1) onCount++;
        else offCount++;
      }
      startTime = time;
      prevState = relay;
    }
    // Last item
    if (idx === data.length - 1 && prevState !== null) {
      intervals.push({
        state: relay === 1 ? 'ON' : 'OFF',
        start: startTime,
        end: time,
      });
      if (relay === 1) onCount++;
      else offCount++;
    }
  });
  return { intervals, onCount, offCount };
}

// Component: RelayIntervalsList
function RelayIntervalsList({ dailyData }) {
  const { intervals, onCount, offCount } = getRelayIntervals(dailyData || []);
  if (!intervals.length) return <div className="text-sm text-gray-400">No relay data available for this day.</div>;
  return (
    <div>
      <div className="mb-2 text-sm">
        <span className="font-semibold text-green-600">ON count:</span> {onCount} &nbsp;|&nbsp;
        <span className="font-semibold text-red-600">OFF count:</span> {offCount}
      </div>
      <ul className="max-h-48 overflow-y-auto text-sm space-y-1">
        {intervals.map((iv, i) => (
          <li key={i}>
            <span className={iv.state === 'ON' ? 'text-green-500' : 'text-red-500'}>
              {iv.state}
            </span>
            : {iv.start} &rarr; {iv.end}
          </li>
        ))}
      </ul>
    </div>
  );
}
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Minus,
  Plus,
  Snowflake,
  Wind,
  Thermometer,
  User,
  Droplets,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceDot,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import useAuthFetch from "../../hooks/useAuthFetch";
import { useTheme } from "../../../context/ThemeContext";
import moment from "moment-timezone";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSlidersH, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import debounce from "lodash.debounce";
import * as XLSX from "xlsx";

// ────────────────────── SUMMARY CARDS COMPONENT ──────────────────────
const SummaryCards = ({ consumption, baseline, saved, active, inactive, unit = 'kWh', isDark = true }) => {
  return (
    <div className="mt-3 space-y-2">
      {/* Row 1: Consumption, Baseline, Saved - 3 cards in one row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {[
          { label: 'Consumption', value: consumption, color: '#FB923C' },
          { label: 'Baseline', value: baseline, color: '#60A5FA' },
          { label: 'Saved', value: saved, color: parseFloat(saved) >= 0 ? '#34D399' : '#EF4444' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: isDark 
                ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))'
                : 'linear-gradient(180deg, rgba(243,244,246,0.95), rgba(229,231,235,0.9))',
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className={`text-xs truncate mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
            <div
              className="font-semibold"
              style={{
                fontSize: '1rem',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                color: item.label === 'Saved' ? (parseFloat(saved) >= 0 ? '#34D399' : '#EF4444') : (isDark ? '#ffffff' : '#111827')
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Active, Inactive - 2 cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
        }}
      >
        {[
          { label: 'Active', value: active, color: '#10B981' },
          { label: 'Inactive', value: inactive, color: '#9CA3AF' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: isDark 
                ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))'
                : 'linear-gradient(180deg, rgba(243,244,246,0.95), rgba(229,231,235,0.9))',
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className={`text-xs truncate mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
            <div
              className="font-semibold"
              style={{
                fontSize: '1.15rem',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                color: isDark ? '#ffffff' : '#111827'
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────── INTERVAL OPTIONS ──────────────────────
const INTERVAL_OPTIONS = [
  { label: "1 min", value: "1" },
  { label: "2 min", value: "2" },
  { label: "5 min", value: "5" },
  { label: "10 min", value: "10" },
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
];

const Neonmodbus = () => {
  // State for relay info popup
  const [showRelayInfo, setShowRelayInfo] = useState(false);
  // Store the raw temperature data for the day (for relay info)
  const [rawTemperatureData, setRawTemperatureData] = useState([]);
  // Memoized daily relay data for popup
  const relayDailyData = useMemo(() => {
    if (temperatureTimeframe !== 'daily' || !Array.isArray(rawTemperatureData)) return [];
    return rawTemperatureData;
  }, [temperatureTimeframe, rawTemperatureData]);
  const { did } = useParams();
  const decodedDid = decodeURIComponent(did || "");
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();

  // ───── STATE ─────
  const [neonData, setNeonData] = useState(null);
  const [previousNeonData, setPreviousNeonData] = useState(null);
  const [topic, setTopic] = useState("");
  const [responseTopic, setResponseTopic] = useState("");
  const [setFreq, setSetFreq] = useState(50);
  const [mode, setMode] = useState("auto");
  const [isModbusOn, setIsModbusOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [pendingCommand, setPendingCommandInternal] = useState(null);
  const pendingCommandRef = useRef(null);
  
  // Wrapper to track when pendingCommand is set/cleared
  const setPendingCommand = (value) => {
    if (value) {
      console.log('🔄 Setting pendingCommand:', value);
    } else {
      console.log('🧹 Clearing pendingCommand from:', new Error().stack.split('\n')[2]);
    }
    setPendingCommandInternal(value);
    pendingCommandRef.current = value;
  };
  
  const [commandTimeout, setCommandTimeoutInternal] = useState(null);
  const commandTimeoutRef = useRef(null);
  
  const setCommandTimeout = (value) => {
    setCommandTimeoutInternal(value);
    commandTimeoutRef.current = value;
  };
  
  const [statusMessage, setStatusMessage] = useState(null);
  const [messageTimeout, setMessageTimeout] = useState(null);
  const [timeoutCounter, setTimeoutCounter] = useState(0);
  const lastUpdate = neonData?.created_at ?? neonData?.TIME;

  const [modbusSettings, setModbusSettings] = useState({
    OMA: "",
    FMA: "",
    TMV: "",
    FMV: "",
    FREQ: "",
    FREQOFFSET: "",
    rMan_M: "OFF",
    AUTO_M: "OFF",
    SMACTION: "OFF",
    rManINT_M: "5",
    MXT: 70,
    MNT: 30,
    MS: "OFF",
    TS: "OFF",
  });

  // ───── POWER STATE ─────
  const [powerData, setPowerData] = useState([]);
  const [powerLoading, setPowerLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD")
  );

  // ───── NEW ANALYTICS STATE ─────
  const [carbonTimeframe, setCarbonTimeframe] = useState("monthly");
  const [carbonData, setCarbonData] = useState([]);
  const [carbonLoading, setCarbonLoading] = useState(true);

  const [powerSavingData, setPowerSavingData] = useState([]);
  const [powerSavingLoading, setPowerSavingLoading] = useState(true);
  const [powerSavingTimeframe, setPowerSavingTimeframe] = useState("monthly");

  const [workingHoursData, setWorkingHoursData] = useState([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(true);
  const [workingHoursTimeframe, setWorkingHoursTimeframe] = useState("monthly");
  const [temperatureData, setTemperatureData] = useState([]);
  const [temperatureLoading, setTemperatureLoading] = useState(true);
  const [temperatureTimeframe, setTemperatureTimeframe] = useState("monthly");

  // Organization access control - hide graphs for org_id 149
  const [hideGraphs, setHideGraphs] = useState(false);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Mark component as mounted on first render
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Baseline Modal
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [baselineInput, setBaselineInput] = useState("");
  const [baselineStatus, setBaselineStatus] = useState("idle");
  const [baseline, setBaseline] = useState(null);
  const [modalBaseline, setModalBaseline] = useState(null);
  const encodedDid = encodeURIComponent(decodedDid);
  let isOnline = false;
    if (lastUpdate) {
      const lastIST = moment.tz(lastUpdate, "UTC").tz("Asia/Kolkata");
      const nowIST = moment.tz("Asia/Kolkata");
      const minutesAgo = nowIST.diff(lastIST, "minutes");
      isOnline = minutesAgo <= 2;
    }

  // ───── DERIVED VALUES ─────
  const curTemp = neonData?.temp ? Number(neonData.temp) : 0;
  const motionActive = neonData?.motion === "ON";
  const isCooling = isModbusOn && curTemp > setFreq;
  const mxt = Number(neonData?.MXT ?? 70);
  const mnt = Number(neonData?.MNT ?? 30);

  // Check if user belongs to org_id 149 and hide graphs
  useEffect(() => {
    const checkOrgAccess = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        // First check localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
            console.log('🚫 Organization ID 149 detected - hiding all graphs (Neonmodbus)');
            setHideGraphs(true);
            return;
          }
        }
        
        // Also check from API as backup
        const response = await authFetch({
          url: `${apiURL}/userDetails`,
          method: 'GET'
        });
        
        if (response?.org_id && Array.isArray(response.org_id) && response.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected from API - hiding all graphs (Neonmodbus)');
          setHideGraphs(true);
        }
      } catch (error) {
        console.error('Error checking org access:', error);
      }
    };
    
    checkOrgAccess();
  }, [authFetch]);

  // Extract humidity from BiBug[0]
  const humidity = Number(neonData?.BiBug?.[0]?.Hum ?? null);

  // HUMIDITY COLOR LOGIC
  let humidityColor = "#9CA3AF"; // default grey

  if (humidity !== null && !isNaN(humidity)) {
    if (humidity < 30) {
      humidityColor = "#60A5FA"; // Too dry → blue
    } else if (humidity >= 30 && humidity <= 60) {
      humidityColor = "#22C55E"; // Comfort zone → green
    } else if (humidity > 60 && humidity <= 75) {
      humidityColor = "#FACC15"; // Getting humid → yellow
    } else {
      humidityColor = "#EF4444"; // Too humid → red
    }
  }

  // TEMPERATURE COLOR LOGIC
  let tempColor = "#9CA3AF"; // default grey

  if (!isNaN(curTemp)) {
    if (curTemp >= mxt) {
      tempColor = "#EF4444"; // Too hot
    } else if (curTemp <= mnt) {
      tempColor = "#22C55E"; // Cold
    } else {
      tempColor = "#FACC15"; // Normal
    }
  }
 /* ─────────────── UPGRADED EXPORT TO EXCEL (with colors & structure) ─────────────── */
 const exportToExcel = (
   powerData,
   workingHoursData,
   powerSavingData,
   carbonData,
   temperatureData,
   deviceName
 ) => {
   try {
     if (
       !powerData.length &&
       !workingHoursData.length &&
       !powerSavingData.length &&
       !carbonData.length &&
       !temperatureData.length
     ) {
       alert("No data available to export!");
       return;
     }
   
       const wb = XLSX.utils.book_new();
   
       // Helper to add styled header row
       const addStyledHeader = (ws, headers, bgColor) => {
         const headerCells = headers.map((h, i) => ({
           v: h,
           t: "s",
           s: {
             font: { bold: true, color: { rgb: "FFFFFFFF" } },
             fill: { fgColor: { rgb: bgColor } },
             alignment: { horizontal: "center", vertical: "center" },
           },
         }));
         XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
         // Apply style to first row
         const range = XLSX.utils.decode_range(ws["!ref"]);
         for (let C = range.s.c; C <= range.e.c; ++C) {
           const addr = XLSX.utils.encode_cell({ r: 0, c: C });
           if (!ws[addr]) ws[addr] = { v: headers[C] };
           ws[addr].s = {
             font: { bold: true, color: { rgb: "FFFFFFFF" } },
             fill: { fgColor: { rgb: bgColor } },
             alignment: { horizontal: "center", vertical: "center" },
           };
         }
       };
   
       // 1. Power Consumption Sheet
       if (powerData.length > 0) {
         const powerFormatted = powerData.map((d) => ({
           Time: d.time,
           "Red Phase (kWh)": Number(d.R ?? 0).toFixed(3),
           "Yellow Phase (kWh)": Number(d.Y ?? 0).toFixed(3),
           "Blue Phase (kWh)": Number(d.B ?? 0).toFixed(3),
           "Total (kWh)": Number((d.R ?? 0) + (d.Y ?? 0) + (d.B ?? 0)).toFixed(3),
         }));
         const ws1 = XLSX.utils.json_to_sheet(powerFormatted);
         addStyledHeader(ws1, Object.keys(powerFormatted[0]), "FF22C55E"); // Green
         ws1["!cols"] = [
           { wch: 16 },
           { wch: 18 },
           { wch: 18 },
           { wch: 18 },
           { wch: 18 },
         ];
         ws1["!rows"] = [{ h: 28 }];
         ws1["!freezes"] = { x: 0, y: 1 }; // Freeze header
         XLSX.utils.book_append_sheet(wb, ws1, "Power Consumption");
       }
   
       // 2. Hourly Usage Sheet
       if (workingHoursData.length > 0) {
         const hoursFormatted = workingHoursData.map((d) => ({
           Time: d.time,
           "Consumption (kWh)": Number(d.consumption ?? 0).toFixed(3),
           "Running Hours": Number(d.hours ?? 0).toFixed(1),
         }));
         const ws2 = XLSX.utils.json_to_sheet(hoursFormatted);
         addStyledHeader(ws2, Object.keys(hoursFormatted[0]), "FFF97316"); // Orange
         ws2["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 18 }];
         ws2["!rows"] = [{ h: 28 }];
         XLSX.utils.book_append_sheet(wb, ws2, "Hourly Usage");
       }
   
       // 3. Power Savings Sheet
       if (powerSavingData.length > 0) {
         const savingsFormatted = powerSavingData.map((d) => ({
           Time: d.time,
           "Power Used (kWh)": Number(d.used ?? 0).toFixed(3),
           "Power Saved (kWh)": Number(d.saved ?? 0).toFixed(3),
           "Total (kWh)": Number(d.total ?? 0).toFixed(3),
         }));
         const ws3 = XLSX.utils.json_to_sheet(savingsFormatted);
         addStyledHeader(ws3, Object.keys(savingsFormatted[0]), "FF0891B2"); // Cyan
         ws3["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];
         ws3["!rows"] = [{ h: 28 }];
         XLSX.utils.book_append_sheet(wb, ws3, "Power Savings");
       }
   
       // 4. Carbon Footprint Sheet
       if (carbonData.length > 0) {
         const carbonFormatted = carbonData.map((d) => ({
           Time: d.time,
           "Carbon Footprint (kg CO₂)": Number(d.actual ?? 0).toFixed(3),
           "Carbon Saved (kg CO₂)": Number(d.saved ?? 0).toFixed(3),
         }));
         const ws4 = XLSX.utils.json_to_sheet(carbonFormatted);
         addStyledHeader(ws4, Object.keys(carbonFormatted[0]), "FF6366F1"); // Indigo
         ws4["!cols"] = [{ wch: 16 }, { wch: 26 }, { wch: 24 }];
         ws4["!rows"] = [{ h: 28 }];
         XLSX.utils.book_append_sheet(wb, ws4, "Carbon Footprint");
       }
 
       // 5. Temperature Trend Sheet
       if (temperatureData.length > 0) {
         const tempFormatted = temperatureData.map((d) => ({
           Time: d.time,
           "Temperature (°C)": Number(d.temperature ?? 0).toFixed(2),
         }));
         const ws5 = XLSX.utils.json_to_sheet(tempFormatted);
         addStyledHeader(ws5, Object.keys(tempFormatted[0]), "FFEF4444"); // Red
         ws5["!cols"] = [{ wch: 16 }, { wch: 22 }];
         ws5["!rows"] = [{ h: 28 }];
         XLSX.utils.book_append_sheet(wb, ws5, "Temperature Trend");
       }
   
       // Optional: Add a Summary Sheet
       const summaryData = [
         { Metric: "Device Name", Value: deviceName || "NeonIR Device" },
         { Metric: "Export Date", Value: moment().format("DD MMM YYYY, hh:mm A") },
         {
           Metric: "Total Power Consumed",
            Value:
              powerData.length > 0
                ? `${powerData
                    .reduce((s, d) => s + (d.R || 0) + (d.Y || 0) + (d.B || 0), 0)
                    .toFixed(3)} kWh`
                : "N/A",
         },
         {
         Metric: "Total Power Saved",
         Value:
           powerSavingData.length > 0
             ? `${powerSavingData
                 .reduce((s, d) => s + (d.saved || 0), 0)
                 .toFixed(3)} kWh`
             : "N/A",
         },
         {
         Metric: "Total Carbon Saved",
         Value:
           carbonData.length > 0
             ? `${carbonData.reduce((s, d) => s + (d.saved || 0), 0).toFixed(3)} kg CO₂`
             : "N/A",
         },
         {
           Metric: "Baseline Temperature",
           Value: baseline != null ? `${baseline} °C` : "N/A",
         },
       ];
       const wsSummary = XLSX.utils.json_to_sheet(summaryData);
       addStyledHeader(wsSummary, ["Metric", "Value"], "FF1E293B");
       wsSummary["!cols"] = [{ wch: 30 }, { wch: 30 }];
       XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
   
       // Generate filename
       const fileName = `${deviceName || "NeonIR"}_Analytics_${moment().format(
         "YYYY-MM-DD_HHmm"
       )}.xlsx`;
   
       XLSX.writeFile(wb, fileName);
     } catch (error) {
       console.error("Error exporting to Excel:", error);
       alert("Failed to export data to Excel.");
     }
   };
 

  /* -------------------------------------------------
   Download Button Component (pure JSX – no TS)
   ------------------------------------------------- */
  const DownloadExcelButton = ({
    data,
    sheetName,
    fileName,
    label = "Download Excel",
  }) => {
    return (
      <button
        onClick={() => exportToExcel(data, sheetName, fileName)}
        className="flex items-center gap-2 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1 transition shadow-sm"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {label}
      </button>
    );
  };

  // Show status message with auto-dismiss
  const showStatusMessage = (message, type = "info") => {
    setStatusMessage({ message, type });
    if (messageTimeout) clearTimeout(messageTimeout);
    const timeout = setTimeout(() => {
      setStatusMessage(null);
      setMessageTimeout(null);
    }, 5000);
    setMessageTimeout(timeout);
  };

  // ───── DEBOUNCED SEND ─────
  const debouncedSend = useCallback(
    debounce((payload) => {
      if (topic) sendControlCommand(payload);
    }, 600),
    [topic]
  );

  /* ────────────────────── FETCH FUNCTIONS ────────────────────── */
  const fetchData = async () => {
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const url = `${apiURL}/location/neon-data/${decodedDid}`;
      const res = await authFetch({ url, method: "GET" });
      const data = res?.data || res;
      if (!data) throw new Error("Empty response");

      // Key fields to compare for detecting actual device state changes
      const currentStateKey = `${data.freq}-${data.modbus}-${data.MANMODBUS}-${data.AUTO_M}`;
      const previousStateKey = previousNeonData
        ? `${previousNeonData.freq}-${previousNeonData.modbus}-${previousNeonData.MANMODBUS}-${previousNeonData.AUTO_M}`
        : null;

      // Check if timestamp changed (new data received)
      const timestampChanged =
        !previousNeonData || data.created_at !== previousNeonData.created_at;

      const dataChanged = currentStateKey !== previousStateKey;

      // If there's a pending command and we got new data (timestamp changed), clear the timeout
      if (pendingCommand && commandTimeout && timestampChanged) {
        clearTimeout(commandTimeout);
        setCommandTimeout(null);
        setPendingCommand(null);
      }

      if (dataChanged) {
        // Extract Schedule to top level
        const normalizedData = {
          ...data,
          Schedule: data.Schedule || []
        };
        setNeonData(normalizedData);
        setPreviousNeonData(normalizedData);
        setSetFreq(Number(data.freq ?? 50));
        setTopic(data.topic ?? `Setting/${data.macid}`);
        
        // Extract response topic - only update if we have a valid macid
        const macid = data.MACID ?? data.macid;
        if (macid && !responseTopic) {
          const resTopicFromData = data.Response ?? data.response ?? `Response/${macid}`;
          setResponseTopic(resTopicFromData);
        }
        setIsModbusOn(data.modbus === 1);

        const autoOn = data.AUTO_M === "ON";
        const manOn = data.MANMODBUS === "ON";
        if (autoOn) setMode("auto"); // AUTO takes priority
        else if (manOn) setMode("manual-on");
        else setMode("manual-off");

        setModbusSettings({
          OMA: data.oma ?? data.OMA ?? "",
          FMA: data.fma ?? data.FMA ?? "",
          TMV: data.tmv ?? data.TMV ?? "",
          FMV: data.fmv ?? data.FMV ?? "",
          FREQ: data.freq ?? data.FREQ ?? "",
          FREQOFFSET: data.freqoffset ?? data.FREQOFFSET ?? "",
          rMan_M: data.rMan_M ?? "OFF",
          AUTO_M: data.AUTO_M ?? "OFF",
          SMACTION: data.SMACTION ?? "OFF",
          rManINT_M: data.rManINT_M ?? "5",
          MXT: data.MXT ?? 70,
          MNT: data.MNT ?? 30,
          MS: data.MS ?? "OFF",
          TS: data.TS ?? "OFF",
        });

        // Baseline
        const bl = data.baseline_set ?? data.BASELINE ?? null;
        setBaseline(bl);
        setModalBaseline(bl);
      } else {
        // Data hasn't changed, but update timestamp tracking
        if (timestampChanged) {
          setPreviousNeonData(data);
        }
        // Update neonData even if state unchanged (for other fields like current readings)
        // but only if there's no pending command
        if (!pendingCommand) {
          const normalizedData = {
            ...data,
            Schedule: data.Schedule || []
          };
          setNeonData(normalizedData);
        }
      }
    } catch (error) {
      console.error("Error fetching Neon Data:", error);
      setNeonData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper: parse hour number from various backend field shapes
  const parseHourFromItem = (item) => {
    if (item == null) return null;
    if (typeof item.hour === "number") return item.hour;
    if (typeof item.h === "number") return item.h;
    if (typeof item.hour === "string" && item.hour.match(/^\d+/))
      return parseInt(item.hour, 10);
    if (typeof item.time === "string") {
      const m = item.time.match(/^(\d{1,2})[:h]/);
      if (m) return parseInt(m[1], 10);
      const parts = item.time.split(":");
      if (parts.length) {
        const n = parseInt(parts[0], 10);
        if (!isNaN(n)) return n;
      }
    }
    if (typeof item.period === "string") {
      const m = item.period.match(/^(\d{1,2})[:h]/);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  };

  // Helper: Create 24-hour data structure with proper time extraction
  const create24HourData = (rawData, valueExtractor) => {
    return Array.from({ length: 24 }, (_, hour) => {
      const timeString = `${String(hour).padStart(2, "0")}:00`;
      let hourData = null;

      if (rawData && rawData.length > 0) {
        // Try to find data for this hour by checking time_bucket
        hourData = rawData.find((item) => {
          if (!item || !item.time_bucket) return false;

          try {
            const timestamp = item.time_bucket;
            const hourMatch = timestamp.match(/T(\d{2}):/);
            if (hourMatch) {
              const itemHour = parseInt(hourMatch[1]);
              return itemHour === hour;
            }
            return false;
          } catch (e) {
            console.error("Error parsing time_bucket:", item.time_bucket);
            return false;
          }
        });
      }

      return {
        time: timeString,
        label: timeString,
        ...valueExtractor(hourData),
      };
    });
  };

  // Improved formatXAxisLabel to handle different timeframes
  const formatXAxisLabel = (tf, value) => {
    if (tf === "daily") {
      return value; // HH:00 format
    }

    if (tf === "monthly") {
      // For monthly data, value should already be in "DD MMM" format
      // But handle cases where it might be in different formats
      try {
        if (moment(value, "DD MMM").isValid()) {
          return value; // Already in correct format
        }
        if (moment(value).isValid()) {
          return moment(value).format("DD MMM"); // Convert to "11 Nov" format
        }
      } catch (e) {
        console.warn("Error formatting monthly label:", value, e);
      }
      return value;
    }

    // For weekly and yearly
    try {
      if (tf === "weekly") {
        return moment(value).isValid() ? moment(value).format("DD MMM") : value;
      }
      if (tf === "yearly") {
        return moment(value).isValid() ? moment(value).format("YYYY") : value;
      }
    } catch (e) {
      console.warn("Error formatting label:", value, e);
    }

    return value;
  };

  // Improved getXAxisTicks for working hours daily data
  const getXAxisTicks = (tf, data, chartType = "power") => {
    if (tf === "daily") {
      if (chartType === "workingHours") {
        // For working hours daily, use the actual time labels from data
        if (data && data.length > 0) {
          return data.map((item) => item.time);
        }
        return Array.from(
          { length: 24 },
          (_, i) => `${String(i).padStart(2, "0")}:00`
        );
      }
      return Array.from(
        { length: 24 },
        (_, i) => `${String(i).padStart(2, "0")}:00`
      );
    }

    if (tf === "monthly" && data && data.length > 0) {
      return data.map((item) => item.time);
    }

    if (data && data.length > 0) {
      return data.map((item) => item.time);
    }

    return undefined;
  };

  // Improved tick formatter for working hours daily
  const getTickFormatter = (tf, data, chartType = "power") => {
    return (value) => {
      if (tf === "daily" && chartType === "workingHours") {
        // For working hours daily, show the actual time values
        return value;
      }

      if (tf === "daily") {
        const hour = parseInt(value.split(":")[0]);
        const hasData =
          data &&
          data.some(
            (item) =>
              item.time === value && (item.R > 0 || item.Y > 0 || item.B > 0)
          );
        if (hasData) {
          return hour % 2 === 0 ? value : "";
        }
        return hour % 6 === 0 ? value : "";
      }

      // For monthly data, always format to "DD MMM"
      if (tf === "monthly") {
        return formatXAxisLabel(tf, value);
      }

      // For other timeframes
      return formatXAxisLabel(tf, value);
    };
  };

  const fetchPowerData = async (tf, date) => {
    // Check if user org_id includes 149 - if so, don't show any graph data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected - hiding power graph data');
          setPowerData([]);
          setPowerLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    try {
      setPowerLoading(true);
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      let url = `${apiURL}/location/neon-power-data/${encodedDid}?timeframe=${tf}`;
      if (date && tf === "daily") url += `&date=${date}`;

      const res = await authFetch({ url, method: "GET" });
      const raw =
        res.data.success && Array.isArray(res.data.data) ? res.data.data : [];

      let transformedData;
      if (tf === "daily") {
        // For daily data, extract hour from time_bucket and create 24-hour structure
        const hourlyData = Array.from({ length: 24 }, (_, hour) => {
          const timeString = `${String(hour).padStart(2, "0")}:00`;

          // Find data for this hour by matching the hour from time_bucket
          const hourData = raw.find((item) => {
            if (!item || !item.time_bucket) return false;

            try {
              // Parse the ISO timestamp from time_bucket
              const timestamp = item.time_bucket;
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const itemHour = parseInt(hourMatch[1]);
                return itemHour === hour;
              }
              return false;
            } catch (e) {
              console.error("Error parsing time_bucket:", item.time_bucket);
              return false;
            }
          });

            return {
              time: timeString,
              label: timeString,
              R: hourData ? (hourData.R ?? hourData.wh_r ?? null) : null,
              Y: hourData ? (hourData.Y ?? hourData.wh_y ?? null) : null,
              B: hourData ? (hourData.B ?? hourData.wh_b ?? null) : null,
            };
        });

        transformedData = hourlyData;
      } else if (tf === "monthly") {
        // For monthly data, we expect multiple daily data points
        transformedData = raw.map((item) => {
          let label;
          let timeValue;

          if (item.time_bucket) {
            // Use time_bucket for accurate date formatting - show day and month
            const date = new Date(item.time_bucket);
            label = moment(date).format("DD MMM"); // e.g., "11 Nov"
            timeValue = moment(date).format("YYYY-MM-DD");
          } else if (item.time) {
            // Try to parse from time field if it contains date information
            const parsedDate = moment(item.time, [
              "DD MMM",
              "MMM YYYY",
              "YYYY-MM-DD",
            ]);
            if (parsedDate.isValid()) {
              label = parsedDate.format("DD MMM");
              timeValue = parsedDate.format("YYYY-MM-DD");
            } else {
              label = item.time;
              timeValue = item.time;
            }
          } else {
            label = "Unknown";
            timeValue = "Unknown";
          }

          return {
            time: timeValue,
            label: label,
            R: item.R ?? item.wh_r ?? 0,
            Y: item.Y ?? item.wh_y ?? 0,
            B: item.B ?? item.wh_b ?? 0,
          };
        });

        // Sort by date to ensure proper chronological order
        transformedData.sort(
          (a, b) => moment(a.time).valueOf() - moment(b.time).valueOf()
        );
      } else {
        // For weekly and yearly data
        transformedData = raw.map((item) => {
          let label;
          let timeValue;

          if (item.time_bucket) {
            const date = new Date(item.time_bucket);
            if (tf === "weekly") {
              label = moment(date).format("DD MMM");
              timeValue = moment(date).format("YYYY-MM-DD");
            } else if (tf === "yearly") {
              label = moment(date).format("MMM YYYY");
              timeValue = moment(date).format("YYYY-MM");
            } else {
              label = item.time || moment(date).format("DD MMM");
              timeValue = item.time || moment(date).format("YYYY-MM-DD");
            }
          } else {
            label = item.time || "Unknown";
            timeValue = item.time || "Unknown";
          }

          return {
            time: timeValue,
            label: label,
            R: item.R ?? item.wh_r ?? 0,
            Y: item.Y ?? item.wh_y ?? 0,
            B: item.B ?? item.wh_b ?? 0,
          };
        });
      }

      console.log(`Power Data (${tf}):`, transformedData);
      setPowerData(transformedData);
    } catch (error) {
      console.error("Error fetching power data:", error);
      setPowerData([]);
    } finally {
      setPowerLoading(false);
    }
  };

  const fetchPowerSavingData = async (tf, date) => {
    // Check if user org_id includes 149 - if so, don't show any graph data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected - hiding power saving graph data');
          setPowerSavingData([]);
          setPowerSavingLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    setPowerSavingLoading(true);
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      let url = `${apiURL}/neon-power-saving/${encodedDid}/${tf}`;
      if (date && tf === "daily") url += `?date=${date}`;

      const res = await authFetch({ url, method: "GET" });
      const raw =
        res?.data?.success && Array.isArray(res.data.data) ? res.data.data : [];

      let transformed;
      if (tf === "daily") {
        // For daily data, create 24-hour structure
        transformed = Array.from({ length: 24 }, (_, hour) => {
          const timeString = `${String(hour).padStart(2, "0")}:00`;

          // Find data for this hour
          const hourData = raw.find((item) => {
            if (!item || !item.hour) return false;

            try {
              const timestamp = item.hour;
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const itemHour = parseInt(hourMatch[1]);
                return itemHour === hour;
              }
              return false;
            } catch (e) {
              console.error("Error parsing hour:", item.hour);
              return false;
            }
          });

          const used = hourData ? hourData.total_consumption_kwh ?? 0 : 0;
          const saved = hourData ? hourData.power_saved_kwh ?? 0 : 0;

            return {
              time: timeString,
              label: timeString,
              saved: hourData ? parseFloat(saved.toFixed(3)) : null,
              used: hourData ? parseFloat(used.toFixed(3)) : null,
              total: hourData ? parseFloat((used + saved).toFixed(3)) : null,
            };
        });
      } else if (tf === "monthly") {
        // For monthly data, show daily breakdown
        transformed = raw.map((item) => {
          const used = item.total_consumption_kwh ?? 0;
          const saved = item.power_saved_kwh ?? 0;

          let label;
          if (item.day) {
            const date = new Date(item.day);
            label = moment(date).format("DD MMM"); // Show day and month
          } else {
            label = "Unknown";
          }

          return {
            label: label,
            time: label,
            saved: parseFloat(saved.toFixed(3)),
            used: parseFloat(used.toFixed(3)),
            total: parseFloat((used + saved).toFixed(3)),
          };
        });

        // Sort by date
        transformed.sort(
          (a, b) =>
            moment(a.time, "DD MMM").valueOf() -
            moment(b.time, "DD MMM").valueOf()
        );
      } else {
        // For weekly and yearly data
        transformed = raw.map((item) => {
          const used = item.total_consumption_kwh ?? item.used ?? 0;
          const saved = item.power_saved_kwh ?? item.saved ?? 0;

          let label;
          if (item.day || item.period) {
            const dateStr = item.day || item.period;
            const date = new Date(dateStr);
            if (tf === "weekly") {
              label = moment(date).format("DD MMM");
            } else if (tf === "yearly") {
              label = moment(date).format("MMM YYYY");
            } else {
              label = moment(date).format("DD MMM");
            }
          } else {
            label = "Unknown";
          }

          return {
            label: label,
            time: label,
            saved: parseFloat(saved.toFixed(3)),
            used: parseFloat(used.toFixed(3)),
            total: parseFloat((used + saved).toFixed(3)),
          };
        });
      }

      console.log(`Power Saving Data (${tf}):`, transformed);
      setPowerSavingData(transformed);
    } catch (error) {
      console.error("Error fetching power saving:", error);
      setPowerSavingData([]);
    } finally {
      setPowerSavingLoading(false);
    }
  };

  const fetchCarbonFootprint = async (tf, date) => {
    // Check if user org_id includes 149 - if so, don't show any graph data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected - hiding carbon footprint graph data');
          setCarbonData([]);
          setCarbonLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    setCarbonLoading(true);
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      let url = `${apiURL}/neon-carbon-footprint/${encodedDid}/${tf}`;
      if (date && tf === "daily") url += `?date=${date}`;

      const res = await authFetch({ url, method: "GET" });
      const raw =
        res?.data?.success && Array.isArray(res.data.data) ? res.data.data : [];

      let transformed;
      if (tf === "daily") {
        // For daily data, create 24-hour structure
        transformed = Array.from({ length: 24 }, (_, hour) => {
          const timeString = `${String(hour).padStart(2, "0")}:00`;

          // Find data for this hour
          const hourData = raw.find((item) => {
            if (!item || !item.hour) return false;

            try {
              const timestamp = item.hour;
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const itemHour = parseInt(hourMatch[1]);
                return itemHour === hour;
              }
              return false;
            } catch (e) {
              console.error("Error parsing hour:", item.hour);
              return false;
            }
          });

          return {
            time: timeString,
            label: timeString,
            actual: hourData
              ? (hourData.carbon_footprint_actual ?? hourData.carbon_saved ?? null)
              : null,
            saved: hourData ? (hourData.carbon_saved ?? null) : null,
            value: hourData ? (hourData.carbon_footprint_actual ?? null) : null,
          };
        });
      } else if (tf === "monthly") {
        // For monthly data, show daily breakdown
        transformed = raw.map((item) => {
          const kwh = item.total_consumption_kwh ?? 0;
          const carbonActual = item.carbon_footprint_actual ?? 0;
          const carbonSaved = item.carbon_saved ?? 0;

          let label;
          if (item.day) {
            const date = new Date(item.day);
            label = moment(date).format("DD MMM"); // Show day and month
          } else {
            label = "Unknown";
          }

          return {
            label: label,
            time: label,
            actual: parseFloat(carbonActual.toFixed(3)),
            saved: parseFloat(carbonSaved.toFixed(3)),
            value: parseFloat(carbonActual.toFixed(3)),
            consumption: parseFloat(kwh.toFixed(3)),
          };
        });

        // Sort by date
        transformed.sort(
          (a, b) =>
            moment(a.time, "DD MMM").valueOf() -
            moment(b.time, "DD MMM").valueOf()
        );
      } else {
        // For weekly and yearly data
        transformed = raw.map((item) => {
          const carbonActual = item.carbon_footprint_actual ?? item.value ?? 0;
          const carbonSaved = item.carbon_saved ?? 0;

          let label;
          if (item.day || item.period) {
            const dateStr = item.day || item.period;
            const date = new Date(dateStr);
            if (tf === "weekly") {
              label = moment(date).format("DD MMM");
            } else if (tf === "yearly") {
              label = moment(date).format("MMM YYYY");
            } else {
              label = moment(date).format("DD MMM");
            }
          } else {
            label = "Unknown";
          }

          return {
            label: label,
            time: label,
            actual: parseFloat(carbonActual.toFixed(3)),
            saved: parseFloat(carbonSaved.toFixed(3)),
            value: parseFloat(carbonActual.toFixed(3)),
          };
        });
      }

      console.log(`Carbon Data (${tf}):`, transformed);
      setCarbonData(transformed);
    } catch (err) {
      console.error("Carbon fetch error:", err);
      setCarbonData([]);
    } finally {
      setCarbonLoading(false);
    }
  };

  const fetchWorkingHours = async (tf, date) => {
    // Check if user org_id includes 149 - if so, don't show any graph data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected - hiding working hours graph data');
          setWorkingHoursData([]);
          setWorkingHoursLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    setWorkingHoursLoading(true);
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      let url = `${apiURL}/neon-get-working-hours/${encodedDid}/${tf}`;
      if (date && tf === "daily") url += `?date=${date}`;

      const res = await authFetch({ url, method: "GET" });

      if (!res.data.success || !Array.isArray(res.data.data)) {
        setWorkingHoursData([]);
        return;
      }

      const raw = res.data.data;

      let transformed;
      if (tf === "daily") {
        // Create 24-hour structure from 00:00 to 23:00
        transformed = Array.from({ length: 24 }, (_, hour) => {
          const timeString = `${String(hour).padStart(2, "0")}:00`;

          // Find data for this hour (match by hour only, ignore minutes)
          const hourData = raw.find((item) => {
            if (!item || !item.period) return false;

            try {
              const timestamp = item.period;
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const itemHour = parseInt(hourMatch[1]);
                return itemHour === hour;
              }
              return false;
            } catch (e) {
              console.error("Error parsing period:", item.period);
              return false;
            }
          });

          // Data is in Wh, extract active/inactive based on is_working flag
          const consumption = hourData ? Number(hourData.total_consumption_wh || 0) : 0;
          const isWorking = hourData ? Boolean(hourData.is_working) : false;

          return {
            time: timeString,
            label: timeString,
            consumption: consumption,
            active: isWorking ? 100 : 0,
            inactive: isWorking ? 0 : 100,
            hasData: !!hourData,
            originalTime: hourData ? new Date(hourData.period).toISOString() : null,
          };
        });

        console.log("Daily working hours data mapped:", {
          totalDataPoints: raw.length,
          hoursWithData: transformed
            .filter((d) => d.hasData)
            .map((d) => d.time),
          rawData: raw.map((item) => {
            const hourMatch = item.period.match(/T(\d{2}):/);
            const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
            return {
              period: item.period,
              hour: hour,
              consumption: item.total_consumption_wh,
              is_working: item.is_working,
            };
          }),
        });
      } else if (tf === "monthly") {
        // For monthly data, show daily consumption with active/inactive
        transformed = raw.map((item) => {
          const consumption = Number(item.total_consumption_wh || 0);
          const isWorking = Boolean(item.is_working);

          let label;
          if (item.period) {
            const date = new Date(item.period);
            label = moment(date).format("DD MMM");
          } else {
            label = "Unknown";
          }

          return {
            label: label,
            time: label,
            consumption: consumption,
            active: isWorking ? 100 : 0,
            inactive: isWorking ? 0 : 100,
          };
        });

        // If we only have one data point for monthly, it's likely the monthly total
        if (transformed.length === 1) {
          const monthlyData = transformed[0];
          const daysInMonth = moment().daysInMonth();
          const avgDailyConsumption = monthlyData.consumption / daysInMonth;

          transformed = [
            {
              label: moment().format("MMM YYYY"),
              time: moment().format("MMM YYYY"),
              consumption: avgDailyConsumption,
              active: monthlyData.active,
              inactive: monthlyData.inactive,
              isMonthlyAverage: true,
            },
          ];
        } else {
          // Sort by date if we have multiple daily points
          transformed.sort(
            (a, b) =>
              moment(a.time, "DD MMM").valueOf() -
              moment(b.time, "DD MMM").valueOf()
          );
        }
      } else {
        // For weekly and yearly data
        transformed = raw.map((item) => {
          const consumption = Number(item.total_consumption_wh || 0);
          const isWorking = Boolean(item.is_working);

          let label;
          if (item.period || item.day) {
            const dateStr = item.period || item.day;
            const date = new Date(dateStr);
            if (tf === "weekly") {
              label = moment(date).format("DD MMM");
            } else if (tf === "yearly") {
              label = moment(date).format("MMM YYYY");
            } else {
              label = moment(date).format("DD MMM");
            }
          } else {
            label = "Unknown";
          }

          return {
            label: label,
            time: label,
            consumption: consumption,
            active: isWorking ? 100 : 0,
            inactive: isWorking ? 0 : 100,
          };
        });
      }

      console.log("Working hours transformed data:", transformed);
      setWorkingHoursData(transformed);
    } catch (err) {
      console.error("Working hours fetch error:", err?.message);
      setWorkingHoursData([]);
    } finally {
      setWorkingHoursLoading(false);
    }
  };


  const fetchTemperatureTrend = async (tf, date) => {
    // Check if user org_id includes 149 - if so, don't show any graph data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected - hiding temperature graph data');
          setTemperatureData([]);
          setTemperatureLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    setTemperatureLoading(true);
    try {
      let url;
      if (tf === 'daily') {
        url = `${import.meta.env.VITE_API_BASE_URL}/location/neon-power-data/${encodedDid}?timeframe=daily&date=${date}`;
      } else if (tf === 'weekly') {
        const week = moment(date).isoWeek();
        const year = moment(date).year();
        url = `${import.meta.env.VITE_API_BASE_URL}/location/neon-power-data/${encodedDid}?timeframe=weekly&week=${week}&year=${year}`;
      } else if (tf === 'monthly') {
        const month = moment(date).format('YYYY-MM');
        url = `${import.meta.env.VITE_API_BASE_URL}/location/neon-power-data/${encodedDid}?timeframe=monthly&month=${month}`;
      } else if (tf === 'yearly') {
        const year = moment(date).year();
        url = `${import.meta.env.VITE_API_BASE_URL}/location/neon-power-data/${encodedDid}?timeframe=yearly&year=${year}`;
      }

      console.log(`\n🌡️ TEMPERATURE TREND FETCH [${tf}]`, { url, date });
      const response = await authFetch({ url, method: 'GET' });
      console.log('Temperature Trend API Response:', response.data);

      const raw = response?.data?.data || [];
      // Store raw data for relay info popup if daily
      if (tf === 'daily') setRawTemperatureData(raw);
      console.log('Raw temperature data:', raw);

      let formatted;
      
      if (tf === 'daily') {
        // For daily timeframe, create 24-hour structure
        formatted = Array.from({ length: 24 }, (_, hour) => {
          const timeString = `${String(hour).padStart(2, '0')}:00`;
          
          // Find data for this hour
          const hourData = raw.find(item => {
            if (!item || !item.time_bucket) return false;
            
            try {
              const timestamp = item.time_bucket;
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const itemHour = parseInt(hourMatch[1]);
                return itemHour === hour;
              }
              return false;
            } catch (e) {
              console.error('Error parsing time_bucket:', item.time_bucket);
              return false;
            }
          });

          const temp = hourData ? parseFloat(hourData.tempip_avg || 0) : null;

          return {
            time: timeString,
            label: timeString,
            temperature: temp,
          };
        });
      } else {
        // For other timeframes, use time_bucket field directly
        formatted = raw.map(item => {
          let timeLabel = "";
          
          if (tf === 'weekly') {
            timeLabel = moment(item.time_bucket).format('DD MMM');
          } else if (tf === 'monthly') {
            timeLabel = moment(item.time_bucket).format('DD MMM');
          } else if (tf === 'yearly') {
            timeLabel = moment(item.time_bucket).format('MMM YYYY');
          }

          const temp = parseFloat(item.tempip_avg || 0);

          return {
            time: timeLabel,
            label: timeLabel,
            temperature: temp,
          };
        });
      }

      console.log('\n🌡️ FORMATTED TEMPERATURE:', { timeframe: tf, data: formatted });
      setTemperatureData(formatted);
    } catch (err) {
      console.error('Temperature trend fetch error:', err);
      setTemperatureData([]);
    } finally {
      setTemperatureLoading(false);
    }
  };

  /* ───── BASELINE MODAL OPEN ───── */
  const openBaselineModal = async () => {
    setShowBaselineModal(true);
    setBaselineStatus("idle");

    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiURL}/location/neon-data/${decodedDid}`,
        method: "GET",
      });

      const bl = res?.data?.baseline_set ?? res?.data?.BASELINE ?? null;
      setModalBaseline(bl);
      setBaseline(bl);
      setBaselineInput(bl !== null ? String(bl) : "");
    } catch (e) {
      console.error("Failed to load current baseline", e);
      setBaselineInput("");
    }
  };

  const setBaselineFn = async () => {
    const value = Number(baselineInput);
    if (!baselineInput || isNaN(value) || value <= 0) {
      setBaselineStatus("error");
      setTimeout(() => setBaselineStatus("idle"), 2000);
      return;
    }

    setBaselineStatus("loading");
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiURL}/neon-set-baseline`,
        method: "POST",
        data: { id: decodedDid, baseline: value },
      });

      if (!res?.data?.success) throw new Error("Failed");

      await fetchData();
      setBaselineStatus("success");
      setBaselineInput("");
    } catch (err) {
      console.error(err);
      setBaselineStatus("error");
    } finally {
      setTimeout(() => {
        setBaselineStatus("idle");
        setShowBaselineModal(false);
      }, 1500);
    }
  };

  // ───── UNIFIED FETCH ALL ─────
  const fetchAll = useMemo(() => {
    const tf = timeframe;
    const dateParam = tf === "daily" ? selectedDate : undefined;

    return () => {
      fetchPowerData(tf, dateParam);
      fetchCarbonFootprint(carbonTimeframe, carbonTimeframe === "daily" ? selectedDate : undefined);
      fetchPowerSavingData(powerSavingTimeframe, powerSavingTimeframe === "daily" ? selectedDate : undefined);
      fetchWorkingHours(workingHoursTimeframe, workingHoursTimeframe === "daily" ? selectedDate : undefined);
      fetchTemperatureTrend(temperatureTimeframe, temperatureTimeframe === "daily" ? selectedDate : undefined);
    };
  }, [
    timeframe,
    selectedDate,
    carbonTimeframe,
    powerSavingTimeframe,
    workingHoursTimeframe,
    temperatureTimeframe,
  ]);

  // ───── EFFECTS ─────
  
  // Data fetching
  useEffect(() => {
    // Only perform initial data fetch - no polling intervals for real-time data
    fetchData();
    fetchPowerData(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchCarbonFootprint(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchPowerSavingData(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchWorkingHours(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchTemperatureTrend(timeframe, timeframe === "daily" ? selectedDate : null);

    return () => {
      // Clear command timeout on unmount
      if (commandTimeout) {
        clearTimeout(commandTimeout);
      }
      // Clear message timeout on unmount
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
    };
  }, [
    decodedDid,
    timeframe,
    selectedDate,
  ]);

  useEffect(() => {
    if (timeframe === "daily") {
      const today = moment().format("YYYY-MM-DD");
      setSelectedDate(today);
    }
  }, [timeframe]);

  // Periodic GMRMAIN data request every 10 seconds
  useEffect(() => {
    if (!decodedDid || !topic || !responseTopic) return;

    console.log('🔄 Starting initial GMRMAIN request for MODBUS device:', decodedDid);

    const apiURL = import.meta.env.VITE_API_BASE_URL;
    let retryTimeout = null; // Track retry timeout for cleanup
    let gmrAllInterval = null; // Track interval for cleanup
    
    // Start periodic calls function
    const startPeriodicCalls = () => {
      if (!isMountedRef.current) {
        console.log('⏹️ Component unmounted, not starting periodic calls');
        return;
      }
      
      gmrAllInterval = setInterval(async () => {
        if (!isMountedRef.current) {
          console.log('⏹️ Component unmounted, stopping periodic GMRMAIN');
          clearInterval(gmrAllInterval);
          return;
        }
        
        // Skip periodic call if a command was recently sent
        if (pendingCommandRef.current) {
          console.log('⏸️ Skipping periodic GMRMAIN - command in progress');
          return;
        }
        
        try {
          console.log('📡 Sending periodic GMRMAIN request (10s interval) for MODBUS');
          const gmrAllPayload = {
            deviceid: decodedDid,
            topic: topic,
            response: responseTopic,
            message: { SIOT: "GMRMAIN" }
          };
          
          const response = await authFetch({
            url: `${apiURL}/devicecommandwithresponse`,
            method: "POST",
            data: gmrAllPayload,
          });
          
          // Check again after async operation
          if (!isMountedRef.current) {
            console.log('⏹️ Component unmounted during periodic request, skipping state update');
            return;
          }
          
          // Process GMRMAIN response to update component state
          if (response?.data) {
            let deviceData = null;
            
            if (response.data.responses && Array.isArray(response.data.responses)) {
              deviceData = response.data.responses.find(r => 
                r.DID || r.MOD !== undefined || r.MANMODBUS !== undefined || r.AUTO_M !== undefined
              );
            } else if (response.data.DID || response.data.MOD !== undefined) {
              deviceData = response.data;
            }
            
            if (deviceData) {
              // Update MODBUS status
              if (deviceData.MOD !== undefined) {
                setIsModbusOn(deviceData.MOD === 1);
                console.log('🔌 Periodic: MODBUS status updated:', deviceData.MOD === 1);
              }
              
              // Update mode
              const autoOn = deviceData.AUTO_M === "ON";
              const manOn = deviceData.MANMODBUS === "ON";
              
              let newMode;
              if (autoOn) newMode = "auto";
              else if (manOn) newMode = "manual-on";
              else newMode = "manual-off";
              
              setMode(newMode);
              
              // Update frequency if FREQ changed
              if (deviceData.FREQ !== undefined) {
                setSetFreq(Number(deviceData.FREQ));
              }
              
              // Ensure Schedule is at top level
              const normalizedData = {
                ...deviceData,
                Schedule: deviceData.Schedule || []
              };
              
              setNeonData(prev => ({ ...prev, ...normalizedData }));
              console.log('🔄 Periodic update completed - MODBUS section visibility unchanged');
            }
          }
        } catch (error) {
          console.error('Periodic GMRMAIN request failed:', error);
        }
      }, 10000); // Every 10 seconds
    };
    
    // Initial call on page entry
    const makeInitialCall = async () => {
      if (!isMountedRef.current) {
        console.log('⏹️ Component unmounted, skipping initial GMRMAIN request');
        return;
      }
      
      try {
        console.log('📡 Making initial GMRMAIN request for MODBUS device:', decodedDid);
        const gmrAllPayload = {
          deviceid: decodedDid,
          topic: topic,
          response: responseTopic,
          message: { SIOT: "GMRMAIN" }
        };
        
        const response = await authFetch({
          url: `${apiURL}/devicecommandwithresponse`,
          method: "POST",
          data: gmrAllPayload,
        });
        
        // Check if component is still mounted after async operation
        if (!isMountedRef.current) {
          console.log('⏹️ Component unmounted during initial request, aborting');
          return;
        }
        
        // Process GMRMAIN response to update component state
        if (response?.data) {
          console.log('📥 Full GMRMAIN response:', response.data);
          
          let deviceData = null;
          
          // Handle different response structures
          if (response.data.responses && Array.isArray(response.data.responses)) {
            deviceData = response.data.responses.find(r => 
              r.DID || r.MOD !== undefined || r.MANMODBUS !== undefined || r.AUTO_M !== undefined
            );
          } else if (response.data.DID || response.data.MOD !== undefined) {
            deviceData = response.data;
          }
          
          if (deviceData && deviceData.DID) {
            console.log('📥 Initial GMRMAIN response received, updating MODBUS state:', deviceData);
            
            // Update MODBUS status based on MOD field (actual AC status)
            if (deviceData.MOD !== undefined) {
              setIsModbusOn(deviceData.MOD === 1);
              console.log('🔌 MODBUS status updated:', deviceData.MOD === 1);
            }
            
            // Update mode based on AUTO_M and MANMODBUS
            const autoOn = deviceData.AUTO_M === "ON";
            const manOn = deviceData.MANMODBUS === "ON";
            
            let newMode;
            if (autoOn) newMode = "auto"; // AUTO takes priority
            else if (manOn) newMode = "manual-on";
            else newMode = "manual-off";
            
            setMode(newMode);
            
            // Update frequency if FREQ is present
            if (deviceData.FREQ !== undefined) {
              setSetFreq(Number(deviceData.FREQ));
            }
            
            console.log('📅 Schedule data in initial response:', deviceData.Schedule);
            
            // Ensure Schedule is at top level
            const normalizedData = {
              ...deviceData,
              Schedule: deviceData.Schedule || []
            };
            
            setNeonData(prev => ({ ...prev, ...normalizedData }));
            setLoading(false);
            console.log('✅ Valid device data received, MODBUS section will be shown');
            
            // Start periodic calls after successful initial call
            startPeriodicCalls();
          } else {
            console.log('❌ No valid device data found in GMRMAIN response for device:', decodedDid);
            if (isMountedRef.current) {
              retryTimeout = setTimeout(makeInitialCall, 15000);
            }
          }
        } else {
          console.log('❌ No data in GMRMAIN response for device:', decodedDid, '- retrying');
          if (isMountedRef.current) {
            retryTimeout = setTimeout(makeInitialCall, 15000);
          }
        }
        
      } catch (error) {
        console.error('❌ Initial GMRMAIN request failed for device:', decodedDid, error);
        if (isMountedRef.current) {
          retryTimeout = setTimeout(makeInitialCall, 15000);
        }
      }
    };
    
    // Start with initial call
    makeInitialCall();
    
    // Cleanup function
    return () => {
      console.log('🛑 Stopping GMRMAIN requests for device:', decodedDid);
      isMountedRef.current = false;
      if (gmrAllInterval) {
        clearInterval(gmrAllInterval);
        gmrAllInterval = null;
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    };
  }, [decodedDid, topic, responseTopic]);

  // ───── SEND COMMAND ─────
  const sendControlCommand = async (payload) => {
    if (!topic) {
      setTimeout(() => sendControlCommand(payload), 500);
      return;
    }
    payload.topic = topic;
    payload.response = responseTopic;

    const currentState = {
      modbus: neonData?.MOD ?? neonData?.modbus ?? (isModbusOn ? 1 : 0),
      MANMODBUS: neonData?.MANMODBUS ?? (mode === "manual-on" ? "ON" : "OFF"),
      AUTO_M: neonData?.AUTO_M ?? (mode === "auto" ? "ON" : "OFF"),
      uiSetFreq: setFreq,
      uiIsModbusOn: isModbusOn,
      uiMode: mode,
    };

    console.log('🚀 Sending Modbus control command:', payload.message);
    console.log('📊 Current state saved for timeout handling:', currentState);

    setPendingCommand(currentState);

    const timeout = setTimeout(() => {
      console.log('⏰ Device command timeout after 30 seconds, reverting changes');
      console.warn("Device command timeout - reverting changes");
      
      if (pendingCommandRef.current && pendingCommandRef.current === currentState) {
        console.log('⏰ Reverting to previous state');
        showStatusMessage("Device not reachable. Reverting changes...", "error");
        setSetFreq(currentState.uiSetFreq);
        setIsModbusOn(currentState.uiIsModbusOn);
        setMode(currentState.uiMode);
        setPendingCommand(null);
        setCommandTimeout(null);
      }
    }, 30000);

    setCommandTimeout(timeout);
    console.log('⏱️ Command timeout set for 30 seconds');

    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const commandResponse = await authFetch({
        url: `${apiURL}/devicecommandwithresponse`,
        method: "POST",
        data: payload,
      });
      console.log('✅ Command sent successfully via API');
      setTimeoutCounter(0); // Reset counter on success

      // Send GMRMAIN after a short delay to get latest updates
      setTimeout(async () => {
        try {
          console.log('📡 Sending GMRMAIN after command to get updates');
          const gmrallPayload = {
            deviceid: decodedDid,
            topic: topic,
            response: responseTopic,
            message: { SIOT: "GMRMAIN" }
          };

          const gmrallResponse = await authFetch({
            url: `${apiURL}/devicecommandwithresponse`,
            method: "POST",
            data: gmrallPayload,
          });

          if (gmrallResponse?.data) {
            console.log('📥 GMRMAIN response after command:', gmrallResponse.data);
            
            let deviceData = null;
            
            if (gmrallResponse.data.responses && Array.isArray(gmrallResponse.data.responses)) {
              deviceData = gmrallResponse.data.responses.find(r => 
                r.DID || r.MOD !== undefined || r.MANMODBUS !== undefined || r.AUTO_M !== undefined
              );
            } else if (gmrallResponse.data.DID || gmrallResponse.data.MOD !== undefined) {
              deviceData = gmrallResponse.data;
            }
            
            if (deviceData) {
              console.log('🔄 Updating device state with fresh data:', {
                MOD: deviceData.MOD,
                AUTO_M: deviceData.AUTO_M,
                MANMODBUS: deviceData.MANMODBUS,
                FREQ: deviceData.FREQ,
                TempIP: deviceData.TempIP || deviceData.TEMPIP,
                Motion: deviceData.Motion,
              });
              
              // Update Modbus status
              if (deviceData.MOD !== undefined) {
                const newModbusState = deviceData.MOD === 1;
                setIsModbusOn(newModbusState);
                console.log('🔌 Post-command: Modbus status updated:', newModbusState);
              }
              
              // Update mode based on AUTO_M and MANMODBUS
              const autoOn = deviceData.AUTO_M === "ON";
              const manOn = deviceData.MANMODBUS === "ON";
              
              let newMode;
              if (autoOn && !manOn) newMode = "auto";
              else if (!autoOn && manOn) newMode = "manual-on";
              else if (!autoOn && !manOn) newMode = "manual-off";
              else newMode = manOn ? "manual-on" : "auto";
              
              console.log('🎛️ Mode updated:', { autoOn, manOn, newMode });
              setMode(newMode);
              
              // Update frequency if FREQ changed
              if (deviceData.FREQ !== undefined) {
                setSetFreq(Number(deviceData.FREQ));
              }
              
              // Normalize field names
              const normalizedData = {
                ...deviceData,
                MOD: deviceData.MOD ?? deviceData.modbus,
                TempIP: deviceData.TempIP ?? deviceData.TEMPIP ?? deviceData.tempip,
                Motion: deviceData.Motion ?? deviceData.motion,
                TEMPIP: deviceData.TempIP ?? deviceData.TEMPIP ?? deviceData.tempip,
                // Ensure Schedule is at top level
                Schedule: deviceData.Schedule || []
              };
              
              setNeonData(prev => ({ ...prev, ...normalizedData }));
              
              console.log('🔄 Post-command update completed - all parameters refreshed');
              
              // Clear pending command after successful update
              if (pendingCommandRef.current === currentState) {
                setPendingCommand(null);
                if (commandTimeoutRef.current) {
                  clearTimeout(commandTimeoutRef.current);
                  setCommandTimeout(null);
                }
                showStatusMessage("Device updated successfully", "success");
              }
              
              console.log('✅ Device state fully synchronized');
            } else {
              console.warn('⚠️ No valid device data found in GMRMAIN response');
            }
          }
        } catch (gmrallError) {
          console.error('GMRMAIN after command failed:', gmrallError);
          showStatusMessage("Command sent but status update failed", "warning");
        }
      }, 800); // 800ms delay - optimized for fast API response

    } catch (error) {
      console.error("API Error:", error);
      
      // Check for timeout error
      if (error.message && error.message.includes("Timeout")) {
        const newCount = timeoutCounter + 1;
        setTimeoutCounter(newCount);
        
        if (newCount >= 3) {
          alert("Device is offline. Please check the device connection and try again.");
          setTimeoutCounter(0); // Reset after showing alert
        }
      } else {
        setTimeoutCounter(0); // Reset on non-timeout errors
      }
      
      showStatusMessage("Command failed. Reverting changes...", "error");
      setSetFreq(currentState.uiSetFreq);
      setIsModbusOn(currentState.uiIsModbusOn);
      setMode(currentState.uiMode);
      setPendingCommand(null);
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        setCommandTimeout(null);
      }
    }
  };

  const sendControlCommandSafe = (payload) => {
    if (!topic) {
      setTimeout(() => sendControlCommandSafe(payload), 800);
      return;
    }
    sendControlCommand({ ...payload, topic });
  };

  // ───── FREQUENCY CONTROLS ─────
  const increaseFreq = () => {
    setSetFreq((prev) => {
      const newFreq = Math.min(70, prev + 1);
      sendControlCommandSafe({ message: { FREQ: newFreq } });
      return newFreq;
    });
  };

  const decreaseFreq = () => {
    setSetFreq((prev) => {
      const newFreq = Math.max(30, prev - 1);
      sendControlCommandSafe({ message: { FREQ: newFreq } });
      return newFreq;
    });
  };

  // ───── MODE CYCLE ─────
  const cycleMode = () => {
    let payload = {};
    if (mode === "auto") {
      payload = { MANMODBUS: "ON", AUTO_M: "OFF" };
      setMode("manual-on");
    } else if (mode === "manual-on") {
      payload = { MANMODBUS: "OFF", AUTO_M: "OFF" };
      setMode("manual-off");
    } else if (mode === "manual-off") {
      payload = { MANMODBUS: "ON", AUTO_M: "OFF" };
      setMode("manual-on");
    }
    sendControlCommandSafe({ message: payload });
  };

  // ───── TOGGLES ─────
  const handleRManMToggle = () => {
    setModbusSettings((prev) => {
      const newVal = prev.rMan_M === "ON" ? "OFF" : "ON";
      sendControlCommandSafe({ message: { rMan_M: newVal } });
      return { ...prev, rMan_M: newVal };
    });
  };

  const handleIntervalChange = (value) => {
    setModbusSettings((prev) => {
      sendControlCommandSafe({ message: { rManINT_M: value } });
      return { ...prev, rManINT_M: value };
    });
  };

  // ───── INPUT CHANGE (debounced) ─────
  const handleInputChange = (field, value) => {
    setModbusSettings((prev) => ({ ...prev, [field]: value }));
    debouncedSend({ message: { [field]: value } });
  };

  // ───── SAVE SETTINGS ─────
  const handleSaveSettings = () => {
    const settingsToSend = {
      ...(modbusSettings.OMA && { OMA: Number(modbusSettings.OMA) }),
      ...(modbusSettings.FMA && { FMA: Number(modbusSettings.FMA) }),
      ...(modbusSettings.TMV && { TMV: Number(modbusSettings.TMV) }),
      ...(modbusSettings.FMV && { FMV: Number(modbusSettings.FMV) }),
      ...(modbusSettings.FREQ && { FREQ: Number(modbusSettings.FREQ) }),
      ...(modbusSettings.FREQOFFSET && {
        FREQOFFSET: Number(modbusSettings.FREQOFFSET),
      }),

      rMan_M: modbusSettings.rMan_M,
      AUTO_M: modbusSettings.AUTO_M,
      SMACTION: modbusSettings.SMACTION,
      rManINT_M: modbusSettings.rManINT_M,
      MXT: Number(modbusSettings.MXT),
      MNT: Number(modbusSettings.MNT),
      MS: modbusSettings.MS,
      TS: modbusSettings.TS,
    };

    // Remove empty fields
    const filtered = Object.fromEntries(
      Object.entries(settingsToSend).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined
      )
    );

    if (Object.keys(filtered).length === 0) {
      alert("No changes to save.");
      setShowSettings(false);
      return;
    }

    sendControlCommandSafe({ message: filtered });
    setTimeout(() => {
      alert("Settings saved successfully!");
      setShowSettings(false);
    }, 500);
  };

  // ───── OPEN SCHEDULE ─────
  const openSchedule = () => {
    console.log('📅 Opening schedule manager - neonData:', neonData);
    console.log('📅 Schedule array:', neonData?.Schedule);
    const topic = neonData?.topic || decodedDid || "topic";
    const response = neonData?.response || "response";
    const schedules = neonData?.Schedule || [];
    console.log('📅 Passing schedules to manager:', schedules);

    navigate("/device/schedule", {
      state: { deviceType: "MODBUS", topic, response, scheduleData: schedules },
    });
  };

  // ───── GAUGE CALCULATIONS ─────
  const RADIUS = 45;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = (setFreq - 30) / (70 - 30);
  const offset = CIRCUMFERENCE * (1 - progress);
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const tipX = 50 + RADIUS * Math.cos(angle);
  const tipY = 50 + RADIUS * Math.sin(angle);

  // ───── POWER CHART PREP ─────
  const powerChartData = powerData.map((i) => ({
    time: i.time,
    R: i.R ?? null,
    Y: i.Y ?? null,
    B: i.B ?? null,
    total: (Number(i.R || 0) + Number(i.Y || 0) + Number(i.B || 0)).toFixed(3),
  }));

  const totalPower = powerChartData
    .reduce((s, d) => s + (d.R || 0) + (d.Y || 0) + (d.B || 0), 0)
    .toFixed(2);

  const peakUsage =
    powerChartData.length > 0
      ? powerChartData.reduce((max, cur) => {
          const curT = (cur.R || 0) + (cur.Y || 0) + (cur.B || 0);
          const maxT = (max.R || 0) + (max.Y || 0) + (max.B || 0);
          return curT > maxT ? cur : max;
        }, powerChartData[0])
      : { time: "", R: 0, Y: 0, B: 0 };

  const phaseTotals = {
    R: powerChartData.reduce((s, d) => s + (d.R || 0), 0).toFixed(2),
    Y: powerChartData.reduce((s, d) => s + (d.Y || 0), 0).toFixed(2),
    B: powerChartData.reduce((s, d) => s + (d.B || 0), 0).toFixed(2),
  };

  // ───── LOADING / ERROR ─────
  if (loading)
    return <div className={`p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Loading Modbus Device...</div>;
  if (!neonData)
    return <div className={`p-6 ${isDark ? 'text-red-400' : 'text-red-600'}`}>No Modbus data found.</div>;

  // ───── RENDER ─────
  return (
    <div className={`p-6 min-h-screen space-y-6 relative ${isDark ? 'bg-[#020617] text-white' : 'bg-white text-gray-900'}`}>
      {/* LOADING OVERLAY WHEN COMMAND PENDING */}
      {pendingCommand && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div
                className="absolute inset-2 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1s",
                }}
              ></div>
            </div>
            <div className="text-center">
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Sending command to device...
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MESSAGE */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-green-600 text-white"
              : statusMessage.type === "error"
              ? "bg-red-600 text-white"
              : statusMessage.type === "warning"
              ? "bg-yellow-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          {statusMessage.type === "success" && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {statusMessage.type === "error" && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          {statusMessage.type === "warning" && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <span className="font-medium">{statusMessage.message}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="ml-2 hover:opacity-75"
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
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {neonData.device_name ?? neonData.DID}
              </h2>
              <div className={`text-sm flex items-center gap-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      isOnline ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className={isOnline ? "text-green-400" : "text-red-400"}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
      
                <div className="text-right">
                  Last Data:{" "}
                  <span className={isDark ? "text-blue-400" : "text-blue-600"}>
                    {lastUpdate
                      ? moment
                          .tz(lastUpdate, "UTC")
                          .tz("Asia/Kolkata")
                          .format("DD-MM-YYYY hh:mm:ss A")
                      : "-"}
                  </span>
                </div>
                <button
                  onClick={openBaselineModal}
                  className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1 transition shadow-sm"
                  title="Set or update power baseline"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Baseline
                </button>
                <button
                  onClick={() =>
                    exportToExcel(
                      powerData,
                      workingHoursData,
                      powerSavingData,
                      carbonData,
                      temperatureData,
                      neonData.device_name || "Device"
                    )
                  }
                  className="flex items-center px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1 transition shadow-sm"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Report
                </button>
              </div>
            </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ---------- AC WIDGET ---------- */}
        <div className={`lg:col-span-2 p-6 rounded-xl flex flex-col items-center relative ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
          <div className={`absolute top-4 left-4 font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            {neonData.remote_make ?? "-"}
          </div>
          <div className="absolute top-4 right-4 flex gap-3">
            <button
              className={`px-4 py-2 rounded-lg transition ${isDark ? 'bg-[#1F3C48] hover:bg-[#2a4b59]' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              onClick={() => setShowSettings(true)}
            >
              <FontAwesomeIcon icon={faSlidersH} />
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              onClick={openSchedule}
            >
              <FontAwesomeIcon icon={faCalendarAlt} />
            </button>
          </div>

          <div className="relative w-[290px] h-[90px] mx-auto mt-6">
            <img
              src="../src/assets/img/AC.png"
              alt="AC"
              className="w-full h-full object-contain"
            />

            {/* TOP-LEFT: Modbus Status */}
            <div className="absolute top-2 left-1 flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${isModbusOn ? 'bg-green-500 animate-pulse shadow-green-500/50' : 'bg-red-500'}`}
              />
              <span
                className={`mt-0.5 text-[7px] font-medium transition-colors duration-300 ${isModbusOn ? 'text-green-400' : 'text-red-400'} ${isDark ? 'bg-black/70' : 'bg-white/70 text-gray-800'} px-1 py-0.5 rounded`}
              >
                {isModbusOn ? "ON" : "OFF"}
              </span>
            </div>

            {/* BOTTOM-RIGHT: Mode Toggle */}
            <div className="absolute bottom-4 right-1 flex flex-col items-center">
              {/* Mode Label – 100% same as your original */}
              <span
                className={`mt-0.5 text-[7px] font-medium tracking-wider
      ${
        mode === "auto"
          ? "text-green-600"
          : mode === "manual-on"
          ? "text-yellow-700"
          : "text-red-700"
      }`}
              >
                {mode === "auto" ? "AUTO" : mode === "manual-on" ? "ON" : "OFF"}
              </span>

              {/* MAIN TOGGLE – EXACT SAME SIZE & STYLE AS YOUR ORIGINAL */}
              {mode === "auto" ? (
                // AUTO MODE: Show small "M" button to enter Manual
                <button
                  onClick={() => {
                    sendControlCommand({
                      message: { MANMODBUS: "ON", AUTO_M: "OFF" },
                    });
                    setMode("manual-on");
                  }}
                  className="relative mt-1 w-10 h-5 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 
                 border border-amber-500 flex items-center justify-center 
                 hover:from-amber-500 hover:to-orange-500 active:scale-95 
                 transition-all duration-200 shadow-md"
                >
                  <span className="text-[9px] font-bold text-white">Auto</span>
                </button>
              ) : (
                // MANUAL MODE: Your ORIGINAL toggle – 100% identical
                <button
                  onClick={cycleMode}
                  className={`
        relative w-10 h-5 rounded-full border flex items-center
        transition-all duration-300 cursor-pointer select-none overflow-hidden mt-1
        ${
          mode === "manual-on"
            ? "bg-[#D2DE07]/30 border-[#D2DE07]"
            : "bg-[#2D3748] border-[#9EA3AB]"
        }
      `}
                >
                  <div
                    className="absolute w-4 h-4 rounded-full shadow-md transition-all duration-300"
                    style={{
                      backgroundColor:
                        mode === "manual-on" ? "#D2DE07" : "#9EA3AB",
                      transform:
                        mode === "manual-on"
                          ? "translateX(20px)"
                          : "translateX(2px)",
                    }}
                  />
                  <span
                    className={`
          absolute text-[9px] font-bold transition-all duration-300 z-10
          ${
            mode === "manual-on"
              ? "left-1 text-white"
              : "right-1 text-[#9EA3AB]"
          }
        `}
                  >
                    {mode === "manual-on" ? "ON" : "OFF"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Frequency Knob */}
          <div className="flex items-center gap-6 mt-10">
            <span className={`text-[20px] font-semibold ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
              30Hz
            </span>
            <button
              onClick={decreaseFreq}
              className={`w-[70px] h-[50px] flex items-center justify-center rounded-full transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}
            >
              <Minus className="w-6 h-6" />
            </button>
            <div className={`relative flex items-center justify-center w-40 h-40 rounded-full ${isDark ? 'bg-[#1F3C48]' : 'bg-gray-100'}`}>
              <svg
                className="absolute w-full h-full rotate-[145deg]"
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient
                    id="freqGradient"
                    x1="0%"
                    y1="0%"
                    x2="70%"
                    y2="70%"
                  >
                    <stop offset="0%" stopColor="#FB7770" />
                    <stop offset="100%" stopColor="#6EB1ED" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  stroke={isDark ? "#11172A" : "#e5e7eb"}
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  stroke="url(#freqGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                />
                <circle
                  cx={tipX}
                  cy={tipY}
                  r="3.5"
                  fill="#D9D9D9"
                  stroke="#418EF2"
                  strokeWidth="2"
                />
              </svg>
              <div
                className="w-28 h-28 rounded-full flex flex-col items-center justify-center text-center"
                style={{
                  background:
                    "linear-gradient(180deg, #418EF2 0%, #75CEFF 100%)",
                }}
              >
                <p className={`text-[16px] font-medium ${isDark ? 'text-white/60' : 'text-white/70'}`}>
                  Frequency
                </p>
                <p className="text-[24px] text-white font-bold">{setFreq}Hz</p>
              </div>
            </div>
            <button
              onClick={increaseFreq}
              className={`w-[70px] h-[50px] flex items-center justify-center rounded-full transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}
            >
              <Plus className="w-6 h-6" />
            </button>
            <span className={`text-[20px] font-semibold ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
              70Hz
            </span>
          </div>

          {/* 4-STATUS BOXES */}
          <div className="flex justify-between items-center mt-40 px-6 w-full">
            <div className="flex gap-4">
              <button
                className={`
                  flex flex-col items-center justify-center
                  w-20 h-16 p-2 rounded-lg
                  transition
                  ${
                    isCooling
                      ? isDark ? "bg-[#464F62] text-blue-400 border border-blue-400" : "bg-blue-50 text-blue-600 border border-blue-300"
                      : isDark ? "bg-[#464F62] hover:bg-gray-500 text-gray-400" : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                  }
                `}
              >
                <Snowflake className="w-6 h-6 mb-1" />
                <span className="text-[10px]">
                  {isCooling ? "COOLING" : "Cooling"}
                </span>
              </button>
              <button className={`flex flex-col items-center justify-center w-20 h-16 p-2 rounded-lg transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-gray-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}>
                <Wind className="w-6 h-6 mb-1" />
                <span className="text-[10px]">Airwave</span>
              </button>
            </div>
            <div className="flex gap-4">
              {/* Temperature */}
              <div className={`flex items-center justify-center w-20 h-16 p-2 rounded-lg transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                <Thermometer
                  className="w-6 h-6 mr-1.5"
                  style={{ color: tempColor }}
                />
                <div className="text-right">
                  <span className="text-xs font-medium block">{curTemp}°C</span>
                  <span className={`text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Temp</span>
                </div>
              </div>

              {/* NEW: Humidity */}
              {humidity !== null && (
                <div className={`flex items-center justify-center w-20 h-16 p-2 rounded-lg transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                  <Droplets
                    className="w-6 h-6 mr-1.5"
                    style={{ color: humidityColor }}
                  />
                  <div className="text-right">
                    <span className="text-xs font-medium block">
                      {humidity}%
                    </span>
                    <span className={`text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Humidity</span>
                  </div>
                </div>
              )}

              {/* Motion */}
              <div
                className={`flex items-center justify-center w-20 h-16 p-2 rounded-lg transition ${isDark ? 'bg-[#464F62]' : 'bg-gray-200'}`}
                style={{ color: motionActive ? "#22C55E" : isDark ? "#9CA3AF" : "#6B7280" }}
              >
                <User className="w-6 h-6 mr-1.5" />
                <div className="text-center">
                  <span className="text-xs font-medium block">
                    {motionActive ? "Motion" : "No motion"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* POWER CONSUMPTION WITH ACTIVE/INACTIVE */}
        <div className="lg:col-span-2">
          {hideGraphs ? (
            <div className={`rounded-xl p-6 flex items-center justify-center h-64 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
              <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-lg">📊 Graph Access Restricted</p>
                <p className="text-sm mt-2">Your organization does not have access to view graph data</p>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl p-6 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Power Consumption</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className={`text-xs px-4 py-2 rounded-lg outline-none cursor-pointer ${isDark ? 'bg-[#1F2937] text-gray-300' : 'bg-gray-100 text-gray-900 border border-gray-300'}`}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {timeframe === 'daily' && (
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={moment().format('YYYY-MM-DD')}
                      className={`text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer ${isDark ? 'bg-[#1F2937] text-gray-300' : 'bg-gray-100 text-gray-900 border border-gray-300'}`}
                    />
                  )}
                </div>
              </div>
              
              {powerLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    Loading power data...
                  </div>
                </div>
              ) : powerChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className={`text-lg mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No power data available</div>
                  <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Try changing timeframe or check device connection</div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={powerChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FB923C" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#FB923C" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
                      <XAxis dataKey="time" stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kWh`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6", border: "none", borderRadius: "6px", color: isDark ? "#fff" : "#111827", fontSize: "12px" }}
                        formatter={(value, name) => [`${value} kWh`, "Total Consumption"]}
                        labelStyle={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: "11px" }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#FB923C" fill="url(#colorTotal)" name="Total Consumption" />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
              
              <SummaryCards
                consumption={`${totalPower} kWh`}
                baseline={`0.00 kWh`}
                saved={`0.00 kWh`}
                active={`0.00 kWh`}
                inactive={`0.00 kWh`}
                unit="kWh"
                isDark={isDark}
              />
            </div>
          )}
        </div>

        {/* Energy Saved Chart */}
        <div className="lg:col-span-2">
          {hideGraphs ? (
            <div className={`rounded-xl p-6 flex items-center justify-center h-64 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
              <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-lg">📊 Graph Access Restricted</p>
                <p className="text-sm mt-2">Your organization does not have access to view graph data</p>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl p-6 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Power Savings</h3>
                <select
                  value={powerSavingTimeframe}
                  onChange={(e) => setPowerSavingTimeframe(e.target.value)}
                  className={`text-xs px-4 py-2 rounded-lg outline-none cursor-pointer ${isDark ? 'bg-[#1F2937] text-gray-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {powerSavingLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? 'border-cyan-500' : 'border-cyan-600'}`}></div>
                    Loading power savings data...
                  </div>
                </div>
              ) : powerSavingData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className={`text-lg mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No power savings data</div>
                  <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Power savings appear when the device is active</div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={powerSavingData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
                      <XAxis dataKey="time" stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kWh`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6", border: "none", borderRadius: "6px", color: isDark ? "#fff" : "#111827", fontSize: "12px" }}
                        formatter={(value, name) => name === "saved" ? [`${value} kWh saved`, name] : [`${value} kWh used`, name]}
                        labelStyle={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: "11px" }}
                      />
                      <Bar dataKey="saved" stackId="a" fill="#06B6D4" radius={[8, 8, 0, 0]} name="Saved" />
                      <Bar dataKey="used" stackId="a" fill="#4B5563" radius={[8, 8, 0, 0]} name="Used" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* MATCHING SUMMARY CARDS */}
                  <div className="mt-3 space-y-2">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Total Saved', value: `${powerSavingData.reduce((s, d) => s + (d.saved || 0), 0).toFixed(2)} kWh`, color: '#06B6D4' },
                        { label: 'Total Used', value: `${powerSavingData.reduce((s, d) => s + (d.used || 0), 0).toFixed(2)} kWh`, color: '#60A5FA' },
                        { label: 'Savings %', value: `${powerSavingData.length > 0 ? ((powerSavingData.reduce((s, d) => s + (d.saved || 0), 0) / (powerSavingData.reduce((s, d) => s + ((d.saved || 0) + (d.used || 0)), 0) || 1)) * 100).toFixed(1) : 0}%`, color: '#34D399' },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
                          style={{
                            background: isDark 
                              ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))'
                              : 'linear-gradient(180deg, rgba(243,244,246,0.95), rgba(229,231,235,0.9))',
                            border: `1px solid ${item.color}`,
                            boxSizing: 'border-box',
                            minHeight: 80,
                          }}
                        >
                          <div className={`text-xs truncate mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
                          <div
                            className="font-semibold"
                            style={{
                              fontSize: '1rem',
                              lineHeight: 1.2,
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              color: item.label === 'Total Saved' ? '#06B6D4' : item.label === 'Savings %' ? '#34D399' : (isDark ? '#ffffff' : '#111827')
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Carbon Footprint Chart */}
        <div className="lg:col-span-2">
          {hideGraphs ? (
            <div className={`rounded-xl p-6 flex items-center justify-center h-64 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
              <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-lg">📊 Graph Access Restricted</p>
                <p className="text-sm mt-2">Your organization does not have access to view graph data</p>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl p-6 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
                <select
                  value={carbonTimeframe}
                  onChange={(e) => setCarbonTimeframe(e.target.value)}
                  className={`text-xs px-4 py-2 rounded-lg outline-none cursor-pointer ${isDark ? 'bg-[#1F2937] text-gray-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {carbonLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? 'border-indigo-500' : 'border-indigo-600'}`}></div>
                    Loading carbon footprint data...
                  </div>
                </div>
              ) : carbonData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className={`text-lg mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No carbon footprint data available</div>
                  <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Carbon data appears when the device is active</div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={carbonData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
                      <XAxis dataKey="time" stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kg`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6", border: "none", borderRadius: "6px", color: isDark ? "#fff" : "#111827", fontSize: "12px" }}
                        formatter={(value) => [`${value} kg CO₂`, "Carbon Footprint"]}
                        labelStyle={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: "11px" }}
                      />
                      <Area type="monotone" dataKey="actual" stroke="#10B981" fill="url(#colorCarbon)" name="Carbon Footprint" />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* MATCHING SUMMARY CARDS */}
                  <div className="mt-3 space-y-2">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Total Carbon', value: `${carbonData.reduce((s, d) => s + (d.actual || 0), 0).toFixed(2)} kg`, color: '#10B981' },
                        { label: 'Carbon Saved', value: `${carbonData.reduce((s, d) => s + (d.saved || 0), 0).toFixed(2)} kg`, color: '#60A5FA' },
                        { label: 'Reduction', value: `${carbonData.length > 0 ? ((carbonData.reduce((s, d) => s + (d.saved || 0), 0) / (carbonData.reduce((s, d) => s + ((d.saved || 0) + (d.actual || 0)), 0) || 1)) * 100).toFixed(1) : 0}%`, color: '#34D399' },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
                          style={{
                            background: isDark 
                              ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))'
                              : 'linear-gradient(180deg, rgba(243,244,246,0.95), rgba(229,231,235,0.9))',
                            border: `1px solid ${item.color}`,
                            boxSizing: 'border-box',
                            minHeight: 80,
                          }}
                        >
                          <div className={`text-xs truncate mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
                          <div
                            className="font-semibold"
                            style={{
                              fontSize: '1rem',
                              lineHeight: 1.2,
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              color: item.label === 'Carbon Saved' ? '#60A5FA' : item.label === 'Reduction' ? '#34D399' : (isDark ? '#ffffff' : '#111827')
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Working Hours Chart */}
        <div className={`lg:col-span-2 p-6 rounded-xl ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Working Hours</h3>
          </div>
          
          {workingHoursLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? 'border-green-500' : 'border-green-600'}`}></div>
                Loading working hours...
              </div>
            </div>
          ) : !workingHoursData || workingHoursData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className={`text-lg mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No working hours data</div>
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Working hours appear when the device is active</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workingHoursData.map(item => ({
                  time: item.time,
                  hours: item.consumption,
                  active: item.active ? item.consumption : 0,
                  inactive: !item.active ? item.consumption : 0,
                }))} margin={{ top: 18, right: 10, left: 0, bottom:2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
                  <XAxis dataKey="time" stroke={isDark ? "#9CA3AF" : "#6b7280"} tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis stroke={isDark ? "#9CA3AF" : "#6b7280"} tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)} Wh`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: isDark ? "#1E293B" : "#FFFFFF", border: isDark ? "1px solid #475569" : "1px solid #E5E7EB", borderRadius: "8px", padding: "8px 12px", color: isDark ? "white" : "black" }}
                    formatter={(value, name) => [`${value.toFixed(2)} Wh`, name === "active" ? "Active" : name === "inactive" ? "Inactive" : "Consumption"]}
                  />
                  <Bar dataKey="active" stackId="a" fill="#10B981" radius={[8, 8, 0, 0]} name="Active" />
                  <Bar dataKey="inactive" stackId="a" fill="#4B5563" radius={[8, 8, 0, 0]} name="Inactive" />
                </BarChart>
              </ResponsiveContainer>

              {/* MATCHING SUMMARY CARDS — SAME AS ENERGY CHARTS */}
              <div className="mt-3 space-y-2">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Total Consumption', value: `${(workingHoursData.reduce((sum, item) => sum + (item.consumption || 0), 0)).toFixed(2)} Wh`, color: '#10B981' },
                    { label: 'Periods', value: `${workingHoursData.length || 0}`, color: '#60A5FA' },
                    { label: 'Status', value: workingHoursData?.some(item => item.active) ? 'Active' : 'Inactive', color: workingHoursData?.some(item => item.active) ? '#34D399' : '#EF4444' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
                      style={{
                        background: isDark 
                          ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))'
                          : 'linear-gradient(180deg, rgba(243,244,246,0.95), rgba(229,231,235,0.9))',
                        border: `1px solid ${item.color}`,
                        boxSizing: 'border-box',
                        minHeight: 80,
                      }}
                    >
                      <div className={`text-xs truncate mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
                      <div
                        className="font-semibold"
                        style={{
                          fontSize: '1rem',
                          lineHeight: 1.2,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          color: item.label === 'Status' ? (workingHoursData.some(item => item.active) ? '#34D399' : '#EF4444') : (isDark ? '#ffffff' : '#111827')
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Temperature Trend */}

        <div className={`lg:col-span-2 rounded-xl p-6 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Temperature Trend</h3>
            <div className="flex items-center gap-3">
              <select
                value={temperatureTimeframe}
                onChange={(e) => setTemperatureTimeframe(e.target.value)}
                className={`text-xs px-4 py-2 rounded-lg outline-none cursor-pointer ${isDark ? 'bg-[#1F2937] text-gray-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              {temperatureTimeframe === 'daily' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={moment().format('YYYY-MM-DD')}
                  className={`text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer ${isDark ? 'bg-[#1F2937] text-gray-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}
                />
              )}
              {/* Info Icon for relay ON/OFF popup */}
              <button
                aria-label="Show relay ON/OFF info"
                className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none"
                onClick={() => setShowRelayInfo(true)}
                style={{ fontSize: 18 }}
              >
                <FontAwesomeIcon icon="info-circle" />
              </button>
            </div>
          </div>
        {/* Relay ON/OFF Info Popup */}
        {showRelayInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md w-full ${isDark ? 'bg-[#1F2537] text-white' : 'text-gray-900'}`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">AC Relay ON/OFF Intervals</h4>
                <button onClick={() => setShowRelayInfo(false)} className="text-gray-400 hover:text-red-500 text-xl">&times;</button>
              </div>
              <RelayIntervalsList dailyData={relayDailyData} />
            </div>
          </div>
        )}
// --- Relay ON/OFF Info State ---
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

// (All relay ON/OFF helpers and RelayIntervalsList are now above the component, not inside the render)

          {hideGraphs ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className={`text-lg mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>📊 Graph Access Restricted</div>
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Your organization does not have access to view graph data</div>
            </div>
          ) : temperatureLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? 'border-red-500' : 'border-red-600'}`}></div>
                Loading temperature data...
              </div>
            </div>
          ) : temperatureData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className={`text-lg mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No temperature data available</div>
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Try changing timeframe or check device connection</div>
            </div>
          ) : (
            <>
              {/* Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={temperatureData} margin={{ top: 20, right: 20, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke={isDark ? "#374151" : "#E5E7EB"} vertical={false} />
                  
                  <XAxis
                    dataKey="time"
                    tick={{ fill: isDark ? '#9CA3AF' : '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (temperatureTimeframe === 'daily') {
                        const hour = parseInt(value.split(':')[0]);
                        return hour % 3 === 0 ? value : '';
                      }
                      return value;
                    }}
                    height={30}
                  />
                  
                  <YAxis 
                    tick={{ fill: isDark ? '#9CA3AF' : '#6b7280', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => `${v}°C`}
                    width={50}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      border: isDark ? '1px solid #475569' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: isDark ? 'white' : 'black'
                    }}
                    formatter={(value) => `${Number(value).toFixed(2)}°C`}
                    labelFormatter={(label) => `Time: ${label}`}
                  />

                  <Line 
                    type="monotone"
                    dataKey="temperature" 
                    stroke="#F87171" 
                    strokeWidth={3}
                    dot={{ fill: '#F87171', r: 4 }}
                    activeDot={{ r: 7, fill: '#F87171', stroke: '#FFF', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* MATCHING SUMMARY CARDS — SAME AS ENERGY CHARTS */}
              <div className="mt-3 space-y-2">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Average', value: `${(() => {
                      const vals = temperatureData.map((d) => d.temperature).filter((v) => v != null);
                      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
                      return avg.toFixed(1);
                    })()}°C`, color: '#FB923C' },
                    { label: 'Minimum', value: `${(() => {
                      const vals = temperatureData.map((d) => d.temperature).filter((v) => v != null);
                      return (vals.length ? Math.min(...vals) : 0).toFixed(1);
                    })()}°C`, color: '#60A5FA' },
                    { label: 'Maximum', value: `${(() => {
                      const vals = temperatureData.map((d) => d.temperature).filter((v) => v != null);
                      return (vals.length ? Math.max(...vals) : 0).toFixed(1);
                    })()}°C`, color: '#F97316' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
                      style={{
                        background: isDark 
                          ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))'
                          : 'linear-gradient(180deg, rgba(243,244,246,0.95), rgba(229,231,235,0.9))',
                        border: `1px solid ${item.color}`,
                        boxSizing: 'border-box',
                        minHeight: 80,
                      }}
                    >
                      <div className={`text-xs truncate mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
                      <div
                        className="font-semibold"
                        style={{
                          fontSize: '1rem',
                          lineHeight: 1.2,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          color: item.label === 'Minimum' ? '#60A5FA' : item.label === 'Maximum' ? '#F97316' : (isDark ? '#ffffff' : '#111827')
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ────────────────────── BASELINE MODAL ────────────────────── */}
      {showBaselineModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F2537] p-5 rounded-lg w-full max-w-xs space-y-4">
            <h3 className="text-lg font-semibold text-indigo-400">
              Set Power Baseline
            </h3>

            {modalBaseline !== null && (
              <p className="text-xs text-gray-400 -mt-2">
                Current:{" "}
                <span className="text-indigo-300">{modalBaseline} kWh</span>
              </p>
            )}

            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Baseline (kWh)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 12.5"
                value={baselineInput ?? modalBaseline ?? ""}
                onChange={(e) => setBaselineInput(e.target.value)}
                className="w-full p-2 bg-[#11172A] text-white rounded text-sm border border-gray-600 focus:border-indigo-500 outline-none transition"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBaselineModal(false);
                  setBaselineInput("");
                  setBaselineStatus("idle");
                }}
                className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                Cancel
              </button>

              <button
                onClick={setBaselineFn}
                disabled={baselineStatus === "loading"}
                className={`
                  px-3 py-1.5 text-xs rounded font-medium transition
                  ${
                    baselineStatus === "loading"
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }
                  text-white
                `}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── SETTINGS POPUP ────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className={`rounded-xl shadow-lg w-full max-w-[600px] max-h-[90vh] overflow-y-auto p-6 ${isDark ? 'bg-[#11172A] text-white' : 'bg-white text-gray-900'}`}>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              MODBUS CONTROL SETTINGS
            </h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Configure Modbus communication and control parameters
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["OMA", "FMA", "TMV", "FMV", "FREQ", "FREQOFFSET"].map(
                (field) => (
                  <div key={field}>
                    <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {field === "FREQOFFSET" ? "Frequency Offset" : field}
                    </p>
                    <input
                      type="text"
                      value={modbusSettings[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className={`w-full rounded-md px-3 py-2 border transition focus:outline-none ${isDark ? 'bg-[#1F2A40] border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'}`}
                      placeholder={`Enter ${field}`}
                    />
                  </div>
                )
              )}

              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modbus Operation Mode</p>
                <button
                  onClick={handleRManMToggle}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${modbusSettings.rMan_M === 'ON' ? 'bg-green-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${isDark ? 'bg-white' : 'bg-gray-100'} ${modbusSettings.rMan_M === 'ON' ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Auto Mode</p>
                <button
                  onClick={() => {
                    setModbusSettings((prev) => ({
                      ...prev,
                      AUTO_M: prev.AUTO_M === "ON" ? "OFF" : "ON",
                    }));
                  }}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none ${modbusSettings.AUTO_M === 'ON' ? 'bg-green-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${isDark ? 'bg-white' : 'bg-gray-100'} ${modbusSettings.AUTO_M === 'ON' ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Smart Action</p>
                <button
                  onClick={() => {
                    setModbusSettings((prev) => ({
                      ...prev,
                      SMACTION: prev.SMACTION === "ON" ? "OFF" : "ON",
                    }));
                  }}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none ${modbusSettings.SMACTION === 'ON' ? 'bg-green-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${isDark ? 'bg-white' : 'bg-gray-100'} ${modbusSettings.SMACTION === 'ON' ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modbus Interval</p>
                <select
                  value={modbusSettings.rManINT_M}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${isDark ? 'bg-[#1F2A40] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`p-4 rounded-lg mt-6 space-y-4 ${isDark ? 'bg-[#1F2537]' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-green-500 rounded-full" />
                <h4 className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  Mode Settings
                </h4>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs uppercase ${isDark ? 'text-white' : 'text-gray-700'}`}>MAX (MXT)</span>
                <input
                  type="number"
                  value={modbusSettings.MXT}
                  onChange={(e) => handleInputChange("MXT", e.target.value)}
                  className={`flex-1 p-2 text-sm rounded border ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                  placeholder="70"
                />
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs uppercase ${isDark ? 'text-white' : 'text-gray-700'}`}>MIN (MNT)</span>
                <input
                  type="number"
                  value={modbusSettings.MNT}
                  onChange={(e) => handleInputChange("MNT", e.target.value)}
                  className={`flex-1 p-2 text-sm rounded border ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ms"
                  checked={modbusSettings.MS === "ON"}
                  onChange={(e) =>
                    setModbusSettings({
                      ...modbusSettings,
                      MS: e.target.checked ? "ON" : "OFF",
                    })
                  }
                  className={`w-5 h-5 text-green-600 rounded focus:ring-green-500 ${isDark ? 'bg-[#1F2537] border-gray-600' : 'bg-gray-100 border-gray-300'}`}
                />
                <label htmlFor="ms" className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  MS (Mode Switch)
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ts"
                  checked={modbusSettings.TS === "ON"}
                  onChange={(e) =>
                    setModbusSettings({
                      ...modbusSettings,
                      TS: e.target.checked ? "ON" : "OFF",
                    })
                  }
                  className={`w-5 h-5 text-green-600 rounded focus:ring-green-500 ${isDark ? 'bg-[#1F2537] border-gray-600' : 'bg-gray-100 border-gray-300'}`}
                />
                <label htmlFor="ts" className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  TS (Temperature Switch)
                </label>
              </div>
            </div>

            <div className="flex justify-end mt-8 gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className={`px-5 py-2 rounded-md text-sm font-medium transition ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className={`px-5 py-2 rounded-md text-sm font-medium transition ${isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <ScheduleManager
          onClose={() => {
            setShowScheduleModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Neonmodbus;
