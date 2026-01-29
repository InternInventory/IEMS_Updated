import React, { useState } from "react";
import jsPDF from "jspdf";
import moment from "moment";
import {
  fetchDashboardAPIs,
  safeNumber,
  formatFixed,
} from "../../services/pdfService";
import { safeText } from "../../utils/pdfCharts";
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

// Register Chart.js components
ChartJS.register(
  ArcElement, LineElement, PointElement, BarElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
  PieController, LineController, BarController
);

/**
 * HELPER FUNCTIONS - Consolidated for code reuse
 */

// Create Chart.js chart with common configuration
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

// Common chart options generator
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

// Draw card with header
const drawCard = (pdf, x, y, width, height, title, alignLeft = false) => {
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(x, y, width, height, 3, 3, "FD");
  
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(x, y, width, 9, 3, 3, "F");
  
  pdf.setFontSize(8);
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  if (alignLeft) {
    safeText(pdf, title, x + 4, y + 6.5);
  } else {
    safeText(pdf, title, x + width / 2, y + 6.5, { align: "center" });
  }
};

// Format timestamp for charts
const formatTimestamp = (timestamp, timeframe, index) => {
  if (!timestamp) return String(index + 1);
  try {
    let format;
    if (timeframe === "yearly") {
      format = "MMM YYYY";
    } else if (timeframe === "monthly") {
      format = "DD MMM";
    } else if (timeframe === "custom") {
      format = "DD MMM YYYY";
    } else {
      // daily
      format = "HH:mm";
    }
    const parsed = moment(timestamp);
    if (parsed.isValid()) {
      return parsed.format(format);
    }
    return String(index + 1);
  } catch (e) {
    console.error("Timestamp formatting error:", e);
    return String(index + 1);
  }
};

/**
 * CHART CREATION FUNCTIONS
 */
const createPieChart = (activeValue, inactiveValue) => createChart('pie', {
  labels: ['Active Hours', 'Inactive Hours'],
  datasets: [{
    data: [activeValue || 75, inactiveValue || 25],
    backgroundColor: ['#10b981', '#e5e7eb'],
    borderColor: '#ffffff',
    borderWidth: 2,
  }]
}, {
  width: 800,
  height: 800,
  chartOptions: {
    responsive: false,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } }
  }
});

const createEnergyChart = (data, baseline) => {
  if (!data || data.length === 0) return null;
  // Baseline should be a straight horizontal line (threshold), not cumulative
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
        data: Array(data.length).fill(baseline || 0), // Constant baseline value (horizontal line)
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
    height: 800,
    chartOptions: getChartOptions('Energy Consumption (kWh)', 'Time', 'daily')
  });
};

const createCO2Chart = (data, baseline) => {
  if (!data || data.length === 0) return null;
  // Baseline should be a straight horizontal line (threshold), not cumulative
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
        data: Array(data.length).fill(baseline || 0), // Constant baseline value (horizontal line)
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
    height: 800,
    chartOptions: getChartOptions('Carbon Emission (kg CO2)', 'Time', 'daily')
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
    width: 1600,
    height: 800,
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
    width: 1600,
    height: 800,
    chartOptions: getChartOptions('Power Consumption (kWh)', 'Time', 'daily')
  });
};

// Create donut chart for device distribution and alerts
const createDonutChart = (data, colors) => {
  if (!data || data.length === 0) return null;
  
  const filteredData = data.filter(item => item.value > 0);
  if (filteredData.length === 0) return null;
  
  return createChart('pie', {
    labels: filteredData.map(d => d.name),
    datasets: [{
      data: filteredData.map(d => d.value),
      backgroundColor: filteredData.map((_, i) => colors[i % colors.length]),
      borderColor: '#ffffff',
      borderWidth: 3,
    }]
  }, {
    width: 1000,
    height: 1000,
    chartOptions: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: { 
        legend: { 
          display: false, // Remove legend/indicators as requested
          position: 'right',
          labels: {
            font: { size: 14, family: 'Helvetica', weight: 'bold' },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        }, 
        tooltip: { enabled: false } 
      },
      cutout: '60%'
    }
  });
};

/**
 * DATA SERIES BUILDERS
 */
const buildLocationSeries = (dataArray, timeframe, isCumulative, valueField) => {
  if (!dataArray || dataArray.length === 0) return [];
  
  let cumulative = 0;
  
  // Helper to extract value with multiple field fallbacks
  const extractValue = (item, field) => {
    // Try the primary field
    if (item[field] !== undefined && item[field] !== null) {
      return safeNumber(item[field], 0);
    }
    
    // Try common variations based on field type
    if (field === 'power_consumption_kwh') {
      return safeNumber(
        item.power_consumption_kwh ||
        item.current_power_kwh ||
        item.total_power_consumption ||
        item.consumption_kwh ||
        0,
        0
      );
    }
    if (field === 'carbon_emission_kg') {
      return safeNumber(
        item.carbon_emission_kg ||
        item.current_carbon_kg ||
        item.total_carbon_kg ||
        item.carbon_kg ||
        0,
        0
      );
    }
    if (field === 'total_consumption') {
      return safeNumber(
        item.total_consumption ||
        item.total_power_consumption ||
        item.consumption ||
        item.power_consumption_kwh ||
        0,
        0
      );
    }
    
    return safeNumber(item[field] || 0, 0);
  };
  
  if (timeframe === 'daily') {
    const hourMap = new Map();
    dataArray.forEach(item => {
      const timestamp = item.period || item.recorded_at;
      if (timestamp) {
        const hourMatch = timestamp.match(/T(\d{2}):/);
        if (hourMatch) {
          const hour = parseInt(hourMatch[1]);
          const existing = hourMap.get(hour) || {};
          // Merge data if multiple entries for same hour
          hourMap.set(hour, {
            ...existing,
            ...item,
            _value: (existing._value || 0) + extractValue(item, valueField)
          });
        }
      }
    });
    
    const lastValidHour = hourMap.size > 0 ? Math.max(...hourMap.keys()) : 23;
    const series = [];
    for (let h = 0; h <= lastValidHour; h++) {
      const item = hourMap.get(h) || {};
      const value = item._value !== undefined ? item._value : extractValue(item, valueField);
      if (isCumulative) cumulative += value;
      series.push({
        label: `${String(h).padStart(2, "0")}:00`,
        actual: isCumulative ? Number(cumulative.toFixed(4)) : value
      });
    }
    return series;
  } else {
    return dataArray.map(item => {
      const value = extractValue(item, valueField);
      if (isCumulative) cumulative += value;
      return {
        label: formatTimestamp(item.period || item.recorded_at, timeframe, 0),
        actual: isCumulative ? Number(cumulative.toFixed(4)) : value
      };
    });
  }
};

/**
 * MAIN COMPONENT
 */
const DashboardPDFReport = ({
  cards = [],
  chartData = null,
  hourlyData = [],
  deviceCounts = {},
  alertData = null,
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
    setIsGenerating(true);

    try {
      // Build filters based on timeframe - handle different date formats properly
      const getFormattedDate = (dateValue) => {
        if (!dateValue) return undefined;
        try {
          // Handle Date object
          if (dateValue instanceof Date) {
            return moment(dateValue).format("YYYY-MM-DD");
          }
          // Handle string dates
          if (typeof dateValue === 'string') {
            // If it's already in YYYY-MM-DD format, return as is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              return dateValue;
            }
            // Try to parse and format
            const parsed = moment(dateValue);
            if (parsed.isValid()) {
              return parsed.format("YYYY-MM-DD");
            }
          }
          return undefined;
        } catch (e) {
          console.error("Date formatting error:", e);
          return undefined;
        }
      };

      const getFormattedMonth = (dateValue) => {
        if (!dateValue) return undefined;
        try {
          // Handle Date object
          if (dateValue instanceof Date) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
          }
          // Handle string - could be YYYY-MM or full date
          if (typeof dateValue === 'string') {
            // If it's already in YYYY-MM format, return as is
            if (/^\d{4}-\d{2}$/.test(dateValue)) {
              return dateValue;
            }
            // Try to parse and extract year-month
            const parsed = moment(dateValue);
            if (parsed.isValid()) {
              return parsed.format("YYYY-MM");
            }
          }
          return undefined;
        } catch (e) {
          console.error("Month formatting error:", e);
          return undefined;
        }
      };

      const getFormattedYear = (dateValue) => {
        if (!dateValue) return undefined;
        try {
          // Handle Date object
          if (dateValue instanceof Date) {
            return dateValue.getFullYear().toString();
          }
          // Handle string - extract year
          if (typeof dateValue === 'string') {
            // If it's already just a year (4 digits), return as is
            if (/^\d{4}$/.test(dateValue)) {
              return dateValue;
            }
            // Try to extract year from date string
            const parsed = moment(dateValue);
            if (parsed.isValid()) {
              return parsed.format("YYYY");
            }
          }
          return undefined;
        } catch (e) {
          console.error("Year formatting error:", e);
          return undefined;
        }
      };

      const filters = {
        timeframe,
        date: timeframe === "daily" ? (getFormattedDate(selectedDate) || moment().format("YYYY-MM-DD")) : undefined,
        month: timeframe === "monthly" ? (getFormattedMonth(selectedDate) || moment().format("YYYY-MM")) : undefined,
        year: timeframe === "yearly" ? (getFormattedYear(selectedDate) || moment().format("YYYY")) : undefined,
        customStartDate: timeframe === "custom" && customStartDate ? getFormattedDate(customStartDate) : undefined,
        customEndDate: timeframe === "custom" && customEndDate ? getFormattedDate(customEndDate) : undefined,
      };

      const apiData = await fetchDashboardAPIs(filters);

      console.log('=== DASHBOARD PDF FILTERS ===', filters);
      console.log('=== DASHBOARD PDF API DATA ===', apiData);
      console.log('=== TIMEFRAME ===', timeframe);
      console.log('=== CARBON DATA LENGTH ===', (apiData.carbon?.detailed_carbon_data || apiData.carbon?.data || []).length);
      console.log('=== POWER DATA LENGTH ===', (apiData.power?.data || apiData.power?.detailed_power_data || []).length);

      // Extract data arrays
      const carbonData = apiData.carbon?.detailed_carbon_data || apiData.carbon?.data || [];
      const powerData = apiData.power?.data || apiData.power?.detailed_power_data || [];
      
      // Extract hourly data from carbon data (matching Dashboard.jsx behavior)
      let hourlyArray = apiData.hourly?.hourly_data || apiData.hourly?.data || hourlyData || [];
      if (hourlyArray.length === 0 && carbonData.length > 0 && timeframe === 'daily') {
        // Process hourly data from carbon data similar to Dashboard.jsx
        hourlyArray = carbonData.map(item => ({
          period: item.period || item.recorded_at,
          total_consumption: safeNumber(item.power_consumption_kwh || item.total_consumption || 0, 0),
          usage: safeNumber(item.power_consumption_kwh || item.total_consumption || 0, 0),
          timestamp: item.period || item.recorded_at
        }));
      }

      // Extract metrics - using correct API response structure
      const totalEnergyKwh = safeNumber(
        apiData.carbon?.current_consumption?.total_power_kwh ||
        apiData.power?.grand_total_consumption ||
        apiData.power?.total_consumption ||
        0
      );
      const baselineEnergyKwh = safeNumber(
        apiData.carbon?.baseline?.total_baseline_kwh ||
        apiData.carbon?.baseline?.baseline_carbon_kg ? 
          (safeNumber(apiData.carbon.baseline.baseline_carbon_kg) / 0.82) : 0, // Convert carbon to power if needed
      apiData.power?.baseline?.total_power_kwh ||
        0
      );
      const totalCarbonKg = safeNumber(
        apiData.carbon?.current_consumption?.total_carbon_kg ||
        apiData.carbon?.current_consumption?.total_carbon_emission?.kg ||
        0
      );
      const baselineCarbonKg = safeNumber(
        apiData.carbon?.baseline?.baseline_carbon_kg ||
        apiData.carbon?.baseline?.daily_baseline_carbon_kg ||
        0
      );
      const energySaved = safeNumber(
        apiData.carbon?.savings?.power_saved_kwh ||
        apiData.carbon?.savings?.power_saved?.kwh ||
        (baselineEnergyKwh - totalEnergyKwh),
        0
      );
    const carbonSaved = safeNumber(
      apiData.carbon?.savings?.carbon_saved_kg ||
        apiData.carbon?.savings?.carbon_saved?.kg ||
        (baselineCarbonKg - totalCarbonKg),
        0
      );

      // Active/Inactive hours - Energy (kWh)
      const activeHoursConsumption = safeNumber(
        apiData.hourly?.active_inactive?.active_hours_consumption ||
        apiData.carbon?.active_inactive?.active_hours_consumption ||
        0
      );
      const inactiveHoursConsumption = safeNumber(
        apiData.hourly?.active_inactive?.inactive_hours_consumption ||
        apiData.carbon?.active_inactive?.inactive_hours_consumption ||
        0
      );

      // Active/Inactive hours - Carbon Emissions (kg CO2)
      const activeHoursCarbon = safeNumber(
        apiData.carbon?.active_inactive?.active_hours_carbon_kg ||
        apiData.hourly?.active_inactive?.active_hours_carbon_kg ||
        0
      );
      const inactiveHoursCarbon = safeNumber(
        apiData.carbon?.active_inactive?.inactive_hours_carbon_kg ||
        apiData.hourly?.active_inactive?.inactive_hours_carbon_kg ||
        0
      );

      // Build chart series with baseline data for Energy Saved vs Baseline
      const buildEnergySavedSeries = (dataArray, timeframe) => {
        if (!dataArray || dataArray.length === 0) return [];
        let cumulativeActual = 0;
        let cumulativeBaseline = 0;
        
        if (timeframe === 'daily') {
          const hourMap = new Map();
          dataArray.forEach(item => {
            const timestamp = item.period || item.recorded_at;
            if (timestamp) {
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const hour = parseInt(hourMatch[1]);
                const existing = hourMap.get(hour) || { actual: 0, baseline: 0 };
                hourMap.set(hour, {
                  actual: existing.actual + safeNumber(item.power_consumption_kwh || item.current_power_kwh || 0, 0),
                  baseline: existing.baseline + safeNumber(item.baseline_kwh || item.baseline_power_kwh || 0, 0)
                });
              }
            }
          });
          
          const lastValidHour = hourMap.size > 0 ? Math.max(...hourMap.keys()) : 23;
          const series = [];
          for (let h = 0; h <= lastValidHour; h++) {
            const item = hourMap.get(h) || { actual: 0, baseline: 0 };
            cumulativeActual += item.actual;
            cumulativeBaseline += item.baseline;
            series.push({
              label: `${String(h).padStart(2, "0")}:00`,
              actual: Number(cumulativeActual.toFixed(4)),
              baseline: Number(cumulativeBaseline.toFixed(4))
            });
          }
          return series;
        } else {
          return dataArray.map(item => {
            const actual = safeNumber(item.power_consumption_kwh || item.current_power_kwh || 0, 0);
            const baseline = safeNumber(item.baseline_kwh || item.baseline_power_kwh || 0, 0);
            cumulativeActual += actual;
            cumulativeBaseline += baseline;
    return {
              label: formatTimestamp(item.period || item.recorded_at, timeframe, 0),
              actual: Number(cumulativeActual.toFixed(4)),
              baseline: Number(cumulativeBaseline.toFixed(4))
            };
          });
        }
      };

      // Build chart series with baseline data for Carbon Emission vs Baseline
      const buildCarbonEmissionSeries = (dataArray, timeframe) => {
        if (!dataArray || dataArray.length === 0) return [];
        let cumulativeActual = 0;
        let cumulativeBaseline = 0;
        
        if (timeframe === 'daily') {
          const hourMap = new Map();
          dataArray.forEach(item => {
            const timestamp = item.period || item.recorded_at;
            if (timestamp) {
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const hour = parseInt(hourMatch[1]);
                const existing = hourMap.get(hour) || { actual: 0, baseline: 0 };
                hourMap.set(hour, {
                  actual: existing.actual + safeNumber(item.carbon_emission_kg || item.current_carbon_kg || 0, 0),
                  baseline: existing.baseline + safeNumber(item.baseline_carbon_kg || 0, 0)
                });
              }
            }
          });
          
          const lastValidHour = hourMap.size > 0 ? Math.max(...hourMap.keys()) : 23;
          const series = [];
          for (let h = 0; h <= lastValidHour; h++) {
            const item = hourMap.get(h) || { actual: 0, baseline: 0 };
            cumulativeActual += item.actual;
            cumulativeBaseline += item.baseline;
            series.push({
              label: `${String(h).padStart(2, "0")}:00`,
              actual: Number(cumulativeActual.toFixed(4)),
              baseline: Number(cumulativeBaseline.toFixed(4))
            });
          }
          return series;
        } else {
          return dataArray.map(item => {
            const actual = safeNumber(item.carbon_emission_kg || item.current_carbon_kg || 0, 0);
            const baseline = safeNumber(item.baseline_carbon_kg || 0, 0);
            cumulativeActual += actual;
            cumulativeBaseline += baseline;
            return {
              label: formatTimestamp(item.period || item.recorded_at, timeframe, 0),
              actual: Number(cumulativeActual.toFixed(4)),
              baseline: Number(cumulativeBaseline.toFixed(4))
            };
          });
        }
      };

      // Build chart series
      const energySavedSeries = buildEnergySavedSeries(carbonData, timeframe);
      const carbonFootprintSeries = buildCarbonEmissionSeries(carbonData, timeframe);
      const powerConsumptionSeries = buildLocationSeries(
        powerData, 
        timeframe, 
        false, 
        'total_consumption' // Field from power data
      );

      // Hourly series - extract from carbon data if hourly array is empty
      let hourlyUsageSeries = [];
      if (hourlyArray.length > 0) {
        if (timeframe === 'daily') {
          const hourMap = new Map();
          hourlyArray.forEach(item => {
            const timestamp = item.period || item.recorded_at || item.timestamp;
            if (timestamp) {
              // Extract hour from timestamp (match Dashboard.jsx behavior)
              const hourMatch = timestamp.match(/T(\d{2}):/);
              if (hourMatch) {
                const key = hourMatch[1];
                const consumption = safeNumber(
                  item.total_consumption || 
                  item.total_power_consumption || 
                  item.usage || 
                  item.power_consumption_kwh ||
                  0, 
                  0
                );
                hourMap.set(key, (hourMap.get(key) || 0) + consumption);
              }
            }
          });
          hourlyUsageSeries = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, "0")}:00`,
            usage: hourMap.get(i.toString().padStart(2, "0")) || 0
          }));
        } else {
          hourlyUsageSeries = hourlyArray.map(item => ({
            hour: formatTimestamp(item.period || item.recorded_at, timeframe, 0),
            usage: safeNumber(item.total_consumption || item.usage || item.power_consumption_kwh || 0, 0)
          }));
        }
      } else if (carbonData.length > 0 && timeframe === 'daily') {
        // Fallback: extract hourly data from carbon data
        const hourMap = new Map();
        carbonData.forEach(item => {
          const timestamp = item.period || item.recorded_at;
          if (timestamp) {
            const hourMatch = timestamp.match(/T(\d{2}):/);
            if (hourMatch) {
              const key = hourMatch[1];
              const consumption = safeNumber(item.power_consumption_kwh || 0, 0);
              hourMap.set(key, (hourMap.get(key) || 0) + consumption);
            }
          }
        });
        hourlyUsageSeries = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}:00`,
          usage: hourMap.get(i.toString().padStart(2, "0")) || 0
        }));
      }

      // Device distribution data
      const deviceTypeMap = {
        iatm: "iATM",
        bigio: "BigIO",
        neon: "Neon",
        lib: "LIB",
        lib_3p: "LIB 3P",
      };
      const deviceColors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];
      const reportDeviceCounts = deviceCounts && Object.keys(deviceCounts).length > 0 
        ? deviceCounts 
        : (apiData.devices?.device_counts || {});
      
      const deviceChartData = Object.entries(reportDeviceCounts)
        .map(([key, count]) => ({
          name: deviceTypeMap[key.toLowerCase()] || key.toUpperCase(),
          value: safeNumber(count, 0),
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      // Alert data
      const reportAlertData = alertData || apiData.alerts?.data || null;
      
      // Alert types data (if available) - check both nested alert_types object and individual fields
      let alertTypesData = [];
      if (reportAlertData?.alert_types && typeof reportAlertData.alert_types === 'object') {
        // If alert_types is a nested object
        alertTypesData = Object.entries(reportAlertData.alert_types)
          .map(([key, value]) => ({
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            value: safeNumber(value, 0)
          }))
          .filter(item => item.value > 0);
      } else if (reportAlertData) {
        // If alert types are individual fields (power_alerts, spike_alerts, etc.)
        alertTypesData = [
          { name: 'Power Alerts', value: safeNumber(reportAlertData.power_alerts || 0, 0) },
          { name: 'Spike Alerts', value: safeNumber(reportAlertData.spike_alerts || 0, 0) },
          { name: 'Offline Alerts', value: safeNumber(reportAlertData.offline_alerts || 0, 0) },
          { name: 'Override Alerts', value: safeNumber(reportAlertData.override_alerts || 0, 0) }
        ].filter(item => item.value > 0);
      }

      // Alert status data
      const alertStatusData = reportAlertData ? [
        { name: 'Open', value: safeNumber(reportAlertData.open_alerts, 0) },
        { name: 'Acknowledged', value: safeNumber(reportAlertData.acknowledged_alerts || 0, 0) },
        { name: 'Closed', value: safeNumber(reportAlertData.closed_alerts, 0) }
      ].filter(item => item.value > 0) : [];

      // Alert colors - separate for types and status
      const alertTypeColors = ["#ef4444", "#f59e0b", "#6366f1", "#ec4899"]; // Power, Spike, Offline, Override
      const alertStatusColors = ["#f59e0b", "#3b82f6", "#10b981"]; // Open (orange), Acknowledged (blue), Closed (green)

      // Create charts
      const energyChartImage = energySavedSeries.length > 0 ? createEnergyChart(energySavedSeries, baselineEnergyKwh) : null;
      const co2ChartImage = carbonFootprintSeries.length > 0 ? createCO2Chart(carbonFootprintSeries, baselineCarbonKg) : null;
      const powerChartImage = powerConsumptionSeries.length > 0 ? createPowerConsumptionChart(powerConsumptionSeries) : null;
      const hourlyUsageChartImage = hourlyUsageSeries.length > 0 ? createHourlyUsageChart(hourlyUsageSeries, timeframe) : null;
      const pieChartImage = createPieChart(activeHoursConsumption || 75, inactiveHoursConsumption || 25);
      const deviceDonutChart = deviceChartData.length > 0 ? createDonutChart(deviceChartData, deviceColors) : null;
      // Create separate charts with proper colors
      const alertTypesDonutChart = alertTypesData.length > 0 ? createDonutChart(alertTypesData, alertTypeColors) : null;
      const alertStatusDonutChart = alertStatusData.length > 0 ? createDonutChart(alertStatusData, alertStatusColors) : null;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;

      // Background
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
      safeText(pdf, "Dashboard Analytics Report", marginX + 13, 10);

      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "normal");
      safeText(pdf, "Comprehensive system overview and energy management insights.", marginX + 13, 16);

      // Generated timestamp (top-right)
      pdf.setFontSize(7);
      const generatedTimestamp = `Generated on ${moment().format("DD MMM YYYY, HH:mm")}`;
      safeText(pdf, generatedTimestamp, pageWidth - marginX - 2, 10, { align: "right" });

      // Reporting period label (top-right, below timestamp)
      const getReportPeriodLabel = () => {
        if (timeframe === "daily" && filters.date) {
          return `Report for: ${moment(filters.date).format("DD MMM YYYY")} (Daily)`;
        }
        if (timeframe === "monthly" && filters.month) {
          return `Report for: ${moment(filters.month, "YYYY-MM").format("MMM YYYY")} (Monthly)`;
        }
        if (timeframe === "yearly" && filters.year) {
          return `Report for: ${filters.year} (Yearly)`;
        }
        if (timeframe === "custom" && filters.customStartDate && filters.customEndDate) {
          const start = moment(filters.customStartDate).format("DD MMM YYYY");
          const end = moment(filters.customEndDate).format("DD MMM YYYY");
          return `Report for: ${start} to ${end}`;
        }
        return "Report period: All available data";
      };
      const periodLabel = getReportPeriodLabel();
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, periodLabel, pageWidth - marginX - 2, 14, { align: "right" });

      // System Summary Cards
      const row1Y = 24;
      const cardWidth = (pageWidth - marginX * 2 - 16) / 5;
      const cardHeight = 30;

      const reportCards = cards && cards.length > 0 ? cards : [
        { label: "No. of Clients", data: apiData.cards?.total_clients || "0" },
        { label: "No. of Locations", data: apiData.cards?.total_locations || "0" },
        { label: "No. of Devices", data: apiData.cards?.total_devices || "0" },
        { label: "No. of Online Devices", data: apiData.cards?.active_locations || "0" },
        { label: "No. of Alerts", data: apiData.cards?.total_alerts || "0" }
      ];

      reportCards.slice(0, 5).forEach((card, i) => {
        const cardX = marginX + (i * (cardWidth + 4));
        drawCard(pdf, cardX, row1Y, cardWidth, cardHeight, card.label || "Metric");

        // Center align card value
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(16, 185, 129);
        safeText(pdf, String(card.data || "0"), cardX + cardWidth / 2, row1Y + 20, { align: "center" });
      });

      // Row 2: Net Power Consumption | Power Consumption (side by side)
      const row2Y = row1Y + cardHeight + 6;
      const chartBoxHeight = 68; // Adjusted to fit on first page
      const totalHoursConsumption = activeHoursConsumption + inactiveHoursConsumption;
      const activePercent = totalHoursConsumption > 0 ? (activeHoursConsumption / totalHoursConsumption) * 100 : 0;
      const inactivePercent = totalHoursConsumption > 0 ? (inactiveHoursConsumption / totalHoursConsumption) * 100 : 0;
      const chartBoxWidth = (pageWidth - marginX * 2 - 4) / 2;

      // Net Power Consumption Card (Left, smaller)
      drawCard(pdf, marginX, row2Y, chartBoxWidth, chartBoxHeight, "Net Power Consumption");

      if (pieChartImage) {
        const pieSize = 35; // Size to fit with labels
        // Center the pie chart vertically and horizontally in the card
        const cardContentHeight = chartBoxHeight - 9; // Subtract header height
        const pieY = row2Y + 9 + (cardContentHeight - pieSize) / 2; // Center vertically
        const pieX = marginX + chartBoxWidth / 2 - pieSize / 2; // Center horizontally
        pdf.addImage(pieChartImage, "PNG", pieX, pieY, pieSize, pieSize);
      }

      // Labels below chart with proper spacing - centered
      const labelY = row2Y + chartBoxHeight - 10;
      pdf.setFontSize(6.5);
      pdf.setFillColor(16, 185, 129);
      pdf.circle(marginX + chartBoxWidth / 2 - 20, labelY, 1.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(17, 24, 39);
      safeText(pdf, "Active", marginX + chartBoxWidth / 2 - 16, labelY + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(16, 185, 129);
      safeText(pdf, `(${formatFixed(activePercent, 0)}%)`, marginX + chartBoxWidth / 2 - 6, labelY + 2);

      pdf.setFillColor(229, 231, 235);
      pdf.circle(marginX + chartBoxWidth / 2 + 8, labelY, 1.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(17, 24, 39);
      safeText(pdf, "Inactive", marginX + chartBoxWidth / 2 + 12, labelY + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, `(${formatFixed(inactivePercent, 0)}%)`, marginX + chartBoxWidth / 2 + 26, labelY + 2);

      // Power Consumption Card (Right, beside Net Power Consumption)
      const powerChartX = marginX + chartBoxWidth + 4;
      if (powerChartImage && powerConsumptionSeries.length > 0) {
        drawCard(pdf, powerChartX, row2Y, chartBoxWidth, chartBoxHeight, "Power Consumption", true);
        
        const totalPower = powerConsumptionSeries.reduce((sum, item) => sum + (item.actual || 0), 0);
      pdf.setFontSize(5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, `Total: ${formatFixed(totalPower, 2)} kWh`, 
          powerChartX + chartBoxWidth - 4, row2Y + 6.5, { align: "right" });
        
        pdf.addImage(powerChartImage, "PNG", powerChartX + 4, row2Y + 10, chartBoxWidth - 8, chartBoxHeight - 12);
      } else {
        drawCard(pdf, powerChartX, row2Y, chartBoxWidth, chartBoxHeight, "Power Consumption", true);
      pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No data available", powerChartX + chartBoxWidth / 2, row2Y + chartBoxHeight / 2, { align: "center" });
      }

      // Row 3: Energy Saved | Carbon Emission (side by side)
      const row3Y = row2Y + chartBoxHeight + 6;
      const chartBoxHeightRow3 = 70; // Adjusted to fit on first page
      // chartBoxWidth already defined above

      const hasEnergyData = energySavedSeries && energySavedSeries.length > 0;
      const hasCarbonData = carbonFootprintSeries && carbonFootprintSeries.length > 0;

      if (energyChartImage || co2ChartImage) {
        if (energyChartImage && hasEnergyData) {
          drawCard(pdf, marginX, row3Y, chartBoxWidth, chartBoxHeightRow3, "Energy Saved vs Baseline", true);
      pdf.setFontSize(5.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, `${formatFixed(totalEnergyKwh, 2)} kWh | BL: ${formatFixed(baselineEnergyKwh, 2)} kWh | Saved: ${formatFixed(energySaved, 2)} kWh`, 
            marginX + chartBoxWidth - 4, row3Y + 6.5, { align: "right" });
          pdf.addImage(energyChartImage, "PNG", marginX + 4, row3Y + 10, chartBoxWidth - 8, chartBoxHeightRow3 - 12);
        } else {
          drawCard(pdf, marginX, row3Y, chartBoxWidth, chartBoxHeightRow3, "Energy Saved vs Baseline", true);
      pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No data available", marginX + chartBoxWidth / 2, row3Y + chartBoxHeightRow3 / 2, { align: "center" });
        }

        if (co2ChartImage && hasCarbonData) {
          const carbonChartX = marginX + chartBoxWidth + 4;
          drawCard(pdf, carbonChartX, row3Y, chartBoxWidth, chartBoxHeightRow3, "Carbon Emission vs Baseline", true);
      pdf.setFontSize(5.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, `${formatFixed(totalCarbonKg, 2)} kg | BL: ${formatFixed(baselineCarbonKg, 2)} kg`, 
            carbonChartX + chartBoxWidth - 4, row3Y + 6.5, { align: "right" });
          pdf.addImage(co2ChartImage, "PNG", carbonChartX + 4, row3Y + 10, chartBoxWidth - 8, chartBoxHeightRow3 - 12);
        } else {
          const carbonChartX = marginX + chartBoxWidth + 4;
          drawCard(pdf, carbonChartX, row3Y, chartBoxWidth, chartBoxHeightRow3, "Carbon Emission vs Baseline", true);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No data available", carbonChartX + chartBoxWidth / 2, row3Y + chartBoxHeightRow3 / 2, { align: "center" });
        }
      } else {
        // Show both cards with "No data available" if neither has data
        drawCard(pdf, marginX, row3Y, chartBoxWidth, chartBoxHeightRow3, "Energy Saved vs Baseline", true);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No data available", marginX + chartBoxWidth / 2, row3Y + chartBoxHeightRow3 / 2, { align: "center" });
        
        const carbonChartX = marginX + chartBoxWidth + 4;
        drawCard(pdf, carbonChartX, row3Y, chartBoxWidth, chartBoxHeightRow3, "Carbon Emission vs Baseline", true);
        safeText(pdf, "No data available", carbonChartX + chartBoxWidth / 2, row3Y + chartBoxHeightRow3 / 2, { align: "center" });
      }

      // Row 4: Hourly Usage (Full Width) - fit on first page
      const row4Y = row3Y + chartBoxHeightRow3 + 6;
      const hourlyChartHeight = 65; // Adjusted to fit on first page
      
      const hasHourlyData = hourlyUsageSeries && hourlyUsageSeries.length > 0;
      if (hourlyUsageChartImage && hasHourlyData) {
        const hourlyTitle = timeframe === 'daily' ? 'Hourly Usage' : timeframe === 'monthly' ? 'Daily Usage' : 
                            timeframe === 'yearly' ? 'Monthly Usage' : 'Usage Over Time';
        drawCard(pdf, marginX, row4Y, pageWidth - marginX * 2, hourlyChartHeight, hourlyTitle, true);
        const totalUsage = hourlyUsageSeries.reduce((sum, item) => sum + (item.usage || 0), 0);
        const avgUsage = hourlyUsageSeries.length > 0 ? totalUsage / hourlyUsageSeries.length : 0;
        const maxUsage = Math.max(...hourlyUsageSeries.map(d => d.usage || 0));
      pdf.setFontSize(5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, `Total: ${formatFixed(totalUsage, 2)} kWh | Avg: ${formatFixed(avgUsage, 2)} kWh | Max: ${formatFixed(maxUsage, 2)} kWh`, 
          pageWidth - marginX - 4, row4Y + 6.5, { align: "right" });
        pdf.addImage(hourlyUsageChartImage, "PNG", marginX + 4, row4Y + 10, pageWidth - marginX * 2 - 8, hourlyChartHeight - 12);
      } else {
        const hourlyTitle = timeframe === 'daily' ? 'Hourly Usage' : timeframe === 'monthly' ? 'Daily Usage' : 
                            timeframe === 'yearly' ? 'Monthly Usage' : 'Usage Over Time';
        drawCard(pdf, marginX, row4Y, pageWidth - marginX * 2, hourlyChartHeight, hourlyTitle, true);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No data available for the selected timeframe", pageWidth / 2, row4Y + hourlyChartHeight / 2, { align: "center" });
      }

      // Add "i-EMS Dashboard Analytics" text at the end of first page with line above
      const footerY = row4Y + hourlyChartHeight + 6;
      // Draw line above the text
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, "i-EMS Dashboard Analytics", pageWidth / 2, footerY, { align: "center" });

      // Check if we need a new page for device distribution and alerts
      let currentY = footerY + 8;
      const bottomSectionHeight = 110; // Increased to accommodate larger charts and indicators
      
      if (currentY + bottomSectionHeight > pageHeight - 15) {
            pdf.addPage();
        currentY = 15;
        pdf.setFillColor(249, 250, 251);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
      }

      // Device Distribution and Summary Section (Top Row)
      const topRowY = currentY;
      const topRowWidth = (pageWidth - marginX * 2 - 4) / 2;
      const topRowHeight = 105; // Height for Device Distribution and Summary cards

      // Device Distribution Card (Top-Left)
      drawCard(pdf, marginX, topRowY, topRowWidth, topRowHeight, "Device Distribution");
      
      if (deviceChartData.length > 0) {
        // Device summary cards
        const totalDevices = deviceChartData.reduce((sum, item) => sum + item.value, 0);
        const deviceTypesCount = deviceChartData.length;
        
        // Center align device summary
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "Total Devices", marginX + topRowWidth / 4, topRowY + 12, { align: "center" });
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(59, 130, 246);
        safeText(pdf, String(totalDevices), marginX + topRowWidth / 4, topRowY + 18, { align: "center" });
        
        pdf.setFontSize(6);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "Device Types", marginX + topRowWidth * 3 / 4, topRowY + 12, { align: "center" });
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(139, 92, 246);
        safeText(pdf, String(deviceTypesCount), marginX + topRowWidth * 3 / 4, topRowY + 18, { align: "center" });

        // Device type cards
        const deviceCardWidth = (topRowWidth - 12) / 4;
        deviceChartData.slice(0, 4).forEach((device, idx) => {
          const deviceCardX = marginX + 4 + (idx * (deviceCardWidth + 1));
          pdf.setFillColor(249, 250, 251);
          pdf.setDrawColor(deviceColors[idx % deviceColors.length]);
        pdf.setLineWidth(0.3);
          pdf.roundedRect(deviceCardX, topRowY + 22, deviceCardWidth, 12, 2, 2, "FD");
          
          pdf.setFontSize(5.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(deviceColors[idx % deviceColors.length]);
          safeText(pdf, device.name, deviceCardX + deviceCardWidth / 2, topRowY + 27, { align: "center" });
          pdf.setFontSize(8);
          pdf.setTextColor(17, 24, 39);
          safeText(pdf, String(device.value), deviceCardX + deviceCardWidth / 2, topRowY + 32, { align: "center" });
        });

        // Device donut chart - centered and larger
        if (deviceDonutChart) {
          const chartSize = 55; // Increased size for better visibility
          const chartX = marginX + topRowWidth / 2 - chartSize / 2;
          const chartY = topRowY + 38;
          pdf.addImage(deviceDonutChart, "PNG", chartX, chartY, chartSize, chartSize);
          
          // Color indicators for Device Distribution (below chart)
          const deviceIndicatorStartY = chartY + chartSize + 4;
          const deviceIndicatorStartX = marginX + topRowWidth / 2 - (deviceChartData.length * 12) / 2;
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(17, 24, 39);
          
          deviceChartData.forEach((device, idx) => {
            const indicatorX = deviceIndicatorStartX + (idx * 12);
            const color = deviceColors[idx % deviceColors.length];
            // Parse hex color to RGB
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            pdf.setFillColor(r, g, b);
            pdf.circle(indicatorX, deviceIndicatorStartY, 1.5, "F");
            pdf.setTextColor(17, 24, 39);
            safeText(pdf, device.name, indicatorX + 3, deviceIndicatorStartY + 1);
          });
        }
      } else {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No device data available", marginX + topRowWidth / 2, topRowY + topRowHeight / 2, { align: "center" });
      }

      // Summary Card (Top-Right) - moved from bottom
      const summaryX = marginX + topRowWidth + 4;
      const summaryCardHeight = topRowHeight; // Same height as Device Distribution
      drawCard(pdf, summaryX, topRowY, topRowWidth, summaryCardHeight, "Summary");

      // Alerts Overview Card (Bottom - Full Width) - declare before use
      const alertsSectionY = topRowY + topRowHeight + 4;
      const alertsCardHeight = 105; // Height for alerts card
      let alertsY;
      
      // Check if we need a new page for alerts
      if (alertsSectionY + alertsCardHeight > pageHeight - 15) {
            pdf.addPage();
        const newPageY = 15;
        pdf.setFillColor(249, 250, 251);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        drawCard(pdf, marginX, newPageY, pageWidth - marginX * 2, alertsCardHeight, "Alerts Overview");
        alertsY = newPageY;
      } else {
        drawCard(pdf, marginX, alertsSectionY, pageWidth - marginX * 2, alertsCardHeight, "Alerts Overview");
        alertsY = alertsSectionY;
      }
      
      if (reportAlertData) {
        const alertsCardWidth = pageWidth - marginX * 2;
        
        // Alert summary cards - horizontally aligned in 2x2 grid
        const alertCardWidth = (alertsCardWidth - 12) / 4;
        const alertCardSpacing = 2;
        
        // Row 1: Total Alerts | Open Alerts | Closed Alerts | Avg Resolution
        const alertMetrics = [
          { label: "Total Alerts", value: safeNumber(reportAlertData.total_alerts, 0), color: [239, 68, 68], x: marginX + 4 },
          { label: "Open Alerts", value: safeNumber(reportAlertData.open_alerts, 0), color: [245, 158, 11], x: marginX + 4 + alertCardWidth + alertCardSpacing },
          { label: "Closed Alerts", value: safeNumber(reportAlertData.closed_alerts, 0), color: [16, 185, 129], x: marginX + 4 + (alertCardWidth + alertCardSpacing) * 2 },
          { label: "Avg Resolution", value: `${formatFixed(safeNumber(reportAlertData.avg_resolution_hours, 0), 1)}h`, color: [59, 130, 246], x: marginX + 4 + (alertCardWidth + alertCardSpacing) * 3 }
        ];
        
        alertMetrics.forEach((metric, idx) => {
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, metric.label, metric.x + alertCardWidth / 2, alertsY + 12, { align: "center" });
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
          safeText(pdf, String(metric.value), metric.x + alertCardWidth / 2, alertsY + 18, { align: "center" });
        });

        // Priority cards - horizontally aligned
        const priorityCardWidth = (alertsCardWidth - 12) / 4;
        const priorities = [
          { label: 'Critical', value: safeNumber(reportAlertData.critical_priority, 0), color: [220, 38, 38] },
          { label: 'High', value: safeNumber(reportAlertData.high_priority, 0), color: [234, 88, 12] },
          { label: 'Medium', value: safeNumber(reportAlertData.medium_priority, 0), color: [217, 119, 6] },
          { label: 'Low', value: safeNumber(reportAlertData.low_priority, 0), color: [59, 130, 246] }
        ];
        
        priorities.forEach((priority, idx) => {
          const priorityCardX = marginX + 4 + (idx * (priorityCardWidth + 1));
          pdf.setFillColor(249, 250, 251);
          pdf.setDrawColor(priority.color[0], priority.color[1], priority.color[2]);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(priorityCardX, alertsY + 22, priorityCardWidth, 12, 2, 2, "FD");
          
          pdf.setFontSize(5.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(priority.color[0], priority.color[1], priority.color[2]);
          safeText(pdf, priority.label, priorityCardX + priorityCardWidth / 2, alertsY + 27, { align: "center" });
          pdf.setFontSize(8);
          pdf.setTextColor(17, 24, 39);
          safeText(pdf, String(priority.value), priorityCardX + priorityCardWidth / 2, alertsY + 32, { align: "center" });
        });

        // Alert charts - show both Alert Types and Alert Status donut charts side by side with color indicators
        const alertChartY = alertsY + 38;
        const alertChartSize = 42; // Increased size for better visibility
        const alertsCardWidthForCharts = alertsCardWidth;
        
        // Alert Types chart (left side)
        if (alertTypesDonutChart && alertTypesData.length > 0) {
          const alertTypesChartX = marginX + alertsCardWidthForCharts / 4 - alertChartSize / 2;
          pdf.addImage(alertTypesDonutChart, "PNG", alertTypesChartX, alertChartY, alertChartSize, alertChartSize);
          
          // Color indicators for Alert Types (right side of chart)
          const indicatorStartX = alertTypesChartX + alertChartSize + 4;
          const indicatorStartY = alertChartY + 2;
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(17, 24, 39);
          
          alertTypesData.forEach((item, idx) => {
            const indicatorY = indicatorStartY + (idx * 6);
            const color = alertTypeColors[idx % alertTypeColors.length];
            // Parse hex color to RGB
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            pdf.setFillColor(r, g, b);
            pdf.circle(indicatorStartX, indicatorY, 2, "F");
            pdf.setTextColor(17, 24, 39);
            safeText(pdf, item.name, indicatorStartX + 4, indicatorY + 1.5);
          });
          
          // Add label below chart
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "Alert Types", marginX + alertsCardWidthForCharts / 4, alertChartY + alertChartSize + 4, { align: "center" });
        }
        
        // Alert Status chart (right side)
        if (alertStatusDonutChart && alertStatusData.length > 0) {
          const alertStatusChartX = marginX + alertsCardWidthForCharts * 3 / 4 - alertChartSize / 2;
          pdf.addImage(alertStatusDonutChart, "PNG", alertStatusChartX, alertChartY, alertChartSize, alertChartSize);
          
          // Color indicators for Alert Status (right side of chart)
          const indicatorStartX = alertStatusChartX + alertChartSize + 4;
          const indicatorStartY = alertChartY + 2;
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(17, 24, 39);
          
          alertStatusData.forEach((item, idx) => {
            const indicatorY = indicatorStartY + (idx * 6);
            const color = alertStatusColors[idx % alertStatusColors.length];
            // Parse hex color to RGB
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            pdf.setFillColor(r, g, b);
            pdf.circle(indicatorStartX, indicatorY, 2, "F");
            pdf.setTextColor(17, 24, 39);
            safeText(pdf, item.name, indicatorStartX + 4, indicatorY + 1.5);
          });
          
          // Add label below chart
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "Alert Status", marginX + alertsCardWidthForCharts * 3 / 4, alertChartY + alertChartSize + 4, { align: "center" });
        }
      } else {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "No alert data available", marginX + (pageWidth - marginX * 2) / 2, alertsY + alertsCardHeight / 2, { align: "center" });
      }

      // Summary Table (inside Summary card - top-right)
      const tableWidth = topRowWidth - 8;
      const col1Width = tableWidth * 0.32;
      const col2Width = tableWidth * 0.34;
      const col3Width = tableWidth - col1Width - col2Width;

      const headerY = topRowY + 13;
      pdf.setFillColor(249, 250, 251);
      pdf.rect(summaryX + 2, topRowY + 10, topRowWidth - 4, 6, "F");
      
      pdf.setFontSize(6.5);
        pdf.setTextColor(75, 85, 99);
      pdf.setFont("helvetica", "bold");
      safeText(pdf, "METRIC CATEGORY", summaryX + 4 + col1Width / 2, headerY, { align: "center" });
      safeText(pdf, "CONSUMPTION", summaryX + 4 + col1Width + col2Width / 2, headerY, { align: "center" });
      safeText(pdf, "EMISSION", summaryX + 4 + col1Width + col2Width + col3Width / 2, headerY, { align: "center" });

      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(summaryX + 2, headerY + 2.5, summaryX + topRowWidth - 2, headerY + 2.5);
      pdf.setLineWidth(0.2);
      pdf.line(summaryX + 4 + col1Width, topRowY + 10, summaryX + 4 + col1Width, topRowY + summaryCardHeight - 2);
      pdf.line(summaryX + 4 + col1Width + col2Width, topRowY + 10, summaryX + 4 + col1Width + col2Width, topRowY + summaryCardHeight - 2);

      const formatDashboardValueOrNA = (value, hasData, unit = "") => {
        if (!hasData && safeNumber(value, 0) === 0) return "No data available";
        return `${formatFixed(value, 2)}${unit ? ` ${unit}` : ""}`;
      };

      const summaryRows = [
        [
          "Active Hours",
          formatDashboardValueOrNA(activeHoursConsumption, hasHourlyData, "kWh"),
          formatDashboardValueOrNA(activeHoursCarbon, hasCarbonData, "kg CO2"),
          [107, 114, 128],
        ],
        [
          "Inactive Hours",
          formatDashboardValueOrNA(inactiveHoursConsumption, hasHourlyData, "kWh"),
          formatDashboardValueOrNA(inactiveHoursCarbon, hasCarbonData, "kg CO2"),
          [107, 114, 128],
        ],
        [
          "Total",
          formatDashboardValueOrNA(totalEnergyKwh, hasEnergyData, "kWh"),
          formatDashboardValueOrNA(totalCarbonKg, hasCarbonData, "kg CO2"),
          [17, 24, 39],
        ],
      ];

      let rowY = headerY + 7;
      summaryRows.forEach(([label, consumption, emission, color], index) => {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(color[0], color[1], color[2]);
        safeText(pdf, label, summaryX + 4 + col1Width / 2, rowY, { align: "center" });
      
        const isTotalRow = label === "Total";
        pdf.setFont("helvetica", isTotalRow ? "bold" : "normal");
          pdf.setTextColor(75, 85, 99);
        safeText(pdf, consumption, summaryX + 4 + col1Width + col2Width / 2, rowY, { align: "center" });
        safeText(pdf, emission, summaryX + 4 + col1Width + col2Width + col3Width / 2, rowY, { align: "center" });

        if (index < summaryRows.length - 1) {
          pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
          pdf.line(summaryX + 2, rowY + 2.5, summaryX + topRowWidth - 2, rowY + 2.5);
        }
        rowY += 7;
      });

      // Footer (only on pages after the first, since first page already has the text)
      const pageFooterY = pageHeight - 7;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, pageFooterY - 3, pageWidth - marginX, pageFooterY - 3);
      pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, "i-EMS Dashboard Analytics", pageWidth / 2, pageFooterY, { align: "center" });

      const fileName = `Dashboard_Analytics_Report_${moment().format("YYYYMMDD_HHmm")}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("Error generating dashboard PDF report:", err);
      alert(`Failed to generate dashboard report PDF: ${err?.message || "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
        <button
          onClick={generatePDF}
      disabled={isGenerating || disabled}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-lg transition-all ${
  isGenerating
    ? "bg-gray-500 text-gray-300 cursor-wait"
    : "bg-[#76df23] text-white hover:scale-105 active:scale-95"
}`}

      title="Download Dashboard Analytics Report (PDF)"
        >
          {isGenerating ? (
            <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Generating...</span>
            </>
          ) : (
            <>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M12 18v-8" />
            <path d="M9 13l3 3 3-3" />
              </svg>
          <span>PDF</span>
            </>
          )}
        </button>
  );
};

export default DashboardPDFReport;
