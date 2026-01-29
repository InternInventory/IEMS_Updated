import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faSlidersH } from "@fortawesome/free-solid-svg-icons";
import moment from "moment-timezone";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import useAuthFetch from "../hooks/useAuthFetch";

const Libi3p = () => {
  const { did } = useParams();
  const decodedDid = did ? decodeURIComponent(did) : null;
  const authFetch = useAuthFetch();
  const navigate = useNavigate();

  // ==== UI STATE ====
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeLightId, setActiveLightId] = useState(1); // L1, L2, L3

  // ==== LIGHT STATE ====
  const [lights, setLights] = useState([
    { id: 1, name: "Light 1", isOn: true, autoMode: true, intensity: 80 },
    { id: 2, name: "Light 2", isOn: false, autoMode: true, intensity: 60 },
    { id: 3, name: "Light 3", isOn: true, autoMode: false, intensity: 90 },
  ]);

  const [outsideAuto, setOutsideAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [libData, setLibData] = useState(null);
  const [previousLibData, setPreviousLibData] = useState(null);
  const [currentTime, setCurrentTime] = useState(moment().format("hh:mm A z"));
  const [responseTopic, setResponseTopic] = useState("");

  // Command tracking and status messages
  const [pendingCommand, setPendingCommand] = useState(null);
  const [commandTimeout, setCommandTimeout] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [messageTimeout, setMessageTimeout] = useState(null);

  // ==== SETTINGS ====
  const [settings, setSettings] = useState({
    device_name: "",
    topic: "",
    global_auto: "ON",
    relay_interval: "5",
    default_state: "OFF",
    power_save: "OFF",
    motion_override: "OFF",
    motion_delay: "30",
    brightness_threshold: "50",
    operating_mode: "NORMAL",
  });

  const apiURL = import.meta.env.VITE_API_BASE_URL;

  // Check if user belongs to org_id 149 and hide graphs
  useEffect(() => {
    const checkOrgAccess = async () => {
      try {
        // First check localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
            console.log('🚫 Organization ID 149 detected - hiding all graphs (Libi3p)');
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
          console.log('🚫 Organization ID 149 detected from API - hiding all graphs (Libi3p)');
          setHideGraphs(true);
        }
      } catch (error) {
        console.error('Error checking org access:', error);
      }
    };
    
    checkOrgAccess();
  }, [apiURL, authFetch]);

  // ==== CHART STATES ====
  const [powerTimeframe, setPowerTimeframe] = useState("monthly");
  const [powerData, setPowerData] = useState([]);
  const [powerLoading, setPowerLoading] = useState(true);
  const [activeInactive, setActiveInactive] = useState({ active: '0.000', inactive: '0.000' });

  const [workingHoursTimeframe, setWorkingHoursTimeframe] = useState("monthly");
  const [workingHoursData, setWorkingHoursData] = useState([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(true);

  const [carbonTimeframe, setCarbonTimeframe] = useState("monthly");
  const [carbonData, setCarbonData] = useState([]);
  const [carbonLoading, setCarbonLoading] = useState(true);

  const [powerSavingTimeframe, setPowerSavingTimeframe] = useState("monthly");
  const [powerSavingData, setPowerSavingData] = useState([]);
  const [powerSavingLoading, setPowerSavingLoading] = useState(true);

  // Organization access control - hide graphs for org_id 149
  const [hideGraphs, setHideGraphs] = useState(false);

    // ── SETTINGS STATE (3-Phase) ────────────────────────────────────────
    const [showSettings, setShowSettings] = useState(false);
    const [operationModeR, setOperationModeR] = useState("OFF");   // rMan_R
    const [operationModeY, setOperationModeY] = useState("OFF");   // rMan_Y
    const [operationModeB, setOperationModeB] = useState("OFF");   // rMan_B
  const [autoModeR, setAutoModeR] = useState("OFF");           // AUTO_R
  const [autoModeY, setAutoModeY] = useState("OFF");           // AUTO_Y
  const [autoModeB, setAutoModeB] = useState("OFF");           // AUTO_B
  const [relayIntervalR, setRelayIntervalR] = useState("5");   // rManINT_R → string
  const [relayIntervalY, setRelayIntervalY] = useState("5");   // rManINT_Y → string
  const [relayIntervalB, setRelayIntervalB] = useState("5");   // rManINT_B → string
  const [motionControl, setMotionControl] = useState("OFF");  // MS

  // ==== DERIVED ====
  const activeLight = lights.find((l) => l.id === activeLightId) || lights[0];

  // ==== GLOW EFFECT ====
  const bulbGlow = {
    filter: activeLight.isOn ? `drop-shadow(0 0 12px rgba(251,191,36,0.7))` : "none",
    transform: activeLight.isOn ? `scale(1.05)` : "scale(0.98)",
    transition: "all 300ms ease",
  };

  // Show status message with auto-dismiss
  const showStatusMessage = (message, type = 'info') => {
    setStatusMessage({ message, type });
    if (messageTimeout) clearTimeout(messageTimeout);
    const timeout = setTimeout(() => {
      setStatusMessage(null);
      setMessageTimeout(null);
    }, 5000);
    setMessageTimeout(timeout);
  };

  // ==== API HELPERS ====
  const sendControlCommand = async (payload) => {
    // Store current state from libData before sending command
    const currentState = {
      relay_r: libData?.relay_r ?? lights[0].isOn ? 1 : 0,
      relay_y: libData?.relay_y ?? lights[1].isOn ? 1 : 0,
      relay_b: libData?.relay_b ?? lights[2].isOn ? 1 : 0,
      uiLights: [...lights],
    };
    
    setPendingCommand(currentState);
    
    // Set timeout to revert changes if no response after 10 seconds
    const timeout = setTimeout(() => {
      console.warn("Device command timeout - reverting changes");
      showStatusMessage('Device not reachable. Reverting changes...', 'error');
      setLights(currentState.uiLights);
      setPendingCommand(null);
      setCommandTimeout(null);
    }, 10000);
    
    setCommandTimeout(timeout);
    
    try {
      const topicId = libData?.topic || decodedDid || "lib";
      payload.topic = topicId;
      await authFetch({ url: `${apiURL}/deviceCommand`, method: "POST", data: payload });
    } catch (error) {
      console.error("API Error:", error);
      showStatusMessage('Command failed. Reverting changes...', 'error');
      // Revert on error
      setLights(currentState.uiLights);
      setPendingCommand(null);
      if (commandTimeout) {
        clearTimeout(commandTimeout);
        setCommandTimeout(null);
      }
    }
  };

  const sendSettingsCommand = async (settingsPayload) => {
    try {
      const topicId = libData?.topic || decodedDid || "lib";
      const payload = { topic: topicId, message: { SET_LIB: true, ...settingsPayload } };
      const res = await authFetch({ url: `${apiURL}/deviceCommand`, method: "POST", data: payload });
      if (res?.status === 200) updateAllLightsFromSettings(settingsPayload);
    } catch (error) {
      console.error("Settings API Error:", error);
    }
  };

  const updateAllLightsFromSettings = (newSettings) => {
    setLights((prev) =>
      prev.map((light) => ({
        ...light,
        autoMode: newSettings.global_auto === "ON",
        isOn: newSettings.global_auto === "ON" && newSettings.default_state === "ON",
      }))
    );
  };

  const savePhaseSettings = () => {
    const payload = {
      topic: libData?.topic || decodedDid,
      message: {
        rMan_R: operationModeR,
        rMan_Y: operationModeY,
        rMan_B: operationModeB,
        AUTO_R: autoModeR,
        AUTO_Y: autoModeY,
        AUTO_B: autoModeB,
        rManINT_R: Number(relayIntervalR),  // ← Fixed: Send number
        rManINT_Y: Number(relayIntervalY),  // ← Fixed: Send number
        rManINT_B: Number(relayIntervalB),  // ← Fixed: Send number
        MS: motionControl,
      },
    };
    sendControlCommand(payload);
    setShowSettings(false);
  };

  // ==== LIGHT CONTROL HANDLERS ====
  const handleToggleLight = (lightId) => {
    setLights((prev) =>
      prev.map((light) => {
        if (light.id === lightId) {
          const newState = !light.isOn;
          const message =
            lightId === 1
              ? { MANRELAY_R: newState ? "ON" : "OFF" }
              : lightId === 2
              ? { MANRELAY_Y: newState ? "ON" : "OFF" }
              : { MANRELAY_B: newState ? "ON" : "OFF" };
          sendControlCommand({ message });
          return { ...light, isOn: newState };
        }
        return light;
      })
    );
  };

  const handleToggleAutoMode = (lightId) => {
    setLights((prev) =>
      prev.map((light) => {
        if (light.id === lightId) {
          const newState = !light.autoMode;
          const message =
            lightId === 1
              ? { AUTO_R: newState ? "ON" : "OFF" }
              : lightId === 2
              ? { AUTO_Y: newState ? "ON" : "OFF" }
              : { AUTO_B: newState ? "ON" : "OFF" };
          sendControlCommand({ message });
          return { ...light, autoMode: newState };
        }
        return light;
      })
    );
  };

  const handleToggleOutsideAuto = () => setShowConfirm(true);
  const confirmToggleOutsideAuto = () => {
    setOutsideAuto((prev) => {
      const newState = !prev;
      sendControlCommand({
        message: {
          AUTO_R: newState ? "ON" : "OFF",
          AUTO_Y: newState ? "ON" : "OFF",
          AUTO_B: newState ? "ON" : "OFF",
          MANRELAY_R: newState ? "ON" : "OFF",
          MANRELAY_Y: newState ? "ON" : "OFF",
          MANRELAY_B: newState ? "ON" : "OFF",
        },
      });
      return newState;
    });
    setShowConfirm(false);
  };

  const setIntensityAndSend = (value) => {
    setLights((prev) =>
      prev.map((light) =>
        light.id === activeLightId ? { ...light, intensity: value } : light
      )
    );
    const message = { INTENSITY: value };
    sendControlCommand({ message });
  };

  // ==== FETCH DATA ====
  const fetchData = async () => {
    if (!decodedDid) return;
    setLoading(true);
    try {
      const res = await authFetch({
        url: `${apiURL}/location/lib-3p-data/${decodedDid}`,
        method: "GET",
      });
      const data = res.data;
      
      // Key fields to compare for detecting actual device state changes
      const currentStateKey = `${data.manrelay_r}-${data.manrelay_y}-${data.manrelay_b}-${data.auto_r}-${data.auto_y}-${data.auto_b}`;
      const previousStateKey = previousLibData ? 
        `${previousLibData.manrelay_r}-${previousLibData.manrelay_y}-${previousLibData.manrelay_b}-${previousLibData.auto_r}-${previousLibData.auto_y}-${previousLibData.auto_b}` : 
        null;
      
      // Check if timestamp changed (new data received)
      const timestampChanged = !previousLibData || data.created_at !== previousLibData.created_at;
      
      const dataChanged = currentStateKey !== previousStateKey;
      
      // If there's a pending command and we got new data (timestamp changed), clear the timeout
      if (pendingCommand && commandTimeout && timestampChanged) {
        console.log('Command successful - clearing timeout');
        clearTimeout(commandTimeout);
        setCommandTimeout(null);
        setPendingCommand(null);
      }
      
      if (dataChanged) {
        setLibData(data || null);
        setPreviousLibData(data);

        // ── LIGHT STATES (from top-level fields) ───────────────────────
        setLights([
          { id: 1, name: "Light 1", isOn: data.manrelay_r === "ON", autoMode: data.auto_r === "ON", intensity: 80 },
          { id: 2, name: "Light 2", isOn: data.manrelay_y === "ON", autoMode: data.auto_y === "ON", intensity: 60 },
          { id: 3, name: "Light 3", isOn: data.manrelay_b === "ON", autoMode: data.auto_b === "ON", intensity: 90 },
        ]);

        // ── GLOBAL SETTINGS (top-level) ───────────────────────────────
        setSettings({
          device_name: data.device_name || "",
          topic: data.topic || "",
          global_auto: data.global_auto || "ON",
          relay_interval: data.relay_interval || "5",
          default_state: data.default_state || "OFF",
          power_save: data.power_save || "OFF",
          motion_override: data.motion_override || "OFF",
          motion_delay: data.motion_delay || "30",
          brightness_threshold: data.brightness_threshold || "50",
          operating_mode: data.operating_mode || "NORMAL",
        });

        // ── PER-PHASE SETTINGS: ONLY FROM json_data ───────────────────
        const j = data.json_data || {};

        setOperationModeR(j.rMan_R ?? j.rman_r ?? "OFF");
        setOperationModeY(j.rMan_Y ?? j.rman_y ?? "OFF");
        setOperationModeB(j.rMan_B ?? j.rman_b ?? "OFF");
        setAutoModeR(j.AUTO_R ?? "OFF");
        setAutoModeY(j.AUTO_Y ?? "OFF");
        setAutoModeB(j.AUTO_B ?? "OFF");

        // ← FIXED: Parse as string for <select>
        setRelayIntervalR(String(j.rManINT_R ?? 5));
        setRelayIntervalY(String(j.rManINT_Y ?? 5));
        setRelayIntervalB(String(j.rManINT_B ?? 5));

        setMotionControl(j.MS ?? "OFF");
      } else {
        // Data hasn't changed, but update timestamp tracking
        if (timestampChanged) {
          setPreviousLibData(data);
        }
        // Update libData even if state unchanged (for other fields like current readings)
        // but only if there's no pending command
        if (!pendingCommand) {
          setLibData(data || null);
        }
      }
    } catch (err) {
      console.error("Error fetching LIB data:", err);
      setLibData(null);
    } finally {
      setLoading(false);
    }
  };

  // ==== CHART FETCHERS ====
  const fetchPowerData = async (tf, date = moment().format('YYYY-MM-DD')) => {
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

    setPowerLoading(true);
    try {
      // Map timeframe to backend endpoint format
      const timeframeMap = {
        'hourly': 'daily',
        'daily': 'daily',
        'weekly': 'monthly',
        'monthly': 'monthly',
        'yearly': 'yearly'
      };
      const mappedTimeframe = timeframeMap[tf] || 'daily';
      
      const response = await authFetch({
        url: `${apiURL}/device/${encodeURIComponent(decodedDid)}/hourly-usage/${mappedTimeframe}?date=${date}`,
        method: 'GET'
      });

      if (response.success && response.data) {
        // Transform data for 3-phase LIB device
        const transformedData = response.data.map(item => {
          const hour = new Date(item.period).getHours();
          return {
            time: tf === 'hourly' || tf === 'daily' ? `${hour.toString().padStart(2, '0')}:00` : item.period,
            period: item.period,
            R: Number(item.wh_r_diff || 0) / 1000, // Convert Wh to kWh
            Y: Number(item.wh_y_diff || 0) / 1000,
            B: Number(item.wh_b_diff || 0) / 1000
          };
        });
        
        setPowerData(transformedData);
        
        // Update active/inactive state
        if (response.active_inactive) {
          setActiveInactive({
            active: (response.active_inactive.active_hours_consumption / 1000).toFixed(3),
            inactive: (response.active_inactive.inactive_hours_consumption / 1000).toFixed(3)
          });
        }
      } else {
        setPowerData([]);
      }
    } catch (err) {
      console.error('Error fetching power data:', err);
      setPowerData([]);
    } finally {
      setPowerLoading(false);
    }
  };

  const fetchWorkingHours = async (tf) => {
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
      // COMMENTED OUT - Using dummy data
      // const res = await authFetch({ url: `${apiURL}/lib3p-get-working-hours/${decodedDid}/${tf}`, method: "GET" });
      // setWorkingHoursData(res.data || []);

      // DUMMY DATA - 3-phase working hours (Wh per phase)
      const dummyData = tf === "daily" ? [
        { period: "2025-11-17T00:00:00Z", R: 0, Y: 0, B: 0, is_working: false },
        { period: "2025-11-17T01:00:00Z", R: 0, Y: 0, B: 0, is_working: false },
        { period: "2025-11-17T02:00:00Z", R: 0, Y: 0, B: 0, is_working: false },
        { period: "2025-11-17T03:00:00Z", R: 0, Y: 0, B: 0, is_working: false },
        { period: "2025-11-17T04:00:00Z", R: 0, Y: 0, B: 0, is_working: false },
        { period: "2025-11-17T05:00:00Z", R: 0, Y: 0, B: 0, is_working: false },
        { period: "2025-11-17T06:00:00Z", R: 42, Y: 45, B: 40, is_working: true },
        { period: "2025-11-17T07:00:00Z", R: 48, Y: 52, B: 46, is_working: true },
        { period: "2025-11-17T08:00:00Z", R: 45, Y: 48, B: 43, is_working: true },
        { period: "2025-11-17T09:00:00Z", R: 35, Y: 38, B: 34, is_working: true },
        { period: "2025-11-17T10:00:00Z", R: 23, Y: 25, B: 22, is_working: true },
        { period: "2025-11-17T11:00:00Z", R: 18, Y: 20, B: 17, is_working: true },
        { period: "2025-11-17T12:00:00Z", R: 14, Y: 15, B: 13, is_working: true },
        { period: "2025-11-17T13:00:00Z", R: 16, Y: 18, B: 15, is_working: true },
        { period: "2025-11-17T14:00:00Z", R: 20, Y: 22, B: 19, is_working: true },
        { period: "2025-11-17T15:00:00Z", R: 30, Y: 32, B: 28, is_working: true },
        { period: "2025-11-17T16:00:00Z", R: 39, Y: 42, B: 37, is_working: true },
        { period: "2025-11-17T17:00:00Z", R: 52, Y: 55, B: 49, is_working: true },
        { period: "2025-11-17T18:00:00Z", R: 62, Y: 65, B: 58, is_working: true },
        { period: "2025-11-17T19:00:00Z", R: 67, Y: 70, B: 63, is_working: true },
        { period: "2025-11-17T20:00:00Z", R: 65, Y: 68, B: 61, is_working: true },
        { period: "2025-11-17T21:00:00Z", R: 59, Y: 62, B: 55, is_working: false },
        { period: "2025-11-17T22:00:00Z", R: 47, Y: 50, B: 45, is_working: false },
        { period: "2025-11-17T23:00:00Z", R: 33, Y: 35, B: 31, is_working: false },
      ] : [
        { period: "2025-11-10T00:00:00Z", R: 580, Y: 620, B: 550, is_working: true },
        { period: "2025-11-11T00:00:00Z", R: 640, Y: 680, B: 610, is_working: true },
        { period: "2025-11-12T00:00:00Z", R: 670, Y: 710, B: 640, is_working: true },
        { period: "2025-11-13T00:00:00Z", R: 655, Y: 695, B: 625, is_working: true },
        { period: "2025-11-14T00:00:00Z", R: 680, Y: 720, B: 650, is_working: true },
        { period: "2025-11-15T00:00:00Z", R: 515, Y: 550, B: 495, is_working: false },
        { period: "2025-11-16T00:00:00Z", R: 545, Y: 580, B: 520, is_working: false },
      ];
      setWorkingHoursData(dummyData);
    } catch (err) { setWorkingHoursData([]); } finally { setWorkingHoursLoading(false); }
  };

  const fetchCarbonData = async (tf) => {
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
      // COMMENTED OUT - Using dummy data
      // const res = await authFetch({ url: `${apiURL}/lib3p-carbon-footprint/${decodedDid}/${tf}`, method: "GET" });
      // setCarbonData(res.data || []);

      // DUMMY DATA - 3-phase carbon footprint (0.8 kg CO2 per kWh)
      const dummyData = tf === "daily" ? [
        { period: "2025-11-10T00:00:00Z", carbon_footprint_actual: 1.384 },
        { period: "2025-11-11T00:00:00Z", carbon_footprint_actual: 1.544 },
        { period: "2025-11-12T00:00:00Z", carbon_footprint_actual: 1.616 },
        { period: "2025-11-13T00:00:00Z", carbon_footprint_actual: 1.580 },
        { period: "2025-11-14T00:00:00Z", carbon_footprint_actual: 1.640 },
        { period: "2025-11-15T00:00:00Z", carbon_footprint_actual: 1.248 },
        { period: "2025-11-16T00:00:00Z", carbon_footprint_actual: 1.316 },
      ] : tf === "weekly" ? [
        { period: "2025-10-20T00:00:00Z", carbon_footprint_actual: 9.792 },
        { period: "2025-10-27T00:00:00Z", carbon_footprint_actual: 10.392 },
        { period: "2025-11-03T00:00:00Z", carbon_footprint_actual: 10.560 },
        { period: "2025-11-10T00:00:00Z", carbon_footprint_actual: 10.340 },
      ] : [
        { period: "2025-01-01T00:00:00Z", carbon_footprint_actual: 41.92 },
        { period: "2025-02-01T00:00:00Z", carbon_footprint_actual: 39.00 },
        { period: "2025-03-01T00:00:00Z", carbon_footprint_actual: 44.92 },
        { period: "2025-04-01T00:00:00Z", carbon_footprint_actual: 46.48 },
        { period: "2025-05-01T00:00:00Z", carbon_footprint_actual: 49.44 },
        { period: "2025-06-01T00:00:00Z", carbon_footprint_actual: 50.84 },
        { period: "2025-07-01T00:00:00Z", carbon_footprint_actual: 52.40 },
        { period: "2025-08-01T00:00:00Z", carbon_footprint_actual: 51.32 },
        { period: "2025-09-01T00:00:00Z", carbon_footprint_actual: 48.32 },
        { period: "2025-10-01T00:00:00Z", carbon_footprint_actual: 45.16 },
        { period: "2025-11-01T00:00:00Z", carbon_footprint_actual: 42.64 },
      ];
      setCarbonData(dummyData);
    } catch (err) { setCarbonData([]); } finally { setCarbonLoading(false); }
  };

  const fetchPowerSaving = async (tf) => {
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
      // COMMENTED OUT - Using dummy data
      // const res = await authFetch({ url: `${apiURL}/lib3p-power-saving/${decodedDid}/${tf}`, method: "GET" });
      // setPowerSavingData(res.data || []);

      // DUMMY DATA - 3-phase power savings (30% savings with smart control)
      const dummyData = tf === "daily" ? [
        { period: "2025-11-10T00:00:00Z", power_saved_kwh: 0.525, total_consumption_kwh: 1.750 },
        { period: "2025-11-11T00:00:00Z", power_saved_kwh: 0.579, total_consumption_kwh: 1.930 },
        { period: "2025-11-12T00:00:00Z", power_saved_kwh: 0.606, total_consumption_kwh: 2.020 },
        { period: "2025-11-13T00:00:00Z", power_saved_kwh: 0.592, total_consumption_kwh: 1.975 },
        { period: "2025-11-14T00:00:00Z", power_saved_kwh: 0.615, total_consumption_kwh: 2.050 },
        { period: "2025-11-15T00:00:00Z", power_saved_kwh: 0.468, total_consumption_kwh: 1.560 },
        { period: "2025-11-16T00:00:00Z", power_saved_kwh: 0.494, total_consumption_kwh: 1.645 },
      ] : tf === "weekly" ? [
        { period: "2025-10-20T00:00:00Z", power_saved_kwh: 3.672, total_consumption_kwh: 12.240 },
        { period: "2025-10-27T00:00:00Z", power_saved_kwh: 3.897, total_consumption_kwh: 12.990 },
        { period: "2025-11-03T00:00:00Z", power_saved_kwh: 3.960, total_consumption_kwh: 13.200 },
        { period: "2025-11-10T00:00:00Z", power_saved_kwh: 3.879, total_consumption_kwh: 12.925 },
      ] : [
        { period: "2025-01-01T00:00:00Z", power_saved_kwh: 15.72, total_consumption_kwh: 52.40 },
        { period: "2025-02-01T00:00:00Z", power_saved_kwh: 14.62, total_consumption_kwh: 48.75 },
        { period: "2025-03-01T00:00:00Z", power_saved_kwh: 16.84, total_consumption_kwh: 56.15 },
        { period: "2025-04-01T00:00:00Z", power_saved_kwh: 17.43, total_consumption_kwh: 58.10 },
        { period: "2025-05-01T00:00:00Z", power_saved_kwh: 18.54, total_consumption_kwh: 61.80 },
        { period: "2025-06-01T00:00:00Z", power_saved_kwh: 19.06, total_consumption_kwh: 63.55 },
        { period: "2025-07-01T00:00:00Z", power_saved_kwh: 19.65, total_consumption_kwh: 65.50 },
        { period: "2025-08-01T00:00:00Z", power_saved_kwh: 19.23, total_consumption_kwh: 64.15 },
        { period: "2025-09-01T00:00:00Z", power_saved_kwh: 18.12, total_consumption_kwh: 60.40 },
        { period: "2025-10-01T00:00:00Z", power_saved_kwh: 16.93, total_consumption_kwh: 56.45 },
        { period: "2025-11-01T00:00:00Z", power_saved_kwh: 15.99, total_consumption_kwh: 53.30 },
      ];
      setPowerSavingData(dummyData);
    } catch (err) { setPowerSavingData([]); } finally { setPowerSavingLoading(false); }
  };

  // ==== EFFECTS ====
  useEffect(() => {
    if (!decodedDid) return;
    // Only perform initial data fetch - no polling intervals for real-time data
    fetchData();
    
    // Keep time interval for UI clock only
    const timeInterval = setInterval(() => setCurrentTime(moment().format("hh:mm A z")), 1000);
    return () => { 
      clearInterval(timeInterval);
      // Clear command timeout on unmount
      if (commandTimeout) {
        clearTimeout(commandTimeout);
      }
      // Clear message timeout on unmount
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
    };
  }, [decodedDid, pendingCommand]);

  useEffect(() => {
    // Fetch analytics data immediately (using dummy data)
    fetchPowerData(powerTimeframe);
    fetchWorkingHours(workingHoursTimeframe);
    fetchCarbonData(carbonTimeframe);
    fetchPowerSaving(powerSavingTimeframe);
  }, [powerTimeframe, workingHoursTimeframe, carbonTimeframe, powerSavingTimeframe]);

  if (loading) return <div className="p-6 text-white">Loading…</div>;
  if (!libData) return <div className="p-6 text-red-400">Device not found</div>;

  return (
    <div className="p-6 min-h-screen bg-[#0a0f1c] text-white space-y-6 relative">
      {/* LOADING OVERLAY WHEN COMMAND PENDING */}
      {pendingCommand && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">Sending command to device...</p>
              <p className="text-sm text-gray-400 mt-1">Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MESSAGE */}
      {statusMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in ${
            statusMessage.type === 'success' ? 'bg-green-600 text-white' :
            statusMessage.type === 'error' ? 'bg-red-600 text-white' :
            statusMessage.type === 'warning' ? 'bg-yellow-600 text-white' :
            'bg-blue-600 text-white'
          }`}
        >
          {statusMessage.type === 'success' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {statusMessage.type === 'error' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {statusMessage.type === 'warning' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium">{statusMessage.message}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            className="ml-2 hover:opacity-75"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{libData?.device_name ?? "LIB 3P"}</h2>
        <div className="text-sm text-gray-400 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${libData?.online ? "bg-green-500" : "bg-red-500"}`} />
            <span className={libData?.online ? "text-green-400" : "text-red-400"}>
              {libData?.online ? "Online" : "Offline"}
            </span>
          </div>
          <div className="text-xs">
            Last Data: <span className="text-blue-400">
              {libData?.created_at
                ? moment.tz(libData.created_at, "UTC").tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm:ss A")
                : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LIBI CONTROL CARD */}
        <div className="lg:col-span-2 order-1 bg-[#11172A] p-6 rounded-xl flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-semibold">Light (LED)</h3>
              <p className="text-xs text-gray-400 mt-1">Outside lights off automatically on sunrise</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSettings(true)} className="p-2 bg-[#1F3C48] rounded-lg hover:bg-[#2a4d5a] transition-colors">
                <FontAwesomeIcon icon={faSlidersH} className="w-4 h-4 text-gray-300" />
              </button>
              <button
                onClick={() => {
                  const topic = libData?.topic || decodedDid || "lib";
                  const response = libData?.response || "response";
                  const deviceType = activeLightId === 1 ? "Relay" : activeLightId === 2 ? "IR" : "Modbus";
                  navigate("/lib3p/device/schedule", { state: { deviceType, topic, response, lightId: activeLightId } });
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="Set Schedule"
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 mt-4">
            <div className="flex flex-col items-center ml-20 gap-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <img src="../src/assets/img/image8.png" alt="LIB Bulb" style={bulbGlow} className={`w-24 h-24 transition-all duration-300 ${activeLight.isOn ? "" : "opacity-40 grayscale"}`} />
                {activeLight.isOn && (
                  <div style={{
                    position: "absolute",
                    width: 160, height: 160,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, rgba(251,191,36,${Math.min(0.35, activeLight.intensity / 300)}) 0%, rgba(13,18,36,0) 65%)`,
                  }} />
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-xl bg-[#0b1220] border border-[#16202a] w-28 flex flex-col items-center">
                <div className="text-[10px] text-gray-300 uppercase tracking-wide mb-1">Intensity</div>
                <div className="text-xs font-semibold mb-2">{activeLight.intensity}%</div>
                <div className="relative h-36 w-10 bg-gray-900 rounded-full overflow-hidden">
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    height: `${activeLight.intensity}%`,
                    background: "linear-gradient(to top, #f59e0b, #fbbf24)",
                    borderRadius: 9999, transition: "height 250ms ease",
                  }} />
                  <input type="range" min="0" max="100" value={activeLight.intensity} onChange={(e) => setIntensityAndSend(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((id) => {
              const light = lights.find((l) => l.id === id);
              return (
                <button
                  key={id}
                  onClick={() => setActiveLightId(id)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all
                    ${activeLightId === id ? (light?.isOn ? "bg-green-500 text-black" : "bg-red-500 text-white") : "bg-gray-700 text-gray-300"}
                  `}
                >
                  L{id}
                </button>
              );
            })}
          </div>

          <div className="flex justify-center gap-3 mt-4">
            <button onClick={() => handleToggleLight(activeLightId)} className={`px-4 py-1.5 rounded-full text-xs font-semibold shadow-md ${activeLight.isOn ? "bg-green-500 text-black" : "bg-red-500 text-white"}`}>
              {activeLight.isOn ? "On" : "Off"}
            </button>
            <button onClick={() => handleToggleAutoMode(activeLightId)} className={`px-4 py-1.5 rounded-full text-xs font-semibold shadow-md ${activeLight.autoMode ? "bg-blue-500 text-white" : "bg-gray-600 text-gray-300"}`}>
              {activeLight.autoMode ? "Auto" : "Manual"}
            </button>
            <button onClick={handleToggleOutsideAuto} className={`px-4 py-1.5 rounded-full text-xs font-semibold ${outsideAuto ? "bg-yellow-400 text-black" : "bg-gray-700 text-gray-300"}`}>
              Outside: {outsideAuto ? "On" : "Off"}
            </button>
          </div>
        </div>

        {/* POWER CONSUMPTION */}
        <div className="lg:col-span-2 order-2 bg-[#11172A] p-6 rounded-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Power Consumption</h3>
            <select value={powerTimeframe} onChange={(e) => setPowerTimeframe(e.target.value)} className="bg-[#1F2937] text-gray-300 text-xs px-3 py-2 rounded-lg outline-none cursor-pointer">
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {hideGraphs ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-gray-400 text-lg mb-2">📊 Graph Access Restricted</div>
              <div className="text-gray-500 text-sm">Your organization does not have access to view graph data</div>
            </div>
          ) : powerLoading ? (
            <div className="flex items-center justify-center h-64"><div className="text-white flex items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>Loading...</div></div>
          ) : powerData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-gray-400 text-lg mb-2">No Power Data Available</div>
              <div className="text-gray-500 text-sm">Power consumption data will appear here once available.</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={powerData.map(item => ({
                  time: moment(item.period).format(powerTimeframe === "hourly" ? "HH:mm" : powerTimeframe === "daily" ? "DD MMM" : powerTimeframe === "weekly" ? "DD MMM" : "MMM YYYY"),
                  R: item.R || 0,
                  Y: item.Y || 0,
                  B: item.B || 0,
                }))} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorYellow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kWh`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "6px", color: "#fff", fontSize: "12px" }}
                    formatter={(value, name) => [`${value} kWh`, name === "R" ? "Red" : name === "Y" ? "Yellow" : "Blue"]}
                    labelStyle={{ color: "#9CA3AF", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="R" stackId="1" stroke="#EF4444" fill="url(#colorRed)" name="R" />
                  <Area type="monotone" dataKey="Y" stackId="1" stroke="#F59E0B" fill="url(#colorYellow)" name="Y" />
                  <Area type="monotone" dataKey="B" stackId="1" stroke="#3B82F6" fill="url(#colorBlue)" name="B" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-700">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-300 font-medium">Red Phase</span>
                    </div>
                    <div className="text-lg font-semibold text-red-400">{powerData.reduce((sum, item) => sum + (item.R || 0), 0).toFixed(3)} kWh</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-300 font-medium">Yellow Phase</span>
                    </div>
                    <div className="text-lg font-semibold text-yellow-400">{powerData.reduce((sum, item) => sum + (item.Y || 0), 0).toFixed(3)} kWh</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-300 font-medium">Blue Phase</span>
                    </div>
                    <div className="text-lg font-semibold text-blue-400">{powerData.reduce((sum, item) => sum + (item.B || 0), 0).toFixed(3)} kWh</div>
                  </div>
                </div>
                
                {/* Active/Inactive Hours Display */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                  <div className="text-center rounded-lg p-3" style={{ background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))', border: '1px solid #10B981' }}>
                    <div className="text-xs text-gray-300 mb-2">Active Hours</div>
                    <div className="text-white font-semibold text-lg">{activeInactive.active} kWh</div>
                  </div>
                  <div className="text-center rounded-lg p-3" style={{ background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))', border: '1px solid #9CA3AF' }}>
                    <div className="text-xs text-gray-300 mb-2">Inactive Hours</div>
                    <div className="text-white font-semibold text-lg">{activeInactive.inactive} kWh</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* OTHER CHARTS */}
        <div className="lg:col-span-4 order-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Working Hours */}
          <div className="bg-[#11172A] p-6 rounded-xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Working Hours</h3>
              <select value={workingHoursTimeframe} onChange={(e) => setWorkingHoursTimeframe(e.target.value)} className="bg-[#1F2937] text-gray-300 text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer">
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </div>
            {hideGraphs ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-gray-400 text-lg mb-2">📊 Graph Access Restricted</div>
                <div className="text-gray-500 text-sm">Your organization does not have access to view graph data</div>
              </div>
            ) : workingHoursLoading ? (
              <div className="flex items-center justify-center h-64"><div className="text-white flex items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>Loading...</div></div>
            ) : workingHoursData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-gray-400 text-lg mb-2">No Data Yet</div>
                <div className="text-gray-500 text-sm">Working hours appear when the device consumes power.</div>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={workingHoursData.map(item => ({
                    time: moment(item.period).format(workingHoursTimeframe === "daily" ? "HH:mm" : "DD MMM"),
                    active: item.is_working ? (item.R + item.Y + item.B) : 0,
                    inactive: !item.is_working ? (item.R + item.Y + item.B) : 0,
                  }))} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} Wh`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "6px", color: "#fff" }}
                      formatter={(value, name) => [`${value} Wh`, name]}
                      labelFormatter={(l) => `Period: ${l}`}
                    />
                    <Bar dataKey="active" stackId="a" fill="#FB923C" radius={[4, 4, 0, 0]} name="Active" />
                    <Bar dataKey="inactive" stackId="a" fill="#4B5563" radius={[4, 4, 0, 0]} name="Inactive" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-8 mt-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-400">Total Energy</div>
                    <div className="text-xl font-bold text-orange-400">
                      {workingHoursData.reduce((s, d) => s + d.R + d.Y + d.B, 0)} Wh
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Active Energy</div>
                    <div className="text-xl font-bold text-green-400">
                      {workingHoursData.filter(d => d.is_working).reduce((s, d) => s + d.R + d.Y + d.B, 0)} Wh
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Carbon Footprint */}
          <div className="bg-[#11172A] p-6 rounded-xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Carbon Footprint</h3>
              <select value={carbonTimeframe} onChange={(e) => setCarbonTimeframe(e.target.value)} className="bg-[#1F2937] text-gray-300 text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer">
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </div>
            {hideGraphs ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-gray-400 text-lg mb-2">📊 Graph Access Restricted</div>
                <div className="text-gray-500 text-sm">Your organization does not have access to view graph data</div>
              </div>
            ) : carbonLoading ? (
              <div className="flex items-center justify-center h-64"><div className="text-white flex items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>Loading...</div></div>
            ) : carbonData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-gray-400 text-lg mb-2">No Carbon Data</div>
                <div className="text-gray-500 text-sm">Carbon footprint will appear once the device reports power usage.</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={carbonData.map(item => ({
                  day: moment(item.period).format(carbonTimeframe === "monthly" ? "MMM YYYY" : "DD MMM"),
                  co2: parseFloat(item.carbon_footprint_actual || 0),
                }))} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kg`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "6px", color: "#fff" }}
                    formatter={(v) => `${v.toFixed(2)} kg CO₂`}
                  />
                  <Line type="monotone" dataKey="co2" stroke="#3ef156ff" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Power Savings */}
          <div className="bg-[#11172A] p-6 rounded-xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Power Savings</h3>
              <select value={powerSavingTimeframe} onChange={(e) => setPowerSavingTimeframe(e.target.value)} className="bg-[#1F2937] text-gray-300 text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer">
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </div>
            {hideGraphs ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-gray-400 text-lg mb-2">📊 Graph Access Restricted</div>
                <div className="text-gray-500 text-sm">Your organization does not have access to view graph data</div>
              </div>
            ) : powerSavingLoading ? (
              <div className="flex items-center justify-center h-64"><div className="text-white flex items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>Loading...</div></div>
            ) : powerSavingData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-gray-400 text-lg mb-2">No Savings Data</div>
                <div className="text-gray-500 text-sm">Savings will appear once baseline is set and device reports usage.</div>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={powerSavingData.map(item => ({
                    label: moment(item.period).format(powerSavingTimeframe === "monthly" ? "MMM YYYY" : "DD MMM"),
                    saved: parseFloat(item.power_saved_kwh || 0),
                    used: parseFloat(item.total_consumption_kwh || 0),
                  }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, (dataMax) => Math.ceil(dataMax * 1.1)]} tickFormatter={(v) => `${v.toFixed(1)} kWh`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0F172B", border: "none", borderRadius: 6, color: "#E6EEF8" }}
                      labelStyle={{ color: "#9CA3AF", fontSize: 12 }}
                      itemStyle={{ color: "#E6EEF8" }}
                      formatter={(value, name) => typeof value === "number" ? (name === "saved" ? `${value.toFixed(2)} kWh saved` : `${value.toFixed(2)} kWh used`) : value}
                    />
                    <Bar dataKey="saved" stackId="a" fill="#06B6D4" radius={[0, 0, 4, 4]} name="Saved" />
                    <Bar dataKey="used" stackId="a" fill="#1E293B" radius={[4, 4, 0, 0]} name="Used" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-8 mt-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-400">Total Saved</div>
                    <div className="text-xl font-bold text-cyan-400">
                      {powerSavingData.reduce((s, d) => s + (d.power_saved_kwh || 0), 0).toFixed(2)} kWh
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Total Used</div>
                    <div className="text-xl font-bold text-gray-300">
                      {powerSavingData.reduce((s, d) => s + (d.total_consumption_kwh || 0), 0).toFixed(2)} kWh
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[#131c31] border border-[#1e293b] rounded-2xl shadow-2xl p-6 w-[90%] max-w-md text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Are you sure?</h2>
            <p className="text-gray-400 text-sm mb-6">You are about to toggle the Outside Auto mode for all lights.</p>
            <div className="flex justify-center gap-4">
              <button onClick={confirmToggleOutsideAuto} className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-full font-medium transition-all">Yes, Confirm</button>
              <button onClick={() => setShowConfirm(false)} className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-5 py-2 rounded-full font-medium transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL – PER-PHASE */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F2537] p-6 rounded-lg w-[460px] max-h-[90vh] overflow-y-auto border border-[#374151] shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-blue-400">LIB 3P Settings</h3>

            <div className="space-y-6">
              <div className="space-y-4">
                {/* Operation Mode (Per Phase) */}
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Operation Mode (Per Phase)</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div>
                      <label className="text-xs text-red-400">Operation_R</label>
                      <button
                        onClick={() => setOperationModeR(prev => (prev === "ON" ? "OFF" : "ON"))}
                        className="relative w-[60px] h-[26px] rounded-full border border-gray-500 flex items-center transition-all duration-300 mt-1"
                      >
                        <div
                          className="absolute w-[20px] h-[20px] rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: operationModeR === "ON" ? "#22C55E" : "#9EA3AB",
                            transform: operationModeR === "ON" ? "translateX(34px)" : "translateX(4px)",
                          }}
                        />
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-400">Operation_Y</label>
                      <button
                        onClick={() => setOperationModeY(prev => (prev === "ON" ? "OFF" : "ON"))}
                        className="relative w-[60px] h-[26px] rounded-full border border-gray-500 flex items-center transition-all duration-300 mt-1"
                      >
                        <div
                          className="absolute w-[20px] h-[20px] rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: operationModeY === "ON" ? "#22C55E" : "#9EA3AB",
                            transform: operationModeY === "ON" ? "translateX(34px)" : "translateX(4px)",
                          }}
                        />
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-blue-400">Operation_B</label>
                      <button
                        onClick={() => setOperationModeB(prev => (prev === "ON" ? "OFF" : "ON"))}
                        className="relative w-[60px] h-[26px] rounded-full border border-gray-500 flex items-center transition-all duration-300 mt-1"
                      >
                        <div
                          className="absolute w-[20px] h-[20px] rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: operationModeB === "ON" ? "#22C55E" : "#9EA3AB",
                            transform: operationModeB === "ON" ? "translateX(34px)" : "translateX(4px)",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Per-Phase Auto Mode */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-red-400">Auto Mode_R</label>
                    <button
  onClick={() => setAutoModeR(prev => prev === "ON" ? "OFF" : "ON")}
  className="relative w-[60px] h-[26px] rounded-full border border-gray-500 flex items-center transition-all duration-300 mt-1"
>
  <div
    className="absolute w-[20px] h-[20px] rounded-full transition-all duration-300"
    style={{
      backgroundColor: autoModeR === "ON" ? "#22C55E" : "#9EA3AB",
      transform: autoModeR === "ON" ? "translateX(34px)" : "translateX(4px)",
    }}
  />
</button>

                  </div>
                  <div>
                    <label className="text-xs text-yellow-400">Auto Mode_Y</label>
                    <button
  onClick={() => setAutoModeY(prev => prev === "ON" ? "OFF" : "ON")}
  className="relative w-[60px] h-[26px] rounded-full border border-gray-500 flex items-center transition-all duration-300 mt-1"
>
  <div
    className="absolute w-[20px] h-[20px] rounded-full transition-all duration-300"
    style={{
      backgroundColor: autoModeY === "ON" ? "#22C55E" : "#9EA3AB",
      transform: autoModeY === "ON" ? "translateX(34px)" : "translateX(4px)",
    }}
  />
</button>

                  </div>
                  <div>
                    <label className="text-xs text-blue-400">Auto Mode_B</label>
                    <button
  onClick={() => setAutoModeB(prev => prev === "ON" ? "OFF" : "ON")}
  className="relative w-[60px] h-[26px] rounded-full border border-gray-500 flex items-center transition-all duration-300 mt-1"
>
  <div
    className="absolute w-[20px] h-[20px] rounded-full transition-all duration-300"
    style={{
      backgroundColor: autoModeB === "ON" ? "#22C55E" : "#9EA3AB",
      transform: autoModeB === "ON" ? "translateX(34px)" : "translateX(4px)",
    }}
  />
</button>

                  </div>
                </div>

                {/* Relay Intervals */}
                <div className="space-y-3">
                  <label className="text-sm text-gray-300">Relay Interval (Minutes)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-red-400">Relay Interval_R</label>
                    
                      <select value={relayIntervalR} onChange={(e) => setRelayIntervalR(e.target.value)} className="w-full p-1.5 bg-[#11172A] text-white text-xs rounded border border-red-600 focus:border-red-400">
                        {[1, 2, 5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-400">Relay Interval_Y</label>
                      {/* Y */}
<select value={relayIntervalY} onChange={(e) => setRelayIntervalY(e.target.value)} className="w-full p-1.5 bg-[#11172A] text-white text-xs rounded border border-yellow-600 focus:border-yellow-400">
  {[1, 2, 5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v}</option>)}
</select>
                    </div>
                    <div>
                      <label className="text-xs text-blue-400">Relay Interval_B</label>
                      {/* B */}
<select value={relayIntervalB} onChange={(e) => setRelayIntervalB(e.target.value)} className="w-full p-1.5 bg-[#11172A] text-white text-xs rounded border border-blue-600 focus:border-blue-400">
  {[1, 2, 5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v}</option>)}
</select>
                    </div>
                  </div>
                </div>

                {/* Motion Control */}
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Motion Control (MS)</label>
                  <button
  onClick={() => setMotionControl(prev => prev === "ON" ? "OFF" : "ON")}
  className="relative w-[60px] h-[26px] rounded-full border border-gray-500 flex items-center transition-all duration-300"
>
  <div
    className="absolute w-[20px] h-[20px] rounded-full transition-all duration-300"
    style={{
      backgroundColor: motionControl === "ON" ? "#22C55E" : "#9EA3AB",
      transform: motionControl === "ON" ? "translateX(34px)" : "translateX(4px)",
    }}
  />
</button>

                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">Cancel</button>
              <button onClick={savePhaseSettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Libi3p;