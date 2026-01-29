import React, { useState } from "react";
import jsPDF from "jspdf";
import moment from "moment";
import axios from "axios";
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  PieController,
  LineController,
  BarController,
} from "chart.js";
import buildIntLogo from "../../assets/img/Fevicon of BuildINT.png";
import { Download } from "lucide-react";

// Register Chart.js components
ChartJS.register(
  ArcElement, LineElement, PointElement, BarElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
  PieController, LineController, BarController
);

/**
 * HELPER FUNCTIONS
 */
const safeNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const formatFixed = (value, decimals = 2) => {
  return safeNumber(value).toFixed(decimals);
};

const safeText = (pdf, text, x, y, options = {}) => {
  try {
    const str = String(text || "");
    pdf.text(str, x, y, options);
  } catch (error) {
    console.error("Error rendering text:", error);
    pdf.text("", x, y, options);
  }
};

// Draw card with header
const drawCard = (pdf, x, y, width, height, title) => {
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(x, y, width, height, 3, 3, "FD");
  
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(x, y, width, 9, 3, 3, "F");
  
  pdf.setFontSize(9);
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  safeText(pdf, title, x + 4, y + 6.5);
};

// Format timestamp for charts
const formatTimestamp = (timestamp, timeframe) => {
  if (!timestamp) return "";
  const format = timeframe === "yearly" ? "MMM YYYY" :
                 timeframe === "monthly" || timeframe === "custom" ? "DD MMM" : "HH:mm";
  return moment(timestamp).format(format);
};

/**
 * CHART CREATION FUNCTIONS
 */
const createChart = (type, data, options) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 1200;
    canvas.height = options.height || 600;
    const ctx = canvas.getContext('2d');

    const chart = new ChartJS(ctx, { type, data, options: options.chartOptions });
    chart.update();
    
    const imageData = canvas.toDataURL('image/png', 1.0);
    chart.destroy();
    return imageData;
  } catch (error) {
    console.error(`Error creating ${type} chart:`, error);
    return null;
  }
};

const getChartOptions = (yAxisLabel, xAxisLabel, timeframe) => ({
  responsive: false,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: yAxisLabel,
        color: '#374151',
        font: { size: 16, family: 'Helvetica', weight: 'bold' },
        padding: { bottom: 12 }
      },
      grid: { color: 'rgba(229, 231, 235, 0.5)', lineWidth: 1.2 },
      border: { color: '#d1d5db', width: 1.5 },
      ticks: { color: '#6b7280', font: { size: 13, family: 'Helvetica' }, padding: 8 }
    },
    x: {
      title: {
        display: true,
        text: xAxisLabel,
        color: '#374151',
        font: { size: 16, family: 'Helvetica', weight: 'bold' },
        padding: { top: 12 }
      },
      grid: { color: 'rgba(243, 244, 246, 0.5)', lineWidth: 1.2 },
      border: { color: '#d1d5db', width: 1.5 },
      ticks: {
        color: '#6b7280',
        font: { size: timeframe === 'daily' ? 10 : 12, family: 'Helvetica' },
        maxRotation: timeframe === 'daily' ? 0 : 45,
        minRotation: timeframe === 'daily' ? 0 : 45,
        padding: 6,
        autoSkip: timeframe !== 'daily',
        maxTicksLimit: timeframe === 'daily' ? 24 : timeframe === 'monthly' ? 15 : 12
      }
    }
  }
});

const createEnergyChart = (data, baseline) => {
  if (!data || data.length === 0) return null;
  return createChart('line', {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: 'Actual Consumption',
        data: data.map(d => d.actual),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        fill: false,
      },
      {
        label: 'Baseline',
        data: Array(data.length).fill(baseline),
        borderColor: '#60a5fa',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false,
      }
    ]
  }, {
    width: 1400,
    height: 700,
    chartOptions: getChartOptions('Energy Consumption (kWh)', 'Time', 'daily')
  });
};

const createCO2Chart = (data, baseline) => {
  if (!data || data.length === 0) return null;
  return createChart('line', {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: 'Actual Emission',
        data: data.map(d => d.actual),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        fill: false,
      },
      {
        label: 'Baseline',
        data: Array(data.length).fill(baseline),
        borderColor: '#60a5fa',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false,
      }
    ]
  }, {
    width: 1600,
    height: 700,
    chartOptions: getChartOptions('CO2 Emission (kg)', 'Time', 'daily')
  });
};

const createHourlyUsageChart = (hourlyData, currentTimeframe = 'daily') => {
  if (!hourlyData || hourlyData.length === 0) return null;
  
  const xAxisLabel = currentTimeframe === 'daily' ? 'Hour of Day' :
                    currentTimeframe === 'monthly' ? 'Day of Month' :
                    currentTimeframe === 'yearly' ? 'Month of Year' : 'Time Period';
  
  return createChart('bar', {
    labels: hourlyData.map(d => d.hour),
    datasets: [{
      label: 'Usage',
      data: hourlyData.map(d => d.usage),
      backgroundColor: '#f97316',
      borderColor: '#f97316',
      borderWidth: 1,
      borderRadius: 4,
    }]
  }, {
    width: 1400,
    height: 700,
    chartOptions: getChartOptions('Usage (kWh)', xAxisLabel, currentTimeframe)
  });
};

const createPowerConsumptionChart = (data) => {
  if (!data || data.length === 0) return null;
  return createChart('line', {
    labels: data.map(d => d.label),
    datasets: [{
      label: 'Power Consumption',
      data: data.map(d => d.actual),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderWidth: 3,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#8b5cf6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      fill: false,
    }]
  }, {
    width: 1400,
    height: 700,
    chartOptions: getChartOptions('Power Consumption (kWh)', 'Time', 'daily')
  });
};

/**
 * DATA SERIES BUILDERS
 */
const buildLocationSeries = (dataArray, timeframe, isCumulative, valueField) => {
  if (!dataArray || dataArray.length === 0) return [];
  
  let cumulative = 0;
  if (timeframe === 'daily') {
    const hourMap = new Map();
    dataArray.forEach(item => {
      const timestamp = item.period || item.recorded_at;
      if (timestamp) {
        const hourMatch = timestamp.match(/T(\d{2}):/);
        if (hourMatch) hourMap.set(parseInt(hourMatch[1]), item);
      }
    });
    
    const lastValidHour = hourMap.size > 0 ? Math.max(...hourMap.keys()) : 23;
    const series = [];
    for (let h = 0; h <= lastValidHour; h++) {
      const item = hourMap.get(h) || {};
      const value = safeNumber(item[valueField] || 0, 0);
      if (isCumulative) cumulative += value;
      series.push({
        label: `${String(h).padStart(2, "0")}:00`,
        actual: isCumulative ? Number(cumulative.toFixed(4)) : value
      });
    }
    return series;
  } else {
    return dataArray.map(item => {
      const value = safeNumber(item[valueField] || 0, 0);
      if (isCumulative) cumulative += value;
      return {
        label: formatTimestamp(item.period || item.recorded_at, timeframe),
        actual: isCumulative ? Number(cumulative.toFixed(4)) : value
      };
    });
  }
};

/**
 * MAIN COMPONENT
 */
const LocationDashboardPDFReport = ({
  locationData,
  powerConsumptionData = [],
  hourlyUsageData = [],
  energySavedData = [],
  carbonFootprintData = [],
  energySavedResponse = {},
  carbonFootprintResponse = {},
  hourlyUsageResponse = {},
  powerConsumptionResponse = {},
  timeframe = "daily",
  selectedDate,
  selectedMonth,
  selectedYear,
  customStartDate,
  customEndDate,
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!locationData || !locationData.loc_id) {
      alert("Location data is not available!");
      return;
    }

    setIsGenerating(true);

    try {
      const locationId = locationData.loc_id;
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      // Fetch device data for the location (all IoT devices)
      let deviceData = {};
      try {
        const deviceResponse = await axios.get(
          `${apiURL}/device-location/iot/${locationId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
          }
        );
        deviceData = deviceResponse.data || {};
      } catch (err) {
        console.error("Error fetching device data:", err);
      }

      // Build query params for per‑device APIs so they respect the same filters
      // IMPORTANT: mirror the behavior used in live device pages (e.g. neonrelay, Libi)
      // - For 'daily' we pass ?date=YYYY-MM-DD
      // - For other timeframes the backend relies on the path segment (/monthly, /yearly, etc.)
      //   so we do NOT add extra query params, to avoid breaking API behavior.
      // - For 'custom' we keep start_date/end_date if supported by the backend.
      const buildDeviceQueryParams = () => {
        // Daily: match neonrelay/libi behavior
        if (timeframe === "daily" && selectedDate) {
          return `?date=${moment(selectedDate).format("YYYY-MM-DD")}`;
        }

        // Custom range: only add if both dates present (if backend supports this)
        if (timeframe === "custom" && customStartDate && customEndDate) {
          const params = new URLSearchParams();
          params.append("start_date", moment(customStartDate).format("YYYY-MM-DD"));
          params.append("end_date", moment(customEndDate).format("YYYY-MM-DD"));
          const qs = params.toString();
          return qs ? `?${qs}` : "";
        }

        // Monthly/yearly rely on /{timeframe} path only
        return "";
      };

      // Generic extractor for per‑device power‑saving style responses
      const extractDeviceMetrics = (resp) => {
        if (!resp || typeof resp !== "object") {
          return { baseline: 0, consumption: 0, saved: 0, active: 0, inactive: 0 };
        }

        const baselines = resp.baselines || {};
        const summary = resp.summary || {};
        const baselineObj = resp.baseline || {};
        const savings = resp.savings || {};
        const actual = resp.actual || {};
        const activeInactive = resp.active_inactive || {};

        // Baseline – try multiple common shapes
        let baseline = 0;
        if (timeframe === "daily") {
          baseline = safeNumber(
            baselines.daily_baseline_kwh ??
            summary.baseline_kwh ??
            baselineObj.daily_wh ??
            baselineObj.power_wh ??
            baselineObj.total_kwh ??
            0
          );
        } else if (timeframe === "monthly") {
          baseline = safeNumber(
            baselines.monthly_baseline_kwh ??
            baselineObj.monthly_wh ??
            0
          );
        } else if (timeframe === "yearly") {
          baseline = safeNumber(
            baselines.yearly_baseline_kwh ??
            baselineObj.yearly_wh ??
            0
          );
        } else {
          baseline = safeNumber(
            summary.baseline_kwh ??
            baselineObj.total_kwh ??
            0
          );
        }

        // Consumption (actual)
        let consumption = safeNumber(
          summary.total_kwh ??
          summary.used_kwh ??
          summary.actual_kwh ??
          actual.total_consumption_kwh ??
          actual.power_wh ??
          0
        );

        // If still zero and we have raw data array, sum it
        if (!consumption && Array.isArray(resp.data)) {
          consumption = resp.data.reduce(
            (sum, item) =>
              sum +
              safeNumber(
                item.consumption_kwh ??
                item.actual_consumption_kwh ??
                item.total_consumption_kwh ??
                0,
                0
              ),
            0
          );
        }

        // Saved
        let saved = safeNumber(
          summary.saved_kwh ??
          summary.power_saved_kwh ??
          savings.power_saved_kwh ??
          0
        );
        if (!saved && baseline) {
          saved = baseline - consumption;
        }

        // Active / Inactive (kWh)
        // Try multiple possible shapes used by backend for device‑level endpoints
        let active = safeNumber(
          summary.active_hours_consumption ??
          summary.active_hours_kwh ??
          summary.active_hours ??
          summary.active_kwh ??
          summary.active_consumption_kwh ??
          activeInactive.active_hours_consumption ??
          activeInactive.active_hours_kwh ??
          activeInactive.active_kwh ??
          activeInactive.active_consumption_kwh ??
          0
        );
        let inactive = safeNumber(
          summary.inactive_hours_consumption ??
          summary.inactive_hours_kwh ??
          summary.inactive_hours ??
          summary.inactive_kwh ??
          summary.inactive_consumption_kwh ??
          activeInactive.inactive_hours_consumption ??
          activeInactive.inactive_hours_kwh ??
          activeInactive.inactive_kwh ??
          activeInactive.inactive_consumption_kwh ??
          0
        );

        // If still zero, try to sum from data array fields
        if (active === 0 && Array.isArray(resp.data)) {
          active = resp.data.reduce(
            (sum, item) =>
              sum +
              safeNumber(
                item.active_hours_consumption ??
                item.active_kwh ??
                item.active_consumption_kwh ??
                0,
                0
              ),
            0
          );
        }

        if (inactive === 0 && Array.isArray(resp.data)) {
          inactive = resp.data.reduce(
            (sum, item) =>
              sum +
              safeNumber(
                item.inactive_hours_consumption ??
                item.inactive_kwh ??
                item.inactive_consumption_kwh ??
                0,
                0
              ),
            0
          );
        }

        return { baseline, consumption, saved, active, inactive };
      };

      const deviceQuery = buildDeviceQueryParams();

      // Determine report end date to compare with device install/creation date
      const getReportEndDate = () => {
        if (timeframe === "daily") return moment(selectedDate, "YYYY-MM-DD");
        if (timeframe === "monthly")
          return moment(selectedMonth, "YYYY-MM").endOf("month");
        if (timeframe === "yearly")
          return moment(selectedYear, "YYYY").endOf("year");
        if (timeframe === "custom") return moment(customEndDate, "YYYY-MM-DD");
        return moment(); // fallback: now
      };
      const reportEndDate = getReportEndDate();

      // Helper function to check if a device is configured/installed at this location
      const isConfiguredDevice = (dev) => {
        const hasValidId = !!(dev?.did || dev?.device_id || dev?.dev_id);
        if (!hasValidId) return false;

        const rawCount =
          dev?.device_count ??
          dev?.count ??
          dev?.location_count ??
          dev?.loc_count ??
          dev?.devices_count ??
          null;

        // If count is not provided, treat it as 1 (device card exists → assume installed)
        const deviceCount =
          rawCount === null || rawCount === undefined
            ? 1
            : safeNumber(rawCount, 0);

        return deviceCount > 0;
      };

      // Get all devices for each category
      const allNeonDevices = Array.isArray(deviceData.Neon) ? deviceData.Neon : [];
      const allLightDevices = [
        ...(Array.isArray(deviceData.LIB) ? deviceData.LIB : []),
        ...(Array.isArray(deviceData.ThreePLIB) ? deviceData.ThreePLIB : []),
      ];

      // Filter to only devices that appear to be installed/configured
      const neonDevices = allNeonDevices.filter(isConfiguredDevice);
      const lightDevices = allLightDevices.filter(isConfiguredDevice);

      let acMetrics = [];
      let lightMetrics = [];
      let hasDeviceData = false; // Will be set after fetching metrics

      // Check if there are any installed devices at this location (for the selected date/timeframe)
      const hasConfiguredDevices = neonDevices.length > 0 || lightDevices.length > 0;

      if (hasConfiguredDevices) {
        const authHeaders = {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        };

        // Fetch per‑device metrics for AC (Neon) devices - check installed devices
        acMetrics = await Promise.all(
          neonDevices.map(async (dev) => {
            const did = dev.did || dev.device_id || dev.dev_id;
            if (!did) return null;

            try {
              const encodedDid = encodeURIComponent(did);
              const url = `${apiURL}/neon-power-saving/${encodedDid}/${timeframe}${deviceQuery}`;
              const res = await axios.get(url, authHeaders);
              const apiResponse = res.data || {};
              
              // First check: Does the API response indicate the device exists and has data?
              if (!apiResponse || Object.keys(apiResponse).length === 0) {
                console.log(`⚠️ Device ${did} (${dev.device_name || 'Unknown'}) - Empty API response for ${timeframe} ${deviceQuery}`);
                return null;
              }
              
              // Extract metrics
              const metrics = extractDeviceMetrics(apiResponse);
              
              // Check if device has actual data for this specific date/timeframe
              // A device is considered to have data if ANY of these conditions are true:
              const hasDataArray = Array.isArray(apiResponse.data) && apiResponse.data.length > 0;
              
              const summary = apiResponse.summary || {};
              const hasSummaryData = summary && (
                safeNumber(summary.total_kwh, 0) > 0 || 
                safeNumber(summary.used_kwh, 0) > 0 ||
                safeNumber(summary.baseline_kwh, 0) > 0 ||
                safeNumber(summary.actual_kwh, 0) > 0
              );
              
              const baselines = apiResponse.baselines || {};
              const hasBaseline = safeNumber(baselines.daily_baseline_kwh, 0) > 0 ||
                                 safeNumber(baselines.monthly_baseline_kwh, 0) > 0 ||
                                 safeNumber(baselines.yearly_baseline_kwh, 0) > 0 ||
                                 safeNumber(apiResponse.baseline?.daily_wh, 0) > 0 ||
                                 safeNumber(apiResponse.baseline?.monthly_wh, 0) > 0 ||
                                 safeNumber(apiResponse.baseline?.yearly_wh, 0) > 0;
              
              const hasMetrics = metrics.consumption > 0 || metrics.baseline > 0;
              const hasSuccessFlag = apiResponse.success === true || apiResponse.success === undefined;
              
              const hasData = hasSuccessFlag && (hasDataArray || hasSummaryData || hasBaseline || hasMetrics);
              
              if (!hasData) {
                console.log(`⚠️ Device ${did} (${dev.device_name || 'Unknown'}) has no data for ${timeframe} ${deviceQuery} - skipping`);
                console.log(`   Response check: dataArray=${hasDataArray}, summary=${hasSummaryData}, baseline=${hasBaseline}, metrics=${hasMetrics}, success=${hasSuccessFlag}`);
                return null; // Device wasn't installed/active on this date
              }
              
              console.log(`✅ Device ${did} (${dev.device_name || 'Unknown'}) has data for ${timeframe} ${deviceQuery}`);
              
              return {
                name: dev.device_name || "AC Device",
                ...metrics,
              };
            } catch (err) {
              console.error("Error fetching Neon device metrics:", dev, err);
              return null; // Return null instead of zero values - will be filtered out
            }
          })
        );

        // Fetch per‑device metrics for Light (LIB / 3P‑LIB) devices - check installed devices
        lightMetrics = await Promise.all(
          lightDevices.map(async (dev) => {
            const did = dev.did || dev.device_id || dev.dev_id;
            if (!did) return null;

            try {
              const encodedDid = encodeURIComponent(did);
              const url = `${apiURL}/lib-power-saving/${encodedDid}/${timeframe}${deviceQuery}`;
              const res = await axios.get(url, authHeaders);
              const apiResponse = res.data || {};
              
              // First check: Does the API response indicate the device exists and has data?
              if (!apiResponse || Object.keys(apiResponse).length === 0) {
                console.log(`⚠️ Device ${did} (${dev.device_name || 'Unknown'}) - Empty API response for ${timeframe} ${deviceQuery}`);
                return null;
              }
              
              // Extract metrics
              const metrics = extractDeviceMetrics(apiResponse);
              
              // Check if device has actual data for this specific date/timeframe
              // A device is considered to have data if ANY of these conditions are true:
              const hasDataArray = Array.isArray(apiResponse.data) && apiResponse.data.length > 0;
              
              const summary = apiResponse.summary || {};
              const hasSummaryData = summary && (
                safeNumber(summary.total_kwh, 0) > 0 || 
                safeNumber(summary.used_kwh, 0) > 0 ||
                safeNumber(summary.baseline_kwh, 0) > 0 ||
                safeNumber(summary.actual_kwh, 0) > 0
              );
              
              const baselines = apiResponse.baselines || {};
              const hasBaseline = safeNumber(baselines.daily_baseline_kwh, 0) > 0 ||
                                 safeNumber(baselines.monthly_baseline_kwh, 0) > 0 ||
                                 safeNumber(baselines.yearly_baseline_kwh, 0) > 0 ||
                                 safeNumber(apiResponse.baseline?.daily_wh, 0) > 0 ||
                                 safeNumber(apiResponse.baseline?.monthly_wh, 0) > 0 ||
                                 safeNumber(apiResponse.baseline?.yearly_wh, 0) > 0;
              
              const hasMetrics = metrics.consumption > 0 || metrics.baseline > 0;
              const hasSuccessFlag = apiResponse.success === true || apiResponse.success === undefined;
              
              const hasData = hasSuccessFlag && (hasDataArray || hasSummaryData || hasBaseline || hasMetrics);
              
              if (!hasData) {
                console.log(`⚠️ Device ${did} (${dev.device_name || 'Unknown'}) has no data for ${timeframe} ${deviceQuery} - skipping`);
                console.log(`   Response check: dataArray=${hasDataArray}, summary=${hasSummaryData}, baseline=${hasBaseline}, metrics=${hasMetrics}, success=${hasSuccessFlag}`);
                return null; // Device wasn't installed/active on this date
              }
              
              console.log(`✅ Device ${did} (${dev.device_name || 'Unknown'}) has data for ${timeframe} ${deviceQuery}`);
              
              return {
                name: dev.device_name || "Light Device",
                ...metrics,
              };
            } catch (err) {
              console.error("Error fetching LIB device metrics:", dev, err);
              return null; // Return null instead of zero values - will be filtered out
            }
          })
        );
        
        // Filter out null values (failed API calls or devices with no data)
        acMetrics = acMetrics.filter(Boolean);
        lightMetrics = lightMetrics.filter(Boolean);
        
        console.log(`📊 Device metrics filtered: AC devices with data: ${acMetrics.length}/${neonDevices.length}, Light devices with data: ${lightMetrics.length}/${lightDevices.length}`);
        
        // Update hasDeviceData based on actual filtered results
        // Only generate Page 2 if we have at least one device with actual data
        hasDeviceData = acMetrics.length > 0 || lightMetrics.length > 0;
        
        if (!hasDeviceData) {
          console.log(`⚠️ No devices have data for ${timeframe} ${deviceQuery} - this likely means devices weren't installed/active by this date. Device page will show a 'No data / not installed' message.`);
        } else {
          console.log(`✅ Devices with data found for ${timeframe} ${deviceQuery}: ${acMetrics.length} AC devices, ${lightMetrics.length} Light devices - Page 2 will show tables`);
        }
      } else {
        console.log(`⚠️ No devices installed for the selected date/timeframe - Device page will show a 'Not installed' message`);
      }

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;

      // ============= PAGE 1: LOCATION PERFORMANCE =============
      pdf.setFillColor(249, 250, 251);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Header with logo
      try {
        pdf.addImage(buildIntLogo, 'PNG', marginX + 2, 6, 8, 8);
      } catch (err) {
        console.warn('Could not load logo:', err);
      }

      pdf.setFontSize(16);
      pdf.setTextColor(16, 185, 129);
      pdf.setFont("helvetica", "bold");
      safeText(pdf, "Location Performance Report", marginX + 13, 10);

      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "normal");
      safeText(pdf, locationData.loc_name || "Location Details", marginX + 13, 16);

      // Generated timestamp (top‑right)
      const timestamp = `Generated on ${moment().format("DD MMM YYYY, HH:mm")}`;
      pdf.setFontSize(7);
      safeText(pdf, timestamp, pageWidth - marginX - 2, 10, { align: "right" });

      // Reporting period label (top‑right, below timestamp)
      const getReportPeriodLabel = () => {
        if (timeframe === "daily" && selectedDate) {
          return `Report for: ${moment(selectedDate).format("DD MMM YYYY")} (Daily)`;
        }
        if (timeframe === "monthly" && selectedMonth) {
          return `Report for: ${moment(selectedMonth, "YYYY-MM").format("MMM YYYY")} (Monthly)`;
        }
        if (timeframe === "yearly" && selectedYear) {
          return `Report for: ${selectedYear} (Yearly)`;
        }
        if (timeframe === "custom" && customStartDate && customEndDate) {
          const start = moment(customStartDate).format("DD MMM YYYY");
          const end = moment(customEndDate).format("DD MMM YYYY");
          return `Report for: ${start} to ${end}`;
        }
        return "Report period: All available data";
      };
      const periodLabel = getReportPeriodLabel();
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, periodLabel, pageWidth - marginX - 2, 14, { align: "right" });

      // Location info bar
      const infoBarY = 22;
      const infoBarHeight = 10;
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(marginX, infoBarY, pageWidth - marginX * 2, infoBarHeight, 2, 2, "F");
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(marginX, infoBarY, pageWidth - marginX * 2, infoBarHeight, 2, 2, "D");

      const infoSections = [
        ["Location", locationData.loc_name || "—"],
        ["Branch Code", locationData.branch_code || "—"],
        ["Country", locationData.country_name || "India"],
        ["Region", locationData.region_name || "—"],
        ["State", locationData.state_name || "—"],
        ["City", locationData.city_name || "—"]
      ];

      const sectionWidth = (pageWidth - marginX * 2) / 6;
      pdf.setFontSize(5.5);
      
      infoSections.forEach(([label, value], index) => {
        const sectionX = marginX + (sectionWidth * index) + 2;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, label, sectionX, infoBarY + 3.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(6.5);
        safeText(pdf, String(value).substring(0, 20), sectionX, infoBarY + 7.5);
        pdf.setFontSize(5.5);
      });

      // Extract metrics
      const totalConsumption = safeNumber(energySavedResponse?.total_actual_consumption || hourlyUsageResponse?.total_consumption || 0);
      const baseline = safeNumber(energySavedResponse?.total_baseline_wh || 0);
      const saved = safeNumber(energySavedResponse?.total_energy_saved || 0);
      const activeConsumption = safeNumber(hourlyUsageResponse?.active_inactive?.active_hours_consumption || 0);
      const inactiveConsumption = safeNumber(hourlyUsageResponse?.active_inactive?.inactive_hours_consumption || 0);
      
      const totalCarbonEmission = safeNumber(carbonFootprintResponse?.actual?.total_carbon_kg || 0);
      const carbonBaseline = safeNumber(carbonFootprintResponse?.baseline?.total_carbon_kg || 0);
      const carbonSaved = safeNumber(carbonFootprintResponse?.savings?.carbon_saved_kg || 0);
      
      const totalPowerConsumption = safeNumber(powerConsumptionResponse?.total_consumption || 0);

      // Build chart series
      const energySavedSeries = buildLocationSeries(energySavedData, timeframe, true, 'actual_consumption');
      const carbonFootprintSeries = buildLocationSeries(carbonFootprintData, timeframe, true, 'actual_carbon_kg');
      const powerConsumptionSeries = buildLocationSeries(powerConsumptionData, timeframe, false, 'total_consumption');
      
      // Hourly series
      let hourlyUsageSeries = [];
      if (hourlyUsageData && hourlyUsageData.length > 0) {
        if (timeframe === 'daily') {
          const hourMap = new Map();
          hourlyUsageData.forEach(item => {
            const timestamp = item.period || item.recorded_at || item.timestamp;
            if (timestamp) {
              const localHour = moment(timestamp).hour();
              const key = localHour.toString().padStart(2, "0");
              const consumption = safeNumber(item.total_consumption || item.total_power_consumption || item.usage || 0, 0);
              hourMap.set(key, (hourMap.get(key) || 0) + consumption);
            }
          });
          hourlyUsageSeries = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, "0")}:00`,
            usage: hourMap.get(i.toString().padStart(2, "0")) || 0
          }));
        } else {
          hourlyUsageSeries = hourlyUsageData.map(item => ({
            hour: formatTimestamp(item.period || item.recorded_at, timeframe),
            usage: safeNumber(item.total_consumption || item.usage || 0, 0)
          }));
        }
      }

      // Summary table - moved below location info bar
      const summaryHeight = 64;
      let summaryY = infoBarY + infoBarHeight + 4;
      
      if (summaryY + summaryHeight > pageHeight - 5) {
        pdf.addPage();
        summaryY = 15;
        pdf.setFillColor(249, 250, 251);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
      }

      drawCard(pdf, marginX, summaryY, pageWidth - marginX * 2, summaryHeight, "Location Performance Summary");

      // Check if we have actual location‑level data, aligned with what charts display.
      // If the series used for charts are empty, treat it as "no data available"
      // even if baselines exist.
      const hasEnergyData =
        (powerConsumptionSeries && powerConsumptionSeries.length > 0) ||
        (energySavedSeries && energySavedSeries.length > 0);

      const hasCarbonData =
        carbonFootprintSeries && carbonFootprintSeries.length > 0;

      const hasHourlyData =
        hourlyUsageSeries && hourlyUsageSeries.length > 0;
      const hasLocationLevelData = hasEnergyData || hasCarbonData || hasHourlyData;
      
      // Summary table data
      const savingsPercentage = baseline > 0 ? ((saved / baseline) * 100) : 0;
      const carbonSavingsPercentage = carbonBaseline > 0 ? ((carbonSaved / carbonBaseline) * 100) : 0;
      const activePercentage = (activeConsumption + inactiveConsumption) > 0 ? ((activeConsumption / (activeConsumption + inactiveConsumption)) * 100) : 0;

      const maxDemand = hasHourlyData ? Math.max(...hourlyUsageData.map(item => safeNumber(item.total_consumption || 0, 0))) : 0;
      let peakWindow = "—";
      if (hasHourlyData && timeframe === 'daily') {
        const maxItem = hourlyUsageData.reduce((max, item) => {
          const consumption = safeNumber(item.total_consumption || 0, 0);
          const maxConsumption = safeNumber(max.total_consumption || 0, 0);
          return consumption > maxConsumption ? item : max;
        }, hourlyUsageData[0]);
        if (maxItem.period || maxItem.recorded_at) {
          const time = moment(maxItem.period || maxItem.recorded_at).format('HH:mm');
          const endTime = moment(maxItem.period || maxItem.recorded_at).add(1, 'hour').format('HH:mm');
          peakWindow = `${time} - ${endTime}`;
        }
      }

      // Calculate total configured devices for location summary
      const totalDevices = 
        (Array.isArray(deviceData.iATM) ? deviceData.iATM.filter(isConfiguredDevice).length : 0) +
        neonDevices.length +
        lightDevices.length;
      const totalDevicesDisplay = hasLocationLevelData && totalDevices > 0
        ? `${totalDevices} Units`
        : "No data available";

      // Helper function to format value or show "No data available"
      const formatValueOrNA = (value, hasData, unit = "") => {
        if (!hasData && value === 0) return "No data available";
        return `${formatFixed(value, 2)}${unit ? ` ${unit}` : ""}`;
      };

      const rows = [
        { metric: "Energy", 
          value: formatValueOrNA(totalConsumption, hasEnergyData, "kWh"), 
          baseline: formatValueOrNA(baseline, hasEnergyData, "kWh"), 
          saved: formatValueOrNA(saved, hasEnergyData, "kWh"), 
          // For negative savings (over‑consumption), mark status and color red
          status: hasEnergyData
            ? savingsPercentage > 0
              ? `${formatFixed(savingsPercentage, 1)}% Saved`
              : savingsPercentage < 0
                ? `${formatFixed(Math.abs(savingsPercentage), 1)}% Over Baseline`
                : "No Savings"
            : "No data available",
          color: !hasEnergyData
            ? [107, 114, 128]
            : savingsPercentage > 0
              ? [16, 185, 129] // green
              : savingsPercentage < 0
                ? [220, 38, 38] // red
                : [107, 114, 128],
          savedValue: hasEnergyData ? saved : 0 },
        { metric: "Carbon", 
          value: formatValueOrNA(totalCarbonEmission, hasCarbonData, "kg"), 
          baseline: formatValueOrNA(carbonBaseline, hasCarbonData, "kg"), 
          saved: formatValueOrNA(carbonSaved, hasCarbonData, "kg"), 
          status: hasCarbonData
            ? carbonSavingsPercentage > 0
              ? `${formatFixed(carbonSavingsPercentage, 1)}% Saved`
              : carbonSavingsPercentage < 0
                ? `${formatFixed(Math.abs(carbonSavingsPercentage), 1)}% Over Baseline`
                : "No Savings"
            : "No data available",
          color: !hasCarbonData
            ? [107, 114, 128]
            : carbonSavingsPercentage > 0
              ? [16, 185, 129]
              : carbonSavingsPercentage < 0
                ? [220, 38, 38]
                : [107, 114, 128],
          savedValue: hasCarbonData ? carbonSaved : 0 },
        { metric: "Active Hours", 
          value: formatValueOrNA(activeConsumption, hasHourlyData, "kWh"), 
          baseline: "—", 
          saved: "—", 
          status: hasHourlyData ? `${formatFixed(activePercentage, 1)}% of Total` : "No data available", 
          color: [16, 185, 129] },
        { metric: "Inactive Hours", 
          value: formatValueOrNA(inactiveConsumption, hasHourlyData, "kWh"), 
          baseline: "—", 
          saved: "—", 
          status: hasHourlyData ? `${formatFixed(100 - activePercentage, 1)}% of Total` : "No data available", 
          color: [107, 114, 128] },
        { metric: "Max Demand", 
          value: formatValueOrNA(maxDemand, hasHourlyData, "kWh"), 
          baseline: "—", 
          saved: "—", 
          status: hasHourlyData && timeframe === 'daily' ? peakWindow : (hasHourlyData ? "—" : "No data available"), 
          color: [17, 24, 39] },
        { metric: "Total Devices", 
          value: totalDevicesDisplay, 
          baseline: "—", 
          saved: "—", 
          status: "—", 
          color: [17, 24, 39] }
      ];

      // Draw table
      const tableWidth = pageWidth - marginX * 2 - 8;
      const tableX = marginX + 4;
      const tableStartY = summaryY + 10;
      const col1Width = tableWidth * 0.20;
      const col2Width = tableWidth * 0.20;
      const col3Width = tableWidth * 0.20;
      const col4Width = tableWidth * 0.18;
      const rowHeight = 7.5;

      pdf.setFillColor(243, 244, 246);
      pdf.rect(tableX, tableStartY, tableWidth, rowHeight, "F");
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.rect(tableX, tableStartY, tableWidth, rowHeight + (rowHeight * 6), "D");

      const headers = ["METRIC", "VALUE", "BASELINE", "SAVED", "STATUS"];
      const colPositions = [tableX + col1Width, tableX + col1Width + col2Width, tableX + col1Width + col2Width + col3Width, 
                            tableX + col1Width + col2Width + col3Width + col4Width];
      const colWidths = [col1Width, col2Width, col3Width, col4Width, tableWidth - col1Width - col2Width - col3Width - col4Width];
      
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(75, 85, 99);
      headers.forEach((header, index) => {
        const colX = index === 0 ? tableX : colPositions[index - 1];
        const centerX = colX + colWidths[index] / 2;
        safeText(pdf, header, centerX, tableStartY + 5, { align: "center" });
        if (index > 0) pdf.line(colPositions[index - 1], tableStartY, colPositions[index - 1], tableStartY + rowHeight + (rowHeight * 6));
      });
      
      pdf.line(tableX, tableStartY + rowHeight, tableX + tableWidth, tableStartY + rowHeight);

      pdf.setFontSize(7);
      let rowY = tableStartY + rowHeight;
      rows.forEach((row, rowIndex) => {
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(tableX, rowY, tableWidth, rowHeight, "F");
        }
        
        // Metric label
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(17, 24, 39);
        safeText(pdf, row.metric, tableX + col1Width / 2, rowY + 5, { align: "center" });
        
        // Values (value, baseline, saved)
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(75, 85, 99);
        safeText(pdf, row.value, tableX + col1Width + col2Width / 2, rowY + 5, { align: "center" });
        safeText(pdf, row.baseline, tableX + col1Width + col2Width + col3Width / 2, rowY + 5, { align: "center" });

        // Saved column coloring: green if positive, red if negative
        if (typeof row.savedValue === "number" && row.savedValue !== 0) {
          if (row.savedValue < 0) {
            pdf.setTextColor(220, 38, 38); // red
          } else {
            pdf.setTextColor(22, 163, 74); // green
          }
        } else {
          pdf.setTextColor(75, 85, 99);
        }
        safeText(pdf, row.saved, tableX + col1Width + col2Width + col3Width + col4Width / 2, rowY + 5, { align: "center" });
        
        // Status column uses row.color
        pdf.setTextColor(row.color[0], row.color[1], row.color[2]);
        const col5Width = tableWidth - col1Width - col2Width - col3Width - col4Width;
        safeText(pdf, row.status, tableX + col1Width + col2Width + col3Width + col4Width + col5Width / 2, rowY + 5, { align: "center" });
        
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.2);
        pdf.line(tableX, rowY + rowHeight, tableX + tableWidth, rowY + rowHeight);
        
        rowY += rowHeight;
      });

      // Create charts
      const locationEnergySavedChart = energySavedSeries.length > 0 ? createEnergyChart(energySavedSeries, baseline) : null;
      const locationCarbonFootprintChart = carbonFootprintSeries.length > 0 ? createCO2Chart(carbonFootprintSeries, carbonBaseline) : null;
      const locationPowerChart = powerConsumptionSeries.length > 0 ? createPowerConsumptionChart(powerConsumptionSeries) : null;
      const locationHourlyChart = hourlyUsageSeries.length > 0 ? createHourlyUsageChart(hourlyUsageSeries, timeframe) : null;

      // Draw charts layout - positioned below summary table
      const chartBoxHeight = 60;
      const chartBoxWidth = (pageWidth - marginX * 2 - 4) / 2;
      let currentY = summaryY + summaryHeight + 4;

      // Row 1: Power Consumption (Full Width) - moved to top
      if (locationPowerChart && powerConsumptionSeries.length > 0) {
        drawCard(pdf, marginX, currentY, pageWidth - marginX * 2, chartBoxHeight, "Power Consumption");
        
        const totalPower = totalPowerConsumption || powerConsumptionSeries.reduce((sum, item) => sum + (item.actual || 0), 0);
        pdf.setFontSize(5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, `Total: ${formatFixed(totalPower, 2)} kWh`, 
          pageWidth - marginX - 4, currentY + 6.5, { align: "right" });
        
        pdf.addImage(locationPowerChart, "PNG", marginX + 4, currentY + 11, pageWidth - marginX * 2 - 8, chartBoxHeight - 14);
        currentY += chartBoxHeight + 2;
      } else {
        // Show "No data available" message for Power Consumption
        drawCard(pdf, marginX, currentY, pageWidth - marginX * 2, chartBoxHeight, "Power Consumption");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No data available for the selected timeframe", pageWidth / 2, currentY + chartBoxHeight / 2, { align: "center" });
        currentY += chartBoxHeight + 2;
      }

      // Row 2: Energy Saved | Carbon Footprint (side by side)
      if (locationEnergySavedChart || locationCarbonFootprintChart) {
        if (locationEnergySavedChart) {
          drawCard(pdf, marginX, currentY, chartBoxWidth, chartBoxHeight, "Energy Saved vs Baseline");
          pdf.setFontSize(5.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, `${formatFixed(totalConsumption, 2)} kWh | BL: ${formatFixed(baseline, 2)} kWh | Saved: ${formatFixed(saved, 2)} kWh`, 
            marginX + chartBoxWidth - 4, currentY + 6.5, { align: "right" });
          pdf.addImage(locationEnergySavedChart, "PNG", marginX + 4, currentY + 11, chartBoxWidth - 8, chartBoxHeight - 14);
        } else {
          // Show "No data available" for Energy Saved
          drawCard(pdf, marginX, currentY, chartBoxWidth, chartBoxHeight, "Energy Saved vs Baseline");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No data available", marginX + chartBoxWidth / 2, currentY + chartBoxHeight / 2, { align: "center" });
        }

        if (locationCarbonFootprintChart) {
          const carbonChartX = marginX + chartBoxWidth + 4;
          drawCard(pdf, carbonChartX, currentY, chartBoxWidth, chartBoxHeight, "Carbon Footprint vs Baseline");
          pdf.setFontSize(5.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, `${formatFixed(totalCarbonEmission, 2)} kg | BL: ${formatFixed(carbonBaseline, 2)} kg`, 
            carbonChartX + chartBoxWidth - 4, currentY + 6.5, { align: "right" });
          pdf.addImage(locationCarbonFootprintChart, "PNG", carbonChartX + 4, currentY + 11, chartBoxWidth - 8, chartBoxHeight - 14);
        } else {
          // Show "No data available" for Carbon Footprint
          const carbonChartX = marginX + chartBoxWidth + 4;
          drawCard(pdf, carbonChartX, currentY, chartBoxWidth, chartBoxHeight, "Carbon Footprint vs Baseline");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No data available", carbonChartX + chartBoxWidth / 2, currentY + chartBoxHeight / 2, { align: "center" });
        }

        currentY += chartBoxHeight + 2;
      } else {
        // Show both cards with "No data available" if neither has data
        drawCard(pdf, marginX, currentY, chartBoxWidth, chartBoxHeight, "Energy Saved vs Baseline");
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No data available", marginX + chartBoxWidth / 2, currentY + chartBoxHeight / 2, { align: "center" });
        
        const carbonChartX = marginX + chartBoxWidth + 4;
        drawCard(pdf, carbonChartX, currentY, chartBoxWidth, chartBoxHeight, "Carbon Footprint vs Baseline");
        safeText(pdf, "No data available", carbonChartX + chartBoxWidth / 2, currentY + chartBoxHeight / 2, { align: "center" });
        currentY += chartBoxHeight + 2;
      }

      // Row 3: Hourly Usage
      if (locationHourlyChart && hourlyUsageSeries.length > 0) {
        const hourlyTitle = timeframe === 'daily' ? 'Hourly Usage' : timeframe === 'monthly' ? 'Daily Usage' : 
                            timeframe === 'yearly' ? 'Monthly Usage' : 'Usage Over Time';
        drawCard(pdf, marginX, currentY, pageWidth - marginX * 2, chartBoxHeight, hourlyTitle);
        const totalUsage = hourlyUsageSeries.reduce((sum, item) => sum + (item.usage || 0), 0);
        const avgUsage = hourlyUsageSeries.length > 0 ? totalUsage / hourlyUsageSeries.length : 0;
        const maxUsage = Math.max(...hourlyUsageSeries.map(d => d.usage || 0));
        pdf.setFontSize(5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, `Total: ${formatFixed(totalUsage, 2)} kWh | Avg: ${formatFixed(avgUsage, 2)} kWh | Max: ${formatFixed(maxUsage, 2)} kWh`, 
          pageWidth - marginX - 4, currentY + 6.5, { align: "right" });
        pdf.addImage(locationHourlyChart, "PNG", marginX + 4, currentY + 11, pageWidth - marginX * 2 - 8, chartBoxHeight - 14);
        currentY += chartBoxHeight + 2;
      } else {
        // Show "No data available" for Hourly Usage
        const hourlyTitle = timeframe === 'daily' ? 'Hourly Usage' : timeframe === 'monthly' ? 'Daily Usage' : 
                            timeframe === 'yearly' ? 'Monthly Usage' : 'Usage Over Time';
        drawCard(pdf, marginX, currentY, pageWidth - marginX * 2, chartBoxHeight, hourlyTitle);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No data available for the selected timeframe", pageWidth / 2, currentY + chartBoxHeight / 2, { align: "center" });
        currentY += chartBoxHeight + 2;
      }

      // Footer Page 1 - Update based on whether devices exist
      const footerY = pageHeight - 7;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);
      pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128);
      
      // Decide if we show a device page:
      // Only show Page 2 when BOTH location‑level data and device‑level data exist
      // for the selected date/timeframe. If there is no location data, keep the report
      // to a single page and skip device information entirely.
      const showDevicePage = hasLocationLevelData && hasDeviceData;
      const totalPages = showDevicePage ? 2 : 1;
      safeText(pdf, `i-EMS Location Dashboard - Page 1 of ${totalPages}`, pageWidth / 2, footerY, { align: "center" });

      // ============= PAGE 2: DEVICE INFORMATION =============
      // Page 2 logic
      if (showDevicePage) {
        pdf.addPage();
        pdf.setFillColor(249, 250, 251);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");

        // Header Page 2
        try {
          pdf.addImage(buildIntLogo, 'PNG', marginX + 2, 6, 8, 8);
        } catch (err) {
          console.warn('Could not load logo:', err);
        }

        pdf.setFontSize(16);
        pdf.setTextColor(16, 185, 129);
        pdf.setFont("helvetica", "bold");
        safeText(pdf, "Device Information Report", marginX + 13, 10);

        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont("helvetica", "normal");
        safeText(pdf, `${locationData.loc_name || "Location"} - All Connected Devices`, marginX + 13, 16);

        pdf.setFontSize(7);
        safeText(pdf, timestamp, pageWidth - marginX - 2, 10, { align: "right" });

        let deviceY = 24;
        const cardSpacing = 3;
        const deviceCardHeight = 35;

        // Device Summary Card
        drawCard(pdf, marginX, deviceY, pageWidth - marginX * 2, 20, "Device Summary");
        
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(75, 85, 99);
        
        // Build device summary but only show types with count > 0 (except Total Devices)
        const rawDeviceSummary = [
          ["Total Devices", totalDevices],
          ["iATM Devices", deviceData.iATM?.filter(isConfiguredDevice).length || 0],
          ["Neon Devices", neonDevices.length || 0],
          ["LiBi Devices", lightDevices.length || 0],
        ];

        const deviceSummary = rawDeviceSummary.filter(([label, count], idx) => {
          if (idx === 0) return true; // always keep Total Devices
          return safeNumber(count, 0) > 0;
        });

        const summaryStartX = marginX + 4;
        const summaryItemWidth = deviceSummary.length > 0
          ? (pageWidth - marginX * 2 - 8) / deviceSummary.length
          : 0;
        
        deviceSummary.forEach(([label, count], index) => {
          const x = summaryStartX + summaryItemWidth * index;
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, label, x, deviceY + 12);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(16, 185, 129);
          safeText(pdf, String(count), x, deviceY + 17);
          pdf.setFontSize(7);
        });

        deviceY += 20 + cardSpacing;

        // If no device data for this timeframe, show a message and exit early
        if (!hasDeviceData) {
          const msgCardHeight = 32;
          drawCard(pdf, marginX, deviceY, pageWidth - marginX * 2, msgCardHeight, "Device Data");
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          const msg = hasConfiguredDevices
            ? "No device data available for the selected timeframe (devices not installed/active yet)"
            : "No devices installed for the selected timeframe";
          safeText(pdf, msg, pageWidth / 2, deviceY + msgCardHeight / 2, { align: "center" });

          // Footer Page 2
          const footer2Y = pageHeight - 7;
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          pdf.line(marginX, footer2Y - 3, pageWidth - marginX, footer2Y - 3);
          pdf.setFontSize(6);
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, `i-EMS Location Dashboard - Page 2 of ${totalPages}`, pageWidth / 2, footer2Y, { align: "center" });
          return;
        }

        // ========= AC (Neon) SECTION =========
        const acRows = acMetrics.filter(Boolean);
        if (acRows.length > 0) {
          const dataRowHeight = 7;
          const tableHeight = 14 + (acRows.length + 2) * dataRowHeight; // +1 for header, +1 for totals
          if (deviceY + tableHeight > pageHeight - 10) {
            pdf.addPage();
            deviceY = 15;
            pdf.setFillColor(249, 250, 251);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");
          }

          drawCard(pdf, marginX, deviceY, pageWidth - marginX * 2, tableHeight, "AC Devices (Neon)");

          const tableX = marginX + 4;
          const tableY = deviceY + 10;
          const tableWidth = pageWidth - marginX * 2 - 8;
          const col1Width = tableWidth * 0.30; // Device
          const colWidth = (tableWidth - col1Width) / 5; // 5 metric columns
          const headerRowHeight = 7;

          const headersAC = ["Device", "Consumption", "Baseline", "Saved", "Active", "Inactive"];

          pdf.setFontSize(6.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(75, 85, 99);

          headersAC.forEach((header, index) => {
            const colX =
              index === 0
                ? tableX
                : tableX + col1Width + (index - 1) * colWidth;
            const width = index === 0 ? col1Width : colWidth;
            const centerX = colX + width / 2;
            safeText(pdf, header, centerX, tableY + 4, { align: "center" });
          });

          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.3);
          pdf.line(tableX, tableY + headerRowHeight, tableX + tableWidth, tableY + headerRowHeight);

          pdf.setFontSize(6.5);
          let rowY = tableY + headerRowHeight;
          // Per‑device rows
          acRows.forEach((row, index) => {
            if (index % 2 === 1) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(tableX, rowY, tableWidth, dataRowHeight, "F");
            }

            const cells = [
              row.name,
              `${formatFixed(row.consumption, 2)} kWh`,
              `${formatFixed(row.baseline, 2)} kWh`,
              `${formatFixed(row.saved, 2)} kWh`,
              `${formatFixed(row.active, 2)} kWh`,
              `${formatFixed(row.inactive, 2)} kWh`,
            ];

            cells.forEach((text, idx) => {
              const colX =
                idx === 0
                  ? tableX
                  : tableX + col1Width + (idx - 1) * colWidth;
              const width = idx === 0 ? col1Width : colWidth;
              const centerX = colX + width / 2;

              pdf.setFont("helvetica", idx === 0 ? "bold" : "normal");

              // Saved column coloring: green for positive, red for negative
              if (idx === 3) {
                if (row.saved < 0) {
                  pdf.setTextColor(220, 38, 38); // red
                } else if (row.saved > 0) {
                  pdf.setTextColor(22, 163, 74); // green
                } else {
                  pdf.setTextColor(55, 65, 81);
                }
              } else {
                pdf.setTextColor(idx === 0 ? 17 : 55, idx === 0 ? 24 : 65, idx === 0 ? 39 : 85);
              }

              safeText(pdf, text, centerX, rowY + 4, { align: "center" });
            });

            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.2);
            pdf.line(tableX, rowY + dataRowHeight, tableX + tableWidth, rowY + dataRowHeight);

            rowY += dataRowHeight;
          });

          // Totals row
          const totalAc = acRows.reduce(
            (acc, r) => ({
              consumption: acc.consumption + (r.consumption || 0),
              baseline: acc.baseline + (r.baseline || 0),
              saved: acc.saved + (r.saved || 0),
              active: acc.active + (r.active || 0),
              inactive: acc.inactive + (r.inactive || 0),
            }),
            { consumption: 0, baseline: 0, saved: 0, active: 0, inactive: 0 }
          );

          pdf.setFillColor(243, 244, 246);
          pdf.rect(tableX, rowY, tableWidth, dataRowHeight, "F");

          const totalCells = [
            "Total",
            `${formatFixed(totalAc.consumption, 2)} kWh`,
            `${formatFixed(totalAc.baseline, 2)} kWh`,
            `${formatFixed(totalAc.saved, 2)} kWh`,
            `${formatFixed(totalAc.active, 2)} kWh`,
            `${formatFixed(totalAc.inactive, 2)} kWh`,
          ];

          totalCells.forEach((text, idx) => {
            const colX =
              idx === 0
                ? tableX
                : tableX + col1Width + (idx - 1) * colWidth;
            const width = idx === 0 ? col1Width : colWidth;
            const centerX = colX + width / 2;

            pdf.setFont("helvetica", "bold");

            if (idx === 3) {
              if (totalAc.saved < 0) {
                pdf.setTextColor(220, 38, 38);
              } else if (totalAc.saved > 0) {
                pdf.setTextColor(22, 163, 74);
              } else {
                pdf.setTextColor(55, 65, 81);
              }
            } else {
              pdf.setTextColor(15, 23, 42);
            }

            safeText(pdf, text, centerX, rowY + 4, { align: "center" });
          });

          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          pdf.line(tableX, rowY + dataRowHeight, tableX + tableWidth, rowY + dataRowHeight);

          rowY += dataRowHeight;

          deviceY += tableHeight + cardSpacing;
        }

        // ========= LIGHT (LIB / 3P‑LIB) SECTION =========
        const lightRows = lightMetrics.filter(Boolean);
        if (lightRows.length > 0) {
          const dataRowHeight = 7;
          const tableHeight = 14 + (lightRows.length + 2) * dataRowHeight;
          if (deviceY + tableHeight > pageHeight - 10) {
            pdf.addPage();
            deviceY = 15;
            pdf.setFillColor(249, 250, 251);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");
          }

          drawCard(pdf, marginX, deviceY, pageWidth - marginX * 2, tableHeight, "Light Devices (LiBi)");

          const tableX = marginX + 4;
          const tableY = deviceY + 10;
          const tableWidth = pageWidth - marginX * 2 - 8;
          const col1Width = tableWidth * 0.30;
          const colWidth = (tableWidth - col1Width) / 5;
          const headerRowHeight = 7;

          const headersLights = ["Device", "Consumption", "Baseline", "Saved", "Active", "Inactive"];

          pdf.setFontSize(6.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(75, 85, 99);

          headersLights.forEach((header, index) => {
            const colX =
              index === 0
                ? tableX
                : tableX + col1Width + (index - 1) * colWidth;
            const width = index === 0 ? col1Width : colWidth;
            const centerX = colX + width / 2;
            safeText(pdf, header, centerX, tableY + 4, { align: "center" });
          });

          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.3);
          pdf.line(tableX, tableY + headerRowHeight, tableX + tableWidth, tableY + headerRowHeight);

          pdf.setFontSize(6.5);
          let rowY = tableY + headerRowHeight;
          // Per‑device rows
          lightRows.forEach((row, index) => {
            if (index % 2 === 1) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(tableX, rowY, tableWidth, dataRowHeight, "F");
            }

            const cells = [
              row.name,
              `${formatFixed(row.consumption, 2)} kWh`,
              `${formatFixed(row.baseline, 2)} kWh`,
              `${formatFixed(row.saved, 2)} kWh`,
              `${formatFixed(row.active, 2)} kWh`,
              `${formatFixed(row.inactive, 2)} kWh`,
            ];

            cells.forEach((text, idx) => {
              const colX =
                idx === 0
                  ? tableX
                  : tableX + col1Width + (idx - 1) * colWidth;
              const width = idx === 0 ? col1Width : colWidth;
              const centerX = colX + width / 2;

              pdf.setFont("helvetica", idx === 0 ? "bold" : "normal");

              if (idx === 3) {
                if (row.saved < 0) {
                  pdf.setTextColor(220, 38, 38);
                } else if (row.saved > 0) {
                  pdf.setTextColor(22, 163, 74);
                } else {
                  pdf.setTextColor(55, 65, 81);
                }
              } else {
                pdf.setTextColor(idx === 0 ? 17 : 55, idx === 0 ? 24 : 65, idx === 0 ? 39 : 85);
              }

              safeText(pdf, text, centerX, rowY + 4, { align: "center" });
            });

            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.2);
            pdf.line(tableX, rowY + dataRowHeight, tableX + tableWidth, rowY + dataRowHeight);

            rowY += dataRowHeight;
          });

          // Totals row for Lights
          const totalLight = lightRows.reduce(
            (acc, r) => ({
              consumption: acc.consumption + (r.consumption || 0),
              baseline: acc.baseline + (r.baseline || 0),
              saved: acc.saved + (r.saved || 0),
              active: acc.active + (r.active || 0),
              inactive: acc.inactive + (r.inactive || 0),
            }),
            { consumption: 0, baseline: 0, saved: 0, active: 0, inactive: 0 }
          );

          pdf.setFillColor(243, 244, 246);
          pdf.rect(tableX, rowY, tableWidth, dataRowHeight, "F");

          const totalCellsLight = [
            "Total",
            `${formatFixed(totalLight.consumption, 2)} kWh`,
            `${formatFixed(totalLight.baseline, 2)} kWh`,
            `${formatFixed(totalLight.saved, 2)} kWh`,
            `${formatFixed(totalLight.active, 2)} kWh`,
            `${formatFixed(totalLight.inactive, 2)} kWh`,
          ];

          totalCellsLight.forEach((text, idx) => {
            const colX =
              idx === 0
                ? tableX
                : tableX + col1Width + (idx - 1) * colWidth;
            const width = idx === 0 ? col1Width : colWidth;
            const centerX = colX + width / 2;

            pdf.setFont("helvetica", "bold");

            if (idx === 3) {
              if (totalLight.saved < 0) {
                pdf.setTextColor(220, 38, 38);
              } else if (totalLight.saved > 0) {
                pdf.setTextColor(22, 163, 74);
              } else {
                pdf.setTextColor(55, 65, 81);
              }
            } else {
              pdf.setTextColor(15, 23, 42);
            }

            safeText(pdf, text, centerX, rowY + 4, { align: "center" });
          });

          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          pdf.line(tableX, rowY + dataRowHeight, tableX + tableWidth, rowY + dataRowHeight);

          rowY += dataRowHeight;

          deviceY += tableHeight + cardSpacing;
        }

        // Footer Page 2
        const footer2Y = pageHeight - 7;
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.2);
        pdf.line(marginX, footer2Y - 3, pageWidth - marginX, footer2Y - 3);
        pdf.setFontSize(6);
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, `i-EMS Location Dashboard - Page 2 of ${totalPages}`, pageWidth / 2, footer2Y, { align: "center" });
      }

      // Save PDF
      const fileName = `Location_${locationData.loc_name || locationId}_Report_${moment().format("YYYYMMDD_HHmm")}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error("Error generating location PDF report:", err);
      alert(`Failed to generate location report PDF: ${err?.message || "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating || disabled}
      className={`flex items-center gap-2 px-2 py-1 rounded-lg font-medium transition-all transform ${
        disabled
          ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-60"
          : isGenerating
          ? "bg-red-700 text-gray-300 cursor-wait"
          : "bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800 text-white shadow-xl hover:scale-105 active:scale-100 cursor-pointer"
      }`}
      title={
        disabled
          ? "Report available only in Dashboard tab"
          : "Download Location Report (PDF)"
      }
    >
      {isGenerating ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>PDF</span>
        </>
      )}
    </button>
  );
};

export default LocationDashboardPDFReport;
