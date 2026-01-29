// Libi.jsx - FINAL VERSION WITH YOUR DESIRED 3-STATE TOGGLE
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import {User} from "lucide-react";
import "./client.css";
import moment from "moment-timezone";
import { useTheme } from "../../context/ThemeContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  ReferenceDot,
  ComposedChart,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faSlidersH } from "@fortawesome/free-solid-svg-icons";
import useAuthFetch from "../hooks/useAuthFetch";
import * as XLSX from "xlsx";

// ────────────────────── ENHANCED CHART HELPER FUNCTIONS ──────────────────────
// Helper to get correct baseline value
const getBaselineValue = (apiResponse, type = 'power', timeframe = 'daily') => {
  if (!apiResponse) return 0;
  
  if (type === 'power') {
    if (timeframe === 'daily') return parseFloat(apiResponse?.baseline?.power_wh ?? 7.17);
    if (timeframe === 'monthly') return parseFloat(apiResponse?.baseline?.power_wh ?? 172);
    if (timeframe === 'yearly') return parseFloat(apiResponse?.baseline?.power_wh ?? 5160);
    return parseFloat(apiResponse?.baseline?.power_wh ?? 172);
  } else if (type === 'carbon') {
    // Use total_carbon_kg from baseline for constant horizontal line
    return parseFloat(apiResponse?.baseline?.total_carbon_kg ?? 3.28);
  }
  return 0;
};

// Helper to get actual consumption value
const getActualValue = (apiResponse, type = 'power') => {
  if (!apiResponse?.actual) return 0;
  
  if (type === 'power') {
    return parseFloat(apiResponse.actual.power_wh ?? 0);
  } else if (type === 'carbon') {
    return parseFloat(apiResponse.actual.carbon_kg ?? 0);
  }
  return 0;
};

// Helper to get saved value
const getSavedValue = (apiResponse, type = 'power') => {
  if (!apiResponse?.savings) return 0;
  
  if (type === 'power') {
    return parseFloat(apiResponse.savings.power_wh ?? 0);
  } else if (type === 'carbon') {
    return parseFloat(apiResponse.savings.carbon_kg ?? 0);
  }
  return 0;
};

// ────────────────────── ENHANCED SUMMARY CARDS ──────────────────────
const SummaryCards = ({ consumption, baseline, saved, active, inactive, unit = 'kWh' }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  
  return (
    <div className="mt-3 space-y-2">
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
              className="font-semibold"
              style={{
                fontSize: '1rem',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                color: item.label === 'Saved' ? (parseFloat(saved) >= 0 ? '#34D399' : '#EF4444') : (isDarkMode ? '#ffffff' : '#111827')
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

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

// ────────────────────── ENHANCED HOURLY USAGE CHART ──────────────────────
const EnhancedHourlyUsage = ({ data = [], timeframe, selectedDate }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  if (!data || data.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hourly Usage</h3>
        <div className={`flex items-center justify-center h-64 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No data available for this period
        </div>
      </div>
    );
  }

  let totalConsumption = 0;
  let peakDemand = 0;
  let peakDateLabel = "";
  let activeTotal = 0;
  let inactiveTotal = 0;

  // Process data
  data.forEach(item => {
    const consumption = parseFloat(item.consumption || item.total || 0);
    totalConsumption += consumption;
    
    if (consumption > peakDemand) {
      peakDemand = consumption;
      peakDateLabel = item.label || item.time;
    }
    
    if (item.active !== undefined) {
      activeTotal += parseFloat(item.active || 0);
      inactiveTotal += parseFloat(item.inactive || 0);
    }
  });

  // Calculate peak window (for daily timeframe)
  let peakWindowText = "N/A";
  if (timeframe === "daily" && peakDateLabel) {
    const peakHour = parseInt(peakDateLabel.split(':')[0]);
    const startHour = peakHour > 0 ? peakHour - 1 : 0;
    const endHour = peakHour < 23 ? peakHour + 1 : 23;
    peakWindowText = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
  }

  return (
    <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white'}`}>
      <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Hourly Usage – {timeframe === "daily" ? moment(selectedDate).format("DD MMM YYYY") : moment(selectedDate).format("MMM YYYY")}
      </h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="#FB923C" strokeDasharray="4 4" strokeOpacity={0.3} />
            
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              angle={timeframe !== "daily" ? -45 : 0}
              textAnchor={timeframe !== "daily" ? "end" : "middle"}
              height={timeframe !== "daily" ? 65 : 50}
            />
            
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: "kWh", angle: -90, position: "insideLeft", style: { fill: "#94a3b8" } }}
            />

            <Tooltip
              contentStyle={{ backgroundColor: isDarkMode ? "#0F172B" : "#FFFFFF", border: `1px solid #FB923C`, borderRadius: 8, color: isDarkMode ? "white" : "black" }}
              formatter={(v) => `${Number(v).toFixed(3)} kWh`}
            />

            <Bar dataKey="consumption" radius={[8, 8, 0, 0]} fill="#FB923C" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3 mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{ background: isDarkMode ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : '#ffffff', border: '1px solid #60A5FA', minHeight: 80 }}>
            <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Maximum Demand</div>
            <div className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{peakDemand.toFixed(3)} kWh</div>
          </div>

          {timeframe === "daily" && (
            <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
              style={{ background: isDarkMode ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : '#ffffff', border: '1px solid #FB923C', minHeight: 80 }}>
              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Peak Window</div>
              <div className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{peakWindowText}</div>
            </div>
          )}

          <div className={`${timeframe === "daily" ? "lg:col-span-1" : "col-span-2"} rounded-lg p-3 flex flex-col items-center justify-center text-center`}
            style={{ background: isDarkMode ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : '#ffffff', border: '1px solid #10B981', minHeight: 80 }}>
            <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Consumption</div>
            <div className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalConsumption.toFixed(3)} kWh</div>
          </div>
        </div>

        {activeTotal > 0 || inactiveTotal > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
              style={{ background: isDarkMode ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : '#ffffff', border: '1px solid #10B981', minHeight: 80 }}>
              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active Hours</div>
              <div className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeTotal.toFixed(3)} kWh</div>
            </div>

            <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
              style={{ background: isDarkMode ? 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))' : '#ffffff', border: '1px solid #9CA3AF', minHeight: 80 }}>
              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Inactive Hours</div>
              <div className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{inactiveTotal.toFixed(3)} kWh</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ────────────────────── ENERGY SAVED CHART ──────────────────────
const EnergySavedChart = ({ data = [], apiResponse = {}, timeframe, selectedDate }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [chartData, setChartData] = useState([]);
  const [summaryData, setSummaryData] = useState({ baseline: 0, used: 0, saved: 0, active: 0, inactive: 0 });

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      setSummaryData({ baseline: 0, used: 0, saved: 0, active: 0, inactive: 0 });
      return;
    }

    // Find the last index with actual consumption data
    let lastNonZeroIndex = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (parseFloat(data[i].used || 0) > 0) {
        lastNonZeroIndex = i;
        break;
      }
    }

    // Only process data up to the last non-zero point
    const dataToShow = lastNonZeroIndex >= 0 ? data.slice(0, lastNonZeroIndex + 1) : [];

    // Apply CUMULATIVE logic for actual consumption
    let cumulativeUsed = 0;

    const processedData = dataToShow.map((item) => {
      const periodUsed = parseFloat(item.used || 0);
      const periodBaseline = parseFloat(item.baseline || 0);
      
      cumulativeUsed += periodUsed;

      return {
        label: item.label,
        used: parseFloat(cumulativeUsed.toFixed(2)), // CUMULATIVE used
        period_used: periodUsed,
        period_baseline: periodBaseline,
      };
    });

    setChartData(processedData);

    // Calculate summary from processed data and API response
    if (processedData.length > 0) {
      const finalUsed = processedData[processedData.length - 1].used;
      
      // Get the appropriate total baseline based on timeframe from API baselines
      let totalBaselineKwh = 4.0; // default daily
      if (timeframe === 'daily') {
        totalBaselineKwh = parseFloat(apiResponse?.baselines?.daily_baseline_kwh || apiResponse?.summary?.baseline_kwh || 4.0);
      } else if (timeframe === 'monthly') {
        totalBaselineKwh = parseFloat(apiResponse?.baselines?.monthly_baseline_kwh || 120.0);
      } else if (timeframe === 'yearly') {
        totalBaselineKwh = parseFloat(apiResponse?.baselines?.yearly_baseline_kwh || 1440.0);
      }
      
      const finalSaved = totalBaselineKwh - finalUsed;
      
      // Get active/inactive hours from API response (already in kWh)
      const activeKwh = parseFloat(apiResponse?.summary?.active_hours || 0);
      const inactiveKwh = parseFloat(apiResponse?.summary?.inactive_hours || 0);
      
      setSummaryData({
        baseline: totalBaselineKwh,
        used: finalUsed,
        saved: finalSaved,
        active: activeKwh,
        inactive: inactiveKwh,
      });
    }
  }, [data, apiResponse, timeframe]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Energy Savings</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          No data available for this period
        </div>
      </div>
    );
  }

  // Get the appropriate total baseline as constant horizontal line based on timeframe
  let constantBaselineKwh = 4.0; // default daily
  if (timeframe === 'daily') {
    constantBaselineKwh = parseFloat(apiResponse?.baselines?.daily_baseline_kwh || apiResponse?.summary?.baseline_kwh || 4.0);
  } else if (timeframe === 'monthly') {
    constantBaselineKwh = parseFloat(apiResponse?.baselines?.monthly_baseline_kwh || 120.0);
  } else if (timeframe === 'yearly') {
    constantBaselineKwh = parseFloat(apiResponse?.baselines?.yearly_baseline_kwh || 1440.0);
  }
  
  const exceededBaseline = summaryData.used > summaryData.baseline;

  return (
    <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Energy Consumption vs Baseline</h3>
        {selectedDate && (
          <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {timeframe === "daily" ? moment(selectedDate).format("MMM DD, YYYY") : moment(selectedDate).format("MMMM YYYY")}
          </span>
        )}
      </div>

      {/* Exceeded baseline warning banner */}
      {exceededBaseline && (
        <div className={`mb-3 p-2 rounded-lg text-sm flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <span className="text-lg">⚠️</span>
          <span>Consumption exceeded baseline</span>
        </div>
      )}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#D1D5DB"} />
            <XAxis 
              dataKey="label" 
              stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} 
              tick={{ fontSize: 11 }} 
              angle={timeframe === "monthly" ? -45 : 0}
              textAnchor={timeframe === "monthly" ? "end" : "middle"}
              height={timeframe === "monthly" ? 60 : 30}
            />
            <YAxis
              stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
              tick={{ fontSize: 11 }}
              label={{ value: "kWh (Cumulative)", angle: -90, position: "insideLeft", style: { fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF", border: `1px solid ${isDarkMode ? "#475569" : "#E5E7EB"}`, borderRadius: "8px", padding: "8px 12px" }}
              formatter={(value, name, props) => {
                const entry = props.payload;
                if (name === "Baseline") {
                  return [`${Number(constantBaselineKwh).toFixed(3)} kWh/period`, name];
                }
                if (name === "Cumulative Consumption") {
                  return [`${Number(value).toFixed(3)} kWh (Period: ${Number(entry.period_used || 0).toFixed(3)} kWh)`, name];
                }
                return [`${Number(value).toFixed(3)} kWh`, name];
              }}
              labelFormatter={(label) => {
                if (timeframe === "daily") return `Hour: ${label}`;
                return `Period: ${label}`;
              }}
            />
            <Legend />

            {/* Fixed Baseline line (dashed blue) - horizontal line at constant baseline */}
            <Line 
              type="monotone" 
              dataKey={() => constantBaselineKwh} 
              stroke="#60A5FA" 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={false} 
              name="Baseline" 
            />
            
            {/* Cumulative Consumption line (solid green) */}
            <Line 
              type="monotone" 
              dataKey="used" 
              stroke="#10B981" 
              strokeWidth={3} 
              dot={{ r: 3 }} 
              name="Cumulative Consumption" 
            />
            
            {/* Red shaded area where cumulative consumption exceeds baseline */}
            {exceededBaseline && (
              <Area
                type="monotone"
                dataKey={(entry) => {
                  const cumulativeBaseline = constantBaselineKwh * (chartData.findIndex(d => d.label === entry.label) + 1);
                  return entry.used > cumulativeBaseline ? entry.used - cumulativeBaseline : 0;
                }}
                fill="#EF4444"
                fillOpacity={0.3}
                stroke="none"
                legendType="none"
                name="Exceeded"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <SummaryCards
        consumption={`${summaryData.used.toFixed(3)} kWh`}
        baseline={`${summaryData.baseline.toFixed(3)} kWh`}
        saved={`${summaryData.saved.toFixed(3)} kWh`}
        active={`${summaryData.active.toFixed(3)} kWh`}
        inactive={`${summaryData.inactive.toFixed(3)} kWh`}
        unit="kWh"
      />
    </div>
  );
};

// ────────────────────── CARBON FOOTPRINT CHART ──────────────────────
const CarbonFootprintChart = ({ data = [], apiResponse = {}, timeframe, selectedDate, loading, error }) => {
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    // Process data based on timeframe with CUMULATIVE logic
    let processedData = [];
    
    if (timeframe === "daily") {
      // Create 24-hour structure
      processedData = Array.from({ length: 24 }, (_, hour) => {
        const hourStr = `${String(hour).padStart(2, '0')}:00`;
        const found = data.find(item => {
          const itemHour = item.label || item.time_bucket || item.time;
          return itemHour && itemHour.includes(hourStr);
        });

        return {
          label: hourStr,
          baseline_carbon_kg: found ? parseFloat(found.baseline_carbon_kg || 0) : 0,
          actual_carbon_kg: found ? parseFloat(found.actual_carbon_kg || 0) : 0,
          carbon_saved_kg: found ? parseFloat(found.carbon_saved_kg || 0) : 0
        };
      });
    } else {
      // For monthly/weekly/yearly, use data as-is
      processedData = data.map(item => ({
        label: item.label || moment(item.time_bucket || item.time).format(timeframe === "monthly" ? "DD MMM" : "MMM YYYY"),
        baseline_carbon_kg: parseFloat(item.baseline_carbon_kg || 0),
        actual_carbon_kg: parseFloat(item.actual_carbon_kg || 0),
        carbon_saved_kg: parseFloat(item.carbon_saved_kg || 0)
      }));
    }

    // Apply CUMULATIVE logic for actual carbon only
    // Baseline will be rendered as FIXED horizontal line from API response
    let cumulativeActual = 0;
    let lastNonZeroIndex = -1;

    // Find the last index with actual data
    for (let i = processedData.length - 1; i >= 0; i--) {
      if (processedData[i].actual_carbon_kg > 0) {
        lastNonZeroIndex = i;
        break;
      }
    }

    // Only process data up to the last non-zero point
    const dataToShow = lastNonZeroIndex >= 0 ? processedData.slice(0, lastNonZeroIndex + 1) : [];

    const cumulativeData = dataToShow.map((item, index) => {
      cumulativeActual += item.actual_carbon_kg;

      return {
        label: item.label,
        actual_carbon_kg: parseFloat(cumulativeActual.toFixed(6)), // CUMULATIVE actual
        // Keep original values for tooltip
        period_actual: item.actual_carbon_kg,
        period_baseline: item.baseline_carbon_kg
      };
    });

    setChartData(cumulativeData);
  }, [data, timeframe]);

  // Calculate totals from the ACTUAL chartData being displayed (not API response)
  // This ensures summary cards match what's shown in the chart
  let totalActual = 0;
  let totalSaved = 0;
  let activeHoursTotal = 0;
  let inactiveHoursTotal = 0;

  if (chartData.length > 0) {
    // Get the final cumulative actual from last data point
    totalActual = chartData[chartData.length - 1].actual_carbon_kg || 0;
    
    // Sum up period actuals for active/inactive and saved
    chartData.forEach((item, index) => {
      const periodActual = parseFloat(item.period_actual || 0);
      
      // For active/inactive, use period values
      if (periodActual > 0) {
        activeHoursTotal += periodActual;
      }
      
      // Calculate saved based on baseline comparison
      const periodBaseline = parseFloat(item.period_baseline || 0);
      totalSaved += Math.max(0, periodBaseline - periodActual);
    });
  }

  // Get baseline from API response (remains fixed)
  const totalBaseline = getBaselineValue(apiResponse, 'carbon', timeframe);

  console.log('Carbon chart values:', {
    totalBaseline,
    totalActual,
    totalSaved,
    activeHoursTotal,
    inactiveHoursTotal,
    chartDataLength: chartData.length,
    timeframe,
  });

  // Calculate if cumulative actual carbon exceeded baseline
  const exceededBaseline = totalActual > totalBaseline;
  const exceedPercentage = totalBaseline > 0 ? 
    Math.abs(((totalActual - totalBaseline) / totalBaseline) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        <div className="flex items-center justify-center h-64">
          <div className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            Loading carbon data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <div className="text-red-400 text-lg mb-2">Error loading carbon data</div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline</h3>
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <div className={`text-lg mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No carbon data available</div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Data will appear when the device is active</div>
          </div>
        </div>
      </div>
    );
  }

  // Get the final cumulative baseline from last data point for reference line
  const finalCumulativeBaseline = chartData.length > 0 ? chartData[chartData.length - 1].baseline_carbon_kg : totalBaseline;

  return (
    <div className={`rounded-xl p-6 shadow-lg relative ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon Footprint vs Baseline (Cumulative)</h3>
        {selectedDate && (
          <span className={`text-sm ml-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {timeframe === "daily" 
              ? moment(selectedDate).format("MMM DD, YYYY")
              : moment(selectedDate).format("MMMM YYYY")}
          </span>
        )}
      </div>

      {/* Exceeded baseline warning banner */}
      {exceededBaseline && (
        <div className={`mb-3 p-2 rounded-lg text-sm flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <span className="text-lg">⚠️</span>
          <span>Carbon footprint exceeded baseline by {exceedPercentage}%</span>
        </div>
      )}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#D1D5DB"} />
            <XAxis
              dataKey="label"
              stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
              angle={timeframe === "monthly" ? -45 : 0}
              textAnchor={timeframe === "monthly" ? "end" : "middle"}
              height={timeframe === "monthly" ? 60 : 30}
            />
            <YAxis
              stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
              tick={{ fontSize: 11 }}
              label={{ 
                value: "kg CO₂ (Cumulative)", 
                angle: -90, 
                position: "insideLeft", 
                style: { fill: isDarkMode ? "#9CA3AF" : "#6B7280", fontSize: 11 } 
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
                border: `1px solid ${isDarkMode ? "#475569" : "#E5E7EB"}`,
                borderRadius: "8px",
                padding: "8px 12px"
              }}
              formatter={(value, name, props) => {
                const entry = props.payload;
                if (name === "Baseline") {
                  return [`${Number(totalBaseline).toFixed(3)} kg`, name];
                }
                if (name === "Cumulative Actual") {
                  return [
                    `${Number(value).toFixed(3)} kg (Period: ${Number(entry.period_actual || 0).toFixed(3)} kg)`,
                    name
                  ];
                }
                return [`${Number(value).toFixed(3)} kg`, name];
              }}
              labelFormatter={(label) => {
                if (timeframe === "daily") return `Hour: ${label}`;
                return `Period: ${label}`;
              }}
            />
            <Legend />

            {/* Fixed Baseline line (dashed blue) - horizontal line at totalBaseline */}
            <Line
              type="monotone"
              dataKey={() => totalBaseline}
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Baseline"
            />

            {/* Cumulative Actual carbon line (solid green) */}
            <Line
              type="monotone"
              dataKey="actual_carbon_kg"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 3 }}
              name="Cumulative Actual"
            />

            {/* Red shaded area where cumulative actual exceeds baseline */}
            {exceededBaseline && (
              <Area
                type="monotone"
                dataKey={(entry) =>
                  entry.actual_carbon_kg > totalBaseline ? entry.actual_carbon_kg - totalBaseline : 0
                }
                fill="#EF4444"
                fillOpacity={0.3}
                stroke="none"
                legendType="none"
                name="Exceeded"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards with actual/baseline/saved values */}
      <SummaryCards
        consumption={`${totalActual.toFixed(2)} kg`}
        baseline={`${totalBaseline.toFixed(2)} kg`}
        saved={`${totalSaved.toFixed(2)} kg`}
        active={`${activeHoursTotal.toFixed(2)} kg`}
        inactive={`${inactiveHoursTotal.toFixed(2)} kg`}
        unit="kg CO₂"
      />
    </div>
  );
};

export default function Libi() {
  const { did } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const decodedDid = did ? decodeURIComponent(did) : null;
  const authFetch = useAuthFetch();

  // ────────────────────────────────────────
  // DEVICE STATE
  // ────────────────────────────────────────
  const [isOn, setIsOn] = useState(true);
  const [outsideAuto, setOutsideAuto] = useState(true);
  const [intensity, setIntensity] = useState(80);
  const [loading, setLoading] = useState(false);
  const [cmdSending, setCmdSending] = useState(false);
  const [libData, setLibData] = useState(null);
  const [responseTopic, setResponseTopic] = useState("");

  // NEW: 3-State Mode (auto / manual-on / manual-off)
  const [mode, setMode] = useState("auto"); // "auto" | "manual-on" | "manual-off"

  // ────────────────────────────────────────
  // SETTINGS MODAL STATE
  // ────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [operationMode, setOperationMode] = useState("OFF");
  const [autoMode, setAutoMode] = useState(false);
  const [relayInterval, setRelayInterval] = useState("5");
  const [motionControl, setMotionControl] = useState("OFF");

  // ────────────────────────────────────────
  // CHARTS STATE (unchanged)
  // ────────────────────────────────────────
  const [timeframe, setTimeframe] = useState("monthly");
  const [powerChartData, setPowerChartData] = useState([]);
  const [phaseTotals, setPhaseTotals] = useState({ R: "0", Y: "0", B: "0" });
  const [totalPower, setTotalPower] = useState("0");
  const [activeInactive, setActiveInactive] = useState({ active: '0.000', inactive: '0.000' });
  const [peakUsage, setPeakUsage] = useState({ time: "", R: 0, Y: 0, B: 0 });
  const [powerLoading, setPowerLoading] = useState(true);

  const [workingHoursTimeframe, setWorkingHoursTimeframe] = useState("daily");
  const [workingHoursData, setWorkingHoursData] = useState([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(true);

  const [carbonTimeframe, setCarbonTimeframe] = useState("monthly");
  const [carbonData, setCarbonData] = useState([]);
  const [carbonResponse, setCarbonResponse] = useState({});
  const [carbonLoading, setCarbonLoading] = useState(true);
  const [carbonError, setCarbonError] = useState(null);

  const [powerSavingTimeframe, setPowerSavingTimeframe] = useState("monthly");
  const [powerSavingData, setPowerSavingData] = useState([]);
  const [powerSavingResponse, setPowerSavingResponse] = useState({});
  const [powerSavingLoading, setPowerSavingLoading] = useState(true);

  // Hide graphs for specific location
  const [hideGraphs, setHideGraphs] = useState(false);

   const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedTimeframe, setSelectedTimeframe] = useState("daily");
  

  // Command tracking and status messages with refs for WebSocket closure access
  const [pendingCommand, setPendingCommand] = useState(null);
  const [commandTimeout, setCommandTimeout] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [messageTimeout, setMessageTimeout] = useState(null);
  
  // Refs for accessing current state in WebSocket handlers
  const pendingCommandRef = useRef(null);
  const commandTimeoutRef = useRef(null);
  
  // Update refs when state changes
  const setPendingCommandWithRef = (value) => {
    setPendingCommand(value);
    pendingCommandRef.current = value;
  };
  
  const setCommandTimeoutWithRef = (value) => {
    setCommandTimeout(value);
    commandTimeoutRef.current = value;
  };


  const motion = Number(libData?.Motion ?? 0);
  const motionActive = motion === 1;
  const [relayOn, setRelayOn] = useState(false); // true only when Relay = 1

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  console.log('🔧 API URL configured:', apiURL);
  const exportLibiReportToExcel = () => {
  if (
    (!powerChartData.length || powerChartData.every(d => d.total === 0)) &&
    (!workingHoursData.length || workingHoursData.every(d => d.consumption === 0)) &&
    (!carbonData.length || carbonData.every(d => d.co2 === 0)) &&
    (!powerSavingData.length || powerSavingData.every(d => d.used === 0))
  ) {
    alert("No data available to export!");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Helper: Add colored header
  const addHeader = (ws, headers, color = "FF22C55E") => {
    const headerRow = headers.map(h => ({
      v: h, t: "s",
      s: { font: { bold: true, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: color } }, alignment: { horizontal: "center" } }
    }));
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
  };

  // 1. Summary Sheet
  const summaryData = [
    ["Device Name", libData?.device_name || "LIB Device"],
    ["Device ID", decodedDid],
    ["Report Generated", moment().tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A")],
    ["Timeframe", selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)],
    ["Selected Date", selectedTimeframe === "daily" ? moment(selectedDate).format("DD MMM YYYY") : "All Time"],
    ["Total Power Consumed", `${totalPower} kWh`],
    ["Total Energy Used", `${workingHoursData.reduce((s, d) => s + d.consumption, 0).toFixed(3)} kWh`],
    ["Total Carbon Footprint", `${carbonData.reduce((s, d) => s + d.co2, 0).toFixed(3)} kg CO₂`],
    ["Total Energy Saved", `${powerSavingData.reduce((s, d) => s + d.used, 0).toFixed(3)} kWh`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  addHeader(wsSummary, ["Metric", "Value"], "FF1E293B");
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // 2. Power Consumption
  if (powerChartData.length) {
    const powerSheet = powerChartData.map(d => ({
      Time: d.time,
      "Power (kWh)": Number(d.originalTotal || d.total).toFixed(6),
    }));
    const ws = XLSX.utils.json_to_sheet(powerSheet);
    addHeader(ws, ["Time", "Power (kWh)"], "FF8B5CF6");
    ws["!cols"] = [{ wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Power Consumption");
  }

  // 3. Hourly Energy Usage
  if (workingHoursData.length) {
    const energySheet = workingHoursData.map(d => ({
      Time: d.time,
      "Energy Used (kWh)": Number(d.originalConsumption || d.consumption).toFixed(6),
      "Active": d.consumption > 0 ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(energySheet);
    addHeader(ws, ["Time", "Energy Used (kWh)", "Active"], "FFFB923C");
    ws["!cols"] = [{ wch: 20 }, { wch: 22 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Energy Usage");
  }

  // 4. Carbon Footprint
  if (carbonData.length) {
    const carbonSheet = carbonData.map(d => ({
      Time: d.time,
      "Carbon (kg CO₂)": Number(d.originalCo2 || d.co2).toFixed(6),
    }));
    const ws = XLSX.utils.json_to_sheet(carbonSheet);
    addHeader(ws, ["Time", "Carbon (kg CO₂)"], "FF10B981");
    ws["!cols"] = [{ wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Carbon Footprint");
  }

  // 5. Energy Saved
  if (powerSavingData.length) {
    const savedSheet = powerSavingData.map(d => ({
      Time: d.time,
      "Energy Saved (kWh)": Number(d.used).toFixed(6),
    }));
    const ws = XLSX.utils.json_to_sheet(savedSheet);
    addHeader(ws, ["Time", "Energy Saved (kWh)"], "FF06B6D4");
    ws["!cols"] = [{ wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Energy Saved");
  }

  const fileName = `${libData?.device_name || "LIB"}_Report_${moment().format("YYYY-MM-DD_HHmm")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

const showStatusMessage = (message, type = "info") => {
    setStatusMessage({ message, type });
    if (messageTimeout) clearTimeout(messageTimeout);
    const timeout = setTimeout(() => {
      setStatusMessage(null);
      setMessageTimeout(null);
    }, 5000);
    setMessageTimeout(timeout);
  };

  // ────────────────────────────────────────
  // SEND COMMAND
  // ────────────────────────────────────────
  const sendControlCommand = async (payload) => {
    // Save current state for potential rollback
    const currentState = {
      relay: libData?.relay ?? (isOn ? 1 : 0),
      manrelay: libData?.manrelay ?? (mode === "manual-on" ? "ON" : "OFF"),
      AUTO_R: libData?.AUTO_R ?? (mode === "auto" ? "ON" : "OFF"),
      manlux: libData?.manlux ?? intensity,
      uiIsOn: isOn,
      uiMode: mode,
      uiIntensity: intensity,
    };

    console.log('🚀 Sending control command:', payload.message);
    console.log('📊 Current state saved for potential rollback:', currentState);

    setPendingCommandWithRef(currentState);

    const timeout = setTimeout(() => {
      console.log('⏰ Device command timeout after 30 seconds, reverting changes');
      console.log('⏰ Timed out command state:', pendingCommandRef.current);
      console.warn("Device command timeout - reverting changes");
      
      // Only revert if this specific command is still pending
      if (pendingCommandRef.current && pendingCommandRef.current === currentState) {
        console.log('⏰ Reverting to previous state');
        showStatusMessage("Device not reachable. Reverting changes...", "error");
        setIsOn(currentState.uiIsOn);
        setMode(currentState.uiMode);
        setIntensity(currentState.uiIntensity);
        setPendingCommandWithRef(null);
        setCommandTimeoutWithRef(null);
      }
    }, 30000); // Increased to 30 seconds

    setCommandTimeoutWithRef(timeout);
    console.log('⏱️ Command timeout set for 30 seconds, timeout ID:', timeout);
    try {
      const topicId = libData?.topic || decodedDid || "lib";
      const responseid = libData?.response || "lib_response";
      payload.response = responseid;
      payload.topic = `${topicId}`;
      
      const fullUrl = `${apiURL}/deviceCommandwithresponse`;
      console.log('🌐 Making API call to:', fullUrl);
      console.log('📦 Final payload:', JSON.stringify(payload, null, 2));
      
      const response = await authFetch({
        url: fullUrl,
        method: "POST",
        data: payload,
        headers: { 
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token") || sessionStorage.getItem("token"),
        },
      });
      
      console.log('✅ API Response received:', response?.status, response?.data);
      
      if (response?.status === 200) {
        console.log("✅ Command sent successfully via API");
        
        // Clear pending command and timeout immediately after successful API response
        console.log('✅ Command API succeeded, clearing loader');
        setPendingCommandWithRef(null);
        if (commandTimeoutRef.current) {
          clearTimeout(commandTimeoutRef.current);
          setCommandTimeoutWithRef(null);
        }
        
        // Send GMRMAIN after a short delay to get latest updates
        setTimeout(async () => {
          try {
            const macid = libData?.MACID ?? libData?.macid;
            if (!macid) {
              console.warn('⚠️ No MACID available for post-command GMRMAIN');
              return;
            }

            console.log('📡 Sending GMRMAIN after command to get updates');
            const gmrallPayload = {
              deviceid: decodedDid,
              topic: `Setting/${macid}`,
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
                // Get the LAST response (most recent) instead of first
                const validResponses = gmrallResponse.data.responses.filter(r => 
                  r.DID || r.RELAY !== undefined || r.MANRELAY !== undefined || r.AUTO_R !== undefined
                );
                deviceData = validResponses.length > 0 ? validResponses[validResponses.length - 1] : null;
                console.log(`📊 Found ${validResponses.length} valid responses, using latest:`, deviceData);
              } else if (gmrallResponse.data.DID || gmrallResponse.data.RELAY !== undefined) {
                deviceData = gmrallResponse.data;
              }
              
              if (deviceData) {
                console.log('🔄 Updating device state with fresh data:', {
                  RELAY: deviceData.RELAY,
                  MANRELAY: deviceData.MANRELAY,
                  AUTO_R: deviceData.AUTO_R,
                });

                // Always update libData first
                setLibData(prev => ({ ...prev, ...deviceData, json_data: { ...prev?.json_data, ...deviceData } }));
                
                // Update relay status (physical relay state)
                if (deviceData.RELAY !== undefined) {
                  const actualRelayOn = deviceData.RELAY === 1 || deviceData.RELAY === "1";
                  setRelayOn(Boolean(actualRelayOn));
                }

                // Calculate mode from device response
                const autoOn = deviceData.AUTO_R === "ON" || deviceData.AUTO_R === true;
                const manOn = deviceData.MANRELAY === "ON" || deviceData.MANRELAY === true;
                
                let deviceMode;
                if (autoOn) deviceMode = "auto";
                else if (manOn) deviceMode = "manual-on";
                else deviceMode = "manual-off";
                
                // Calculate isOn from device response
                const deviceIsOn = deviceData.MANRELAY === "ON" || deviceData.MANRELAY === true;
                
                console.log('📥 GMRMAIN response after command - Device:', { mode: deviceMode, isOn: deviceIsOn, AUTO_R: deviceData.AUTO_R, MANRELAY: deviceData.MANRELAY }, '| UI:', { mode, isOn });
                
                // ALWAYS update to match actual device state from GMRMAIN
                // This ensures UI reflects reality even if command didn't fully process
                setMode(deviceMode);
                setIsOn(deviceIsOn);
                console.log('🔄 UI updated to match device state');
                
                // Show success message
                showStatusMessage("Command executed successfully", "success");
              } else {
                console.warn('⚠️ No device data found in GMRMAIN response');
              }
            }
          } catch (gmrError) {
            console.error('❌ Post-command GMRMAIN failed:', gmrError);
          }
        }, 2000); // Wait 2 seconds for device to process command
      }
      return response;
    } catch (error) {
      console.error("❌ API Error in sendControlCommand:", error);
      console.error("❌ Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      showStatusMessage("Command failed. Reverting changes...", "error");
      setIsOn(currentState.uiIsOn);
      setMode(currentState.uiMode);
      setIntensity(currentState.uiIntensity);
      setPendingCommandWithRef(null);
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        setCommandTimeoutWithRef(null);
      }
      return null;
    }
  };

  const cycleMode = async () => {
  console.log('🔘 cycleMode called, current mode:', mode, 'cmdSending:', cmdSending);
  if (cmdSending) return;
  setCmdSending(true);

  // Save current mode and isOn state for potential rollback
  const previousMode = mode;
  const previousIsOn = isOn;
  
  // Determine payload and target mode
  let payload = {};
  let targetMode = mode;
  let targetIsOn = isOn;
  
  if (mode === "auto") {
    payload = { MANRELAY: "ON", AUTO_R: "OFF" };
    targetMode = "manual-on";
    targetIsOn = true;
  } else if (mode === "manual-on") {
    payload = { MANRELAY: "OFF", AUTO_R: "OFF" };
    targetMode = "manual-off";
    targetIsOn = false;
  } else if (mode === "manual-off") {
    payload = { MANRELAY: "ON", AUTO_R: "OFF" };
    targetMode = "manual-on";
    targetIsOn = true;
  }

  // OPTIMISTIC UPDATE - change UI immediately for smooth UX
  setMode(targetMode);
  setIsOn(targetIsOn);
  console.log('🔘 Optimistic update: mode changed to', targetMode, 'isOn:', targetIsOn);

  console.log('🔘 Calling sendControlCommand with payload:', payload);
  try {
    const response = await sendControlCommand({ message: payload });
    // Revert if response is not successful
    if (response?.status !== 200) {
      console.log('❌ Mode change failed, reverting to:', previousMode);
      setMode(previousMode);
      setIsOn(previousIsOn);
      showStatusMessage("Failed to change mode", "error");
    } else {
      console.log('✅ Mode change confirmed - GMRMAIN will update state');
    }
  } catch (error) {
    console.error('❌ Error in cycleMode:', error);
    setMode(previousMode);
    setIsOn(previousIsOn);
    showStatusMessage("Failed to change mode", "error");
  } finally {
    setCmdSending(false);
    // Don't call fetchData - let GMRMAIN handle the update
  }
};

  // Other controls
  const handleToggleAutoMode = async () => {
    const previousState = autoMode;
    const newState = !autoMode;
    
    // OPTIMISTIC UPDATE
    setAutoMode(newState);
    
    try {
      const response = await sendControlCommand({ message: { AUTO_R: newState ? "ON" : "OFF" } });
      // Revert if response is not successful
      if (response?.status !== 200) {
        console.log('❌ Auto mode change failed, reverting');
        setAutoMode(previousState);
        showStatusMessage("Failed to toggle auto mode", "error");
      } else {
        console.log('✅ Auto mode change confirmed - GMRMAIN will update state');
      }
    } catch (e) {
      console.error('❌ Auto mode change failed:', e);
      setAutoMode(previousState);
      showStatusMessage("Failed to toggle auto mode", "error");
    }
    // Don't call fetchData - let GMRMAIN handle the update
  };

  const handleToggleOutsideAuto = async () => {
    const previousState = outsideAuto;
    const newState = !outsideAuto;
    
    // OPTIMISTIC UPDATE
    setOutsideAuto(newState);
    
    try {
      const response = await sendControlCommand({ message: { OUTSIDE_AUTO: newState ? "ON" : "OFF" } });
      // Revert if response is not successful
      if (response?.status !== 200) {
        console.log('❌ Outside auto change failed, reverting');
        setOutsideAuto(previousState);
        showStatusMessage("Failed to toggle outside auto", "error");
      } else {
        console.log('✅ Outside auto change confirmed - GMRMAIN will update state');
      }
    } catch (e) {
      console.error('❌ Outside auto change failed:', e);
      setOutsideAuto(previousState);
      showStatusMessage("Failed to toggle outside auto", "error");
    }
    // Don't call fetchData - let GMRMAIN handle the update
  };

  const intensityTimerRef = useRef(null);
  const setIntensityAndSend = async (val) => {
    const clamped = Math.max(0, Math.min(100, val));
    const previousIntensity = intensity;
    
    // Optimistically update UI for smooth slider experience
    setIntensity(clamped);
    
    try {
      const response = await sendControlCommand({ message: { INTENSITY: clamped } });
      // If response is not 200, revert to previous value
      if (response?.status !== 200) {
        console.log('❌ Intensity change failed, reverting to:', previousIntensity);
        setIntensity(previousIntensity);
      }
    } catch (e) {
      console.error('❌ Intensity change error:', e);
      setIntensity(previousIntensity);
    }
    
    if (intensityTimerRef.current) clearTimeout(intensityTimerRef.current);
    intensityTimerRef.current = setTimeout(() => {
      fetchData();
      intensityTimerRef.current = null;
    }, 300);
  };

  const saveSettings = async () => {
    if (!libData?.topic && !decodedDid) {
      alert("Device topic not available");
      return;
    }

    const topicId = libData?.topic || decodedDid || "lib";
    const responseId = libData?.response || "lib_response";

    const payload = {
      topic: topicId,
      response: responseId,
      message: {
        rMan_R: operationMode,
        AUTO_R: autoMode ? "ON" : "OFF",
        rManINT_R: Number(relayInterval),
        MS: motionControl,
      },
    };

    try {
      setLoading(true);
      const result = await sendControlCommand(payload);
      if (result) {
        setShowSettings(false);
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const openSettings = async () => {
    try {
      await fetchData();
    } catch (err) {
      console.warn("Failed to refresh before settings", err);
    } finally {
      setShowSettings(true);
    }
  };

  // ────────────────────────────────────────
  // FETCH DATA + MODE DETECTION
  // ────────────────────────────────────────
  const fetchData = async (idParamOrObj) => {
    let rawId = null;
    if (!idParamOrObj) rawId = null;
    else if (typeof idParamOrObj === "string") rawId = idParamOrObj;
    else if (typeof idParamOrObj === "object") rawId = idParamOrObj.topic || idParamOrObj.id || null;

    if (typeof rawId === "string") {
      if (rawId.includes("/")) rawId = rawId.split("/").pop();
      rawId = rawId.trim();
    }

    const id = decodedDid || libData?.did || libData?.DID || libData?.json_data?.DID || rawId;
    if (!id) return;

    setLoading(true);
    try {
      const res = await authFetch({
        url: `${apiURL}/location/lib-data/${id}`,
        method: "GET",
      });
      const data = res?.data;
      setLibData(data || null);
      
      // Extract response topic - check both root level and json_data for MACID
      if (data) {
        const macid = data.MACID ?? data.macid ?? data.json_data?.MACID ?? data.json_data?.macid;
        console.log('🔧 fetchData extracted MACID:', macid, 'from data:', { rootMACID: data.MACID, jsonDataMACID: data.json_data?.MACID });
        if (macid) {
          const resTopicFromData = data.Response ?? data.response ?? data.json_data?.Response ?? `Response/${macid}`;
          console.log('🔧 Setting responseTopic to:', resTopicFromData);
          setResponseTopic(resTopicFromData);
        } else {
          console.warn('⚠️ No MACID found in libData, cannot set responseTopic. Checked data.MACID and data.json_data.MACID');
        }
      }

      if (data) {
        const jd = data?.json_data || {};

        // Is On
        const manrelayOn = (data.MANRELAY === "ON") || (jd.MANRELAY === "ON") || (jd.MANRELAY === true) || (data.manrelay === true);
        setIsOn(Boolean(manrelayOn));

        const actualRelayOn = 
  jd.RELAY === 1 || 
    jd.RELAY === "1" || 
    data.RELAY === 1 || 
    data.RELAY === "1";

setRelayOn(Boolean(actualRelayOn));

        // Auto Mode
        const isAutoMode = (
          data.auto === true || data.auto === "ON" || data.auto_mode === true ||
          jd.AUTO_R === "ON" || jd.AUTO_R === true || jd.AUTO === true
        );
        setAutoMode(Boolean(isAutoMode));

        // Outside Auto
        const outsideBool = (
          data.outside_auto === true || data.outside_auto === "ON" ||
          jd.OUTSIDE_AUTO === "ON" || jd.OUTSIDE_AUTO === true
        );
        setOutsideAuto(Boolean(outsideBool));

        // Settings
        setOperationMode(jd.rMan_R ?? jd.OTM ?? data.rMan_R ?? data.OTM ?? "OFF");
        setRelayInterval(String(jd.rManINT_R ?? data.rManINT_R ?? 5));
        setMotionControl(jd.MS ?? data.MS ?? "OFF");

        // Intensity
        if (typeof jd.INTENSITY !== "undefined") setIntensity(Number(jd.INTENSITY));
        if (typeof data.intensity !== "undefined") setIntensity(Number(data.intensity));

        // CRITICAL: Detect current mode correctly
        if (isAutoMode) {
          setMode("auto");
        } else if (manrelayOn) {
          setMode("manual-on");
        } else {
          setMode("manual-off");
        }
      }
    } catch (err) {
      console.error("Error fetching LIB data:", err);
      setLibData(null);
    } finally {
      setLoading(false);
    }
  };
  
  // ────────────────────────────────────────
  // Check if location name is "CPPLUS WALLSTREET" and hide graphs
  useEffect(() => {
    if (libData) {
      const locationName = libData?.location_name || libData?.locationName || libData?.Location_Name || "";
      if (locationName === "CPPLUS WALLSTREET") {
        console.log('🚫 Location "CPPLUS WALLSTREET" detected - hiding graphs');
        setHideGraphs(true);
      } else {
        setHideGraphs(false);
      }
    }
  }, [libData]);

  // ────────────────────────────────────────
 // Helper function to format very small numbers
const formatSmallNumber = (value) => {
  if (value === 0) return 0;
  if (value < 0.001) {
    return parseFloat(value.toFixed(6)); // More precision for very small numbers
  }
  return parseFloat(value.toFixed(3));
};

// Fetch Power Consumption Data - Enhanced with active/inactive hours from location
const fetchPhasePowerData = async (tf, date) => {
  console.log('⚡ fetchPhasePowerData called with timeframe:', tf, 'date:', date);
  // Check if user org_id includes 149 - if so, don't show any graph data
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('👤 User org_id:', user.org_id);
      if (user.org_id && Array.isArray(user.org_id) && user.org_id.includes(149)) {
        console.log('🚫 Organization ID 149 detected - hiding power graph data');
        setPowerChartData([]);
        setPowerLoading(false);
        setActiveInactive({ active: '0.000', inactive: '0.000' });
        setTotalPower("0");
        return;
      }
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
  }

  setPowerLoading(true);
  try {
    // Use the new lib-power-consumption endpoint
    let url = `${apiURL}/lib-power-consumption/${encodeURIComponent(decodedDid)}/${tf}`;
    if (date && tf === "daily") {
      url += `?date=${date}`;
    }

    console.log(`🔍 Fetching LIB power data: ${url}`);
    const res = await authFetch({ url, method: "GET" });
    console.log('📊 LIB Power API Response:', res);
    
    // Extract data from the response - try multiple possible field names
    const raw = res?.data?.data || res?.data?.hourly_data || [];
    const apiResponse = res?.data || {};
    
    console.log('📊 Extracted raw array:', raw);
    console.log('📊 Raw array length:', Array.isArray(raw) ? raw.length : 0);
    if (Array.isArray(raw) && raw?.length > 0) {
      console.log('📊 First item in raw:', raw[0]);
      console.log('📊 First item keys:', Object.keys(raw[0]));
    }

    let formatted;
    if (tf === "daily") {
      // Create 24-hour structure
      formatted = Array.from({ length: 24 }, (_, hour) => {
        const timeString = `${String(hour).padStart(2, '0')}:00`;
        
        // Find data for this hour by matching the period timestamp
        const hourData = Array.isArray(raw) ? raw.find(item => {
          if (!item) return false;
          try {
            // Handle ISO timestamp format: "2026-01-16T00:00:00.000Z"
            const timestamp = item.period || item.recorded_at || item.timestamp || item.time;
            if (!timestamp) return false;
            const itemHour = new Date(timestamp).getHours();
            return itemHour === hour;
          } catch (e) {
            return false;
          }
        }) : null;

        // Try multiple possible field names for total power
        const total = hourData ? parseFloat(hourData.total_consumption_kwh || hourData.total_power_consumption || hourData.total_consumption || hourData.power || hourData.consumption || 0) : 0;
        const active = hourData ? parseFloat(hourData.active || hourData.active_consumption || hourData.active_hours || 0) : 0;
        const inactive = hourData ? parseFloat(hourData.inactive || hourData.inactive_consumption || hourData.inactive_hours || 0) : 0;

        return {
          time: timeString,
          label: timeString,
          total: parseFloat(total.toFixed(3)),
          consumption: parseFloat(total.toFixed(3)),
          active: parseFloat(active.toFixed(3)),
          inactive: parseFloat(inactive.toFixed(3)),
          R: 0,
          Y: 0,
          B: 0,
          originalTotal: total,
        };
      });
    } else if (tf === "monthly") {
      // For monthly data, show daily breakdown
      formatted = Array.isArray(raw) ? raw.map(item => {
        const date = new Date(item.period || item.recorded_at || item.date);
        const timeLabel = moment(date).format("DD MMM");
        const total = parseFloat(item.total_consumption_kwh || item.total_power_consumption || item.total_consumption || item.power || item.consumption || 0);
        const active = parseFloat(item.active || item.active_consumption || item.active_hours || 0);
        const inactive = parseFloat(item.inactive || item.inactive_consumption || item.inactive_hours || 0);

        return {
          time: moment(date).format("YYYY-MM-DD"),
          label: timeLabel,
          total: parseFloat(total.toFixed(3)),
          consumption: parseFloat(total.toFixed(3)),
          active: parseFloat(active.toFixed(3)),
          inactive: parseFloat(inactive.toFixed(3)),
          R: 0,
          Y: 0,
          B: 0,
          originalTotal: total,
        };
      }) : [];

      // Sort by date
      formatted.sort((a, b) => moment(a.time).valueOf() - moment(b.time).valueOf());
    } else {
      // For weekly and yearly timeframes
      formatted = Array.isArray(raw) ? raw.map(item => {
        let timeLabel = "";
        const date = new Date(item.period || item.recorded_at || item.date);
        if (tf === "weekly") {
          timeLabel = moment(date).format("DD MMM");
        } else if (tf === "yearly") {
          timeLabel = moment(date).format("MMM YYYY");
        }

        const total = parseFloat(item.total_consumption_kwh || item.total_power_consumption || item.total_consumption || item.power || item.consumption || 0);
        const active = parseFloat(item.active || item.active_consumption || item.active_hours || 0);
        const inactive = parseFloat(item.inactive || item.inactive_consumption || item.inactive_hours || 0);

        return {
          time: timeLabel,
          label: timeLabel,
          total: parseFloat(total.toFixed(3)),
          consumption: parseFloat(total.toFixed(3)),
          active: parseFloat(active.toFixed(3)),
          inactive: parseFloat(inactive.toFixed(3)),
          R: 0,
          Y: 0,
          B: 0,
          originalTotal: total,
        };
      }) : [];
    }

    setPowerChartData(formatted);
    // Use top-level total from API response if available, otherwise calculate from data
    const total = apiResponse.total_consumption_kwh 
      ? Number(apiResponse.total_consumption_kwh).toFixed(3)
      : (Array.isArray(formatted) ? formatted.reduce((s, d) => s + (d.originalTotal || 0), 0).toFixed(3) : "0");
    console.log('💰 Total Power Calculated:', total);
    console.log('💰 Total Power from API:', apiResponse.total_consumption_kwh);
    console.log('📈 Formatted Power Data Sample:', Array.isArray(formatted) ? formatted.slice(0, 5) : formatted);
    console.log('📊 Individual totals:', Array.isArray(formatted) ? formatted.map(d => ({ time: d.time, originalTotal: d.originalTotal })) : []);
    setTotalPower(total);

    // Update active/inactive hours from API response
    if (apiResponse.active_inactive) {
      const { active_hours_consumption, inactive_hours_consumption } = apiResponse.active_inactive;
      setActiveInactive({
        active: Number(active_hours_consumption || 0).toFixed(3),
        inactive: Number(inactive_hours_consumption || 0).toFixed(3)
      });
    } else {
      setActiveInactive({ active: '0.000', inactive: '0.000' });
    }

    console.log('✅ LIB Power Data:', formatted);
  } catch (err) {
    console.error("Power fetch error:", err);
    setPowerChartData([]);
    setActiveInactive({ active: '0.000', inactive: '0.000' });
  } finally {
    setPowerLoading(false);
  }
};

// Fetch Carbon Data - Enhanced with neonrelay logic and org access control
const fetchCarbonData = async (tf, date) => {
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
  setCarbonError(null);
  try {
    let url = `${apiURL}/lib-carbon-footprint/${decodedDid}/${tf}`;
    if (tf === "daily") {
      url += `?date=${date}`;
    }

    const res = await authFetch({ url, method: "GET" });
    const raw = res?.data?.data || [];
    const apiResponseData = res?.data || {};
    
    // Store full API response for enhanced chart
    setCarbonResponse(apiResponseData);
    
    console.log('Carbon API Response:', apiResponseData);
    console.log('Carbon Raw Data:', raw);

    let formatted;
    if (tf === "daily") {
      // Create 24-hour structure for daily data
      formatted = Array.from({ length: 24 }, (_, hour) => {
        const hourStr = `${String(hour).padStart(2, '0')}:00`;
        
        // Find data for this hour by matching period timestamp
        const hourData = raw.find(item => {
          if (!item || !item.period) return false;
          try {
            const timestamp = item.period;
            const hourMatch = timestamp.match(/T(\d{2}):/i);
            if (hourMatch) {
              const itemHour = parseInt(hourMatch[1]);
              return itemHour === hour;
            }
            return false;
          } catch (e) {
            return false;
          }
        });

        // Use actual_carbon_kg from API for carbon display
        const baselineCarbonKg = hourData ? parseFloat(hourData.baseline_carbon_kg || 0) : 0;
        const actualCarbonKg = hourData ? parseFloat(hourData.actual_carbon_kg || 0) : 0;
        const savedCarbonKg = hourData ? parseFloat(hourData.carbon_saved_kg || 0) : 0;
        
        // Active hours: 8AM-8PM (hours 8-19)
        const isActiveHour = hour >= 8 && hour < 20;

        return {
          time: hourStr,
          label: hourStr,
          co2: parseFloat(actualCarbonKg.toFixed(6)),
          saved: parseFloat(savedCarbonKg.toFixed(6)),
          actual: parseFloat(actualCarbonKg.toFixed(6)),
          baseline: parseFloat(baselineCarbonKg.toFixed(6)),
          baseline_carbon_kg: parseFloat(baselineCarbonKg.toFixed(6)),
          actual_carbon_kg: parseFloat(actualCarbonKg.toFixed(6)),
          carbon_saved_kg: parseFloat(savedCarbonKg.toFixed(6)),
          active: isActiveHour ? parseFloat(actualCarbonKg.toFixed(6)) : 0,
          inactive: !isActiveHour ? parseFloat(actualCarbonKg.toFixed(6)) : 0,
          originalCo2: actualCarbonKg,
          status: hourData?.status || 'no-data'
        };
      });
      
      console.log('Carbon Formatted Data (daily):', formatted);
      const nonZeroItems = formatted.filter(d => d.actual > 0 || d.saved !== 0);
      console.log('Non-zero carbon items:', nonZeroItems.length);
      console.log('Sample carbon values:', formatted.slice(8, 12).map(d => ({ 
        time: d.time, 
        actual: d.actual, 
        saved: d.saved,
        co2: d.co2
      })));
    } else if (tf === "monthly") {
      // For monthly data, show daily breakdown
      formatted = raw.map(item => {
        const baselineCarbonKg = parseFloat(item.baseline_carbon_kg || baselineData.daily_carbon_kg || 0);
        const actualCarbonKg = parseFloat(item.actual_carbon_kg || item.carbon_footprint_actual || 0);
        const savedCarbonKg = parseFloat(item.carbon_saved_kg || item.carbon_saved || 0);
        const date = new Date(item.period || item.day);
        const label = moment(date).format("DD MMM");

        return {
          time: moment(date).format("YYYY-MM-DD"),
          label: label,
          co2: parseFloat(actualCarbonKg.toFixed(6)),
          saved: parseFloat(savedCarbonKg.toFixed(6)),
          actual: parseFloat(actualCarbonKg.toFixed(6)),
          baseline: parseFloat(baselineCarbonKg.toFixed(6)),
          originalCo2: actualCarbonKg,
          status: item.status || 'no-data'
        };
      });

      // Sort by date
      formatted.sort((a, b) => moment(a.time).valueOf() - moment(b.time).valueOf());
    } else {
      // For weekly and yearly timeframes
      formatted = raw.map(item => {
        const baselineCarbonKg = parseFloat(item.baseline_carbon_kg || baselineData.monthly_carbon_kg || 0);
        const actualCarbonKg = parseFloat(item.actual_carbon_kg || item.carbon_footprint_actual || 0);
        const savedCarbonKg = parseFloat(item.carbon_saved_kg || item.carbon_saved || 0);
        
        let label;
        if (tf === "weekly") {
          label = moment(item.period || item.day).format("DD MMM");
        } else {
          label = moment(item.period || item.day).format("MMM YYYY");
        }

        return {
          time: label,
          label: label,
          co2: parseFloat(actualCarbonKg.toFixed(6)),
          saved: parseFloat(savedCarbonKg.toFixed(6)),
          actual: parseFloat(actualCarbonKg.toFixed(6)),
          baseline: parseFloat(baselineCarbonKg.toFixed(6)),
          originalCo2: actualCarbonKg,
          status: item.status || 'no-data'
        };
      });
    }

    console.log('Setting carbonData state with:', formatted.length, 'items');
    console.log('First non-zero item:', formatted.find(d => d.actual > 0));
    setCarbonData(formatted);
  } catch (err) {
    console.error("Carbon footprint error:", err);
    setCarbonData([]);
    setCarbonResponse({});
    setCarbonError(err.message || "Failed to load carbon data");
  } finally {
    setCarbonLoading(false);
  }
};
// Fetch Working Hours Data - Enhanced with neonrelay logic and org access control
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
    let url = `${apiURL}/lib-get-working-hours/${decodedDid}/${tf}`;
    if (tf === "daily") {
      url += `?date=${date}`;
    }

    const res = await authFetch({ url, method: "GET" });
    const raw = res?.data?.data || [];

    let formatted;
    if (tf === "daily") {
      // Create 24-hour structure for daily data with active/inactive breakdown
      formatted = Array.from({ length: 24 }, (_, hour) => {
        const timeString = `${String(hour).padStart(2, "0")}:00`;

        const hourDataPoints = raw.filter(item => {
          if (!item || !item.period) return false;
          try {
            const timestamp = item.period;
            const hourMatch = timestamp.match(/T(\d{2}):/);
            if (hourMatch) {
              const itemHour = parseInt(hourMatch[1]);
              return itemHour === hour;
            }
            return false;
          } catch {
            return false;
          }
        });

        // Sum all 30-min intervals for this hour (data is in kWh)
        const totalKwh = hourDataPoints.reduce(
          (sum, item) => sum + parseFloat(item.total_consumption_wh || 0),
          0
        );

        // Active hours: 8AM-8PM (hours 8-19)
        const isActiveHour = hour >= 8 && hour < 20;
        const hasConsumption = totalKwh > 0;

        return {
          time: timeString,
          label: timeString,
          active: isActiveHour && hasConsumption ? parseFloat(totalKwh.toFixed(6)) : 0,
          inactive: !isActiveHour && hasConsumption ? parseFloat(totalKwh.toFixed(6)) : 0,
          consumption: parseFloat(totalKwh.toFixed(6)),
          hours: parseFloat((totalKwh / 0.25).toFixed(1)),
          originalConsumption: totalKwh,
        };
      });
    } else if (tf === "monthly") {
      // For monthly data, show daily breakdown
      formatted = raw.map(item => {
        const kwh = parseFloat(item.total_consumption_wh || 0);
        const date = new Date(item.period);
        const label = moment(date).format("DD MMM");
        const isWorking = item.is_working || kwh > 0;

        return {
          time: moment(date).format("YYYY-MM-DD"),
          label: label,
          active: isWorking ? parseFloat(kwh.toFixed(6)) : 0,
          inactive: !isWorking ? parseFloat(kwh.toFixed(6)) : 0,
          consumption: parseFloat(kwh.toFixed(6)),
          originalConsumption: kwh,
        };
      });

      // Sort by date
      formatted.sort((a, b) => moment(a.time).valueOf() - moment(b.time).valueOf());
    } else {
      // For weekly and yearly timeframes
      formatted = raw.map(item => {
        const kwh = parseFloat(item.total_consumption_wh || 0);
        const isWorking = item.is_working || kwh > 0;

        let label;
        if (tf === "weekly") {
          label = moment(item.period).format("DD MMM");
        } else {
          label = moment(item.period).format("MMM YYYY");
        }

        return {
          time: label,
          label: label,
          active: isWorking ? parseFloat(kwh.toFixed(6)) : 0,
          inactive: !isWorking ? parseFloat(kwh.toFixed(6)) : 0,
          consumption: parseFloat(kwh.toFixed(6)),
          originalConsumption: kwh,
        };
      });
    }

    setWorkingHoursData(formatted);
  } catch (err) {
    console.error("Working hours error:", err);
    setWorkingHoursData([]);
  } finally {
    setWorkingHoursLoading(false);
  }
};


const fetchPowerSaving = async (tf, date) => {
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
    // Use the new energy-saving endpoint that returns baseline data
    let url = `${apiURL}/lib-power-saving/${decodedDid}/${tf}`;
    if (tf === "daily") {
      url += `?date=${date}`;
    }

    const res = await authFetch({ url, method: "GET" });
    const raw = res?.data?.data || [];
    const apiResponse = res?.data || {};
    const summaryData = res?.data?.summary || {};
    
    // Store API response for the chart component to access baseline and active/inactive hours
    window.powerSavingApiResponse = apiResponse;

    let formatted;
    if (tf === "daily") {
      // Create 24-hour structure for daily data with actual baseline from API
      formatted = Array.from({ length: 24 }, (_, hour) => {
        const timeString = `${String(hour).padStart(2, '0')}:00`;
        
        // Find data for this hour by matching period timestamp
        const hourData = raw.find(item => {
          if (!item || !item.period) return false;
          try {
            const timestamp = item.period;
            const hourMatch = timestamp.match(/(\d{2}):00:00$/);
            if (hourMatch) {
              const itemHour = parseInt(hourMatch[1]);
              return itemHour === hour;
            }
            return false;
          } catch (e) {
            return false;
          }
        });

        // Map API fields directly - data is already in kWh
        const baselineKwh = hourData ? parseFloat(hourData.baseline_kwh || 0) : 0;
        const usedKwh = hourData ? parseFloat(hourData.consumption_kwh || 0) : 0;
        const savedKwh = hourData ? parseFloat(hourData.saved_kwh || 0) : 0;

        return {
          time: timeString,
          label: timeString,
          baseline: parseFloat(baselineKwh.toFixed(3)),
          used: parseFloat(usedKwh.toFixed(3)),
          saved: parseFloat(savedKwh.toFixed(3)),
          status: hourData?.status || 'no-data'
        };
      });
    } else if (tf === "monthly") {
      // For monthly data, show daily breakdown
      formatted = raw.map(item => {
        const date = new Date(item.period);
        const label = moment(date).format("DD MMM");
        
        const baselineWh = parseFloat(item.baseline_wh || baselineData.daily || 172);
        const baselineKwh = baselineWh / 1000;
        
        const actualWh = parseFloat(item.actual_consumption || 0);
        const actualKwh = actualWh / 1000;
        
        const savedWh = parseFloat(item.energy_saved_wh || 0);
        const savedKwh = savedWh / 1000;

        return {
          time: moment(date).format("YYYY-MM-DD"),
          label: label,
          saved: parseFloat(savedKwh.toFixed(6)),
          used: parseFloat(actualKwh.toFixed(6)),
          baseline: parseFloat(baselineKwh.toFixed(6)),
          total: parseFloat(baselineKwh.toFixed(6)),
          status: item.status || 'no-data'
        };
      });

      // Sort by date
      formatted.sort((a, b) => moment(a.time).valueOf() - moment(b.time).valueOf());
    } else {
      // For weekly and yearly timeframes
      formatted = raw.map(item => {
        let label;
        if (tf === "weekly") {
          label = moment(item.period).format("DD MMM");
        } else {
          label = moment(item.period).format("MMM YYYY");
        }

        const baselineWh = parseFloat(item.baseline_wh || baselineData.monthly || 5160);
        const baselineKwh = baselineWh / 1000;
        
        const actualWh = parseFloat(item.actual_consumption || 0);
        const actualKwh = actualWh / 1000;
        
        const savedWh = parseFloat(item.energy_saved_wh || 0);
        const savedKwh = savedWh / 1000;

        return {
          label: label,
          time: label,
          saved: parseFloat(savedKwh.toFixed(6)),
          used: parseFloat(actualKwh.toFixed(6)),
          baseline: parseFloat(baselineKwh.toFixed(6)),
          total: parseFloat(baselineKwh.toFixed(6)),
          status: item.status || 'no-data'
        };
      });
    }

    setPowerSavingData(formatted);
    setPowerSavingResponse(apiResponse);
  } catch (err) {
    console.error("Power saving fetch error:", err);
    // Fallback: create empty data structure
    let emptyData = [];
    if (tf === "daily") {
      emptyData = Array.from({ length: 24 }, (_, hour) => ({
        time: `${String(hour).padStart(2, '0')}:00`,
        label: `${String(hour).padStart(2, '0')}:00`,
        saved: 0,
        used: 0,
        baseline: 0,
        total: 0,
        status: 'no-data'
      }));
    }
    setPowerSavingData(emptyData);
    setPowerSavingResponse({});
  } finally {
    setPowerSavingLoading(false);
  }
};




  // Periodic GMRMAIN data request every 15 seconds
  useEffect(() => {
    console.log('🔧 GMRMAIN useEffect triggered - decodedDid:', decodedDid, 'responseTopic:', responseTopic);
    if (!decodedDid || !responseTopic) {
      console.warn('⚠️ GMRMAIN useEffect early return - missing decodedDid or responseTopic');
      return;
    }

    console.log('🔄 Starting initial GMRMAIN request for LI-BI device:', decodedDid);

    let retryTimeout = null;
    let gmrAllInterval = null;
    const isMounted = { current: true };
    
    // Start periodic calls function
    const startPeriodicCalls = () => {
      console.log('🚀 startPeriodicCalls invoked - isMounted:', isMounted.current);
      if (!isMounted.current) {
        console.log('⏹️ Component unmounted, not starting periodic calls');
        return;
      }
      
      console.log('⏰ Setting up GMRMAIN interval (15 seconds)');
      gmrAllInterval = setInterval(async () => {
        if (!isMounted.current) {
          console.log('⏹️ Component unmounted, stopping periodic GMRMAIN');
          clearInterval(gmrAllInterval);
          return;
        }
        
        // Skip periodic call if a command is in progress
        if (pendingCommandRef.current) {
          console.log('⏸️ Skipping periodic GMRMAIN - command in progress');
          return;
        }
        
        try {
          console.log('📡 Sending periodic GMRMAIN request (15s interval)');
          const macid = libData?.MACID ?? libData?.macid ?? libData?.json_data?.MACID ?? libData?.json_data?.macid;
          if (!macid) {
            console.warn('⚠️ No MACID available for GMRMAIN. libData:', libData);
            return;
          }
          console.log('✅ Using MACID for periodic GMRMAIN:', macid);

          const gmrAllPayload = {
            deviceid: decodedDid,
            topic: `Setting/${macid}`,
            response: responseTopic,
            message: { SIOT: "GMRMAIN" }
          };
          
          const response = await authFetch({
            url: `${apiURL}/devicecommandwithresponse`,
            method: "POST",
            data: gmrAllPayload,
          });
          
          if (!isMounted.current) {
            console.log('⏹️ Component unmounted during periodic request, skipping state update');
            return;
          }
          
          // Skip update if a command is currently pending or being sent
          if (pendingCommandRef.current || cmdSending) {
            console.log('⏸️ Periodic: Skipping update - command in progress');
            return;
          }
          
          // Process GMRMAIN response to update component state
          if (response?.data) {
            let deviceData = null;
            
            if (response.data.responses && Array.isArray(response.data.responses)) {
              // Get the LAST response (most recent) instead of first
              const validResponses = response.data.responses.filter(r => 
                r.DID || r.RELAY !== undefined || r.MANRELAY !== undefined || r.AUTO_R !== undefined
              );
              deviceData = validResponses.length > 0 ? validResponses[validResponses.length - 1] : null;
              console.log(`📊 Periodic: Found ${validResponses.length} valid responses, using latest`);
            } else if (response.data.DID || response.data.RELAY !== undefined) {
              deviceData = response.data;
            }
            
            if (deviceData) {
              // Always update libData first
              setLibData(prev => ({ ...prev, ...deviceData, json_data: { ...prev?.json_data, ...deviceData } }));
              
              // Update relay status
              if (deviceData.RELAY !== undefined) {
                const actualRelayOn = deviceData.RELAY === 1 || deviceData.RELAY === "1";
                setRelayOn(Boolean(actualRelayOn));
                console.log('🔌 Periodic: Relay status updated:', actualRelayOn);
              }
              
              // Calculate device state
              const autoOn = deviceData.AUTO_R === "ON" || deviceData.AUTO_R === true;
              const manOn = deviceData.MANRELAY === "ON" || deviceData.MANRELAY === true;
              
              let deviceMode;
              if (autoOn) deviceMode = "auto";
              else if (manOn) deviceMode = "manual-on";
              else deviceMode = "manual-off";
              
              const deviceIsOn = deviceData.MANRELAY === "ON" || deviceData.MANRELAY === true;
              
              // Only update if device state differs from UI state
              if (deviceMode !== mode || deviceIsOn !== isOn) {
                console.log('🔄 Periodic: State mismatch detected, updating UI');
                console.log('  Device:', { mode: deviceMode, isOn: deviceIsOn }, '| UI:', { mode, isOn });
                setMode(deviceMode);
                setIsOn(deviceIsOn);
              } else {
                console.log('✅ Periodic: States match, no update needed');
              }
              
              console.log('🔄 Periodic update completed');
            }
          }
        } catch (error) {
          console.error('Periodic GMRMAIN request failed:', error);
        }
      }, 15000); // Every 15 seconds
    };
    
    // Initial call on page entry
    const makeInitialCall = async () => {
      if (!isMounted.current) {
        console.log('⏹️ Component unmounted, skipping initial GMRMAIN request');
        return;
      }
      
      try {
        console.log('📡 Making initial GMRMAIN request');
        const macid = libData?.MACID ?? libData?.macid ?? libData?.json_data?.MACID ?? libData?.json_data?.macid;
        if (!macid) {
          console.warn('⚠️ No MACID available, waiting for fetchData. libData:', libData);
          setTimeout(makeInitialCall, 2000);
          return;
        }
        console.log('✅ Using MACID for initial GMRMAIN:', macid);

        const gmrAllPayload = {
          deviceid: decodedDid,
          topic: `Setting/${macid}`,
          response: responseTopic,
          message: { SIOT: "GMRMAIN" }
        };
        
        const response = await authFetch({
          url: `${apiURL}/devicecommandwithresponse`,
          method: "POST",
          data: gmrAllPayload,
        });
        
        if (!isMounted.current) {
          console.log('⏹️ Component unmounted during initial request, aborting');
          return;
        }
        
        // Process GMRMAIN response
        if (response?.data) {
          console.log('📥 Full GMRMAIN response:', response.data);
          
          let deviceData = null;
          
          if (response.data.responses && Array.isArray(response.data.responses)) {
            // Get the LAST response (most recent) instead of first
            const validResponses = response.data.responses.filter(r => 
              r.DID || r.RELAY !== undefined || r.MANRELAY !== undefined || r.AUTO_R !== undefined
            );
            deviceData = validResponses.length > 0 ? validResponses[validResponses.length - 1] : null;
            console.log(`📊 Initial: Found ${validResponses.length} valid responses, using latest`);
          } else if (response.data.DID || response.data.RELAY !== undefined) {
            deviceData = response.data;
          }
          
          if (deviceData && deviceData.DID) {
            console.log('📥 Initial GMRMAIN response received, updating LI-BI state:', deviceData);
            
            // Always update libData first
            setLibData(prev => ({ ...prev, ...deviceData, json_data: { ...prev?.json_data, ...deviceData } }));
            
            // Update relay status
            if (deviceData.RELAY !== undefined) {
              const actualRelayOn = deviceData.RELAY === 1 || deviceData.RELAY === "1";
              setRelayOn(Boolean(actualRelayOn));
              console.log('🔌 Relay status updated:', actualRelayOn);
            }
            
            // Calculate device state
            const autoOn = deviceData.AUTO_R === "ON" || deviceData.AUTO_R === true;
            const manOn = deviceData.MANRELAY === "ON" || deviceData.MANRELAY === true;
            
            let deviceMode;
            if (autoOn) deviceMode = "auto";
            else if (manOn) deviceMode = "manual-on";
            else deviceMode = "manual-off";
            
            const deviceIsOn = deviceData.MANRELAY === "ON" || deviceData.MANRELAY === true;
            
            // Only update if device state differs from UI state (or if it's truly initial load)
            if (deviceMode !== mode || deviceIsOn !== isOn) {
              console.log('🔄 Initial: Updating UI state');
              console.log('  Device:', { mode: deviceMode, isOn: deviceIsOn }, '| UI:', { mode, isOn });
              setMode(deviceMode);
              setIsOn(deviceIsOn);
            } else {
              console.log('✅ Initial: States already match');
            }
            
            console.log('✅ Starting periodic GMRMAIN requests after valid response');
            startPeriodicCalls();
          } else {
            console.log('❌ No valid device data found in GMRMAIN response for device:', decodedDid);
            if (isMounted.current) {
              retryTimeout = setTimeout(makeInitialCall, 15000);
            }
          }
        } else {
          console.log('❌ No data in GMRMAIN response - retrying');
          if (isMounted.current) {
            retryTimeout = setTimeout(makeInitialCall, 15000);
          }
        }
        
      } catch (error) {
        console.error('❌ Initial GMRMAIN request failed:', error);
        if (isMounted.current) {
          retryTimeout = setTimeout(makeInitialCall, 15000);
        }
      }
    };
    
    // Wait for libData to be fetched first, then start GMRMAIN
    const availableMacid = libData?.MACID || libData?.macid || libData?.json_data?.MACID || libData?.json_data?.macid;
    if (availableMacid) {
      console.log('✅ libData has MACID, calling makeInitialCall:', availableMacid);
      makeInitialCall();
    } else {
      console.warn('⚠️ No MACID in libData yet, GMRMAIN will wait. libData:', libData);
    }
    
    // Cleanup function
    return () => {
      console.log('🛑 Stopping GMRMAIN requests for device:', decodedDid);
      isMounted.current = false;
      if (gmrAllInterval) {
        clearInterval(gmrAllInterval);
        gmrAllInterval = null;
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    };
  }, [decodedDid, responseTopic, libData?.MACID, libData?.macid]);

   useEffect(() => {
    console.log('📊 fetchData useEffect triggered - decodedDid:', decodedDid);
    if (!decodedDid) {
      console.warn('⚠️ No decodedDid, skipping fetchData');
      return;
    }
    // Only perform initial data fetch - no polling intervals for real-time data
    console.log('🔄 Calling fetchData...');
    fetchData();
    return () => {
      if (commandTimeout) clearTimeout(commandTimeout);
      if (messageTimeout) clearTimeout(messageTimeout);
    };
  }, [decodedDid, showSettings, pendingCommand]);

  useEffect(() => {
    if (!decodedDid) return;
    fetchPhasePowerData(selectedTimeframe, selectedDate);
    fetchWorkingHours(selectedTimeframe, selectedDate);
    fetchCarbonData(selectedTimeframe, selectedDate);
    fetchPowerSaving(selectedTimeframe, selectedDate);
  }, [selectedTimeframe, selectedDate, decodedDid]);

  // ────────────────────────────────────────
  // UI HELPERS
  // ────────────────────────────────────────
  const bulbGlow = {
    filter: isOn
      ? `drop-shadow(0 0 ${Math.max(6, intensity / 12)}px rgba(251,191,36,0.7))`
      : "none",
    transform: isOn ? `scale(${1 + intensity / 600})` : "scale(0.98)",
    transition: "all 300ms ease",
  };

  const lastTime = libData?.json_data?.TIME || libData?.created_at;
let isOnline = false;

if (lastTime) {
  try {
    let parsed = null;
    if (typeof lastTime === "string" && lastTime.includes(",")) {
      // Format: HH:mm:ss,YYYY-MM-DD
      parsed = moment.tz(lastTime, "HH:mm:ss,YYYY-MM-DD", "Asia/Kolkata");
    } else {
      parsed = moment.tz(lastTime, "UTC").tz("Asia/Kolkata");
    }

    if (parsed && parsed.isValid()) {
      // Online if last update within 2 minutes
      isOnline = moment().tz("Asia/Kolkata").diff(parsed, "minutes") <= 2;
    }
  } catch (e) {
    isOnline = false;
  }
}

  
  // Helper: Get X-axis ticks based on timeframe
  const getXAxisTicks = (data, timeframe) => {
    if (timeframe === "daily") {
      return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    }
    return data.map(item => item.time);
  };

  // Helper: Format X-axis labels
  const formatXAxisLabel = (value, timeframe) => {
    if (timeframe === "daily") {
      const hour = parseInt(value.split(':')[0]);
      return hour % 3 === 0 ? value : '';
    }
    return value;
  };

  // ────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────
  return (
    <div className={`p-6 min-h-screen space-y-6 relative ${isDarkMode ? 'bg-[#0a0f1c] text-white' : 'bg-white text-gray-900'}`}>
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
              : "bg-blue-600 text-white"
          }`}
        >
          <span>{statusMessage.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{libData?.device_name ?? "Lighting Device"}</h2>
        <div className={`text-sm flex items-center gap-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
            <span className={isOnline ? "text-green-400" : "text-red-400"}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
           <div className="text-xs">
        Last Data:{" "}
        <span className="text-blue-400 font-medium">
  {libData?.json_data?.TIME
    ? moment(libData.json_data.TIME, "HH:mm:ss,YYYY-MM-DD").tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm:ss A")
    : "Never"}
</span>

      </div>
      {/* DOWNLOAD REPORT BUTTON */}
    <button
      onClick={exportLibiReportToExcel}
      className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-xl transition-all transform hover:scale-105 active:scale-100"
      title="Download Full Analytics Report (Excel)"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="hidden sm:inline">Download Report</span>
    </button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* CONTROL CARD */}
        <div className={`lg:col-span-2 p-6 rounded-xl flex flex-col ${isDarkMode ? 'bg-[#11172A]' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Light (LED)</h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Outside lights off automatically on sunrise
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openSettings}
                className={`px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-[#1F3C48] hover:bg-[#2a4d5a]' : 'bg-green-600 hover:bg-green-700'}`}
              >
                <FontAwesomeIcon icon={faSlidersH} className="w-4 h-4 text-white" />
                
              </button>
              <button
                onClick={() => {
                  console.log('📅 Opening LIB schedule manager - libData:', libData);
                  console.log('📅 Schedule array:', libData?.Schedule || libData?.json_data?.Schedule);
                  const topic = libData?.topic || decodedDid || "lib";
                  const response = libData?.response || "response";
                  const deviceType = "Relay";
                  const schedules = libData?.Schedule || libData?.json_data?.Schedule || [];
                  console.log('📅 Passing schedules to manager:', schedules);
                  navigate("/lib/device/schedule", { state: { topic, response, deviceType, scheduleData: schedules } });
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}
                title="Set Schedule"
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

        <div className="flex flex-col items-center w-full mt-10 relative">
  {/* MAIN CONTENT CONTAINER */}
  <div className="flex items-start justify-between w-full max-w-4xl px-6">
    
    {/* LIGHT IMAGE - Only glows when relayOn is true */}
<div className="relative w-[400px] flex items-center justify-center">
  {/* Main Tube Light Image */}
  <img
    src="../src/assets/img/Light PNG.png"
    alt="Tube Light"
    className={`w-full drop-shadow-2xl transition-all duration-500 ${
      relayOn 
        ? "opacity-100 brightness-110" 
        : "opacity-30 grayscale brightness-75"
    }`}
    style={{
    // In your light image style:
transform: relayOn ? "scale(1)" : "scale(0.97)",  // almost no size change
// And keep only glow in drop-shadow based on intensity
filter: relayOn
  
  }}
  />

  {/* GLOW EFFECTS - Only render when relayOn is true */}
  {relayOn && (
    <>
      {/* Main White Glow Spread */}
      <div
        className="absolute top-full w-full h-32 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center,
            rgba(255, 255, 255, ${Math.min(0.9, intensity / 100)}) 0%,
            rgba(255, 255, 255, 0.5) 30%,
            rgba(255, 255, 255, 0.2) 60%,
            transparent 90%
          )`,
          filter: "blur(30px)",
          transform: "scaleY(0.6) translateY(-20px)",
        }}
      />

      {/* Blue Ambient Glow */}
     <div
        className="absolute top-full w-full h-44 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center,
            rgba(100, 200, 255, ${intensity / 140}) 5%,
            rgba(80, 180, 255, 0.3) 40%,
            transparent 80%
          )`,
          filter: "blur(50px)",
          transform: "scaleY(0.5) translateY(-40px) scaleX(1.3)",
        }}
      />
    </>
  )}
</div>

    {/* RIGHT SIDE CONTAINER - Compact Auto Button + Motion */}
    <div className={`flex flex-col items-center gap-4 mt-16 p-4 rounded-xl border backdrop-blur-sm min-w-[140px] ${isDarkMode ? 'border-gray-600/50 bg-gray-900/40' : 'border-gray-200 bg-white shadow-sm'}`}>
      
      {/* AUTO/MANUAL TOGGLE BUTTON - Compact */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-medium text-gray-400 mb-2 tracking-wide">MODE</span>
        {mode === "auto" ? (
          <button
            onClick={async () => {
              console.log('🔘 AUTO button clicked - switching to manual-on');
              if (cmdSending) return;
              setCmdSending(true);
              
              const previousMode = mode;
              const previousIsOn = isOn;
              
              // OPTIMISTIC UPDATE - change UI immediately
              setMode("manual-on");
              setIsOn(true);
              
              try {
                const response = await sendControlCommand({ message: { MANRELAY: "ON", AUTO_R: "OFF" } });
                // Revert if response is not successful
                if (response?.status !== 200) {
                  console.log('❌ Mode change failed, reverting to:', previousMode);
                  setMode(previousMode);
                  setIsOn(previousIsOn);
                  showStatusMessage("Failed to change mode", "error");
                } else {
                  console.log('✅ Mode changed to manual-on');
                }
              } catch (error) {
                console.error('❌ Mode change failed:', error);
                setMode(previousMode);
                setIsOn(previousIsOn);
                showStatusMessage("Failed to change mode", "error");
              } finally {
                setCmdSending(false);
              }
            }}
            disabled={cmdSending}
            className="relative w-12 h-6 rounded-full bg-gradient-to-r from-green-600 to-emerald-600
                       border border-green-400 flex items-center justify-center
                       hover:from-green-500 hover:to-emerald-500 active:scale-95
                       transition-all duration-300 shadow-lg shadow-green-500/50
                       disabled:opacity-50"
          >
            <span className="text-[9px] font-bold text-white tracking-widest">AUTO</span>
          </button>
        ) : (
          <button
            onClick={cycleMode}
            disabled={cmdSending}
            className={`
              relative w-12 h-6 rounded-full border flex items-center overflow-hidden
              transition-all duration-300 cursor-pointer select-none
              ${mode === "manual-on"
                ? "bg-[#D2DE07]/40 border-[#D2DE07] shadow-lg shadow-[#D2DE07]/60"
                : "bg-[#2D3748]/80 border-[#9EA3B8]"
              }
              ${cmdSending ? "opacity-50 cursor-wait" : "hover:scale-105 active:scale-95"}
            `}
          >
            <div
              className="absolute w-4 h-4 rounded-full shadow-lg transition-all duration-300"
              style={{
                backgroundColor: mode === "manual-on" ? "#D2DE07" : "#94A3B8",
                transform: mode === "manual-on" ? "translateX(26px)" : "translateX(3px)",
                boxShadow: mode === "manual-on" ? "0 0 15px #D2DE07, 0 0 25px #D2DE07" : "none",
              }}
            />
            <span
              className={`absolute text-[9px] font-bold z-10 pointer-events-none
                ${mode === "manual-on" ? "left-2 text-black" : "right-2 text-gray-400"}`}
            >
              {mode === "manual-on" ? "ON" : "OFF"}
            </span>
          </button>
        )}
        <span
          className={`text-[9px] font-bold tracking-widest mt-1
            ${mode === "auto" ? "text-green-500" : mode === "manual-on" ? "text-yellow-400" : "text-red-500"}`}
        >
          {mode === "auto" ? "AUTO" : mode === "manual-on" ? "MANUAL" : "MANUAL"}
        </span>
      </div>

      {/* MOTION INDICATOR - Compact */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-medium text-gray-400 mb-2 tracking-wide">MOTION</span>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
          style={{
            backgroundColor: motionActive
              ? (isDarkMode ? "rgba(34, 197, 94, 0.15)" : "rgba(34,197,94,0.12)")
              : (isDarkMode ? "rgba(71, 85, 105, 0.15)" : "rgba(148,163,184,0.12)"),
            borderColor: motionActive ? "#22C55E" : (isDarkMode ? "#475569" : "#cbd5e1"),
          }}
        >
          <User className={`w-4 h-4 ${motionActive ? "text-green-400" : isDarkMode ? "text-gray-500" : "text-gray-500"}`} />
          <span className={motionActive ? "text-green-400" : isDarkMode ? "text-gray-400" : "text-gray-600"}>
            {motionActive ? "Motion" : "No motion"}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div className="w-full max-w-2xl mx-auto px-10 mt-6">
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
    {/* Intensity Slider */}
    <div className="flex items-center gap-4 flex-1 min-w-10">
      <div className="relative flex-1 max-w-xs h-6 flex items-center">
        {/* Ultra Thin Dark Track */}
        <div className={`absolute inset-x-0 h-4 rounded-full border ${isDarkMode ? 'bg-[#0f172a]/80 border-[#1e293b]' : 'bg-gray-200 border-gray-300'}`} />
        
        {/* Glowing Fill */}
        <div
          className="absolute left-0 h-4 rounded-full transition-all duration-500 ease-out overflow-hidden"
          style={{
            width: `${intensity}%`,
            background: "linear-gradient(to right, #ffffffff, #ffffffff, #4e5eebff)",
            boxShadow: "0 0 6px rgba(78, 94, 235, 0.5)"
          }}
        />
        
        {/* Small Thumb */}
        <div
          className="absolute w-6 h-6 rounded-full bg-white border-2 border-cyan-400 shadow-md pointer-events-none z-10 transition-all duration-200"
          style={{
            left: `calc(${intensity}% - 12px)`, // centered: half of 24px thumb
            boxShadow: "0 0 12px rgba(34, 211, 238, 0.8)"
          }}
        />

        {/* Full-Width Invisible Clickable Overlay (Key Fix!) */}
        <div className="absolute inset-0 cursor-pointer z-30" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = Math.round((x / rect.width) * 100);
          setIntensityAndSend(percentage);
        }} />

        {/* Hidden Native Range Input (for accessibility + mobile + keyboard) */}
        <input
          type="range"
          min="0"
          max="100"
          value={intensity}
          onChange={(e) => setIntensityAndSend(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-40"
          style={{ cursor: 'pointer' }}
        />
      </div>
      
      {/* Percentage */}
      <span className={`text-lg font-bold tabular-nums min-w-[55px] text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {intensity}%
      </span>
    </div>
  </div>
</div>
</div>
        </div>
        {/* POWER CONSUMPTION */}
<div className={`lg:col-span-2 p-6 rounded-xl space-y-6 ${isDarkMode ? 'bg-[#11172A]' : 'bg-gray-50 border border-gray-200'}`}>
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Power Consumption</h3>
      {selectedTimeframe === "daily" && (
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
          {moment(selectedDate).format("dddd, DD MMMM YYYY")}
        </p>
      )}
    </div>

    <div className="flex items-center gap-3">
      {(selectedTimeframe === "daily" || selectedTimeframe === "weekly") && (
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={moment().format('YYYY-MM-DD')}
          className="bg-[#1F2937] text-gray-300 text-xs px-4 py-2.5 rounded-lg outline-none cursor-pointer border border-gray-600 focus:border-blue-500 transition-all"
        />
      )}

      <select
        value={selectedTimeframe}
        onChange={(e) => {
          const tf = e.target.value;
          setSelectedTimeframe(tf);
          if (tf === "monthly") setSelectedDate(moment().format("YYYY-MM"));
          if (tf === "yearly") setSelectedDate(moment().format("YYYY"));
        }}
        className="bg-[#1F2937] text-gray-300 text-xs px-4 py-2.5 rounded-lg outline-none cursor-pointer border border-gray-600 focus:border-purple-500 transition-all"
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>
    </div>
  </div>

  {powerLoading ? (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
        <span className="text-gray-300">Loading power data...</span>
      </div>
    </div>
  ) : powerChartData.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-gray-400 text-xl mb-3">No Data Available</div>
      <div className="text-gray-500 text-sm max-w-xs">
        No power consumption recorded for the selected period.
      </div>
    </div>
  ) : (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={powerChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="4 4" stroke="#374151" opacity={0.5} />

          <XAxis
            dataKey="time"
            stroke="#9CA3AF"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            height={30}
            ticks={selectedTimeframe === 'daily' ? 
              Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`) : 
              powerChartData.map(item => item.time)
            }
            tickFormatter={(value) => {
              if (selectedTimeframe === 'daily') {
                const hour = parseInt(value.split(':')[0]);
                return hour % 3 === 0 ? value : '';
              }
              return value;
            }}
          />

          <YAxis
            stroke="#9CA3AF"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(3)} kWh`}
            width={50}
          />

          <Tooltip
  contentStyle={{
    backgroundColor: "#1F2937",
    border: "1px solid #374151",
    borderRadius: "10px",
    padding: "10px",
  }}
  labelStyle={{ color: "#D1D5DB", fontWeight: "bold", fontSize: "13px" }}
  formatter={(value, name) => {
    // Use original value for display to avoid rounding issues
    const dataPoint = powerChartData.find(item => item.total === value);
    const displayValue = dataPoint?.originalTotal || value;
    return [`${parseFloat(displayValue).toFixed(6)} kWh`, name];
  }}
  labelFormatter={(label) => {
    if (selectedTimeframe === "daily") return `Time: ${label}`;
    if (selectedTimeframe === "weekly") return `Week: ${label}`;
    if (selectedTimeframe === "monthly") return `Day: ${label}`;
    if (selectedTimeframe === "yearly") return `Month: ${label}`;
    return label;
  }}
/>

          <Area
            type="monotone"
            dataKey="total"
            stroke="#8B5CF6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTotal)"
            name="Power Consumption"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Card */}
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#0F172B] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
        <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Consumption</div>
        <div className={`font-bold text-2xl tabular-nums ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
          {Number(totalPower).toFixed(3)} kWh
        </div>
      </div>
    </>
  )}
</div>

               {/* ENERGY USAGE */}
        <div className="lg:col-span-2">
          {hideGraphs ? (
            <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg flex flex-col items-center justify-center h-64 text-center">
              <div className="text-gray-400 text-lg mb-2">📊 Graph Access Restricted</div>
              <div className="text-gray-500 text-sm">This location does not have access to view graph data</div>
            </div>
          ) : workingHoursLoading ? (
            <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg flex items-center justify-center h-64">
              <div className="text-white flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                Loading energy data...
              </div>
            </div>
          ) : (
            <EnhancedHourlyUsage 
              data={workingHoursData.map(item => ({
                label: item.time,
                consumption: item.consumption,
                active: item.active,
                inactive: item.inactive
              }))}
              timeframe={selectedTimeframe}
              selectedDate={selectedDate}
            />
          )}
        </div>
 

        {/* CARBON FOOTPRINT */}
        <div className="lg:col-span-2">
          {hideGraphs ? (
            <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg flex flex-col items-center justify-center h-64 text-center">
              <div className="text-gray-400 text-lg mb-2">📊 Graph Access Restricted</div>
              <div className="text-gray-500 text-sm">This location does not have access to view graph data</div>
            </div>
          ) : (
          <CarbonFootprintChart 
            data={carbonData.map(item => ({
              label: item.time,
              baseline_carbon_kg: item.baseline || 0,
              actual_carbon_kg: item.actual || 0,
              carbon_saved_kg: item.saved || 0
            }))}
            apiResponse={carbonResponse}
            timeframe={selectedTimeframe}
            selectedDate={selectedDate}
            loading={carbonLoading}
            error={carbonError}
          />
          )}
        </div>

       {/* POWER SAVINGS */}
        <div className="lg:col-span-2">
          {hideGraphs ? (
            <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg flex flex-col items-center justify-center h-64 text-center">
              <div className="text-gray-400 text-lg mb-2">📊 Graph Access Restricted</div>
              <div className="text-gray-500 text-sm">This location does not have access to view graph data</div>
            </div>
          ) : powerSavingLoading ? (
            <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg flex items-center justify-center h-64">
              <div className="text-white flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
                Loading energy data...
              </div>
            </div>
          ) : (
            <EnergySavedChart 
              data={powerSavingData.map(item => ({
                label: item.time,
                baseline: item.baseline || 0,
                used: item.used || 0,
                saved: item.saved || 0
              }))}
              apiResponse={powerSavingResponse}
              timeframe={selectedTimeframe}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`p-6 rounded-lg w-[460px] max-h-[90vh] overflow-y-auto border shadow-2xl ${isDarkMode ? 'bg-[#1F2537] border-[#374151] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>LIB Settings</h3>

            <div className="space-y-4">
              {/* Operation Mode */}
              <div>
                <label className={`text-sm mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Operation Mode</label>
                <button
                  onClick={() => setOperationMode(prev => prev === "ON" ? "OFF" : "ON")}
                  className={`relative w-[60px] h-[26px] rounded-full border flex items-center transition-all duration-300 ${isDarkMode ? 'border-gray-500' : 'border-gray-300'}`}
                >
                  <div className={`absolute w-[20px] h-[20px] rounded-full transition-all duration-300 ${operationMode === "ON" ? "bg-green-500 translate-x-8" : isDarkMode ? "bg-gray-400 translate-x-1" : "bg-gray-300 translate-x-1"}`} />
                </button>
              </div>

              {/* Auto Mode */}
              <div>
                <label className={`text-sm mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Auto Mode</label>
                <button
                  onClick={() => setAutoMode(prev => !prev)}
                  className={`relative w-[60px] h-[26px] rounded-full border flex items-center transition-all duration-300 ${isDarkMode ? 'border-gray-500' : 'border-gray-300'}`}
                >
                  <div className={`absolute w-[20px] h-[20px] rounded-full transition-all duration-300 ${autoMode ? "bg-green-500 translate-x-8" : isDarkMode ? "bg-gray-400 translate-x-1" : "bg-gray-300 translate-x-1"}`} />
                </button>
              </div>

              {/* Relay Interval */}
              <div>
                <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Relay Interval (Minutes)</label>
                <select
                  value={relayInterval}
                  onChange={(e) => setRelayInterval(e.target.value)}
                  className={`w-full p-2 mt-1 rounded border outline-none transition ${isDarkMode ? 'bg-[#11172A] text-white border-gray-600 focus:border-green-500' : 'bg-white text-gray-900 border-gray-300 focus:border-green-500'}`}
                >
                  {[1, 2, 5, 10, 15, 30].map((v) => (
                    <option key={v} value={v}>{v} min</option>
                  ))}
                </select>
              </div>

              {/* Motion Control */}
              <div>
                <label className={`text-sm mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Motion Control</label>
                <button
                  onClick={() => setMotionControl(prev => prev === "ON" ? "OFF" : "ON")}
                  className={`relative w-[60px] h-[26px] rounded-full border flex items-center transition-all duration-300 ${isDarkMode ? 'border-gray-500' : 'border-gray-300'}`}
                >
                  <div className={`absolute w-[20px] h-[20px] rounded-full transition-all duration-300 ${motionControl === "ON" ? "bg-green-500 translate-x-8" : isDarkMode ? "bg-gray-400 translate-x-1" : "bg-gray-300 translate-x-1"}`} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setShowSettings(false)} className={`px-4 py-2 rounded-lg transition ${isDarkMode ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button onClick={saveSettings} disabled={loading} className={`px-4 py-2 rounded-lg transition font-medium relative ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}