import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import { getXAxisProps, getYAxisProps, getTooltipProps, getTickFormatter } from "../../utils/chartFormatting";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import {
  MdOutlinePeopleAlt,
  MdLaptop,
  MdLocationOn,
  MdPerson,
} from "react-icons/md";
import { CiLocationOn } from "react-icons/ci";
import { IoAlertCircleSharp } from "react-icons/io5";
import { FaMapMarkedAlt, FaListUl } from "react-icons/fa";
import GoogleMapComponentCD from "./GoogleMapComponentCD";
import ClientDashboardPDFReport from "./ClientDashboardPDFReport";
import Location from "../location/Location";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Label,
  ReferenceLine,
  ComposedChart,
  Area,
} from "recharts";
import "./dashboard.css";
import "../../assets/styles/common.css";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { useTheme } from "../../context/ThemeContext";

/* Reusable summary row used under multiple charts - compact & elegant */
const SummaryRow = ({ items = [] }) => {
  const { colors } = useTheme();
  
  return (
    <div
      className="mt-3"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
      }}
    >
      {items.map((it, idx) => (
        <div
          key={idx}
          className="rounded-lg p-2 flex items-center justify-between"
          style={{
            background: colors.card,
            border: `1px solid ${it.color || colors.border}`,
            boxSizing: 'border-box',
            minHeight: 72,
          }}
        >
          <div style={{ minWidth: 0 }} className="flex flex-col">
            <div className="text-xs truncate" style={{ maxWidth: 180, color: colors.textSecondary }}>{it.label}</div>
            {it.subtitle && (
              <div className="text-xxs mt-0.5 truncate" style={{ maxWidth: 180, color: colors.textTertiary }}>
                {it.subtitle}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, marginLeft: 8 }} className="text-right">
            <div
              className="font-semibold"
              style={{
                fontSize: it.large ? '1.15rem' : '0.98rem',
                lineHeight: 1.05,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                textAlign: 'right',
                color: colors.textPrimary,
              }}
            >
              {it.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* Two-row summary cards: Row 1 (Consumption, Baseline, Saved) + Row 2 (Active, Inactive) */
const SummaryCards = ({ consumption, baseline, saved, active, inactive, unit = 'kWh', savedLabel = 'Saved' }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  
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
          { label: savedLabel, value: saved, color: '#34D399' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' 
                : '#ffffff',
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className={`text-xs truncate mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
            <div
              className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              style={{
                fontSize: '1rem',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
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
              background: isDarkMode 
                ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' 
                : '#ffffff',
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className={`text-xs truncate mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
            <div
              className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              style={{
                fontSize: '1.15rem',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
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

const ClientDashboard = ({ title }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const clientId = useParams().clientId;
  const [showMapModal, setShowMapModal] = useState(false);
  const [locationView, setLocationView] = useState("map");
  const pdfGeneratorRef = useRef(null);

  /* ---------- POWER CONSUMPTION ---------- */
  const [powerData, setPowerData] = useState([]);
  const [totalPowerConsumption, setTotalPowerConsumption] = useState(0);
  const [timeframe, setTimeframe] = useState("daily"); // daily | weekly | monthly | yearly | custom
  const today = moment(); // current date
  const [selectedDate, setSelectedDate] = useState(
    timeframe === "monthly"
      ? today.format("YYYY-MM")
      : timeframe === "yearly"
      ? today.format("YYYY")
      : timeframe === "weekly"
      ? today.startOf("isoWeek").format("YYYY-MM-DD")
      : today.format("YYYY-MM-DD")
  );
  // For weekly, store week start date (Monday)
  const [selectedWeekStart, setSelectedWeekStart] = useState(today.startOf("isoWeek").format("YYYY-MM-DD"));
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  const handleCustomStartDateChange = (date) => {
    setCustomStartDate(date);
  };

  const handleCustomEndDateChange = (date) => {
    setCustomEndDate(date);
  };

  const [powerLoading, setPowerLoading] = useState(false);
  const [powerError, setPowerError] = useState(null);

  

  /* ---------- HOURLY USAGE ---------- */
  const [hourlyData, setHourlyData] = useState([]);
  const [apiHourlyResponse, setApiHourlyResponse] = useState(null);

  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyError, setHourlyError] = useState(null);

  /* ---------- OTHER CHARTS ---------- */
  const [devicesData, setDevicesData] = useState([]);
  const [savingData, setSavingData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [categoryCO2Data, setCategoryCO2Data] = useState([]);

  /* ---------- CUMULATIVE CHART DATA (for ComposedChart) ---------- */
  const [savingChartData, setSavingChartData] = useState([]);
  const [savingTotalBaseline, setSavingTotalBaseline] = useState(0);
  const [savingTotalActual, setSavingTotalActual] = useState(0);
  const [savingTotalSaved, setSavingTotalSaved] = useState(0);
  const [savingActiveHours, setSavingActiveHours] = useState(0);
  const [savingInactiveHours, setSavingInactiveHours] = useState(0);

  const [carbonChartData, setCarbonChartData] = useState([]);
  const [carbonTotalBaseline, setCarbonTotalBaseline] = useState(0);
  const [carbonTotalActual, setCarbonTotalActual] = useState(0);
  const [carbonTotalSaved, setCarbonTotalSaved] = useState(0);
  const [carbonActiveHours, setCarbonActiveHours] = useState(0);
  const [carbonInactiveHours, setCarbonInactiveHours] = useState(0);
  const [baselineData, setBaselineData] = useState(null);
const [baselineLoading, setBaselineLoading] = useState(false);
  /* ---------- CARBON FOOTPRINT ---------- */
  const [carbonData, setCarbonData] = useState([]);
  const [totalCarbonConsumption, setTotalCarbonConsumption] = useState(0);
  const [apiCarbonResponse, setApiCarbonResponse] = useState(null);
const [carbonLoading, setCarbonLoading] = useState(false);
 
  const [carbonError, setCarbonError] = useState(null);
  // Hover state for bars to improve visibility on dark background
  const [activePowerIndex, setActivePowerIndex] = useState(null);
  const [activeCarbonIndex, setActiveCarbonIndex] = useState(null);
  const [activeSavingIndex, setActiveSavingIndex] = useState(null);

  /* ---------- USER DETAILS ---------- */
  const [usersDetails, setUsersDetails] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const getAuthToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");


  /* ────── TOKEN VERIFICATION ────── */
  useEffect(() => {
    const verifyToken = async () => {
      const token = getAuthToken();
      if (!token) return navigate("/");
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        await axios.get(`${apiURL}/dashboard`, {
          headers: { authorization: token },
        });
        setLoading(false);
      } catch {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        navigate("/");
      }
    };
    verifyToken();
  }, [navigate]);

  /* ────── DASHBOARD SUMMARY CARDS ────── */
  useEffect(() => {
    if (loading || !clientId) return;
    const fetchSummary = async () => {
      const token = getAuthToken();
      if (!token) return setCards(defaultCards);
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const [dashboardData, usersData] = await Promise.all([
          axios.get(
            `${apiURL}/client-dashboard/${clientId}`,
            { headers: { authorization: token } }
          ).catch(err => {
            console.error("Dashboard fetch failed:", err);
            return { data: {} };
          }),
          axios.get(
            `${apiURL}/users-for-that-client/${clientId}`,
            { headers: { authorization: token } }
          ).catch(err => {
            console.error("Users fetch failed:", err);
            return { data: [] };
          }),
        ]);

        const data = dashboardData.data;
        const users = Array.isArray(usersData.data) ? usersData.data : usersData.data?.users || [];
        
        // Store users details for the user details section
        setUsersDetails(users);
        
        const updatedCards = [
          {
            label: "Active Sites",
            data: data.active_locations ?? "0",
            Icon: CiLocationOn,
            bgColor: "bg-orange-100",
            iconColor: "bg-orange-500",
          },
          {
            label: "Inactive Sites",
            data: data.inactive_locations ?? "0",
            Icon: MdLocationOn,
            bgColor: "bg-red-100",
            iconColor: "bg-red-500",
          },
          {
            label: "Total Devices",
            data: data.total_devices ?? "0",
            Icon: MdLaptop,
            bgColor: "bg-green-100",
            iconColor: "bg-green-500",
          },
          {
            label: "Total Users",
            data: users.length.toString(),
            Icon: MdPerson,
            bgColor: "bg-purple-100",
            iconColor: "bg-purple-500",
          },
          {
            label: "Total Alerts",
            data: data.alerts?.total_alerts ?? "0",
            Icon: IoAlertCircleSharp,
            bgColor: "bg-blue-100",
            iconColor: "bg-blue-500",
          },
          {
            label: "Critical Alerts",
            data: data.alerts?.critical_alerts ?? "0",
            Icon: IoAlertCircleSharp,
            bgColor: "bg-yellow-100",
            iconColor: "bg-yellow-500",
          },
        ];
        setCards(updatedCards);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setCards(defaultCards);
      }
    };
    fetchSummary();
  }, [loading, clientId]);

  useEffect(() => {
    if (loading || !clientId) return;

    const fetchPower = async () => {
      const token = getAuthToken();
      if (!token) return;

      setPowerLoading(true);
      setPowerError(null);

      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        let powerUrl;
        let params = {};

        if (timeframe === "daily") {
          powerUrl = `${apiURL}/client/${clientId}/power-consumption/daily`;
          params = { date: selectedDate }; // YYYY-MM-DD
        } else if (timeframe === "weekly") {
          powerUrl = `${apiURL}/client/${clientId}/power-consumption/weekly`;
          params = { date: selectedWeekStart };
        } else if (timeframe === "monthly") {
          powerUrl = `${apiURL}/client/${clientId}/power-consumption/monthly`;
          params = { month: selectedDate };
        } else if (timeframe === "yearly") {
          powerUrl = `${apiURL}/client/${clientId}/power-consumption/yearly`;
          params = { year: selectedDate };
        } else if (timeframe === "custom") {
          if (!customStartDate || !customEndDate) {
            setPowerData([]);
            return;
          }
          powerUrl = `${apiURL}/client/${clientId}/power-consumption/custom`;
          params = {
            start_date: moment(customStartDate).format("YYYY-MM-DD"),
            end_date: moment(customEndDate).format("YYYY-MM-DD"),
          };
        }

        const resp = await axios.get(powerUrl, {
          params,
          headers: { authorization: token },
        });

        const raw = resp?.data?.data || resp?.data || [];
        let formatted = [];

        if (timeframe === "daily") {
          const hourMap = new Map();
          raw.forEach((item) => {
            const timestamp = item.period || item.recorded_at;
            if (!timestamp) return;
            const date = new Date(timestamp);
            const hour = date.getUTCHours(); // 0–23
            const cur = hourMap.get(hour) || 0;
            const consumption = Number(
              item.total_consumption || item.total_power_consumption || 0
            );
            hourMap.set(hour, cur + consumption);
          });
          formatted = Array.from({ length: 24 }, (_, hour) => ({
            label: `${String(hour).padStart(2, "0")}:00`,
            kWh: Number((hourMap.get(hour) || 0).toFixed(2)),
          }));
        } else if (timeframe === "weekly") {
          // Group by day of week (Mon-Sun)
          const dayMap = new Map();
          raw.forEach(item => {
            const d = new Date(item.period || item.recorded_at);
            const key = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
            const val = Number(item.total_consumption || 0);
            dayMap.set(key, (dayMap.get(key) || 0) + val);
          });
          const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          formatted = weekDays.map((name, i) => ({
            label: name,
            kWh: Number((dayMap.get(i) || 0).toFixed(2)),
          }));
        } else if (timeframe === "monthly") {
          const [year, month] = selectedDate.split("-").map(Number);
          const dayMap = new Map();
          raw.forEach(item => {
            const d = new Date(item.period || item.recorded_at);
            if (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month) {
              const key = d.getUTCDate();
              const val = Number(item.total_consumption || 0);
              dayMap.set(key, (dayMap.get(key) || 0) + val);
            }
          });
          const daysInMonth = new Date(year, month, 0).getDate();
          formatted = Array.from({ length: daysInMonth }, (_, i) => ({
            label: moment(`${year}-${month}-${i + 1}`).format("DD MMM"),
            kWh: Number((dayMap.get(i + 1) || 0).toFixed(2)),
          }));
        } else if (timeframe === "yearly") {
          const monthMap = new Map();
          raw.forEach(item => {
            const m = new Date(item.period || item.recorded_at).getUTCMonth();
            const val = Number(item.total_consumption || 0);
            monthMap.set(m, (monthMap.get(m) || 0) + val);
          });
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          formatted = months.map((m, i) => ({
            label: m,
            kWh: Number((monthMap.get(i) || 0).toFixed(2)),
          }));
        } else if (timeframe === "custom") {
          const dayMap = new Map();
          raw.forEach(item => {
            const d = moment(item.period || item.recorded_at).format("YYYY-MM-DD");
            const val = Number(item.total_consumption || 0);
            dayMap.set(d, (dayMap.get(d) || 0) + val);
          });
          formatted = [...dayMap.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, val]) => ({
              label: moment(date).format("DD/MM"),
              kWh: Number(val.toFixed(2)),
            }));
        }

        setPowerData(formatted);
        // Calculate total power consumption from API response or formatted data
        const apiTotal = resp?.data?.total_power_consumption;
        if (apiTotal !== undefined && apiTotal !== null) {
          setTotalPowerConsumption(Number(apiTotal));
        } else {
          // Fallback: sum from formatted data
          const total = formatted.reduce((sum, item) => sum + (item.kWh || 0), 0);
          setTotalPowerConsumption(total);
        }
      } catch (err) {
        console.error(err);
        setPowerError("Failed to load power data");
        setTotalPowerConsumption(0);
      } finally {
        setPowerLoading(false);
      }
    };
    fetchPower();
  }, [loading, clientId, timeframe, selectedDate, selectedWeekStart, customStartDate, customEndDate]);


/* ────── HOURLY USAGE FETCH ────── */
useEffect(() => {
  // Only fetch hourly usage for daily timeframe
  if (loading || !clientId || timeframe !== "daily") {
    setHourlyData([]);
    setApiHourlyResponse(null);
    return;
  }
  
  const fetchHourly = async () => {
    const token = getAuthToken();
    if (!token) return;
    setHourlyLoading(true);
    setHourlyError(null);
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const params = { date: selectedDate }; // Already in YYYY-MM-DD format
      
      const { data } = await axios.get(
        `${apiURL}/client/${clientId}/hourly-usage/daily`,
        { 
          params,
          headers: { authorization: token } 
        }
      );
      setApiHourlyResponse(data);
      const raw = data?.hourly_data || [];
      
      // Create 24-hour array with proper data
      const hourMap = new Map();
      raw.forEach((item) => {
        const timestamp = item.period || item.recorded_at;
        if (timestamp) {
          const hourMatch = timestamp.match(/T(\d{2}):/);
          if (hourMatch) {
            const key = hourMatch[1];
            // Use total_power_consumption from API
            const consumption = Number(item.total_power_consumption || 0);
            hourMap.set(key, consumption);
          }
        }
      });
      
      // Ensure we have all 24 hours
      const formatted = Array.from({ length: 24 }, (_, i) => {
        const key = i.toString().padStart(2, "0");
        return {
          hour: `${key}:00`,
          usage: hourMap.get(key) || 0,
        };
      });
      
      setHourlyData(formatted);
    } catch (err) {
      console.error(err);
      setHourlyError("Failed to load hourly data");
    } finally {
      setHourlyLoading(false);
    }
  };
  fetchHourly();
}, [loading, clientId, selectedDate, timeframe]); // Added timeframe to dependencies

  /* ────── ALL CHART DATA FETCH ────── */
  useEffect(() => {
    if (loading || !clientId) return;
    const fetchAllChartData = async () => {
      const token = getAuthToken();
      if (!token) {
        console.warn("No token found");
        return;
      }
      setCarbonLoading(true);
      setCarbonError(null);
      const apiURL = import.meta.env.VITE_API_BASE_URL;

      // Build carbon URL with path parameter structure
      let carbonUrl, params;
      if (timeframe === "daily") {
        carbonUrl = `${apiURL}/client/${clientId}/carbonfootprint/daily`;
        params = { date: selectedDate }; // Already in YYYY-MM-DD format
      } 
      else if (timeframe === "weekly") {
        carbonUrl = `${apiURL}/client/${clientId}/carbonfootprint/weekly`;
        params = { date: selectedDate }; // Already in YYYY-MM-DD format
      }
      
      else if (timeframe === "yearly") {
        const year = selectedDate.split('-')[0];
        carbonUrl = `${apiURL}/client/${clientId}/carbonfootprint/yearly`;
        params = { year };
      } else if (timeframe === "custom") {
        if (!customStartDate || !customEndDate) return; // Don't fetch if dates not set
        carbonUrl = `${apiURL}/client/${clientId}/carbonfootprint/custom`;
        params = {
          start_date: moment(customStartDate).format('YYYY-MM-DD'),
          end_date: moment(customEndDate).format('YYYY-MM-DD')
        };
      } else {
        // monthly - selectedDate is already in YYYY-MM format
        carbonUrl = `${apiURL}/client/${clientId}/carbonfootprint/monthly`;
        params = { month: selectedDate };
      }

      try {
        const [devicesRes, carbonRes, sourceRes, catRes] = await Promise.all([
          axios.get(`${apiURL}/client/${clientId}/devices-listing`, {
            headers: { authorization: token },
          }).catch(err => {
            console.error("Devices fetch failed:", err.response?.status, err.message);
            return { data: [] };
          }),
          axios.get(carbonUrl, {
            params,
            headers: { authorization: token },
          }).catch(err => {
            console.error("Carbon fetch failed:", err.response?.status, err.message);
            throw err;
          }),
          
        ]);

        setApiCarbonResponse(carbonRes.data);
        const carbonArray = carbonRes.data?.data || [];
        const devicesArray = Array.isArray(devicesRes.data)
          ? devicesRes.data
          : devicesRes.data?.devices || [];

        const formattedCarbon = formatCarbonData(carbonArray);
        const formattedSaving = formatSavingData(carbonArray);
        const formattedDevices = formatDevicesData(devicesArray);

        setCarbonData(formattedCarbon);
        const totalCarbon = formattedCarbon.reduce((s, h) => s + (Number(h.value) || 0), 0);
        setTotalCarbonConsumption(totalCarbon);
        setSavingData(formattedSaving);
        setDevicesData(formattedDevices);
        setSourceData(formatSourceData(sourceRes.data));
        setCategoryCO2Data(formatCategoryCO2Data(catRes.data));
      } catch (err) {
        console.error("Chart fetch error:", err);
        setCarbonError(`Failed to load chart data: ${err.message}`);
      } finally {
        setCarbonLoading(false);
      }
    };
    fetchAllChartData();
  }, [loading, clientId, selectedDate, timeframe, customStartDate, customEndDate]);
/* ────── CUMULATIVE CHART DATA PROCESSING (Carbon Footprint) ────── */
useEffect(() => {
  if (!apiCarbonResponse?.data || apiCarbonResponse.data.length === 0) {
    setCarbonChartData([]);
    setCarbonTotalBaseline(0);
    setCarbonTotalActual(0);
    setCarbonTotalSaved(0);
    setCarbonActiveHours(0);
    setCarbonInactiveHours(0);
    return;
  }

  // Compute cumulative carbon for chart
  let cumulativeBaselineCarbon = 0;
  let cumulativeActualCarbon = 0;
  const dataArray = apiCarbonResponse.data;
  
  if (timeframe === "daily") {
  const hourMap = new Map();
  dataArray.forEach((item) => {
    const timestamp = item.period;
    if (timestamp) {
      const hourMatch = timestamp.match(/T(\d{2}):/);
      if (hourMatch) {
        hourMap.set(parseInt(hourMatch[1]), item);
      }
    }
  });

  const processedData = [];
  let cumulativeBaselineCarbon = 0;
  let cumulativeActualCarbon = 0;
  let lastValidHour = Math.max(...hourMap.keys());

  for (let h = 0; h <= lastValidHour; h++) {
    const item = hourMap.get(h);
    const baseline = Number(item?.baseline_carbon_kg || 0);
    const actual = Number(item?.current_carbon_kg || 0);

    cumulativeBaselineCarbon += baseline;
    cumulativeActualCarbon += actual;

    processedData.push({
      period: item?.period || null,
      label: `${String(h).padStart(2, '0')}:00`,
      baseline: cumulativeBaselineCarbon,
      actual: cumulativeActualCarbon,
      hasActual: !!item,
    });
  }
  setCarbonChartData(processedData);
}
else {
    // For monthly, yearly, or custom timeframes
    const processedData = dataArray.map((item) => {
      const baseline = Number(item.baseline_carbon_kg) || 0;
      const actual = Number(item.current_carbon_kg) || 0;
      
      cumulativeBaselineCarbon += baseline;
      cumulativeActualCarbon += actual;
      
      const timestamp = item.period;
      let label = '';
      
      if (timeframe === "monthly") {
        label = moment(timestamp).format("DD MMM");
      } else if (timeframe === "yearly") {
        label = moment(timestamp).format("MMM YYYY");
      } else if (timeframe === "custom") {
        label = moment(timestamp).format("DD MMM YYYY");
      } else {
        label = moment(timestamp).format("DD MMM YYYY");
      }
      
      return {
        period: timestamp,
        label,
        baseline: cumulativeBaselineCarbon,
        actual: cumulativeActualCarbon,
        status: item.status,
      };
    });
    
    setCarbonChartData(processedData);
  }

  // Compute summary totals from the API response
  const baseline = Number(apiCarbonResponse.baseline_consumption?.current_timeframe?.carbon_kg || 0);
  const actual = Number(apiCarbonResponse.current_consumption?.total_carbon_emission?.kg || 0);
  const saved = Number(apiCarbonResponse.savings?.carbon_saved?.kg || 0);

  setCarbonTotalBaseline(baseline);
  setCarbonTotalActual(actual);
  setCarbonTotalSaved(saved);
}, [apiCarbonResponse, timeframe, selectedDate, customStartDate, customEndDate]);

/* ────── CUMULATIVE CHART DATA PROCESSING (Energy Saving) ────── */
useEffect(() => {
  if (!apiCarbonResponse?.data || apiCarbonResponse.data.length === 0) {
    setSavingChartData([]);
    setSavingTotalBaseline(0);
    setSavingTotalActual(0);
    setSavingTotalSaved(0);
    setSavingActiveHours(0);
    setSavingInactiveHours(0);
    return;
  }

  // Compute cumulative energy for chart
  let cumulativeBaselineEnergy = 0;
  let cumulativeActualEnergy = 0;
  const dataArray = apiCarbonResponse.data;
  
 if (timeframe === "daily") {
  const hourMap = new Map();
  dataArray.forEach((item) => {
    const timestamp = item.period;
    if (!timestamp) return;
    const hourMatch = timestamp.match(/T(\d{2}):/);
    if (!hourMatch) return;
    const hour = parseInt(hourMatch[1]);
    hourMap.set(hour, item);
  });

  const processedData = [];
  let cumulativeBaselineEnergy = 0;
  let cumulativeActualEnergy = 0;

  // Find the last hour that has data
  const lastValidHour = hourMap.size > 0 ? Math.max(...hourMap.keys()) : 23;

  // Always create entries from 00:00 → lastValidHour (inclusive)
  for (let h = 0; h <= lastValidHour; h++) {
    const item = hourMap.get(h);
    const baseline = Number(item?.baseline_power_kwh || 0);
    const actual = Number(item?.current_power_kwh || 0);

    cumulativeBaselineEnergy += baseline;
    cumulativeActualEnergy += actual;

    processedData.push({
      period: item?.period || null,
      label: `${String(h).padStart(2, "0")}:00`,
      baseline: cumulativeBaselineEnergy,
      actual: cumulativeActualEnergy,
      hasActual: !!item,
    });
  }

  setSavingChartData(processedData);
}

else {
    // For monthly, yearly, or custom timeframes
    const processedData = dataArray.map((item) => {
      const baseline = Number(item.baseline_power_kwh) || 0;
      const actual = Number(item.current_power_kwh) || 0;
      
      cumulativeBaselineEnergy += baseline;
      cumulativeActualEnergy += actual;
      
      const timestamp = item.period;
      let label = '';
      
      if (timeframe === "monthly") {
        label = moment(timestamp).format("DD MMM");
      } else if (timeframe === "yearly") {
        label = moment(timestamp).format("MMM YYYY");
      } else if (timeframe === "custom") {
        label = moment(timestamp).format("DD MMM YYYY");
      } else {
        label = moment(timestamp).format("DD MMM YYYY");
      }
      
      return {
        period: timestamp,
        label,
        baseline: cumulativeBaselineEnergy,
        actual: cumulativeActualEnergy,
        status: item.status,
      };
    });
    
    setSavingChartData(processedData);
  }

  // Compute summary totals from the API response
  const baseline = Number(apiCarbonResponse.baseline_consumption?.current_timeframe?.power_kwh || 0);
  const actual = Number(apiCarbonResponse.current_consumption?.total_power_kwh || 0);
  const saved = Number(apiCarbonResponse.savings?.power_saved?.kwh || 0);

  setSavingTotalBaseline(baseline);
  setSavingTotalActual(actual);
  setSavingTotalSaved(saved);
}, [apiCarbonResponse, timeframe, selectedDate, customStartDate, customEndDate]);

  /* ────── FORMATTERS ────── */
  const formatDevicesData = (data) => {
    if (!Array.isArray(data)) return [];
    const counts = data.reduce((acc, device) => {
      const type = device.device_type?.replace("_device", "") || "Unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
    return Object.entries(counts).map(([name, count], i) => ({
      name: `${name.toUpperCase()} (${count})`,
      value: count,
      color: colors[i % colors.length],
    }));
  };

  const formatSavingData = (dataArray) => {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      if (timeframe === "monthly") {
        return [];
      }
      return Array.from({ length: 24 }, (_, h) => ({
        hour: h.toString().padStart(2, "0"),
        value: 0,
      }));
    }

    if (timeframe === "monthly") {
      // Group by day for monthly view
      const [selectedYear, selectedMonth] = selectedDate.split('-').map(Number);
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const dayMap = new Map();

      dataArray.forEach((item) => {
        const timestamp = item.period || item.recorded_at;
        const date = new Date(timestamp);
        const day = date.getUTCDate();
        const month = date.getUTCMonth() + 1;
        const year = date.getUTCFullYear();
        
        if (year === selectedYear && month === selectedMonth) {
          const key = day;
          const cur = dayMap.get(key) || 0;
          const savedKwh = parseFloat(item.power_saved_kwh) || 0;
          dayMap.set(key, cur + savedKwh);
        }
      });

      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dt = new Date(Date.UTC(selectedYear, selectedMonth - 1, day));
        return {
          hour: moment(dt).format('DD MMM YYYY'),
          value: dayMap.get(day) || 0,
        };
      });
    }

    if (timeframe === "yearly") {
      // Group by month for yearly view
      const monthMap = new Map();

      dataArray.forEach((item) => {
        const timestamp = item.period || item.recorded_at;
        const date = new Date(timestamp);
        const month = date.getUTCMonth(); // 0-11
        const cur = monthMap.get(month) || 0;
        const savedKwh = parseFloat(item.power_saved_kwh) || 0;
        monthMap.set(month, cur + savedKwh);
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.map((name, idx) => ({
        hour: name,
        value: monthMap.get(idx) || 0,
      }));
    }

    if (timeframe === "custom") {
      // Group by day for custom date range
      const dayMap = new Map();

      dataArray.forEach((item) => {
        const timestamp = item.period || item.recorded_at;
        const dateKey = moment(timestamp).format('YYYY-MM-DD');
        const cur = dayMap.get(dateKey) || 0;
        const savedKwh = parseFloat(item.power_saved_kwh) || 0;
        dayMap.set(dateKey, cur + savedKwh);
      });

      // Generate all dates in range
      const result = [];
      const start = moment(customStartDate);
      const end = moment(customEndDate);
      while (start.isSameOrBefore(end)) {
        const dateKey = start.format('YYYY-MM-DD');
        result.push({
          hour: start.format('DD MMM YYYY'),
          value: dayMap.get(dateKey) || 0,
        });
        start.add(1, 'day');
      }
      return result;
    }

    // For daily - group by hour
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h.toString().padStart(2, "0"),
      value: 0,
    }));

    dataArray.forEach((r) => {
      try {
        const timestamp = r.period || r.recorded_at;
        if (timestamp) {
          const hourMatch = timestamp.match(/T(\d{2}):/);
          if (hourMatch) {
            const hour = parseInt(hourMatch[1]);
            const savedKwh = parseFloat(r.power_saved_kwh) || 0;
            hourly[hour].value += savedKwh;
          }
        }
      } catch (e) {
        console.error("Saving parse error:", e);
      }
    });

    return hourly;
  };

  const formatCarbonData = (dataArray) => {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      if (timeframe === "monthly") {
        return [];
      }
      return Array.from({ length: 24 }, (_, h) => ({
        hour: h.toString().padStart(2, "0"),
        value: 0,
      }));
    }

    if (timeframe === "monthly") {
      // Group by day for monthly view
      const [selectedYear, selectedMonth] = selectedDate.split('-').map(Number);
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const dayMap = new Map();

      dataArray.forEach((item) => {
        const timestamp = item.period || item.recorded_at;
        const date = new Date(timestamp);
        const day = date.getUTCDate();
        const month = date.getUTCMonth() + 1;
        const year = date.getUTCFullYear();
        
        if (year === selectedYear && month === selectedMonth) {
          const key = day;
          const cur = dayMap.get(key) || 0;
          const carbonSaved = parseFloat(item.carbon_saved_kg) || 0;
          dayMap.set(key, cur + carbonSaved);
        }
      });

      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dt = new Date(Date.UTC(selectedYear, selectedMonth - 1, day));
        return {
          hour: moment(dt).format('DD MMM YYYY'),
          value: dayMap.get(day) || 0,
        };
      });
    }

    if (timeframe === "yearly") {
      // Group by month for yearly view
      const monthMap = new Map();

      dataArray.forEach((item) => {
        const timestamp = item.period || item.recorded_at;
        const date = new Date(timestamp);
        const month = date.getUTCMonth(); // 0-11
        const cur = monthMap.get(month) || 0;
        const carbonSaved = parseFloat(item.carbon_saved_kg) || 0;
        monthMap.set(month, cur + carbonSaved);
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.map((name, idx) => ({
        hour: name,
        value: monthMap.get(idx) || 0,
      }));
    }

    if (timeframe === "custom") {
      // Group by day for custom date range
      const dayMap = new Map();

      dataArray.forEach((item) => {
        const timestamp = item.period || item.recorded_at;
        const dateKey = moment(timestamp).format('YYYY-MM-DD');
        const cur = dayMap.get(dateKey) || 0;
        const carbonSaved = parseFloat(item.carbon_saved_kg) || 0;
        dayMap.set(dateKey, cur + carbonSaved);
      });

      // Generate all dates in range
      const result = [];
      const start = moment(customStartDate);
      const end = moment(customEndDate);
      while (start.isSameOrBefore(end)) {
        const dateKey = start.format('YYYY-MM-DD');
        result.push({
          hour: start.format('DD MMM YYYY'),
          value: dayMap.get(dateKey) || 0,
        });
        start.add(1, 'day');
      }
      return result;
    }

    // For daily - group by hour
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h.toString().padStart(2, "0"),
      value: 0,
    }));

    dataArray.forEach((r) => {
      try {
        const timestamp = r.period || r.recorded_at;
        if (timestamp) {
          const hourMatch = timestamp.match(/T(\d{2}):/);
          if (hourMatch) {
            const hour = parseInt(hourMatch[1]);
            const carbonSaved = parseFloat(r.carbon_saved_kg) || 0;
            hourly[hour].value += carbonSaved;
          }
        }
      } catch (e) {
        console.error("Carbon parse error:", e);
      }
    });

    return hourly;
  };

  const formatSourceData = (data) => {
    if (!data) {
      return [{ name: "Grid", value: 100, color: "#3b82f6" }];
    }
    if (Array.isArray(data)) {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
      return data.map((item, idx) => ({
        name: item.source || item.name || "Unknown",
        value: parseFloat(item.percentage || item.value || 0),
        color: colors[idx % colors.length],
      }));
    }
    return Object.entries(data).map(([key, value], idx) => ({
      name: key,
      value: parseFloat(value) || 0,
      color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][idx % 5],
    }));
  };

  const formatCategoryCO2Data = (data) => {
    if (!data) {
      return [{ name: "General", value: 100, color: "#3b82f6" }];
    }
    if (Array.isArray(data)) {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
      return data.map((item, idx) => ({
        name: item.category || item.name || "Unknown",
        value: parseFloat(item.co2_emission || item.value || 0),
        color: colors[idx % colors.length],
      }));
    }
    return Object.entries(data).map(([key, value], idx) => ({
      name: key,
      value: parseFloat(value) || 0,
      color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][idx % 5],
    }));
  };

  const defaultCards = [
    {
      label: "Active Sites",
      data: "0",
      Icon: CiLocationOn,
      bgColor: "bg-orange-100",
      iconColor: "bg-orange-500",
    },
    {
      label: "Inactive Sites",
      data: "0",
      Icon: MdLocationOn,
      bgColor: "bg-red-100",
      iconColor: "bg-red-500",
    },
    {
      label: "Total Devices",
      data: "0",
      Icon: MdLaptop,
      bgColor: "bg-green-100",
      iconColor: "bg-green-500",
    },
    {
      label: "Total Users",
      data: "0",
      Icon: MdPerson,
      bgColor: "bg-purple-100",
      iconColor: "bg-purple-500",
    },
    {
      label: "Total Alerts",
      data: "0",
      Icon: IoAlertCircleSharp,
      bgColor: "bg-blue-100",
      iconColor: "bg-blue-500",
    },
    {
      label: "Critical Alerts",
      data: "0",
      Icon: IoAlertCircleSharp,
      bgColor: "bg-yellow-100",
      iconColor: "bg-yellow-500",
    },
  ];

  const circleStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "50%",
  };

  const formatDisplayDate = () => {
    if (timeframe === "custom") {
      if (!customStartDate || !customEndDate) return "Select Date Range";
      return `${moment(customStartDate).format('DD MMM YYYY')} - ${moment(customEndDate).format('DD MMM YYYY')}`;
    }
    if (!selectedDate) return "";
    const date = moment(selectedDate);
    if (timeframe === "daily") {
      return date.format('DD MMM YYYY');
    } else if (timeframe === "yearly") {
      return date.format('YYYY');
    } else {
      return date.format('MMM YYYY');
    }
  };

  // Navigate when clicking card numbers
  const handleCardClick = async (label) => {
    // Map card labels to app routes (use App.jsx routes)
    switch (label) {
      case "Active Sites":
      case "Inactive Sites": {
        // Always fetch org_name for this clientId before navigating
        let orgName = null;
        try {
          const token = getAuthToken();
          const apiURL = import.meta.env.VITE_API_BASE_URL;
          const res = await axios.get(`${apiURL}/client`);
          if (Array.isArray(res.data)) {
            const client = res.data.find(c => String(c.clientId) === String(clientId));
            if (client) {
              orgName = client.org_name || client.clientName || null;
            }
          }
        } catch (err) {
          // fallback: do nothing
        }
        return navigate("/locations", { state: { clientId: clientId, org_name: orgName } });
      }
      case "Total Devices": {
        // Always fetch org_name for this clientId before navigating
        let orgName = null;
        try {
          const token = getAuthToken();
          const apiURL = import.meta.env.VITE_API_BASE_URL;
          const res = await axios.get(`${apiURL}/client`);
          if (Array.isArray(res.data)) {
            const client = res.data.find(c => String(c.clientId) === String(clientId));
            if (client) {
              orgName = client.org_name || client.clientName || null;
            }
          }
        } catch (err) {
          // fallback: try to get from cards if present
          if (cards && cards.length > 0 && cards[0].org_name) {
            orgName = cards[0].org_name;
          }
        }
        // fallback: just pass clientId if orgName not found
        return navigate("/devices", { state: { clientId: clientId, org_name: orgName } });
      }
      case "Total Users":
        return navigate(`/user?clientId=${clientId}`);
      case "Total Alerts":
      case "Critical Alerts":
        return navigate("/alert");
      default:
        return;
    }
  };

  /* ─────────────── EXCEL EXPORT FUNCTION (Beautiful & Structured) ─────────────── */
const exportClientReportToExcel = () => {
  if (
    !powerData.length &&
    !hourlyData.length &&
    !savingData.length &&
    !carbonData.length &&
    !devicesData.length
  ) {
    alert("No data available to export!");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Helper: Styled Header Row
  const addStyledHeader = (ws, headers, bgColor) => {
    const headerRow = headers.map(h => ({
      v: h,
      t: "s",
      s: {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: "center", vertical: "center" },
      },
    }));
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
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

  // 1. Power Consumption
  if (powerData.length > 0) {
    const powerSheet = powerData.map(d => ({
      Time: d.label,
      "Consumption (kWh)": Number(d.kWh || 0).toFixed(3),
    }));
    const ws = XLSX.utils.json_to_sheet(powerSheet);
    addStyledHeader(ws, ["Time", "Consumption (kWh)"], "FF22C55E"); // Green
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }];
    ws["!rows"] = [{ h: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, "Power Consumption");
  }

  // 2. Hourly Usage
  if (hourlyData.length > 0) {
    const hourlySheet = hourlyData.map(d => ({
      Hour: d.hour,
      "Usage (kWh)": Number(d.usage || 0).toFixed(3),
      "Peak Hour": d.isPeak ? "YES" : "NO",
    }));
    const ws = XLSX.utils.json_to_sheet(hourlySheet);
    addStyledHeader(ws, ["Hour", "Usage (kWh)", "Peak Hour"], "FFF97316"); // Orange
    ws["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 14 }];
    ws["!rows"] = [{ h: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, "Hourly Usage");
  }

  // 3. Energy Savings
  if (savingData.length > 0) {
    const savingSheet = savingData.map(d => ({
      Period: timeframe === "monthly" ? `Day ${d.hour}` : `Hour ${d.hour}:00`,
      "Saved (+) / Exceeded (-) (kWh)": Number(d.value || 0).toFixed(3),
    }));
    const ws = XLSX.utils.json_to_sheet(savingSheet);
    addStyledHeader(ws, ["Period", "Saved (+) / Exceeded (-) (kWh)"], "FF0891B2"); // Cyan
    ws["!cols"] = [{ wch: 20 }, { wch: 28 }];
    ws["!rows"] = [{ h: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, "Energy Savings");
  }

  // 4. Carbon Footprint
  if (carbonData.length > 0) {
    const carbonSheet = carbonData.map(d => ({
      Period: timeframe === "monthly" ? `Day ${d.hour}` : `Hour ${d.hour}:00`,
      "Carbon Saved (+) / Exceeded (-) (kg CO₂)": Number(d.value || 0).toFixed(3),
    }));
    const ws = XLSX.utils.json_to_sheet(carbonSheet);
    addStyledHeader(ws, ["Period", "Carbon Saved (+) / Exceeded (-) (kg CO₂)"], "FF6366F1"); // Indigo
    ws["!cols"] = [{ wch: 20 }, { wch: 32 }];
    ws["!rows"] = [{ h: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, "Carbon Footprint");
  }

  // 5. Devices Distribution
  if (devicesData.length > 0) {
    const deviceSheet = devicesData.map(d => ({
      "Device Type": d.name.replace(/ \(\d+\)$/, ""),
      "Count": d.value,
    }));
    const ws = XLSX.utils.json_to_sheet(deviceSheet);
    addStyledHeader(ws, ["Device Type", "Count"], "FFEC4899"); // Pink
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }];
    ws["!rows"] = [{ h: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, "Devices Distribution");
  }

  // 6. Summary Sheet (First Tab)
  const totalPower = powerData.reduce((s, d) => s + (d.kWh || 0), 0);
  const totalSavedKwh = savingData.reduce((s, d) => s + Math.max(d.value, 0), 0);
  const totalExceededKwh = Math.abs(savingData.reduce((s, d) => s + Math.min(d.value, 0), 0));
  const netSavingKwh = savingData.reduce((s, d) => s + d.value, 0);
  const netCarbon = carbonData.reduce((s, d) => s + d.value, 0);

  const summary = [
    { Metric: "Report Date", Value: moment().format("DD MMM YYYY, hh:mm A") },
    { Metric: "Selected Date", Value: formatDisplayDate() },
    { Metric: "Timeframe", Value: timeframe.charAt(0).toUpperCase() + timeframe.slice(1) },
    { Metric: "Total Power Consumed", Value: `${totalPower.toFixed(3)} kWh` },
    { Metric: "Net Energy Saved", Value: `${netSavingKwh.toFixed(3)} kWh` },
    { Metric: "Energy Saved (+)", Value: `${totalSavedKwh.toFixed(3)} kWh` },
    { Metric: "Energy Exceeded (-)", Value: `${totalExceededKwh.toFixed(3)} kWh` },
    { Metric: "Net Carbon Impact", Value: `${netCarbon.toFixed(3)} kg CO₂` },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  addStyledHeader(wsSummary, ["Metric", "Value"], "FF1E293B"); // Dark Slate
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // Save file
  const fileName = `Client_Report_${moment().format("YYYY-MM-DD_HHmm")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

  /* ─────────────── DOWNLOAD BOTH REPORTS IN ZIP ─────────────── */
  const downloadReportsAsZip = async () => {
    try {
      // Create a new JSZip instance
      const zip = new JSZip();
      
      // Generate Excel file
      if (
        !powerData.length &&
        !hourlyData.length &&
        !savingData.length &&
        !carbonData.length &&
        !devicesData.length
      ) {
        alert("No data available to export!");
        return;
      }

      const wb = XLSX.utils.book_new();

      // Helper: Styled Header Row
      const addStyledHeader = (ws, headers, bgColor) => {
        const headerRow = headers.map(h => ({
          v: h,
          t: "s",
          s: {
            font: { bold: true, color: { rgb: "FFFFFFFF" } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: "center", vertical: "center" },
          },
        }));
        XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
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

      // 1. Power Consumption
      if (powerData.length > 0) {
        const powerSheet = powerData.map(d => ({
          Time: d.label,
          "Consumption (kWh)": Number(d.kWh || 0).toFixed(3),
        }));
        const ws = XLSX.utils.json_to_sheet(powerSheet);
        addStyledHeader(ws, ["Time", "Consumption (kWh)"], "FF22C55E");
        ws["!cols"] = [{ wch: 18 }, { wch: 20 }];
        ws["!rows"] = [{ h: 28 }];
        XLSX.utils.book_append_sheet(wb, ws, "Power Consumption");
      }

      // 2. Hourly Usage
      if (hourlyData.length > 0) {
        const hourlySheet = hourlyData.map(d => ({
          Hour: d.hour,
          "Usage (kWh)": Number(d.usage || 0).toFixed(3),
          "Peak Hour": d.isPeak ? "YES" : "NO",
        }));
        const ws = XLSX.utils.json_to_sheet(hourlySheet);
        addStyledHeader(ws, ["Hour", "Usage (kWh)", "Peak Hour"], "FFF97316");
        ws["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 14 }];
        ws["!rows"] = [{ h: 28 }];
        XLSX.utils.book_append_sheet(wb, ws, "Hourly Usage");
      }

      // 3. Energy Savings
      if (savingData.length > 0) {
        const savingSheet = savingData.map(d => ({
          Period: timeframe === "monthly" ? `Day ${d.hour}` : `Hour ${d.hour}:00`,
          "Saved (+) / Exceeded (-) (kWh)": Number(d.value || 0).toFixed(3),
        }));
        const ws = XLSX.utils.json_to_sheet(savingSheet);
        addStyledHeader(ws, ["Period", "Saved (+) / Exceeded (-) (kWh)"], "FF0891B2");
        ws["!cols"] = [{ wch: 20 }, { wch: 28 }];
        ws["!rows"] = [{ h: 28 }];
        XLSX.utils.book_append_sheet(wb, ws, "Energy Savings");
      }

      // 4. Carbon Footprint
      if (carbonData.length > 0) {
        const carbonSheet = carbonData.map(d => ({
          Period: timeframe === "monthly" ? `Day ${d.hour}` : `Hour ${d.hour}:00`,
          "Carbon Saved (+) / Exceeded (-) (kg CO₂)": Number(d.value || 0).toFixed(3),
        }));
        const ws = XLSX.utils.json_to_sheet(carbonSheet);
        addStyledHeader(ws, ["Period", "Carbon Saved (+) / Exceeded (-) (kg CO₂)"], "FF6366F1");
        ws["!cols"] = [{ wch: 20 }, { wch: 32 }];
        ws["!rows"] = [{ h: 28 }];
        XLSX.utils.book_append_sheet(wb, ws, "Carbon Footprint");
      }

      // 5. Devices Distribution
      if (devicesData.length > 0) {
        const deviceSheet = devicesData.map(d => ({
          "Device Type": d.name.replace(/ \(\d+\)$/, ""),
          "Count": d.value,
        }));
        const ws = XLSX.utils.json_to_sheet(deviceSheet);
        addStyledHeader(ws, ["Device Type", "Count"], "FFEC4899");
        ws["!cols"] = [{ wch: 25 }, { wch: 15 }];
        ws["!rows"] = [{ h: 28 }];
        XLSX.utils.book_append_sheet(wb, ws, "Devices Distribution");
      }

      // 6. Summary Sheet
      const totalPower = powerData.reduce((s, d) => s + (d.kWh || 0), 0);
      const totalSavedKwh = savingData.reduce((s, d) => s + Math.max(d.value, 0), 0);
      const totalExceededKwh = Math.abs(savingData.reduce((s, d) => s + Math.min(d.value, 0), 0));
      const netSavingKwh = savingData.reduce((s, d) => s + d.value, 0);
      const netCarbon = carbonData.reduce((s, d) => s + d.value, 0);

      const summary = [
        { Metric: "Report Date", Value: moment().format("DD MMM YYYY, hh:mm A") },
        { Metric: "Selected Date", Value: formatDisplayDate() },
        { Metric: "Timeframe", Value: timeframe.charAt(0).toUpperCase() + timeframe.slice(1) },
        { Metric: "Total Power Consumed", Value: `${totalPower.toFixed(3)} kWh` },
        { Metric: "Net Energy Saved", Value: `${netSavingKwh.toFixed(3)} kWh` },
        { Metric: "Energy Saved (+)", Value: `${totalSavedKwh.toFixed(3)} kWh` },
        { Metric: "Energy Exceeded (-)", Value: `${totalExceededKwh.toFixed(3)} kWh` },
        { Metric: "Net Carbon Impact", Value: `${netCarbon.toFixed(3)} kg CO₂` },
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summary);
      addStyledHeader(wsSummary, ["Metric", "Value"], "FF1E293B");
      wsSummary["!cols"] = [{ wch: 30 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Convert workbook to binary and add to zip
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelFileName = `Client_Report_${moment().format("YYYY-MM-DD_HHmm")}.xlsx`;
      zip.file(excelFileName, excelBuffer);

      // Get PDF blob from the PDF generator component
      const pdfFileName = `Client_Report_${moment().format("YYYY-MM-DD_HHmm")}.pdf`;
      
      if (pdfGeneratorRef.current && typeof pdfGeneratorRef.current.generatePDFBlob === 'function') {
        const pdfBlob = await pdfGeneratorRef.current.generatePDFBlob();
        if (pdfBlob) {
          zip.file(pdfFileName, pdfBlob);
        }
      }

      // Generate and download the zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `Client_Reports_${moment().format("YYYY-MM-DD_HHmm")}.zip`;
      
      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error creating zip file:', error);
      alert('Failed to download reports. Please try again.');
    }
  };

  // ---- symmetric Y-axis for Energy Saving ----
  const savingPositiveValues = savingData.filter(d => d.value > 0).map(d => d.value);
  const savingNegativeValues = savingData.filter(d => d.value < 0).map(d => Math.abs(d.value));
  const maxPositiveSaving = savingPositiveValues.length > 0 ? Math.max(...savingPositiveValues) : 1;
  const maxNegativeSaving = savingNegativeValues.length > 0 ? Math.max(...savingNegativeValues) : 1;
  const savingDomainValue = Math.max(maxPositiveSaving, maxNegativeSaving) * 1.2;

  // ---- symmetric Y-axis for Carbon Footprint ----
  const carbonPositiveValues = carbonData.filter(d => d.value > 0).map(d => d.value);
  const carbonNegativeValues = carbonData.filter(d => d.value < 0).map(d => Math.abs(d.value));
  const maxPositiveCarbon = carbonPositiveValues.length > 0 ? Math.max(...carbonPositiveValues) : 0.1;
  const maxNegativeCarbon = carbonNegativeValues.length > 0 ? Math.max(...carbonNegativeValues) : 0.1;
  const carbonDomainValue = Math.max(maxPositiveCarbon, maxNegativeCarbon) * 1.2;

  // Fallback: if baselineData exists but derived chart arrays are not yet populated,
  // build cumulative display arrays directly from baselineData.data so charts render immediately.
  const fallbackCarbonData = (() => {
    if (!baselineData?.data || !Array.isArray(baselineData.data)) return [];
    let cumBase = 0;
    let cumAct = 0;
      return baselineData.data.map((item) => {
      const ts = item.period || item.recorded_at;
      const hourLabel = timeframe === "daily"
        ? (ts && ts.match(/T(\d{2}):/) ? `${ts.match(/T(\d{2}):/)[1]}:00` : "00:00")
        : moment(ts).format('DD MMM YYYY');
      const base = parseFloat(item.baseline_carbon_kg || item.baseline_carbon || 0) || 0;
      const curr = parseFloat(item.current_carbon_kg || item.current_carbon || 0) || 0;
      cumBase += base;
      cumAct += curr;
      return {
        label: hourLabel,
        baseline: cumBase,
        actual: cumAct,
        status: item.status,
      };
    });
  })();

  const fallbackSavingData = (() => {
    if (!baselineData?.data || !Array.isArray(baselineData.data)) return [];
    let cumBase = 0;
    let cumAct = 0;
    return baselineData.data.map((item) => {
      const ts = item.period || item.recorded_at;
      const hourLabel = timeframe === "daily"
        ? (ts && ts.match(/T(\d{2}):/) ? `${ts.match(/T(\d{2}):/)[1]}:00` : "00:00")
        : moment(ts).format('DD MMM YYYY');
      const base = parseFloat(item.baseline_power_kwh || item.baseline_power || 0) || 0;
      const curr = parseFloat(item.current_power_kwh || item.current_power || 0) || 0;
      cumBase += base;
      cumAct += curr;
      return {
        label: hourLabel,
        baseline: cumBase,
        actual: cumAct,
        status: item.status,
      };
    });
  })();

// Helper to extract active/inactive values from API responses.
const extractActiveInactive = (resp, activeKey, inactiveKey) => {
  if (!resp?.active_inactive) return null;
  const ai = resp.active_inactive;
  if (ai[activeKey] === undefined && ai[inactiveKey] === undefined) return null;
  const active = Number(ai[activeKey] ?? 0);
  const inactive = Number(ai[inactiveKey] ?? 0);
  return { active, inactive };
};

// Update the useMemo hooks for hourly calculations (use API when available, otherwise compute client-side)
const hourlyActiveTotal = useMemo(() => {
  const vals = extractActiveInactive(apiHourlyResponse, 'active_hours_consumption', 'inactive_hours_consumption');
  if (vals) return vals.active;

  // Fallback: Calculate from hourly data array
  const arr = apiHourlyResponse?.hourly_data || [];
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((sum, item) => {
    const ts = item.recorded_at;
    if (!ts) return sum;
    const hourMatch = ts.match(/T(\d{2}):/);
    if (!hourMatch) return sum;
    const hour = parseInt(hourMatch[1]);
    const val = Number(item.total_power_consumption || 0) || 0;
    return sum + (hour >= 8 && hour < 20 ? val : 0);
  }, 0);
}, [apiHourlyResponse]);

const hourlyInactiveTotal = useMemo(() => {
  const vals = extractActiveInactive(apiHourlyResponse, 'active_hours_consumption', 'inactive_hours_consumption');
  if (vals) return vals.inactive;

  // Fallback: Client-side calculation
  const arr = apiHourlyResponse?.hourly_data || [];
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((sum, item) => {
    const ts = item.recorded_at;
    if (!ts) return sum;
    const hourMatch = ts.match(/T(\d{2}):/);
    if (!hourMatch) return sum;
    const hour = parseInt(hourMatch[1]);
    const val = Number(item.total_power_consumption || 0) || 0;
    return sum + (hour < 8 || hour >= 20 ? val : 0);
  }, 0);
}, [apiHourlyResponse]);

// Compute carbon active/inactive totals with IST conversion
const carbonActiveTotal = useMemo(() => {
  const vals = extractActiveInactive(apiCarbonResponse, 'active_hours_carbon_kg', 'inactive_hours_carbon_kg');
  if (vals) return vals.active;

  // Fallback: Client-side calculation
  const arr = apiCarbonResponse?.data || [];
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((s, it) => {
    const ts = it.period;
    if (!ts) return s;
    const hourMatch = ts.match(/T(\d{2}):/);
    if (!hourMatch) return s;
    const hour = parseInt(hourMatch[1]);
    const val = Number(it.current_carbon_kg || 0) || 0;
    return s + (hour >= 8 && hour < 20 ? val : 0);
  }, 0);
}, [apiCarbonResponse]);

const carbonInactiveTotal = useMemo(() => {
  const vals = extractActiveInactive(apiCarbonResponse, 'active_hours_carbon_kg', 'inactive_hours_carbon_kg');
  if (vals) return vals.inactive;

  // Fallback: Client-side calculation
  const arr = apiCarbonResponse?.data || [];
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((s, it) => {
    const ts = it.period;
    if (!ts) return s;
    const hourMatch = ts.match(/T(\d{2}):/);
    if (!hourMatch) return s;
    const hour = parseInt(hourMatch[1]);
    const val = Number(it.current_carbon_kg || 0) || 0;
    return s + (hour < 8 || hour >= 20 ? val : 0);
  }, 0);
}, [apiCarbonResponse]);

// Compute energy active/inactive totals with IST conversion
const energyActiveTotal = useMemo(() => {
  const vals = extractActiveInactive(apiCarbonResponse, 'active_hours_consumption', 'inactive_hours_consumption');
  if (vals) return vals.active;

  // Fallback: Client-side calculation
  const arr = apiCarbonResponse?.data || [];
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((s, it) => {
    const ts = it.period;
    if (!ts) return s;
    const hourMatch = ts.match(/T(\d{2}):/);
    if (!hourMatch) return s;
    const hour = parseInt(hourMatch[1]);
    const val = Number(it.current_power_kwh || 0) || 0;
    return s + (hour >= 8 && hour < 20 ? val : 0);
  }, 0);
}, [apiCarbonResponse]);

const energyInactiveTotal = useMemo(() => {
  const vals = extractActiveInactive(apiCarbonResponse, 'active_hours_consumption', 'inactive_hours_consumption');
  if (vals) return vals.inactive;

  // Fallback: Client-side calculation
  const arr = apiCarbonResponse?.data || [];
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((s, it) => {
    const ts = it.period;
    if (!ts) return s;
    const hourMatch = ts.match(/T(\d{2}):/);
    if (!hourMatch) return s;
    const hour = parseInt(hourMatch[1]);
    const val = Number(it.current_power_kwh || 0) || 0;
    return s + (hour < 8 || hour >= 20 ? val : 0);
  }, 0);
}, [apiCarbonResponse]);

  // Common axis styles to keep X/Y axes consistent across charts
  const commonXAxisProps = getXAxisProps(timeframe, true);

  const commonYAxisProps = getYAxisProps(true, 'kWh');

  if (loading)
    return (
      <div className="text-white text-center pt-10">Loading...</div>
    );

  return (
    <div
      className={`component-body ${
        isDarkMode
          ? 'text-white bg-transparent'
          : 'text-black'
      }`}
      style={
        isDarkMode
          ? {}
          : { backgroundColor: '#f0f2f5' }
      }
    >
      <div><h1 className="page-header select-none">{title}</h1></div>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 w-full mb-2">
        {cards.map((c, i) => (
          <div key={i} className="w-full">
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(c.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCardClick(c.label);
              }}
              className={`rounded-xl cursor-pointer transition-all duration-300 shadow-md hover:shadow-2xl h-full w-full flex items-center justify-between ${
                isDarkMode ? 'bg-[#0F172B] border border-[#1e293b]' : 'bg-white'
              }`}
              style={{ minHeight: '120px', padding: '30px', mt : '1px' }}
            >
              {/* Left side - Value and Label */}
              <div className="flex flex-col justify-center">
                <div className={`text-4xl text-center font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {c.data}
                </div>
                <span className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {c.label}
                </span>
              </div>
              
              {/* Right side - Icon */}
              <div className="flex-shrink-0">
                {c.Icon && <c.Icon className="w-12 h-12" style={{ color: c.iconColor?.replace('bg-red-500', '#ef4444').replace('bg-orange-500', '#f97316').replace('bg-green-500', '#22c55e').replace('bg-purple-500', '#a855f7').replace('bg-blue-500', '#3b82f6').replace('bg-yellow-500', '#eab308') }} />}
              </div>
            </div>
          </div>
        ))}
      </div>
      

      {/* Energy Matrix Section */}
      <div className={`w-full ${isDarkMode ? 'bg-[#0F172B] text-white border-[#1e293b]' : 'bg-white text-black border-gray-200'} rounded-xl border p-6 mb-4`}>
        <div className="relative flex justify-between items-center mb-6">
          {/* Left: Title */}
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
            </svg>
            Energy Metrics
          </h2>
          
          {/* Center: Filters */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
            {/* Timeframe Selector */}
            <div className={`inline-flex rounded-lg ${isDarkMode ? 'bg-[#1e293b]' : 'bg-gray-100'} p-1`}>
              {["daily", "weekly", "monthly", "yearly"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    if (tf === "daily") {
                      setSelectedDate(moment().format("YYYY-MM-DD"));
                    } else if (tf === "monthly") {
                      setSelectedDate(moment().format("YYYY-MM"));
                        } else if (tf === "weekly") {
                      setSelectedDate(moment().format("YYYY-MM-DD"));
                    } else if (tf === "yearly") {
                      setSelectedDate(moment().format("YYYY"));
                    }
                  }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeframe === tf
                      ? isDarkMode
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-blue-600 shadow-sm"
                      : isDarkMode
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tf.charAt(0).toUpperCase() + tf.slice(1)}
                </button>
              ))}
            </div>

            {/* Date Picker */}
            <div className="relative flex items-center">
              {timeframe === "daily" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={moment().format('YYYY-MM-DD')}
                  className={`px-3 py-1.5 pr-10 rounded border text-sm font-medium w-[120px] focus:outline-none ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                      : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                  }`}
                />
              )}
              {timeframe === "weekly" && (
                <input
                  type="date"
                  value={selectedWeekStart}
                  onChange={(e) => setSelectedWeekStart(e.target.value)}
                  max={moment().format('YYYY-MM-DD')}
                  className={`px-3 py-1.5 pr-10 rounded border text-sm font-medium w-[120px] focus:outline-none ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                      : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                  }`}
                />
              )}
              {timeframe === "monthly" && (
                <DatePicker
                  selected={selectedDate ? moment(selectedDate + '-01', 'YYYY-MM-DD').toDate() : null}
                  onChange={(date) => setSelectedDate(date ? moment(date).format('YYYY-MM') : '')}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  maxDate={moment().toDate()}
                  className={`px-3 py-1.5 pr-10 rounded border text-sm font-medium w-[120px] focus:outline-none ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                      : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                  }`}
                />
              )}
              {timeframe === "yearly" && (
                <input
                  type="number"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min="2020"
                  max={moment().format('YYYY')}
                  placeholder="Year"
                  className={`px-3 py-1.5 pr-10 rounded border text-sm font-medium w-[120px] focus:outline-none ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                      : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                  }`}
                />
              )}
              <svg 
                className="absolute right-3 text-gray-400 cursor-pointer pointer-events-none" 
                width="16" 
                height="16" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Right: Download Reports Button */}
          <div className="flex gap-3">
            {/* Hidden PDF component for generating PDF */}
            <div style={{ display: 'none' }}>
              <ClientDashboardPDFReport
                ref={pdfGeneratorRef}
                clientId={clientId}
                clientName={title}
                cards={cards}
                powerData={powerData}
                hourlyData={hourlyData}
                savingChartData={savingChartData}
                carbonChartData={carbonChartData}
                apiCarbonResponse={apiCarbonResponse}
                timeframe={timeframe}
                selectedDate={selectedDate}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
              />
            </div>
            <button
              onClick={downloadReportsAsZip}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg ${
                isDarkMode
                  ? 'bg-[#76df23] hover:bg-[#5cb91e] text-white'
                  : 'bg-[#76df23] hover:bg-[#5cb91e] text-white'
              }`}
              title="Download PDF and Excel Reports"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Reports
            </button>
          </div>
        </div>

        {/* Energy Metrics Summary Cards */}
        {apiCarbonResponse && (
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-4">
              {/* Power Consumed */}
              <div className={`rounded-lg p-4 border shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-white border-blue-500'}`}>
                <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                  </svg>
                  Power Consumed
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {parseFloat(apiCarbonResponse.current_consumption?.total_power_kwh || 0).toFixed(2)} kWh
                </div>
              </div>

              {/* Energy Baseline */}
              <div
  className={`rounded-lg p-4 border shadow-lg ${
    isDarkMode
      ? 'bg-gradient-to-br from-[#2d1f1a] to-[#1a1310] border-orange-500/30'
      : 'bg-gradient-to-br from-orange-50 to-white border-orange-500'
  }`}
>
  {/* Header */}
  <div
    className={`text-xs mb-2 flex items-center gap-0 ${
      isDarkMode ? 'text-gray-400' : 'text-gray-600'
    }`}
  >
    <div
      className={`p-1.5 rounded-full ${
        isDarkMode ? '' : ''
      }`}
    >
      <svg
        className="w-4 h-4 text-orange-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </div>
    Energy Consumption Baseline
  </div>

  {/* Value */}
  <div
    className={`text-2xl font-bold ${
      isDarkMode ? 'text-white' : 'text-gray-900'
    }`}
  >
    {parseFloat(
      apiCarbonResponse?.baseline_consumption?.current_timeframe?.power_kwh || 0
    ).toFixed(2)}{" "}
    kWh
  </div>
</div>

              {/* Energy Saved */}
              <div className={`rounded-lg p-4 border shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-[#1a2e26] to-[#0f1914] border-green-500/30' : 'bg-gradient-to-br from-green-50 to-white border-green-500'}`}>
                <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                  </svg>
                  Energy Saved
                </div>
                <div className={`text-2xl font-bold text-green-500`}>
                  {(parseFloat(apiCarbonResponse?.baseline_consumption?.current_timeframe?.power_kwh || 0) - parseFloat(apiCarbonResponse.current_consumption?.total_power_kwh || 0)).toFixed(2)} kWh
                </div>
                <div className="text-xs text-green-500 font-semibold mt-1">
                  {timeframe === 'daily' && selectedDate === moment().format('YYYY-MM-DD') ? '' : ''}
                </div>
              </div>

              {/* Carbon Saved */}
              <div className={`rounded-lg p-4 border shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-[#1a2e26] to-[#0f1914] border-green-500/30' : 'bg-gradient-to-br from-green-50 to-white border-green-500'}`}>
                <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                
                  Carbon Saved
                </div>
                <div className={`text-2xl font-bold text-green-500`}>
                  {(parseFloat(apiCarbonResponse?.baseline_consumption?.current_timeframe?.carbon_kg || 0) - parseFloat(apiCarbonResponse.current_consumption?.total_carbon_emission?.kg || 0)).toFixed(2)} kg
                </div>
                <div className="text-xs text-green-500 font-semibold mt-1">
                  {timeframe === 'daily' && selectedDate === moment().format('YYYY-MM-DD') ? '' : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid - 2x2 Layout inside Energy Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-10">
          {/* Power Consumption Chart */}
          <div className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-4 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-semibold">Power Consumption</h3>
            </div>
            {powerLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Loading...</span>
              </div>
            ) : powerError ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-red-400 text-sm">{powerError}</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={powerData}
                    margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis
                      dataKey="label"
                      {...commonXAxisProps}
                      tickFormatter={getTickFormatter(timeframe)}
                      {...((timeframe === "monthly" || timeframe === "custom") ? { angle: -45, textAnchor: "end", height: 60 } : {})}
                    />
                    <YAxis
                      {...commonYAxisProps}
                      domain={[0, (dataMax) => Math.ceil(dataMax * 1.1)]}
                      label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontWeight: "bold" }, fontSize: 12 }}
                    />
                    <Tooltip {...getTooltipProps(true, timeframe, 'kWh')} />
                    <Bar dataKey="kWh" radius={[6, 6, 0, 0]}>
                      {powerData.map((entry, idx) => (
                        <Cell
                          key={`cell-power-${idx}`}
                          fill={activePowerIndex === idx ? "#a78bfa" : "#8b5cf6"}
                          stroke={activePowerIndex === idx ? "#ffffff" : "none"}
                          strokeWidth={activePowerIndex === idx ? 2 : 0}
                          onMouseEnter={() => setActivePowerIndex(idx)}
                          onMouseLeave={() => setActivePowerIndex(null)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Energy Consumption vs Baseline */}
          <div className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-4 flex flex-col`}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="text-lg font-semibold">Energy vs Baseline</h3>
          </div>

  {carbonLoading ? (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      Loading energy data...
    </div>
  ) : apiCarbonResponse?.data && Array.isArray(apiCarbonResponse.data) && apiCarbonResponse.data.length > 0 ? (
    <div className="flex-1 flex flex-col">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={savingChartData} 
            margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
            
            {/* XAxis: Only show ticks up to last data point */}
           <XAxis
            dataKey="label"
            {...commonXAxisProps}
            tickFormatter={getTickFormatter(timeframe)}
            {...(timeframe === "monthly" || timeframe === "custom" ? { angle: -45, textAnchor: 'end', height: 70 } : { textAnchor: 'middle', height: 50 })}
            style={{ userSelect: 'none' }}

              />

            <YAxis
              {...commonYAxisProps}
              label={{ value: "kWh", angle: -90, position: "insideLeft", style: { fill: "#9CA3AF", fontWeight: "bold" }, fontSize: 12 }}
            />

            <Tooltip
              contentStyle={{ backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF", border: isDarkMode ? "1px solid #475569" : "1px solid #E5E7EB", borderRadius: "8px" }}
              formatter={(value, name, props) => {
                const dataPoint = props.payload;
                const index = props.index || 0;
                const baselineValue = parseFloat(apiCarbonResponse.baseline_consumption?.current_timeframe?.power_kwh || 0);
                
                // Calculate actual consumption for this period (current - previous)
                const currentValue = Number(value);
                const previousValue = index > 0 ? Number(energyConsumptionData[index - 1]?.actual_consumption || 0) : 0;
                const periodConsumption = currentValue - previousValue;
                
                // Build time range based on timeframe
                let timeRange = '';
                let hourlyConsumption = null;
                if (timeframe === "daily") {
                  const hourMatch = dataPoint?.label?.match(/(\d+):(\d+)/);
                  if (hourMatch) {
                    const startHour = parseInt(hourMatch[1]);
                    const endHour = (startHour + 1) % 24;
                    timeRange = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
                    
                    // Get hourly consumption for this hour from hourlyData
                    if (hourlyData && hourlyData.length > 0) {
                      const hourlyItem = hourlyData.find(h => {
                        const hMatch = (h.hour || h.label || '').match(/(\d+):(\d+)/);
                        return hMatch && parseInt(hMatch[1]) === startHour;
                      });
                      if (hourlyItem && index > 0) {
                        const currentHourly = Number(hourlyItem.usage || 0);
                        const previousHourly = Number(hourlyData[hourlyData.indexOf(hourlyItem) - 1]?.usage || 0);
                        hourlyConsumption = currentHourly - previousHourly;
                      } else if (hourlyItem && index === 0) {
                        hourlyConsumption = Number(hourlyItem.usage || 0);
                      }
                    }
                  }
                } else if (timeframe === "monthly") {
                  const dateMatch = dataPoint?.label?.match(/\d+/);
                  if (dateMatch) {
                    timeRange = `Day ${dateMatch[0]}`;
                  }
                }
                
                if (name === "Actual Consumption" || name === "Actual") {
                  return [
                    <div key="tooltip" style={{ lineHeight: '1.6' }}>
                      <div><strong>Baseline:</strong> {baselineValue.toFixed(2)} kWh</div>
                      <div><strong>Actual:</strong> {periodConsumption.toFixed(2)} kWh</div>
                      <div><strong>Excess:</strong> {Math.max(0, periodConsumption - baselineValue).toFixed(2)} kWh</div>
                      {timeRange && <div><strong>Hour Range:</strong> {timeRange}</div>}
                      {hourlyConsumption !== null && (
                        <div><strong>Hourly Consumption:</strong> {hourlyConsumption.toFixed(2)} kWh</div>
                      )}
                    </div>,
                    ''
                  ];
                }
                return [`${periodConsumption.toFixed(2)} kWh`, name];
              }}
              labelFormatter={() => ''}
            />

            {/* Baseline: Horizontal dashed line */}
            <Line
              type="linear"
              dataKey={() => parseFloat(apiCarbonResponse.baseline_consumption?.current_timeframe?.power_kwh || 0)}
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              name="Baseline"
              connectNulls={false}
            />

            {/* Actual Consumption: Stops at last real data point */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10B981" }}
              activeDot={{ r: 6 }}
              name="Actual"
              connectNulls={false}
            />

            {/* Red exceed area: Only where actual > baseline */}
            <Area
              type="monotone"
              dataKey={(entry) => {
                const baseline = parseFloat(apiCarbonResponse.baseline_consumption?.current_timeframe?.power_kwh || 0);
                return entry.actual > baseline ? entry.actual - baseline : 0;
              }}
              fill="#EF4444"
              fillOpacity={0.5}
              stroke="none"
              name="Exceeded"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      No energy data available
    </div>
  )}
</div>

          {/* Carbon Footprint vs Baseline */}
          <div className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-4 flex flex-col`}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold">Carbon Footprint vs Baseline</h3>
          </div>

  {carbonLoading ? (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      Loading carbon data...
    </div>
  ) : apiCarbonResponse?.data && Array.isArray(apiCarbonResponse.data) && apiCarbonResponse.data.length > 0 ? (
    <div className="flex-1 flex flex-col">
      <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={carbonChartData} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
            <XAxis
              dataKey="label"
              {...commonXAxisProps}
              tickFormatter={getTickFormatter(timeframe)}
              {...(timeframe === "monthly" || timeframe === "custom" ? { angle: -45, textAnchor: 'end', height: 60 } : { angle: 0, textAnchor: 'middle', height: 40 })}
            />
            <YAxis
              {...commonYAxisProps}
              label={{ value: "kg CO₂", angle: -90, position: "insideLeft", style: { fill: "#9CA3AF", fontSize: 11 }, fontWeight: "bold" }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF", border: isDarkMode ? "1px solid #475569" : "1px solid #E5E7EB", borderRadius: "8px", padding: "8px 12px" }}
              formatter={(value) => `${Number(value).toFixed(2)} kg CO₂`}
            />

            {/* Fixed Baseline Carbon */}
            <Line
              type="linear"
              dataKey={() => parseFloat(apiCarbonResponse.baseline_consumption?.current_timeframe?.carbon_kg || 0)}
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              name="Baseline Carbon"
            />

            {/* Cumulative Actual Carbon */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Actual Carbon"
            />

            {/* Red Area when exceeding */}
            <Area
              type="monotone"
              dataKey={(entry) =>
                entry.actual > parseFloat(apiCarbonResponse.baseline_consumption?.current_timeframe?.carbon_kg || 0)
                  ? entry.actual - parseFloat(apiCarbonResponse.baseline_consumption?.current_timeframe?.carbon_kg || 0)
                  : 0
              }
              fill="#EF4444"
              fillOpacity={0.5}
              stroke="none"
              name="Exceeded"
            />
          </ComposedChart>
        </ResponsiveContainer>
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      No carbon footprint data available
    </div>
  )}
          </div>        
          
            {/* Hourly Usage Chart */}
          <div className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-4 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold">Hourly Usage</h3>
            </div>
      
      {timeframe === "monthly" || timeframe === "yearly" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-sm">Hourly usage chart is only available in Daily view</div>
            <div className="text-xs mt-2">Switch to Daily view to see hourly breakdown</div>
          </div>
        </div>
      ) : timeframe === "custom" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-lg mb-2">🔄 Loading device data for custom range</div>
            <div className="text-sm">Please wait while device data is being fetched for the selected range.</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {hourlyLoading && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Loading...
            </div>
          )}
          
          {hourlyError && (
            <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
              {hourlyError}
            </div>
          )}
          
          {!hourlyLoading && !hourlyError && (
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={hourlyData} 
                margin={{ top: 8, right: 10, left: 10, bottom: 8 }}
              >
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis
                  dataKey="hour"
                  {...commonXAxisProps}
                  tickFormatter={getTickFormatter(timeframe)}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  ticks={Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00')}
                />
                <YAxis
                  {...commonYAxisProps}
                  domain={[0, (dataMax) => Math.ceil(dataMax * 1.1)]}
                  label={{
                    value: "Usage (kWh)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: { fill: "#9CA3AF", fontWeight: "bold", fontSize: 11 },
                  }}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? "#0F172B" : "#FFFFFF", 
                    border: isDarkMode ? "none" : "1px solid #E5E7EB", 
                    borderRadius: 6,
                    color: isDarkMode ? "#E6EEF8" : "#1F2937",
                  }}
                  labelStyle={{ color: isDarkMode ? "#E6EEF8" : "#1F2937", fontSize: 12, fontWeight: 700 }}
                  itemStyle={{ color: isDarkMode ? "#E6EEF8" : "#1F2937" }}
                  formatter={(value, name, props) => {
                    const dataPoint = props.payload;
                    const hour = dataPoint?.hour || '';
                    const index = props.index || 0;
                    
                    // Calculate actual consumption for this hour (current - previous)
                    const currentValue = Number(value);
                    const previousValue = index > 0 ? Number(hourlyData[index - 1]?.usage || 0) : 0;
                    const hourConsumption = currentValue - previousValue;
                    
                    // Extract hour from label (e.g., "10:00" -> 10)
                    const hourMatch = hour.match(/(\d+):(\d+)/);
                    if (hourMatch) {
                      const startHour = parseInt(hourMatch[1]);
                      const endHour = (startHour + 1) % 24;
                      const hourRange = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
                      
                      return [
                        <div key="tooltip" style={{ lineHeight: '1.6' }}>
                          <div><strong>Hour Range:</strong> {hourRange}</div>
                          <div><strong>Consumption:</strong> {hourConsumption.toFixed(2)} kWh</div>
                        </div>,
                        ''
                      ];
                    }
                    return [`${Number(value).toFixed(2)} kWh`, "Usage"];
                  }}
                  labelFormatter={() => ''}
                />
                <Bar 
                  dataKey="usage" 
                  fill="#f97316" 
                  radius={[6, 6, 0, 0]}
                  name="Power Consumption"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* Summary cards at bottom - Max Demand, Peak Window, Active Hours, Inactive Hours */}
      {timeframe !== "monthly" && timeframe !== "yearly" && timeframe !== "custom" && (
        <div className="w-full mt-6">
          <div className="grid grid-cols-4 gap-4">
            {/* Max Demand */}
            <div
              className={`rounded-lg p-4 border shadow-lg flex flex-col justify-center text-left ${isDarkMode ? 'bg-gradient-to-br from-[#2d1f1a] to-[#1a1310] border-orange-500/30' : 'bg-gradient-to-br from-orange-50 to-white border-orange-500'}`}
            >
              <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Demand</div>
              <div
                className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                style={{
                  fontSize: '1.5rem',
                  lineHeight: 1.2,
                }}
              >
                {(() => {
                  const hourlyDataArray = apiHourlyResponse?.hourly_data || [];
                  if (hourlyDataArray.length === 0) return "N/A";
                  
                  const maxConsumption = Math.max(
                    ...hourlyDataArray.map(item => 
                      Number(item.total_power_consumption || item.smoothed_value || 0)
                    )
                  );
                  
                  return `${maxConsumption.toFixed(3)} kWh`;
                })()}
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {(() => {
                  const hourlyDataArray = apiHourlyResponse?.hourly_data || [];
                  if (hourlyDataArray.length === 0) return "";
                  
                  let maxValue = -Infinity;
                  let maxTime = "";
                  
                  hourlyDataArray.forEach(item => {
                    const value = Number(item.total_power_consumption || item.smoothed_value || 0);
                    if (value > maxValue) {
                      maxValue = value;
                      maxTime = item.time_window || item.hour || "";
                    }
                  });
                  
                  return maxTime ? `at ${maxTime}` : "";
                })()}
              </div>
            </div>

            {/* Peak Window */}
            <div
              className={`rounded-lg p-4 border shadow-lg flex flex-col justify-center text-left ${isDarkMode ? 'bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-white border-blue-500'}`}
            >
              <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Peak Window</div>
              <div
                className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                style={{
                  fontSize: '1.15rem',
                  lineHeight: 1.3,
                }}
              >
                {apiHourlyResponse?.peak_windows?.length ? 
                  apiHourlyResponse.peak_windows.map(w => w.window).join(", ") : "N/A"}
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {(() => {
                  const hourlyDataArray = apiHourlyResponse?.hourly_data || [];
                  if (hourlyDataArray.length === 0) return "";
                  
                  const maxConsumption = Math.max(
                    ...hourlyDataArray.map(item => 
                      Number(item.total_power_consumption || item.smoothed_value || 0)
                    )
                  );
                  
                  // return `${maxConsumption.toFixed(3)} kWh peak`;
                })()}
              </div>
            </div>

            {/* Active Hours */}
            <div
              className={`rounded-lg p-4 border shadow-lg flex flex-col justify-center text-left ${isDarkMode ? 'bg-gradient-to-br from-[#1a2e26] to-[#0f1914] border-green-500/30' : 'bg-gradient-to-br from-green-50 to-white border-green-500'}`}
            >
              <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Hours</div>
              <div
                className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                style={{
                  fontSize: '1.5rem',
                  lineHeight: 1.2,
                }}
              >
                {`${hourlyActiveTotal.toFixed(3)} kWh`}
              </div>
             
            </div>

            {/* Inactive Hours */}
            <div
              className={`rounded-lg p-4 border shadow-lg flex flex-col justify-center text-left ${isDarkMode ? 'bg-gradient-to-br from-[#2a2332] to-[#1a1419] border-gray-500/30' : 'bg-gradient-to-br from-gray-50 to-white border-gray-500'}`}
            >
              <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Inactive Hours</div>
              <div
                className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                style={{
                  fontSize: '1.5rem',
                  lineHeight: 1.2,
                }}
              >
                {`${hourlyInactiveTotal.toFixed(3)} kWh`}
              </div>
              
            </div>
          </div>
        </div>
      )}

    </div>
    
      {/* Device Distribution and Map Row */}
      <div className="w-full -mt-16 grid grid-cols-1 lg:grid-cols-2 gap-4 pt-10">
        {/* Device Distribution */}
        <div className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-6 shadow-lg flex flex-col`}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <h3 className="text-lg font-semibold">Device Distribution</h3>
          </div>
          {carbonLoading ? (
            <div className="text-gray-400 text-center py-8 flex-grow flex items-center justify-center">
              Loading devices...
            </div>
          ) : devicesData.length > 0 ? (
            <div className="flex-grow min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devicesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80} 
                    outerRadius={120} 
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name.split(' (')[0]}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={true}
                  >
                    {devicesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "#0F172B", 
                      border: "none", 
                      borderRadius: 6, 
                      color: "#E6EEF8" 
                    }}
                    labelStyle={{ 
                      color: "#E6EEF8", 
                      fontSize: 12,
                      fontWeight: 700
                    }}
                    itemStyle={{ color: "#E6EEF8" }}
                    formatter={(value, name, props) => {
                      const deviceName = props.payload.name.split(' (')[0];
                      return [`${value} devices`, deviceName];
                    }}
                  />
                  <Legend 
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{
                      paddingLeft: "20px",
                      fontSize: "20px",
                      lineHeight: "2"
                    }}
                    formatter={(value, entry) => {
                      const deviceName = entry.payload.name.split(' (')[0];
                      const deviceCount = entry.payload.value;
                      return `${deviceName}: ${deviceCount}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8 flex-grow flex items-center justify-center">
              No devices data available
            </div>
          )}
        </div>

        {/* Site Locations Map */}
        <div 
          className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-6 shadow-lg flex flex-col cursor-pointer hover:shadow-xl transition-shadow duration-200`}
          onClick={() => setShowMapModal(true)}
        >
          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
              isDarkMode
                ? "bg-gradient-to-br from-blue-600/20 to-blue-400/10 text-blue-400"
                : "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600"
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Site Locations</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden rounded-lg">
            <GoogleMapComponentCD />
          </div>
        </div>
      </div>

      {/* Location Map Modal Popup */}
      {showMapModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setShowMapModal(false)}
        >
          <div 
            className={`relative w-[95%] max-h-[85vh] max-w-7xl ${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border shadow-2xl overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-4 py-2 border-b ${isDarkMode ? 'border-[#1e293b] bg-[#0F172B]' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <FaMapMarkedAlt className="text-2xl text-blue-500" />
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Location Map</h2>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-[#1e293b] text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'}`}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Map Tabs */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className={`flex border-b flex-shrink-0 ${isDarkMode ? 'border-[#1e293b]' : 'border-gray-200'}`}>
                <button
                  onClick={() => setLocationView("map")}
                  className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 font-semibold text-base transition-all duration-300 ${
                    locationView === "map"
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-b-4 border-blue-400"
                      : isDarkMode
                      ? "bg-[#0F172B] text-gray-400 hover:text-white hover:bg-[#1a253f]"
                      : "bg-white text-gray-600 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <FaMapMarkedAlt className="text-xl" />
                  <span>Map View</span>
                </button>
                <button
                  onClick={() => setLocationView("list")}
                  className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 font-semibold text-base transition-all duration-300 ${
                    locationView === "list"
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-b-4 border-blue-400"
                      : isDarkMode
                      ? "bg-[#0F172B] text-gray-400 hover:text-white hover:bg-[#1a253f]"
                      : "bg-white text-gray-600 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <FaListUl className="text-xl" />
                  <span>List View</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {locationView === "map" ? (
                  <div className="w-full h-full">
                    <GoogleMapComponentCD isDarkMode={isDarkMode} />
                  </div>
                ) : (
                  <div className={`w-full h-full ${isDarkMode ? "bg-[#0F172B]" : "bg-white"}`}>
                    <Location hideActions={true} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;