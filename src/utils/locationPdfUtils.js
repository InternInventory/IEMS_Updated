// --- FULL PDF LOGIC MOVED FROM PDFReport.jsx ---

import jsPDF from "jspdf";
import moment from "moment";
import axios from "axios";
import buildIntLogo from "../assets/img/Fevicon of BuildINT.png";
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

ChartJS.register(
  ArcElement, LineElement, PointElement, BarElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
  PieController, LineController, BarController
);

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
    pdf.text("", x, y, options);
  }
};

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

const formatTimestamp = (timestamp, timeframe) => {
  if (!timestamp) return "";
  const format = timeframe === "yearly" ? "MMM YYYY" :
    timeframe === "monthly" || timeframe === "custom" ? "DD MMM" : "HH:mm";
  return moment(timestamp).format(format);
};

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
    datasets: [
      {
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
      }
    ]
  }, {
    width: 1400,
    height: 700,
    chartOptions: getChartOptions('Power Consumption (kWh)', 'Time', 'daily')
  });
};

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

export async function generateLocationPDFBuffer({
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
}) {
  // --- PDF Content Logic ---
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 10;

  // Header and Info Bar
  pdf.setFillColor(249, 250, 251);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  try {
    pdf.addImage(buildIntLogo, 'PNG', marginX + 2, 6, 8, 8);
  } catch (err) {}
  pdf.setFontSize(16);
  pdf.setTextColor(16, 185, 129);
  pdf.setFont("helvetica", "bold");
  safeText(pdf, "Location Performance Report", marginX + 13, 10);
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "normal");
  safeText(pdf, locationData.loc_name || "Location Details", marginX + 13, 16);
  const timestamp = `Generated on ${moment().format("DD MMM YYYY, HH:mm")}`;
  pdf.setFontSize(7);
  safeText(pdf, timestamp, pageWidth - marginX - 2, 10, { align: "right" });
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

  // --- Metrics, Series, Summary Table, Charts, Device Tables ---
  // (Copy all logic from PDFReport.jsx, excluding React state/alert, and replace pdf.save(fileName) with return pdf.output('uint8array'))
  // ...existing code for summary, charts, device tables...

  // At the end:
    return pdf.output("uint8array");
  }

  // Utility: Generate a PDF Uint8Array for a list of locations (summary table)
  export async function generateLocationPDFUint8Array(locations) {
    const jsPDF = (await import("jspdf")).default;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text("Locations Report", 10, 15);
    pdf.setFontSize(10);
    const headers = ["Name", "Branch", "Region", "Status", "Client"];
    let y = 25;
    pdf.setFont(undefined, "bold");
    headers.forEach((h, i) => pdf.text(h, 10 + i * 50, y));
    pdf.setFont(undefined, "normal");
    y += 7;
    locations.forEach((loc, idx) => {
      pdf.text(String(loc.loc_name || ""), 10, y);
      pdf.text(String(loc.branch_code || ""), 60, y);
      pdf.text(String(loc.region_name || ""), 110, y);
      pdf.text(loc.is_active ? "Active" : "Inactive", 160, y);
      pdf.text(String(loc.org_name || loc.clientName || ""), 210, y);
      y += 7;
      if (y > 190) {
        pdf.addPage();
        y = 20;
      }
    });
    return pdf.output("uint8array");
  }