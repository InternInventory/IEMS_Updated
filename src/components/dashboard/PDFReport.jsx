import React, { useRef } from 'react';
import moment from 'moment';
import jsPDF from 'jspdf';
import {
  FileText, TrendingUp, Zap, Leaf, Activity, Target,
  Building, BarChart3, PieChart, LineChart
} from 'lucide-react';
import {
  LineChart as RechartsLine, Line, BarChart, Bar,
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie as PieSlice, Cell
} from 'recharts';

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatFixed = (value, decimals = 2) => {
  const n = safeNumber(value, NaN);
  return Number.isFinite(n) ? n.toFixed(decimals) : '-';
};

// Safe text helper for jsPDF
const safeText = (pdf, text, x, y, options = {}) => {
  try {
    const safeStr = String(text ?? '').replace(/[^\x20-\x7E\n\r]/g, '');
    pdf.text(safeStr, x, y, options);
  } catch (e) {
    try {
      pdf.text(String(text ?? '').substring(0, 60), x, y, options);
    } catch (e2) {
      // eslint-disable-next-line no-console
      console.error('Failed to render text in PDFReport:', e2);
    }
  }
};

// Simple horizontal bar chart for hourly usage
const drawBarChart = (pdf, data, x, y, width, height, maxValue) => {
  if (!Array.isArray(data) || data.length === 0 || !maxValue || maxValue <= 0) return;

  const chartBottom = y + height - 10;
  const chartTop = y + 5;
  const chartHeight = chartBottom - chartTop;
  const barGap = 1;
  const barWidth = (width - (data.length + 1) * barGap) / data.length;

  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.1);
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const gy = chartTop + (chartHeight * i) / steps;
    pdf.line(x, gy, x + width, gy);
  }

  data.forEach((item, index) => {
    const usage = safeNumber(item.usage, 0);
    if (usage <= 0) return;

    const barHeight = (usage / maxValue) * (chartHeight - 5);
    const bx = x + barGap + index * (barWidth + barGap);
    const by = chartBottom - barHeight;

    pdf.setFillColor(245, 158, 11);
    pdf.setDrawColor(217, 119, 6);
    pdf.rect(bx, by, barWidth, barHeight, 'FD');
  });

  pdf.setFontSize(6);
  pdf.setTextColor(107, 114, 128);
  data.forEach((item, index) => {
    if (index % 2 !== 0) return;
    const label = item.hour || item.time || '';
    if (!label) return;
    const lx = x + barGap + index * (barWidth + barGap) + barWidth / 2;
    const ly = chartBottom + 3;
    safeText(pdf, label, lx, ly, { align: 'center' });
  });
};

const PDFReport = ({
  locationData = {},
  powerConsumptionData = [],
  hourlyUsageData = [],
  energySavedData = [],
  carbonFootprintData = [],
  energySavedResponse = {},
  carbonFootprintResponse = {},
  timeframe,
  selectedDate,
  selectedMonth,
  selectedYear,
  customStartDate,
  customEndDate,
  disabled = false,
  selectedLines = {},
}) => {
  const reportRef = useRef(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Suppress Recharts defaultProps warnings (library issue, will be fixed in future Recharts version)
  React.useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Support for defaultProps') && 
         (args[0].includes('XAxis') || args[0].includes('YAxis')))
      ) {
        return;
      }
      originalError(...args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const getDateRangeTitle = () => {
    switch (timeframe) {
      case 'daily':
        return selectedDate ? moment(selectedDate).format('DD MMM YYYY') : moment().format('DD MMM YYYY');
      case 'monthly':
        return selectedMonth ? moment(selectedMonth).format('MMM YYYY') : moment().format('MMM YYYY');
      case 'yearly':
        return selectedYear || moment().format('YYYY');
      case 'custom':
        return customStartDate && customEndDate 
          ? `${moment(customStartDate).format('DD MMM YYYY')} to ${moment(customEndDate).format('DD MMM YYYY')}`
          : moment().format('DD MMM YYYY');
      default:
        return moment().format('DD MMM YYYY');
    }
  };

  const calculateMetrics = () => {
    // Get all categories first
    const allCategories = new Set();
    const excluded = ['period', 'total_consumption', 'date', 'month', 'label', 'total_power_consumption'];
    powerConsumptionData.forEach((item) => {
      Object.keys(item || {}).forEach((k) => {
        if (!excluded.includes(k) && !k.includes('_id') && !k.includes('status')) allCategories.add(k);
      });
    });
    
    // Filter categories based on selectedLines
    const selectedCategories = Array.from(allCategories).filter(cat => 
      selectedLines.hasOwnProperty(cat) ? selectedLines[cat] : true
    );
    
    // Calculate total from selected devices only
    const totalPowerConsumption = (Array.isArray(powerConsumptionData) ? powerConsumptionData : [])
      .reduce((sum, item) => {
        let itemTotal = 0;
        selectedCategories.forEach(cat => {
          itemTotal += safeNumber(item[cat], 0);
        });
        return sum + itemTotal;
      }, 0);

    const hourlyArray = Array.isArray(hourlyUsageData) ? hourlyUsageData : (hourlyUsageData?.data || []);
    const totalHourlyConsumption = hourlyArray.reduce((s, it) => s + safeNumber(it.usage ?? it.total_consumption, 0), 0);
    const peakConsumption = hourlyArray.length > 0 
      ? Math.max(...hourlyArray.map(item => safeNumber(item.usage ?? item.total_consumption, 0))) 
      : 0;

    const peakHour = hourlyUsageData?.peak_hour || null;
    const peakWindows = hourlyUsageData?.peak_windows || [];

    let hourlyActiveUsage = safeNumber(hourlyUsageData?.active_hours_consumption, 0);
    let hourlyInactiveUsage = safeNumber(hourlyUsageData?.inactive_hours_consumption, 0);
    
    if (hourlyActiveUsage === 0 && totalHourlyConsumption > 0) {
      hourlyActiveUsage = totalHourlyConsumption * 0.73;
      hourlyInactiveUsage = totalHourlyConsumption - hourlyActiveUsage;
    }

    // Use energySavedResponse prop directly
    const totalActualConsumption = safeNumber(energySavedResponse?.total_actual_consumption, 0);
    const totalBaselineConsumption = safeNumber(energySavedResponse?.total_baseline_wh, 0);
    const totalEnergySaved = safeNumber(energySavedResponse?.total_energy_saved, 0);
    
    let energyActiveUsage = safeNumber(energySavedResponse?.active_hours_consumption, 0);
    let energyInactiveUsage = safeNumber(energySavedResponse?.inactive_hours_consumption, 0);
    
    if (energyActiveUsage === 0 && totalActualConsumption > 0) {
      energyActiveUsage = totalActualConsumption * 0.73;
      energyInactiveUsage = totalActualConsumption - energyActiveUsage;
    }

    // Use carbonFootprintResponse prop directly
    const totalCarbonBaseline = safeNumber(carbonFootprintResponse?.baseline?.total_carbon_kg, 0);
    const totalCarbonSaved = safeNumber(carbonFootprintResponse?.savings?.carbon_saved_kg, 0);
    const totalCarbonActual = safeNumber(carbonFootprintResponse?.actual?.total_carbon_kg, 0);
    
    let carbonActiveUsage = safeNumber(carbonFootprintResponse?.active_hours_carbon, 0);
    let carbonInactiveUsage = safeNumber(carbonFootprintResponse?.inactive_hours_carbon, 0);
    
    if (carbonActiveUsage === 0 && totalCarbonActual > 0) {
      carbonActiveUsage = totalCarbonActual * 0.73;
      carbonInactiveUsage = totalCarbonActual - carbonActiveUsage;
    }

    return {
      totalPowerConsumption,
      totalHourlyConsumption,
      peakConsumption,
      peakHour,
      peakWindows,
      hourlyActiveUsage,
      hourlyInactiveUsage,
      totalActualConsumption,
      totalBaselineConsumption,
      totalEnergySaved,
      energyActiveUsage,
      energyInactiveUsage,
      totalCarbonBaseline,
      totalCarbonSaved,
      totalCarbonActual,
      carbonActiveUsage,
      carbonInactiveUsage,
      deviceCategories: selectedCategories
    };
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const metrics = calculateMetrics();

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let yPos = margin;

      // HEADER
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 22, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      safeText(pdf, 'ENERGY ANALYTICS REPORT', pageWidth / 2, 9.5, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      safeText(pdf, 'LOCATION ENERGY & CARBON SUMMARY', pageWidth / 2, 14, { align: 'center' });

      pdf.setFontSize(8);
      safeText(pdf, getDateRangeTitle(), pageWidth / 2, 18, { align: 'center' });

      pdf.setFontSize(7);
      pdf.setTextColor(220, 220, 220);
      safeText(
        pdf,
        `Location: ${locationData?.loc_name || 'Location'}  |  Generated: ${moment().format('DD MMM YYYY, HH:mm')}`,
        pageWidth / 2,
        21,
        { align: 'center' }
      );

      yPos = 26;

      // SYSTEM SUMMARY – 4 cards
      const summaryCardWidth = (pageWidth - 2 * margin - 6) / 4;
      const summaryCardHeight = 14;

      const totalDevices = Object.keys(locationData || {}).length
        ? safeNumber(locationData.total_devices || locationData.total_neon || 0)
        : 0;

      const summaryItems = [
        { label: 'Total Consumption (Selected)', value: `${formatFixed(metrics.totalPowerConsumption, 2)} kWh` },
        { label: 'Total Energy Saved', value: `${formatFixed(metrics.totalEnergySaved, 2)} kWh` },
        { label: 'Carbon Saved', value: `${formatFixed(metrics.totalCarbonSaved, 2)} kg CO₂` },
        { label: 'Tracked Devices', value: String(totalDevices || '-') }
      ];

      pdf.setFontSize(8);
      summaryItems.forEach((item, idx) => {
        const x = margin + idx * (summaryCardWidth + 2);
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(209, 213, 219);
        pdf.rect(x, yPos, summaryCardWidth, summaryCardHeight, 'FD');

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.setFontSize(6.2);
        safeText(pdf, item.label, x + 2, yPos + 4);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(17, 24, 39);
        safeText(item.value, x + summaryCardWidth / 2, yPos + 9.5, { align: 'center' });
      });

      yPos += summaryCardHeight + 6;

      // TWO-COLUMN KPI SECTION
      const colWidth = (pageWidth - 2 * margin - 4) / 2;
      const colHeight = 30;

      // ENERGY KPIs
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, yPos, colWidth, colHeight, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(37, 99, 235);
      safeText(pdf, 'ENERGY CONSUMPTION', margin + colWidth / 2, yPos + 4, { align: 'center' });

      pdf.setFontSize(9);
      pdf.setTextColor(194, 65, 12);
      safeText(
        pdf,
        `${formatFixed(metrics.totalActualConsumption, 2)} kWh`,
        margin + colWidth / 2,
        yPos + 10,
        { align: 'center' }
      );
      pdf.setFontSize(6);
      pdf.setTextColor(75, 85, 99);
      safeText(pdf, 'Actual Consumption', margin + colWidth / 2, yPos + 12.5, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setTextColor(30, 64, 175);
      safeText(
        pdf,
        `Baseline: ${formatFixed(metrics.totalBaselineConsumption, 2)} kWh`,
        margin + colWidth / 2,
        yPos + 18,
        { align: 'center' }
      );

      pdf.setTextColor(5, 150, 105);
      safeText(
        pdf,
        `Saved: ${formatFixed(metrics.totalEnergySaved, 2)} kWh`,
        margin + colWidth / 2,
        yPos + 22,
        { align: 'center' }
      );

      // CARBON KPIs
      const rightX = margin + colWidth + 4;
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(rightX, yPos, colWidth, colHeight, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(16, 185, 129);
      safeText(pdf, 'CARBON FOOTPRINT', rightX + colWidth / 2, yPos + 4, { align: 'center' });

      const carbonReduced = metrics.totalCarbonBaseline - metrics.totalCarbonActual;
      pdf.setFontSize(9);
      pdf.setTextColor(22, 163, 74);
      safeText(
        pdf,
        `${formatFixed(carbonReduced, 2)} kg CO₂`,
        rightX + colWidth / 2,
        yPos + 10,
        { align: 'center' }
      );
      pdf.setFontSize(6);
      pdf.setTextColor(75, 85, 99);
      safeText(pdf, 'Carbon Reduced vs Baseline', rightX + colWidth / 2, yPos + 12.5, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setTextColor(37, 99, 235);
      safeText(
        pdf,
        `Baseline: ${formatFixed(metrics.totalCarbonBaseline, 2)} kg`,
        rightX + colWidth / 2,
        yPos + 18,
        { align: 'center' }
      );

      pdf.setTextColor(79, 70, 229);
      safeText(
        pdf,
        `Actual: ${formatFixed(metrics.totalCarbonActual, 2)} kg`,
        rightX + colWidth / 2,
        yPos + 22,
        { align: 'center' }
      );

      yPos += colHeight + 8;

      // HOURLY CONSUMPTION CHART
      const validHourly = hourlyChartData.filter(h => safeNumber(h.usage, 0) > 0);
      if (validHourly.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(17, 24, 39);
        safeText(pdf, 'HOURLY ENERGY CONSUMPTION', margin, yPos);
        yPos += 5;

        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 45;

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(229, 231, 235);
        pdf.rect(margin, yPos, chartWidth, chartHeight, 'FD');

        const maxUsage = Math.max(...validHourly.map(h => safeNumber(h.usage, 0)), 1);
        drawBarChart(pdf, validHourly, margin + 3, yPos + 3, chartWidth - 6, chartHeight - 8, maxUsage);

        yPos += chartHeight + 6;
      }

      // PERFORMANCE SUMMARY BOX
      if (yPos < pageHeight - 25) {
        const boxHeight = 24;
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(209, 213, 219);
        pdf.rect(margin, yPos, pageWidth - 2 * margin, boxHeight, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(55, 65, 81);
        safeText(pdf, 'PERFORMANCE SUMMARY', margin + 2, yPos + 5);

        const lines = [
          `Active vs Inactive Energy: ${formatFixed(metrics.energyActiveUsage, 1)} kWh active, ${formatFixed(metrics.energyInactiveUsage, 1)} kWh inactive`,
          `Active vs Inactive Carbon: ${formatFixed(metrics.carbonActiveUsage, 2)} kg active, ${formatFixed(metrics.carbonInactiveUsage, 2)} kg inactive`,
          metrics.peakHour
            ? `Peak Consumption Window: ${metrics.peakWindows?.[0]?.window || 'N/A'}  |  Peak: ${formatFixed(metrics.peakConsumption, 2)} kWh`
            : `Peak Consumption: ${formatFixed(metrics.peakConsumption, 2)} kWh`
        ];

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(75, 85, 99);
        let lineY = yPos + 9;
        lines.forEach(line => {
          safeText(pdf, line, margin + 3, lineY);
          lineY += 4;
        });

        yPos += boxHeight + 4;
      }

      // FOOTER
      const footerY = pageHeight - 10;
      pdf.setDrawColor(209, 213, 219);
      pdf.setLineWidth(0.2);
      pdf.line(margin, footerY, pageWidth - margin, footerY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      safeText(
        pdf,
        'This report was automatically generated by the i-EMS Location Dashboard System',
        pageWidth / 2,
        footerY + 3.5,
        { align: 'center' }
      );
      safeText(
        pdf,
        `© ${moment().format('YYYY')} Energy Management System - All Rights Reserved`,
        pageWidth / 2,
        footerY + 6.5,
        { align: 'center' }
      );

      const locationName = (locationData?.loc_name || 'Location').replace(/\s+/g, '_');
      const dateStr = getDateRangeTitle().replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${locationName}_Energy_Report_${dateStr}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        locationData: locationData?.loc_name
      });
      alert(`Error generating PDF report: ${error.message || 'Unknown error'}. Please check the console for details.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const metrics = calculateMetrics();

  const powerChartData = powerConsumptionData.map((item, i) => {
    // Calculate consumption from selected devices only
    const selectedTotal = metrics.deviceCategories.reduce((sum, cat) => {
      return sum + safeNumber(item[cat], 0);
    }, 0);
    
    return {
      time: item.period ? moment(item.period).format('HH:mm') : `T${i+1}`,
      consumption: selectedTotal, // Use selected total instead of raw total_consumption
      ...metrics.deviceCategories.reduce((acc, cat) => {
        acc[cat] = safeNumber(item[cat], 0);
        return acc;
      }, {})
    };
  });

  const hourlyChartData = (Array.isArray(hourlyUsageData) ? hourlyUsageData : (hourlyUsageData?.data || []))
    .map(item => ({
      hour: item.hour || moment(item.period).format('HH') || '',
      usage: safeNumber(item.usage ?? item.total_consumption, 0)
    }));

  const deviceData = metrics.deviceCategories.slice(0, 5).map((cat, i) => ({
    name: cat.replace(/_/g, ' ').toUpperCase().substring(0, 20),
    value: powerConsumptionData.reduce((sum, item) => sum + safeNumber(item[cat], 0), 0),
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]
  })).filter(item => item.value > 0);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  return (
    <>
     {/* PDF button – completely hidden when disabled */}
{!disabled && (
  <button
    onClick={generatePDF}
    disabled={isGenerating}                  
    className={`
      inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all
      ${isGenerating
        ? 'bg-gray-300 text-gray-600 cursor-wait'
        : 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
      }
    `}
  >
    {isGenerating ? (
      <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span>Generating...</span>
      </>
    ) : (
      <>
        <FileText className="w-5 h-5" />
        <span>PDF</span>
      </>
    )}
  </button>
)}

      <div ref={reportRef} className="fixed -top-[10000px] left-0 bg-white text-gray-900"
        style={{ width: '210mm', padding: '12mm', fontSize: '9.5px', lineHeight: '1.3', fontFamily: "'Segoe UI', sans-serif" }}>
        
        {/* HEADER */}
        <div className="text-center mb-5 pb-3 border-b-2 border-blue-600">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">ENERGY ANALYTICS REPORT</h1>
          </div>
          <h2 className="text-base font-bold text-gray-700">{locationData?.loc_name || 'LOCATION REPORT'}</h2>
          <p className="text-sm font-semibold text-gray-600">{getDateRangeTitle()}</p>
          <p className="text-xs text-gray-500">Generated: {moment().format('DD MMM YYYY, HH:mm')}</p>
        </div>

        {/* LOCATION INFO */}
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2 pb-1 border-b border-gray-300">
            <Building className="w-3 h-3" /> LOCATION DETAILS
          </h3>
          <div className="bg-gray-50 rounded p-2 border border-gray-200">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><span className="font-bold text-gray-600">Name:</span> {locationData?.loc_name || 'N/A'}</div>
              <div><span className="font-bold text-gray-600">Branch:</span> {locationData?.branch_code || 'N/A'}</div>
              <div><span className="font-bold text-gray-600">Region:</span> {locationData?.region_name || 'N/A'}</div>
              <div><span className="font-bold text-gray-600">City:</span> {locationData?.city_name || 'N/A'}</div>
              <div><span className="font-bold text-gray-600">State:</span> {locationData?.state_name || 'N/A'}</div>
              <div><span className="font-bold text-gray-600">Period:</span> {timeframe}</div>
            </div>
          </div>
        </div>

        {/* POWER CONSUMPTION */}
        <div className="mb-4">
          <h3 className="text-xs font-bold mb-2 flex items-center gap-1 pb-1 border-b border-gray-300">
            <LineChart className="w-3 h-3 text-blue-600" /> POWER CONSUMPTION
          </h3>
          <div className="bg-white rounded border border-gray-200 p-2">
            <div style={{ width: '100%', height: '130px' }}>
              <ResponsiveContainer>
                <RechartsLine data={powerChartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fontSize: 7 }} stroke="#6b7280" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 7 }} stroke="#6b7280" />
                  <Tooltip contentStyle={{ fontSize: '8px' }} formatter={(v) => `${formatFixed(v, 2)} kWh`} />
                  <Line type="monotone" dataKey="consumption" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                  {metrics.deviceCategories.slice(0, 6).map((cat, i) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={COLORS[i]} strokeWidth={1.5} dot={false} />
                  ))}
                </RechartsLine>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-2 text-xs">
              <span className="font-bold">Total (Selected): {formatFixed(metrics.totalPowerConsumption, 2)} kWh</span>
              {metrics.deviceCategories.map((cat, i) => {
                const categoryTotal = Math.abs(powerConsumptionData.reduce((s, d) => s + (Number(d[cat]) || 0), 0));
                return (
                  <span key={cat}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    {cat}: {formatFixed(categoryTotal, 2)} kWh
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* THREE CHARTS ROW */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Energy Saved */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-600" /> ENERGY SAVED vs BASELINE
            </h4>
            <div style={{ height: '120px' }}>
              <ResponsiveContainer>
                <RechartsLine data={[
                  { x: 'Start', baseline: metrics.totalBaselineConsumption, actual: 0 },
                  { x: 'End', baseline: metrics.totalBaselineConsumption, actual: metrics.totalActualConsumption }
                ]}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="x" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={{ fontSize: '8px' }} formatter={(v) => `${formatFixed(v, 2)} kWh`} />
                  <Line type="linear" dataKey="baseline" stroke="#60A5FA" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-orange-100 rounded p-2 border border-orange-200">
                  <div className="font-bold text-orange-700 text-sm">{formatFixed(metrics.totalActualConsumption, 1)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Consumption</div>
                </div>
                <div className="bg-blue-100 rounded p-2 border border-blue-200">
                  <div className="font-bold text-blue-700 text-sm">{formatFixed(metrics.totalBaselineConsumption, 1)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Baseline</div>
                </div>
                <div className="bg-emerald-100 rounded p-2 border border-emerald-200">
                  <div className="font-bold text-emerald-700 text-sm">{formatFixed(metrics.totalEnergySaved, 1)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Saved</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-center">
                <div className="bg-green-100 rounded p-2 border border-green-200">
                  <div className="font-bold text-green-700 text-sm">{formatFixed(metrics.energyActiveUsage, 1)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Active</div>
                </div>
                <div className="bg-gray-100 rounded p-2 border border-gray-300">
                  <div className="font-bold text-gray-700 text-sm">{formatFixed(metrics.energyInactiveUsage, 1)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Inactive</div>
                </div>
              </div>
            </div>
          </div>

          {/* Carbon Footprint */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-600" /> CARBON FOOTPRINT vs BASELINE
            </h4>
            <div style={{ height: '120px' }}>
              <ResponsiveContainer>
                <RechartsLine data={[
                  { x: 'Start', baseline: metrics.totalCarbonBaseline, actual: 0 },
                  { x: 'End', baseline: metrics.totalCarbonBaseline, actual: metrics.totalCarbonActual }
                ]}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="x" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={{ fontSize: '8px' }} formatter={(v) => `${formatFixed(v, 3)} kg`} />
                  <Line type="linear" dataKey="baseline" stroke="#60A5FA" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-orange-100 rounded p-2 border border-orange-200">
                  <div className="font-bold text-orange-700 text-sm">{formatFixed(metrics.totalCarbonActual, 2)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Consumption</div>
                </div>
                <div className="bg-blue-100 rounded p-2 border border-blue-200">
                  <div className="font-bold text-blue-700 text-sm">{formatFixed(metrics.totalCarbonBaseline, 2)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Baseline</div>
                </div>
                <div className="bg-emerald-100 rounded p-2 border border-emerald-200">
                  <div className="font-bold text-emerald-700 text-sm">{formatFixed(metrics.totalCarbonSaved, 2)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Saved</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-center">
                <div className="bg-green-100 rounded p-2 border border-green-200">
                  <div className="font-bold text-green-700 text-sm">{formatFixed(metrics.carbonActiveUsage, 2)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Active</div>
                </div>
                <div className="bg-gray-100 rounded p-2 border border-gray-300">
                  <div className="font-bold text-gray-700 text-sm">{formatFixed(metrics.carbonInactiveUsage, 2)}</div>
                  <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Inactive</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Usage */}
          {hourlyChartData.length > 0 && (
            <div className="bg-white rounded border border-gray-200 p-3">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-amber-600" /> HOURLY USAGE
              </h4>
              <div style={{ height: '120px' }}>
                <ResponsiveContainer>
                  <BarChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 8 }} />
                    <Tooltip contentStyle={{ fontSize: '8px' }} formatter={(v) => `${formatFixed(v, 2)} kWh`} />
                    <Bar dataKey="usage" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <div className="bg-blue-100 rounded p-2 border border-blue-200">
                    <div className="font-bold text-blue-700 text-sm">{formatFixed(metrics.peakConsumption, 1)}</div>
                    <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Max Demand</div>
                  </div>
                  <div className="bg-orange-100 rounded p-2 border border-orange-200">
                    <div className="font-bold text-orange-700" style={{ fontSize: '10px' }}>{metrics.peakWindows.length ? metrics.peakWindows[0].window : 'N/A'}</div>
                    <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Peak Window</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <div className="bg-green-100 rounded p-2 border border-green-200">
                    <div className="font-bold text-green-700 text-sm">{formatFixed(metrics.hourlyActiveUsage, 1)}</div>
                    <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Active</div>
                  </div>
                  <div className="bg-gray-100 rounded p-2 border border-gray-300">
                    <div className="font-bold text-gray-700 text-sm">{formatFixed(metrics.hourlyInactiveUsage, 1)}</div>
                    <div style={{ fontSize: '8px' }} className="text-gray-600 mt-0.5">Inactive</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DEVICE DISTRIBUTION & SUMMARY */}
        {deviceData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded border border-gray-200 p-3">
              <h4 className="text-xs font-bold mb-3 flex items-center gap-1">
                <PieChart className="w-4 h-3 text-purple-600" /> DEVICE DISTRIBUTION
              </h4>
              <div style={{ height: '180px' }}>
                <ResponsiveContainer>
                  <RechartsPie>
                    <PieSlice data={deviceData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value"
                      label={(e) => `${e.name.substring(0, 12)}: ${formatFixed(e.value, 1)}`}
                      labelLine={{ stroke: '#666', strokeWidth: 1 }}>
                      {deviceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </PieSlice>
                    <Tooltip contentStyle={{ fontSize: '5px' }} formatter={(v) => `${formatFixed(v, 1)} kWh`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded border border-gray-200 p-3">
              <h4 className="text-xs font-bold mb-3">PERFORMANCE SUMMARY</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between pb-2 border-b border-gray-300">
                  <span className="font-bold text-gray-700">Total Consumption (Selected)</span>
                  <span className="font-bold text-gray-900">{formatFixed(metrics.totalPowerConsumption, 2)} kWh</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-300">
                  <span className="font-bold text-gray-700">Peak Demand</span>
                  <span className="font-bold text-gray-900">{formatFixed(metrics.peakConsumption, 2)} kWh</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-300">
                  <span className="font-bold text-gray-700">Energy Saved</span>
                  <span className="font-bold text-emerald-600">{formatFixed(metrics.totalEnergySaved, 2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-700">Carbon Reduced</span>
                  <span className="font-bold text-purple-600">{formatFixed(metrics.totalCarbonSaved, 3)} kg CO₂</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PDFReport;