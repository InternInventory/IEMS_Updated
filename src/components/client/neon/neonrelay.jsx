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
// (Hooks must be inside the Neonrelay component, not at the top level)
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Thermometer,
  User,
  X,
  Snowflake,
  Wind,
  Calendar,
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
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";
import useAuthFetch from "../../hooks/useAuthFetch";
import { useTheme } from "../../../context/ThemeContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSlidersH, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import moment from "moment-timezone";
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

// Helper: Analyze temperature trend data to find stuck periods and relay ON/OFF counts
function analyzeTemperatureTrendWithRelay(temperatureData, neonDeviceData) {
  if (!Array.isArray(temperatureData) || temperatureData.length === 0) {
    return { stuck_periods: [], total_on_count: 0, total_off_count: 0, stuckDetails: [] };
  }

  const stuckDetails = [];
  let prevTemp = null;
  let stuckStart = null;
  let stuckCount = 0;
  let totalOnCount = 0;
  let totalOffCount = 0;

  // Current relay state from device data
  const currentRelayState = neonDeviceData?.relay === 1 ? 'ON' : 'OFF';

  temperatureData.forEach((item, idx) => {
    const temp = item.temperature;
    
    // Check if temperature is stuck (same as previous)
    if (prevTemp !== null && temp === prevTemp) {
      // Temperature is stuck
      if (stuckStart === null) {
        stuckStart = idx;
        stuckCount = 1;
      } else {
        stuckCount++;
      }
    } else {
      // Temperature changed - end stuck period if one existed
      if (stuckStart !== null) {
        const stuckEnd = idx - 1;
        const startTime = temperatureData[stuckStart]?.time || 'N/A';
        const endTime = temperatureData[stuckEnd]?.time || 'N/A';
        
        // Track ON/OFF counts
        if (currentRelayState === 'ON') {
          totalOnCount += stuckCount;
        } else {
          totalOffCount += stuckCount;
        }
        
        stuckDetails.push({
          start: startTime,
          end: endTime,
          temperature: prevTemp,
          duration: stuckCount,
          relay_state: currentRelayState,
          on_count: currentRelayState === 'ON' ? stuckCount : 0,
          off_count: currentRelayState === 'OFF' ? stuckCount : 0,
        });
      }
      
      stuckStart = null;
      stuckCount = 0;
    }
    
    prevTemp = temp;
  });

  // Handle stuck period at end of data
  if (stuckStart !== null) {
    const startTime = temperatureData[stuckStart]?.time || 'N/A';
    const endTime = temperatureData[temperatureData.length - 1]?.time || 'N/A';
    
    // Track ON/OFF counts
    if (currentRelayState === 'ON') {
      totalOnCount += stuckCount;
    } else {
      totalOffCount += stuckCount;
    }
    
    stuckDetails.push({
      start: startTime,
      end: endTime,
      temperature: prevTemp,
      duration: stuckCount,
      relay_state: currentRelayState,
      on_count: currentRelayState === 'ON' ? stuckCount : 0,
      off_count: currentRelayState === 'OFF' ? stuckCount : 0,
    });
  }

  return {
    stuck_periods: stuckDetails,
    total_on_count: totalOnCount,
    total_off_count: totalOffCount,
    stuckDetails,
  };
}

/* ────────────────────── EXACT SAME SUMMARY CARDS ────────────────────── */
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

const EnhancedHourlyUsage = ({ data = [], timeframe, selectedDate, isDark = true }) => {
  if (!data || (!Array.isArray(data) && !data.data) || (data.data && data.data.length === 0)) {
    return (
      <div className={`rounded-xl p-6 shadow-lg ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Hourly Usage –{" "}
          {timeframe === "daily"
            ? moment(selectedDate).format("DD MMM YYYY")
            : timeframe === "monthly"
            ? moment(selectedDate).format("MMM YYYY")
            : timeframe === "yearly"
            ? moment(selectedDate).format("YYYY")
            : "Usage"}
        </h3>
        <div className={`text-center py-20 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data available</div>
      </div>
    );
  }

  const response = Array.isArray(data) ? { data } : data;
  const dataArray = response.data || [];

  let totalConsumption = 0;
  let peakDemand = 0;
  let peakDateLabel = "";
  let activeTotal = 0;
  let inactiveTotal = 0;

  const dailyMap = {}; // { "2025-12-10": total_kwh }

  dataArray.forEach(item => {
    const usage = Number(item.total_consumption_wh || item.total_consumption || 0);
    totalConsumption += usage;

    let dateKey = "";
    if (timeframe === "daily") {
      const hourIST = moment.utc(item.period).add(5, 'hours').add(30, 'minutes').hour();
      dateKey = `${String(hourIST).padStart(2, '0')}:00`;
    } else {
      // For monthly/yearly → group by date
      const date = moment.utc(item.period || item.time_bucket);
      dateKey = date.format("YYYY-MM-DD");
      if (timeframe === "yearly") dateKey = date.format("YYYY-MM"); // optional
    }

    dailyMap[dateKey] = (dailyMap[dateKey] || 0) + usage;
  });

  // Generate chart data
  const chartData = [];

  if (timeframe === "daily") {
    let peakHour = "00:00";
    for (let h = 0; h < 24; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      const usage = dailyMap[hourStr] || 0;

      if (usage > peakDemand) {
        peakDemand = usage;
        peakHour = hourStr;
        peakDateLabel = peakHour;
      }

      if (h >= 8 && h < 20) activeTotal += usage;
      else inactiveTotal += usage;

      chartData.push({
        label: hourStr,
        usage: Number(usage.toFixed(2)),
        isActive: h >= 8 && h < 20,
      });
    }
  } else {
    // Monthly / Yearly - show daily consumption
    Object.keys(dailyMap)
      .sort() // chronological order
      .forEach(dateKey => {
        const usage = dailyMap[dateKey];
        const label = timeframe === "monthly" 
          ? moment(dateKey).format("DD MMM")
          : moment(dateKey).format("MMM YYYY");

        if (usage > peakDemand) {
          peakDemand = usage;
          peakDateLabel = label;
        }

        chartData.push({
          label,
          usage: Number(usage.toFixed(2)),
          dateKey,
        });
      });

    // For non-daily, assume 73% active (standard business hours)
    activeTotal = totalConsumption * 0.73;
    inactiveTotal = totalConsumption - activeTotal;
  }

  // Calculate peak window (only for daily)
  let peakWindowText = "N/A";
  if (timeframe === "daily") {
    let maxSum = 0;
    let startHour = 0;
    for (let i = 0; i <= 21; i++) {
      const sum = (dailyMap[`${String(i).padStart(2,'0')}:00`] || 0) +
                  (dailyMap[`${String(i+1).padStart(2,'0')}:00`] || 0) +
                  (dailyMap[`${String(i+2).padStart(2,'0')}:00`] || 0);
      if (sum > maxSum) {
        maxSum = sum;
        startHour = i;
      }
    }
    if (maxSum > 0) {
      peakWindowText = `${String(startHour).padStart(2,'0')}:00 - ${String(startHour+2).padStart(2,'0')}:00`;
    }
  }

  return (
    <div className={`rounded-xl p-6 shadow-lg ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Hourly Usage –{" "}
        {timeframe === "daily"
          ? moment(selectedDate).format("DD MMM YYYY")
          : timeframe === "monthly"
          ? moment(selectedDate).format("MMM YYYY")
          : "Usage"}
      </h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="#FB923C" strokeDasharray="4 4" strokeOpacity={0.3} />
            
            <XAxis
              dataKey="label"
              tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 11 }}
              angle={timeframe !== "daily" ? -45 : 0}
              textAnchor={timeframe !== "daily" ? "end" : "middle"}
              height={timeframe !== "daily" ? 65 : 50}
            />
            
            <YAxis
              tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: "kWh", angle: -90, position: "insideLeft", style: { fill: isDark ? "#94a3b8" : "#6b7280" } }}
            />

            <Tooltip
              contentStyle={{ backgroundColor: isDark ? "#0F172B" : "#FFFFFF", border: "1px solid #FB923C", borderRadius: 8, color: isDark ? "white" : "black" }}
              formatter={(v) => `${Number(v).toFixed(2)} kWh`}
            />

            <Bar dataKey="usage" radius={[8, 8, 0, 0]} fill="#FB923C" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
         
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Maximum Demand */}
          <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{ background: isDark ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(243,244,246,0.9))', border: isDark ? '1px solid #60A5FA' : '1px solid #E5E7EB', minHeight: 80 }}>
            <div className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Maximum Demand</div>
            <div className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{peakDemand.toFixed(2)} kWh</div>
          </div>

          {/* Peak Window - Only in Daily */}
          {timeframe === "daily" && (
            <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
              style={{ background: isDark ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(243,244,246,0.9))', border: isDark ? '1px solid #FB923C' : '1px solid #E5E7EB', minHeight: 80 }}>
              <div className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Peak Window</div>
              <div className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{peakWindowText}</div>
            </div>
          )}

          {/* Total Consumption - Full width in monthly/yearly */}
          <div className={`${timeframe === "daily" ? "lg:col-span-1" : "col-span-2"} rounded-lg p-3 flex flex-col items-center justify-center text-center`}
            style={{ background: isDark ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(243,244,246,0.9))', border: isDark ? '1px solid #10B981' : '1px solid #E5E7EB', minHeight: 80 }}>
            <div className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Consumption</div>
            <div className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalConsumption.toFixed(2)} kWh</div>
          </div>
        </div>

        {/* Row 2: Active + Inactive */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{ background: isDark ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(243,244,246,0.9))', border: isDark ? '1px solid #10B981' : '1px solid #E5E7EB', minHeight: 80 }}>
            <div className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Active Hours</div>
            <div className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeTotal.toFixed(2)} kWh</div>
          </div>

          <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{ background: isDark ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : 'linear-gradient(180deg, rgba(249,250,251,0.95), rgba(243,244,246,0.9))', border: isDark ? '1px solid #9CA3AF' : '1px solid #E5E7EB', minHeight: 80 }}>
            <div className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Inactive Hours</div>
            <div className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{inactiveTotal.toFixed(2)} kWh</div>
          </div>
        </div>
      </div>
  </div>
  );
};


const EnergySavedChart = ({ data = [], apiResponse = {}, timeframe, selectedDate, activeInactive = { active: '0.00', inactive: '0.00' }, isDark = true }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }
    
    // Process data from API response - use the correct fields
    let cumulativeActual = 0;
    const processedData = data.map((item) => {
      // CORRECT: Use actual_consumption_kwh (already in kWh)
      const actual = Number(item.actual_consumption_kwh || 0);
      cumulativeActual += actual;
      
      const period = item.period;
      let label = "";
      
      switch (timeframe) {
        case "daily": label = moment(period).format("HH:mm"); break;
        case "monthly": label = moment(period).format("DD MMM"); break;
        case "yearly": label = moment(period).format("MMM"); break;
        case "custom": label = moment(period).format("DD MMM"); break;
        default: label = moment(period).format("HH:mm");
      }
      
      return { 
        period, 
        label, 
        actual_consumption: cumulativeActual,
        status: item.status 
      };
    });
    
    console.log('Processed chart data:', processedData);
    setChartData(processedData);
  }, [data, timeframe]);

  // Get CORRECT values from API response
  const totalBaseline = getBaselineValue(apiResponse, 'power', timeframe); // Should be 62.79 kWh for monthly
  const totalActual = getActualValue(apiResponse, 'power'); // Should be ~280 kWh for monthly
  const totalSaved = getSavedValue(apiResponse, 'power'); // Should be ~-217 kWh for monthly

  console.log('Chart values:', {
    totalBaseline,
    totalActual,
    totalSaved,
    timeframe,
    apiResponse
  });

  // Calculate if baseline was exceeded
  const exceededBaseline = totalActual > totalBaseline;
  const exceedPercentage = totalBaseline > 0 ? 
    Math.abs(((totalActual - totalBaseline) / totalBaseline) * 100).toFixed(1) : 0;

  // Use consistent active/inactive values from power data
  const activeHoursTotal = Number(activeInactive.active) || 0;
  const inactiveHoursTotal = Number(activeInactive.inactive) || 0;

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Energy Consumption vs Baseline</h3>
        <div className={`h-[300px] flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          No energy consumption data available
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Energy Consumption vs Baseline</h3>
        {selectedDate && (
          <span className="text-sm text-gray-400 ml-4">
            {timeframe === "daily" 
              ? moment(selectedDate).format("MMM DD, YYYY")
              : moment(selectedDate).format("MMMM YYYY")}
          </span>
        )}
      </div>

      {/* Status indicator - shows correct comparison */}
      {/* <div className={`mb-4 p-2 rounded-lg text-center ${exceededBaseline ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
        {exceededBaseline 
          ? `⚠️ Consumption exceeded baseline by ${Math.abs(totalSaved).toFixed(2)} kWh (${exceedPercentage}%)`
          : `✓ Consumption within baseline. Saved ${totalSaved.toFixed(2)} kWh`}
      </div> */}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
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
                border: isDark ? "1px solid #475569" : "1px solid #E5E7EB", 
                borderRadius: "8px", 
                padding: "8px 12px",
                color: isDark ? "white" : "black"
              }}
              formatter={(value, name) => {
                if (name === "Actual Consumption") return [`${Number(value).toFixed(2)} kWh`, "Cumulative Actual Consumption"];
                if (name === "Baseline") return [`${totalBaseline.toFixed(2)} kWh`, "Total Baseline Target"];
                return [`${Number(value).toFixed(2)} kWh`, name];
              }}
              labelFormatter={(label) => {
                if (timeframe === "daily") return `Time: ${label}`;
                if (timeframe === "monthly") return `Date: ${label}`;
                return label;
              }}
            />
            <Legend />

            {/* Baseline - Fixed horizontal line at total baseline */}
            <Line 
              type="linear" 
              dataKey={() => totalBaseline} 
              stroke="#60A5FA" 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={false} 
              legendType="none"
              name="Baseline" 
            />

            {/* Actual Consumption - Cumulative line */}
            <Line 
              type="monotone" 
              dataKey="actual_consumption" 
              stroke="#10B981" 
              strokeWidth={3} 
              dot={{ r: 3 }} 
              name="Actual Consumption" 
              legendType="none"
            />

            {/* Exceeded area - shows when actual exceeds baseline */}
            {exceededBaseline && (
              <Area
                type="monotone"
                dataKey={(entry) => {
                  const actual = entry.actual_consumption || 0;
                  return actual > totalBaseline ? actual : totalBaseline;
                }}
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

      {/* Summary cards with correct values */}
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
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    // Process carbon data from API - use correct fields
    let cumulativeActual = 0;
    const processedData = data.map((item) => {
      // CORRECT: Use actual_carbon_kg (already in kg)
      const actual = Number(item.actual_carbon_kg || 0);
      cumulativeActual += actual;

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
        status: item.status,
      };
    });

    console.log('Processed carbon chart data:', processedData);
    setChartData(processedData);
  }, [data, timeframe]);

  // Get CORRECT values from API response
  const totalBaseline = getBaselineValue(apiResponse, 'carbon', timeframe);
  const totalActual = getActualValue(apiResponse, 'carbon');
  const totalSaved = getSavedValue(apiResponse, 'carbon');

  console.log('Carbon chart values:', {
    totalBaseline,
    totalActual,
    totalSaved,
    timeframe,
    apiResponse
  });

  // Calculate if carbon exceeded baseline
  const exceededBaseline = totalActual > totalBaseline;
  const exceedPercentage = totalBaseline > 0 ? 
    Math.abs(((totalActual - totalBaseline) / totalBaseline) * 100).toFixed(1) : 0;

  // Use consistent active/inactive values (convert from kWh to approximate kg CO₂)
  const carbonFactor = totalActual > 0 && (Number(activeInactive.active) + Number(activeInactive.inactive)) > 0 
    ? totalActual / (Number(activeInactive.active) + Number(activeInactive.inactive)) 
    : 0.82; // Default carbon factor
  const activeHoursTotal = Number(activeInactive.active) * carbonFactor;
  const inactiveHoursTotal = Number(activeInactive.inactive) * carbonFactor;

  if (loading) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-6">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
          {selectedDate && (
            <span className={`text-sm ml-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {timeframe === "daily" 
                ? moment(selectedDate).format("MMM DD, YYYY")
                : moment(selectedDate).format("MMMM YYYY")}
            </span>
          )}
        </div>
        <div className={`h-[300px] flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Loading carbon footprint data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-6">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
          {selectedDate && (
            <span className={`text-sm ml-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {timeframe === "daily" 
                ? moment(selectedDate).format("MMM DD, YYYY")
                : moment(selectedDate).format("MMMM YYYY")}
            </span>
          )}
        </div>
        <div className={`h-48 flex items-center justify-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg relative ${isDark ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-baseline mb-6">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
          {selectedDate && (
            <span className={`text-sm ml-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {timeframe === "daily" 
                ? moment(selectedDate).format("MMM DD, YYYY")
                : moment(selectedDate).format("MMMM YYYY")}
            </span>
          )}
        </div>
        <div className={`h-48 flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          No carbon footprint data available
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

      {/* Status indicator */}
      {/* <div className={`mb-4 p-2 rounded-lg text-center ${exceededBaseline ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
        {exceededBaseline 
          ? `⚠️ Carbon exceeded baseline by ${Math.abs(totalSaved).toFixed(2)} kg CO₂ (${exceedPercentage}%)`
          : `✓ Carbon within baseline. Saved ${totalSaved.toFixed(2)} kg CO₂`}
      </div> */}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
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
                border: isDark ? "1px solid #475569" : "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px 12px",
                color: isDark ? "white" : "black"
              }}
              formatter={(value, name) => {
                if (name === "Actual Carbon") return [`${Number(value).toFixed(2)} kg CO₂`, "Cumulative Carbon"];
                if (name === "Baseline Carbon") return [`${totalBaseline.toFixed(2)} kg CO₂`, "Total Baseline Target"];
                return [`${Number(value).toFixed(2)} kg CO₂`, name];
              }}
              labelFormatter={(label) => {
                if (timeframe === "daily") return `Time: ${label}`;
                if (timeframe === "monthly") return `Date: ${label}`;
                return label;
              }}
            />
            <Legend />

            {/* Fixed Baseline line */}
            <Line
              type="linear"
              dataKey={() => totalBaseline}
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="5 5"
              legendType="none"
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
              legendType="none"
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

//──────────────── MAIN COMPONENT ────────────────────── */
const Neonrelay = () => {
    // ...existing code...
  const { did } = useParams();
  const decodedDid = decodeURIComponent(did);
  const encodedDid = encodeURIComponent(decodedDid);
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { isDark } = useTheme();

  /* ---------- State ---------- */
  const [neonData, setNeonData] = useState(null);
  const [previousNeonData, setPreviousNeonData] = useState(null);
  const [topic, setTopic] = useState("");
  const [responseTopic, setResponseTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [isrelayOn, setIsrelayOn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const lastUpdate = neonData?.created_at ?? neonData?.TIME;
  const [settings, setSettings] = useState(null);
  const intervals = [1, 2, 5, 10, 15, 30, 60];
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

  // --- Timeframe and temperatureData must be initialized before relay info state ---
  const [timeframe, setTimeframe] = useState("daily");
  // ...other state...
  const [temperatureData, setTemperatureData] = useState([]);
  // --- Relay ON/OFF Info State ---
  const [showRelayInfo, setShowRelayInfo] = useState(false);
  const relayDailyData = useMemo(() => {
    if (timeframe === 'daily' && Array.isArray(temperatureData) && temperatureData.some(d => d.relay !== undefined)) {
      return temperatureData;
    }
    return [];
  }, [timeframe, temperatureData]);
  
  // --- Temperature Stuck Analysis State ---
  const [temperatureStuckAnalysis, setTemperatureStuckAnalysis] = useState({ 
    stuck_periods: [], 
    total_on_count: 0, 
    total_off_count: 0 
  });
  const [showTemperatureStuckModal, setShowTemperatureStuckModal] = useState(false);
  
  const [statusMessage, setStatusMessage] = useState(null);
  const [messageTimeout, setMessageTimeout] = useState(null);
  const [timeoutCounter, setTimeoutCounter] = useState(0);

  const [mode, setMode] = useState("auto");

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(new AbortController());
  
  // Mark component as mounted on first render
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // POWER
  const [powerData, setPowerData] = useState([]);
  const [powerLoading, setPowerLoading] = useState(false);
  // timeframe already declared above
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [activeInactive, setActiveInactive] = useState({ active: '0.00', inactive: '0.00' });

  // Full API responses for enhanced charts
  const [powerSavingResponse, setPowerSavingResponse] = useState({});
  const [carbonResponse, setCarbonResponse] = useState({});
  const [workingHoursResponse, setWorkingHoursResponse] = useState({});

  // Data arrays
  const [carbonData, setCarbonData] = useState([]);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [powerSavingData, setPowerSavingData] = useState([]);
  const [powerSavingLoading, setPowerSavingLoading] = useState(false);
  const [workingHoursData, setWorkingHoursData] = useState([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);
  // temperatureData already declared above
  const [temperatureLoading, setTemperatureLoading] = useState(false);

  // Organization access control - hide graphs for org_id 149
  const [hideGraphs, setHideGraphs] = useState(false);

  // API call throttling - prevent rapid requests
  const [lastApiCall, setLastApiCall] = useState(0);
  const API_THROTTLE_DELAY = 5000; // Minimum 5 seconds between any API calls

  // Baseline Modal
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [baselineInput, setBaselineInput] = useState("");
  const [baselineStatus, setBaselineStatus] = useState("idle");
  const [baseline, setBaseline] = useState(null);
  const [modalBaseline, setModalBaseline] = useState(null);

  const curTemp = Number(neonData?.TEMPIP ?? neonData?.tempip ?? 0);
  const motion = Number(neonData?.motion ?? neonData?.raceman ?? 0);
  const isCooling = isrelayOn && curTemp;
  const motionActive = motion === 1;

  const mxt = Number(neonData?.MXT ?? neonData?.mxt ?? 30);
  const mnt = Number(neonData?.MNT ?? neonData?.mnt ?? 16);

  const humidity = Number(neonData?.BiBug?.[0]?.Hum ?? null);

  let humidityColor = "#9CA3AF";
  if (humidity !== null && !isNaN(humidity)) {
    if (humidity < 30) humidityColor = "#60A5FA";
    else if (humidity >= 30 && humidity <= 60) humidityColor = "#22C55E";
    else if (humidity > 60 && humidity <= 75) humidityColor = "#FACC15";
    else humidityColor = "#EF4444";
  }

  let tempColor = "#9CA3AF";
  if (!isNaN(curTemp)) {
    if (curTemp >= mxt) tempColor = "#EF4444";
    else if (curTemp <= mnt) tempColor = "#22C55E";
    else tempColor = "#FACC15";
  }

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
            console.log('🚫 Organization ID 149 detected - hiding all graphs (Neonrelay)');
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
          console.log('🚫 Organization ID 149 detected from API - hiding all graphs (Neonrelay)');
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
                  .reduce((s, d) => s + (d.R ?? 0) + (d.Y ?? 0) + (d.B ?? 0), 0)
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

  /* ---------- FETCH DEVICE DATA ---------- */
  const fetchData = async () => {
    if (!isMountedRef.current) return; // Don't fetch if unmounted
    
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiURL}/location/neon-data/${decodedDid}`,
        method: "GET",
        signal: abortControllerRef.current.signal,
      });

      if (!isMountedRef.current) return; // Don't update state if unmounted

      const data = res.data;

      // Key fields to compare for detecting actual device state changes
      const currentStateKey = `${data.relay}-${data.rMan_R}-${data.AUTO_R}`;
      const previousStateKey = previousNeonData
        ? `${previousNeonData.relay}-${previousNeonData.rMan_R}-${previousNeonData.AUTO_R}`
        : null;

      // Check if timestamp changed (new data received)
      const timestampChanged =
        !previousNeonData || data.created_at !== previousNeonData.created_at;

      const dataChanged = currentStateKey !== previousStateKey;

      // If there's a pending command and we got new data (timestamp changed), clear the timeout
      // DISABLED: Let WebSocket MQTT responses handle command clearing instead of API polling
      // if (pendingCommand && commandTimeout && timestampChanged) {
      //   clearTimeout(commandTimeout);
      //   setCommandTimeout(null);
      //   setPendingCommand(null);
      // }

      if (dataChanged) {
        // Extract Schedule to top level
        const normalizedData = {
          ...data,
          Schedule: data.Schedule || []
        };
        setNeonData(normalizedData);
        setPreviousNeonData(normalizedData);
        const defaultTopic = data.topic ?? `Setting/${data.macid}`;
        setTopic(defaultTopic);
        
        // Extract response topic - only update if we have a valid macid
        const macid = data.MACID ?? data.macid;
        if (macid && !responseTopic) {
          const resTopicFromData = data.Response ?? data.response ?? `Response/${macid}`;
          setResponseTopic(resTopicFromData);
        }

        setIsrelayOn(data.relay === 1);

        const autoOn = data.AUTO_R === "ON";
        const manOn = data.rMan_R === "ON";

        if (autoOn && !manOn) setMode("auto");
        else if (!autoOn && manOn) setMode("manual-on");
        else if (!autoOn && !manOn) setMode("manual-off");
        else setMode(manOn ? "manual-on" : "auto");

        setSettings({
          SmartDelay: data.smartdelay ? Number(data.smartdelay) : 5,
          rMan_R: data.rMan_R ?? data.rman_r ?? "OFF",
          AUTO_R: data.AUTO_R || "OFF",
          SMACTION: data.SMACTION || "OFF",
          Interval: data.rmanint_r ? Number(data.rmanint_r) : 15,
          MXT: data.MXT ?? 30,
          MNT: data.MNT ?? 16,
          MS: data.MS || "OFF",
          TS: data.TS || "OFF",
        });

        // Baseline
        const bl = data.baseline_set ?? data.BASELINE ?? null;
        setBaseline(bl);
        setModalBaseline(bl);
      } else {
        if (timestampChanged) {
          setPreviousNeonData(data);
        }
        if (!pendingCommand) {
          const normalizedData = {
            ...data,
            Schedule: data.Schedule || []
          };
          setNeonData(normalizedData);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted - component unmounted');
        return;
      }
      console.error("Error fetching Neon Data:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
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
        // For working hours daily, show every 3rd hour label to reduce overlap
        const hour = parseInt(String(value).split(":")[0]);
        return hour % 3 === 0 ? value : "";
      }

      if (tf === "daily") {
        // For power daily, show every 2nd hour label to avoid overlapping text
        const hour = parseInt(String(value).split(":")[0]);
        return hour % 2 === 0 ? value : "";
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
    if (!isMountedRef.current) return; // Don't fetch if unmounted
    
    // Check if user org_id includes 149 - if so, don't show any graph data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected - hiding power graph data');
          setPowerData([]);
          setPowerLoading(false);
          setActiveInactive({ active: '0.00', inactive: '0.00' });
          return;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    try {
      if (isMountedRef.current) setPowerLoading(true);
      const apiURL = import.meta.env.VITE_API_BASE_URL;

      // Use the new neon-power-data endpoint
      let url = `${apiURL}/location/neon-power-data/${encodedDid}`;
      
      // Add timeframe and date parameters
      const params = new URLSearchParams();
      params.append('timeframe', tf);
      if (date && tf === "daily") {
        params.append('date', date);
      }
      url += `?${params.toString()}`;

      console.log(`🔍 Fetching power data from new endpoint: ${url}`);
      const res = await authFetch({ url, method: "GET", signal: abortControllerRef.current.signal });

      if (!isMountedRef.current) return; // Don't update state if unmounted

      console.log('📊 Full API response:', res);
      console.log('📊 Response data:', res.data);
      console.log('📊 Response data type:', typeof res.data);
      console.log('📊 Response success:', res.data?.success);
      console.log('📊 Response data array:', res.data?.data);
      console.log('📊 Is data array?', Array.isArray(res.data?.data));
      
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        const rawData = res.data.data;
        console.log('📈 Raw power data:', rawData);

        // Process the data for the chart
        let transformedData;
        if (tf === "daily") {
          // For daily: use the time field from API response (already in HH:MM format)
          transformedData = Array.from({ length: 24 }, (_, hour) => {
            const timeString = `${String(hour).padStart(2, "0")}:00`;
            const hourData = rawData.find(item => item.time === timeString);

            return {
              time: timeString,
              label: timeString,
              R: hourData ? Number(hourData.R || 0) : null,
              Y: hourData ? Number(hourData.Y || 0) : null,
              B: hourData ? Number(hourData.B || 0) : null,
            };
          });
        } else {
          // For other timeframes (weekly, monthly, yearly)
          transformedData = rawData.map(item => {
            const date = new Date(item.time_bucket || item.period || item.date);
            let label, timeValue;

            if (tf === "weekly") {
              label = moment(date).format("DD MMM");
              timeValue = moment(date).format("YYYY-MM-DD");
            } else if (tf === "monthly") {
              label = moment(date).format("DD MMM");
              timeValue = moment(date).format("YYYY-MM-DD");
            } else if (tf === "yearly") {
              label = moment(date).format("MMM YYYY");
              timeValue = moment(date).format("YYYY-MM");
            } else {
              label = moment(date).format("DD MMM");
              timeValue = moment(date).format("YYYY-MM-DD");
            }

            return {
              time: timeValue,
              label: label,
              R: Number(item.R || 0),
              Y: Number(item.Y || 0),
              B: Number(item.B || 0),
            };
          });
        }

        console.log(`✅ Power Data (${tf}):`, transformedData);
        setPowerData(transformedData);

        // Update active/inactive hours from the API response
        if (res.data.summary) {
          // Use summary data from the new API
          const summary = res.data.summary;
          const totalKwh = Number(summary.total_kwh || 0);
          
          setActiveInactive({
            active: totalKwh.toFixed(2),
            inactive: '0.00' // API doesn't distinguish active/inactive yet, so set inactive to 0
          });
          
          console.log('📊 Using summary data:', {
            total_kwh: totalKwh,
            total_wh_r: summary.total_wh_r,
            total_wh_y: summary.total_wh_y,
            total_wh_b: summary.total_wh_b,
            avg_temperature: summary.avg_temperature
          });
        } else {
          // Fallback: calculate from transformed data
          const totalR = transformedData.reduce((sum, item) => sum + (item.R || 0), 0);
          const totalY = transformedData.reduce((sum, item) => sum + (item.Y || 0), 0);
          const totalB = transformedData.reduce((sum, item) => sum + (item.B || 0), 0);
          const totalPower = (totalR + totalY + totalB) / 1000; // Convert Wh to kWh
          
          setActiveInactive({
            active: totalPower.toFixed(2),
            inactive: '0.00'
          });
        }
      } else {
        console.warn('❌ No data in response:', res.data);
        setPowerData([]);
        setActiveInactive({ active: '0.00', inactive: '0.00' });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Power data fetch aborted - component unmounted');
        return;
      }
      console.error("Error fetching power data:", error);
      if (isMountedRef.current) {
        setPowerData([]);
        setActiveInactive({ active: '0.00', inactive: '0.00' });
      }
    } finally {
      if (isMountedRef.current) setPowerLoading(false);
    }
  };

const fetchPowerSavingData = async () => {
  if (!isMountedRef.current) return; // Don't fetch if unmounted
  
  // Check if user org_id includes 149 - if so, don't show any graph data
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
        console.log('🚫 Organization ID 149 detected - hiding power saving graph data');
        setPowerSavingResponse({});
        setPowerSavingData([]);
        return;
      }
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
  }

  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    let url = `${apiURL}/neon-power-saving/${encodedDid}/${timeframe}`;
    if (timeframe === "daily") url += `?date=${selectedDate}`;
    const res = await authFetch({ url, method: "GET", signal: abortControllerRef.current.signal });
    
    if (!isMountedRef.current) return; // Don't update state if unmounted
    
    // Set both the response and the data array
    setPowerSavingResponse(res?.data || {});
    setPowerSavingData(res?.data?.data || []);
  } catch (err) { 
    if (err.name === 'AbortError') {
      console.log('Power saving fetch aborted - component unmounted');
      return;
    }
    console.error(err);
    if (isMountedRef.current) {
      setPowerSavingResponse({});
      setPowerSavingData([]);
    }
  }
};

const fetchCarbonFootprint = async () => {
  if (!isMountedRef.current) return; // Don't fetch if unmounted
  
  // Check if user org_id includes 149 - if so, don't show any graph data
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
        console.log('🚫 Organization ID 149 detected - hiding carbon footprint graph data');
        if (isMountedRef.current) {
          setCarbonResponse({});
          setCarbonData([]);
        }
        return;
      }
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
  }

  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    let url = `${apiURL}/neon-carbon-footprint/${encodedDid}/${timeframe}`;
    if (timeframe === "daily") url += `?date=${selectedDate}`;
    const res = await authFetch({ url, method: "GET", signal: abortControllerRef.current.signal });
    
    if (!isMountedRef.current) return; // Don't update state if unmounted
    
    // Set both the response and the data array
    setCarbonResponse(res?.data || {});
    setCarbonData(res?.data?.data || []);
  } catch (err) { 
    if (err.name === 'AbortError') {
      console.log('Carbon footprint fetch aborted - component unmounted');
      return;
    }
    console.error(err);
    if (isMountedRef.current) {
      setCarbonResponse({});
      setCarbonData([]);
    }
  }
};

const fetchWorkingHours = async () => {
  if (!isMountedRef.current) return; // Don't fetch if unmounted
  
  // Check if user org_id includes 149 - if so, don't show any graph data
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
        console.log('🚫 Organization ID 149 detected - hiding working hours graph data');
        if (isMountedRef.current) {
          setWorkingHoursResponse({
            success: false,
            timeframe,
            total_periods: 0,
            total_working_hours: 0,
            data: [],
          });
        }
        return;
      }
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
  }

  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    let url = `${apiURL}/neon-get-working-hours/${encodedDid}/${timeframe}`;

    // Add date param only when timeframe = daily
    if (timeframe === "daily" && selectedDate) {
      url += `?date=${selectedDate}`;
    }

    const res = await authFetch({ url, method: "GET", signal: abortControllerRef.current.signal });

    if (!isMountedRef.current) return; // Don't update state if unmounted

    // API returns object with success, timeframe, total_periods, total_working_hours, data[], message
    const responseData =
      res?.data && typeof res.data === "object" ? res.data : {};

    setWorkingHoursResponse(responseData);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Working hours fetch aborted - component unmounted');
      return;
    }
    console.error("Error fetching working hours:", err);

    if (isMountedRef.current) {
      // Reset state to prevent chart breaking
      setWorkingHoursResponse({
        success: false,
        timeframe,
        total_periods: 0,
        total_working_hours: 0,
        data: [],
      });
    }
  }
};


    const fetchTemperatureTrend = async (tf, date) => {
    if (!isMountedRef.current) return; // Don't fetch if unmounted
    
    // Check if user org_id includes 149 - if so, don't show any graph data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
          console.log('🚫 Organization ID 149 detected - hiding temperature graph data');
          if (isMountedRef.current) {
            setTemperatureData([]);
            setTemperatureLoading(false);
          }
          return;
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    if (isMountedRef.current) setTemperatureLoading(true);
    try {
      let url;
      if (tf === 'daily') {
        url = `${import.meta.env.VITE_API_BASE_URL}/location/neon-power-data/${encodedDid}?timeframe=daily&date=${date}`;
      }  else if (tf === 'monthly') {
        const month = moment(date).format('YYYY-MM');
        url = `${import.meta.env.VITE_API_BASE_URL}/location/neon-power-data/${encodedDid}?timeframe=monthly&month=${month}`;
      } else if (tf === 'yearly') {
        const year = moment(date).year();
        url = `${import.meta.env.VITE_API_BASE_URL}/location/neon-power-data/${encodedDid}?timeframe=yearly&year=${year}`;
      }

      console.log(`\n🌡️ TEMPERATURE TREND FETCH [${tf}]`, { url, date });
      const response = await authFetch({ url, method: 'GET', signal: abortControllerRef.current.signal });
      
      if (!isMountedRef.current) return; // Don't update state if unmounted
      
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
      if (isMountedRef.current) setTemperatureData(formatted);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Temperature trend fetch aborted - component unmounted');
        return;
      }
      console.error('Temperature trend fetch error:', err);
      if (isMountedRef.current) setTemperatureData([]);
    } finally {
      if (isMountedRef.current) setTemperatureLoading(false);
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
      setTimeout(() => setBaselineStatus("idle"), 1000);
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


  // Periodic GMRMAIN data request every 10 seconds
  useEffect(() => {
    if (!decodedDid || !topic || !responseTopic) return;

    console.log('🔄 Starting initial GMRMAIN request for device:', decodedDid);

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
          // Check API throttling before periodic call
          const now = Date.now();
          const timeSinceLastCall = now - lastApiCall;
          if (timeSinceLastCall < API_THROTTLE_DELAY) {
            console.log('⏰ Periodic call skipped - API throttled');
            return;
          }
          
          setLastApiCall(Date.now());
          console.log('📡 Sending periodic GMRMAIN request (60s interval)');
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
                r.DID || r.RELAY !== undefined || r.MANRELAY !== undefined || r.AUTO_R !== undefined
              );
            } else if (response.data.DID || response.data.RELAY !== undefined) {
              deviceData = response.data;
            }
            
            if (deviceData) {
              // Update relay status
              if (deviceData.RELAY !== undefined) {
                setIsrelayOn(deviceData.RELAY === 1);
                console.log('🔌 Periodic: Relay status updated:', deviceData.RELAY === 1);
              }
              
              // Update mode
              const autoOn = deviceData.AUTO_R === "ON";
              const manOn = deviceData.MANRELAY === "ON";
              
              let newMode;
              if (autoOn && !manOn) newMode = "auto";
              else if (!autoOn && manOn) newMode = "manual-on";
              else if (!autoOn && !manOn) newMode = "manual-off";
              else newMode = manOn ? "manual-on" : "auto";
              
              setMode(newMode);
              setNeonData(prev => ({ ...prev, ...deviceData }));
              console.log('🔄 Periodic update completed - relay section visibility unchanged');
            }
          }
        } catch (error) {
          console.error('Periodic GMRMAIN request failed:', error);
        }
      }, 60000); // Every 60 seconds
    };
    
    // Initial call on page entry
    const makeInitialCall = async () => {
      if (!isMountedRef.current) {
        console.log('⏹️ Component unmounted, skipping initial GMRMAIN request');
        return;
      }
      
      // Check API throttling
      const now = Date.now();
      const timeSinceLastCall = now - lastApiCall;
      if (timeSinceLastCall < API_THROTTLE_DELAY) {
        console.log(`⏰ API throttled - waiting ${API_THROTTLE_DELAY - timeSinceLastCall}ms`);
        if (isMountedRef.current) {
          setTimeout(makeInitialCall, API_THROTTLE_DELAY - timeSinceLastCall);
        }
        return;
      }
      
      try {
        setLastApiCall(Date.now());
        console.log('📡 Making initial GMRMAIN request');
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
            // Find the device data object (usually the second object after AcceptedCmd)
            deviceData = response.data.responses.find(r => 
              r.DID || r.RELAY !== undefined || r.MANRELAY !== undefined || r.AUTO_R !== undefined
            );
          } else if (response.data.DID || response.data.RELAY !== undefined) {
            deviceData = response.data;
          }
          
          if (deviceData && deviceData.DID) {
            console.log('📥 Initial GMRMAIN response received, updating relay state:', deviceData);
            
            // Update relay status based on RELAY field (actual AC status)
            if (deviceData.RELAY !== undefined) {
              setIsrelayOn(deviceData.RELAY === 1);
              console.log('🔌 Relay status updated:', deviceData.RELAY === 1);
            }
            
            // Update mode based on AUTO_R and MANRELAY
            const autoOn = deviceData.AUTO_R === "ON";
            const manOn = deviceData.MANRELAY === "ON";
            
            let newMode;
            if (autoOn && !manOn) newMode = "auto";
            else if (!autoOn && manOn) newMode = "manual-on";
            else if (!autoOn && !manOn) newMode = "manual-off";
            else newMode = manOn ? "manual-on" : "auto";
            
            setMode(newMode);
            setNeonData(prev => ({ ...prev, ...deviceData }));
            
            // Only show AC section when we receive valid device data with DID
            setLoading(false);
            console.log('✅ Valid device data received, AC section will be shown');
            
            // Start periodic calls after successful initial call
            console.log('✅ Starting periodic GMRMAIN requests after valid response');
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
        showStatusMessage('Failed to fetch device data. Retrying...', 'error');
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
      abortControllerRef.current.abort();
    };
  }, [decodedDid, topic, responseTopic]);

  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;
    
    // Only perform initial data fetch - no polling intervals for real-time data
    fetchData();
    fetchPowerData(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchCarbonFootprint(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchPowerSavingData(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchWorkingHours(timeframe, timeframe === "daily" ? selectedDate : null);
    fetchTemperatureTrend(timeframe, timeframe === "daily" ? selectedDate : null);

    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      // Abort any ongoing API requests
      abortControllerRef.current.abort();
      // Create new abort controller for next mount
      abortControllerRef.current = new AbortController();
      
      // Clear command timeout on unmount
      if (commandTimeout) {
        clearTimeout(commandTimeout);
      }
      // Clear message timeout on unmount
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
    };
  }, [decodedDid, timeframe, selectedDate, showSettings]);

  useEffect(() => {
    if (timeframe === 'daily') {
      const today = moment().format('YYYY-MM-DD');
      setSelectedDate(today);
    }
  }, [timeframe]);

  // Analyze temperature data for stuck periods with relay ON/OFF counts
  useEffect(() => {
    if (temperatureData && temperatureData.length > 0 && neonData) {
      const analysis = analyzeTemperatureTrendWithRelay(temperatureData, neonData);
      setTemperatureStuckAnalysis(analysis);
      console.log('Temperature Stuck Analysis:', analysis);
    }
  }, [temperatureData, neonData]);

  /* ---------- MQTT COMMAND HELPER ---------- */
  const sendControlCommand = async (payload) => {
    if (!topic) {
      setTimeout(() => sendControlCommand(payload), 500);
      return;
    }
    payload.topic = topic;
    payload.response = responseTopic;

    const currentState = {
      relay: neonData?.relay ?? (isrelayOn ? 1 : 0),
      rMan_R: neonData?.rMan_R ?? (mode === "manual-on" ? "ON" : "OFF"),
      AUTO_R: neonData?.AUTO_R ?? (mode === "auto" ? "ON" : "OFF"),
      uiIsrelayOn: isrelayOn,
      uiMode: mode,
    };

    console.log('🚀 Sending control command:', payload.message);
    console.log('📊 Current state saved for timeout handling:', currentState);

    setPendingCommand(currentState);

    const timeout = setTimeout(() => {
      console.log('⏰ Device command timeout after 30 seconds, reverting changes');
      console.log('⏰ Timed out command state:', pendingCommandRef.current);
      console.warn("Device command timeout - reverting changes");
      
      // Only revert if this specific command is still pending
      if (pendingCommandRef.current && pendingCommandRef.current === currentState) {
        console.log('⏰ Reverting to previous state');
        showStatusMessage("Device not reachable. Reverting changes...", "error");
        setIsrelayOn(currentState.uiIsrelayOn);
        setMode(currentState.uiMode);
        setPendingCommand(null);
        setCommandTimeout(null);
      }
    }, 30000); // Increased to 30 seconds

    setCommandTimeout(timeout);
    console.log('⏱️ Command timeout set for 30 seconds, timeout ID:', timeout);

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
          // Skip API throttling check for post-command updates (critical for UI sync)
          setLastApiCall(Date.now());
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
            
            // Handle different response structures
            if (gmrallResponse.data.responses && Array.isArray(gmrallResponse.data.responses)) {
              // Find the device data object (usually the second object after AcceptedCmd)
              deviceData = gmrallResponse.data.responses.find(r => 
                r.DID || r.RELAY !== undefined || r.MANRELAY !== undefined || r.AUTO_R !== undefined
              );
            } else if (gmrallResponse.data.DID || gmrallResponse.data.RELAY !== undefined) {
              deviceData = gmrallResponse.data;
            }
            
            if (deviceData) {
              console.log('🔄 Updating device state with fresh data:', {
                RELAY: deviceData.RELAY,
                AUTO_R: deviceData.AUTO_R,
                MANRELAY: deviceData.MANRELAY,
                TempIP: deviceData.TempIP || deviceData.tempip,
                Motion: deviceData.Motion || deviceData.motion,
                MXT: deviceData.MXT,
                MNT: deviceData.MNT,
              });
              
              // Update relay status based on RELAY field
              if (deviceData.RELAY !== undefined) {
                const newRelayState = deviceData.RELAY === 1;
                setIsrelayOn(newRelayState);
                console.log('🔌 Post-command: Relay status updated:', newRelayState);
              }
              
              // Update mode based on AUTO_R and MANRELAY
              const autoOn = deviceData.AUTO_R === "ON";
              const manOn = deviceData.MANRELAY === "ON";
              
              let newMode;
              if (autoOn && !manOn) newMode = "auto";
              else if (!autoOn && manOn) newMode = "manual-on";
              else if (!autoOn && !manOn) newMode = "manual-off";
              else newMode = manOn ? "manual-on" : "auto";
              
              console.log('🎛️ Mode updated:', { autoOn, manOn, newMode });
              setMode(newMode);
              
              // Merge all device parameters - normalize field names
              const normalizedData = {
                ...deviceData,
                // Ensure consistent field names (uppercase for display)
                RELAY: deviceData.RELAY ?? deviceData.relay,
                TempIP: deviceData.TempIP ?? deviceData.tempip,
                Motion: deviceData.Motion ?? deviceData.motion,
                TEMPIP: deviceData.TempIP ?? deviceData.tempip,
                motion: deviceData.Motion ?? deviceData.motion,
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
              
              console.log('✅ Device state fully synchronized with device');
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
      setIsrelayOn(currentState.uiIsrelayOn);
      setMode(currentState.uiMode);
      setPendingCommand(null);
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        setCommandTimeout(null);
      }
    }
  };

  const cycleMode = () => {
    // Prevent rapid-fire commands
    if (pendingCommandRef.current) {
      console.log('⚠️ Command already in progress, ignoring mode cycle');
      showStatusMessage("Please wait for current command to complete", "warning");
      return;
    }
    
    let payload = {};
    if (mode === "auto") {
      payload = { MANRELAY: "ON", AUTO_R: "OFF" };
      setMode("manual-on");
    } else if (mode === "manual-on") {
      payload = { MANRELAY: "OFF", AUTO_R: "OFF" };
      setMode("manual-off");
    } else if (mode === "manual-off") {
      payload = { MANRELAY: "ON", AUTO_R: "OFF" };
      setMode("manual-on");
    }
    sendControlCommand({ message: payload });
  };

  let isOnline = false;
  if (lastUpdate) {
    const lastIST = moment.tz(lastUpdate, "UTC").tz("Asia/Kolkata");
    const nowIST = moment.tz("Asia/Kolkata");
    const minutesAgo = nowIST.diff(lastIST, "minutes");
    isOnline = minutesAgo <= 2;
  }

  const handleSaveSettings = () => {
    if (!settings) return;

    sendControlCommand({
      message: {
        SMARTDELAY: settings.SmartDelay,
        rMan_R: settings.rMan_R,
        AUTO_R: settings.AUTO_R,
        SMACTION: settings.SMACTION,
        rManINT_R: settings.Interval,
        MXT: Number(settings.MXT),
        MNT: Number(settings.MNT),
        MS: settings.MS,
        TS: settings.TS,
      },
    });
    setShowSettings(false);
  };

  /* ---------- CHART DATA CALCULATIONS ---------- */
  const powerChartData = powerData.map((i) => ({
    time: i.time,
    R: i.R ?? null,
    Y: i.Y ?? null,
    B: i.B ?? null,
    total: (Number(i.R || 0) + Number(i.Y || 0) + Number(i.B || 0)).toFixed(3),
  }));

  const totalPower = (Number(activeInactive.active) + Number(activeInactive.inactive)).toFixed(2);

  const phaseTotals = {
    R: powerChartData.reduce((s, d) => s + (Number(d.R) || 0), 0).toFixed(2),
    Y: powerChartData.reduce((s, d) => s + (Number(d.Y) || 0), 0).toFixed(2),
    B: powerChartData.reduce((s, d) => s + (Number(d.B) || 0), 0).toFixed(2),
  };

  // Temperature stats (ignore nulls)
  const tempValues = temperatureData.map((d) => d.temperature).filter((v) => v != null);
  const tempAvg = tempValues.length ? tempValues.reduce((s, v) => s + v, 0) / tempValues.length : 0;
  const tempMin = tempValues.length ? Math.min(...tempValues) : 0;
  const tempMax = tempValues.length ? Math.max(...tempValues) : 0;

  /* ---------- RENDER ---------- */
  if (loading) return <div className="p-6 text-white">Loading…</div>;
  if (!neonData)
    return <div className="p-6 text-red-400">Failed to load data.</div>;

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
        <h2 className="text-2xl font-bold">
          {neonData.device_name ?? neonData.DID}
        </h2>
        <div className="text-sm text-gray-400 flex items-center gap-4">
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
            <span className="text-blue-400">
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

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* RELAY CONTROL CARD */}
        <div className={`lg:col-span-2 p-6 rounded-xl flex flex-col items-center relative justify-between ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
          <div className={`absolute top-4 left-4 font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            {neonData.remote_make ?? "-"}
          </div>

          <div className="absolute top-4 right-4 flex gap-3">
            <button
              className={`px-4 py-2 rounded-lg transition ${isDark ? 'bg-[#1F3C48] hover:bg-[#2A5058] text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
              onClick={() => setShowSettings(true)}
            >
              <FontAwesomeIcon icon={faSlidersH} />
            </button>
            <button
  className={`px-4 py-2 rounded-lg transition bg-green-600 hover:bg-green-700 text-white`}
  onClick={() => {
    console.log('📅 Opening schedule manager - neonData:', neonData);
    console.log('📅 Schedule array:', neonData?.Schedule);
    const topic = neonData?.topic || "topic";
    const response = neonData?.response || "response";
    const schedules = neonData?.Schedule || [];
    console.log('📅 Passing schedules to manager:', schedules);
    navigate(`/device/schedule`, {
      state: { deviceType: "Relay", topic, response, scheduleData: schedules },
    });
  }}
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

            <div className="absolute top-2 left-1 flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  isrelayOn
                    ? "bg-green-500 animate-pulse shadow-green-500/50"
                    : "bg-red-500"
                }`}
              />
              <span
                className={`mt-0.5 text-[7px] font-medium transition-colors duration-300 ${
                  isrelayOn ? "text-green-400" : "text-red-400"
                } bg-black/70 px-1 py-0.5 rounded`}
              >
                {isrelayOn ? "ON" : "OFF"}
              </span>
            </div>

            <div className="absolute bottom-4 right-1 flex flex-col items-center">
              <span
                className={`mt-0.5 text-[7px] font-medium tracking-wider ${
                  mode === "auto"
                    ? "text-green-600"
                    : mode === "manual-on"
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}
              >
                {mode === "auto" ? "AUTO" : mode === "manual-on" ? "ON" : "OFF"}
              </span>

              {neonData?.AUTO_R === "ON" ? (
                <button
                  onClick={() => {
                    sendControlCommand({
                      message: { MANRELAY: "ON", AUTO_R: "OFF" },
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
                <button
                  onClick={cycleMode}
                  className={`relative w-10 h-5 rounded-full border flex items-center
                    transition-all duration-300 cursor-pointer select-none overflow-hidden mt-1
                    ${
                      mode === "manual-on"
                        ? "bg-[#D2DE07]/30 border-[#D2DE07]"
                        : "bg-[#2D3748] border-[#9EA3AB]"
                    }`}
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
                    className={`absolute text-[9px] font-bold transition-all duration-300 z-10 ${
                      mode === "manual-on"
                        ? "left-1 text-white"
                        : "right-1 text-[#9EA3AB]"
                    }`}
                  >
                    {mode === "manual-on" ? "ON" : "OFF"}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-auto w-full px-6 pb-4">
            <div className="grid grid-cols-2 gap-6">
              <button
                className={`flex flex-col items-center justify-center w-20 h-16 p-2 rounded-lg transition ${
                  isCooling
                    ? isDark ? 'bg-blue-500/30 border border-blue-400 text-blue-400' : 'bg-blue-100 border border-blue-400 text-blue-600'
                    : isDark ? 'bg-[#464F62] hover:bg-gray-500 text-gray-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
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

            {/* TEMPERATURE & HUMIDITY + MOTION ROW */}
            <div className="flex gap-4">
              {/* Temperature */}
              <div className={`flex items-center justify-center w-20 h-16 p-2 rounded-lg transition ${isDark ? 'bg-[#464F62] hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>
                <Thermometer
                  className="w-6 h-6 mr-1.5"
                  style={{ color: tempColor }}
                />
                <div className="text-right">
                  <span className={`text-xs font-medium block ${isDark ? 'text-white' : 'text-gray-900'}`}>{curTemp}°C</span>
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
                    <span className={`text-xs font-medium block ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {humidity}%
                    </span>
                    <span className={`text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Humidity</span>
                  </div>
                </div>
              )}

              {/* Motion */}
              <div
                className={`flex items-center justify-center w-20 h-16 p-2 rounded-lg transition ${isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-300'}`}
                style={{ color: motionActive ? "#22C55E" : isDark ? "#9CA3AF" : "#6B7280", backgroundColor: isDark ? "#464F62" : "#E5E7EB" }}
              >
                <User className="w-6 h-6 mr-1.5" />
                <div className="text-center">
                  <span className={`text-xs font-medium block ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                baseline={`${getBaselineValue(powerSavingResponse, 'power', timeframe).toFixed(2)} kWh`}
                saved={`${getSavedValue(powerSavingResponse, 'power').toFixed(2)} kWh`}
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




       <div className={`lg:col-span-2 p-6 rounded-xl space-y-6 ${isDark ? 'bg-[#11172A]' : 'bg-white border border-gray-200'}`}>
  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center gap-2">
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Temperature Trend</h3>
      <button
        aria-label="Show temperature analysis"
        className="ml-2 p-1 rounded-full border border-transparent hover:border-blue-400 bg-transparent text-gray-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => setShowTemperatureStuckModal(true)}
        style={{ fontSize: 20, marginLeft: 8 }}
        title="Show temperature stuck analysis with relay ON/OFF counts"
      >
        <FontAwesomeIcon icon="info-circle" />
      </button>
    </div>
  </div>

  {/* Temperature Stuck Analysis Modal */}
  {showTemperatureStuckModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto ${isDark ? 'bg-[#1F2537] text-white' : 'bg-white text-gray-900'}`}>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Temperature Stuck Analysis</h4>
          <button onClick={() => setShowTemperatureStuckModal(false)} className={`text-xl hover:text-red-500 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>&times;</button>
        </div>
        
        {temperatureStuckAnalysis.stuck_periods && temperatureStuckAnalysis.stuck_periods.length > 0 ? (
          <>
            {/* Overall Counts */}
            <div className="mb-4 flex gap-4 justify-center">
              <div className={`px-4 py-2 rounded-lg text-base font-semibold text-green-400 border border-green-400 ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                ON Count: {temperatureStuckAnalysis.total_on_count}
              </div>
              <div className={`px-4 py-2 rounded-lg text-base font-semibold text-red-400 border border-red-400 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                OFF Count: {temperatureStuckAnalysis.total_off_count}
              </div>
            </div>

            {/* Stuck Periods Details */}
            <div className="space-y-3">
              <h5 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Periods with Stuck Temperature ({temperatureStuckAnalysis.stuck_periods.length}):
              </h5>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {temperatureStuckAnalysis.stuck_periods.map((period, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border ${
                      period.relay_state === 'ON' 
                        ? isDark ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                        : isDark ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-300'
                    }`}
                  >
                    <div className={`flex justify-between items-start mb-2 text-sm`}>
                      <div>
                        <span className={`font-semibold ${period.relay_state === 'ON' ? 'text-green-400' : 'text-red-400'}`}>
                          Relay: {period.relay_state}
                        </span>
                        <span className={`ml-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Temp: {period.temperature}°C
                        </span>
                      </div>
                      <span className={`text-xs font-mono font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {period.duration}h
                      </span>
                    </div>
                    <div className={`mb-2 text-xs space-x-3`}>
                      <span className={`inline-block px-2 py-1 rounded ${period.on_count > 0 ? (isDark ? 'bg-green-700/30 text-green-300' : 'bg-green-100 text-green-700') : (isDark ? 'text-gray-600' : 'text-gray-500')}`}>
                        ON: {period.on_count}h
                      </span>
                      <span className={`inline-block px-2 py-1 rounded ${period.off_count > 0 ? (isDark ? 'bg-red-700/30 text-red-300' : 'bg-red-100 text-red-700') : (isDark ? 'text-gray-600' : 'text-gray-500')}`}>
                        OFF: {period.off_count}h
                      </span>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {period.start} → {period.end}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <p className="text-sm">No temperature stuck periods detected in this timeframe.</p>
          </div>
        )}
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
        <LineChart data={temperatureData} margin={{ top: 20, right: 20, left: 10, bottom:8 }}>
          <CartesianGrid strokeDasharray="4 6" stroke={isDark ? "#374151" : "#E5E7EB"} vertical={false} />
          
          <XAxis
            dataKey="time"
            tick={{ fill: isDark ? '#9CA3AF' : '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (timeframe === 'daily') {
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

       
      </div>

      {/* BASELINE MODAL */}
      {showBaselineModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`p-5 rounded-lg w-full max-w-xs space-y-4 ${isDark ? 'bg-[#1F2537]' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Set Power Baseline
            </h3>
            {modalBaseline !== null && (
              <p className={`text-xs -mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Current:{" "}
                <span className={isDark ? 'text-indigo-300' : 'text-indigo-700'}>{modalBaseline} kWh</span>
              </p>
            )}
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Baseline (kWh)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 12.5"
                value={baselineInput ?? modalBaseline ?? ""}
                onChange={(e) => setBaselineInput(e.target.value)}
                className={`w-full p-2 rounded text-sm border outline-none transition focus:border-indigo-500 ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
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
                className={`px-3 py-1.5 text-xs rounded hover:opacity-80 transition ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-900'}`}
              >
                Cancel
              </button>
              <button
                onClick={setBaselineFn}
                disabled={baselineStatus === "loading"}
                className={`px-3 py-1.5 text-xs rounded font-medium transition ${
                  baselineStatus === "loading"
                    ? isDark ? "bg-gray-500 cursor-not-allowed" : "bg-gray-400 cursor-not-allowed"
                    : isDark ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && settings && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 p-4">
          <div className={`rounded-2xl w-[420px] max-h-[85vh] flex flex-col shadow-xl border ${isDark ? 'bg-[#11172A] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Relay Settings</h2>
              <button
                className={isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}
                onClick={() => setShowSettings(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Settings content remains the same */}
              <div>
                <div className="flex items-center mb-1">
                  <span className={`font-semibold text-[15px] ${isDark ? 'text-white' : 'text-gray-900'}`}>Smart Delay</span>
                </div>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Delay duration in minutes before relay activation
                </p>
                <input
                  type="number"
                  className={`p-2 w-[140px] rounded text-sm focus:ring-2 focus:ring-blue-600 outline-none border ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                  value={settings.SmartDelay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      SmartDelay: Number(e.target.value),
                    })
                  }
                />
              </div>

              {/* Operation Mode Toggle */}
              <div className="flex items-center mb-1">
                <span className={`font-semibold text-[15px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Operation Mode (Recovery of Auto Mode)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {settings.rMan_R === "ON" ? "" : ""}
                </span>
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      rMan_R: settings.rMan_R === "ON" ? "OFF" : "ON",
                    })
                  }
                  className={`relative w-[70px] h-[32px] rounded-full border flex items-center transition-all duration-300 ${isDark ? 'border-[#9EA3AB]' : 'border-gray-400'}`}
                >
                  <span
                    className={`absolute w-full text-xs font-medium transition-all duration-300 ${
                      settings.rMan_R === "ON"
                        ? "text-left pl-2 text-white"
                        : "text-right pr-2 text-[#9EA3AB]"
                    }`}
                  >
                    {settings.rMan_R === "ON" ? "" : ""}
                  </span>
                  <div
                    className="absolute w-[22px] h-[22px] rounded-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        settings.rMan_R === "ON" ? "#22C55E" : "#9EA3AB",
                      transform:
                        settings.rMan_R === "ON"
                          ? "translateX(42px)"
                          : "translateX(5px)",
                    }}
                  />
                </button>
              </div>

              {/* Auto Mode Toggle */}
              <div className="flex items-center mb-1">
                <span className={`font-semibold text-[15px] ${isDark ? 'text-white' : 'text-gray-900'}`}>Auto Mode</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {settings.AUTO_R === "ON" ? "" : ""}
                </span>
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      AUTO_R: settings.AUTO_R === "ON" ? "OFF" : "ON",
                    })
                  }
                  className={`relative w-[70px] h-[32px] rounded-full border flex items-center transition-all duration-300 ${isDark ? 'border-[#9EA3AB]' : 'border-gray-400'}`}
                >
                  <span
                    className={`absolute w-full text-xs font-medium transition-all duration-300 ${
                      settings.AUTO_R === "ON"
                        ? "text-left pl-2 text-white"
                        : "text-right pr-2 text-[#9EA3AB]"
                    }`}
                  >
                    {settings.AUTO_R === "ON" ? "" : ""}
                  </span>
                  <div
                    className="absolute w-[22px] h-[22px] rounded-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        settings.AUTO_R === "ON" ? "#22C55E" : "#9EA3AB",
                      transform:
                        settings.AUTO_R === "ON"
                          ? "translateX(42px)"
                          : "translateX(5px)",
                    }}
                  />
                </button>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <span className={`font-semibold text-[15px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Smart Action
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {settings.SMACTION ? "" : ""}
                  </span>
                  <button
                    onClick={() =>
                      setSettings({ ...settings, SMACTION: !settings.SMACTION })
                    }
                    className={`relative w-[70px] h-[32px] rounded-full border flex items-center transition-all duration-300 ${isDark ? 'border-[#9EA3AB]' : 'border-gray-400'}`}
                  >
                    <span
                      className={`absolute w-full text-xs font-medium transition-all duration-300 ${
                        settings.SMACTION
                          ? "text-left pl-2 text-white"
                          : "text-right pr-2 text-[#9EA3AB]"
                      }`}
                    >
                      {settings.SMACTION === "ON" ? "" : ""}
                    </span>
                    <div
                      className="absolute w-[22px] h-[22px] rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          settings.SMACTION === "ON" ? "#22C55E" : "#9EA3AB",
                        transform:
                          settings.SMACTION === "ON"
                            ? "translateX(42px)"
                            : "translateX(5px)",
                      }}
                    />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <span className={`font-semibold text-[15px] ${isDark ? 'text-white' : 'text-gray-900'}`}>Interval</span>
                </div>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Relay operation interval in minutes
                </p>
                <select
                  className={`p-2 w-[140px] rounded text-sm focus:ring-2 focus:ring-blue-600 outline-none border ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                  value={settings.Interval}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      Interval: Number(e.target.value),
                    })
                  }
                >
                  {intervals.map((int) => (
                    <option key={int} value={int}>
                      {int} min
                    </option>
                  ))}
                </select>
              </div>

              <div className={`p-4 rounded-lg space-y-4 ${isDark ? 'bg-[#1F2537]' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-500 rounded-full" />
                  <h4 className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    Mode Settings
                  </h4>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-xs uppercase ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    MAX (MXT)
                  </span>
                  <input
                    type="number"
                    value={settings.MXT}
                    onChange={(e) =>
                      setSettings({ ...settings, MXT: Number(e.target.value) })
                    }
                    className={`flex-1 p-2 text-sm rounded border ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                    placeholder="30"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-xs uppercase ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    MIN (MNT)
                  </span>
                  <input
                    type="number"
                    value={settings.MNT}
                    onChange={(e) =>
                      setSettings({ ...settings, MNT: Number(e.target.value) })
                    }
                    className={`flex-1 p-2 text-sm rounded border ${isDark ? 'bg-[#11172A] text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                    placeholder="16"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ms"
                    checked={settings.MS === "ON"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
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
                    checked={settings.TS === "ON"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
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
            </div>

            <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${isDark ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'}`}
                onClick={() => setShowSettings(false)}
              >
                CANCEL
              </button>
              <button
                className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition"
                onClick={handleSaveSettings}
              >
                SAVE SETTINGS
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div
          onClick={() => {
            setShowScheduleModal(false);
            navigate(`/neonrelay/${decodedDid}`);
          }}
          className="fixed inset-0 z-50"
        />
      )}
    </div>
  );
};

export default Neonrelay;
