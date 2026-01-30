import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdOutlinePeopleAlt, MdLaptop } from "react-icons/md";
import { CiLocationOn } from "react-icons/ci";
import { IoAlertCircleSharp } from "react-icons/io5";
import { FaMapMarkedAlt, FaListUl } from "react-icons/fa";
import BarChartComponent from "./BarChartComponent";
import GoogleMapComponent from "./GoogleMapComponent";
import EnergySavingsChart from "./EnergySavingsChart";
import Location from "../location/Location";
import DashboardPDFReport from "./DashboardPDFReport";
import ReactEcharts from "echarts-for-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getXAxisProps, getYAxisProps, getTooltipProps, getTickFormatter } from "../../utils/chartFormatting";
import moment from "moment";
import "./dashboard.css";
import "../../assets/styles/common.css";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";




const Dashboard = ({ title }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const getCurrentDate = () => {
    return new Date();
  };

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [carbonTimeframe, setCarbonTimeframe] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [selectedWeek, setSelectedWeek] = useState([null, null]); // [start, end]
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [chartData, setChartData] = useState(null);
  const [deviceCounts, setDeviceCounts] = useState({});
  const [chartLoading, setChartLoading] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [locationView, setLocationView] = useState("map");
  const [showLocationView, setShowLocationView] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [hourlyData, setHourlyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [clientEfficiencyData, setClientEfficiencyData] = useState([]);
  const [showEfficiencyModal, setShowEfficiencyModal] = useState(false);
  

  const [dashboardLocations, setDashboardLocations] = useState([]);
  
  const [efficiencyMonth, setEfficiencyMonth] = useState(() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1); // default = previous month
  return d;
});

const [efficiencyInsightsData, setEfficiencyInsightsData] = useState(null);
const [efficiencyLoading, setEfficiencyLoading] = useState(false);
const [efficiencyError, setEfficiencyError] = useState(null);
const [topLocationsByConsumption, setTopLocationsByConsumption] = useState([]);

const [locationsLoading, setLocationsLoading] = useState(true);
 const [locationCardView, setLocationCardView] = useState("map"); // "map" | "list"
 const dashboardGreenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [18, 30],
  iconAnchor: [9, 30],
});

  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  // 🔥 FIX #3: Auto-set week range when switching to weekly timeframe
useEffect(() => {
  if (carbonTimeframe !== "weekly") return;
  if (!selectedDate) return;

  const d = new Date(selectedDate);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(d);
  monday.setDate(diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  setSelectedWeek([monday, sunday]);
}, [carbonTimeframe]);


  // 1. Token verification
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return navigate("/");
      try {
        await axios.get(`${API_BASE}/dashboard`, {
          headers: { authorization: token },
        });
        setLoading(false);
      } catch {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        navigate("/");
      }
    };
    verifyToken();
  }, [token, API_BASE, navigate]);

  // 2. Dashboard cards
  useEffect(() => {
    if (loading) return;
    const fetchSummary = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/dashboard-cards`, {
          headers: { authorization: token },
        });
        const s = data.summary || {};
        setCards([
          {
            label: "Clients",
            data: s.total_clients ?? "0",
            Icon: MdOutlinePeopleAlt,
            bgColor: "bg-red-100",
            iconColor: "bg-red-500",
          },
          {
            label: "Locations",
            data: s.total_locations ?? "0",
            Icon: CiLocationOn,
            bgColor: "bg-orange-100",
            iconColor: "bg-orange-500",
          },
          {
            label: "Devices",
            data: s.total_devices ?? "0",
            Icon: MdLaptop,
            bgColor: "bg-green-100",
            iconColor: "bg-green-500",
          },
          {
            label: "Online devices",
            data: s.active_devices ?? "0",
            Icon: MdOutlinePeopleAlt,
            bgColor: "bg-purple-100",
            iconColor: "bg-purple-500",
          },
          {
            label: "No. of Alerts",
            data: s.total_alerts ?? "0",
            Icon: IoAlertCircleSharp,
            bgColor: "bg-blue-100",
            iconColor: "bg-blue-500",
          },
        ]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSummary();
  }, [loading, token, API_BASE]);

  // 3. Fetch Carbon & Energy Data
  useEffect(() => {
    if (loading) return;

    const fetchCarbonAndEnergy = async () => {
      setChartLoading(true);
      try {
        let carbonUrl, powerUrl;
        let params = {};

        // Format date properly
        const getFormattedDate = () => {
          try {
            const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
            if (isNaN(dateObj.getTime())) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              return yesterday.toISOString().split("T")[0];
            }
            return dateObj.toISOString().split("T")[0];
          } catch (e) {
            console.error("Date conversion error:", e);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split("T")[0];
          }
        };

        if (carbonTimeframe === "daily") {
          const isoDate = getFormattedDate();
          params = { date: isoDate };
          carbonUrl = `${API_BASE}/dashboard-carbon-footprint/daily`;
          powerUrl = `${API_BASE}/dashboard-power-consumption/daily`;
        } 
        else if (carbonTimeframe === "weekly") {
        if (!selectedWeek[0]) {
        setChartLoading(false);
      return;
  }

  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split("T")[0];
  };

  // ✅ Backend expects ONLY start date of the week
  params = {
    date: formatDate(selectedWeek[0]) // Monday
  };

  carbonUrl = `${API_BASE}/dashboard-carbon-footprint/weekly`;
  powerUrl = `${API_BASE}/dashboard-power-consumption/weekly`;
}
 else if (carbonTimeframe === "yearly") {
          const year = selectedDate instanceof Date 
            ? selectedDate.getFullYear() 
            : new Date().getFullYear();
          params = { year: year.toString() };
          carbonUrl = `${API_BASE}/dashboard-carbon-footprint/yearly`;
          powerUrl = `${API_BASE}/dashboard-power-consumption/yearly`;
        } else if (carbonTimeframe === "custom") {
          // custom date range
          if (!customStartDate || !customEndDate) {
            console.error("Custom date range requires both start and end dates");
            setChartLoading(false);
            return;
          }
          
          // Format dates as YYYY-MM-DD
          const formatDate = (date) => {
            if (!date) return null;
            const d = date instanceof Date ? date : new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          params = { 
            start_date: formatDate(customStartDate),
            end_date: formatDate(customEndDate)
          };
          carbonUrl = `${API_BASE}/dashboard-carbon-footprint/custom`;
          powerUrl = `${API_BASE}/dashboard-power-consumption/custom`;
        } else {
          // monthly
          const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const yearMonth = `${year}-${month}`;
          params = { month: yearMonth };
          carbonUrl = `${API_BASE}/dashboard-carbon-footprint/monthly`;
          powerUrl = `${API_BASE}/dashboard-power-consumption/monthly`;
        }

        console.log("Fetching carbon data from:", carbonUrl, "with params:", params);
        console.log("Fetching power data from:", powerUrl, "with params:", params);

        // Fetch both carbon and power data in parallel
        const [carbonResponse, powerResponse] = await Promise.all([
          axios.get(carbonUrl, {
            params,
            headers: { authorization: token }
          }),
          axios.get(powerUrl, {
            params,
            headers: { authorization: token }
          })
        ]);

        console.log("Carbon API response:", carbonResponse.data);
        console.log("Power API response:", powerResponse.data);

        if (carbonResponse.data.success) {
          let processedData = { ...carbonResponse.data };
          
          // For custom timeframe, calculate baseline if missing
          if (carbonTimeframe === "custom" && carbonResponse.data.detailed_carbon_data) {
            console.log("Processing custom timeframe baseline...");
            
            // Calculate number of days in the range
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
            
            console.log("Days in range:", daysDiff);
            
            // Check if baseline data is missing (all zeros)
            const hasBaseline = carbonResponse.data.detailed_carbon_data.some(
              item => parseFloat(item.baseline_power_kwh || 0) > 0
            );
            
            if (!hasBaseline) {
              console.log("No baseline data in API response, calculating from daily baseline...");
              
              // Get daily baseline from the baseline object if available
              const dailyBaselinePower = parseFloat(carbonResponse.data.baseline?.daily_baseline_kwh || 0);
              const dailyBaselineCarbon = parseFloat(carbonResponse.data.baseline?.daily_baseline_carbon_kg || 0);
              
              console.log("Daily baseline:", { power: dailyBaselinePower, carbon: dailyBaselineCarbon });
              
              if (dailyBaselinePower > 0) {
                // Calculate total baseline for the period
                const totalBaselinePower = dailyBaselinePower * daysDiff;
                const totalBaselineCarbon = dailyBaselineCarbon * daysDiff;
                
                console.log("Calculated total baseline:", { power: totalBaselinePower, carbon: totalBaselineCarbon });
                
                // Distribute baseline across periods
                const periodsCount = carbonResponse.data.detailed_carbon_data.length;
                const baselinePerPeriod = totalBaselinePower / periodsCount;
                const carbonPerPeriod = totalBaselineCarbon / periodsCount;
                
                // Update detailed data with calculated baseline
                processedData.detailed_carbon_data = carbonResponse.data.detailed_carbon_data.map(item => ({
                  ...item,
                  baseline_wh: (baselinePerPeriod * 1000).toFixed(2),
                  baseline_kwh: baselinePerPeriod.toFixed(2),
                  baseline_carbon_kg: carbonPerPeriod.toFixed(2),
                  baseline_power_kwh: baselinePerPeriod.toFixed(2),
                  power_saved_wh: (baselinePerPeriod * 1000 - parseFloat(item.power_consumption_wh || 0)).toFixed(2),
                  carbon_saved_kg: (carbonPerPeriod - parseFloat(item.carbon_emission_kg || 0)).toFixed(2)
                }));
                
                // Update top-level baseline
                processedData.baseline = {
                  ...processedData.baseline,
                  total_baseline_kwh: totalBaselinePower.toFixed(2),
                  baseline_carbon_kg: totalBaselineCarbon.toFixed(2),
                  current_timeframe: {
                    power_kwh: totalBaselinePower.toFixed(2),
                    carbon_kg: totalBaselineCarbon.toFixed(2)
                  }
                };
                
                // Recalculate savings
                const currentPower = parseFloat(processedData.current_consumption?.total_power_kwh || 0);
                const currentCarbon = parseFloat(processedData.current_consumption?.total_carbon_emission?.kg || 0);
                
                processedData.savings = {
                  power_saved_kwh: (totalBaselinePower - currentPower).toFixed(2),
                  power_saved: {
                    kwh: (totalBaselinePower - currentPower).toFixed(2),
                    wh: ((totalBaselinePower - currentPower) * 1000).toFixed(2)
                  },
                  carbon_saved_kg: (totalBaselineCarbon - currentCarbon).toFixed(2),
                  carbon_saved: {
                    kg: (totalBaselineCarbon - currentCarbon).toFixed(2)
                  },
                  power_saving_percentage: totalBaselinePower > 0 
                    ? (((totalBaselinePower - currentPower) / totalBaselinePower) * 100).toFixed(2)
                    : "0.00",
                  carbon_saving_percentage: totalBaselineCarbon > 0
                    ? (((totalBaselineCarbon - currentCarbon) / totalBaselineCarbon) * 100).toFixed(2)
                    : "0.00"
                };
                
                console.log("Updated baseline data:", processedData.baseline);
                console.log("Updated savings:", processedData.savings);
              } else {
                console.warn("No daily baseline available to calculate from");
              }
            }
          }
          
          // Merge power consumption data into carbon data
          const mergedData = {
            ...processedData,
            power_data: powerResponse.data.success ? powerResponse.data : null
          };
          setChartData(mergedData);
          
          // Process hourly data for chart (daily only)
          if (carbonTimeframe === "daily" && carbonResponse.data.detailed_carbon_data) {
            const hourlyChartData = processHourlyData(carbonResponse.data.detailed_carbon_data);
            setHourlyData(hourlyChartData);
            setMonthlyData([]);
            setYearlyData([]);
            console.log("Processed Hourly Data:", hourlyChartData);
          } else if (carbonTimeframe === "monthly" && carbonResponse.data.detailed_carbon_data) {
            const monthlyChartData = processMonthlyData(carbonResponse.data.detailed_carbon_data);
            setMonthlyData(monthlyChartData);
            setHourlyData([]);
            setYearlyData([]);
            console.log("Processed Monthly Data:", monthlyChartData);
          } else if (carbonTimeframe === "yearly" && carbonResponse.data.detailed_carbon_data) {
            const yearlyChartData = processYearlyData(carbonResponse.data.detailed_carbon_data);
            setYearlyData(yearlyChartData);
            setHourlyData([]);
            setMonthlyData([]);
            console.log("Processed Yearly Data:", yearlyChartData);
          } else {
            setHourlyData([]);
            setMonthlyData([]);
            setYearlyData([]);
          }
        } else {
          console.error("API returned success: false");
          setChartData(null);
          setHourlyData([]);
        }
      } catch (error) {
        console.error("Dashboard API error:", error);
        console.error("Error details:", error.response?.data);
        setChartData(null);
        setHourlyData([]);
      } finally {
        setChartLoading(false);
      }
    };

    fetchCarbonAndEnergy();
  }, [loading, carbonTimeframe, selectedDate, selectedWeek, customStartDate, customEndDate, token, API_BASE]);

  // Process hourly data for chart
  const processHourlyData = (detailedData) => {
    if (!Array.isArray(detailedData)) return [];
    
    // Create 24-hour structure
    const hourlyChart = [];
    
    // Initialize all 24 hours
    const hourlyMap = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = {
        hour: h,
        usage_kwh: 0,
        hasData: false
      };
    }
    
    // Fill with actual data (use kWh directly from API)
    detailedData.forEach(item => {
      try {
        const timestamp = item.period || item.recorded_at;
        if (timestamp) {
          // Extract hour directly from ISO string without timezone conversion
          const hourMatch = timestamp.match(/T(\d{2}):/);
          if (!hourMatch) return;
          const hour = parseInt(hourMatch[1]);
          const consumption_kwh = parseFloat(item.power_consumption_kwh) || 0;
          
          if (hourlyMap[hour]) {
            hourlyMap[hour].usage_kwh = consumption_kwh;
            hourlyMap[hour].hasData = true;
          }
        }
      } catch (e) {
        console.error("Error processing hourly data:", e);
      }
    });

    // Convert to array format
    for (let h = 0; h < 24; h++) {
      const hourString = h.toString().padStart(2, '0');
      const dataPoint = hourlyMap[h];
      
      hourlyChart.push({
        hour: hourString,
        displayHour: `${hourString}:00`,
        usage: dataPoint.usage_kwh,
        hasData: dataPoint.hasData
      });
    }

    return hourlyChart;
  };

  // Process monthly data for chart
  const processMonthlyData = (detailedData) => {
    if (!Array.isArray(detailedData)) return [];
    
    const monthlyChart = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    detailedData.forEach(item => {
      try {
        const timestamp = item.period || item.recorded_at;
        if (timestamp) {
          const date = new Date(timestamp);
          const month = date.getMonth();
          const monthName = monthNames[month];
          const consumption_kwh = parseFloat(item.power_consumption_kwh) || 0;
          
          monthlyChart.push({
            month: monthName,
            fullMonth: date.toISOString().substring(0, 7), // YYYY-MM
            usage: consumption_kwh,
            hasData: consumption_kwh > 0
          });
        }
      } catch (e) {
        console.error("Error processing monthly data:", e);
      }
    });

    return monthlyChart;
  };

  // Process yearly data for chart
  const processYearlyData = (detailedData) => {
    if (!Array.isArray(detailedData)) return [];
    
    const yearlyChart = [];
    
    detailedData.forEach(item => {
      try {
        const timestamp = item.period || item.recorded_at;
        if (timestamp) {
          const year = new Date(timestamp).getFullYear();
          const consumption_kwh = parseFloat(item.power_consumption_kwh) || 0;
          
          yearlyChart.push({
            year: year.toString(),
            usage: consumption_kwh,
            hasData: consumption_kwh > 0
          });
        }
      } catch (e) {
        console.error("Error processing yearly data:", e);
      }
    });

    return yearlyChart;
  };

  // 4. Fetch Device Counts
  useEffect(() => {
    if (loading) return;

    const fetchDevices = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/dashboard-devices-list`, {
          headers: { authorization: token },
        });

        if (data.success && data.device_counts) {
          setDeviceCounts(data.device_counts);
        } else {
          setDeviceCounts({});
        }
      } catch (error) {
        console.error("Device list API error:", error);
        setDeviceCounts({});
      }
    };

    fetchDevices();
  }, [loading, token, API_BASE]);

  // 5. Fetch Client Efficiency Data
 useEffect(() => {
  if (!efficiencyMonth || loading) return;

  const fetchEfficiencyInsights = async () => {
    setEfficiencyLoading(true);
    setEfficiencyError(null);

    try {
      const selected = new Date(efficiencyMonth);

      // 🔒 Prevent current/future month
      const maxMonth = new Date();
      maxMonth.setMonth(maxMonth.getMonth() - 1);
      maxMonth.setDate(1);

      if (selected > maxMonth) {
        setEfficiencyMonth(maxMonth);
        return;
      }

      const year = selected.getFullYear();
      const month = String(selected.getMonth() + 1).padStart(2, "0");
      const yearMonth = `${year}-${month}`;

      const url = `${API_BASE}/dashboard-energy-efficiency/monthly`;

      const { data } = await axios.get(url, {
        params: { month: yearMonth },
        headers: { authorization: token },
      });

      if (data && data.success !== false) {
        setEfficiencyInsightsData(data);

        if (Array.isArray(data.client_wise_data)) {
          const locations = [];

          data.client_wise_data.forEach((client) => {
            client.locations?.forEach((loc) => {
              locations.push({
                loc_id: loc.loc_id,
                loc_name: loc.loc_name,
                consumption_kwh: +loc.power_consumption_kwh || 0,
                consumption_wh: +loc.power_consumption_wh || 0,
                carbon_kg: +loc.carbon_emission_kg || 0,
                carbon_tons: +loc.carbon_emission_tons || 0,
                org_id: client.org_id,
              });
            });
          });

          setTopLocationsByConsumption(
            locations
              .sort((a, b) => b.consumption_kwh - a.consumption_kwh)
              .slice(0, 5)
          );
        }
      } else {
        setEfficiencyInsightsData(null);
      }
    } catch (err) {
      console.error("Efficiency API error:", err);
      setEfficiencyError("Failed to load efficiency insights");
      setEfficiencyInsightsData(null);
    } finally {
      setEfficiencyLoading(false);
    }
  };

  fetchEfficiencyInsights();
}, [efficiencyMonth, token, API_BASE, loading]);



  // 6. Fetch Alert Data
  useEffect(() => {
    if (loading) return;

    const fetchAlerts = async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE}/api/notifications/count`,
          {
            headers: { authorization: token },
          }
        );

        console.log("Notifications count API response:", data);

        if (data.success) {
          setAlertData(data);
          console.log("Alert data set from notifications/count:", data);
        } else {
          setAlertData(null);
        }
      } catch (error) {
        console.error("Notifications count API error:", error);
        setAlertData(null);
      }
    };

    fetchAlerts();
  }, [loading, token, API_BASE]);

  useEffect(() => {
  if (!token) return;

  const fetchDashboardLocations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sites`, {
        headers: { Authorization: token },
      });

      if (res.data?.success && Array.isArray(res.data.sites)) {
        setDashboardLocations(res.data.sites);
      } else {
        setDashboardLocations([]);
      }
    } catch (error) {
      console.error("Dashboard locations fetch failed:", error);
      setDashboardLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  fetchDashboardLocations();
}, [token, API_BASE]);

// 7. Fetch Energy Efficiency Insights (Monthly Only)
useEffect(() => {
  if (loading) return;

  // Only fetch when monthly timeframe is selected
  if (carbonTimeframe !== "monthly") {
    setEfficiencyInsightsData(null);
    setEfficiencyLoading(false);
    return;
  }

  const fetchEfficiencyInsights = async () => {
    setEfficiencyLoading(true);
    setEfficiencyError(null);

    try {
      // Only fetch for monthly timeframe
      const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}-${month}`;
      
      const params = { month: yearMonth };
      const efficiencyUrl = `${API_BASE}/dashboard-energy-efficiency/monthly`;

      console.log("Fetching efficiency insights from:", efficiencyUrl, "with params:", params);
      console.log("Request headers - token:", token ? "✓ Present" : "✗ Missing");
      console.log("API_BASE:", API_BASE);

      const { data } = await axios.get(efficiencyUrl, {
        params,
        headers: { authorization: token }
      });

      console.log("Efficiency insights API response:", data);

      if (data && data.success !== false) {
        setEfficiencyInsightsData(data);
        console.log("✓ Efficiency data loaded successfully");
        
        // Extract and sort locations by consumption
        if (data.client_wise_data && Array.isArray(data.client_wise_data)) {
          const allLocations = [];
          
          data.client_wise_data.forEach((client) => {
            if (client.locations && Array.isArray(client.locations)) {
              client.locations.forEach((location) => {
                allLocations.push({
                  loc_id: location.loc_id,
                  loc_name: location.loc_name,
                  consumption_kwh: parseFloat(location.power_consumption_kwh || 0),
                  consumption_wh: parseFloat(location.power_consumption_wh || 0),
                  carbon_kg: parseFloat(location.carbon_emission_kg || 0),
                  carbon_tons: parseFloat(location.carbon_emission_tons || 0),
                  org_id: client.org_id,
                });
              });
            }
          });
          
          // Sort by consumption (descending) and take top 5
          const topLocations = allLocations
            .sort((a, b) => b.consumption_kwh - a.consumption_kwh)
            .slice(0, 5);
          
          setTopLocationsByConsumption(topLocations);
          console.log("✓ Top 5 locations by consumption extracted:", topLocations);
        }
      } else {
        console.error("API returned success: false or empty response");
        setEfficiencyInsightsData(null);
      }
    } catch (error) {
      console.error("✗ Efficiency insights API error:", error.message);
      console.error("Error status:", error.response?.status);
      console.error("Error details:", error.response?.data);
      setEfficiencyError("Failed to load efficiency insights");
      setEfficiencyInsightsData(null);
    } finally {
      setEfficiencyLoading(false);
    }
  };

  fetchEfficiencyInsights();
}, [loading, carbonTimeframe, selectedDate, token, API_BASE]);

  // Navigate when clicking card numbers
  const handleCardClick = (label) => {
    switch (label) {
      case "Clients":
        return navigate("/client");
      case "Locations":
        return navigate("/location-list");
      case "Devices":
        return navigate("/device-list");
      case "Subscribers":
        return navigate("/");
      case "Alerts":
        return navigate("/alerts");
      default:
        return;
    }
  };

  // Handle alert chart click to navigate to alerts page
  const handleAlertChartClick = () => {
    navigate("/alerts");
  };

  // Handle device distribution click
  const handleDeviceCardClick = () => {
    navigate("/device-list");
  };

  // Device type mapping
  const deviceTypeMap = {
    iatm: "IATM",
    bigio: "BigIO",
    neon: "Neon",
    lib: "LIB",
    lib_3p: "LIB 3P",
  };

  // Prepare data for donut chart
  const deviceChartData = Object.entries(deviceCounts)
    .map(([key, count]) => ({
      name: deviceTypeMap[key] || key.toUpperCase(),
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  // Colors
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];

  // Theme colors
  const bgPrimary = isDarkMode ? "#0F172B" : "#FFFFFF";
  const tooltipTextColor = isDarkMode ? "#E6EEF8" : "#0F172B";
  const legendTextColor = isDarkMode ? "#aaa" : "#334155";

  // Shared card styling for dark / light
  const cardGradientDark =
    "linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))";
  const cardGradientLight =
    "linear-gradient(180deg, rgba(248,250,252,1), rgba(229,231,235,1))";
  const cardLabelColor = isDarkMode ? "#d1d5db" : "#4b5563";
  const cardValueColor = isDarkMode ? "#ffffff" : "#111827";

  // Device chart options (donut) - styled to match theme
  const deviceChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}",
      backgroundColor: bgPrimary,
      borderWidth: 0,
      borderRadius: 6,
      textStyle: { color: tooltipTextColor },
    },
    legend: {
    orient: "vertical",
    right: 10,
    top: "center",
    textStyle: {
      color: isDarkMode ? "#fff" : "#000",
    },

    selectedMode: false, // 🔥 disables filter on click
  },
    series: [
      {
        type: "pie",
        radius: ["50%", "75%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderWidth: 0,
        },
        label: { show: false },
        emphasis: { scale: false },
        data: deviceChartData.map((d, i) => ({
          ...d,
          itemStyle: { color: colors[i % colors.length] },
        })),
      },
    ],
  };

const calculateHourlySummary = () => {
  if (!hourlyData.length || !hourlyData.some(h => h.hasData)) return { 
    maxDemand: 0,
    maxDemandHour: "N/A",
    active: 0, 
    inactive: 0,
    peak: 0,
    peakHour: "N/A",
    peakWindows: [],
    peakWindowDisplay: "N/A"
  };
  
  const dataWithUsage = hourlyData.filter(h => h.hasData);
  if (dataWithUsage.length === 0) return { 
    maxDemand: 0,
    maxDemandHour: "N/A",
    active: 0, 
    inactive: 0,
    peak: 0,
    peakHour: "N/A",
    peakWindows: [],
    peakWindowDisplay: "N/A"
  };
  
  // Find max demand (maximum usage)
  const maxDemand = Math.max(...hourlyData.map(h => h.usage));
  const maxDemandHour = hourlyData.find(h => h.usage === maxDemand)?.displayHour || "N/A";
  
  // Calculate peak (same as max demand for consistency)
  const peak = maxDemand;
  const peakHour = maxDemandHour;
  
  // STRATEGY 1: Find hours with usage above 80% of max (more inclusive)
  const peakThreshold = maxDemand * 0.8; // Changed from 0.9 to 0.8 to capture more hours
  
  // STRATEGY 2: Alternatively, find top 3-5 highest usage hours
  // Sort by usage descending and take top hours
  const sortedByUsage = [...hourlyData]
    .filter(h => h.hasData)
    .sort((a, b) => b.usage - a.usage);
  
  const topCount = Math.min(5, sortedByUsage.length); // Take top 5 or less
  const topUsageThreshold = topCount > 0 ? sortedByUsage[topCount - 1].usage : 0;
  
  // Use whichever gives more meaningful results
  const peakHoursData = hourlyData
    .filter(h => h.hasData && (h.usage >= peakThreshold || h.usage >= topUsageThreshold))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour)); // Sort by hour ascending
  
  if (peakHoursData.length === 0) {
    // If no hours meet threshold, at least include the max demand hour
    const maxHourData = hourlyData.find(h => h.usage === maxDemand);
    if (maxHourData) {
      peakHoursData.push(maxHourData);
    }
  }
  
  // Debug logging
  console.log("Peak analysis:", {
    maxDemand,
    maxDemandHour,
    peakThreshold,
    topUsageThreshold,
    peakHours: peakHoursData.map(h => ({
      hour: h.hour,
      displayHour: h.displayHour,
      usage: h.usage
    }))
  });
  
  // Group consecutive peak hours into windows
  const peakWindows = [];
  let currentWindow = null;
  
  peakHoursData.forEach((hourData, index) => {
    const hourNum = parseInt(hourData.hour);
    
    if (!currentWindow) {
      // Start new window
      currentWindow = {
        start: hourNum,
        end: hourNum,
        startTime: `${hourNum.toString().padStart(2, '0')}:00`, // Format as 0800, 1300, etc.
        endTime: `${hourNum.toString().padStart(2, '0')}00`,
        hours: [hourData],
        peakUsage: hourData.usage
      };
    } else if (hourNum === currentWindow.end + 1) {
      // Consecutive hour, extend window
      currentWindow.end = hourNum;
      currentWindow.endTime = `${hourNum.toString().padStart(2, '0')}:00`;
      currentWindow.hours.push(hourData);
      // Update peak usage if this hour has higher usage
      if (hourData.usage > currentWindow.peakUsage) {
        currentWindow.peakUsage = hourData.usage;
      }
    } else {
      // Non-consecutive, save current window and start new one
      const windowRange = currentWindow.start === currentWindow.end 
        ? `${currentWindow.startTime}`
        : `${currentWindow.startTime} - ${currentWindow.endTime}`;
      
      peakWindows.push({
        window: windowRange,
        range: currentWindow.start === currentWindow.end 
          ? `${currentWindow.startTime}`
          : `${currentWindow.startTime}-${currentWindow.endTime}`,
        count: currentWindow.hours.length,
        avgUsage: parseFloat((currentWindow.hours.reduce((sum, h) => sum + h.usage, 0) / currentWindow.hours.length).toFixed(3)),
        peakUsage: currentWindow.peakUsage
      });
      
      // Start new window
      currentWindow = {
        start: hourNum,
        end: hourNum,
        startTime: `${hourNum.toString().padStart(2, '0')}00`,
        endTime: `${hourNum.toString().padStart(2, '0')}00`,
        hours: [hourData],
        peakUsage: hourData.usage
      };
    }
  });
  
  // Add the last window
  if (currentWindow) {
    const windowRange = currentWindow.start === currentWindow.end 
      ? `${currentWindow.startTime}`
      : `${currentWindow.startTime} - ${currentWindow.endTime}`;
    
    peakWindows.push({
      window: windowRange,
      range: currentWindow.start === currentWindow.end 
        ? `${currentWindow.startTime}`
        : `${currentWindow.startTime}-${currentWindow.endTime}`,
      count: currentWindow.hours.length,
      avgUsage: parseFloat((currentWindow.hours.reduce((sum, h) => sum + h.usage, 0) / currentWindow.hours.length).toFixed(3)),
      peakUsage: currentWindow.peakUsage
    });
  }
  
  if (peakWindows.length > 1) {
    const mergedWindows = [];
    let windowToMerge = peakWindows[0];
    
    for (let i = 1; i < peakWindows.length; i++) {
      const currentWindow = peakWindows[i];
      const prevWindowEnd = parseInt(windowToMerge.range.split('-').pop() || windowToMerge.range);
      const currentWindowStart = parseInt(currentWindow.range.split('-')[0]);
      
      // If windows are within 2 hours of each other, merge them
      if (currentWindowStart - prevWindowEnd <= 200) { // 200 = 2 hours in 24h format
        const newEnd = currentWindow.range.includes('-') 
          ? currentWindow.range.split('-')[1]
          : currentWindow.range;
        windowToMerge = {
          window: `${windowToMerge.range.split('-')[0]} - ${newEnd}`,
          range: `${windowToMerge.range.split('-')[0]}-${newEnd}`,
          count: windowToMerge.count + currentWindow.count,
          avgUsage: parseFloat(((windowToMerge.avgUsage * windowToMerge.count + currentWindow.avgUsage * currentWindow.count) / 
            (windowToMerge.count + currentWindow.count)).toFixed(3)),
          peakUsage: Math.max(windowToMerge.peakUsage, currentWindow.peakUsage)
        };
      } else {
        mergedWindows.push(windowToMerge);
        windowToMerge = currentWindow;
      }
    }
    
    mergedWindows.push(windowToMerge);
    peakWindows.length = 0;
    peakWindows.push(...mergedWindows);
  }
  
  // Create peak window display string with ranges
  const peakWindowDisplay = peakWindows.length 
    ? peakWindows.map(w => w.window).join(", ")
    : "N/A";
  
  // Get active/inactive hours from API (location-specific) or fallback to hardcoded calculation
  let active = 0;
  let inactive = 0;
  
  if (chartData?.power_data?.active_inactive) {
    // Use backend calculation with location-specific hours
    active = parseFloat(chartData.power_data.active_inactive.active_hours_consumption || 0);
    inactive = parseFloat(chartData.power_data.active_inactive.inactive_hours_consumption || 0);
    console.log("Using location-specific active/inactive hours from API:", {
      active,
      inactive,
      location_hours: chartData.power_data.active_inactive.location_hours
    });
  } else {
    // Fallback to hardcoded 8 AM to 8 PM calculation
    active = hourlyData
      .filter(h => parseInt(h.hour) >= 8 && parseInt(h.hour) < 20 && h.hasData)
      .reduce((sum, h) => sum + h.usage, 0);
    
    inactive = hourlyData
      .filter(h => (parseInt(h.hour) < 8 || parseInt(h.hour) >= 20) && h.hasData)
      .reduce((sum, h) => sum + h.usage, 0);
    
    console.log("Using fallback hardcoded 8AM-8PM calculation");
  }
  
  // Debug logging
  console.log("Final peak windows:", peakWindows);
  console.log("Peak window display:", peakWindowDisplay);
  
  return {
    maxDemand: parseFloat(maxDemand.toFixed(3)),
    maxDemandHour,
    active: parseFloat(active.toFixed(3)),
    inactive: parseFloat(inactive.toFixed(3)),
    peak: parseFloat(peak.toFixed(3)),
    peakHour,
    peakWindows,
    peakWindowDisplay
  };
};

// Calculate monthly summary
const calculateMonthlySummary = () => {
  if (!monthlyData.length || !monthlyData.some(m => m.hasData)) return {
    maxDemand: 0,
    maxDemandMonth: "N/A",
    active: 0,
    inactive: 0,
    peak: 0,
    peakMonth: "N/A",
    peakWindowDisplay: "N/A"
  };

  const maxDemand = Math.max(...monthlyData.map(m => m.usage));
  const maxDemandEntry = monthlyData.find(m => m.usage === maxDemand);
  const maxDemandMonth = maxDemandEntry?.month || "N/A";

  // For monthly, active/inactive can be working days vs weekends/holidays
  // For now, use API data if available
  let active = 0;
  let inactive = 0;

  if (chartData?.power_data?.active_inactive) {
    active = parseFloat(chartData.power_data.active_inactive.active_hours_consumption || 0);
    inactive = parseFloat(chartData.power_data.active_inactive.inactive_hours_consumption || 0);
  } else {
    // Simple fallback: all consumption is considered active for monthly view
    active = monthlyData.reduce((sum, m) => sum + m.usage, 0);
  }

  return {
    maxDemand: parseFloat(maxDemand.toFixed(3)),
    maxDemandMonth,
    active: parseFloat(active.toFixed(3)),
    inactive: parseFloat(inactive.toFixed(3)),
    peak: parseFloat(maxDemand.toFixed(3)),
    peakMonth: maxDemandMonth,
    peakWindowDisplay: maxDemandMonth
  };
};

// Calculate yearly summary
const calculateYearlySummary = () => {
  if (!yearlyData.length || !yearlyData.some(y => y.hasData)) return {
    maxDemand: 0,
    maxDemandYear: "N/A",
    active: 0,
    inactive: 0,
    peak: 0,
    peakYear: "N/A",
    peakWindowDisplay: "N/A"
  };

  const maxDemand = Math.max(...yearlyData.map(y => y.usage));
  const maxDemandEntry = yearlyData.find(y => y.usage === maxDemand);
  const maxDemandYear = maxDemandEntry?.year || "N/A";

  let active = 0;
  let inactive = 0;

  if (chartData?.power_data?.active_inactive) {
    active = parseFloat(chartData.power_data.active_inactive.active_hours_consumption || 0);
    inactive = parseFloat(chartData.power_data.active_inactive.inactive_hours_consumption || 0);
  } else {
    active = yearlyData.reduce((sum, y) => sum + y.usage, 0);
  }

  return {
    maxDemand: parseFloat(maxDemand.toFixed(3)),
    maxDemandYear,
    active: parseFloat(active.toFixed(3)),
    inactive: parseFloat(inactive.toFixed(3)),
    peak: parseFloat(maxDemand.toFixed(3)),
    peakYear: maxDemandYear,
    peakWindowDisplay: maxDemandYear
  };
};

const hourlySummary = calculateHourlySummary();
const monthlySummary = calculateMonthlySummary();
const yearlySummary = calculateYearlySummary();

  /* ─────────────── EXCEL EXPORT FUNCTION ─────────────── */
  const exportDashboardToExcel = () => {
    console.log("Export Excel clicked!");
    console.log("Available data:", {
      cards: cards.length,
      hourlyData: hourlyData.length,
      chartData: !!chartData,
      deviceCounts: Object.keys(deviceCounts).length,
      alertData: !!alertData
    });

    // More lenient validation - export if we have at least some data
    const hasAnyData = cards.length > 0 || 
                       hourlyData.length > 0 || 
                       chartData !== null || 
                       Object.keys(deviceCounts).length > 0 || 
                       alertData !== null;
    
    if (!hasAnyData) {
      alert("No data available to export!");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

    // Helper: Simple Header (without complex styling to avoid errors)
    const addStyledHeader = (ws, headers) => {
      // Headers are already in the sheet from json_to_sheet
      // Just set column widths if needed
      return ws;
    };

    // Format date range for display
    const getFormattedDateRange = () => {
      switch (carbonTimeframe) {
        case 'daily':
          return moment(selectedDate).format('DD MMM YYYY');
        case 'monthly':
          return moment(selectedDate).format('MMM YYYY');
        case 'yearly':
          return moment(selectedDate).format('YYYY');
        case 'custom':
          return `${moment(customStartDate).format('DD MMM YYYY')} to ${moment(customEndDate).format('DD MMM YYYY')}`;
        default:
          return moment().format('DD MMM YYYY');
      }
    };

    // 1. Summary Sheet - Ensure all values are numbers
    const totalPower = parseFloat(chartData?.current_consumption?.total_power_kwh) || 0;
    const baselinePower = parseFloat(chartData?.baseline_consumption?.current_timeframe?.power_kwh) || 0;
    const powerSaved = parseFloat(chartData?.savings?.power_saved?.kwh) || 0;
    const totalCarbon = parseFloat(chartData?.current_consumption?.total_carbon_emission?.kg) || 0;
    const baselineCarbon = parseFloat(chartData?.baseline_consumption?.current_timeframe?.carbon_kg) || 0;
    const carbonSaved = parseFloat(chartData?.savings?.carbon_saved?.kg) || 0;

    const summary = [
      { Metric: "Report Generated", Value: moment().format("DD MMM YYYY, hh:mm A") },
      { Metric: "Report Period", Value: getFormattedDateRange() },
      { Metric: "Timeframe", Value: carbonTimeframe.charAt(0).toUpperCase() + carbonTimeframe.slice(1) },
      { Metric: "", Value: "" },
      { Metric: "POWER CONSUMPTION", Value: "" },
      { Metric: "Total Power Consumed", Value: `${totalPower.toFixed(3)} kWh` },
      { Metric: "Baseline Power", Value: `${baselinePower.toFixed(3)} kWh` },
      { Metric: "Power Saved", Value: `${powerSaved.toFixed(3)} kWh` },
      { Metric: "", Value: "" },
      { Metric: "CARBON FOOTPRINT", Value: "" },
      { Metric: "Total Carbon Emission", Value: `${totalCarbon.toFixed(3)} kg CO₂` },
      { Metric: "Baseline Carbon", Value: `${baselineCarbon.toFixed(3)} kg CO₂` },
      { Metric: "Carbon Reduced", Value: `${carbonSaved.toFixed(3)} kg CO₂` },
      { Metric: "", Value: "" },
      { Metric: "HOURLY ANALYSIS (Daily Only)", Value: "" },
      { Metric: "Max Demand", Value: `${hourlySummary.maxDemand.toFixed(3)} kWh at ${hourlySummary.maxDemandHour}` },
      { Metric: "Active Hours Usage (8AM-8PM)", Value: `${hourlySummary.active.toFixed(3)} kWh` },
      { Metric: "Inactive Hours Usage", Value: `${hourlySummary.inactive.toFixed(3)} kWh` },
      { Metric: "Peak Window", Value: hourlySummary.peakWindowDisplay },
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summary);
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // 2. Dashboard Cards
    if (cards.length > 0) {
      const cardsSheet = cards.map(c => ({
        "Metric": c.label,
        "Count": c.data,
      }));
      const ws = XLSX.utils.json_to_sheet(cardsSheet);
      ws["!cols"] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, "Dashboard Cards");
    }

    // 3. Power & Energy Data (Detailed Time Series)
    if (chartData?.detailed_carbon_data && chartData.detailed_carbon_data.length > 0) {
      const energySheet = chartData.detailed_carbon_data.map(item => {
        const period = item.period || item.recorded_at;
        let timeLabel = '';
        
        if (carbonTimeframe === 'daily') {
          timeLabel = moment(period).format('HH:mm');
        } else if (carbonTimeframe === 'monthly') {
          timeLabel = moment(period).format('DD MMM');
        } else if (carbonTimeframe === 'yearly') {
          timeLabel = moment(period).format('MMM YYYY');
        } else if (carbonTimeframe === 'custom') {
          timeLabel = moment(period).format('DD MMM YYYY');
        }
        
        return {
          "Period": timeLabel,
          "Power Consumption (kWh)": parseFloat(item.power_consumption_kwh || item.current_power_kwh || 0).toFixed(3),
          "Carbon Emission (kg CO₂)": parseFloat(item.carbon_emission_kg || item.current_carbon_kg || 0).toFixed(3),
          "Baseline Power (kWh)": parseFloat(item.baseline_power_kwh || 0).toFixed(3),
          "Baseline Carbon (kg CO₂)": parseFloat(item.baseline_carbon_kg || 0).toFixed(3),
        };
      });
      const ws = XLSX.utils.json_to_sheet(energySheet);
      ws["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 28 }, { wch: 25 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, ws, "Power & Energy Details");
    }

    // 4. Summary Comparison (Current vs Baseline vs Savings)
    if (chartData?.current_consumption && chartData?.baseline_consumption) {
      const comparisonSheet = [
        {
          "Category": "Current Consumption",
          "Power (kWh)": parseFloat(chartData.current_consumption.total_power_kwh || 0).toFixed(3),
          "Carbon (kg CO₂)": parseFloat(chartData.current_consumption.total_carbon_emission?.kg || 0).toFixed(3),
        },
        {
          "Category": "Baseline",
          "Power (kWh)": parseFloat(chartData.baseline_consumption.current_timeframe?.power_kwh || 0).toFixed(3),
          "Carbon (kg CO₂)": parseFloat(chartData.baseline_consumption.current_timeframe?.carbon_kg || 0).toFixed(3),
        },
        {
          "Category": "Savings",
          "Power (kWh)": parseFloat(chartData.savings?.power_saved?.kwh || 0).toFixed(3),
          "Carbon (kg CO₂)": parseFloat(chartData.savings?.carbon_saved?.kg || 0).toFixed(3),
        },
        {
          "Category": "Percentage Saved",
          "Power (kWh)": baselinePower > 0 
            ? `${((powerSaved / baselinePower) * 100).toFixed(2)}%`
            : "0%",
          "Carbon (kg CO₂)": baselineCarbon > 0
            ? `${((carbonSaved / baselineCarbon) * 100).toFixed(2)}%`
            : "0%",
        },
      ];
      const ws = XLSX.utils.json_to_sheet(comparisonSheet);
      ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws, "Comparison Summary");
    }

    // 4a. Energy Consumption vs Baseline (Cumulative)
    if (chartData?.detailed_carbon_data && chartData.detailed_carbon_data.length > 0) {
      let cumulativeBaseline = 0;
      let cumulativeActual = 0;
      
      const energySavingsSheet = chartData.detailed_carbon_data.map(item => {
        const period = item.period || item.recorded_at;
        let timeLabel = '';
        
        if (carbonTimeframe === 'daily') {
          timeLabel = moment(period).format('HH:mm');
        } else if (carbonTimeframe === 'monthly') {
          timeLabel = moment(period).format('DD MMM');
        } else if (carbonTimeframe === 'yearly') {
          timeLabel = moment(period).format('MMM YYYY');
        } else if (carbonTimeframe === 'custom') {
          timeLabel = moment(period).format('DD MMM YYYY');
        }
        
        const baseline = parseFloat(item.baseline_power_kwh || 0);
        const actual = parseFloat(item.power_consumption_kwh || item.current_power_kwh || 0);
        cumulativeBaseline += baseline;
        cumulativeActual += actual;
        const saved = cumulativeBaseline - cumulativeActual;
        
        return {
          "Period": timeLabel,
          "Cumulative Baseline (kWh)": cumulativeBaseline.toFixed(3),
          "Cumulative Actual (kWh)": cumulativeActual.toFixed(3),
          "Cumulative Saved (kWh)": saved.toFixed(3),
          "Status": saved >= 0 ? "SAVED" : "EXCEEDED",
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(energySavingsSheet);
      ws["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 25 }, { wch: 25 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, "Energy Savings");
    }

    // 4b. Carbon Footprint vs Baseline (Cumulative)
    if (chartData?.detailed_carbon_data && chartData.detailed_carbon_data.length > 0) {
      let cumulativeBaseline = 0;
      let cumulativeActual = 0;
      
      const carbonComparisonSheet = chartData.detailed_carbon_data.map(item => {
        const period = item.period || item.recorded_at;
        let timeLabel = '';
        
        if (carbonTimeframe === 'daily') {
          timeLabel = moment(period).format('HH:mm');
        } else if (carbonTimeframe === 'monthly') {
          timeLabel = moment(period).format('DD MMM');
        } else if (carbonTimeframe === 'yearly') {
          timeLabel = moment(period).format('MMM YYYY');
        } else if (carbonTimeframe === 'custom') {
          timeLabel = moment(period).format('DD MMM YYYY');
        }
        
        const baseline = parseFloat(item.baseline_carbon_kg || 0);
        const actual = parseFloat(item.carbon_emission_kg || item.current_carbon_kg || 0);
        cumulativeBaseline += baseline;
        cumulativeActual += actual;
        const reduced = cumulativeBaseline - cumulativeActual;
        
        return {
          "Period": timeLabel,
          "Cumulative Baseline (kg CO₂)": cumulativeBaseline.toFixed(3),
          "Cumulative Actual (kg CO₂)": cumulativeActual.toFixed(3),
          "Cumulative Reduced (kg CO₂)": reduced.toFixed(3),
          "Status": reduced >= 0 ? "REDUCED" : "EXCEEDED",
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(carbonComparisonSheet);
      ws["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 28 }, { wch: 30 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, "Carbon Reduction");
    }

    // 5. Hourly Usage (Daily only)
    if (hourlyData.length > 0 && hourlyData.some(h => h.hasData)) {
      const hourlySheet = hourlyData
        .filter(h => h.hasData)
        .map(h => ({
          "Hour": h.displayHour,
          "Usage (kWh)": parseFloat(h.usage || 0).toFixed(3),
          "Peak Hour": h.usage === hourlySummary.maxDemand ? "YES" : "NO",
        }));
      const ws = XLSX.utils.json_to_sheet(hourlySheet);
      ws["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, "Hourly Usage");
    }

    // 6. Device Distribution
    if (Object.keys(deviceCounts).length > 0) {
      const deviceSheet = Object.entries(deviceCounts).map(([type, count]) => ({
        "Device Type": type.toUpperCase().replace('_', ' '),
        "Count": count,
      }));
      const ws = XLSX.utils.json_to_sheet(deviceSheet);
      ws["!cols"] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, "Device Distribution");
    }

    // 7. Alerts Overview
    if (alertData) {
      const alertSheet = [
        { "Metric": "Total Alerts", "Value": parseInt(alertData.total_alerts || 0) },
        { "Metric": "Open Alerts", "Value": parseInt(alertData.open_alerts || 0) },
        { "Metric": "Closed Alerts", "Value": parseInt(alertData.closed_alerts || 0) },
        { "Metric": "Acknowledged Alerts", "Value": parseInt(alertData.acknowledged_alerts || 0) },
        { "Metric": "In Progress Alerts", "Value": parseInt(alertData.in_progress_alerts || 0) },
        { "Metric": "Resolved Alerts", "Value": parseInt(alertData.resolved_alerts || 0) },
        { "Metric": "", "Value": "" },
        { "Metric": "PRIORITY BREAKDOWN", "Value": "" },
        { "Metric": "Critical Priority", "Value": parseInt(alertData.critical_priority || 0) },
        { "Metric": "High Priority", "Value": parseInt(alertData.high_priority || 0) },
        { "Metric": "Medium Priority", "Value": parseInt(alertData.medium_priority || 0) },
        { "Metric": "Low Priority", "Value": parseInt(alertData.low_priority || 0) },
        { "Metric": "", "Value": "" },
        { "Metric": "ALERT TYPES", "Value": "" },
        { "Metric": "Power Alerts", "Value": parseInt(alertData.power_alerts || 0) },
        { "Metric": "Spike Alerts", "Value": parseInt(alertData.spike_alerts || 0) },
        { "Metric": "Offline Alerts", "Value": parseInt(alertData.offline_alerts || 0) },
        { "Metric": "Override Alerts", "Value": parseInt(alertData.override_alerts || 0) },
        { "Metric": "", "Value": "" },
        { "Metric": "Avg Resolution Time", "Value": `${parseFloat(alertData.avg_resolution_hours || 0).toFixed(1)} hours` },
      ];
      const ws = XLSX.utils.json_to_sheet(alertSheet);
      ws["!cols"] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, "Alerts Overview");
    }

      // Save file
      const fileName = `Dashboard_Report_${moment().format("YYYY-MM-DD_HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      console.log("Excel file generated successfully:", fileName);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Error generating Excel file. Please check console for details.");
    }
  };

  if (loading)
    return <div className="text-white text-center pt-10">Loading...</div>;

  // Helper for week selection
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    const monday = new Date(d.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [new Date(monday), new Date(sunday)];
  };

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
          : { backgroundColor: '#f0f2f5' } // dull white for light mode section bg
      }
    >
      <div><h1 className="page-header select-none ml-1">{title}</h1></div>
      

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 w-full mb-2">
        {cards.map((c, i) => (
          <div key={i} className="w-full">
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(c.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCardClick(c.label);
              }}
              className={`rounded-xl cursor-pointer transition-all duration-300 shadow-md hover:shadow-2xl hover:scale-105 h-full w-full flex items-center justify-between ${
                isDarkMode ? 'bg-[#0F172B] border border-[#1e293b]' : 'bg-white'
              }`}
              style={{ minHeight: '120px', padding: '30px' }}
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
                {c.Icon && <c.Icon className="w-12 h-12" style={{ color: c.iconColor.replace('bg-red-500', '#ef4444').replace('bg-orange-500', '#f97316').replace('bg-green-500', '#22c55e').replace('bg-purple-500', '#a855f7').replace('bg-blue-500', '#3b82f6') }} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Efficiency Insights and Location Map */}
      <div className="w-full -mt-2 grid grid-cols-1 lg:grid-cols-2 gap-3">

      {/* Location Map */}
<div
  onClick={() => setShowMapModal(true)}
  className={`rounded-2xl border p-6 cursor-pointer transition-all hover:shadow-2xl h-[500px] flex flex-col ${
    isDarkMode
      ? "bg-[#0F172B] border-[#1e293b] text-white shadow-[0_10px_30px_rgba(118,223,35,0.15)]"
      : "bg-white border-gray-200 text-gray-900 shadow-[0_10px_25px_rgba(118,223,35,0.12)]"
  }`}
>
  {/* HEADER */}
  <div className="flex items-center gap-3 mb-4 flex-shrink-0">
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
  isDarkMode
    ? "bg-blue-900/40 text-blue-400"
    : "bg-blue-100 text-blue-600"
}`}

    >
      {/* Map + Pin Icon */}
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4"
        />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    </div>

    <h3 className="text-lg font-semibold tracking-tight">
      Location Map
    </h3>
  </div>

  {/* CONTENT */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch flex-1">

    {/* LEFT — MAP */}
    <div
      className={`lg:col-span-2 relative h-full min-h-[300px] rounded-2xl overflow-hidden border ${
  isDarkMode
    ? "border-gray-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.25)]"
    : "border-gray-200 shadow-[inset_0_0_0_1px_rgba(203,213,225,0.6)]"
}`}

    >
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        dragging={false}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {dashboardLocations.map((loc) => {
          const lat = parseFloat(loc.geo_lat);
          const lng = parseFloat(loc.geo_long);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={loc.loc_id}
              position={[lat, lng]}
              icon={dashboardGreenIcon}
            />
          );
        })}
      </MapContainer>

      {/* Click overlay */}
      <div className="absolute inset-0 bg-[#76df23]/0 hover:bg-[#76df23]/5 transition" />
    </div>

    {/* RIGHT — TOP LOCATIONS */}
    <div className="flex flex-col h-full">
      <h4
        className={`text-sm font-semibold mb-3 ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        Top Locations
      </h4>

      {locationsLoading ? (
        <div className="text-sm text-gray-400">Loading locations…</div>
      ) : dashboardLocations.length === 0 ? (
        <div className="text-sm text-gray-400">No locations found</div>
      ) : (
        <ul className="space-y-2 flex-1">
          {dashboardLocations.slice(0, 5).map((loc) => (
            <li key={loc.loc_id}>
              <button
                type="button"
                className={`w-full flex items-start gap-3 rounded-lg px-3 py-2 transition cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#76df23] ${
                  isDarkMode
                    ? "bg-[#1e293b] hover:bg-[#23391a]"
                    : "bg-[#76df23]/10 hover:bg-[#76df23]/20"
                }`}
                onClick={() => navigate('/location', { state: { locationId: loc.loc_id } })}
                tabIndex={0}
                title={`View details for ${loc.loc_name}`}
              >
                {/* PIN */}
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isDarkMode
                      ? "bg-[#0f172b] text-[#76df23]"
                      : "bg-white text-[#4fbf12] border border-[#76df23]/40"
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
                  </svg>
                </span>

                {/* TEXT */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-sm truncate">
                    {loc.loc_name}
                  </div>
                  <div className={`text-xs truncate ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {loc.loc_address}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>

  {/* FOOTER */}
  <div
    className="flex items-center justify-between flex-shrink-0 pt-3 border-t mt-auto"
    style={{ borderColor: isDarkMode ? "#1e293b" : "#e5e7eb" }}
  >
    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
      {dashboardLocations.length} Active Hubs Globally
    </span>

    <span className="text-sm font-medium text-[#76df23] hover:underline">
      Full Map
    </span>
  </div>
</div>

        {/* Efficiency Insights */}
       <div
  className={`
    ${isDarkMode
      ? "bg-[#0F172B] text-white border-[#1e293b] shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
      : "bg-white text-black border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.08)]"}
    rounded-2xl border p-6 flex flex-col transition-all
  `}
>
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div
        className={`p-2 rounded-2xl ${
          isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-600"
        }`}
      >
        <TrendingUp size={22} />
      </div>
      <h3 className="text-lg font-semibold">Efficiency Insights</h3>
    </div>

    {/* Month Picker */}
    <div className="relative">
  <DatePicker
    selected={efficiencyMonth}
    onChange={(date) => setEfficiencyMonth(date)}
    dateFormat="MMMM yyyy"
    showMonthYearPicker
    portalId="root"
    popperClassName="z-[9999]"
    className={`px-3 py-1.5 pr-9 rounded border text-sm font-medium w-[150px]
      ${isDarkMode ? "bg-[#0F172B] text-white border-gray-600" : "bg-white text-gray-900 border-gray-300"}`}
  />

  {/* Calendar Icon */}
  <svg
    className="absolute right-3 top-1/2 -translate-y-1/2 text-black pointer-events-none"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
</div>

  </div>

  {/* Content */}
  {efficiencyLoading ? (
    <div className="text-center py-10 text-gray-400">Loading efficiency insights…</div>
  ) : efficiencyError ? (
    <div className="text-center py-10 text-red-500">{efficiencyError}</div>
  ) : topLocationsByConsumption.length === 0 ? (
    <div className="text-center py-10 text-gray-400">No location data available</div>
  ) : (
    <>
      <h4 className="text-sm font-semibold mb-4 text-gray-400">
        Top {topLocationsByConsumption.length} Locations by Consumption
      </h4>

      <div className="space-y-3 flex-1 overflow-y-auto pr-2">
        {topLocationsByConsumption.map((loc, idx) => (
          <div
            key={loc.loc_id}
            className={`flex justify-between items-center p-4 rounded-lg border
              ${isDarkMode
                ? "bg-[#1e293b] border-gray-700"
                : "bg-gray-50 border-gray-200"}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400 font-bold">
                {idx + 1}
              </div>
              <span className="font-semibold truncate">{loc.loc_name}</span>
            </div>

            <div className="text-right">
              <div className="text-green-500 font-bold">
                {loc.consumption_kwh.toFixed(2)} kWh
              </div>
              <div className="text-xs text-gray-500">
                {loc.carbon_kg.toFixed(2)} kg CO₂
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
        <span className="text-sm text-gray-400">Total Consumption</span>
        <span className="text-green-500 font-bold text-lg">
          {topLocationsByConsumption
            .reduce((sum, l) => sum + l.consumption_kwh, 0)
            .toFixed(2)}{" "}
          kWh
        </span>
      </div>
    </>
  )}
</div>


      </div>
      {/* Energy Matrix - Combined Energy Analytics */}
      <div className={`w-full ${isDarkMode ? 'bg-[#0F172B] text-white border-[#1e293b]' : 'bg-white text-black border-gray-200'} rounded-xl border p-6`}>
        <div className="relative flex justify-between items-center mb-6">
          {/* Left: Title */}
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
            </svg>
            Energy Metrics
          </h2>
          
          {/* Center: Date Filter Controls */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
            {/* Timeframe Selector - Button Group */}
            <div className={`inline-flex rounded-lg ${isDarkMode ? 'bg-[#1e293b]' : 'bg-gray-100'} p-1`}>
              {["daily", "weekly", "monthly", "yearly"].map((tf, index) => (
                <button
                  key={tf}
                  onClick={() => setCarbonTimeframe(tf)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                    carbonTimeframe === tf
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

            {/* Date Display with Calendar Dropdown */}
            <div className="relative flex items-center">
              {carbonTimeframe === "weekly" ? (
                <DatePicker
                  selected={selectedDate instanceof Date ? selectedDate : new Date(selectedDate)}
                  onChange={(date) => {
                    setSelectedDate(date);
                    const d = new Date(date);
                    const day = d.getDay();
                    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
                    const monday = new Date(d.setDate(diffToMonday));
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    setSelectedWeek([new Date(monday), new Date(sunday)]);
                  }}
                  highlightDates={selectedWeek[0] && selectedWeek[1] ? [
                    {
                      'react-datepicker__day--highlighted-custom-1': Array.from({length: 7}, (_, i) => {
                        const d = new Date(selectedWeek[0]);
                        d.setDate(d.getDate() + i);
                        return new Date(d);
                      })
                    }
                  ] : []}
                  dayClassName={date => {
                    if (!selectedWeek[0] || !selectedWeek[1]) return undefined;
                    return (date >= selectedWeek[0] && date <= selectedWeek[1]) ? 'react-datepicker__day--highlighted-custom-1' : undefined;
                  }}
                  dateFormat="dd MMM yyyy"
                  className={`px-3 py-1.5 pr-10 rounded border text-sm font-medium w-[160px] focus:outline-none ${
                    isDarkMode
                      ? "bg-[#1e293b] text-white border-gray-600 focus:border-blue-500"
                      : "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
                  }`}
                  placeholderText="Select week"
                />
              ) : (
                <DatePicker
                  selected={selectedDate instanceof Date ? selectedDate : new Date(selectedDate)}
                  onChange={(date) => setSelectedDate(date)}
                  dateFormat={
                    carbonTimeframe === "daily" 
                      ? "dd MMM" 
                      : carbonTimeframe === "yearly" 
                      ? "yyyy" 
                      : "MMMM"
                  }
                  showMonthYearPicker={carbonTimeframe === "monthly"}
                  showYearPicker={carbonTimeframe === "yearly"}
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

          {/* Right: Export Buttons */}
          {/* <div className="flex gap-3">
            <DashboardPDFReport
              cards={cards}
              chartData={chartData}
              hourlyData={hourlyData}
              deviceCounts={deviceCounts}
              alertData={alertData}
              timeframe={carbonTimeframe}
              selectedDate={selectedDate}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
            />
            <button
              onClick={exportDashboardToExcel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-lg transition-all hover:scale-105 active:scale-100 whitespace-nowrap"
              title="Download Full Report (Excel)"
            >
              <img src="../src/assets/img/alerts/excel.svg" alt="excel" className="w-4 h-4 mr-2" />
              <span className="text-white">Excel</span>
            </button>
          </div> */}
        </div>

        {/* Top Summary Cards - Before Charts */}
        {chartData && (
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
                {parseFloat(chartData.current_consumption?.total_power_kwh || 0).toFixed(2)} kWh
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
  <div className="flex items-center gap-0 mb-2">
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
    {parseFloat(chartData?.baseline?.total_baseline_kwh || 0).toFixed(2)} kWh
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
                {(parseFloat(chartData?.baseline?.total_baseline_kwh || 0) - parseFloat(chartData.current_consumption?.total_power_kwh || 0)).toFixed(2)} kWh
              </div>
              <div className="text-xs text-green-500 font-semibold mt-1">
                {carbonTimeframe === 'daily' && moment(selectedDate).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD') ? '' : ''}
              </div>
            </div>

            {/* Carbon Baseline */}
            {/* <div className={`rounded-lg p-4 border shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-[#26203b] to-[#151120] border-purple-500/30' : 'bg-gradient-to-br from-purple-50 to-white border-purple-500'}`}>
              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Baseline</div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {parseFloat(chartData?.baseline?.baseline_carbon_kg || 0).toFixed(2)} kg
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                Carbon Emission vs Baseline
              </div>
            </div> */}

            {/* Carbon Consumed */}
            {/* <div className={`rounded-lg p-4 border shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-white border-blue-500'}`}>
              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="6" cy="6" r="1.5"/>
                  <circle cx="18" cy="6" r="1.5"/>
                  <circle cx="6" cy="18" r="1.5"/>
                  <circle cx="18" cy="18" r="1.5"/>
                  <line x1="12" y1="10" x2="7" y2="7" stroke="currentColor" strokeWidth="1"/>
                  <line x1="12" y1="10" x2="17" y2="7" stroke="currentColor" strokeWidth="1"/>
                  <line x1="12" y1="14" x2="7" y2="17" stroke="currentColor" strokeWidth="1"/>
                  <line x1="12" y1="14" x2="17" y2="17" stroke="currentColor" strokeWidth="1"/>
                </svg>
                Carbon Consumed
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {parseFloat(chartData.current_consumption?.total_carbon_kg || 0).toFixed(2)} kg
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                Actual Emission
              </div>
            </div> */}

            {/* Carbon Saved */}
            <div className={`rounded-lg p-4 border shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#1a2e26] to-[#0f1914] border-green-500/30' : 'bg-gradient-to-br from-green-50 to-white border-green-500'}`}>
              {/* Perfect Achievement Icon in Background */}
              <div className="absolute top-2 right-2 opacity-10">
                {/* <svg className="w-16 h-16 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg> */}
              </div>
              
              <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1 relative z-10`}>
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Carbon Saved
              </div>
              <div className={`text-2xl font-bold text-green-500 relative z-10`}>
                {(parseFloat(chartData?.baseline?.baseline_carbon_kg || 0) - parseFloat(chartData.current_consumption?.total_carbon_kg || 0)).toFixed(2)} kg
              </div>
              <div className="text-xs text-green-500 font-semibold mt-1 relative z-10 flex items-center gap-1">
                {/* <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.3-1.04c.83.63 1.48 1.45 1.91 2.39H16.5c-.83-1.79-2.59-3.12-4.5-3.12s-3.67 1.33-4.5 3.12H7.79c.43-.94 1.08-1.76 1.91-2.39L10 1.5c.6 0 1.2-.15 1.77-.15 2.49 0 4.74 1.04 6.36 2.73l-1.2.92z" />
                </svg> */}
                {carbonTimeframe === 'daily' && moment(selectedDate).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD') ? '' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid - 2x2 Layout */}
        <div className="mb-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Row 1, Col 1: Power Consumption Chart */}
            <div className="shadow-lg rounded-xl">
              <BarChartComponent
                timeframe={carbonTimeframe}
                setTimeframe={setCarbonTimeframe}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
                selectedWeek={selectedWeek}
                setSelectedWeek={setSelectedWeek}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Row 1, Col 2: Energy vs Baseline */}
            {chartData && (
              <EnergySavingsChart
                data={chartData.detailed_carbon_data || []}
                apiResponse={chartData}
                timeframe={carbonTimeframe}
                selectedDate={selectedDate}
                loading={chartLoading}
                error={null}
                type="energy"
                isDarkMode={isDarkMode}
                hourlyData={hourlyData}
                hideSubcards={true}
              />
            )}

            {/* Row 2, Col 1: Carbon vs Baseline */}
            {chartData && (
              <EnergySavingsChart
                data={chartData.detailed_carbon_data || []}
                apiResponse={chartData}
                timeframe={carbonTimeframe}
                selectedDate={selectedDate}
                loading={chartLoading}
                error={null}
                type="carbon"
                isDarkMode={isDarkMode}
                hideSubcards={true}
              />
            )}

            {/* Row 2, Col 2: Energy Consumption Chart (Hourly/Monthly/Yearly) */}
            {carbonTimeframe === "daily" ? (
              <div className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-3 shadow-lg`}>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Hourly Energy Consumption
                </h3>
                
                {/* Chart */}
                {hourlyData.length > 0 && hourlyData.some(h => h.hasData) ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={hourlyData}
                      margin={{ top: 5, right: 10, left: 10, bottom: 30 }}
                        >
                          <CartesianGrid 
                            stroke={isDarkMode ? "#334155" : "#e5e7eb"} 
                            strokeDasharray="3 3"
                            strokeOpacity={0.5} 
                          />
                          <XAxis 
                            dataKey="displayHour" 
                            {...getXAxisProps('daily', isDarkMode)} 
                            tickFormatter={getTickFormatter('daily')} 
                          />
                          <YAxis {...getYAxisProps(isDarkMode, 'kWh')} />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                              border: `1px solid ${isDarkMode ? "#334155" : "#e5e7eb"}`,
                              borderRadius: "8px",
                              color: isDarkMode ? "#f9fafb" : "#111827",
                              padding: "12px",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                            }}
                            labelStyle={{
                              color: isDarkMode ? "#f9fafb" : "#111827",
                              fontWeight: "bold",
                              marginBottom: "4px"
                            }}
                            formatter={(value, name, props) => {
                              const index = props.dataKey === 'usage' ? hourlyData.findIndex(h => h.displayHour === props.payload.displayHour) : 0;
                              const currentValue = Number(value);
                              const previousValue = index > 0 ? Number(hourlyData[index - 1]?.usage || 0) : 0;
                              const hourConsumption = currentValue - previousValue;
                              return [`${hourConsumption.toFixed(2)} kWh`, 'Consumption'];
                            }}
                            labelFormatter={(label) => `Hour Range: ${label}`}
                          />
                          <Bar 
                            dataKey="usage" 
                            fill="#fb923c" 
                            radius={[4, 4, 0, 0]}
                            animationDuration={1500}
                            animationBegin={0}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-400 py-10 h-[400px] flex items-center justify-center">
                    No hourly data available
                  </div>
                )}
              </div>
            ) : (
              <div className={`${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border p-3 flex items-center justify-center shadow-lg`}>
                <div className="text-center text-gray-400">
                  <p className="text-lg">Hourly data available for daily view only</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hourly Summary Cards - Below Charts */}
        {carbonTimeframe === "daily" && hourlyData.length > 0 && hourlyData.some(h => h.hasData) && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {[
              { label: "Max Demand", value: `${hourlySummary.maxDemand.toFixed(3)} kWh`, subtext: `at ${hourlySummary.maxDemandHour}`, color: "#FB923C", bgGradient: isDarkMode ? 'from-[#2d1f1a] to-[#1a1310]' : 'from-orange-50 to-white' },
              { label: "Peak Window", value: hourlySummary.peakWindowDisplay,color: "#60A5FA", bgGradient: isDarkMode ? 'from-[#1a2332] to-[#0f1419]' : 'from-blue-50 to-white' },
              { label: "Active Hours", value: `${hourlySummary.active.toFixed(3)} kWh`,color: "#10B981", bgGradient: isDarkMode ? 'from-[#1a2e26] to-[#0f1914]' : 'from-green-50 to-white' },
              { label: "Inactive Hours", value: `${hourlySummary.inactive.toFixed(3)} kWh`, color: "#9CA3AF", bgGradient: isDarkMode ? 'from-[#1f2026] to-[#12141a]' : 'from-gray-50 to-white' },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded-lg p-4 border bg-gradient-to-br ${item.bgGradient}`}
                style={{ borderColor: `${item.color}${isDarkMode ? '30' : ''}` }}
              >
                <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.label}
                </div>
                <div className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {item.value}
                </div>
                {item.subtext && (
                  <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    {item.subtext}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      
      {/* Device Distribution and Alerts */}
      {/* Device Distribution and Alerts */}
 <div className="w-full mt-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
  {/* Device Distribution */}
  <div className={`${isDarkMode ? 'bg-[#0F172B] text-white border-[#1e293b]' : 'bg-white text-black border-gray-200'} rounded-xl border p-6 shadow-lg hover:shadow-xl transition-all duration-300 h-[500px] flex flex-col`}>
    <div className="flex items-center justify-between mb-4 flex-shrink-0">
      <div>
        <h3 className="text-xl font-bold tracking-tight">Device Distribution</h3>
        <p className="text-sm mt-2 text-gray-500 dark:text-gray-400 font-medium">
          {Object.keys(deviceCounts).length} device types
        </p>
      </div>
      {Object.keys(deviceCounts).length > 0 && (
        <div className={`px-3 py-2 rounded-lg font-bold text-sm ${isDarkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-700/30' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
          {Object.values(deviceCounts).reduce((a, b) => a + b, 0)} total
        </div>
      )}
    </div>

    {Object.keys(deviceCounts).length === 0 || Object.values(deviceCounts).reduce((a, b) => a + b, 0) === 0 ? (
      <div className="flex flex-col items-center justify-center flex-1 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 20 20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-3 text-lg font-medium">No device data available</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Add devices to see distribution</p>
      </div>
    ) : (
      <>
        <div className="flex-1 overflow-y-auto space-y-3 mb-4" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' }
        }}>
          <style>{`
            .flex-1.overflow-y-auto::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {Object.entries(deviceCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count], idx) => {
              const colors = [
                { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', icon: '📱' },
                { bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', icon: '🖥️' },
                { bg: 'bg-gradient-to-r from-purple-500 to-purple-600', text: 'text-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', icon: '📟' },
                { bg: 'bg-gradient-to-r from-amber-500 to-amber-600', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', icon: '🔌' },
                { bg: 'bg-gradient-to-r from-rose-500 to-rose-600', text: 'text-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20', icon: '⚡' },
              ];
              const color = colors[idx % colors.length];
              
              return (
                <div key={type} className="flex items-center justify-between p-4 rounded-xl hover:scale-[1.02] transition-transform duration-200 group"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.light}`}>
                      <span className="text-xl">{color.icon}</span>
                    </div>
                    <div>
                      <h4 className={`font-bold text-lg ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        {deviceTypeMap[type] || type.charAt(0).toUpperCase() + type.slice(1)}
                      </h4>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {count}
                    </div>
                    <div className={`text-xs font-semibold mt-1 px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      DEVICES
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        
        <button 
          onClick={() => navigate('/device-list')}
          className="w-full py-3 px-4 flex items-center justify-center gap-3 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group flex-shrink-0"
          style={{
            backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          }}
        >
          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">View All Devices</span>
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </>
    )}
  </div>
 <div className={`${isDarkMode ? 'bg-[#0F172B] text-white border-[#1e293b]' : 'bg-white text-black border-gray-200'} rounded-xl border p-6 h-[500px] flex flex-col`}>
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="text-lg font-semibold">System Alerts</h3>
        <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">
          {alertData ? `${alertData.unread_count || 0} unread alerts` : 'Loading...'}
        </p>
      </div>
      {alertData && (alertData.unread_count || 0) > 0 && (
        <span className="text-xs font-semibold text-orange-500 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
          {alertData.unread_count} UNREAD
        </span>
      )}
    </div>

    {!alertData ? (
      <div className="text-gray-400 text-center py-6 text-sm">
        Loading alert data...
      </div>
    ) : (
      <>
        <div className="flex-1 overflow-y-auto space-y-2 mb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.flex-1.overflow-y-auto::-webkit-scrollbar { display: none; }`}</style>
          {/* Overview Stats */}
          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>OVERVIEW</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <div className="text-xs text-orange-600 dark:text-orange-400">Unread Alerts</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{alertData.unread_count || 0}</div>
              </div>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-xs text-red-600 dark:text-red-400">Critical Count</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{alertData.critical_count || 0}</div>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-xs text-yellow-600 dark:text-yellow-400">High Priority</div>
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{alertData.high_count || 0}</div>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="text-xs text-gray-500 dark:text-gray-400">Device Alerts</div>
                <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{alertData.breakdown?.device_alerts?.unread || 0}</div>
              </div>
            </div>
          </div>

          {/* Breakdown by Source */}
          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>ALERT BREAKDOWN</h4>
            
            {/* Device Alerts */}
            {alertData.breakdown?.device_alerts && (
              <div className="mb-3">
                <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Device Alerts</div>
                <div className="space-y-1">
                  <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Unread</span>
                      </div>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{alertData.breakdown.device_alerts.unread}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Critical</span>
                      </div>
                      <span className="text-sm font-semibold text-red-500">{alertData.breakdown.device_alerts.critical}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>High</span>
                      </div>
                      <span className="text-sm font-semibold text-yellow-500">{alertData.breakdown.device_alerts.high}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Logs */}
            {alertData.breakdown?.alert_logs && (
              <div>
                <div className="text-xs font-mediu  mb-1 text-gray-600 dark:text-gray-400">Alert Logs</div>
                <div className="space-y-1">
                  <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Unread</span>
                      </div>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{alertData.breakdown.alert_logs.unread}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Critical</span>
                      </div>
                      <span className="text-sm font-semibold text-red-500">{alertData.breakdown.alert_logs.critical}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>High</span>
                      </div>
                      <span className="text-sm font-semibold text-yellow-500">{alertData.breakdown.alert_logs.high}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => navigate('/alerts')}
          className="w-full py-3 px-4 flex items-center justify-center gap-3 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group flex-shrink-0"
          style={{
            backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          }}
        >
          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">View All Alerts</span>
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </>
    )}
  </div>

      {/* Location View Toggle Tabs - Only show when location map card is clicked */}
      {showLocationView && (
      <div className="w-full mt-6">
        <div className={`${isDarkMode ? 'bg-[#0F172B] text-white border-[#1e293b]' : 'bg-white text-black border-gray-200'} rounded-xl border overflow-hidden`}>
          {/* Tab Headers */}
          <div className={`flex border-b ${isDarkMode ? 'border-[#1e293b]' : 'border-gray-200'}`}>
            <button
              onClick={() => setLocationView("map")}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold text-base transition-all duration-300 ${
                locationView === "map"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-b-4 border-blue-400"
                  : isDarkMode
                  ? "bg-[#0F172B] text-gray-400 hover:text-white hover:bg-[#1a253f]"
                  : "bg-white text-gray-600 hover:text-black hover:bg-gray-100"
              }`}
            >
              <FaMapMarkedAlt className="text-xl" />
              <span>Location Map View</span>
            </button>
            <button
              onClick={() => setLocationView("list")}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold text-base transition-all duration-300 ${
                locationView === "list"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-b-4 border-blue-400"
                  : isDarkMode
                  ? "bg-[#0F172B] text-gray-400 hover:text-white hover:bg-[#1a253f]"
                  : "bg-white text-gray-600 hover:text-black hover:bg-gray-100"
              }`}
            >
              <FaListUl className="text-xl" />
              <span>Location List View</span>
            </button>
          </div>

          {/* Tab Content */}
          <div
            className="p-0"
            style={{ position: "relative", overflow: "hidden" }}
          >
            {locationView === "map" ? (
              <div
                className="w-full"
                style={{ position: "relative", zIndex: 1 }}
              >
                <GoogleMapComponent isDarkMode={isDarkMode} />
              </div>
            ) : (
              <div
                className={`w-full rounded-b-xl ${
                  isDarkMode ? "bg-[#0a0f1c]" : "bg-white"
                }`}
              >
                <Location hideActions={true} />
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Efficiency Insights Modal */}
      {showEfficiencyModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setShowEfficiencyModal(false)}
        >
          <div 
            className={`relative w-[95%] max-w-4xl max-h-[80vh] ${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'} rounded-xl border shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-[#1e293b] bg-[#0a0f1c]' : 'border-gray-200 bg-gray-50'}`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Client Efficiency Insights</h2>
              <button
                onClick={() => setShowEfficiencyModal(false)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-[#1e293b] text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'}`}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              <table className="w-full">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: isDarkMode ? '#0F172B' : '#ffffff' }}>
                  <tr className={`border-b-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                    <th className={`text-left py-3 px-4 text-[18px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rank</th>
                    <th className={`text-left py-3 px-4 text-[18px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Client</th>
                    <th className={`text-right py-3 px-4 text-[18px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Baseline</th>
                    <th className={`text-right py-3 px-4 text-[18px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Saved</th>
                    <th className={`text-right py-3 px-4 text-[18px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Savings %</th>
                  </tr>
                </thead>
                <tbody>
                  {clientEfficiencyData.map((client, idx) => {
                    const baseline = parseFloat(client.total_baseline || 0);
                    const saved = parseFloat(client.total_saved || 0);
                    const savingsPercent = baseline > 0 ? ((saved / baseline) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <tr key={idx} className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} hover:${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} transition-colors`}>
                        <td className={`py-3 px-4 text-[18px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          #{idx + 1}
                        </td>
                        <td className={`py-3 px-4 text-[18px] font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {client.client_name || 'N/A'}
                        </td>
                        <td className={`py-3 px-4 text-[18px] text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {baseline.toFixed(2)} kWh
                        </td>
                        <td className="py-3 px-4 text-[18px] text-right">
                          <span className="font-semibold text-green-500">
                            {saved.toFixed(2)} kWh
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-[18px] text-right font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {savingsPercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
            <div className={`flex items-center justify-between px-4 py-2 border-b ${isDarkMode ? 'border-[#1e293b] bg-[#0a0f1c]' : 'border-gray-200 bg-gray-50'}`}>
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
                    <GoogleMapComponent isDarkMode={isDarkMode} />
                  </div>
                ) : (
                  <div className={`w-full h-full ${isDarkMode ? "bg-[#0a0f1c]" : "bg-white"}`}>
                    <Location hideActions={true} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Dashboard;