import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { useParams, useNavigate } from "react-router-dom";
import {
  Snowflake,
  Wind,
  Minus,
  Plus,
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
  AreaChart,
  Area,
  ReferenceDot,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import useAuthFetch from "../../hooks/useAuthFetch";
import { useTheme } from "../../../context/ThemeContext";
import moment from "moment-timezone";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSlidersH, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";

// Helper to get correct baseline value - FIXED
const getBaselineValue = (apiResponse, type = 'power', timeframe = 'daily') => {
  if (!apiResponse?.baseline) return 0;
  
  if (type === 'power') {
    // The API fields are mislabeled - 'daily_wh' is actually in kWh
    if (timeframe === 'daily') {
      return Number(apiResponse.baseline.daily_wh || apiResponse.baseline.total_kwh || 0);
    } else if (timeframe === 'monthly') {
      return Number(apiResponse.baseline.monthly_wh || 0);
    } else if (timeframe === 'yearly') {
      const monthly = Number(apiResponse.baseline.monthly_wh || 0);
      return monthly * 12;
    } else {
      return Number(apiResponse.baseline.total_kwh || 0);
    }
  } else if (type === 'carbon') {
    return Number(apiResponse.baseline.total_carbon_kg || 0);
  }
  return 0;
};

// Helper to get actual consumption value - FIXED
const getActualValue = (apiResponse, type = 'power') => {
  if (!apiResponse?.actual) return 0;
  
  if (type === 'power') {
    return Number(apiResponse.actual.total_consumption_kwh || 0);
  } else if (type === 'carbon') {
    return Number(apiResponse.actual.total_carbon_kg || 0);
  }
  return 0;
};

// Helper to get saved value - FIXED
const getSavedValue = (apiResponse, type = 'power') => {
  if (!apiResponse?.savings) return 0;
  
  if (type === 'power') {
    return Number(apiResponse.savings.power_saved_kwh || 0);
  } else if (type === 'carbon') {
    return Number(apiResponse.savings.carbon_saved_kg || 0);
  }
  return 0;
};

/* ────────────────────── SUMMARY CARDS ────────────────────── */
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
                : 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(243,244,246,0.9))',
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
                : 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(243,244,246,0.9))',
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className={`text-xs truncate mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</div>
            <div
              className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
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

const EnergySavedChart = ({ data = [], apiResponse = {}, timeframe, selectedDate, activeInactive = { active: '0.00', inactive: '0.00' }, isDark = true }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    console.log('EnergySavedChart - Raw data:', data);
    
    if (!data || data.length === 0) {
      console.log('EnergySavedChart - No data available');
      setChartData([]);
      return;
    }
    
    // Process data from API response - CUMULATIVE values
    let cumulativeActual = 0;
    const processedData = data.map((item) => {
      // Use actual_consumption_kwh and accumulate it
      const actual = Number(item.used || item.actual_consumption_kwh || item.total_consumption_kwh || 0);
      cumulativeActual += actual;
      
      // Use the label or time from the item, or extract from period
      let label = item.label || item.time;
      if (!label && item.period) {
        switch (timeframe) {
          case "daily": label = moment(item.period).format("HH:mm"); break;
          case "monthly": label = moment(item.period).format("DD MMM"); break;
          case "yearly": label = moment(item.period).format("MMM"); break;
          case "custom": label = moment(item.period).format("DD MMM"); break;
          default: label = moment(item.period).format("HH:mm");
        }
      }
      
      return { 
        period: item.period || item.time, 
        label: label || 'N/A', 
        actual_consumption: cumulativeActual,
        status: item.status 
      };
    });
    
    console.log('EnergySavedChart - Processed data:', processedData);
    setChartData(processedData);
  }, [data, timeframe]);

  const totalBaseline = getBaselineValue(apiResponse, 'power', timeframe);
  const totalActual = getActualValue(apiResponse, 'power');
  const totalSaved = totalBaseline - totalActual; // Calculate directly: positive = saved, negative = exceeded

  const exceededBaseline = totalActual > totalBaseline;
  const activeHoursTotal = Number(activeInactive.active) || 0;
  const inactiveHoursTotal = Number(activeInactive.inactive) || 0;

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Energy Consumption vs Baseline</h3>
        <div className={`h-[300px] flex flex-col items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>No energy consumption data available</p>
          <p className="text-xs mt-2">Debug: chartData length = {chartData?.length || 0}, data length = {data?.length || 0}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Energy Consumption vs Baseline</h3>
        {selectedDate && (
          <span className={`text-sm ml-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {timeframe === "daily" 
              ? moment(selectedDate).format("MMM DD, YYYY")
              : moment(selectedDate).format("MMMM YYYY")}
          </span>
        )}
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
            <XAxis 
              dataKey="label" 
              stroke={isDark ? "#9CA3AF" : "#6b7280"} 
              interval="preserveStartEnd" 
              tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6b7280" }} 
              angle={timeframe === "monthly" ? -45 : 0}
              textAnchor={timeframe === "monthly" ? "end" : "middle"}
              height={timeframe === "monthly" ? 60 : 30}
            />
            <YAxis
              stroke={isDark ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6b7280" }}
              label={{ 
                value: "kWh", 
                angle: -90, 
                position: "insideLeft", 
                style: { fill: isDark ? "#9CA3AF" : "#6b7280", fontSize: 11 } 
              }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF", 
                border: `1px solid ${isDark ? "#475569" : "#e5e7eb"}`, 
                borderRadius: "8px", 
                padding: "8px 12px",
                color: isDark ? "white" : "black"
              }}
              formatter={(value, name) => [
                `${Number(value).toFixed(2)} kWh`,
                name === 'actual_consumption' ? 'Actual' : name
              ]}
              labelFormatter={(label) => 
                timeframe === 'monthly' ? label : `Time: ${label}`
              }
            />
            <Legend />

            {/* Baseline line - show total baseline for the period */}
            <Line 
              type="linear" 
              dataKey={() => totalBaseline} 
              stroke="#60A5FA" 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={false} 
              legendType="line"
              name="Baseline" 
            />

            {/* Actual Consumption line */}
            <Line 
              type="monotone" 
              dataKey="actual_consumption" 
              stroke="#10B981" 
              strokeWidth={3} 
              dot={{ r: 3 }} 
              name="Actual Consumption" 
              legendType="line"
            />

            {/* Exceeded area */}
            {exceededBaseline && (
              <Area
                type="monotone"
                dataKey={(entry) => 
                  entry.actual_consumption > totalBaseline ? entry.actual_consumption : totalBaseline
                }
                baseLine={totalBaseline}
                fill="#EF4444"
                fillOpacity={0.4}
                stroke="none"
                legendType="none"
                name="Exceeded"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <SummaryCards
        consumption={`${totalActual.toFixed(2)} kWh`}
        baseline={`${totalBaseline.toFixed(2)} kWh`}
        saved={`${totalSaved.toFixed(2)} kWh`}
        active={`${activeHoursTotal.toFixed(2)} kWh`}
        inactive={`${inactiveHoursTotal.toFixed(2)} kWh`}
        unit="kWh"
        isDark={isDark}
      />
    </div>
  );
};

const CarbonFootprintChart = ({
  data = [],
  apiResponse = {},
  timeframe,
  selectedDate,
  loading,
  error,
  activeInactive = { active: '0.00', inactive: '0.00' },
  isDark = true,
}) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    console.log('CarbonFootprintChart - Raw data:', data);
    
    if (!data || data.length === 0) {
      console.log('CarbonFootprintChart - No data available');
      setChartData([]);
      return;
    }
    
    // Convert carbon data to chart format - CUMULATIVE values
    let cumulativeCarbon = 0;
    const processedData = data.map((item) => {
      // Use the actual carbon value and accumulate it
      const carbon = Number(item.actual || item.value || item.carbon_footprint_actual || 0);
      cumulativeCarbon += carbon;
      
      // Use the label or time from the item
      let label = item.label || item.time;
      if (!label && item.period) {
        switch (timeframe) {
          case "daily": label = moment(item.period).format("HH:mm"); break;
          case "monthly": label = moment(item.period).format("DD MMM"); break;
          case "yearly": label = moment(item.period).format("MMM"); break;
          default: label = item.period;
        }
      }
      
      return { 
        period: item.period || item.time, 
        label: label || 'N/A', 
        actual_carbon_kg: cumulativeCarbon
      };
    });
    
    console.log('CarbonFootprintChart - Processed data:', processedData);
    setChartData(processedData);
  }, [data, timeframe]);

  const totalBaseline = getBaselineValue(apiResponse, 'carbon', timeframe);
  const totalActual = getActualValue(apiResponse, 'carbon');
  const totalSaved = totalBaseline - totalActual; // Calculate directly: positive = saved, negative = exceeded

  const exceededBaseline = totalActual > totalBaseline;
  const carbonFactor = totalActual > 0 && (Number(activeInactive.active) + Number(activeInactive.inactive)) > 0 
    ? totalActual / (Number(activeInactive.active) + Number(activeInactive.inactive)) 
    : 0.82;
  const activeHoursTotal = Number(activeInactive.active) * carbonFactor;
  const inactiveHoursTotal = Number(activeInactive.inactive) * carbonFactor;

  if (loading) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        <div className={`h-[300px] flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Loading carbon footprint data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        <div className="h-48 flex items-center justify-center text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        <div className={`h-48 flex flex-col items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>No carbon footprint data available</p>
          <p className="text-xs mt-2">Debug: chartData length = {chartData?.length || 0}, data length = {data?.length || 0}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        {selectedDate && (
          <span className={`text-sm ml-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {timeframe === "daily" 
              ? moment(selectedDate).format("MMM DD, YYYY")
              : moment(selectedDate).format("MMMM YYYY")}
          </span>
        )}
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
            <XAxis 
              dataKey="label" 
              stroke={isDark ? "#9CA3AF" : "#6b7280"} 
              interval="preserveStartEnd" 
              tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6b7280" }} 
              angle={timeframe === "monthly" ? -45 : 0}
              textAnchor={timeframe === "monthly" ? "end" : "middle"}
              height={timeframe === "monthly" ? 60 : 30}
            />
            <YAxis
              stroke={isDark ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6b7280" }}
              label={{ 
                value: "kg CO₂", 
                angle: -90, 
                position: "insideLeft", 
                style: { fill: isDark ? "#9CA3AF" : "#6b7280", fontSize: 11 } 
              }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF", 
                border: `1px solid ${isDark ? "#475569" : "#e5e7eb"}`, 
                borderRadius: "8px", 
                padding: "8px 12px",
                color: isDark ? "white" : "black"
              }}
              formatter={(value, name) => [
                `${Number(value).toFixed(2)} kg CO₂`,
                name === 'actual_carbon_kg' ? 'Actual' : name
              ]}
              labelFormatter={(label) => 
                timeframe === 'monthly' ? label : `Time: ${label}`
              }
            />
            <Legend />

            {/* Baseline line - show total baseline for the period */}
            <Line
              type="linear"
              dataKey={() => totalBaseline}
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="5 5"
              legendType="line"
              dot={false}
              name="Baseline Carbon"
            />

            {/* Actual carbon line */}
            <Line
              type="monotone"
              dataKey="actual_carbon_kg"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 3 }}
              legendType="line"
              name="Actual Carbon"
            />

            {/* Exceeded area */}
            {exceededBaseline && (
              <Area
                type="monotone"
                dataKey={(entry) =>
                  entry.actual_carbon_kg > totalBaseline ? entry.actual_carbon_kg : totalBaseline
                }
                baseLine={totalBaseline}
                fill="#EF4444"
                fillOpacity={0.4}
                stroke="none"
                legendType="none"
                name="Exceeded"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <SummaryCards
        consumption={`${totalActual.toFixed(2)} kg`}
        baseline={`${totalBaseline.toFixed(2)} kg`}
        saved={`${totalSaved.toFixed(2)} kg`}
        active={`${activeHoursTotal.toFixed(2)} kg`}
        inactive={`${inactiveHoursTotal.toFixed(2)} kg`}
        unit="kg CO₂"
        isDark={isDark}
      />
    </div>
  );
};
const Neonir = () => {
  const { did } = useParams();
  const decodedDid = decodeURIComponent(did);
  const encodedDid = encodeURIComponent(decodedDid);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // --- STATES ---
  const [neonData, setNeonData] = useState(null);
  const [previousNeonData, setPreviousNeonData] = useState(null);
  const [setTemp, setSetTemp] = useState(24);
  const [topic, setTopic] = useState("");
  const [responseTopic, setResponseTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [irOn, setIrOn] = useState(false);
  const [powerData, setPowerData] = useState([]);
  const [powerLoading, setPowerLoading] = useState(true);
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

  // ── GLOBAL DATE / TIMEFRAME ───────────────────────────────────────
  const [timeframe, setTimeframe] = useState("daily");
  // Initialize with today's date for daily view
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD")
  );

  const [mode, setMode] = useState("auto");
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(moment().format("hh:mm A z"));

  // Baseline Modal
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [baselineInput, setBaselineInput] = useState("");
  const [baselineStatus, setBaselineStatus] = useState("idle");
  const [baseline, setBaseline] = useState(null);
  const [modalBaseline, setModalBaseline] = useState(null);

  // Carbon Footprint
  const [carbonTimeframe, setCarbonTimeframe] = useState("monthly");
  const [carbonData, setCarbonData] = useState([]);
  const [carbonLoading, setCarbonLoading] = useState(true);

  // Power Savings
  const [powerSavingData, setPowerSavingData] = useState([]);
  const [powerSavingLoading, setPowerSavingLoading] = useState(true);
  const [powerSavingTimeframe, setPowerSavingTimeframe] = useState("monthly");

  // Working Hours
  const [workingHoursData, setWorkingHoursData] = useState([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(true);
  const [workingHoursTimeframe, setWorkingHoursTimeframe] = useState("monthly");

  // Temperature Trend
  const [temperatureData, setTemperatureData] = useState([]);
  const [temperatureLoading, setTemperatureLoading] = useState(true);
  const [temperatureTimeframe, setTemperatureTimeframe] = useState('monthly');

  // Organization access control - hide graphs for org_id 149
  const [hideGraphs, setHideGraphs] = useState(false);

  // Full API responses for enhanced charts
  const [powerSavingResponse, setPowerSavingResponse] = useState({});
  const [carbonResponse, setCarbonResponse] = useState({});
  const [workingHoursResponse, setWorkingHoursResponse] = useState({});
  const [activeInactive, setActiveInactive] = useState({ active: '0.00', inactive: '0.00' });

  const authFetch = useAuthFetch();
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Mark component as mounted on first render
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
            console.log('🚫 Organization ID 149 detected - hiding all graphs (Neonir)');
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
          console.log('🚫 Organization ID 149 detected from API - hiding all graphs (Neonir)');
          setHideGraphs(true);
        }
      } catch (error) {
        console.error('Error checking org access:', error);
      }
    };
    
    checkOrgAccess();
  }, [authFetch]);

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

  // Helper: build a 24-entry hourly array (labels '00:00'..'23:00') using extractor(item) => object of values
  const buildHourlyBuckets = (raw, extractor, defaultObj = {}) => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      time: `${String(h).padStart(2, "0")}:00`,
      ...defaultObj,
    }));
    raw.forEach((item) => {
      const h = parseHourFromItem(item);
      if (h == null || isNaN(h) || h < 0 || h > 23) return;
      const vals = extractor(item);
      buckets[h] = { time: `${String(h).padStart(2, "0")}:00`, ...vals };
    });
    return buckets;
  };

  /* --------------------- FETCH FUNCTIONS --------------------- */
  const fetchData = async () => {
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiURL}/location/neon-data/${encodedDid}`,
        method: "GET",
      });
      const d = res.data;

      // Key fields to compare for detecting actual device state changes
      const currentStateKey = `${d.mantemp}-${d.ir}-${d.manir}-${d.AUTO_I}`;
      const previousStateKey = previousNeonData
        ? `${previousNeonData.mantemp}-${previousNeonData.ir}-${previousNeonData.manir}-${previousNeonData.AUTO_I}`
        : null;

      // Check if timestamp changed (new data received)
      const timestampChanged =
        !previousNeonData || d.created_at !== previousNeonData.created_at;

      const dataChanged = currentStateKey !== previousStateKey;

      // Debug logging
      if (pendingCommand) {
        console.log("Pending command detected:", {
          timestampChanged,
          dataChanged,
          currentTimestamp: d.created_at,
          previousTimestamp: previousNeonData?.created_at,
          currentState: currentStateKey,
          previousState: previousStateKey,
        });
      }

      // If there's a pending command and we got new data (timestamp changed), clear the timeout
      // DISABLED: Now using WebSocket for real-time command confirmation instead of API polling
      /*
      if (pendingCommand && commandTimeout && timestampChanged) {
        console.log("Command successful - clearing timeout");
        clearTimeout(commandTimeout);
        setCommandTimeout(null);
        setPendingCommand(null);
      }
      */

      if (dataChanged) {
        // Extract Schedule to top level
        const normalizedData = {
          ...d,
          Schedule: d.Schedule || d.json_data?.Schedule || []
        };
        setNeonData(normalizedData);
        setPreviousNeonData(normalizedData);
        setSetTemp(d.mantemp ?? d.MANTEMP ?? 24);
        setIrOn(Number(d.ir ?? d.IR ?? 0) === 1);
        setTopic(d.topic ?? d.Topic ?? "");
        
        // Extract response topic - only update if we have a valid macid
        const macid = d.MACID ?? d.macid ?? neonData?.macid;
        if (macid && !responseTopic) {
          const resTopicFromData = d.Response ?? d.response ?? `Response/${macid}`;
          setResponseTopic(resTopicFromData);
        }

        // --- FETCH BASELINE ---
        const bl = d.baseline_set ?? d.BASELINE ?? null;
        setBaseline(bl);
        setModalBaseline(bl);

        // Mode logic
        const autoOn = (d.auto_i ?? d.AUTO_I) === "ON";
        const manOn = (d.manir ?? d.MANIR) === "ON";
        if (autoOn) setMode("auto"); // AUTO takes priority
        else if (manOn) setMode("manual-on");
        else setMode("manual-off");
      } else {
        // Data hasn't changed, but update timestamp tracking
        if (timestampChanged) {
          setPreviousNeonData(d);
        }
        // Update neonData even if state unchanged (for other fields like current readings)
        // but only if there's no pending command
        if (!pendingCommand) {
          const normalizedData = {
            ...d,
            Schedule: d.Schedule || d.json_data?.Schedule || []
          };
          setNeonData(normalizedData);
        }
      }
    } catch (e) {
      console.error("fetchData error:", e);
    } finally {
      setLoading(false);
    }
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
        transformedData = Array.from({ length: 24 }, (_, hour) => {
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
            R: hourData?.R ?? hourData?.wh_r ?? 0,
            Y: hourData?.Y ?? hourData?.wh_y ?? 0,
            B: hourData?.B ?? hourData?.wh_b ?? 0,
          };
        });
      } else if (tf === "monthly") {
        // For monthly data, we expect multiple daily data points
        transformedData = raw.map((item, index) => {
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
            label = `Unknown ${index + 1}`;
            timeValue = `Unknown ${index + 1}`;
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
        transformedData = raw.map((item, index) => {
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
            label = item.time || `Unknown ${index + 1}`;
            timeValue = item.time || `Unknown ${index + 1}`;
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
            if (!item || (!item.hour && !item.period)) return false;

            try {
              const timestamp = item.hour || item.period;
              const hourMatch = timestamp.match(/T?(\d{2}):/);
              if (hourMatch) {
                const itemHour = parseInt(hourMatch[1]);
                return itemHour === hour;
              }
              return false;
            } catch (e) {
              console.error("Error parsing hour:", item.hour || item.period);
              return false;
            }
          });

          const used = hourData ? parseFloat(hourData.actual_consumption_kwh ?? hourData.total_consumption_kwh ?? 0) : null;
          const saved = hourData ? parseFloat(hourData.power_saved_kwh ?? 0) : null;

          return {
            time: timeString,
            label: timeString,
            period: hourData?.period || timeString,
            saved: saved != null ? parseFloat(saved.toFixed(3)) : null,
            used: used != null ? parseFloat(used.toFixed(3)) : null,
            actual_consumption_kwh: used,
            total:
              used != null && saved != null
                ? parseFloat((used + saved).toFixed(3))
                : null,
          };
        });
      } else if (tf === "monthly") {
        // For monthly data, show daily breakdown
        transformed = raw.map((item, index) => {
          const used = parseFloat(item.total_consumption_kwh ?? 0);
          const saved = parseFloat(item.power_saved_kwh ?? 0);

          let label;
          if (item.day) {
            const date = new Date(item.day);
            label = moment(date).format("DD MMM"); // Show day and month
          } else {
            label = `Unknown ${index + 1}`;
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
        transformed = raw.map((item, index) => {
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
            label = `Unknown ${index + 1}`;
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
      setPowerSavingResponse(res?.data || {});
      
    } catch (error) {
      console.error("Error fetching power saving:", error);
      setPowerSavingData([]);
      setPowerSavingResponse({});
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
            if (!item || (!item.hour && !item.period)) return false;

            try {
              const timestamp = item.hour || item.period;
              const hourMatch = timestamp.match(/T?(\d{2}):/);
              if (hourMatch) {
                const itemHour = parseInt(hourMatch[1]);
                return itemHour === hour;
              }
              return false;
            } catch (e) {
              console.error("Error parsing hour:", item.hour || item.period);
              return false;
            }
          });

          const carbonActual = hourData ? parseFloat(hourData.carbon_footprint_actual ?? hourData.actual_carbon_kg ?? 0) : null;

          return {
            time: timeString,
            label: timeString,
            period: hourData?.period || timeString,
            actual: carbonActual,
            saved: hourData ? parseFloat(hourData.carbon_saved ?? 0) : null,
            value: carbonActual,
            carbon_footprint_actual: carbonActual,
          };
        });
      } else if (tf === "monthly") {
        // For monthly data, show daily breakdown
        transformed = raw.map((item, index) => {
          const kwh = item.total_consumption_kwh ?? 0;
          const carbonActual = item.carbon_footprint_actual ?? 0;
          const carbonSaved = item.carbon_saved ?? 0;

          let label;
          if (item.day) {
            const date = new Date(item.day);
            label = moment(date).format("DD MMM"); // Show day and month
          } else {
            label = `Unknown ${index + 1}`;
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
        transformed = raw.map((item, index) => {
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
            label = `Unknown ${index + 1}`;
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
      setCarbonResponse(res?.data || {});
    } catch (err) {
      console.error("Carbon fetch error:", err);
      setCarbonData([]);
      setCarbonResponse({});
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

          // Data is already in kWh, use directly
          const kwh = hourData ? hourData.total_consumption_wh ?? null : null;

          return {
            time: timeString,
            label: timeString,
            consumption: kwh != null ? parseFloat(kwh.toFixed(3)) : null,
            hours: kwh != null ? parseFloat((kwh / 0.25).toFixed(1)) : null, // Assuming 250W device
            hasData: !!hourData,
            originalTime: hourData
              ? new Date(hourData.period).toISOString()
              : null,
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
              consumption: item.total_consumption_wh, // Already in kWh
            };
          }),
        });
      } else if (tf === "monthly") {
        // For monthly data, show daily kWh consumption
        transformed = raw.map((item, index) => {
          // Data is already in kWh, use directly
          const kwh = item.total_consumption_wh ?? 0;

          let label;
          if (item.period) {
            const date = new Date(item.period);
            label = moment(date).format("DD MMM"); // Show day and month
          } else {
            label = `Unknown ${index + 1}`;
          }

          return {
            label: label,
            time: label,
            consumption: parseFloat(kwh.toFixed(3)),
            hours: parseFloat((kwh / 0.25).toFixed(1)), // Assuming 250W device
          };
        });

        // If we only have one data point for monthly, it's likely the monthly total
        if (transformed.length === 1) {
          const monthlyData = transformed[0];
          const daysInMonth = moment().daysInMonth();
          const avgDailyKwh = monthlyData.consumption / daysInMonth;

          transformed = [
            {
              label: moment().format("MMM YYYY"), // Show "Nov 2025"
              time: moment().format("MMM YYYY"),
              consumption: parseFloat(avgDailyKwh.toFixed(3)),
              hours: parseFloat((avgDailyKwh / 0.25).toFixed(1)),
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
        transformed = raw.map((item, index) => {
          // Data is already in kWh, use directly
          const kwh = item.total_consumption_wh ?? 0;

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
            label = `Unknown ${index + 1}`;
          }

          return {
            label: label,
            time: label,
            consumption: parseFloat(kwh.toFixed(3)),
            hours: parseFloat((kwh / 0.25).toFixed(1)),
          };
        });
      }

      console.log("Working hours transformed data:", transformed);
      setWorkingHoursData(transformed);
      setWorkingHoursResponse(res?.data || {});
      
      // Calculate active/inactive totals from working hours data
      let activeTotal = 0;
      let inactiveTotal = 0;
      
      if (tf === 'daily' && raw && raw.length > 0) {
        // For daily: calculate based on business hours (8 AM to 8 PM)
        raw.forEach(item => {
          const consumption = parseFloat(item.total_consumption_wh || 0);
          if (item.period) {
            const hourMatch = item.period.match(/T?(\d{2}):/);
            if (hourMatch) {
              const hour = parseInt(hourMatch[1]);
              if (hour >= 8 && hour < 20) {
                inactiveTotal += consumption;  // Swapped
              } else {
                activeTotal += consumption;  // Swapped
              }
            }
          }
        });
      } else if (raw && raw.length > 0) {
        // For non-daily: use 73% active assumption
        const total = raw.reduce((sum, item) => sum + parseFloat(item.total_consumption_wh || 0), 0);
        activeTotal = total * 0.27;  // Swapped
        inactiveTotal = total * 0.73;  // Swapped
      }
      
      setActiveInactive({
        active: activeTotal.toFixed(2),
        inactive: inactiveTotal.toFixed(2)
      });
      
    } catch (err) {
      console.error("Working hours fetch error:", err?.message);
      setWorkingHoursData([]);
      setWorkingHoursResponse({});
      setActiveInactive({ active: '0.00', inactive: '0.00' });
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

  const openBaselineModal = async () => {
    setShowBaselineModal(true);
    setBaselineStatus("idle");

    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiURL}/location/neon-data/${encodedDid}`,
        method: "GET",
      });

      const bl = res.data.baseline_set ?? res.data.BASELINE ?? null;
      setModalBaseline(bl);
      setBaseline(bl);

      // Set baseline input to current value or empty string if null
      setBaselineInput(bl !== null ? String(bl) : "");
    } catch (e) {
      console.error("Failed to load current baseline", e);
      setBaselineInput("");
    }
  };

  // Open settings: fetch latest data once, then show modal. While settings open, polling will be paused.
  const openSettings = async () => {
    try {
      await fetchData();
    } catch (e) {
      console.warn("Failed to refresh before opening settings", e);
    }
    setShowSettings(true);
  };

  // ── RE-FETCH WHEN ANY FILTER CHANGES ───────────────────────────────
  const fetchAll = useCallback(() => {
    const tf = timeframe;
    const dateParam = tf === 'daily' ? selectedDate : undefined;

    fetchPowerData(tf, dateParam);
    fetchCarbonFootprint(carbonTimeframe, dateParam);
    fetchPowerSavingData(powerSavingTimeframe, dateParam);
    fetchWorkingHours(workingHoursTimeframe, dateParam);
    fetchTemperatureTrend(temperatureTimeframe, dateParam);
  }, [
    timeframe,
    selectedDate,
    carbonTimeframe,
    powerSavingTimeframe,
    workingHoursTimeframe,
    temperatureTimeframe,
  ]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Automatically switch to today when Daily timeframe is selected
  useEffect(() => {
    if (timeframe === "daily") {
      const today = moment().format("YYYY-MM-DD");
      setSelectedDate(today);
    }
  }, [timeframe]);

  // Keep other chart timeframes in sync with the main Power Consumption timeframe
  useEffect(() => {
    setCarbonTimeframe(timeframe);
    setPowerSavingTimeframe(timeframe);
    setWorkingHoursTimeframe(timeframe);
    setTemperatureTimeframe(timeframe);
  }, [timeframe]);

  /* --------------------- USE EFFECT HOOKS --------------------- */

  // Data fetching - whenever dependencies change
  useEffect(() => {
    if (!decodedDid) return;
    
    fetchData();
    fetchAll();
  }, [
    decodedDid,
    timeframe,
    selectedDate,
    carbonTimeframe,
    powerSavingTimeframe,
    workingHoursTimeframe,
    temperatureTimeframe,
  ]);

  // Time update interval
  useEffect(() => {
    const timeInterval = setInterval(
      () => setCurrentTime(moment().format("hh:mm A z")),
      1000
    );

    return () => clearInterval(timeInterval);
  }, []);
  useEffect(() => {
    // Only perform initial data fetch - no polling intervals for real-time data
    fetchData();
    fetchAll();

    // Keep only timeout cleanup - no polling intervals
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
    carbonTimeframe,
    powerSavingTimeframe,
    workingHoursTimeframe,
    temperatureTimeframe,
    showSettings,
    pendingCommand,
  ]);

  // Data fetching - whenever dependencies change
  useEffect(() => {
    if (!decodedDid) return;
    
    fetchData();
    fetchAll();
  }, [
    decodedDid,
    timeframe,
    selectedDate,
    carbonTimeframe,
    powerSavingTimeframe,
    workingHoursTimeframe,
    temperatureTimeframe,
  ]);

  // Time update interval
  useEffect(() => {
    const timeInterval = setInterval(
      () => setCurrentTime(moment().format("hh:mm A z")),
      1000
    );

    return () => clearInterval(timeInterval);
  }, []);

  // Periodic GMRMAIN data request every 10 seconds
  useEffect(() => {
    if (!decodedDid || !topic || !responseTopic) return;

    console.log('🔄 Starting initial GMRMAIN request for IR device:', decodedDid);

    const apiURL = import.meta.env.VITE_API_BASE_URL;
    let retryTimeout = null; // Track retry timeout for cleanup
    let gmrAllInterval = null; // Track interval for cleanup
    
    // Start periodic calls function
    const startPeriodicCalls = () => {
      if (!isMountedRef.current) {
        console.log('⏹️ Component unmounted, not starting periodic calls');
        return;
      }
      
      // Periodic updates every 10 seconds
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
          console.log('📡 Sending periodic GMRMAIN request (10s interval) for IR device:', decodedDid);
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
                r.DID || r.IR !== undefined || r.MANIR !== undefined || r.AUTO_I !== undefined
              );
            } else if (response.data.DID || response.data.IR !== undefined) {
              deviceData = response.data;
            }
            
            if (deviceData) {
              // Update IR status
              if (deviceData.IR !== undefined) {
                setIrOn(deviceData.IR === 1);
                console.log('🔌 Periodic: IR status updated:', deviceData.IR === 1);
              }
              
              // Update mode
              const autoOn = deviceData.AUTO_I === "ON";
              const manOn = deviceData.MANIR === "ON";
              
              let newMode;
              if (autoOn) newMode = "auto"; // AUTO takes priority
              else if (manOn) newMode = "manual-on";
              else newMode = "manual-off";
              
              setMode(newMode);
              
              // Update temperature if MANTEMP changed
              if (deviceData.MANTEMP !== undefined) {
                setSetTemp(Number(deviceData.MANTEMP));
              }
              
              // Ensure Schedule is at top level
              const normalizedData = {
                ...deviceData,
                Schedule: deviceData.Schedule || []
              };
              
              setNeonData(prev => ({ ...prev, ...normalizedData }));
              console.log('🔄 Periodic update completed - IR section visibility unchanged');
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
        console.log('📡 Making initial GMRMAIN request for IR device:', decodedDid);
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
          console.log('📥 Full GMRMAIN response for device:', decodedDid, response.data);
          
          let deviceData = null;
          
          // Handle different response structures
          if (response.data.responses && Array.isArray(response.data.responses)) {
            deviceData = response.data.responses.find(r => 
              r.DID || r.IR !== undefined || r.MANIR !== undefined || r.AUTO_I !== undefined
            );
          } else if (response.data.DID || response.data.IR !== undefined) {
            deviceData = response.data;
          }
          
          if (deviceData && deviceData.DID) {
            console.log('📥 Initial GMRMAIN response received, updating IR state for device:', decodedDid);
            
            // Update IR status based on IR field (actual AC status)
            if (deviceData.IR !== undefined) {
              setIrOn(deviceData.IR === 1);
              console.log('🔌 IR status updated:', deviceData.IR === 1);
            }
            
            // Update mode based on AUTO_I and MANIR
            const autoOn = deviceData.AUTO_I === "ON";
            const manOn = deviceData.MANIR === "ON";
            
            let newMode;
            if (autoOn) newMode = "auto"; // AUTO takes priority
            else if (manOn) newMode = "manual-on";
            else newMode = "manual-off";
            
            setMode(newMode);
            
            // Update temperature if MANTEMP is present
            if (deviceData.MANTEMP !== undefined) {
              setSetTemp(Number(deviceData.MANTEMP));
            }
            
            console.log('📅 Schedule data in initial response:', deviceData.Schedule);
            
            // Ensure Schedule is at top level
            const normalizedData = {
              ...deviceData,
              Schedule: deviceData.Schedule || []
            };
            
            setNeonData(prev => ({ ...prev, ...normalizedData }));
            setLoading(false);
            console.log('✅ Valid device data received, IR section will be shown');
            
            // Start periodic calls after successful initial call
            startPeriodicCalls();
          } else {
            console.log('❌ No valid device data found in GMRMAIN response');
            if (isMountedRef.current) {
              retryTimeout = setTimeout(makeInitialCall, 15000);
            }
          }
        } else {
          console.log('❌ No data in GMRMAIN response - retrying');
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
      isMountedRef.current = false; // Mark as unmounted
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

  /* --------------------- COMMANDS --------------------- */
  const sendControlCommandSafe = async (payload) => {
    if (!topic) {
      setTimeout(() => sendControlCommandSafe(payload), 500);
      return;
    }
    payload.topic = topic;
    payload.response = responseTopic;

    const currentState = {
      ir: neonData?.IR ?? neonData?.ir ?? (irOn ? 1 : 0),
      MANIR: neonData?.MANIR ?? (mode === "manual-on" ? "ON" : "OFF"),
      AUTO_I: neonData?.AUTO_I ?? (mode === "auto" ? "ON" : "OFF"),
      uiSetTemp: setTemp,
      uiIrOn: irOn,
      uiMode: mode,
    };

    console.log('🚀 Sending IR control command:', payload.message);
    console.log('📊 Current state saved for timeout handling:', currentState);

    setPendingCommand(currentState);

    const timeout = setTimeout(() => {
      console.log('⏰ Device command timeout after 30 seconds, reverting changes');
      console.warn("Device command timeout - reverting changes");
      
      if (pendingCommandRef.current && pendingCommandRef.current === currentState) {
        console.log('⏰ Reverting to previous state');
        showStatusMessage("Device not reachable. Reverting changes...", "error");
        setSetTemp(currentState.uiSetTemp);
        setIrOn(currentState.uiIrOn);
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
                r.DID || r.IR !== undefined || r.MANIR !== undefined || r.AUTO_I !== undefined
              );
            } else if (gmrallResponse.data.DID || gmrallResponse.data.IR !== undefined) {
              deviceData = gmrallResponse.data;
            }
            
            if (deviceData) {
              console.log('🔄 Updating device state with fresh data:', {
                IR: deviceData.IR,
                AUTO_I: deviceData.AUTO_I,
                MANIR: deviceData.MANIR,
                TempIP: deviceData.TempIP || deviceData.TEMPIP,
                Motion: deviceData.Motion,
                MANTEMP: deviceData.MANTEMP,
              });
              
              // Update IR status
              if (deviceData.IR !== undefined) {
                const newIrState = deviceData.IR === 1;
                setIrOn(newIrState);
                console.log('🔌 Post-command: IR status updated:', newIrState);
              }
              
              // Update mode based on AUTO_I and MANIR
              const autoOn = deviceData.AUTO_I === "ON";
              const manOn = deviceData.MANIR === "ON";
              
              let newMode;
              if (autoOn && !manOn) newMode = "auto";
              else if (!autoOn && manOn) newMode = "manual-on";
              else if (!autoOn && !manOn) newMode = "manual-off";
              else newMode = manOn ? "manual-on" : "auto";
              
              console.log('🎛️ Mode updated:', { autoOn, manOn, newMode });
              setMode(newMode);
              
              // Update temperature if MANTEMP changed
              if (deviceData.MANTEMP !== undefined) {
                setSetTemp(Number(deviceData.MANTEMP));
              }
              
              // Normalize field names
              const normalizedData = {
                ...deviceData,
                IR: deviceData.IR ?? deviceData.ir,
                TempIP: deviceData.TempIP ?? deviceData.TEMPIP ?? deviceData.tempip,
                Motion: deviceData.Motion ?? deviceData.motion,
                TEMPIP: deviceData.TempIP ?? deviceData.TEMPIP ?? deviceData.tempip,
                // Ensure Schedule is at top level
                Schedule: deviceData.Schedule || deviceData.json_data?.Schedule || []
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
      setSetTemp(currentState.uiSetTemp);
      setIrOn(currentState.uiIrOn);
      setMode(currentState.uiMode);
      setPendingCommand(null);
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        setCommandTimeout(null);
      }
    }
  };

  const increaseTemp = () => {
    setSetTemp((p) => {
      const n = Math.min(30, p + 1);
      sendControlCommandSafe({ message: { MANTEMP: n } });
      return n;
    });
  };

  const decreaseTemp = () => {
    setSetTemp((p) => {
      const n = Math.max(16, p - 1);
      sendControlCommandSafe({ message: { MANTEMP: n } });
      return n;
    });
  };

  const cycleMode = () => {
    let payload = {};
    if (mode === "auto") {
      payload = { MANIR: "ON", AUTO_I: "OFF" };
      setMode("manual-on");
    } else if (mode === "manual-on") {
      payload = { MANIR: "OFF", AUTO_I: "OFF" };
      setMode("manual-off");
    } else if (mode === "manual-off") {
      payload = { MANIR: "ON", AUTO_I: "OFF" };
      setMode("manual-on");
    }
    sendControlCommandSafe({ message: payload });
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

  /* --------------------- UI CALCS --------------------- */
  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!neonData)
    return <div className="p-6 text-red-400">Device not found</div>;

  const RADIUS = 45;
  const CIRC = 2 * Math.PI * RADIUS;
  const prog = Math.min(Math.max((0.5 + setTemp - 16) / (37 - 16), 0), 1);
  const tipX = 50 + RADIUS * Math.cos(prog * 2 * Math.PI);
  const tipY = 50 + RADIUS * Math.sin(prog * 2 * Math.PI);
  const curTemp = Number(neonData.TEMPIP ?? neonData.tempip ?? 0);
  const motion = Number(neonData.motion ?? neonData.raceman ?? 0);

  // TEMP RANGE
  const mxt = Number(neonData.MXT ?? neonData.mxt ?? 30);
  const mnt = Number(neonData.MNT ?? neonData.mnt ?? 16);

  const isCooling = irOn && curTemp > setTemp;
  const motionActive = motion === 1;

  // Extract humidity from BiBug[0]
  const humidity = Number(neonData?.json_data?.BiBug?.[0]?.Hum ?? null);

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

  let isOnline = false;
  if (neonData?.created_at) {
    const lastIST = moment.tz(neonData.created_at, "UTC").tz("Asia/Kolkata");
    const nowIST = moment.tz("Asia/Kolkata");
    isOnline = nowIST.diff(lastIST, "minutes") <= 2;
  }

  const powerChartData = powerData.map((item) => ({
    time: item.time,
    R: item.R ?? null,
    Y: item.Y ?? null,
    B: item.B ?? null,
    total: (Number(item.R || 0) + Number(item.Y || 0) + Number(item.B || 0)).toFixed(3),
  }));

  const totalPower = powerChartData
    .reduce((sum, d) => sum + (d.R || 0) + (d.Y || 0) + (d.B || 0), 0)
    .toFixed(2);
  const peakUsage =
    powerChartData.length > 0
      ? powerChartData.reduce(
          (max, current) => {
            const currentTotal = (current.R || 0) + (current.Y || 0) + (current.B || 0);
            const maxTotal = (max.R || 0) + (max.Y || 0) + (max.B || 0);
            return currentTotal > maxTotal ? current : max;
          },
          { time: "", R: 0, Y: 0, B: 0 }
        )
      : { time: "", R: 0, Y: 0, B: 0 };

  const phaseTotals = {
    R: powerChartData.reduce((sum, d) => sum + (d.R || 0), 0).toFixed(2),
    Y: powerChartData.reduce((sum, d) => sum + (d.Y || 0), 0).toFixed(2),
    B: powerChartData.reduce((sum, d) => sum + (d.B || 0), 0).toFixed(2),
  };

  // Temperature stats (ignore nulls)
  const tempValues = temperatureData.map((d) => d.temperature).filter((v) => v != null);
  const tempAvg = tempValues.length ? tempValues.reduce((s, v) => s + v, 0) / tempValues.length : 0;
  const tempMin = tempValues.length ? Math.min(...tempValues) : 0;
  const tempMax = tempValues.length ? Math.max(...tempValues) : 0;

  /* --------------------- RENDER --------------------- */
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
              <p className="text-lg font-semibold text-white">
                Sending command to device...
              </p>
              <p className="text-sm text-gray-400 mt-1">Please wait</p>
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

      {/* HEADER */}
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
                  className="flex items-center px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded gap-1 transition shadow-sm"
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

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* AC WIDGET */}
        <div className={`lg:col-span-2 p-6 rounded-xl flex flex-col items-center relative ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
          <div className={`absolute top-4 left-4 font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            {neonData.Remote_Make ?? neonData.remote_make ?? "-"}
          </div>
          <div className="absolute top-4 right-4 flex gap-6">
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className={`flex flex-col items-center gap-1 hover:opacity-90 transition ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              <div className={`px-3 py-2 rounded-lg ${isDark ? 'bg-[#1F3C48]' : 'bg-gray-200'}`}>
                <FontAwesomeIcon icon={faSlidersH} size="lg" />
              </div>
              <span className="text-xs mt-1">Settings</span>
            </button>

            {/* Schedule Button */}
            <button
              onClick={() => {
                console.log('📅 Opening schedule manager - neonData:', neonData);
                console.log('📅 Schedule array:', neonData?.Schedule);
                const topic = neonData?.topic || "topic";
                const response = neonData?.response || "response";
                const schedules = neonData?.Schedule || [];
                console.log('📅 Passing schedules to manager:', schedules);
                navigate(`/device/schedule`, {
                  state: { deviceType: "IR", topic, response, scheduleData: schedules },
                });
              }}
              className={`flex flex-col items-center gap-1 hover:opacity-90 transition ${isDark ? 'text-white' : 'text-white'}`}
            >
              <div className={`px-3 py-2 rounded-lg ${isDark ? 'bg-blue-600' : 'bg-blue-500'}`}>
                <FontAwesomeIcon icon={faCalendarAlt} size="lg" />
              </div>
              <span className="text-xs mt-1">Schedule</span>
            </button>
          </div>

          <div className="relative w-[290px] h-[90px] mx-auto mt-6">
            <img
              src="../src/assets/img/AC.png"
              alt="AC"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-1 flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  irOn
                    ? "bg-green-500 animate-pulse shadow-green-500/50"
                    : "bg-red-500"
                }`}
              />
              <span
                className={`mt-0.5 text-[7px] font-medium transition-colors duration-300 ${
                  irOn ? "text-green-400" : "text-red-400"
                } ${isDark ? 'bg-black/70' : 'bg-white/70 text-gray-800'} px-1 py-0.5 rounded`}
              >
                {irOn ? "ON" : "OFF"}
              </span>
            </div>
            <div className="absolute bottom-4 right-1 flex flex-col items-center">
              {/* Mode Label - Identical to original */}
              <span
                className={`mt-0.5 text-[7px] font-medium tracking-wider transition-colors duration-300
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

              {/* AUTO → Show "M" button | MANUAL → Show original toggle */}
              {mode === "auto" ? (
                // Tiny "M" to enter Manual mode
                <button
                  onClick={() => {
                    sendControlCommandSafe({
                      message: { MANIR: "ON", AUTO_I: "OFF" },
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
                // Your ORIGINAL toggle - 100% unchanged look & behavior
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

          <div className="flex items-center gap-6 mt-12">
            <span className="text-[20px] text-white/50 font-semibold">
              16°C
            </span>
            <button
              onClick={decreaseTemp}
              className={`w-[70px] h-[50px] flex items-center justify-center rounded-full transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}
            >
              <Minus className="w-6 h-6" />
            </button>
            <div
              className={`relative flex items-center justify-center w-40 h-40 rounded-full ${isDark ? 'bg-[#1F3C48]' : 'bg-gray-100'}`}
            >
              <svg
                className="absolute w-full h-full rotate-[145deg]"
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="g" x1="0%" y1="0%" x2="70%" y2="70%">
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
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  stroke="url(#g)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - prog)}
                  className="transition-all duration-500"
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
                    "linear-gradient(180deg, #418EF2 0%, #75d8ffff 100%)",
                }}
              >
                <p className={`text-[16px] font-medium ${isDark ? 'text-white/60' : 'text-white/70'}`}>Cooling</p>
                <p className="text-[24px] text-white font-bold">{setTemp}°C</p>
              </div>
            </div>
            <button
              onClick={increaseTemp}
              className={`w-[70px] h-[50px] flex items-center justify-center rounded-full transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}
            >
              <Plus className="w-6 h-6" />
            </button>
            <span className={`text-[20px] font-semibold ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
              30°C
            </span>
          </div>

          <div className="flex justify-between items-center mt-32 px-6 w-full">
            <div className="flex gap-4">
              <button
                className={`flex flex-col items-center justify-center w-20 h-16 p-2 rounded-lg transition ${
                  isCooling
                    ? isDark ? "bg-[#464F62] text-blue-400 border border-blue-500" : "bg-blue-50 text-blue-600 border border-blue-300"
                    : isDark ? "bg-[#464F62] hover:bg-gray-500 text-gray-400" : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                }`}
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
                <div className={`flex items-center justify-center w-20 h-16 p-2 rounded-lg transition ${
                  isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}>
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
                className={`flex items-center justify-center w-20 h-16 p-2 rounded-lg transition ${
                  isDark ? 'bg-[#464F62] hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                style={{ color: motionActive ? "#22C55E" : "#9CA3AF" }}
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
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
                      <XAxis dataKey="time" stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kWh`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6", border: "none", borderRadius: "6px", color: isDark ? "#fff" : "#111827", fontSize: "12px" }}
                        formatter={(value, name) => [`${value} kWh`, name === "R" ? "Red" : name === "Y" ? "Yellow" : "Blue"]}
                        labelStyle={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: "11px" }}
                      />
                      <Area type="monotone" dataKey="R" stackId="1" stroke="#EF4444" fill="url(#colorRed)" name="R" />
                      <Area type="monotone" dataKey="Y" stackId="1" stroke="#F59E0B" fill="url(#colorYellow)" name="Y" />
                      <Area type="monotone" dataKey="B" stackId="1" stroke="#3B82F6" fill="url(#colorBlue)" name="B" />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
              
              <SummaryCards
                consumption={`${totalPower} kWh`}
                baseline={`${getBaselineValue(powerSavingResponse, 'power', timeframe).toFixed(2)} kWh`}
                saved={`${(getBaselineValue(powerSavingResponse, 'power', timeframe) - Number(totalPower)).toFixed(2)} kWh`}
                active={`${activeInactive.active} kWh`}
                inactive={`${activeInactive.inactive} kWh`}
                unit="kWh"
                isDark={isDark}
              />
            </div>
          )}
        </div>
  
{/* Energy Saved Chart */}
<div className="lg:col-span-2">



  {hideGraphs ? (
    <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg flex items-center justify-center h-64">
      <div className="text-gray-400 text-center">
        <p className="text-lg">📊 Graph Access Restricted</p>
        <p className="text-sm mt-2">Your organization does not have access to view graph data</p>
      </div>
    </div>
  ) : (
    <EnergySavedChart
      data={powerSavingData}
      apiResponse={powerSavingResponse}
      timeframe={timeframe}
      selectedDate={selectedDate}
      activeInactive={activeInactive}
      isDark={isDark}
    />
  )}
</div>

{/* Carbon Footprint Chart */}
<div className="lg:col-span-2">
  {hideGraphs ? (
    <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg flex items-center justify-center h-64">
      <div className="text-gray-400 text-center">
        <p className="text-lg">📊 Graph Access Restricted</p>
        <p className="text-sm mt-2">Your organization does not have access to view graph data</p>
      </div>
    </div>
  ) : (
    <CarbonFootprintChart
      data={carbonData}
      apiResponse={carbonResponse}
      timeframe={timeframe}
      selectedDate={selectedDate}
      activeInactive={activeInactive}
      isDark={isDark}
    />
  )}
</div>

{/* Working Hours Enhanced Chart */}
<div className="lg:col-span-2">
  {hideGraphs ? (
    <div className={`rounded-xl p-6 shadow-lg flex items-center justify-center h-64 ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <p className="text-lg">📊 Graph Access Restricted</p>
        <p className="text-sm mt-2">Your organization does not have access to view graph data</p>
      </div>
    </div>
  ) : (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
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
      ) : !workingHoursResponse?.data || workingHoursResponse.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className={`text-lg mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No working hours data</div>
          <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Working hours appear when the device is active</div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workingHoursResponse.data.map(item => {
              const consumption = item.total_consumption_wh || 0;
              return {
                time: moment(item.period).format(timeframe === "daily" ? "HH:mm" : "DD MMM"),
                hours: consumption,
                active: item.is_working ? consumption : 0,
                inactive: !item.is_working ? consumption : 0,
              };
            })} margin={{ top: 18, right: 10, left: 0, bottom:2 }}>
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
                { label: 'Total Consumption', value: `${((workingHoursResponse.data || []).reduce((sum, item) => sum + (item.total_consumption_wh || 0), 0)).toFixed(2)} Wh`, color: '#10B981' },
                { label: 'Periods', value: `${workingHoursResponse.total_periods || 0}`, color: '#60A5FA' },
                { label: 'Status', value: workingHoursResponse.data?.some(item => item.is_working) ? 'Active' : 'Inactive', color: workingHoursResponse.data?.some(item => item.is_working) ? '#34D399' : '#EF4444' },
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
                      color: item.label === 'Status' ? (workingHoursResponse.total_working_hours > 0 ? '#34D399' : '#EF4444') : (isDark ? '#ffffff' : '#111827')
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

{/* Temperature Trend */}
<div className={`lg:col-span-2 rounded-xl p-6 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>

  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center gap-2">
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Temperature Trend</h3>
      <button
        aria-label="Show relay ON/OFF info"
        className="ml-2 p-1 rounded-full border border-transparent hover:border-red-400 bg-transparent text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
        onClick={() => setShowRelayInfo(true)}
        style={{ fontSize: 20, marginLeft: 8 }}
        title="Show AC ON/OFF intervals"
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
        {/* Prominent ON/OFF counts */}
        <div className="mb-4 flex gap-6 justify-center text-base font-semibold">
          <span className="text-green-500">ON count: {getRelayIntervals(relayDailyData).onCount}</span>
          <span className="text-red-500">OFF count: {getRelayIntervals(relayDailyData).offCount}</span>
        </div>
        <RelayIntervalsList dailyData={relayDailyData} />
      </div>
    </div>
  )}

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
            { label: 'Average', value: `${tempAvg.toFixed(1)}°C`, color: '#FB923C' },
            { label: 'Minimum', value: `${tempMin.toFixed(1)}°C`, color: '#60A5FA' },
            { label: 'Maximum', value: `${tempMax.toFixed(1)}°C`, color: '#F97316' },
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

      </div> {/* Close main grid */}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-6">
          <div className={`rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 ${isDark ? 'bg-[#0F1729]' : 'bg-white'}`}>
            <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>IR Settings</h3>
            <div className="space-y-4">
              {/* IR Temperature */}
              <div>
                <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>IR Temperature</label>
                <input
                  type="number"
                  step="0.5"
                  value={neonData.IRTEMP ?? neonData.irtemp ?? ""}
                  onChange={(e) =>
                    setNeonData((prev) => ({ ...prev, IRTEMP: e.target.value }))
                  }
                  className={`w-full p-2 mt-1 rounded border ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                />
              </div>

              {/* IR Temperature Offset */}
              <div>
                <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  IR Temperature Offset
                </label>
                <input
                  type="number"
                  value={neonData.IRTEMPOFFSET ?? neonData.irtempoffset ?? ""}
                  onChange={(e) =>
                    setNeonData((prev) => ({
                      ...prev,
                      IRTEMPOFFSET: e.target.value,
                    }))
                  }
                  className={`w-full p-2 mt-1 rounded border ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                />
              </div>

              {/* Operation Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Operation Mode (Recovery of Auto Mode)
                  </label>
                </div>
                <button
                  onClick={() =>
                    setNeonData((prev) => ({
                      ...prev,
                      rman_i: prev.rman_i === "ON" ? "OFF" : "ON",
                    }))
                  }
                  className={`relative w-20 h-9 rounded-full border flex items-center transition-all duration-300 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
                >
                  <span
                    className={`absolute w-full text-xs font-medium ${
                      neonData.rman_i === "ON"
                        ? `text-left pl-2 ${isDark ? 'text-white' : 'text-white'}`
                        : `text-right pr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`
                    }`}
                  >
                    {neonData.rman_i === "ON" ? "" : ""}
                  </span>
                  <div
                    className="absolute w-7 h-7 rounded-full shadow-md transition-all duration-300"
                    style={{
                      backgroundColor:
                        neonData.rman_i === "ON" ? "#22C55E" : isDark ? "#9EA3AB" : "#D1D5DB",
                      transform:
                        neonData.rman_i === "ON"
                          ? "translateX(44px)"
                          : "translateX(4px)",
                      left: "2px",
                      top: "2px",
                    }}
                  />
                </button>
              </div>

              {/* Auto Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auto Mode
                  </label>
                </div>
                <button
                  onClick={() =>
                    setNeonData((prev) => ({
                      ...prev,
                      AUTO_I: prev.AUTO_I === "ON" ? "OFF" : "ON",
                    }))
                  }
                  className={`relative w-20 h-9 rounded-full border flex items-center transition-all duration-300 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
                >
                  <span
                    className={`absolute w-full text-xs font-medium ${
                      neonData.AUTO_I === "ON"
                        ? `text-left pl-2 ${isDark ? 'text-white' : 'text-white'}`
                        : `text-right pr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`
                    }`}
                  >
                    {neonData.AUTO_I === "ON" ? "" : ""}
                  </span>
                  <div
                    className="absolute w-7 h-7 rounded-full shadow-md transition-all duration-300"
                    style={{
                      backgroundColor:
                        neonData.AUTO_I === "ON" ? "#22C55E" : isDark ? "#9EA3AB" : "#D1D5DB",
                      transform:
                        neonData.AUTO_I === "ON"
                          ? "translateX(44px)"
                          : "translateX(4px)",
                      left: "2px",
                      top: "2px",
                    }}
                  />
                </button>
              </div>
              {/* Smart Action */}

              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Smart Action
                </label>
                <button
                  onClick={() =>
                    setNeonData((prev) => ({
                      ...prev,
                      SMACTION: prev.SMACTION === "ON" ? "OFF" : "ON",
                    }))
                  }
                  className={`relative w-20 h-9 rounded-full border flex items-center transition-all duration-300 ${isDark ? 'border-cyan-500' : 'border-cyan-400'}`}
                >
                  <span
                    className={`absolute w-full text-xs font-medium ${
                      neonData.SMACTION === "ON"
                        ? `text-left pl-2 ${isDark ? 'text-white' : 'text-white'}`
                        : `text-right pr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`
                    }`}
                  >
                    {neonData.SMACTION === "ON" ? "ON" : "OFF"}
                  </span>
                  <div
                    className="absolute w-7 h-7 rounded-full shadow-md transition-all duration-300"
                    style={{
                      backgroundColor:
                        neonData.SMACTION === "ON" ? "#22C55E" : isDark ? "#9EA3AB" : "#D1D5DB",
                      transform:
                        neonData.SMACTION === "ON"
                          ? "translateX(44px)"
                          : "translateX(4px)",
                      left: "2px",
                      top: "2px",
                    }}
                  />
                </button>
              </div>

              {/* IR Interval */}
              <div>
                <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  IR Interval (Minutes)
                </label>
                <select
                  value={neonData.rmanint_i ?? "15"}
                  onChange={(e) =>
                    setNeonData((prev) => ({
                      ...prev,
                      rmanint_i: e.target.value,
                    }))
                  }
                  className={`w-full p-2 mt-1 rounded border ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                >
                  {[1, 2, 5, 10, 15, 30].map((v) => (
                    <option key={v} value={v}>
                      {v} min
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Settings Box */}
              <div className={`p-4 rounded-lg space-y-4 ${isDark ? 'bg-[#11172A]' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-500 rounded-full" />
                  <h4 className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    Mode Settings
                  </h4>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <span className={`text-xs uppercase ${isDark ? 'text-white' : 'text-gray-700'}`}>
                      MAX (MXT)
                    </span>
                  </div>
                  <input
                    type="number"
                    value={neonData.MXT ?? ""}
                    onChange={(e) =>
                      setNeonData((prev) => ({ ...prev, MXT: e.target.value }))
                    }
                    className={`flex-1 p-2 text-sm rounded border ${isDark ? 'bg-[#1F2537] text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                    placeholder="30"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <span className={`text-xs uppercase ${isDark ? 'text-white' : 'text-gray-700'}`}>
                      MIN (MNT)
                    </span>
                  </div>
                  <input
                    type="number"
                    value={neonData.MNT ?? ""}
                    onChange={(e) =>
                      setNeonData((prev) => ({ ...prev, MNT: e.target.value }))
                    }
                    className={`flex-1 p-2 text-sm rounded border ${isDark ? 'bg-[#1F2537] text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                    placeholder="16"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ms"
                    checked={neonData.MS === "ON"}
                    onChange={(e) =>
                      setNeonData((prev) => ({
                        ...prev,
                        MS: e.target.checked ? "ON" : "OFF",
                      }))
                    }
                    className={`w-5 h-5 text-green-600 rounded ${isDark ? 'bg-[#1F2537] border-gray-600' : 'bg-gray-100 border-gray-300'}`}
                  />
                  <label htmlFor="ms" className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    MS (Mode Switch)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ts"
                    checked={neonData.TS === "ON"}
                    onChange={(e) =>
                      setNeonData((prev) => ({
                        ...prev,
                        TS: e.target.checked ? "ON" : "OFF",
                      }))
                    }
                    className={`w-5 h-5 text-green-600 rounded ${isDark ? 'bg-[#1F2537] border-gray-600' : 'bg-gray-100 border-gray-300'}`}
                  />
                  <label htmlFor="ts" className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    TS (Temperature Switch)
                  </label>
                </div>
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-300 text-gray-900 hover:bg-gray-400'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);

                  const payload = {
                    topic,
                    message: {
                      Remote_Make: neonData.Remote_Make || "BLUESTAR",
                      IRTEMP: Number(neonData.IRTEMP ?? neonData.irtemp ?? 23),
                      IRTEMPOFFSET: Number(
                        neonData.IRTEMPOFFSET ?? neonData.irtempoffset ?? 12
                      ),
                      rMan_I: neonData.rman_i === "ON" ? "ON" : "OFF",
                      AUTO_I: neonData.AUTO_I === "ON" ? "ON" : "OFF",
                      SMACTION: neonData.SMACTION || "OFF",
                      rManINT_I: neonData.rmanint_i || "15",
                      MXT: Number(neonData.MXT || 28),
                      MNT: Number(neonData.MNT || 24),
                      MS: neonData.MS || "OFF",
                      TS: neonData.TS || "OFF",
                    },
                  };

                  console.log(
                    "IR Settings Payload →",
                    JSON.stringify(payload, null, 2)
                  );
                  sendControlCommandSafe(payload);
                }}
                className={`px-4 py-2 rounded-lg ${isDark ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-white hover:bg-green-600'}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Neonir;
