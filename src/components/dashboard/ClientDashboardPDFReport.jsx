import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";
import jsPDF from "jspdf";
import moment from "moment";
import {
  fetchClientDashboardAPIs,
  fetchLocationDashboardAPIs,
  safeNumber,
  formatFixed,
  getDateRangeTitle,
} from "../../services/pdfService";
import { safeText, drawPieChart, drawLineChart } from "../../utils/pdfCharts";
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

// Common chart options generator - IMPROVED READABILITY with larger fonts
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
        font: { size: 16, family: 'Helvetica', weight: 'bold' }, // Increased from 14
        padding: { bottom: 12 }
      },
      grid: { color: 'rgba(229, 231, 235, 0.5)', lineWidth: 1.2 }, // Slightly more visible
      border: { color: '#d1d5db', width: 1.5 },
      ticks: { color: '#6b7280', font: { size: 13, family: 'Helvetica' }, padding: 8 } // Increased from 12
    },
    x: {
      title: {
        display: true,
        text: xAxisLabel,
        color: '#374151',
        font: { size: 16, family: 'Helvetica', weight: 'bold' }, // Increased from 14
        padding: { top: 12 }
      },
      grid: { color: 'rgba(243, 244, 246, 0.5)', lineWidth: 1.2 }, // Slightly more visible
      border: { color: '#d1d5db', width: 1.5 },
      ticks: {
        color: '#6b7280',
        font: { size: timeframe === 'daily' ? 10 : 12, family: 'Helvetica' }, // Increased from 9/11
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

// Extract field with multiple fallback options
const extractField = (sources, fieldVariations, defaultValue = "—") => {
  for (const source of sources) {
    if (!source) continue;
    for (const field of fieldVariations) {
      if (source[field]) return source[field];
    }
  }
  return defaultValue;
};

// Format timestamp for charts
const formatTimestamp = (timestamp, timeframe, index) => {
  if (!timestamp) return String(index + 1);
  const format = timeframe === "yearly" ? "MMM YYYY" :
                 timeframe === "monthly" || timeframe === "custom" ? "DD MMM" : "HH:mm";
  return moment(timestamp).format(format);
};

// Build series data (consolidated for energy and carbon)
const buildSeries = (source, timeframe, options = {}) => {
    if (!Array.isArray(source) || source.length === 0) return [];

  let cumulative = 0;
    const hasCumulative = Boolean(source[0]?.actual);

    return source.map((item, index) => {
    const label = item.label || formatTimestamp(item.period || item.recorded_at, timeframe, index);
    
    const value = hasCumulative && typeof item.actual === "number"
          ? safeNumber(item.actual, 0)
      : (cumulative += safeNumber(options.valueField ? item[options.valueField] : 0, 0));
    
    return { label, actual: value };
    });
  };

  /**
 * CHART CREATION FUNCTIONS - INCREASED RESOLUTION for better quality
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
  width: 800, // Increased from 600 for better quality
  height: 800, // Increased from 600 for better quality
  chartOptions: {
    responsive: false,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } }
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
    width: 1400, // Increased from 1200 for better quality
    height: 700, // Increased from 600 for better quality
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
    width: 1600, // Increased from 1400 for better quality
    height: 700, // Increased from 600 for better quality
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
    width: 1400, // Increased from 1200 for better quality
    height: 700, // Increased from 600 for better quality
    chartOptions: getChartOptions('Usage (kWh)', xAxisLabel, currentTimeframe)
    });
  };

// Create vertical bar chart for location metrics (Location on X-axis, Consumption on Y-axis)
const createLocationBarChart = (locationData, valueField, color, yAxisLabel) => {
  if (!locationData || locationData.length === 0) return null;
  
  // Sort by value descending and take top 10
  const sortedData = [...locationData]
    .sort((a, b) => b[valueField] - a[valueField])
    .slice(0, 10);
  
  if (sortedData.length === 0) return null;
  
  // Create gradient colors for better visual appeal
  const baseColor = color;
  const gradientColors = sortedData.map((_, index) => {
    // Create slight gradient variation for visual depth
    const opacity = 0.7 + (index / sortedData.length) * 0.3;
    return baseColor;
  });
  
  return createChart('bar', {
    labels: sortedData.map(loc => {
      const name = loc.locationName || 'Unknown';
      // Truncate long names but keep them readable
      return name.length > 12 ? name.substring(0, 10) + '..' : name;
    }),
    datasets: [{
      label: yAxisLabel,
      data: sortedData.map(loc => loc[valueField]),
      backgroundColor: gradientColors,
      borderColor: color,
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false,
      barThickness: 25, // Thinner bars for professional look
      maxBarThickness: 30, // Maximum bar thickness
    }]
  }, {
    width: 1200,
    height: 500,
    chartOptions: {
      indexAxis: 'x', // Vertical bar chart (default)
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel,
            color: '#374151',
            font: { size: 13, family: 'Helvetica', weight: 'bold' },
            padding: { bottom: 10 }
          },
          grid: { 
            color: 'rgba(229, 231, 235, 0.6)', 
            lineWidth: 1.2,
            drawBorder: true
          },
          border: { color: '#d1d5db', width: 1.5 },
          ticks: { 
            color: '#6b7280', 
            font: { size: 11, family: 'Helvetica' }, 
            padding: 8,
            stepSize: undefined // Auto step size
          }
        },
        x: {
          title: {
            display: true,
            text: 'Location',
            color: '#374151',
            font: { size: 13, family: 'Helvetica', weight: 'bold' },
            padding: { top: 10 }
          },
          grid: { 
            display: false // No vertical grid lines
          },
          border: { color: '#d1d5db', width: 1.5 },
          ticks: {
            color: '#6b7280',
            font: { size: 10, family: 'Helvetica' },
            padding: 6,
            maxRotation: 45,
            minRotation: 45,
            autoSkip: false
          },
          offset: true // Bars have some spacing from Y-axis for professional look
        }
      }
    }
  });
};


  /**
 * DATA SERIES BUILDERS
 */
const buildEnergySeries = (apiData, savingChartData, timeframe) => {
  const source = savingChartData && savingChartData.length
    ? savingChartData
    : apiData?.carbon?.data || apiData?.hourly?.hourly_data || [];
  
  return buildSeries(source, timeframe, {
    valueField: 'current_power_kwh'
  });
};

const buildCarbonSeries = (apiData, carbonChartData, timeframe) => {
  const source = carbonChartData && carbonChartData.length
    ? carbonChartData
    : apiData?.carbon?.data || [];
  
  return buildSeries(source, timeframe, {
    valueField: 'current_carbon_kg'
    });
  };

  /**
 * LOCATION PAGE GENERATOR
 */
const generateLocationPage = async (pdf, location, locationData, timeframe) => {
  pdf.addPage();
  
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
  safeText(pdf, "Location Report", marginX + 13, 10);

  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  safeText(pdf, location.loc_name || location.name || "Location Details", marginX + 13, 16);

  const timestamp = `Generated on ${moment().format("DD MMM YYYY, HH:mm")}`;
  pdf.setFontSize(7);
  safeText(pdf, timestamp, pageWidth - marginX - 2, 10, { align: "right" });

  // Location info bar - OPTIMIZED for single page fit
  const infoBarY = 22;
  const infoBarHeight = 10; // Reduced from 12 to 10 for tighter spacing
  pdf.setFillColor(243, 244, 246);
  pdf.roundedRect(marginX, infoBarY, pageWidth - marginX * 2, infoBarHeight, 2, 2, "F");
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(marginX, infoBarY, pageWidth - marginX * 2, infoBarHeight, 2, 2, "D");

  const locationDetails = locationData.location || {};
  const infoSections = [
    ["Location Name", extractField([location, locationDetails], ['loc_name', 'location_name', 'name'])],
    ["Branch Code", extractField([location, locationDetails], ['branch_code', 'code', 'branch'])],
    ["Country", extractField([location, locationDetails], ['country_name', 'country'], 'India')],
    ["Region", extractField([location, locationDetails], ['region_name', 'region', 'zone', 'area'])],
    ["State", extractField([location, locationDetails], ['state_name', 'state', 'province'])],
    ["City", extractField([location, locationDetails], ['city_name', 'city', 'location', 'locality'])]
  ];

  const sectionWidth = (pageWidth - marginX * 2) / 6;
  pdf.setFontSize(5.5); // Slightly smaller for tighter fit
  
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

  // Extract data arrays FIRST - needed for Location Performance Summary table
  const energySavedArray = Array.isArray(locationData.energySaved?.data) ? locationData.energySaved.data : [];
  const carbonArray = Array.isArray(locationData.carbon?.data) ? locationData.carbon.data : [];
  const powerArray = Array.isArray(locationData.power?.data) ? locationData.power.data : [];
  const hourlyArray = Array.isArray(locationData.hourly?.hourly_data || locationData.hourly?.data) 
    ? (locationData.hourly.hourly_data || locationData.hourly.data) : [];

  console.log('📍 Location Data:', location.loc_id, 'Energy:', energySavedArray.length, 'Carbon:', carbonArray.length, 'Power:', powerArray.length, 'Hourly:', hourlyArray.length);

  // Extract metrics
  const locationEnergySavedSummary = locationData.energySaved || {};
  const locationCarbonSummary = locationData.carbon || {};
  const locationPowerSummary = locationData.power || {};
  const locationHourlySummary = locationData.hourly || {};

  const totalConsumption = safeNumber(locationEnergySavedSummary?.total_actual_consumption || locationHourlySummary?.total_consumption || 0);
  const baseline = safeNumber(locationEnergySavedSummary?.total_baseline_wh || 0);
  const saved = safeNumber(locationEnergySavedSummary?.total_energy_saved || 0);
  const activeConsumption = safeNumber(locationHourlySummary?.active_inactive?.active_hours_consumption || 0);
  const inactiveConsumption = safeNumber(locationHourlySummary?.active_inactive?.inactive_hours_consumption || 0);
  
  const totalCarbonEmission = safeNumber(locationCarbonSummary?.actual?.total_carbon_kg || 0);
  const carbonBaseline = safeNumber(locationCarbonSummary?.baseline?.total_carbon_kg || 0);
  const carbonSaved = safeNumber(locationCarbonSummary?.savings?.carbon_saved_kg || 0);
  
  const totalPowerConsumption = safeNumber(locationPowerSummary?.total_consumption || locationPowerSummary?.consumption || 0);

  // Location Performance Summary Table - MOVED BELOW INFO BAR
  let locationSummaryY = infoBarY + infoBarHeight + 4;
  const locationSummaryHeight = 64; // Reduced from 68 to 62 to fit everything on one page
  
  // Only add new page if absolutely necessary (very little space left)
  if (locationSummaryY + locationSummaryHeight > pageHeight - 5) {
    console.log('📄 Adding new page for Location Summary table - not enough space');
    pdf.addPage();
    locationSummaryY = 15;
    pdf.setFillColor(249, 250, 251);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
  } else {
    console.log('✓ Location Summary fits on current page at Y:', locationSummaryY);
  }

  drawCard(pdf, marginX, locationSummaryY, pageWidth - marginX * 2, locationSummaryHeight, "Location Performance Summary");

  // Summary table data
  const savingsPercentage = baseline > 0 ? ((saved / baseline) * 100) : 0;
  const carbonSavingsPercentage = carbonBaseline > 0 ? ((carbonSaved / carbonBaseline) * 100) : 0;
  const activePercentage = (activeConsumption + inactiveConsumption) > 0 ? ((activeConsumption / (activeConsumption + inactiveConsumption)) * 100) : 0;

  const maxDemand = hourlyArray.length > 0 ? Math.max(...hourlyArray.map(item => safeNumber(item.total_consumption || 0, 0))) : 0;
  let peakWindow = "—";
  if (hourlyArray.length > 0 && timeframe === 'daily') {
    const maxItem = hourlyArray.reduce((max, item) => {
      const consumption = safeNumber(item.total_consumption || 0, 0);
      const maxConsumption = safeNumber(max.total_consumption || 0, 0);
      return consumption > maxConsumption ? item : max;
    }, hourlyArray[0]);
    if (maxItem.period || maxItem.recorded_at) {
      const time = moment(maxItem.period || maxItem.recorded_at).format('HH:mm');
      const endTime = moment(maxItem.period || maxItem.recorded_at).add(1, 'hour').format('HH:mm');
      peakWindow = `${time} - ${endTime}`;
    }
  }

  // Calculate total devices for this location from device-location/iot data
  // Count only installed/active devices accurately
  const deviceData = locationData.devices || {};
  const isInstalledDevice = (dev) => {
    // Check if device has valid ID
    const hasValidId = !!(dev?.did || dev?.device_id || dev?.dev_id || dev?.id);
    if (!hasValidId) return false;
    
    // Check device status - exclude inactive/removed devices
    const status = dev?.status || dev?.device_status || dev?.state;
    if (status && (status.toLowerCase() === 'inactive' || status.toLowerCase() === 'removed' || status.toLowerCase() === 'deleted')) {
      return false;
    }
    
    // Check if device is installed (not just registered)
    const isInstalled = dev?.is_installed !== false && dev?.installed !== false;
    if (!isInstalled) return false;
    
    // Count device (handle device_count field if present)
    const deviceCount = safeNumber(dev?.device_count || dev?.count || 1, 1);
    return deviceCount > 0;
  };
  
  const totalInstalledDevices = 
    (Array.isArray(deviceData.iATM) ? deviceData.iATM.filter(isInstalledDevice).length : 0) +
    (Array.isArray(deviceData.Neon) ? deviceData.Neon.filter(isInstalledDevice).length : 0) +
    (Array.isArray(deviceData.LIB) ? deviceData.LIB.filter(isInstalledDevice).length : 0) +
    (Array.isArray(deviceData.ThreePLIB) ? deviceData.ThreePLIB.filter(isInstalledDevice).length : 0);
  
  console.log('📍 Location Devices Count:', totalInstalledDevices, 'for location:', location.loc_id || location.id, 'from deviceData:', deviceData);

  const locationRows = [
    { metric: "Energy", value: `${formatFixed(totalConsumption, 2)} kWh`, baseline: `${formatFixed(baseline, 2)} kWh`, 
      saved: `${formatFixed(saved, 2)} kWh`, status: savingsPercentage > 0 ? `${formatFixed(savingsPercentage, 1)}% Saved` : "No Savings", 
      color: savingsPercentage > 0 ? [16, 185, 129] : [107, 114, 128] },
    { metric: "Carbon", value: `${formatFixed(totalCarbonEmission, 2)} kg`, baseline: `${formatFixed(carbonBaseline, 2)} kg`, 
      saved: `${formatFixed(carbonSaved, 2)} kg`, status: carbonSavingsPercentage > 0 ? `${formatFixed(carbonSavingsPercentage, 1)}% Saved` : "No Savings", 
      color: carbonSavingsPercentage > 0 ? [16, 185, 129] : [107, 114, 128] },
    { metric: "Active Hours", value: `${formatFixed(activeConsumption, 2)} kWh`, baseline: "—", saved: "—", 
      status: `${formatFixed(activePercentage, 1)}% of Total`, color: [16, 185, 129] },
    { metric: "Inactive Hours", value: `${formatFixed(inactiveConsumption, 2)} kWh`, baseline: "—", saved: "—", 
      status: `${formatFixed(100 - activePercentage, 1)}% of Total`, color: [107, 114, 128] },
    { metric: "Max Demand", value: `${formatFixed(maxDemand, 2)} kWh`, baseline: "—", saved: "—", 
      status: timeframe === 'daily' ? peakWindow : "—", color: [17, 24, 39] },
    { metric: "Total Devices", value: `${totalInstalledDevices} Units`, baseline: "—", saved: "—", 
      status: "—", color: [17, 24, 39] }
  ];

  // Draw table - OPTIMIZED for single page fit
  const locationTableWidth = pageWidth - marginX * 2 - 8;
  const locationTableX = marginX + 4;
  const locationTableStartY = locationSummaryY + 10; // Slightly reduced spacing
  const locationCol1Width = locationTableWidth * 0.20;
  const locationCol2Width = locationTableWidth * 0.20;
  const locationCol3Width = locationTableWidth * 0.20;
  const locationCol4Width = locationTableWidth * 0.18;
  const locationRowHeight = 7.5; // Optimized row height for single page fit

  pdf.setFillColor(243, 244, 246);
  pdf.rect(locationTableX, locationTableStartY, locationTableWidth, locationRowHeight, "F");
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.rect(locationTableX, locationTableStartY, locationTableWidth, locationRowHeight + (locationRowHeight * 6), "D");

  const locationHeaders = ["METRIC", "VALUE", "BASELINE", "SAVED", "STATUS"];
  const locationColPositions = [locationTableX + locationCol1Width, locationTableX + locationCol1Width + locationCol2Width, locationTableX + locationCol1Width + locationCol2Width + locationCol3Width, 
                        locationTableX + locationCol1Width + locationCol2Width + locationCol3Width + locationCol4Width];
  const locationColWidths = [locationCol1Width, locationCol2Width, locationCol3Width, locationCol4Width, locationTableWidth - locationCol1Width - locationCol2Width - locationCol3Width - locationCol4Width];
  
  pdf.setFontSize(6.5); // Optimized for single page
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(75, 85, 99);
  locationHeaders.forEach((header, index) => {
    const colX = index === 0 ? locationTableX : locationColPositions[index - 1];
    const centerX = colX + locationColWidths[index] / 2;
    safeText(pdf, header, centerX, locationTableStartY + 5, { align: "center" });
    if (index > 0) pdf.line(locationColPositions[index - 1], locationTableStartY, locationColPositions[index - 1], locationTableStartY + locationRowHeight + (locationRowHeight * 6));
  });
  
  pdf.line(locationTableX, locationTableStartY + locationRowHeight, locationTableX + locationTableWidth, locationTableStartY + locationRowHeight);

  pdf.setFontSize(7); // Optimized for single page
  let locationRowY = locationTableStartY + locationRowHeight;
  locationRows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(locationTableX, locationRowY, locationTableWidth, locationRowHeight, "F");
    }
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(17, 24, 39);
    safeText(pdf, row.metric, locationTableX + locationCol1Width / 2, locationRowY + 5, { align: "center" });
    
    pdf.setFont("helvetica", "normal");
    safeText(pdf, row.value, locationTableX + locationCol1Width + locationCol2Width / 2, locationRowY + 5, { align: "center" });
    safeText(pdf, row.baseline, locationTableX + locationCol1Width + locationCol2Width + locationCol3Width / 2, locationRowY + 5, { align: "center" });
    safeText(pdf, row.saved, locationTableX + locationCol1Width + locationCol2Width + locationCol3Width + locationCol4Width / 2, locationRowY + 5, { align: "center" });
    
    pdf.setTextColor(row.color[0], row.color[1], row.color[2]);
    const locationCol5Width = locationTableWidth - locationCol1Width - locationCol2Width - locationCol3Width - locationCol4Width;
    safeText(pdf, row.status, locationTableX + locationCol1Width + locationCol2Width + locationCol3Width + locationCol4Width + locationCol5Width / 2, locationRowY + 5, { align: "center" });
    
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.2);
    pdf.line(locationTableX, locationRowY + locationRowHeight, locationTableX + locationTableWidth, locationRowY + locationRowHeight);
    
    locationRowY += locationRowHeight;
  });

  // Build chart series
  const buildLocationSeries = (dataArray, isCumulative, valueFields) => {
    if (dataArray.length === 0) return [];
    
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
        const value = valueFields.reduce((acc, field) => 
          acc || safeNumber(parseFloat(item[field]) || 0, 0), 0);
        if (isCumulative) cumulative += value;
        series.push({
          label: `${String(h).padStart(2, "0")}:00`,
          actual: isCumulative ? Number(cumulative.toFixed(4)) : value
        });
      }
      return series;
    } else {
      return dataArray.map(item => {
        const value = valueFields.reduce((acc, field) => 
          acc || safeNumber(parseFloat(item[field]) || 0, 0), 0);
        if (isCumulative) cumulative += value;
        return {
          label: formatTimestamp(item.period || item.recorded_at, timeframe, 0),
          actual: isCumulative ? Number(cumulative.toFixed(4)) : value
        };
      });
    }
  };

  const energySavedSeries = buildLocationSeries(energySavedArray, true, ['actual_consumption']);
  const carbonFootprintSeries = buildLocationSeries(carbonArray, true, ['actual_carbon_kg']);
  
  // Power Consumption series (non-cumulative - individual values)
  let powerConsumptionSeries = [];
  if (powerArray.length > 0) {
    console.log('🔍 Building Power Consumption Series (INDIVIDUAL VALUES):');
    powerConsumptionSeries = powerArray.map((item, index) => {
      const timestamp = item.period || item.recorded_at || item.timestamp || item.date;
      const label = formatTimestamp(timestamp, timeframe, index);
      const consumption = safeNumber(
        item.total_consumption || 
        item.consumption || 
        item.current_power_kwh ||
        item.power_kwh ||
        item.total_power_consumption ||
        item.value || 
        0, 
        0
      );
      
      if (index === 0) {
        console.log('  First power data point:', { label, consumption, timestamp });
      }
      
      return { label, actual: consumption };
    });
    console.log('  ✓ Power Consumption Series created with', powerConsumptionSeries.length, 'points');
  }
  
  // Hourly series (non-cumulative)
  let hourlyUsageSeries = [];
  if (hourlyArray.length > 0) {
    if (timeframe === 'daily') {
      const hourMap = new Map();
      hourlyArray.forEach(item => {
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
      hourlyUsageSeries = hourlyArray.map(item => ({
        hour: formatTimestamp(item.period || item.recorded_at, timeframe, 0),
        usage: safeNumber(item.total_consumption || item.usage || 0, 0)
      }));
    }
  }

  // Create charts
  const locationEnergySavedChart = energySavedSeries.length > 0 ? createEnergyChart(energySavedSeries, baseline) : null;
  const locationCarbonFootprintChart = carbonFootprintSeries.length > 0 ? createCO2Chart(carbonFootprintSeries, carbonBaseline) : null;
  const locationPowerChart = powerConsumptionSeries.length > 0 ? createEnergyChart(powerConsumptionSeries, 0) : null; // Power chart with no baseline
  const locationHourlyChart = hourlyUsageSeries.length > 0 ? createHourlyUsageChart(hourlyUsageSeries, timeframe) : null;
  
  console.log('✅ LOCATION CHARTS CREATED:', {
    energySaved: !!locationEnergySavedChart,
    carbonFootprint: !!locationCarbonFootprintChart,
    powerConsumption: !!locationPowerChart,
    hourlyUsage: !!locationHourlyChart
  });

  // Draw charts layout - OPTIMIZED to fit on one page
  // Charts start after Location Performance Summary table
  const chartBoxHeight = 60; // Balanced size to fit all content on one page
  const chartBoxWidth = (pageWidth - marginX * 2 - 4) / 2;
  let currentY = locationSummaryY + locationSummaryHeight + 4; // Start after Location Performance Summary table

  // Row 1: Power Consumption (Full Width) - moved to top
  if (locationPowerChart && powerConsumptionSeries.length > 0) {
    drawCard(pdf, marginX, currentY, pageWidth - marginX * 2, chartBoxHeight, "Power Consumption");
    
    // Use total from API summary or calculate from series
    const totalPower = totalPowerConsumption || powerConsumptionSeries.reduce((sum, item) => sum + (item.actual || 0), 0);
    pdf.setFontSize(5.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(107, 114, 128);
    safeText(pdf, `Total: ${formatFixed(totalPower, 2)} kWh`, 
      pageWidth - marginX - 4, currentY + 6.5, { align: "right" });
    
    pdf.addImage(locationPowerChart, "PNG", marginX + 4, currentY + 11, pageWidth - marginX * 2 - 8, chartBoxHeight - 14);
    currentY += chartBoxHeight + 2; // Reduced spacing to fit on one page
  }

  // Row 2: Energy Saved | Carbon Footprint
  if (locationEnergySavedChart || locationCarbonFootprintChart) {
    if (locationEnergySavedChart) {
      drawCard(pdf, marginX, currentY, chartBoxWidth, chartBoxHeight, "Energy Saved vs Baseline");
      pdf.setFontSize(5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, `${formatFixed(totalConsumption, 2)} kWh | BL: ${formatFixed(baseline, 2)} kWh | Saved: ${formatFixed(saved, 2)} kWh`, 
        marginX + chartBoxWidth - 4, currentY + 6.5, { align: "right" });
      pdf.addImage(locationEnergySavedChart, "PNG", marginX + 4, currentY + 11, chartBoxWidth - 8, chartBoxHeight - 14);
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
    }

    currentY += chartBoxHeight + 2; // spacing after energy/carbon row
  }

  // Row 3: Hourly Usage - after other charts
  if (locationHourlyChart) {
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
    currentY += chartBoxHeight + 2; // Reduced spacing to fit on one page
  }

  // Footer
  const footerY = pageHeight - 7;
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.2);
  pdf.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);
  pdf.setFontSize(6);
  pdf.setTextColor(107, 114, 128);
  safeText(pdf, "i-EMS Location Dashboard", pageWidth / 2, footerY, { align: "center" });
};

/**
 * MAIN COMPONENT
 */
const ClientDashboardPDFReport = forwardRef(({
  clientId,
  clientName,
  cards = [],
  powerData = [],
  savingChartData = [],
  carbonChartData = [],
  apiCarbonResponse = null,
  timeframe = "daily",
  selectedDate,
  customStartDate,
  customEndDate,
}, ref) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const buildDateFilters = () => ({
    timeframe,
    date: timeframe === "daily" ? (selectedDate && moment(selectedDate).format("YYYY-MM-DD")) || moment().format("YYYY-MM-DD") : undefined,
    month: timeframe === "monthly" ? (selectedDate && moment(selectedDate, "YYYY-MM").format("YYYY-MM")) || moment().format("YYYY-MM") : undefined,
    year: timeframe === "yearly" ? selectedDate || moment().format("YYYY") : undefined,
    customStartDate: timeframe === "custom" && customStartDate ? moment(customStartDate).format("YYYY-MM-DD") : undefined,
    customEndDate: timeframe === "custom" && customEndDate ? moment(customEndDate).format("YYYY-MM-DD") : undefined,
  });

  // Expose generatePDFBlob method to parent via ref
  useImperativeHandle(ref, () => ({
    generatePDFBlob: async () => {
      if (!clientId) return null;
      
      try {
        const filters = buildDateFilters();
        const apiData = await fetchClientDashboardAPIs(clientId, filters);
        
        // Call the internal PDF generation and get the blob
        const pdfBlob = await generatePDFInternal(apiData, true);
        return pdfBlob;
      } catch (error) {
        console.error('Error generating PDF blob:', error);
        return null;
      }
    }
  }));

  const generatePDFInternal = async (apiData, returnBlob = false) => {
    if (!clientId) return;
    setIsGenerating(true);

    try {
      const filters = buildDateFilters();
      const apiData = await fetchClientDashboardAPIs(clientId, filters);

      console.log('=== CLIENT DASHBOARD PDF API DATA ===', apiData);

      // Extract metrics
      const totalEnergyKwh = safeNumber(apiCarbonResponse?.current_consumption?.total_power_kwh ?? apiData.carbon?.current_consumption?.total_power_kwh ?? apiData.hourly?.total_consumption, 0);
      const baselineEnergyKwh = safeNumber(apiCarbonResponse?.baseline_consumption?.current_timeframe?.power_kwh ?? apiData.carbon?.baseline_consumption?.current_timeframe?.power_kwh, 0);
      const totalCarbonKg = safeNumber(apiCarbonResponse?.current_consumption?.total_carbon_emission?.kg ?? apiData.carbon?.current_consumption?.total_carbon_emission?.kg, 0);
      const baselineCarbonKg = safeNumber(apiCarbonResponse?.baseline_consumption?.current_timeframe?.carbon_kg ?? apiData.carbon?.baseline_consumption?.current_timeframe?.carbon_kg, 0);
      const projectedSaving = safeNumber(apiCarbonResponse?.savings?.power_saved?.kwh ?? apiData.carbon?.savings?.power_saved?.kwh ?? (baselineEnergyKwh - totalEnergyKwh), 0);
      const projectedSavingPct = safeNumber(apiCarbonResponse?.savings?.power_saved?.percentage ?? apiData.carbon?.savings?.power_saved?.percentage ?? (baselineEnergyKwh > 0 ? (projectedSaving / baselineEnergyKwh) * 100 : 0), 0);

      const dashboardData = apiData.dashboard || {};
      const netActive = safeNumber(dashboardData.active_locations || dashboardData.active_sites || dashboardData.active_count, 0);
      const netInactive = safeNumber(dashboardData.inactive_locations || dashboardData.inactive_sites || dashboardData.inactive_count, 0);
      const totalLocations = netActive + netInactive || safeNumber(dashboardData.total_locations, 0);

      // Total devices for this client (from /client/{clientId}/devices-listing)
      // Count only installed/active devices accurately
      const devicesData = apiData.devices || {};
      let totalDevices = 0;
      
      // Helper function to check if device is installed/active
      const isInstalledDevice = (dev) => {
        // Check if device has valid ID
        const hasValidId = !!(dev?.did || dev?.device_id || dev?.dev_id || dev?.id);
        if (!hasValidId) return false;
        
        // Check device status - exclude inactive/removed devices
        const status = dev?.status || dev?.device_status || dev?.state;
        if (status && (status.toLowerCase() === 'inactive' || status.toLowerCase() === 'removed' || status.toLowerCase() === 'deleted')) {
          return false;
        }
        
        // Check if device is installed (not just registered)
        const isInstalled = dev?.is_installed !== false && dev?.installed !== false;
        if (!isInstalled) return false;
        
        // Count device (handle device_count field if present)
        const deviceCount = safeNumber(dev?.device_count || dev?.count || 1, 1);
        return deviceCount > 0;
      };
      
      if (devicesData && typeof devicesData === "object") {
        if (devicesData.device_counts && typeof devicesData.device_counts === "object") {
          // Preferred shape: { device_counts: { Neon: 4, LiBi: 3, ... } }
          totalDevices = Object.values(devicesData.device_counts).reduce(
            (sum, val) => sum + safeNumber(val, 0),
            0
          );
        } else if (Array.isArray(devicesData)) {
          // Array of devices - count only installed ones
          totalDevices = devicesData.filter(isInstalledDevice).length;
        } else if (Array.isArray(devicesData.data)) {
          // Fallback: { data: [ ...devices ] }
          totalDevices = devicesData.data.filter(isInstalledDevice).length;
        } else if (devicesData.iATM || devicesData.Neon || devicesData.LIB || devicesData.ThreePLIB) {
          // Device type structure - count installed devices from each type
          totalDevices = 
            (Array.isArray(devicesData.iATM) ? devicesData.iATM.filter(isInstalledDevice).length : 0) +
            (Array.isArray(devicesData.Neon) ? devicesData.Neon.filter(isInstalledDevice).length : 0) +
            (Array.isArray(devicesData.LIB) ? devicesData.LIB.filter(isInstalledDevice).length : 0) +
            (Array.isArray(devicesData.ThreePLIB) ? devicesData.ThreePLIB.filter(isInstalledDevice).length : 0);
        }
      }
      
      console.log('📊 Client Total Devices Count:', totalDevices, 'from devicesData:', devicesData);

      const activeHoursConsumption = safeNumber(apiCarbonResponse?.active_inactive?.active_hours_consumption ?? apiData.carbon?.active_inactive?.active_hours_consumption ?? apiData.hourly?.active_inactive?.active_hours_consumption, 0);
      const inactiveHoursConsumption = safeNumber(apiCarbonResponse?.active_inactive?.inactive_hours_consumption ?? apiData.carbon?.active_inactive?.inactive_hours_consumption ?? apiData.hourly?.active_inactive?.inactive_hours_consumption, 0);
      const activeHoursEmission = safeNumber(apiCarbonResponse?.active_inactive?.active_hours_carbon_kg ?? apiData.carbon?.active_inactive?.active_hours_carbon_kg, 0);
      const inactiveHoursEmission = safeNumber(apiCarbonResponse?.active_inactive?.inactive_hours_carbon_kg ?? apiData.carbon?.active_inactive?.inactive_hours_carbon_kg, 0);

      // Build chart series
      const energySeries = buildEnergySeries(apiData, savingChartData, timeframe);
      const carbonSeries = buildCarbonSeries(apiData, carbonChartData, timeframe);

      let hourlyUsageSeries = [];
      if (timeframe === 'daily' && apiData.hourly?.hourly_data) {
        const hourMap = new Map();
        apiData.hourly.hourly_data.forEach(item => {
          const timestamp = item.period || item.recorded_at;
          if (timestamp) {
            const hourMatch = timestamp.match(/T(\d{2}):/);
            if (hourMatch) {
              const key = hourMatch[1];
              const consumption = safeNumber(item.total_power_consumption || 0, 0);
              hourMap.set(key, consumption);
            }
          }
        });
        hourlyUsageSeries = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}:00`,
          usage: hourMap.get(i.toString().padStart(2, "0")) || 0,
        }));
      }

      // Create charts
      const pieChartImage = createPieChart(activeHoursConsumption || 75, inactiveHoursConsumption || 25);
      const energyChartImage = energySeries.length > 0 ? createEnergyChart(energySeries, baselineEnergyKwh) : null;
      const co2ChartImage = carbonSeries.length > 0 ? createCO2Chart(carbonSeries, baselineCarbonKg) : null;
      const hourlyUsageChartImage = (timeframe === 'daily' && hourlyUsageSeries.length > 0) ? createHourlyUsageChart(hourlyUsageSeries, timeframe) : null;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;

      // Background
      pdf.setFillColor(249, 250, 251);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Header
      try {
        pdf.addImage(buildIntLogo, 'PNG', marginX + 2, 6, 8, 8);
      } catch (err) {
        console.warn('Could not load logo:', err);
      }

      pdf.setFontSize(16);
      pdf.setTextColor(16, 185, 129);
      pdf.setFont("helvetica", "bold");
      safeText(pdf, "Energy Saving Report", marginX + 13, 10);

      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "normal");
      safeText(pdf, "Comprehensive analysis of power consumption and efficiency.", marginX + 13, 16);

      // Generated timestamp (top‑right)
      pdf.setFontSize(7);
      const generatedTimestamp = `Generated on ${moment().format("DD MMM YYYY, HH:mm")}`;
      safeText(pdf, generatedTimestamp, pageWidth - marginX - 2, 10, { align: "right" });

      // Reporting period label (top‑right, below timestamp)
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

      // Summary Table - MOVED TO TOP
      const summaryTableY = 20;
      const summaryHeight = 39; // Fixed height for 3 rows (header + 3 data rows)
      
      drawCard(pdf, marginX, summaryTableY, pageWidth - marginX * 2, summaryHeight, "Summary");

      const summaryTableWidth = pageWidth - marginX * 2 - 8; // Account for card padding
      const summaryCol1Width = summaryTableWidth * 0.28;
      const summaryCol2Width = summaryTableWidth * 0.36;
      const summaryCol1X = marginX + 4;
      const summaryCol2X = marginX + 4 + summaryCol1Width;
      const summaryCol3X = marginX + 4 + summaryCol1Width + summaryCol2Width;

      const summaryHeaderY = summaryTableY + 13; // Reduced from 15 for tighter fit
      pdf.setFillColor(249, 250, 251);
      pdf.rect(marginX + 2, summaryTableY + 10, pageWidth - marginX * 2 - 4, 6, "F");
      
      pdf.setFontSize(7);
      pdf.setTextColor(75, 85, 99);
      pdf.setFont("helvetica", "bold");
      safeText(pdf, "METRIC CATEGORY", marginX + 4 + summaryCol1Width / 2, summaryHeaderY, { align: "center" });
      safeText(pdf, "CONSUMPTION DETAILS", marginX + 4 + summaryCol1Width + summaryCol2Width / 2, summaryHeaderY, { align: "center" });
      safeText(pdf, "EMISSION IMPACT", marginX + 4 + summaryCol1Width + summaryCol2Width + (summaryTableWidth - summaryCol1Width - summaryCol2Width) / 2, summaryHeaderY, { align: "center" });

      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(marginX + 2, summaryHeaderY + 2.5, pageWidth - marginX - 2, summaryHeaderY + 2.5);
      pdf.setLineWidth(0.2);
      pdf.line(marginX + 4 + summaryCol1Width, summaryTableY + 10, marginX + 4 + summaryCol1Width, summaryTableY + summaryHeight - 2);
      pdf.line(marginX + 4 + summaryCol1Width + summaryCol2Width, summaryTableY + 10, marginX + 4 + summaryCol1Width + summaryCol2Width, summaryTableY + summaryHeight - 2);

      const hasClientEnergyData = energySeries && energySeries.length > 0;
      const hasClientCarbonData = carbonSeries && carbonSeries.length > 0;
      const hasClientHourlyData = Array.isArray(hourlyUsageSeries) && hourlyUsageSeries.length > 0;

      const formatClientValueOrNA = (value, hasData, unit = "") => {
        if (!hasData && safeNumber(value, 0) === 0) return "No data available";
        return `${formatFixed(value, 2)}${unit ? ` ${unit}` : ""}`;
      };

      const summaryRows = [
        [
          "Active Hours",
          formatClientValueOrNA(activeHoursConsumption, hasClientHourlyData, "kWh"),
          formatClientValueOrNA(activeHoursEmission, hasClientHourlyData, "kg CO2"),
          [107, 114, 128],
        ],
        [
          "Inactive Hours",
          formatClientValueOrNA(inactiveHoursConsumption, hasClientHourlyData, "kWh"),
          formatClientValueOrNA(inactiveHoursEmission, hasClientHourlyData, "kg CO2"),
          [107, 114, 128],
        ],
        [
          "Total",
          formatClientValueOrNA(totalEnergyKwh, hasClientEnergyData, "kWh"),
          formatClientValueOrNA(totalCarbonKg, hasClientCarbonData, "kg CO2"),
          [17, 24, 39],
        ],
      ];

      const summaryCol3Width = summaryTableWidth - summaryCol1Width - summaryCol2Width;
      let summaryRowY = summaryHeaderY + 8;
      summaryRows.forEach(([label, consumption, emission, color], index) => {
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(color[0], color[1], color[2]);
        safeText(pdf, label, marginX + 4 + summaryCol1Width / 2, summaryRowY, { align: "center" });
      
        // Keep bold for Total row, normal for others
        const isTotalRow = label === "Total";
        pdf.setFont("helvetica", isTotalRow ? "bold" : "normal");
        pdf.setTextColor(75, 85, 99);
        safeText(pdf, consumption, marginX + 4 + summaryCol1Width + summaryCol2Width / 2, summaryRowY, { align: "center" });
        safeText(pdf, emission, marginX + 4 + summaryCol1Width + summaryCol2Width + summaryCol3Width / 2, summaryRowY, { align: "center" });
        
        // Only draw line if not the last row
        if (index < summaryRows.length - 1) {
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          pdf.line(marginX + 2, summaryRowY + 2.5, pageWidth - marginX - 2, summaryRowY + 2.5);
        }
        summaryRowY += 7.5; // Tighter row spacing
      });

      // Extract client details
      const clientDetailsData = apiData.clientDetails || {};
      const locationsData = Array.isArray(apiData.locations) ? apiData.locations : (apiData.locations?.data || []);
      const firstLocation = locationsData[0] || {};

      const contactFieldVariations = ['contact_person_name', 'contact_person', 'contactPersonName', 'contactPerson', 
        'owner_name', 'ownerName', 'contact_name', 'contactName', 'manager_name', 'managerName', 'person'];
      const phoneFieldVariations = ['contact_person_mobile', 'contactPersonMobile', 'phone_number', 'phoneNumber', 
        'contact_number', 'contactNumber', 'phone', 'mobile', 'mobileNumber', 'telephone', 'tel'];

      const extractedContact = extractField([clientDetailsData, dashboardData, firstLocation], contactFieldVariations) || 
        apiData.users?.[0]?.name || apiData.users?.[0]?.full_name || "—";
      const extractedPhone = extractField([clientDetailsData, dashboardData, firstLocation], phoneFieldVariations) || 
        apiData.users?.[0]?.phone || apiData.users?.[0]?.phone_number || "—";
      const extractedClientName = clientName || extractField([clientDetailsData, dashboardData], 
        ['org_name', 'orgName', 'name', 'client_name', 'clientName']) || firstLocation.branch_code?.split('_')[0] || "—";
      const extractedLocation = extractField([firstLocation], ['loc_name', 'name', 'location_name']);
      const extractedAddress = extractField([firstLocation, clientDetailsData], ['loc_address', 'address', 'full_address']);

      console.log('📋 CLIENT DETAILS:', { clientId, clientName: extractedClientName, contactPerson: extractedContact, 
        contactNumber: extractedPhone, location: extractedLocation, address: extractedAddress });

      // Row 1: Client Details & Report Statistics
      const row1Y = summaryTableY + summaryHeight + 6; // Start after Summary table
      const cardWidth = (pageWidth - marginX * 2 - 4) / 2;
      const cardHeight = 50;

      // Client Details Card
      drawCard(pdf, marginX, row1Y, cardWidth, cardHeight, "Client Details");

      const detailLines = [
        ["Client", extractedClientName],
        ["Location", extractedLocation],
        ["Address", extractedAddress],
        ["Contact Person", extractedContact],
        ["Contact Number", extractedPhone],
      ];

      const detailTableStartY = row1Y + 11;
      const detailRowHeight = 7.5; // Fixed row height for consistent spacing
      const labelColWidth = cardWidth * 0.35;
      const valueColX = marginX + 2 + labelColWidth;
      const detailContentHeight = detailRowHeight * detailLines.length;

      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(marginX + 2, detailTableStartY, marginX + cardWidth - 2, detailTableStartY);
      pdf.line(valueColX, detailTableStartY, valueColX, detailTableStartY + detailContentHeight);

      let detailY = detailTableStartY;
      detailLines.forEach(([label, value], index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(marginX + 2, detailY, cardWidth - 4, detailRowHeight, 'F');
        }
        
      pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, label, marginX + 3, detailY + (detailRowHeight / 2) + 1);

      pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.setTextColor(17, 24, 39);
        safeText(pdf, String(value), valueColX + 2, detailY + (detailRowHeight / 2) + 1);
        
        if (index < detailLines.length - 1) {
        pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          pdf.line(marginX + 2, detailY + detailRowHeight, marginX + cardWidth - 2, detailY + detailRowHeight);
        }
        
        detailY += detailRowHeight;
      });

      // Report Statistics Card
      const statsX = marginX + cardWidth + 4;
      drawCard(pdf, statsX, row1Y, cardWidth, cardHeight, "Report Statistics");

      const locationHours = apiCarbonResponse?.active_inactive?.location_hours ?? apiData.carbon?.active_inactive?.location_hours ?? apiData.hourly?.active_inactive?.location_hours;
      let workingHrs = 240;
      if (locationHours) {
        const firstLocHours = Object.values(locationHours)[0];
        if (firstLocHours?.start && firstLocHours?.end) {
          const startHour = parseInt(firstLocHours.start.split(':')[0]);
          const endHour = parseInt(firstLocHours.end.split(':')[0]);
          workingHrs = (endHour - startHour) * 30;
        }
      }

      const totalLocationsCount = safeNumber(dashboardData.total_locations, locationsData.length || totalLocations || 0);
      const reportType = timeframe === 'daily' ? 'Daily Audit' : timeframe === 'monthly' ? 'Monthly Audit' : 
                         timeframe === 'yearly' ? 'Yearly Audit' : 'Custom Period Audit';
      
      const statsLeft = [
        ["REPORT TYPE", reportType],
        ["TOTAL CONSUMPTION", `${formatFixed(totalEnergyKwh, 0)} kWh`],
        ["WORKING HRS", `${workingHrs} Hrs`],
        ["ACTUAL CONSUMPTION", `${formatFixed(totalEnergyKwh, 0)} kWh`],
      ];

      const statsRight = [
        ["REPORT LEVEL", "Client Aggregate"],
        ["TOTAL LOCATIONS / DEVICES", `${totalLocationsCount} Sites, ${totalDevices} Devices`],
        ["BASELINE", `${formatFixed(baselineEnergyKwh, 0)} kWh`],
        ["PROJECTED SAVING", `${formatFixed(projectedSaving, 0)} kWh (${formatFixed(projectedSavingPct, 1)}%)`],
      ];

      const tableStartY = row1Y + 11;
      const midColumnX = statsX + cardWidth / 2;
      const statsRowHeight = 9; // Row height that fits well in 50mm card
      const statsContentHeight = statsRowHeight * 4; // 4 rows total

        pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(midColumnX, tableStartY, midColumnX, tableStartY + statsContentHeight);
      pdf.line(statsX + 2, tableStartY, statsX + cardWidth - 2, tableStartY);

      let statsY = tableStartY + 2;
      const leftColX = statsX + 3;
      const rightColX = midColumnX + 3;

      [statsLeft, statsRight].forEach((stats, colIndex) => {
        statsY = tableStartY + 2;
        const colX = colIndex === 0 ? leftColX : rightColX;
        
        stats.forEach(([label, value], index) => {
          if (index % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(colIndex === 0 ? statsX + 2 : midColumnX, statsY - 2, (cardWidth / 2) - 2, statsRowHeight, 'F');
          }
          
        pdf.setFont("helvetica", "bold");
          pdf.setTextColor(107, 114, 128);
          pdf.setFontSize(5.5);
          safeText(pdf, label, colX, statsY + 1.5);
          
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
        if (label === "PROJECTED SAVING") {
            pdf.setTextColor(16, 185, 129);
          } else {
            pdf.setTextColor(17, 24, 39);
          }
          safeText(pdf, value, colX, statsY + 5.5);
          
          if (index < stats.length - 1) {
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.2);
            const lineStartX = colIndex === 0 ? statsX + 2 : midColumnX;
            const lineEndX = colIndex === 0 ? midColumnX : statsX + cardWidth - 2;
            pdf.line(lineStartX, statsY + 7, lineEndX, statsY + 7);
          }
          
          statsY += statsRowHeight;
        });
      });

      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(statsX + 2, row1Y + cardHeight - 2, statsX + cardWidth - 2, row1Y + cardHeight - 2);

      // Row 2: Net Power Consumption, Energy Chart - OPTIMIZED SIZE
      const row2Y = row1Y + cardHeight + 6; // Reduced spacing from 8 to 6
      const chartBoxHeight = 78; // Optimized height to fit page better
      const totalHoursConsumption = activeHoursConsumption + inactiveHoursConsumption;
      const activePercent = totalHoursConsumption > 0 ? (activeHoursConsumption / totalHoursConsumption) * 100 : 0;
      const inactivePercent = totalHoursConsumption > 0 ? (inactiveHoursConsumption / totalHoursConsumption) * 100 : 0;

      // Net Power Consumption Card
      drawCard(pdf, marginX, row2Y, cardWidth, chartBoxHeight, "Net Power Consumption");

      if (pieChartImage) {
        const pieSize = 52; // Increased from 48 to 52 for better visibility
        pdf.addImage(pieChartImage, "PNG", marginX + cardWidth / 2 - pieSize / 2, row2Y + 14, pieSize, pieSize);
      }

      // Legend indicators - properly aligned vertically
      const legendBaseY = row2Y + chartBoxHeight - 10;
      const legendSpacing = 5; // Consistent spacing between Active and Inactive rows
      const circleRadius = 2;
      const circleX = marginX + 10;
      const textStartX = marginX + 16;
      const percentStartX = marginX + 32;
      
      pdf.setFontSize(8);
      
      // Active indicator
      pdf.setFillColor(16, 185, 129);
      pdf.circle(circleX, legendBaseY, circleRadius, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(17, 24, 39);
      safeText(pdf, "Active", textStartX, legendBaseY + 1);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(16, 185, 129);
      safeText(pdf, `(${formatFixed(activePercent, 0)}%)`, percentStartX, legendBaseY + 1);

      // Inactive indicator
      pdf.setFillColor(229, 231, 235);
      pdf.circle(circleX, legendBaseY + legendSpacing, circleRadius, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(17, 24, 39);
      safeText(pdf, "Inactive", textStartX, legendBaseY + legendSpacing + 1);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, `(${formatFixed(inactivePercent, 0)}%)`, percentStartX, legendBaseY + legendSpacing + 1);

      // Energy Consumption Chart
      const energyChartX = statsX;
      drawCard(pdf, energyChartX, row2Y, cardWidth, chartBoxHeight, "Energy Consumption (kWh)");

      if (energyChartImage && energySeries.length > 0) {
        pdf.addImage(energyChartImage, "PNG", energyChartX + 4, row2Y + 11, cardWidth - 8, chartBoxHeight - 14);
      } else if (energySeries.length > 0) {
        drawLineChart(pdf, energyChartX + 4, row2Y + 11, cardWidth - 8, chartBoxHeight - 14, energySeries, baselineEnergyKwh, "kWh");
      } else {
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont("helvetica", "italic");
        safeText(pdf, "No energy consumption data available", energyChartX + cardWidth / 2, row2Y + chartBoxHeight / 2, { align: "center" });
      }

      // Row 3: Hourly Usage & CO2 Emission
      const row3Y = row2Y + chartBoxHeight + 6; // Reduced spacing from 8 to 6
      let summaryY;

      if (timeframe === 'daily' && hourlyUsageChartImage) {
        drawCard(pdf, marginX, row3Y, cardWidth, chartBoxHeight, "Hourly Usage");
        pdf.addImage(hourlyUsageChartImage, "PNG", marginX + 4, row3Y + 11, cardWidth - 8, chartBoxHeight - 14);

        const co2ChartX = statsX;
        drawCard(pdf, co2ChartX, row3Y, cardWidth, chartBoxHeight, "CO2 Emission (kg)");
      if (co2ChartImage && carbonSeries.length > 0) {
          pdf.addImage(co2ChartImage, "PNG", co2ChartX + 4, row3Y + 11, cardWidth - 8, chartBoxHeight - 14);
        } else if (carbonSeries.length > 0) {
          drawLineChart(pdf, co2ChartX + 4, row3Y + 11, cardWidth - 8, chartBoxHeight - 14, carbonSeries, baselineCarbonKg, "kg CO2");
        }

        summaryY = row3Y + chartBoxHeight + 4; // Reduced spacing
      } else {
        drawCard(pdf, marginX, row3Y, pageWidth - marginX * 2, chartBoxHeight, "CO2 Emission (kg)");
        if (co2ChartImage && carbonSeries.length > 0) {
          pdf.addImage(co2ChartImage, "PNG", marginX + 4, row3Y + 11, pageWidth - marginX * 2 - 8, chartBoxHeight - 14);
        } else if (carbonSeries.length > 0) {
          drawLineChart(pdf, marginX + 4, row3Y + 11, pageWidth - marginX * 2 - 8, chartBoxHeight - 14, carbonSeries, baselineCarbonKg, "kg CO2");
        }

        summaryY = row3Y + chartBoxHeight + 4;
      }

      // Footer
      const footerY = pageHeight - 7;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);
      pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128);
      safeText(pdf, "i-EMS Client Dashboard", pageWidth / 2, footerY, { align: "center" });

      // Fetch location-level data for new sections
      let locationMetricsData = [];
      if (locationsData && locationsData.length > 0) {
        console.log('📊 Fetching location metrics for', locationsData.length, 'locations...');
        const locationFilters = {
          timeframe,
          date: apiData.filters.date,
          month: apiData.filters.month,
          year: apiData.filters.year,
          customStartDate: apiData.filters.customStartDate,
          customEndDate: apiData.filters.customEndDate
        };

        // Fetch data for all locations in parallel
        const locationPromises = locationsData.map(async (location) => {
          const locationId = location.loc_id || location.location_id || location.id;
          if (!locationId) return null;

          try {
            const locationData = await fetchLocationDashboardAPIs(locationId, locationFilters);
            const locationName = location.loc_name || location.name || location.location_name || `Location ${locationId}`;
            
            // Extract metrics
            const hourlyData = locationData.hourly || {};
            const energySavedData = locationData.energySaved || {};
            
            const activeHoursConsumption = safeNumber(
              hourlyData.active_inactive?.active_hours_consumption || 
              energySavedData.active_inactive?.active_hours_consumption || 0
            );
            const inactiveHoursConsumption = safeNumber(
              hourlyData.active_inactive?.inactive_hours_consumption || 
              energySavedData.active_inactive?.inactive_hours_consumption || 0
            );
            const totalConsumption = safeNumber(
              energySavedData.total_actual_consumption || 
              hourlyData.total_consumption || 
              activeHoursConsumption + inactiveHoursConsumption || 0
            );
            const energySaved = safeNumber(
              energySavedData.total_energy_saved || 0
            );

            return {
              locationId,
              locationName: locationName.length > 20 ? locationName.substring(0, 17) + '...' : locationName,
              activeHoursConsumption,
              inactiveHoursConsumption,
              totalConsumption,
              energySaved,
              locationData // Store for later use in location pages
            };
          } catch (error) {
            console.error(`Error fetching data for location ${locationId}:`, error);
            return null;
          }
        });

        locationMetricsData = (await Promise.all(locationPromises)).filter(Boolean);
        console.log('✅ Fetched metrics for', locationMetricsData.length, 'locations');
      }

      // Add new sections: Location vs Active/Inactive Hours and Top Consumption/Savings
      if (locationMetricsData.length > 0) {
        // Check if we need a new page
        let locationSectionY = summaryY + summaryHeight + 4;
        if (locationSectionY > pageHeight - 50) {
          pdf.addPage();
          locationSectionY = 15;
          pdf.setFillColor(249, 250, 251);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
        }

        // Prepare sorted data for tables
        const sortedByActive = [...locationMetricsData]
          .sort((a, b) => b.activeHoursConsumption - a.activeHoursConsumption)
          .slice(0, 10);
        
        const sortedByInactive = [...locationMetricsData]
          .sort((a, b) => b.inactiveHoursConsumption - a.inactiveHoursConsumption)
          .slice(0, 10);
        
        const sortedByConsumption = [...locationMetricsData]
          .sort((a, b) => b.totalConsumption - a.totalConsumption)
          .slice(0, 10);
        
        const sortedBySavings = [...locationMetricsData]
          .filter(loc => loc.energySaved > 0)
          .sort((a, b) => b.energySaved - a.energySaved)
          .slice(0, 10);

        // Create charts for each metric
        const activeHoursChart = createLocationBarChart(
          sortedByActive,
          'activeHoursConsumption',
          '#10b981',
          'Active Hours (kWh)'
        );
        const inactiveHoursChart = createLocationBarChart(
          sortedByInactive,
          'inactiveHoursConsumption',
          '#6b7280',
          'Inactive Hours (kWh)'
        );
        const consumptionChart = createLocationBarChart(
          sortedByConsumption,
          'totalConsumption',
          '#8b5cf6',
          'Total Consumption (kWh)'
        );
        const savingsChart = createLocationBarChart(
          sortedBySavings,
          'energySaved',
          '#f59e0b',
          'Energy Saved (kWh)'
        );

        // Calculate layout dimensions - table and chart side by side
        const contentWidth = pageWidth - marginX * 2;
        const tableWidth = contentWidth * 0.48; // 48% for table
        const chartWidth = contentWidth * 0.48; // 48% for chart
        const gap = contentWidth * 0.04; // 4% gap between them

        // Table 1: Location vs Active Hours
        const table1Height = Math.max(50, 18 + (sortedByActive.length * 5.5)); // Slightly reduced height
        const section1Height = Math.max(table1Height, 58); // Reduced minimum height for chart
        
        // Draw table card (left side)
        drawCard(pdf, marginX, locationSectionY, tableWidth, section1Height, "Location vs Active Hours");
        
        if (sortedByActive.length > 0) {
          const table1StartY = locationSectionY + 11;
          const table1ContentWidth = tableWidth - 8;
          const col1Width = table1ContentWidth * 0.12; // Rank - slightly smaller
          const col2Width = table1ContentWidth * 0.52; // Location Name - larger for better fit
          const col3Width = table1ContentWidth * 0.36; // Active Hours (kWh)
          
          // Header
          pdf.setFillColor(249, 250, 251);
          pdf.rect(marginX + 4, table1StartY, table1ContentWidth, 6.5, "F");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(75, 85, 99);
          safeText(pdf, "RANK", marginX + 4 + col1Width / 2, table1StartY + 4, { align: "center" });
          safeText(pdf, "LOCATION", marginX + 4 + col1Width + col2Width / 2, table1StartY + 4, { align: "center" });
          safeText(pdf, "ACTIVE (kWh)", marginX + 4 + col1Width + col2Width + col3Width / 2, table1StartY + 4, { align: "center" });
          
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.3);
          pdf.line(marginX + 4, table1StartY + 6.5, marginX + 4 + table1ContentWidth, table1StartY + 6.5);
          pdf.line(marginX + 4 + col1Width, table1StartY, marginX + 4 + col1Width, table1StartY + table1Height - 10);
          pdf.line(marginX + 4 + col1Width + col2Width, table1StartY, marginX + 4 + col1Width + col2Width, table1StartY + table1Height - 10);
          
          // Rows
          let rowY = table1StartY + 6.5;
          sortedByActive.forEach((loc, idx) => {
            if (idx % 2 === 0) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(marginX + 4, rowY, table1ContentWidth, 6, "F");
            }
            
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(17, 24, 39);
            safeText(pdf, String(idx + 1), marginX + 4 + col1Width / 2, rowY + 4, { align: "center" });
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.5);
            // Truncate location name if too long to fit in column
            const locationName = loc.locationName.length > 18 ? loc.locationName.substring(0, 16) + '..' : loc.locationName;
            safeText(pdf, locationName, marginX + 4 + col1Width + 1.5, rowY + 4);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(16, 185, 129);
            safeText(pdf, formatFixed(loc.activeHoursConsumption, 2), marginX + 4 + col1Width + col2Width + col3Width / 2, rowY + 4, { align: "center" });
            
            if (idx < sortedByActive.length - 1) {
              pdf.setDrawColor(229, 231, 235);
              pdf.setLineWidth(0.2);
              pdf.line(marginX + 4, rowY + 6, marginX + 4 + table1ContentWidth, rowY + 6);
            }
            rowY += 5.5; // Slightly reduced row spacing to fit footer
          });
        } else {
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No data available", marginX + tableWidth / 2, locationSectionY + section1Height / 2, { align: "center" });
        }

        // Draw chart card (right side)
        if (activeHoursChart) {
          drawCard(pdf, marginX + tableWidth + gap, locationSectionY, chartWidth, section1Height, "Active Hours Distribution");
          const chartX = marginX + tableWidth + gap + 4;
          const chartY = locationSectionY + 11;
          const chartHeight = section1Height - 14;
          pdf.addImage(activeHoursChart, "PNG", chartX, chartY, chartWidth - 8, chartHeight);
        }

        locationSectionY += section1Height + 3;

        // Table 2: Location vs Inactive Hours
        if (locationSectionY + 60 > pageHeight - 10) {
          pdf.addPage();
          locationSectionY = 15;
          pdf.setFillColor(249, 250, 251);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
        }

        const table2Height = Math.max(50, 18 + (sortedByInactive.length * 5.5)); // Slightly reduced height
        const section2Height = Math.max(table2Height, 58); // Reduced minimum height for chart
        
        // Draw table card (left side)
        drawCard(pdf, marginX, locationSectionY, tableWidth, section2Height, "Location vs Inactive Hours");
        
        if (sortedByInactive.length > 0) {
          const table2StartY = locationSectionY + 11;
          const table2ContentWidth = tableWidth - 8;
          const col1Width = table2ContentWidth * 0.12;
          const col2Width = table2ContentWidth * 0.52;
          const col3Width = table2ContentWidth * 0.36;
          
          // Header
          pdf.setFillColor(249, 250, 251);
          pdf.rect(marginX + 4, table2StartY, table2ContentWidth, 6.5, "F");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(75, 85, 99);
          safeText(pdf, "RANK", marginX + 4 + col1Width / 2, table2StartY + 4, { align: "center" });
          safeText(pdf, "LOCATION", marginX + 4 + col1Width + col2Width / 2, table2StartY + 4, { align: "center" });
          safeText(pdf, "INACTIVE (kWh)", marginX + 4 + col1Width + col2Width + col3Width / 2, table2StartY + 4, { align: "center" });
          
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.3);
          pdf.line(marginX + 4, table2StartY + 6.5, marginX + 4 + table2ContentWidth, table2StartY + 6.5);
          pdf.line(marginX + 4 + col1Width, table2StartY, marginX + 4 + col1Width, table2StartY + table2Height - 10);
          pdf.line(marginX + 4 + col1Width + col2Width, table2StartY, marginX + 4 + col1Width + col2Width, table2StartY + table2Height - 10);
          
          // Rows
          let rowY = table2StartY + 6.5;
          sortedByInactive.forEach((loc, idx) => {
            if (idx % 2 === 0) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(marginX + 4, rowY, table2ContentWidth, 6, "F");
            }
            
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(17, 24, 39);
            safeText(pdf, String(idx + 1), marginX + 4 + col1Width / 2, rowY + 4, { align: "center" });
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.5);
            const locationName = loc.locationName.length > 18 ? loc.locationName.substring(0, 16) + '..' : loc.locationName;
            safeText(pdf, locationName, marginX + 4 + col1Width + 1.5, rowY + 4);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(107, 114, 128);
            safeText(pdf, formatFixed(loc.inactiveHoursConsumption, 2), marginX + 4 + col1Width + col2Width + col3Width / 2, rowY + 4, { align: "center" });
            
            if (idx < sortedByInactive.length - 1) {
              pdf.setDrawColor(229, 231, 235);
              pdf.setLineWidth(0.2);
              pdf.line(marginX + 4, rowY + 6, marginX + 4 + table2ContentWidth, rowY + 6);
            }
            rowY += 5.5; // Slightly reduced row spacing to fit footer
          });
        } else {
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No data available", marginX + tableWidth / 2, locationSectionY + section2Height / 2, { align: "center" });
        }

        // Draw chart card (right side)
        if (inactiveHoursChart) {
          drawCard(pdf, marginX + tableWidth + gap, locationSectionY, chartWidth, section2Height, "Inactive Hours Distribution");
          const chartX = marginX + tableWidth + gap + 4;
          const chartY = locationSectionY + 11;
          const chartHeight = section2Height - 14;
          pdf.addImage(inactiveHoursChart, "PNG", chartX, chartY, chartWidth - 8, chartHeight);
        }

        locationSectionY += section2Height + 3;

        // Table 3: Top Consumption by Location
        if (locationSectionY + 60 > pageHeight - 10) {
          pdf.addPage();
          locationSectionY = 15;
          pdf.setFillColor(249, 250, 251);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
        }

        const table3Height = Math.max(50, 18 + (sortedByConsumption.length * 5.5)); // Slightly reduced height
        const section3Height = Math.max(table3Height, 58); // Reduced minimum height for chart
        
        // Draw table card (left side)
        drawCard(pdf, marginX, locationSectionY, tableWidth, section3Height, "Top Consumption by Location");
        
        if (sortedByConsumption.length > 0) {
          const table3StartY = locationSectionY + 11;
          const table3ContentWidth = tableWidth - 8;
          const col1Width = table3ContentWidth * 0.12;
          const col2Width = table3ContentWidth * 0.52;
          const col3Width = table3ContentWidth * 0.36;
          
          // Header
          pdf.setFillColor(249, 250, 251);
          pdf.rect(marginX + 4, table3StartY, table3ContentWidth, 6.5, "F");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(75, 85, 99);
          safeText(pdf, "RANK", marginX + 4 + col1Width / 2, table3StartY + 4, { align: "center" });
          safeText(pdf, "LOCATION", marginX + 4 + col1Width + col2Width / 2, table3StartY + 4, { align: "center" });
          safeText(pdf, "TOTAL (kWh)", marginX + 4 + col1Width + col2Width + col3Width / 2, table3StartY + 4, { align: "center" });
          
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.3);
          pdf.line(marginX + 4, table3StartY + 6.5, marginX + 4 + table3ContentWidth, table3StartY + 6.5);
          pdf.line(marginX + 4 + col1Width, table3StartY, marginX + 4 + col1Width, table3StartY + table3Height - 10);
          pdf.line(marginX + 4 + col1Width + col2Width, table3StartY, marginX + 4 + col1Width + col2Width, table3StartY + table3Height - 10);
          
          // Rows
          let rowY = table3StartY + 6.5;
          sortedByConsumption.forEach((loc, idx) => {
            if (idx % 2 === 0) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(marginX + 4, rowY, table3ContentWidth, 6, "F");
            }
            
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(17, 24, 39);
            safeText(pdf, String(idx + 1), marginX + 4 + col1Width / 2, rowY + 4, { align: "center" });
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.5);
            const locationName = loc.locationName.length > 18 ? loc.locationName.substring(0, 16) + '..' : loc.locationName;
            safeText(pdf, locationName, marginX + 4 + col1Width + 1.5, rowY + 4);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(139, 92, 246);
            safeText(pdf, formatFixed(loc.totalConsumption, 2), marginX + 4 + col1Width + col2Width + col3Width / 2, rowY + 4, { align: "center" });
            
            if (idx < sortedByConsumption.length - 1) {
              pdf.setDrawColor(229, 231, 235);
              pdf.setLineWidth(0.2);
              pdf.line(marginX + 4, rowY + 6, marginX + 4 + table3ContentWidth, rowY + 6);
            }
            rowY += 5.5; // Slightly reduced row spacing to fit footer
          });
        } else {
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No data available", marginX + tableWidth / 2, locationSectionY + section3Height / 2, { align: "center" });
        }

        // Draw chart card (right side)
        if (consumptionChart) {
          drawCard(pdf, marginX + tableWidth + gap, locationSectionY, chartWidth, section3Height, "Consumption Distribution");
          const chartX = marginX + tableWidth + gap + 4;
          const chartY = locationSectionY + 11;
          const chartHeight = section3Height - 14;
          pdf.addImage(consumptionChart, "PNG", chartX, chartY, chartWidth - 8, chartHeight);
        }

        locationSectionY += section3Height + 3;

        // Table 4: Top Savings by Location
        if (locationSectionY + 60 > pageHeight - 10) {
          pdf.addPage();
          locationSectionY = 15;
          pdf.setFillColor(249, 250, 251);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
        }

        const table4Height = sortedBySavings.length > 0 ? Math.max(50, 18 + (sortedBySavings.length * 5.5)) : 40; // Slightly reduced height
        const section4Height = Math.max(table4Height, 58); // Reduced minimum height for chart
        
        // Draw table card (left side)
        drawCard(pdf, marginX, locationSectionY, tableWidth, section4Height, "Top Savings by Location");
        
        if (sortedBySavings.length > 0) {
          const table4StartY = locationSectionY + 11;
          const table4ContentWidth = tableWidth - 8;
          const col1Width = table4ContentWidth * 0.12;
          const col2Width = table4ContentWidth * 0.52;
          const col3Width = table4ContentWidth * 0.36;
          
          // Header
          pdf.setFillColor(249, 250, 251);
          pdf.rect(marginX + 4, table4StartY, table4ContentWidth, 6.5, "F");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(75, 85, 99);
          safeText(pdf, "RANK", marginX + 4 + col1Width / 2, table4StartY + 4, { align: "center" });
          safeText(pdf, "LOCATION", marginX + 4 + col1Width + col2Width / 2, table4StartY + 4, { align: "center" });
          safeText(pdf, "SAVED (kWh)", marginX + 4 + col1Width + col2Width + col3Width / 2, table4StartY + 4, { align: "center" });
          
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.3);
          pdf.line(marginX + 4, table4StartY + 6.5, marginX + 4 + table4ContentWidth, table4StartY + 6.5);
          pdf.line(marginX + 4 + col1Width, table4StartY, marginX + 4 + col1Width, table4StartY + table4Height - 10);
          pdf.line(marginX + 4 + col1Width + col2Width, table4StartY, marginX + 4 + col1Width + col2Width, table4StartY + table4Height - 10);
          
          // Rows
          let rowY = table4StartY + 6.5;
          sortedBySavings.forEach((loc, idx) => {
            if (idx % 2 === 0) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(marginX + 4, rowY, table4ContentWidth, 6, "F");
            }
            
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(17, 24, 39);
            safeText(pdf, String(idx + 1), marginX + 4 + col1Width / 2, rowY + 4, { align: "center" });
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.5);
            const locationName = loc.locationName.length > 18 ? loc.locationName.substring(0, 16) + '..' : loc.locationName;
            safeText(pdf, locationName, marginX + 4 + col1Width + 1.5, rowY + 4);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(245, 158, 11);
            safeText(pdf, formatFixed(loc.energySaved, 2), marginX + 4 + col1Width + col2Width + col3Width / 2, rowY + 4, { align: "center" });
            
            if (idx < sortedBySavings.length - 1) {
              pdf.setDrawColor(229, 231, 235);
              pdf.setLineWidth(0.2);
              pdf.line(marginX + 4, rowY + 6, marginX + 4 + table4ContentWidth, rowY + 6);
            }
            rowY += 5.5; // Slightly reduced row spacing to fit footer
          });
        } else {
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(107, 114, 128);
          safeText(pdf, "No savings data available", marginX + tableWidth / 2, locationSectionY + section4Height / 2, { align: "center" });
        }

        // Draw chart card (right side)
        if (savingsChart) {
          drawCard(pdf, marginX + tableWidth + gap, locationSectionY, chartWidth, section4Height, "Energy Savings Distribution");
          const chartX = marginX + tableWidth + gap + 4;
          const chartY = locationSectionY + 11;
          const chartHeight = section4Height - 14;
          pdf.addImage(savingsChart, "PNG", chartX, chartY, chartWidth - 8, chartHeight);
        }

        locationSectionY += section4Height + 3;

        // Footer for location sections page - Always position at the very bottom of the page
        // Check if content extends beyond page, if so add new page for footer
        if (locationSectionY > pageHeight - 12) {
          // Content is too close to bottom, add new page for footer
          pdf.addPage();
          pdf.setFillColor(249, 250, 251);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
        }
        
        // Position footer at the very bottom of the current page (5mm from bottom edge)
        const locationSectionsFooterY = pageHeight - 5;
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.2);
        pdf.line(marginX, locationSectionsFooterY - 3, pageWidth - marginX, locationSectionsFooterY - 3);
        pdf.setFontSize(6);
        pdf.setTextColor(107, 114, 128);
        safeText(pdf, "i-EMS Client Dashboard", pageWidth / 2, locationSectionsFooterY, { align: "center" });
      }

      // Add Location Pages (moved to after the new sections)
      if (locationsData && locationsData.length > 0) {
        // Store location data from metrics fetch to avoid re-fetching
        const locationDataMap = new Map();
        locationMetricsData.forEach(loc => {
          if (loc.locationData) {
            locationDataMap.set(loc.locationId, loc.locationData);
          }
        });
        for (const location of locationsData) {
          const locationId = location.loc_id || location.location_id || location.id;
          if (!locationId) continue;

          try {
            // Use cached data if available, otherwise fetch
            let locationData = locationDataMap.get(locationId);
            if (!locationData) {
              const locationFilters = {
                timeframe,
                date: apiData.filters.date,
                month: apiData.filters.month,
                year: apiData.filters.year,
                customStartDate: apiData.filters.customStartDate,
                customEndDate: apiData.filters.customEndDate
              };
              locationData = await fetchLocationDashboardAPIs(locationId, locationFilters);
            }
            await generateLocationPage(pdf, location, locationData, timeframe);
          } catch (error) {
            console.error(`Error generating page for location ${locationId}:`, error);
          }
        }
      }

      const fileName = `Client_${clientName || clientId}_Energy_Saving_Report_${moment().format("YYYYMMDD_HHmm")}.pdf`;
      
      if (returnBlob) {
        return pdf.output('blob');
      } else {
        pdf.save(fileName);
        return null;
      }
    } catch (err) {
      console.error("Error generating client PDF report:", err);
      if (!returnBlob) {
        alert(`Failed to generate client report PDF: ${err?.message || "Unknown error"}`);
      }
      return null;
    }
  };

  const generatePDF = async () => {
    if (!clientId) return;
    setIsGenerating(true);

    try {
      const filters = buildDateFilters();
      const apiData = await fetchClientDashboardAPIs(clientId, filters);
      await generatePDFInternal(apiData, false);
    } catch (err) {
      console.error("Error generating client PDF report:", err);
      alert(`Failed to generate client report PDF: ${err?.message || "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-lg transition-all ${
  isGenerating
    ? "bg-gray-500 text-gray-300 cursor-wait"
    : "bg-[#76df23] text-white hover:scale-105 active:scale-95"
}`}

        title="Download Energy Saving Report (PDF)"
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
});

ClientDashboardPDFReport.displayName = 'ClientDashboardPDFReport';

export default ClientDashboardPDFReport;
