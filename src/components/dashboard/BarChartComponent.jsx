// BarChartComponent.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import "./chart.css";
import { getXAxisProps, getYAxisProps, getTooltipProps, getTickFormatter } from "../../utils/chartFormatting";

const BarChartComponent = ({ 
  timeframe: sharedTimeframe, 
  setTimeframe: setSharedTimeframe, 
  selectedDate: sharedSelectedDate, 
  setSelectedDate: setSharedSelectedDate,
  customStartDate: sharedCustomStartDate,
  setCustomStartDate: setSharedCustomStartDate,
  customEndDate: sharedCustomEndDate,
  setCustomEndDate: setSharedCustomEndDate,
  isDarkMode = true,
}) => {
  const navigate = useNavigate();

  const getPreviousDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  };

  const [timeframe, setTimeframe] = useState(() => sharedTimeframe || "daily");
  const [selectedDate, setSelectedDate] = useState(() => 
    sharedSelectedDate || getPreviousDate()
  );
  const [customStartDate, setCustomStartDate] = useState(() => sharedCustomStartDate || null);
  const [customEndDate, setCustomEndDate] = useState(() => sharedCustomEndDate || null);

  const [powerData, setPowerData] = useState([]);
  const [totalPower, setTotalPower] = useState(0);
  const [loadingPower, setLoadingPower] = useState(false);

  const [alertBarData, setAlertBarData] = useState([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [error, setError] = useState(null);

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const getApiDate = () => {
    try {
      const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      if (isNaN(dateObj.getTime())) {
        // Invalid date, use yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return format(yesterday, "yyyy-MM-dd");
      }
      return format(dateObj, "yyyy-MM-dd");
    } catch (e) {
      console.error("Date format error:", e);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return format(yesterday, "yyyy-MM-dd");
    }
  };

  const formatDisplayDate = () => {
    if (timeframe === "custom") {
      if (!customStartDate || !customEndDate) return "Select Date Range";
      return `${format(customStartDate, "dd/MM/yyyy")} - ${format(customEndDate, "dd/MM/yyyy")}`;
    }
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    if (timeframe === "daily") return `${d}/${m}/${y}`;
    if (timeframe === "yearly") return `${y}`;
    const lastDay = new Date(y, selectedDate.getMonth() + 1, 0).getDate();
    return `01/${m}/${y} - ${String(lastDay).padStart(2, "0")}/${m}/${y}`;
  };

  useEffect(() => {
    if (sharedTimeframe) setTimeframe(sharedTimeframe);
  }, [sharedTimeframe]);

  useEffect(() => {
    if (sharedSelectedDate) setSelectedDate(sharedSelectedDate);
  }, [sharedSelectedDate]);

  useEffect(() => {
    if (sharedCustomStartDate !== undefined) setCustomStartDate(sharedCustomStartDate);
  }, [sharedCustomStartDate]);

  useEffect(() => {
    if (sharedCustomEndDate !== undefined) setCustomEndDate(sharedCustomEndDate);
  }, [sharedCustomEndDate]);

  const handleTimeframeChange = (e) => {
    const value = e.target.value;
    setTimeframe(value);
    if (setSharedTimeframe) setSharedTimeframe(value);
  };

  const handleDateChange = (date) => {
    const newDate = date || new Date();
    setSelectedDate(newDate);
    if (setSharedSelectedDate) setSharedSelectedDate(newDate);
  };

  const handleCustomStartDateChange = (date) => {
    setCustomStartDate(date);
    if (setSharedCustomStartDate) setSharedCustomStartDate(date);
  };

  const handleCustomEndDateChange = (date) => {
    setCustomEndDate(date);
    if (setSharedCustomEndDate) setSharedCustomEndDate(date);
  };

  // FETCH POWER
  useEffect(() => {
    const fetchPower = async () => {
      if (!token) return;
      setLoadingPower(true);
      setError(null);

      // Build API URL with new path parameter structure
      const apiDate = getApiDate();
      let powerUrl, params;

      if (timeframe === "daily") {
        powerUrl = `${API_BASE}/dashboard-power-consumption/daily`;
        params = { date: apiDate };
      } else if (timeframe === "yearly") {
        const year = selectedDate.getFullYear();
        powerUrl = `${API_BASE}/dashboard-power-consumption/yearly`;
        params = { year: year.toString() };
      } else if (timeframe === "custom") {
        if (!customStartDate || !customEndDate) {
          console.error("Custom date range requires both start and end dates");
          setLoadingPower(false);
          return;
        }
        powerUrl = `${API_BASE}/dashboard-power-consumption/custom`;
        params = { 
          start_date: format(customStartDate, "yyyy-MM-dd"),
          end_date: format(customEndDate, "yyyy-MM-dd")
        };
      } else {
        // monthly
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        powerUrl = `${API_BASE}/dashboard-power-consumption/monthly`;
        params = { month: `${year}-${month}` };
      }

      console.log("Power →", powerUrl, "params:", params);

      try {
        const { data } = await axios.get(powerUrl, {
          params,
          headers: { authorization: token }
        });

        const raw = data?.data || [];
        const total = data?.grand_total_consumption || data?.total_power_consumption || 0;
        setTotalPower(total);

        let formatted = [];
        if (timeframe === "daily") {
          // API already groups data by hour - use directly without timezone conversion
          const hourMap = new Map();
          
          raw.forEach((item) => {
            const timestamp = item.period || item.recorded_at;
            if (timestamp) {
              // Extract hour directly from ISO string without timezone conversion
              // "2025-12-10T08:00:00.000Z" -> extract "08"
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const hour = hourMatch[1]; // "08", "09", etc.
                const consumption = Number(item.total_consumption || item.total_power_consumption || 0);
                hourMap.set(hour, consumption);
              }
            }
          });
          
          // Create array for all 24 hours
          formatted = Array.from({ length: 24 }, (_, i) => {
            const hour = i.toString().padStart(2, "0");
            return {
              label: `${hour}:00`,
              kWh: Math.abs(Number((hourMap.get(hour) || 0).toFixed(2))),
            };
          });
        } else if (timeframe === "monthly") {
          // Monthly view - group by day
          const selectedMonth = selectedDate.getMonth() + 1;
          const selectedYear = selectedDate.getFullYear();
          const dayMap = new Map();

          raw.forEach((item) => {
            const timestamp = item.period || item.recorded_at;
            const utc = new Date(timestamp);
            const y = utc.getUTCFullYear();
            const m = utc.getUTCMonth() + 1;
            const d = utc.getUTCDate();
            if (y === selectedYear && m === selectedMonth) {
              const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const consumption = Number(item.total_consumption || item.total_power_consumption || 0);
              dayMap.set(key, (dayMap.get(key) || 0) + consumption);
            }
          });

          const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
          formatted = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const key = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dateObj = new Date(selectedYear, selectedMonth - 1, day);
            return {
              label: format(dateObj, "dd MMM"),
              kWh: Math.abs(Number((dayMap.get(key) || 0).toFixed(2))),
            };
          });
        } else if (timeframe === "yearly") {
          // Yearly view - group by month
          const monthMap = new Map();
          
          raw.forEach((item) => {
            const timestamp = item.period || item.recorded_at;
            const utc = new Date(timestamp);
            const month = utc.getUTCMonth(); // 0-11
            const consumption = Number(item.total_consumption || item.total_power_consumption || 0);
            monthMap.set(month, (monthMap.get(month) || 0) + consumption);
          });

          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          formatted = monthNames.map((name, idx) => ({
            label: name,
            kWh: Math.abs(Number((monthMap.get(idx) || 0).toFixed(2))),
          }));
        } else if (timeframe === "custom") {
          // Custom date range - group by day
          const dayMap = new Map();
          
          raw.forEach((item) => {
            const timestamp = item.period || item.recorded_at;
            const utc = new Date(timestamp);
            const dateKey = format(utc, "yyyy-MM-dd");
            const consumption = Number(item.total_consumption || item.total_power_consumption || 0);
            dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + consumption);
          });

          // Sort by date and format
          formatted = Array.from(dayMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([dateKey, value]) => ({
              label: format(new Date(dateKey), "dd/MM"),
              kWh: Math.abs(Number(value.toFixed(2))),
            }));
        }

        setPowerData(formatted);
      } catch (err) {
        console.error("Power Error:", err.response?.data || err);
        setError("Failed to load power data");
      } finally {
        setLoadingPower(false);
      }
    };

    fetchPower();
  }, [timeframe, selectedDate, customStartDate, customEndDate, token, API_BASE]);

  // FETCH ALERTS
  useEffect(() => {
    const fetchAlerts = async () => {
      if (!token) return;
      setLoadingAlerts(true);
      setError(null);

      const params = new URLSearchParams({ timeframe, date: getApiDate() });
      const url = `${API_BASE}/alerts/statistics?${params}`;
      console.log("Alerts →", url);

      try {
        const { data } = await axios.get(url, { headers: { authorization: token } });

        if (!data.success || !data.data) throw new Error("Invalid response");

        const d = data.data;

        setTotalAlerts(Number(d.total_alerts) || 0);

        const barData = [
          { 
            name: "Alerts", 
            Critical: Number(d.critical_priority) || 0, 
            High: Number(d.high_priority) || 0, 
            Medium: Number(d.medium_priority) || 0 
          }
        ];

        setAlertBarData(barData);

      } catch (err) {
        console.error("Alerts Error:", err.response?.data || err);
        setError("Failed to load alerts data");
        setAlertBarData([]);
        setTotalAlerts(0);
      } finally {
        setLoadingAlerts(false);
      }
    };

    fetchAlerts();
  }, [timeframe, selectedDate, token, API_BASE]);

  const barColor = isDarkMode ? "#8b5cf6" : "#6366F1";

  return (
    <div className="space-y-6">
      {/* POWER CHART */}
      <div
  className={`rounded-xl p-3 border flex flex-col ${
    isDarkMode
      ? "bg-[#0F172B] border-[#1e293b] text-white"
      : "bg-white border-gray-200 text-slate-900"
  }`}
>
  {/* Header */}
  <div className="flex items-center gap-0 mb-2">
    <div
      className={`p-2 rounded-lg ${
        isDarkMode ? "" : ""
      }`}
    >
      <svg
        className="w-5 h-5 text-orange-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {/* Lightning */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </div>

    <h3
      className={`text-lg font-semibold ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}
    >
      Power Consumption
    </h3>
  </div>

  {/* Chart */}
  <div className="flex-1 flex items-center justify-center">
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={powerData}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <CartesianGrid
          stroke={isDarkMode ? "#334155" : "#e5e7eb"}
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="label"
          {...getXAxisProps(timeframe, isDarkMode)}
          tickFormatter={getTickFormatter(timeframe)}
        />
        <YAxis {...getYAxisProps(isDarkMode, "kWh")} />
        <Tooltip {...getTooltipProps(isDarkMode, timeframe, "kWh")} />
        <Bar
          dataKey="kWh"
          fill={barColor}
          radius={[6, 6, 0, 0]}
          animationDuration={1500}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>


      {/* <div className="bg-[#0F172B] p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-4">
            <h3 className="text-white text-sm font-semibold">Alerts</h3>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div> Critical Alerts
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div> High Alerts
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div> Medium Alerts
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400">Total Alerts</span>
            <div className="text-2xl font-bold text-white">{totalAlerts}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={alertBarData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={() => navigate("/alert")}
          >
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" strokeOpacity={0.9} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
              axisLine={false}
            />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0F172B", border: "none", borderRadius: 6, color: "#E6EEF8" }}
              labelStyle={{ color: "#E6EEF8", fontSize: 12 ,fontWeight: 700 }}
              itemStyle={{ color: "#E6EEF8" }}
              formatter={(v) => `${v} alerts`}
            />
            <Bar 
              dataKey="Critical" 
              fill="#ef4444" 
              radius={[6, 6, 0, 0]}
              cursor="pointer"
            />
            <Bar 
              dataKey="High" 
              fill="#eab308" 
              radius={[6, 6, 0, 0]}
              cursor="pointer"
            />
            <Bar 
              dataKey="Medium" 
              fill="#22c55e" 
              radius={[6, 6, 0, 0]}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div> */}
    </div>
  );
};

export default BarChartComponent;