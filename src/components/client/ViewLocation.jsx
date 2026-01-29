import { useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  Cell,
  ComposedChart,
} from "recharts";
import {
  ChevronDown,
  Snowflake,
  Zap,
  Monitor,
  Shield,
  Plus,
  Lightbulb,
  RadioReceiver,
  Cpu,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Leaf,
  CheckCircle,
  Clock,
  Moon,
  X,
} from "lucide-react";
import moment from "moment";
import "./client.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import GaugeChart from "./gauge.jsx";
import LiveGauge from "./reactGauge.jsx";
import { getXAxisProps, getYAxisProps, getTooltipProps, getTickFormatter } from "../../utils/chartFormatting";
import { useLocation, useNavigate } from "react-router-dom";
import PDFReport from "./PDFReport";
import * as XLSX from "xlsx";
import { useTheme } from "../../context/ThemeContext";
/* ============================
   Helpers (shared)
   ============================ */
const getCategoryColor = (index) => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8C471",
    "#82E0AA",
    "#F1948A",
    "#85C1E9",
    "#D7BDE2",
  ];
  return colors[index % colors.length];
};

// Helper to get color based on positive/negative value
const getValueColor = (value) => {
  return value < 0 ? "#EF4444" : undefined; // Red for negative, undefined for default
};

const defaultExcluded = [
  "period",
  "total_consumption",
  "date",
  "month",
  "label",
  "total_power_consumption",
];
const getCategories = (data = []) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const categories = new Set();
  data.forEach((item) => {
    Object.keys(item || {}).forEach((k) => {
      if (!defaultExcluded.includes(k)) categories.add(k);
    });
  });
  return Array.from(categories);
};

/* Reusable summary row used under multiple charts - compact & elegant */
const SummaryRow = ({ items = [], isDarkMode = true }) => {
  const cardGradientDark = 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))';
  const cardGradientLight = 'linear-gradient(180deg, rgba(248,250,252,1), rgba(229,231,235,1))';
  const labelColorDark = 'text-gray-300';
  const labelColorLight = 'text-gray-600';
  const valueColorDark = 'text-white';
  const valueColorLight = 'text-gray-900';
  
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
          className="rounded-lg p-3 flex items-center justify-between"
          style={{
            background: isDarkMode ? cardGradientDark : cardGradientLight,
            border: `1px solid ${it.color || (isDarkMode ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.3)')}`,
            boxSizing: 'border-box',
            minHeight: 72,
          }}
        >
          <div style={{ minWidth: 0 }} className="flex flex-col">
            <div className={`text-xs truncate ${isDarkMode ? labelColorDark : labelColorLight}`} style={{ maxWidth: 180 }}>{it.label}</div>
            {it.subtitle && (
              <div className={`text-xxs mt-0.5 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ maxWidth: 180 }}>
                {it.subtitle}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, marginLeft: 8 }} className="text-right">
            <div
              className={`font-semibold ${isDarkMode ? valueColorDark : valueColorLight}`}
              style={{
                fontSize: it.large ? '1.15rem' : '0.98rem',
                lineHeight: 1.05,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                textAlign: 'right',
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
const SummaryCards = ({ consumption, baseline, saved, active, inactive, unit = 'kWh', isDarkMode = true, savedLabel = 'Saved' }) => {
  const cardGradientDark = 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))';
  const cardGradientLight = 'linear-gradient(180deg, rgba(248,250,252,1), rgba(229,231,235,1))';
  const labelColorDark = 'text-gray-300';
  const labelColorLight = 'text-gray-600';
  const valueColorDark = 'text-white';
  const valueColorLight = 'text-gray-900';
  
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
              background: isDarkMode ? cardGradientDark : cardGradientLight,
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className={`text-xs truncate mb-2 ${isDarkMode ? labelColorDark : labelColorLight}`}>{item.label}</div>
            <div
              className={`font-semibold ${isDarkMode ? valueColorDark : valueColorLight}`}
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
              background: isDarkMode ? cardGradientDark : cardGradientLight,
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className={`text-xs truncate mb-2 ${isDarkMode ? labelColorDark : labelColorLight}`}>{item.label}</div>
            <div
              className={`font-semibold ${isDarkMode ? valueColorDark : valueColorLight}`}
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

    
const EnhancedHourlyUsage = ({ data = [], apiResponse = {}, powerConsumptionResponse = {}, timeframe, selectedDate, isDarkMode = true }) => {
  const [showPeakWindows, setShowPeakWindows] = useState(true);
  const [showSmoothing, setShowSmoothing] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-6">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Hourly Usage Breakdown (kWh)
          </h3>
          {timeframe === "daily" && selectedDate && (
            <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {moment(selectedDate).format("MMM DD, YYYY")}
            </span>
          )}
        </div>
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No hourly usage data available
        </div>
      </div>
    );
  }

  const dataArray = data;
  const peakWindows = apiResponse.peak_windows || [];
  const totalConsumption = apiResponse.total_consumption || 0;
  const peakHour = apiResponse.peak_hour || null;
  const top3Peaks = apiResponse.top_3_peak_hours || [];

  // Active/Inactive from API response
  let hourlyActiveUsage = 0;
  let hourlyInactiveUsage = 0;

  // Priority 1: Use backend active_inactive object if available
  if (apiResponse.active_inactive?.active_hours_consumption !== undefined) {
    console.log("✅ Hourly Usage: Reading active_inactive from API", apiResponse.active_inactive);
    hourlyActiveUsage = Number(apiResponse.active_inactive.active_hours_consumption || 0);
    hourlyInactiveUsage = Number(apiResponse.active_inactive.inactive_hours_consumption || 0);
  }
  // Priority 2: Fallback to power consumption response if available
  else if (powerConsumptionResponse?.active_inactive?.active_hours_consumption !== undefined) {
    console.log("⚠️ Hourly Usage: Fallback to power consumption active_inactive");
    hourlyActiveUsage = Number(powerConsumptionResponse.active_inactive.active_hours_consumption || 0);
    hourlyInactiveUsage = Number(powerConsumptionResponse.active_inactive.inactive_hours_consumption || 0);
  }
  else {
    console.warn("❌ Hourly Usage: No active_inactive data available");
  }

  hourlyActiveUsage = Number(hourlyActiveUsage).toFixed(2);
  hourlyInactiveUsage = Number(hourlyInactiveUsage).toFixed(2);

  // Rest of your original hourlyData logic (unchanged)
  const hourlyData = [];
  if (timeframe === "daily") {
    for (let h = 0; h < 24; h++) {
      const hourString = h.toString().padStart(2, "0");
      const hourData = dataArray.find((item) => {
        if (!item.period) return false;
        try {
          return moment(item.period).hour() === h;
        } catch (e) {
          return false;
        }
      });
      const usage = hourData ? hourData.total_consumption || 0 : 0;
      const smoothedUsage = hourData ? hourData.smoothed_value || usage : 0;
      const isPeakHour = peakHour && moment(peakHour.time).hour() === h;
      const isTop3Peak = top3Peaks.some((peak) => moment(peak.time).hour() === h);

      hourlyData.push({
        hour: hourString,
        usage,
        smoothed_usage: smoothedUsage,
        isPeak: isPeakHour || isTop3Peak,
        isPeakHour,
        isTop3Peak,
      });
    }
  } else {
    dataArray.forEach((item) => {
      const period = item.period || item.date;
      let label = "";
      switch (timeframe) {
        case "monthly":
          label = moment(period).format("DD MMM");
          break;
        case "yearly":
          label = moment(period).format("MMM YYYY");
          break;
        case "custom":
          label = moment(period).format("DD MMM");
          break;
        default:
          label = moment(period).format("DD MMM");
      }
      hourlyData.push({
        hour: label,
        usage: item.total_consumption || 0,
        smoothed_usage: item.smoothed_value || item.total_consumption || 0,
        isPeak: false,
        isPeakHour: false,
        isTop3Peak: false,
      });
    });
  }

  const cardGradientDark = 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))';
  const cardGradientLight = 'linear-gradient(180deg, rgba(248,250,252,1), rgba(229,231,235,1))';
  
  return (
    <div className={`rounded-xl p-6 shadow-xl relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hourly Usage</h3>
          {timeframe === "daily" && selectedDate && (
            <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {moment(selectedDate).format("MMM DD, YYYY")}
            </span>
          )}
        </div>

      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourlyData} margin={{ top: 8, right: 6, left: 4, bottom:10}}>
            <CartesianGrid stroke={isDarkMode ? "#334155" : "#e5e7eb"} strokeDasharray="3 3" strokeOpacity={0.9} />
            <XAxis 
              dataKey="hour"
              tick={{ fill: isDarkMode ? "#9ca3af" : "#6b7280", fontSize: 12 }}
              stroke={isDarkMode ? "#374151" : "#d1d5db"}
              angle={-45}
              textAnchor="end"
              height={100}
              interval={1}
              tickFormatter={(value) => {
                if (timeframe === "daily") {
                  const hour = parseInt(value);
                  // Show every 2 hours to improve visibility
                  return hour % 2 === 0 ? value + ":00" : "";
                }
                return value;
              }}
            />
            <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 11, fill: isDarkMode ? "#9CA3AF" : "#6b7280" }}
              label={{ value: "kWh", angle: -90, position: "insideLeft", style: { fill: isDarkMode ? "#9CA3AF" : "#6b7280", fontSize: 11 } , fontWeight: "bold"}} />
            <Tooltip {...getTooltipProps(isDarkMode, timeframe, 'kWh')} />

            <Bar dataKey="usage" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      
        {/* <div
          style={{
            display: 'grid',
            gridTemplateColumns: timeframe === 'monthly' ? 'repeat(1, 1fr)' : 'repeat(2, 1fr)',
            gap: '10px',
          }}
        >
          <div
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: isDarkMode ? cardGradientDark : cardGradientLight,
              border: '1px solid #60A5FA',
              minHeight: 80,
            }}
          >
            <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Max Demand</div>
            <div className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {peakHour?.consumption ? `${Number(peakHour.consumption).toFixed(2)} kWh` : "N/A"}
            </div>
          </div>

          {timeframe !== 'monthly' && (
            <div
              className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
              style={{
                background: isDarkMode ? cardGradientDark : cardGradientLight,
                border: '1px solid #FB923C',
                minHeight: 80,
              }}
            >
              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Peak Window</div>
              <div className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {peakWindows.length ? peakWindows.map(w => w.window).join(", ") : "N/A"}
              </div>
            </div>
          )}
        </div> */}

        {/* Row 2: Active / Inactive – NOW FIXED */}
        {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: isDarkMode ? cardGradientDark : cardGradientLight,
              border: '1px solid #10B981',
              minHeight: 80,
            }}
          >
            <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active</div>
            <div className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {hourlyActiveUsage} kWh
            </div>
          </div>

          <div
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: isDarkMode ? cardGradientDark : cardGradientLight,
              border: '1px solid #9CA3AF',
              minHeight: 80,
            }}
          >
            <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Inactive</div>
            <div className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {hourlyInactiveUsage} kWh
            </div>
          </div>
        </div> */}

        {/* Optional note for non-daily views */}
        {/* {timeframe !== "daily" && (
          <p className="text-center text-xs text-gray-500 mt-2 italic">
            Active/Inactive based on standard business hours (8 AM – 8 PM IST)
          </p>
        )} */}
    </div>
  );
};

const EnergySavedChart = ({ data = [], apiResponse = {}, powerConsumptionResponse = {}, timeframe, selectedDate, isDarkMode = true }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }
    let cumulativeActual = 0;
    const processedData = data.map((item) => {
      cumulativeActual += Number(item.actual_consumption) || 0;
      const period = item.period;
      let label = "";
      switch (timeframe) {
        case "daily": label = moment(period).format("HH:mm"); break;
        case "monthly": label = moment(period).format("DD MMM"); break;
        case "yearly": label = moment(period).format("MMM"); break;
        case "custom": label = moment(period).format("DD MMM"); break;
        default: label = moment(period).format("HH:mm");
      }
      return { period, label, actual_consumption: cumulativeActual, status: item.status };
    });
    setChartData(processedData);
  }, [data, timeframe]);

  const totalActual = Number(apiResponse.total_actual_consumption || 0);
  const totalBaseline = Number(apiResponse.total_baseline_wh || 0);
  const totalSaved = Number(apiResponse.total_energy_saved || 0);

  // Active/Inactive from API response
  let activeHoursTotal = 0;
  let inactiveHoursTotal = 0;

  // Priority 1: Use backend active_inactive object if available
  if (apiResponse.active_inactive?.active_hours_consumption !== undefined) {
    console.log("✅ Energy Saved: Reading active_inactive from API", apiResponse.active_inactive);
    activeHoursTotal = Number(apiResponse.active_inactive.active_hours_consumption || 0);
    inactiveHoursTotal = Number(apiResponse.active_inactive.inactive_hours_consumption || 0);
  }
  // Priority 2: Fallback to power consumption response if available
  else if (powerConsumptionResponse?.active_inactive?.active_hours_consumption !== undefined) {
    console.log("⚠️ Energy Saved: Fallback to power consumption active_inactive");
    activeHoursTotal = Number(powerConsumptionResponse.active_inactive.active_hours_consumption || 0);
    inactiveHoursTotal = Number(powerConsumptionResponse.active_inactive.inactive_hours_consumption || 0);
  }
  else {
    console.warn("❌ Energy Saved: No active_inactive data available");
  }
  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Energy Saved vs Baseline</h3>
        <div className={`h-[300px] flex items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No energy saved data available
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Energy Saved vs Baseline</h3>
        {timeframe === "daily" && selectedDate && (
          <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{moment(selectedDate).format("MMM DD, YYYY")}</span>
        )}
      </div>

      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{  top: 8, right: 6, left: 4, bottom:8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} strokeOpacity={0.9} />
            <XAxis dataKey="label" {...getXAxisProps(timeframe, isDarkMode)} tickFormatter={getTickFormatter(timeframe)} />
            <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 11, fill: isDarkMode ? "#9CA3AF" : "#6b7280" }}
              label={{ value: "kWh", angle: -90, position: "insideLeft", style: { fill: isDarkMode ? "#9CA3AF" : "#6b7280", fontSize: 11 } , fontWeight: "bold"}} />
            <Tooltip {...getTooltipProps(isDarkMode, timeframe, 'kWh')} />

            {/* Baseline */}
            <Line type="linear" dataKey={() => totalBaseline} stroke="#60A5FA" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Baseline" />

            {/* Actual Consumption */}
            <Line type="monotone" dataKey="actual_consumption" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} name="Actual Consumption" />

            {/* Exceeded area */}
            <Area
              type="monotone"
              dataKey={(entry) => (entry.actual_consumption > totalBaseline ? entry.actual_consumption - totalBaseline : 0)}
              fill="#EF4444"
              fillOpacity={0.4}
              stroke="none"
              name="Exceeded"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards (consistent style) */}
      {/* <SummaryCards
        consumption={`${totalActual.toFixed(2)} kWh`}
        baseline={`${totalBaseline.toFixed(2)} kWh`}
        saved={`${totalSaved.toFixed(2)} kWh`}
        active={`${activeHoursTotal.toFixed(2)} kWh`}
        inactive={`${inactiveHoursTotal.toFixed(2)} kWh`}
        unit="kWh"
        isDarkMode={isDarkMode}
        savedLabel={timeframe === 'daily' && selectedDate === moment().format('YYYY-MM-DD') ? 'Assumed Saving' : 'Saved'}
      /> */}
    </div>
  );
};

const CarbonFootprintChart = ({
  data = [],
  apiResponse = {},
  powerConsumptionResponse = {},
  timeframe,
  selectedDate,
  loading,
  error,
  isDarkMode = true,
}) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    let cumulativeActual = 0;
    let cumulativeSaved = 0;

    const processedData = data.map((item) => {
      const actual = Number(item.actual_carbon_kg) || 0;
      const carbonSaved = Number(item.carbon_saved_kg) || 0;

      cumulativeActual += actual;
      cumulativeSaved += carbonSaved;

      const period = item.period || item.date;
      let label = "";

      switch (timeframe) {
        case "daily":
          label = moment(period).format("HH:mm");
          break;
        case "monthly":
          label = moment(period).format("DD MMM");
          break;
        case "yearly":
          label = moment(period).format("MMM");
          break;
        case "custom":
          label = moment(period).format("DD MMM");
          break;
        default:
          label = moment(period).format("HH:mm");
      }

      return {
        period,
        label,
        actual_carbon_kg: cumulativeActual,
        carbon_saved_kg: cumulativeSaved,
        status: item.status,
      };
    });

    setChartData(processedData);
  }, [data, timeframe]);

  const totalBaseline = Number(apiResponse?.baseline?.total_carbon_kg || 0);
  const totalSaved = Number(apiResponse?.savings?.carbon_saved_kg || 0);

const totalActual = Number(apiResponse?.actual?.total_carbon_kg || 0);

  // Active/Inactive from API response
  let activeHoursTotal = 0;
  let inactiveHoursTotal = 0;

  // Priority 1: Use backend active_inactive object if available
  if (apiResponse.active_inactive?.active_hours_carbon_kg !== undefined) {
    console.log("✅ Carbon: Reading active_inactive from API", apiResponse.active_inactive);
    activeHoursTotal = Number(apiResponse.active_inactive.active_hours_carbon_kg || 0);
    inactiveHoursTotal = Number(apiResponse.active_inactive.inactive_hours_carbon_kg || 0);
  }
  // Priority 2: Fallback to power consumption data (convert kWh to kg CO2)
  else if (powerConsumptionResponse?.active_inactive?.active_hours_consumption !== undefined) {
    console.log("⚠️ Carbon: Fallback to power consumption active_inactive (converting to CO2)");
    const CARBON_FACTOR = 0.82;
    activeHoursTotal = Number(powerConsumptionResponse.active_inactive.active_hours_consumption || 0) * CARBON_FACTOR;
    inactiveHoursTotal = Number(powerConsumptionResponse.active_inactive.inactive_hours_consumption || 0) * CARBON_FACTOR;
  }
  else {
    console.warn("❌ Carbon: No active_inactive data available");
  }


  if (loading) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-6">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint (kg CO₂)</h3>
          {timeframe === "daily" && selectedDate && (
            <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {moment(selectedDate).format("MMM DD, YYYY")}
            </span>
          )}
        </div>
        <div className={`h-[300px] flex items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Loading carbon footprint data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-6">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint</h3>
          {timeframe === "daily" && selectedDate && (
            <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {moment(selectedDate).format("MMM DD, YYYY")}
            </span>
          )}
        </div>
        <div className={`h-48 flex items-center justify-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-6">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
          {timeframe === "daily" && selectedDate && (
            <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {moment(selectedDate).format("MMM DD, YYYY")}
            </span>
          )}
        </div>
        <div className={`h-48 flex items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No carbon footprint data available
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        {timeframe === "daily" && selectedDate && (
          <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {moment(selectedDate).format("MMM DD, YYYY")}
          </span>
        )}
      </div>

      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 6, left: 4, bottom:8}}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} strokeOpacity={0.9} />
            <XAxis dataKey="label" {...getXAxisProps(timeframe, isDarkMode)} tickFormatter={getTickFormatter(timeframe)} />
            <YAxis
              stroke={isDarkMode ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 11, fill: isDarkMode ? "#9CA3AF" : "#6b7280" }}
              label={{ value: "kg CO₂", angle: -90, position: "insideLeft", style: { fill: isDarkMode ? "#9CA3AF" : "#6b7280", fontSize: 11 } , fontWeight: "bold"}}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#1E293B" : "#ffffff",
                border: isDarkMode ? "1px solid #475569" : "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "8px 12px",
                color: isDarkMode ? "#ffffff" : "#111827"
              }}
              formatter={(value, name) => [`${Number(value).toFixed(2)} kg CO₂`, name]}
            />
            <Legend />

            {/* Fixed Baseline line */}
            <Line
              type="linear"
              dataKey={() => totalBaseline}
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              legendType="none"
              name="Baseline Carbon"
            />

            {/* Actual carbon line */}
            <Line
              type="monotone"
              dataKey="actual_carbon_kg"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 3 }}
              legendType="none"
              name="Actual Carbon"
            />

            {/* Exceeded area */}
            <Area
              type="monotone"
              dataKey={(entry) =>
                entry.actual_carbon_kg > totalBaseline ? entry.actual_carbon_kg - totalBaseline : 0
              }
              fill="#EF4444"
              fillOpacity={0.4}
              stroke="none"
              name="Exceeded"
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      {/* <SummaryCards
        consumption={`${totalActual.toFixed(2)} kg`}
        baseline={`${totalBaseline.toFixed(2)} kg`}
        saved={`${totalSaved.toFixed(2)} kg`}
        active={`${activeHoursTotal.toFixed(2)} kg`}
        inactive={`${inactiveHoursTotal.toFixed(2)} kg`}
        unit="kg CO₂"
        isDarkMode={isDarkMode}
        savedLabel={timeframe === 'daily' && selectedDate === moment().format('YYYY-MM-DD') ? 'Assumed Saving' : 'Saved'}
      /> */}
    </div>
  );
};

const DynamicPowerChart = ({
  data = [],
  timeframe,
  selectedDate,
  selectedMonth,
  selectedYear,
  customStartDate,
  customEndDate,
  onTimeframeChange,
  onDateChange,
  onMonthChange,
  onYearChange,
  onCustomDateChange,
  selectedLines = {},
  onSelectedLinesChange,
  isDarkMode = true,
  hideSelector = false,
}) => {
  const [chartData, setChartData] = useState([]);
  const [categories, setCategories] = useState([]);
  const initializedRef = useRef(new Set());

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      setCategories([]);
      return;
    }

    const categoryKeys = getCategories(data);
    setCategories(categoryKeys);

    const processedData = data.map((item) => {
      const labelSource = item.period || item.date || item.label;
      const label = getTimeframeLabel(labelSource, timeframe);
      const rawTotal =
        item.total_consumption ||
        item.total_power_consumption ||
        categoryKeys.reduce((sum, c) => sum + (Number(item[c]) || 0), 0);
      const total = Math.abs(Number(rawTotal) || 0);

      const baseItem = { label, total };
      categoryKeys.forEach((c) => {
        baseItem[c] = Math.abs(Number(item[c]) || 0);
      });
      return baseItem;
    });

    setChartData(processedData);
  }, [data, timeframe]);

  // Initialize selectedLines for new categories only once
  useEffect(() => {
    if (categories.length === 0) return;
    
    const newCategoriesToAdd = [];
    
    // Check total
    if (!initializedRef.current.has('total')) {
      newCategoriesToAdd.push('total');
      initializedRef.current.add('total');
    }
    
    // Check each category
    categories.forEach(cat => {
      if (!initializedRef.current.has(cat)) {
        newCategoriesToAdd.push(cat);
        initializedRef.current.add(cat);
      }
    });
    
    if (newCategoriesToAdd.length > 0 && onSelectedLinesChange) {
      onSelectedLinesChange(prev => {
        const updated = { ...prev };
        newCategoriesToAdd.forEach(key => {
          updated[key] = true;
        });
        return updated;
      });
    }
  }, [categories, onSelectedLinesChange]);

  const getTimeframeLabel = (timestamp, tf) => {
    if (!timestamp) return "";
    const m = moment(timestamp);
    switch (tf) {
      case "daily":
        return m.format("HH:mm");
      case "monthly":
        return m.format("DD MMM");
      case "yearly":
        return m.format("MMM YYYY");
      case "custom":
        return m.format("DD MMM");
      default:
        return m.format("DD MMM");
    }
  };

  const toggleLine = useCallback((key) => {
    if (onSelectedLinesChange) {
      onSelectedLinesChange(prev => {
        const currentValue = prev.hasOwnProperty(key) ? prev[key] : true;
        const newValue = !currentValue;
        console.log(`Toggle ${key}: ${currentValue} -> ${newValue}`, { ...prev, [key]: newValue });
        return {
          ...prev,
          [key]: newValue
        };
      });
    }
  }, [onSelectedLinesChange]);

  const selectAll = useCallback(() => {
    console.log('Select All clicked');
    if (onSelectedLinesChange) {
      onSelectedLinesChange(() => {
        const updated = { total: true };
        categories.forEach(cat => {
          updated[cat] = true;
        });
        console.log('Select All result:', updated);
        return updated;
      });
    }
  }, [categories, onSelectedLinesChange]);

  const deselectAll = useCallback(() => {
    console.log('Deselect All clicked');
    if (onSelectedLinesChange) {
      onSelectedLinesChange(() => {
        const updated = { total: false };
        categories.forEach(cat => {
          updated[cat] = false;
        });
        console.log('Deselect All result:', updated);
        return updated;
      });
    }
  }, [categories, onSelectedLinesChange]);

  // No data state UI
  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-lg p-6 lg:col-span-3 col-span-1 ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Power Consumption</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                High Electricity Consumed
              </span>
            </div>

            {/* moved selector (kept compact for no-data) */}
            <div className="flex items-center gap-2">
              <select
                value={timeframe}
                onChange={(e) => onTimeframeChange(e.target.value)}
                className={`px-2 py-1 rounded text-sm border ${
                  isDarkMode
                    ? "bg-[#1e293b] text-white border-gray-600"
                    : "bg-white text-gray-900 border-gray-300"
                }`}
                style={{ cursor: 'pointer' }}
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom Range</option>
              </select>
              {timeframe === "daily" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className={`px-2 py-1 rounded text-sm border ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  style={{ cursor: 'pointer' }}
                />
              )}
              {timeframe === "monthly" && (
                <DatePicker
                  selected={selectedMonth ? moment(selectedMonth + '-01', 'YYYY-MM-DD').toDate() : null}
                  onChange={(date) => onMonthChange(moment(date).format('YYYY-MM'))}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  className={`px-2 py-1 rounded text-sm border ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                />
              )}
              {timeframe === "yearly" && (
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => onYearChange(e.target.value)}
                  min="2020"
                  max={moment().year()}
                  className={`px-2 py-1 rounded text-sm border ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  placeholder="Year"
                />
              )}
              {timeframe === "custom" && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) =>
                      onCustomDateChange(e.target.value, customEndDate)
                    }
                    className={`px-2 py-1 rounded text-sm border ${
                      isDarkMode
                        ? "bg-[#1e293b] text-white border-gray-600"
                        : "bg-white text-gray-900 border-gray-300"
                    }`}
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) =>
                      onCustomDateChange(customStartDate, e.target.value)
                    }
                    className={`px-2 py-1 rounded text-sm border ${
                      isDarkMode
                        ? "bg-[#1e293b] text-white border-gray-600"
                        : "bg-white text-gray-900 border-gray-300"
                    }`}
                    placeholder="End Date"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className={`h-[250px] flex items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No data available for the selected timeframe
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-lg p-6 lg:col-span-3 col-span-1 ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Power Consumption</h3>
        {!hideSelector && (
          <div className="flex items-center gap-4">
            {/* Time selector moved here (after 'Total Consumption') */}
            <div className="flex items-center gap-2">
              <select
                value={timeframe}
                onChange={(e) => onTimeframeChange(e.target.value)}
                className={`px-3 py-2 rounded text-sm border ${
                  isDarkMode
                    ? "bg-[#1e293b] text-white border-gray-600"
                    : "bg-white text-gray-900 border-gray-300"
                }`}
                style={{ cursor: 'pointer' }}
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom Range</option>
              </select>

              {timeframe === "daily" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className={`px-3 py-2 rounded text-sm border ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  style={{ cursor: 'pointer' }}
                />
              )}

              {timeframe === "monthly" && (
                <DatePicker
                  selected={selectedMonth ? moment(selectedMonth + '-01', 'YYYY-MM-DD').toDate() : null}
                  onChange={(date) => onMonthChange(moment(date).format('YYYY-MM'))}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  className={`px-3 py-2 rounded text-sm border ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                />
              )}

              {timeframe === "yearly" && (
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => onYearChange(e.target.value)}
                  min="2020"
                  max={moment().year()}
                  className={`px-3 py-2 rounded text-sm border ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  placeholder="Year"
                />
              )}

              {timeframe === "custom" && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) =>
                      onCustomDateChange(e.target.value, customEndDate)
                    }
                    className={`px-3 py-2 rounded text-sm border ${
                      isDarkMode
                        ? "bg-[#1e293b] text-white border-gray-600"
                        : "bg-white text-gray-900 border-gray-300"
                    }`}
                    placeholder="Start Date"
                  />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) =>
                      onCustomDateChange(customStartDate, e.target.value)
                    }
                    className={`px-3 py-2 rounded text-sm border ${
                      isDarkMode
                        ? "bg-[#1e293b] text-white border-gray-600"
                        : "bg-white text-gray-900 border-gray-300"
                    }`}
                    placeholder="End Date"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ right: 20, left: 0, top: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} strokeOpacity={0.9} />
            <XAxis
              dataKey="label"
              {...getXAxisProps(timeframe, isDarkMode)}
              tickFormatter={getTickFormatter(timeframe)}
            />
            <YAxis
              stroke={isDarkMode ? "#9CA3AF" : "#6b7280"}
              tick={{ fill: isDarkMode ? "#9CA3AF" : "#6b7280" }}
              domain={[
                0,
                (dataMax) => Math.ceil(dataMax + 5),
              ]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#1E293B" : "#ffffff",
                border: isDarkMode ? "1px solid #374151" : "1px solid #d1d5db",
                borderRadius: "6px",
                color: isDarkMode ? "#ffffff" : "#111827"
              }}
              formatter={(value, name) => {
                const numValue = Number(value) || 0;
                const formattedValue = Math.abs(numValue).toFixed(2);
                return [`${formattedValue} kWh`, name];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />

            <Legend />

            {/* Dynamic total consumption - calculated from selected devices */}
            {(selectedLines.hasOwnProperty('total') ? selectedLines.total : true) && (
              <Line
                type="monotone"
                dataKey={(entry) => {
                  // Calculate total from only selected categories
                  let sum = 0;
                  categories.forEach(cat => {
                    if (selectedLines.hasOwnProperty(cat) ? selectedLines[cat] : true) {
                      sum += Number(entry[cat]) || 0;
                    }
                  });
                  return sum;
                }}
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, stroke: "#8b5cf6", strokeWidth: 2 }}
                name="Total Consumption (Selected)"
                legendType="none"
                connectNulls={false}
              />
            )}

            {/* Dynamic device lines */}
            {categories.map((category, index) => (
              (selectedLines.hasOwnProperty(category) ? selectedLines[category] : true) && (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={getCategoryColor(index)}
                  strokeWidth={2}
                  dot={{ fill: getCategoryColor(index), r: 4, strokeWidth: 1 }}
                  activeDot={{
                    r: 6,
                    stroke: getCategoryColor(index),
                    strokeWidth: 2,
                  }}
                  name={category}
                  legendType="none"
                  connectNulls={false}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dynamic Legend with Selection */}
      <div className="mt-6 space-y-3">
       
        
        {/* Legend items */}
        <div className="flex flex-wrap gap-4 justify-center items-center text-center">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedLines.hasOwnProperty('total') ? selectedLines.total : true}
            onChange={() => toggleLine('total')}
            className="w-4 h-4 cursor-pointer"
            style={{ accentColor: '#8b5cf6' }}
          />
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Consumption (Selected):</span>
          <span className={`ml-0 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {(() => {
              // Calculate total from only selected categories
              let total = 0;
              chartData.forEach(dataPoint => {
                categories.forEach(cat => {
                  if (selectedLines.hasOwnProperty(cat) ? selectedLines[cat] : true) {
                    total += Number(dataPoint[cat]) || 0;
                  }
                });
              });
              return Math.abs(total).toFixed(2);
            })()} kWh
          </span>
        </div>
        {(() => {
          // compute totals per category from chartData
          const categoryTotals= {};
          categories.forEach((c) => {
            categoryTotals[c]= Math.abs(chartData.reduce(
              (s, d) => s + (Number(d[c]) || 0),
              0
            ));
          });

          return categories.map((category, index) => (
            <div key={category} 
                 className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedLines.hasOwnProperty(category) ? selectedLines[category] : true}
                onChange={() => toggleLine(category)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: getCategoryColor(index) }}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getCategoryColor(index) }}
              ></div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {category}
                <span className={`ml-1 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {Number(categoryTotals[category] || 0).toFixed(2)} kWh
                </span>
              </span>
            </div>
          ));
        })()}
        </div>
      </div>
    </div>
  );
};

/* ============================
   Main ViewLocation component
   ============================ */
const ViewLocation = () => {
  const { state } = useLocation();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [shrinkHeader, setShrinkHeader] = useState(false);
  const locationId = state?.locationId;
  const [locationData, setLocationData] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [devices, setDevices] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [neonCurrentPage, setNeonCurrentPage] = useState(1);
  const [neonItemsPerPage, setNeonItemsPerPage] = useState(8);
  const [libCurrentPage, setLibCurrentPage] = useState(1);
  const [libItemsPerPage, setLibItemsPerPage] = useState(8);
  const navigate = useNavigate();

  const [timeframe, setTimeframe] = useState("daily");
  const today = moment().format("YYYY-MM-DD");
  const defaultDate =
    timeframe === "daily" ? today : moment().format("YYYY-MM-DD");
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  // Month and Year picker state
  const [selectedMonth, setSelectedMonth] = useState(
    moment().format("YYYY-MM")
  );
  const [selectedYear, setSelectedYear] = useState(moment().format("YYYY"));

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState(
    moment().subtract(7, "days").format("YYYY-MM-DD")
  );
  const [customEndDate, setCustomEndDate] = useState(today);

  const [powerConsumptionData, setPowerConsumptionData] = useState([]);
  const [powerConsumptionResponse, setPowerConsumptionResponse] = useState({}); // Store full response
  const [hourlyUsageData, setHourlyUsageData] = useState([]);
  const [hourlyUsageResponse, setHourlyUsageResponse] = useState({}); // Store full response
  const [energySavedData, setEnergySavedData] = useState([]);
  const [energySavedResponse, setEnergySavedResponse] = useState({});
  const [carbonFootprintData, setCarbonFootprintData] = useState([]);
  const [carbonFootprintResponse, setCarbonFootprintResponse] = useState({});

  const [loadingPower, setLoadingPower] = useState(false);
  const [loadingEnergySaved, setLoadingEnergySaved] = useState(false);
  const [loadingCarbon, setLoadingCarbon] = useState(false);
  const [carbonError, setCarbonError] = useState(null);
  
  // Track selected lines from Power Consumption chart for PDF report
  const [selectedLines, setSelectedLines] = useState({});

  const timeframeRef = useRef(timeframe);
  const selectedDateRef = useRef(selectedDate);
  const selectedMonthRef = useRef(selectedMonth);
  const selectedYearRef = useRef(selectedYear);
  const customStartDateRef = useRef(customStartDate);
  const customEndDateRef = useRef(customEndDate);
  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);
  useEffect(() => {
    selectedMonthRef.current = selectedMonth;
  }, [selectedMonth]);
  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);
  useEffect(() => {
    customStartDateRef.current = customStartDate;
  }, [customStartDate]);
  useEffect(() => {
    customEndDateRef.current = customEndDate;
  }, [customEndDate]);

  const [libiDevices, setLibiDevices] = useState([
    { id: 1, isAuto: true, isManual: false },
    { id: 2, isAuto: false, isManual: true },
    { id: 3, isAuto: true, isManual: false },
  ]);

  const toggleLibi = (id, type) => {
    setLibiDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [type]: !d[type] } : d))
    );
  };

  // Navigation helpers
  const goToNeonPage = (neon) => {
    if (!neon || !neon.device_type) return;
    switch (neon.device_type.toUpperCase()) {
      case "IR":
        navigate(`/neonir/${encodeURIComponent(neon.did)}`);
        break;
      case "MODBUS":
        navigate(`/neonmodbus/${encodeURIComponent(neon.did)}`);
        break;
      case "RELAY":
        navigate(`/neonrelay/${encodeURIComponent(neon.did)}`);
        break;
      default:
        navigate(`/neon/${encodeURIComponent(neon.did)}`);
        break;
    }
  };

  const goToLibPage = (lib) => {
    if (!lib || !lib.did) return;
    navigate(`/lib/${encodeURIComponent(lib.did)}`);
  };

  const goTo3PLibPage = (lib) => {
    if (!lib || !lib.did) return;
    navigate(`/lib3p/${encodeURIComponent(lib.did)}`);
  };

  const toggleDevice = (deviceId) => {
    // keep placeholder (disable changes by default)
  };

  /* ──────────────────────── POWER CONSUMPTION ──────────────────────── */
  const fetchPowerConsumption = useCallback(
    async (tf = timeframeRef.current) => {
      setLoadingPower(true);
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;

        // Build proper query parameters based on timeframe
        let params = {};
        switch (tf) {
          case "daily":
            params.date = selectedDateRef.current;
            break;
          case "monthly":
            params.month = selectedMonthRef.current;
            break;
          case "yearly":
            params.year = selectedYearRef.current;
            break;
          case "custom":
            params.start_date = customStartDateRef.current;
            params.end_date = customEndDateRef.current;
            break;
        }

        const config = {
          headers: {
            Authorization:
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
          params,
        };

        const response = await axios.get(
          `${apiURL}/powerconsumption/location/${locationId}/${tf}`,
          config
        );

        // Handle new API response structure
        if (response.data?.success && response.data?.data) {
          setPowerConsumptionData(response.data.data);
          setPowerConsumptionResponse(response.data); // Save full response with active_inactive
        } else if (Array.isArray(response.data)) {
          // Fallback for old format
          setPowerConsumptionData(response.data);
          setPowerConsumptionResponse({});
        } else {
          setPowerConsumptionData([]);
          setPowerConsumptionResponse({});
        }
      } catch (e) {
        console.error("Error fetching power consumption:", e);
        setPowerConsumptionData([]);
      } finally {
        setLoadingPower(false);
      }
    },
    [locationId]
  );

  /* ──────────────────────── HOURLY USAGE ──────────────────────── */
  const fetchHourlyUsage = useCallback(
    async (tf = timeframeRef.current) => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;

        // Build proper query parameters based on timeframe
        let params = {};
        switch (tf) {
          case "daily":
            params.date = selectedDateRef.current;
            break;
          case "monthly":
            params.month = selectedMonthRef.current;
            break;
          case "yearly":
            params.year = selectedYearRef.current;
            break;
          case "custom":
            params.start_date = customStartDateRef.current;
            params.end_date = customEndDateRef.current;
            break;
        }

        const config = {
          headers: {
            Authorization:
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
          params,
        };

        const response = await axios.get(
          `${apiURL}/hourly-usage/location/${locationId}/${tf}`,
          config
        );

        // Handle API response - store data array and full response separately
        if (response.data?.success) {
          console.log("✅ Hourly usage active_inactive data:", response.data.active_inactive);
          setHourlyUsageData(response.data.data || []);
          setHourlyUsageResponse(response.data); // Store full response with active_inactive
        } else if (Array.isArray(response.data)) {
          // Fallback for simple array response
          setHourlyUsageData(response.data);
          setHourlyUsageResponse({
            data: response.data,
            total_consumption: response.data.reduce(
              (sum, item) =>
                sum + parseFloat(item.total_consumption || item.usage || 0),
              0
            ),
            peak_windows: [],
            peak_hour: null,
            top_3_peak_hours: [],
          });
        } else {
          // Fallback for direct response
          setHourlyUsageData(response.data?.data || []);
          setHourlyUsageResponse(
            response.data || {
              data: [],
              total_consumption: 0,
              peak_windows: [],
            }
          );
        }
      } catch (e) {
        console.error("Error fetching hourly usage:", e);
        setHourlyUsageData([]);
        setHourlyUsageResponse({});
      }
    },
    [locationId]
  );

  /* ──────────────────────── ENERGY SAVED ──────────────────────── */
  const fetchEnergySaved = useCallback(
    async (tf = timeframeRef.current) => {
      setLoadingEnergySaved(true);
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;

        // Build proper query parameters based on timeframe
        let params = {};
        switch (tf) {
          case "daily":
            params.date = selectedDateRef.current;
            break;
          case "monthly":
            params.month = selectedMonthRef.current;
            break;
          case "yearly":
            params.year = selectedYearRef.current;
            break;
          case "custom":
            params.start_date = customStartDateRef.current;
            params.end_date = customEndDateRef.current;
            break;
        }

        const config = {
          headers: {
            Authorization:
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
          params,
        };

        const response = await axios.get(
          `${apiURL}/energy-saved/location/${locationId}/${tf}`,
          config
        );

        // Handle new API response structure
        if (response.data?.success && response.data?.data) {
          console.log("✅ Energy saved active_inactive data:", response.data.active_inactive);
          setEnergySavedData(response.data.data);
          setEnergySavedResponse(response.data); // Store full response with active_inactive
        } else if (Array.isArray(response.data)) {
          // Fallback for old format
          setEnergySavedData(response.data);
          setEnergySavedResponse({});
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          // Handle wrapped response {success: true, data: [...]}
          setEnergySavedData(response.data.data);
          setEnergySavedResponse(response.data);
        } else {
          setEnergySavedData([]);
          setEnergySavedResponse({});
        }
      } catch (e) {
        console.error("Error fetching energy saved:", e);
        setEnergySavedData([]);
        setEnergySavedResponse({});
      } finally {
        setLoadingEnergySaved(false);
      }
    },
    [locationId]
  );

  /* ──────────────────────── CARBON FOOTPRINT ──────────────────────── */
  const fetchCarbonFootprint = useCallback(
    async (tf = timeframeRef.current) => {
      setLoadingCarbon(true);
      setCarbonError(null);
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;

        // Build proper query parameters based on timeframe
        let params = {};
        switch (tf) {
          case "daily":
            params.date = selectedDateRef.current;
            break;
          case "monthly":
            params.month = selectedMonthRef.current;
            break;
          case "yearly":
            params.year = selectedYearRef.current;
            break;
          case "custom":
            params.start_date = customStartDateRef.current;
            params.end_date = customEndDateRef.current;
            break;
        }

        const config = {
          headers: {
            Authorization:
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
          params,
        };

        const response = await axios.get(
          `${apiURL}/carbon-footprint/location/${locationId}/${tf}`,
          config
        );

        // Handle new API response structure
        if (response.data?.success && response.data?.data) {
          setCarbonFootprintData(
            response.data.data.length ? response.data.data : []
          );
          // Store response as-is - merge will happen in the chart component
          setCarbonFootprintResponse(response.data);
        } else if (Array.isArray(response.data)) {
          // Fallback for old format
          setCarbonFootprintData(response.data.length ? response.data : []);
          setCarbonFootprintResponse({});
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          // Handle wrapped response {success: true, data: [...]}
          setCarbonFootprintData(
            response.data.data.length ? response.data.data : []
          );
          setCarbonFootprintResponse(response.data);
        } else {
          setCarbonFootprintData([]);
          setCarbonFootprintResponse({});
        }
      } catch (e) {
        const errorMessage = e.response?.data?.message || e.message;
        setCarbonError(errorMessage);
        setCarbonFootprintData([]);
        console.error("Error fetching carbon footprint:", errorMessage);
      } finally {
        setLoadingCarbon(false);
      }
    },
    [locationId]
  );

  const handleTimeframeChange = (newTf) => {
    setTimeframe(newTf);
    timeframeRef.current = newTf;

    if (newTf === "daily") {
      const today = moment().format("YYYY-MM-DD");
      setSelectedDate(today);
      selectedDateRef.current = today;
    } else if (newTf === "custom") {
      // Set default custom range to last 7 days
      const startDate = moment().subtract(7, "days").format("YYYY-MM-DD");
      const endDate = moment().format("YYYY-MM-DD");
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
      customStartDateRef.current = startDate;
      customEndDateRef.current = endDate;
    }

    // Call all fetch functions with the new timeframe
    fetchPowerConsumption(newTf);
    fetchHourlyUsage(newTf);
    fetchEnergySaved(newTf);
    fetchCarbonFootprint(newTf);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    selectedDateRef.current = newDate;

    // Always use daily timeframe when date picker is used
    fetchPowerConsumption("daily");
    fetchHourlyUsage("daily");
    fetchEnergySaved("daily");
    fetchCarbonFootprint("daily");
  };

  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    selectedMonthRef.current = newMonth;

    // Fetch data with monthly timeframe
    fetchPowerConsumption("monthly");
    fetchHourlyUsage("monthly");
    fetchEnergySaved("monthly");
    fetchCarbonFootprint("monthly");
  };

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    selectedYearRef.current = newYear;

    // Fetch data with yearly timeframe
    fetchPowerConsumption("yearly");
    fetchHourlyUsage("yearly");
    fetchEnergySaved("yearly");
    fetchCarbonFootprint("yearly");
  };

  const handleCustomDateChange = (startDate, endDate) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    customStartDateRef.current = startDate;
    customEndDateRef.current = endDate;

    // Fetch data with custom timeframe
    fetchPowerConsumption("custom");
    fetchHourlyUsage("custom");
    fetchEnergySaved("custom");
    fetchCarbonFootprint("custom");
  };

  useEffect(() => {
    if (!locationId) return;

    // Create stable fetch function that doesn't depend on other state
    const doFetch = () => {
      const tf = timeframeRef.current;
      fetchPowerConsumption(tf);
      fetchHourlyUsage(tf);
      fetchEnergySaved(tf);
      fetchCarbonFootprint(tf);
    };

    // initial load
    doFetch();

    const interval = setInterval(doFetch, 5 * 60 * 1000); // 5 min

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]); // Only re-run when locationId changes
  /* ========
  ====================
     Fetch location and device details
     ============================ */
  useEffect(() => {
    const fetchLocationDetails = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;

        const response = await axios.get(
          `${apiURL}/location-details/${locationId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization:
                localStorage.getItem("token") ||
                sessionStorage.getItem("token"),
            },
          }
        );
        setLocationData(response.data);

        const deviceResponse = await axios.get(
          `${apiURL}/device-location/iot/${locationId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization:
                localStorage.getItem("token") ||
                sessionStorage.getItem("token"),
            },
          }
        );

        const rawData = deviceResponse.data || {};
        const normalized = {
          ...rawData,
          ThreePLIB:
            rawData.ThreePLIB ||
            rawData["3pLIB"] ||
            rawData["3PLIB"] ||
            rawData.lib_3p_devices ||
            [],
        };
        setDeviceData(normalized);

        // map iATM devices (if present)
        const data = deviceResponse.data;
        if (data && data["iATM"] && data["iATM"].length > 0) {
          const item = data["iATM"][0];
          const mappedDevices = [
            {
              id: 1,
              name: `${item.device_name} AC 1`,
              toggleStatus: item.r1_status_db,
              status: item.r1_working_status_db,
              compressor: item.r1_comp_status_db,
              cooling: item.r1_cooling_status_db,
              current: item.curr_r1,
              power: `${item.kwh_r1_today || 0} kWh`,
              icon: Snowflake,
              color: "bg-blue-500",
              type: "ac",
            },
            {
              id: 2,
              name: `${item.device_name} AC 2`,
              toggleStatus: item.r2_status_db,
              status: item.r2_working_status_db,
              compressor: item.r2_comp_status_db,
              cooling: item.r2_cooling_status_db,
              current: item.curr_r2,
              power: `${item.kwh_r2_today || 0} kWh`,
              icon: Snowflake,
              color: "bg-blue-500",
              type: "ac",
            },
            {
              id: 3,
              name: `${item.device_name} Lights`,
              toggleStatus: item.r3_status_db,
              current: item.curr_r3,
              status: item.r3_working_status_db,
              power: `${item.kwh_r3_today || 0} kWh`,
              icon: Lightbulb,
              color: "bg-yellow-500",
            },
            {
              id: 4,
              name: `${item.device_name} Signage`,
              toggleStatus: item.r4_status_db,
              current: item.curr_r4,
              status: item.r4_working_status_db,
              power: `${item.kwh_r4_today || 0} kWh`,
              icon: Monitor,
              color: "bg-green-500",
            },
            {
              id: 5,
              name: `${item.device_name} UPS`,
              current: item.curr_r8,
              status: item.curr_r8 > 0 ? "Working" : "Not Working",
              power: `${item.kwh_r8_today || 0} kWh`,
              icon: RadioReceiver,
              color: "bg-gray-500",
            },
          ];
          setDevices(mappedDevices);
        }
      } catch (err) {
        console.error("Error fetching location details:", err);
      }
    };

    if (locationId) {
      fetchLocationDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]); // Only re-run when locationId changes

  /* Navbar height effect preserved */
  useEffect(() => {
    const navbar = document.getElementById("main-navbar");
    if (navbar) {
      const updateHeight = () => {
        document.documentElement.style.setProperty(
          "--navbar-height",
          `${navbar.offsetHeight}px`
        );
      };

      updateHeight();
      window.addEventListener("resize", updateHeight);

      return () => window.removeEventListener("resize", updateHeight);
    }
  }, []);

  if (!locationData) {
    return (
      <div className="p-6 text-white">
        <h2>Loading location details...</h2>
      </div>
    );
  }
  const exportLocationReportToExcel = () => {
  if (
    !powerConsumptionData.length &&
    !hourlyUsageData.length &&
    !energySavedData.length &&
    !carbonFootprintData.length
  ) {
    alert("No data available to export!");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Helper: Add styled header
  const addStyledHeader = (ws, headers, bgColor) => {
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
  if (powerConsumptionData.length > 0) {
    const categories = getCategories(powerConsumptionData);
    const powerSheet = powerConsumptionData.map((item) => {
      const row = {
        Time: moment(item.period || item.date).format("DD MMM YYYY HH:mm"),
      };
      categories.forEach((c) => {
        row[c] = Number(item[c] || 0).toFixed(3);
      });
      row["Total (kWh)"] = Number(
        item.total_consumption || item.total_power_consumption || 0
      ).toFixed(3);
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(powerSheet);
    addStyledHeader(ws, ["Time", ...categories, "Total (kWh)"], "FF22C55E"); // Green
    ws["!cols"] = Array(Object.keys(powerSheet[0] || {}).length).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws, "Power Consumption");
  }

  // 2. Hourly Usage Breakdown (UPDATED)
  const hourlyArray = Array.isArray(hourlyUsageData)
    ? hourlyUsageData
    : Array.isArray(hourlyUsageData?.data)
    ? hourlyUsageData.data
    : [];

  if (hourlyArray.length > 0) {
    const categories = getCategories(hourlyArray);
    const hourlySheet = hourlyArray.map((item) => {
      const row = {
        Period: moment(item.period || item.date).format("DD MMM YYYY HH:mm"),
      };
      categories.forEach((c) => {
        row[c] = Number(item[c] || 0).toFixed(3);
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(hourlySheet);
    addStyledHeader(ws, ["Period", ...categories], "FFF97316"); // Orange
    ws["!cols"] = Array(Object.keys(hourlySheet[0] || {}).length).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(wb, ws, "Hourly Usage");
  }

  // 3. Energy Saved
  if (energySavedData.length > 0) {
    const energySheet = energySavedData.map((item) => ({
      Period: moment(item.period || item.date).format("DD MMM YYYY HH:mm"),
      "Energy Saved (kWh)": Number(
        item.carbon_saved_kg || item.energy_saved_wh || item.energy_saved || 0
      ).toFixed(3),
      "Baseline (kWh)": Number(
        item.baseline_wh || item.baseline_consumption || 0
      ).toFixed(3),
      "Actual (kWh)": Number(
        item.actual_consumption_wh || item.actual_consumption || 0
      ).toFixed(3),
    }));
    const ws = XLSX.utils.json_to_sheet(energySheet);
    addStyledHeader(
      ws,
      ["Period", "Energy Saved (kWh)", "Baseline (kWh)", "Actual (kWh)"],
      "FF0891B2"
    );
    ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, "Energy Saved");
  }

  // 4. Carbon Footprint
  if (carbonFootprintData.length > 0) {
    const carbonSheet = carbonFootprintData.map((item) => ({
      Period: moment(item.period || item.date).format("DD MMM YYYY HH:mm"),
      "Carbon Saved (kg CO₂)": Number(item.carbon_saved_kg || 0).toFixed(3),
      "Consumption (kWh)": Number(
        item.actual_consumption_wh || item.total_consumption || 0
      ).toFixed(3),
    }));
    const ws = XLSX.utils.json_to_sheet(carbonSheet);
    addStyledHeader(
      ws,
      ["Period", "Carbon Saved (kg CO₂)", "Consumption (kWh)"],
      "FF6366F1"
    );
    ws["!cols"] = [{ wch: 22 }, { wch: 26 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Carbon Footprint");
  }

  // 5. Summary Sheet
  const totalPower = powerConsumptionData.reduce(
    (s, i) => s + (Number(i.total_consumption) || 0),
    0
  );
  const totalEnergySaved = energySavedData.reduce(
    (s, i) => s + Number(i.carbon_saved_kg || i.energy_saved_wh || 0),
    0
  );
  const totalCarbonSaved = carbonFootprintData.reduce(
    (s, i) => s + Number(i.carbon_saved_kg || 0),
    0
  );

  const summary = [
    { Metric: "Location Name", Value: locationData?.loc_name || "Unknown" },
    { Metric: "Branch Code", Value: locationData?.branch_code || "N/A" },
    {
      Metric: "Report Generated",
      Value: moment().format("DD MMM YYYY, hh:mm A"),
    },
    {
      Metric: "Timeframe",
      Value: timeframe.charAt(0).toUpperCase() + timeframe.slice(1),
    },
    {
      Metric: "Selected Date",
      Value: moment(selectedDate).format("DD MMM YYYY"),
    },
    { Metric: "Total Power Consumed", Value: `${totalPower.toFixed(3)} kWh` },
    { Metric: "Net Energy Saved", Value: `${totalEnergySaved.toFixed(3)} kWh` },
    { Metric: "Net Carbon Saved", Value: `${totalCarbonSaved.toFixed(3)} kg CO₂` },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  addStyledHeader(wsSummary, ["Metric", "Value"], "FF1E293B");
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // Filename
  const fileName = `${locationData?.loc_name || "Location"}_Report_${moment().format(
    "YYYY-MM-DD_HHmm"
  )}.xlsx`;

  XLSX.writeFile(wb, fileName);
};


  return (
    <div className={`component-body mt-6 p-6 w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`} style={!isDarkMode ? { backgroundColor: '#f8f9fa' } : {}}>
      <div className="w-full">
        <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
          <div className="location-header-section">
            {/* Location Details Card */}
            <div className={`rounded-lg p-4 mb-6 w-full ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 text-sm">
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Location Name</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{locationData.loc_name}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Branch Code</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{locationData.branch_code}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Country</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{locationData.country_name}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Region</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{locationData.region_name}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>State</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{locationData.state_name}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>City</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{locationData.city_name}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Last Data Received</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {locationData.last_data_received
                      ? moment(locationData.last_data_received).format(
                          "DD-MM-YYYY HH:mm:ss"
                        )
                      : "No Data"}
                  </p>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between mt-6 border-b px-4 ${isDarkMode ? 'border-gray-700 bg-[#0a101f]' : 'border-gray-200 bg-white'}`}>
              <TabList className="flex space-x-1">
                <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 border-transparent focus:outline-none ${
                  isDarkMode 
                    ? 'hover:text-white hover:border-gray-600 data-[selected=true]:text-blue-400 data-[selected=true]:border-blue-400'
                    : 'hover:text-gray-900 hover:border-gray-400 data-[selected=true]:text-blue-600 data-[selected=true]:border-blue-600'
                }`}>
                  Dashboard
                </Tab>
                <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 border-transparent focus:outline-none ${
                  isDarkMode 
                    ? 'hover:text-white hover:border-gray-600 data-[selected=true]:text-blue-400 data-[selected=true]:border-blue-400'
                    : 'hover:text-gray-900 hover:border-gray-400 data-[selected=true]:text-blue-600 data-[selected=true]:border-blue-600'
                }`}>
                  AI IoT
                </Tab>
              </TabList>
 
            </div> 
          </div>

          <div className="scrollable-content mt-6">
            <TabPanel>
             
              <div className={`rounded-lg p-6 shadow-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
                
                {/* Header: Title with Icon, Tabs and Date Selector, PDF/Excel Buttons */}
                <div className="relative flex justify-between items-center mb-6">
                  {/* Left: Energy Metrics Title with Icon */}
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                    </svg>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Energy Metrics</span>
                  </h2>

                  {/* Center: Timeframe Selector and Date Filter */}
                  <div className="flex items-center gap-4">
                    {/* Timeframe Selector - Button Group */}
                    <div className={`inline-flex rounded-lg ${isDarkMode ? 'bg-[#1e293b]' : 'bg-gray-100'} p-1`}>
                      {['daily', 'monthly', 'yearly'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => handleTimeframeChange(tf)}
                          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                            timeframe === tf
                              ? isDarkMode
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-blue-600 shadow-sm'
                              : isDarkMode
                              ? 'text-gray-400 hover:text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {tf.charAt(0).toUpperCase() + tf.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Date Display with Calendar Dropdown */}
                    <div className="relative flex items-center">
                      {timeframe === "custom" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                            className={`px-3 py-1.5 rounded border text-sm font-medium w-[120px] focus:outline-none ${
                              isDarkMode
                                ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                                : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                            }`}
                          />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>to</span>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                            className={`px-3 py-1.5 rounded border text-sm font-medium w-[120px] focus:outline-none ${
                              isDarkMode
                                ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                                : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                            }`}
                          />
                        </div>
                      ) : (
                        <>
                          <DatePicker
                            selected={
                              timeframe === 'daily'
                                ? selectedDate instanceof Date ? selectedDate : new Date(selectedDate)
                                : timeframe === 'monthly'
                                ? selectedMonth ? moment(selectedMonth + '-01', 'YYYY-MM-DD').toDate() : null
                                : timeframe === 'yearly'
                                ? selectedYear ? new Date(selectedYear, 0, 1) : null
                                : null
                            }
                            onChange={(date) => {
                              if (timeframe === 'daily') {
                                handleDateChange(moment(date).format('YYYY-MM-DD'));
                              } else if (timeframe === 'monthly') {
                                handleMonthChange(moment(date).format('YYYY-MM'));
                              } else if (timeframe === 'yearly') {
                                handleYearChange(moment(date).format('YYYY'));
                              }
                            }}
                            dateFormat={
                              timeframe === 'daily'
                                ? 'dd MMM'
                                : timeframe === 'yearly'
                                ? 'yyyy'
                                : 'MMMM'
                            }
                            showMonthYearPicker={timeframe === 'monthly'}
                            showYearPicker={timeframe === 'yearly'}
                            className={`px-3 py-1.5 pr-10 rounded border text-sm font-medium w-[120px] focus:outline-none ${
                              isDarkMode
                                ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                                : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                            }`}
                          />
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
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: PDF/Excel Buttons */}
                  <div className="flex gap-3">
                    <PDFReport
                      locationData={locationData}
                      powerConsumptionData={powerConsumptionData}
                      hourlyUsageData={hourlyUsageData}
                      energySavedData={energySavedData}
                      carbonFootprintData={carbonFootprintData}
                      timeframe={timeframe}
                      selectedDate={selectedDate}
                      selectedMonth={selectedMonth}
                      selectedYear={selectedYear}
                      customStartDate={customStartDate}
                      customEndDate={customEndDate}
                      energySavedResponse={energySavedResponse}
                      carbonFootprintResponse={carbonFootprintResponse}
                      isDarkMode={isDarkMode}
                    />
                    <button
                      onClick={() => exportLocationReportToExcel()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#76df23] hover:bg-[#5cb91e] rounded-lg shadow-lg transition-all hover:scale-105 active:scale-100 whitespace-nowrap"
                      title="Download Full Report (Excel)"
                    >
                      <img src="..\src\assets\img\alerts\excel.svg" alt="excel" className="w-4 h-4" style={{filter: 'brightness(1) invert(0)'}} />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {/* Power Consumed */}
                  <div className={`rounded-lg p-4 border shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-white border-blue-500'}`}>
                    <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                      </svg>
                      Power Consumed
                    </div>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {powerConsumptionData.reduce((sum, item) => sum + (Number(item.total_consumption) || 0), 0).toFixed(2)} kWh
                    </div>
                  </div>

                  {/* Baseline (from Energy Saved) */}
                 <div
  className={`rounded-lg p-4 border shadow-lg ${
    isDarkMode
      ? 'bg-gradient-to-br from-[#2d1f1a] to-[#1a1310] border-orange-500/30'
      : 'bg-gradient-to-br from-orange-50 to-white border-orange-500'
  }`}
>
  <div className="flex items-center gap-2 mb-2">
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

    <div
      className={`text-xs ${
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      }`}
    >
      Energy Consumption Baseline
    </div>
  </div>

  <div
    className={`text-2xl font-bold ${
      isDarkMode ? 'text-white' : 'text-gray-900'
    }`}
  >
    {Number(energySavedResponse?.total_baseline_wh || 0).toFixed(2)} kWh
  </div>

  {/* <div
    className={`text-xs mt-1 ${
      isDarkMode ? 'text-gray-500' : 'text-gray-600'
    }`}
  >
    Energy vs Baseline
  </div> */}
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
                      {Number(energySavedResponse?.total_energy_saved || 0).toFixed(2)} kWh
                    </div>
                    {/* <div className="text-xs text-green-500 font-semibold mt-1">
                      Assumed Save
                    </div> */}
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
                      {Number(carbonFootprintResponse?.savings?.carbon_saved_kg || 0).toFixed(2)} kg
                    </div>
                    
                  </div>
                </div>

                {/* Charts Grid - Power Consumption Full Width, then 3 charts in one row */}
                <div className="mb-8">
                  {/* Power Consumption Chart - Full Width */}
                  <div className="mb-6">
                    <DynamicPowerChart
                      data={powerConsumptionData}
                      timeframe={timeframe}
                      selectedDate={selectedDate}
                      selectedMonth={selectedMonth}
                      selectedYear={selectedYear}
                      customStartDate={customStartDate}
                      customEndDate={customEndDate}
                      onTimeframeChange={handleTimeframeChange}
                      onDateChange={handleDateChange}
                      onMonthChange={handleMonthChange}
                      selectedLines={selectedLines}
                      onSelectedLinesChange={setSelectedLines}
                      onYearChange={handleYearChange}
                      onCustomDateChange={handleCustomDateChange}
                      isDarkMode={isDarkMode}
                      hideSelector={true}
                    />
                  </div>

                  {/* Three Charts in One Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Energy Saved Chart */}
                    <EnergySavedChart
                      data={energySavedData}
                      apiResponse={energySavedResponse}
                      powerConsumptionResponse={powerConsumptionResponse}
                      timeframe={timeframe}
                      selectedDate={selectedDate}
                      isDarkMode={isDarkMode}
                    />

                    {/* Carbon Footprint Chart */}
                    <CarbonFootprintChart
                      data={carbonFootprintData}
                      apiResponse={carbonFootprintResponse}
                      powerConsumptionResponse={powerConsumptionResponse}
                      timeframe={timeframe}
                      selectedDate={selectedDate}
                      loading={loadingCarbon}
                      error={carbonError}
                      isDarkMode={isDarkMode}
                    />

                    {/* Hourly Usage Chart */}
                    <EnhancedHourlyUsage
                      apiResponse={hourlyUsageResponse}
                      data={hourlyUsageData}
                      powerConsumptionResponse={powerConsumptionResponse}
                      timeframe={timeframe}
                      selectedDate={selectedDate}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </div>

                {/* Bottom Metrics Row - Hourly Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Max Demand */}
                  <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-[#1a2540] border-orange-500/40' : 'bg-orange-50 border-orange-300'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Demand</p>
                      {/* <Zap className="w-4 h-4" style={{ color: isDarkMode ? '#fb923c' : '#f97316' }} /> */}
                    </div>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {hourlyUsageResponse?.peak_hour?.consumption ? `${Number(hourlyUsageResponse.peak_hour.consumption).toFixed(2)} kWh` : 'N/A'}
                    </p>
                    {hourlyUsageResponse?.peak_hour?.time && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        at {moment(hourlyUsageResponse.peak_hour.time).format('HH:mm')}
                      </p>
                    )}
                  </div>

                  {/* Peak Window */}
                  <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-[#1a2540] border-blue-500/40' : 'bg-blue-50 border-blue-300'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Peak Window</p>
                      {/* <Clock className="w-4 h-4" style={{ color: isDarkMode ? '#60a5fa' : '#3b82f6' }} /> */}
                    </div>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {hourlyUsageResponse?.peak_windows?.length ? hourlyUsageResponse.peak_windows.map(w => w.window).join(', ') : 'N/A'}
                    </p>
                    {hourlyUsageResponse?.peak_windows?.length > 0 && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {hourlyUsageResponse.peak_windows[0]?.consumption ? `${Number(hourlyUsageResponse.peak_windows[0].consumption).toFixed(2)} kWh peak` : ''}
                      </p>
                    )}
                  </div>

                  {/* Active Hours */}
                  <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-[#1a2540] border-green-500/40' : 'bg-green-50 border-green-300'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Hours</p>
                      {/* <CheckCircle className="w-4 h-4" style={{ color: isDarkMode ? '#4ade80' : '#22c55e' }} /> */}
                    </div>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {(() => {
                        const activeHours = hourlyUsageResponse?.active_inactive?.active_hours_consumption || powerConsumptionResponse?.active_inactive?.active_hours_consumption || 0;
                        return `${Number(activeHours).toFixed(2)} kWh`;
                      })()}
                    </p>
                    {/* <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>8AM - 8PM</p> */}
                  </div>

                  {/* Inactive Hours */}
                  <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-[#1a2540] border-gray-500/40' : 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Inactive Hours</p>
                      {/* <Moon className="w-4 h-4" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }} /> */}
                    </div>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {(() => {
                        const inactiveHours = hourlyUsageResponse?.active_inactive?.inactive_hours_consumption || powerConsumptionResponse?.active_inactive?.inactive_hours_consumption || 0;
                        return `${Number(inactiveHours).toFixed(2)} kWh`;
                      })()}
                    </p>
                    {/* <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>8PM - 8AM</p> */}
                  </div>
                </div>
              </div>
            </TabPanel>

            <TabPanel>
              {/* AI IoT tab content unchanged (devices, gauges) */}
              {deviceData?.iATM && deviceData?.iATM.length > 0 && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-2 gap-9">
                    <div className={`rounded-lg p-6 flex flex-col items-center ${isDarkMode ? 'bg-[#121f3d]' : 'bg-white border border-gray-200'}`}>
                      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {deviceData?.iATM?.[0]?.device_name} Row Power
                      </h3>
                      <LiveGauge
                        vPhaseEarth={Number(deviceData?.iATM?.[0]?.ve) || 0}
                        vPhaseNeutral={Number(deviceData?.iATM?.[0]?.vn) || 0}
                      />
                    </div>
                    <div className={`rounded-lg p-6 flex flex-col items-center ${isDarkMode ? 'bg-[#121f3d]' : 'bg-white border border-gray-200'}`}>
                      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {deviceData?.iATM?.[0]?.device_name} UPS Power
                      </h3>
                      <LiveGauge
                        vPhaseEarth={Number(deviceData?.iATM?.[0]?.ue) || 0}
                        vPhaseNeutral={Number(deviceData?.iATM?.[0]?.un) || 0}
                      />
                    </div>
                  </div>
                  <br />
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-9">
                    {devices.map((device) => {
                      const IconComponent = device.icon;
                      return (
                        <div
                          key={device.id}
                          className={`rounded-xl p-8 relative min-h-[230px] ${isDarkMode ? 'bg-[#121f3d]' : 'bg-white border border-gray-200'}`}
                        >
                          <div className="absolute top-4 right-4">
                            {device.toggleStatus && (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-medium ${
                                    device.toggleStatus === "On"
                                      ? "text-green-400"
                                      : "text-grey-400"
                                  }`}
                                >
                                  {device.toggleStatus}
                                </span>
                                <button
                                  onClick={() => toggleDevice(device.id)}
                                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-not-allowed ${
                                    device.toggleStatus === "On"
                                      ? "bg-green-500"
                                      : "bg-gray-600"
                                  }`}
                                >
                                  <div
                                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 cursor-not-allowed ${
                                      device.toggleStatus === "On"
                                        ? "translate-x-6"
                                        : "translate-x-0.5"
                                    }`}
                                  />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-4 h-full">
                            <div className="flex-shrink-0">
                              <div
                                className={`w-10 h-10 ${device.color} rounded-full flex items-center justify-center`}
                              >
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <h3 className="text-lg font-semibold mb-1">
                                  {device.name}
                                </h3>
                              </div>
                              <div className="space-y-2 text-sm">
                                {/* Device details */}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Neon Devices */}
              {deviceData?.Neon?.length > 0 && (() => {
                const neonTotalPages = Math.ceil(deviceData.Neon.length / neonItemsPerPage);
                const neonPaginatedDevices = deviceData.Neon.slice(
                  (neonCurrentPage - 1) * neonItemsPerPage,
                  neonCurrentPage * neonItemsPerPage
                );
                return (
                <>
                  <br />
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 -mt-6">
                    {neonPaginatedDevices.map((neon, idx) => (
                      <div
                        key={idx}
                        onClick={() => goToNeonPage(neon)}
                        className={`rounded-xl p-6 min-h-[160px] cursor-pointer transition-colors flex flex-col justify-start ${
                          isDarkMode 
                            ? 'bg-[#121f3d] hover:bg-[#1e293b]' 
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <Snowflake className="w-5 h-5 text-white" />
                          </div>
                          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {neon.device_name}
                          </h3>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Current Temp:</span>
                            <span className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {neon.tempip ?? "-"}°C
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Set Temp:</span>
                            <span className={`font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                              {neon.mantemp ?? "-"}°C
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>AC Make:</span>
                            <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {neon.remote_make ?? "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Neon Devices Pagination */}
                  {deviceData.Neon.length > 0 && (
                    <div className={`flex justify-between items-center mt-6 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}>
                      <div className="flex items-center gap-4">
                        <span>Items per page:</span>
                        <select
                          value={neonItemsPerPage}
                          onChange={(e) => {
                            setNeonItemsPerPage(Number(e.target.value));
                            setNeonCurrentPage(1);
                          }}
                          className={isDarkMode ? "bg-[#0f172b] border border-gray-600 rounded px-2 py-1" : "bg-white border border-gray-300 rounded px-2 py-1 text-gray-900"}
                        >
                          {[4, 8, 12, 16].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>
                          Page {neonCurrentPage} of {neonTotalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setNeonCurrentPage(1)}
                            disabled={neonCurrentPage === 1}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            «« 
                          </button>
                          <button
                            onClick={() => setNeonCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={neonCurrentPage === 1}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            «
                          </button>
                          <button
                            onClick={() => setNeonCurrentPage((p) => Math.min(p + 1, neonTotalPages))}
                            disabled={neonCurrentPage === neonTotalPages}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            »
                          </button>
                          <button
                            onClick={() => setNeonCurrentPage(neonTotalPages)}
                            disabled={neonCurrentPage === neonTotalPages}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            »»
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
                );
              })()}

              {/* LIB Devices */}
              {deviceData?.LIB?.length > 0 && (() => {
                const libTotalPages = Math.ceil(deviceData.LIB.length / libItemsPerPage);
                const libPaginatedDevices = deviceData.LIB.slice(
                  (libCurrentPage - 1) * libItemsPerPage,
                  libCurrentPage * libItemsPerPage
                );
                return (
                <>
                  <br />
                  <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>LIB Devices</h3>
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {libPaginatedDevices.map((lib, idx) => (
                      <div
                        key={idx}
                        onClick={() => goToLibPage(lib)}
                        className={`rounded-xl p-6 min-h-[160px] cursor-pointer transition-colors flex flex-col justify-start ${
                          isDarkMode 
                            ? 'bg-[#121f3d] hover:bg-[#1e293b]' 
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-white" />
                          </div>
                          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {lib.device_name}
                          </h3>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Device ID:</span>
                            <span className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {lib.did}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Device Type:</span>
                            <span className={`font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                              {lib.device_type}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Device ID (DB):
                            </span>
                            <span className="text-green-400 font-medium">
                              {lib.dev_id || lib.did}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* LIB Devices Pagination */}
                  {deviceData.LIB.length > 0 && (
                    <div className={`flex justify-between items-center mt-6 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}>
                      <div className="flex items-center gap-4">
                        <span>Items per page:</span>
                        <select
                          value={libItemsPerPage}
                          onChange={(e) => {
                            setLibItemsPerPage(Number(e.target.value));
                            setLibCurrentPage(1);
                          }}
                          className={isDarkMode ? "bg-[#0f172b] border border-gray-600 rounded px-2 py-1" : "bg-white border border-gray-300 rounded px-2 py-1 text-gray-900"}
                        >
                          {[4, 8, 12, 16].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>
                          Page {libCurrentPage} of {libTotalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLibCurrentPage(1)}
                            disabled={libCurrentPage === 1}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            «« 
                          </button>
                          <button
                            onClick={() => setLibCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={libCurrentPage === 1}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            «
                          </button>
                          <button
                            onClick={() => setLibCurrentPage((p) => Math.min(p + 1, libTotalPages))}
                            disabled={libCurrentPage === libTotalPages}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            »
                          </button>
                          <button
                            onClick={() => setLibCurrentPage(libTotalPages)}
                            disabled={libCurrentPage === libTotalPages}
                            className={`px-3 py-1 rounded disabled:opacity-50 ${
                              isDarkMode ? "bg-[#1a253f] hover:bg-[#2d3b5e]" : "bg-gray-200 hover:bg-gray-300"
                            }`}
                          >
                            »»
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
                );
              })()}

              {/* 3PLIB Devices */}
              {deviceData?.ThreePLIB?.length > 0 && (
                <>
                  <br />
                  <h3 className="text-xl font-semibold mb-4">3PLIB Devices</h3>
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {deviceData.ThreePLIB.map((lib, idx) => (
                      <div
                        key={idx}
                        onClick={() => goTo3PLibPage(lib)}
                        className={`rounded-xl p-6 min-h-[160px] cursor-pointer transition-colors flex flex-col justify-start ${
                          isDarkMode ? 'bg-[#121f3d] hover:bg-[#1e293b]' : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold">
                            {lib.device_name}
                          </h3>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Device ID:</span>
                            <span className="text-blue-400 font-medium">
                              {lib.did}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Device Type:</span>
                            <span className="text-yellow-400 font-medium">
                              {lib.device_type}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Device ID (DB):
                            </span>
                            <span className="text-green-400 font-medium">
                              {lib.dev_id || lib.did}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabPanel>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ViewLocation;
