/**
 * PDF Chart Rendering Utilities
 * Functions to draw charts directly on jsPDF canvas
 */

import { safeNumber, formatFixed } from '../services/pdfService';

/**
 * Draw a bar chart on PDF
 */
export const drawBarChart = (pdf, data, x, y, width, height, options = {}) => {
  if (!data || data.length === 0) return;

  const {
    maxValue = null,
    labelKey = 'hour',
    valueKey = 'usage',
    color = [245, 158, 11], // Orange
    showGrid = true,
    showLabels = true,
    showYAxis = true,
    title = '',
    unit = 'kWh'
  } = options;

  // Calculate max value if not provided
  const calculatedMax = maxValue !== null 
    ? maxValue 
    : Math.max(...data.map(item => safeNumber(item[valueKey] || item[item.valueKey] || 0, 0)), 1);

  if (calculatedMax <= 0) return;

  const barWidth = width / Math.max(data.length, 24);
  const maxBarHeight = height - (showLabels ? 25 : 10);
  const chartBottom = y + height - (showLabels ? 20 : 5);
  const chartTop = y + (showLabels ? 5 : 0);

  // Draw title if provided
  if (title) {
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, x + width / 2, y, { align: 'center' });
  }

  // Draw grid lines with reduced opacity
  if (showGrid) {
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.05); // Thinner lines
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const gridY = chartTop + (i * maxBarHeight / gridSteps);
      pdf.line(x, gridY, x + width, gridY);
    }
  }

  // Draw bars
  data.forEach((item, index) => {
    const value = safeNumber(item[valueKey] || item[item.valueKey] || 0, 0);
    if (value <= 0) return;

    const barHeight = (value / calculatedMax) * maxBarHeight;
    const barX = x + (index * barWidth) + 2;
    const barY = chartBottom - barHeight;

    pdf.setFillColor(...color);
    pdf.rect(barX, barY, barWidth - 4, barHeight, 'F');

    // Draw label
    if (showLabels) {
      pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128);
      const label = item[labelKey] || item.displayHour || item.hour || `${index}:00`;
      const labelText = String(label).substring(0, 8); // Truncate long labels
      pdf.text(labelText, barX + (barWidth - 4) / 2, chartBottom + 3, { align: 'center' });
    }
  });

  // Draw Y-axis labels
  if (showYAxis) {
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    const yAxisSteps = 5;
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = (calculatedMax / yAxisSteps) * (yAxisSteps - i);
      const labelY = chartTop + (i * maxBarHeight / yAxisSteps);
      pdf.text(formatFixed(value, 0) + ' ' + unit, x - 5, labelY + 1, { align: 'right' });
    }
  }

  // Draw axes
  pdf.setDrawColor(107, 114, 128);
  pdf.setLineWidth(0.2);
  pdf.line(x, chartBottom, x + width, chartBottom); // X-axis
  if (showYAxis) {
    pdf.line(x, chartTop, x, chartBottom); // Y-axis
  }
};

/**
 * Draw a line chart on PDF
 */
export const drawLineChart = (pdf, data, x, y, width, height, options = {}) => {
  if (!data || data.length === 0) return;

  const {
    dataKeys = ['value'],
    colors = [[59, 130, 246]], // Blue
    maxValue = null,
    labelKey = 'label',
    showGrid = true,
    showLabels = true,
    title = '',
    unit = 'kWh'
  } = options;

  // Calculate max value
  let calculatedMax = maxValue;
  if (calculatedMax === null) {
    calculatedMax = Math.max(
      ...dataKeys.map(key => 
        Math.max(...data.map(item => safeNumber(item[key] || 0, 0)))
      ),
      1
    );
  }

  if (calculatedMax <= 0) return;

  const chartWidth = width;
  const chartHeight = height - (showLabels ? 25 : 10);
  const chartBottom = y + height - (showLabels ? 20 : 5);
  const chartTop = y + (showLabels ? 5 : 0);
  const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

  // Draw title
  if (title) {
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, x + width / 2, y, { align: 'center' });
  }

  // Draw grid with reduced opacity
  if (showGrid) {
    pdf.setDrawColor(229, 231, 235); // Light gray with reduced opacity
    pdf.setLineWidth(0.05); // Thinner lines
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const gridY = chartTop + (i * chartHeight / gridSteps);
      pdf.line(x, gridY, x + width, gridY);
    }
  }

  // Draw lines for each data key
  dataKeys.forEach((dataKey, keyIndex) => {
    const color = colors[keyIndex % colors.length];
    pdf.setDrawColor(...color);
    pdf.setLineWidth(1.5);

    // Draw line segments
    for (let i = 0; i < data.length - 1; i++) {
      const value1 = safeNumber(data[i][dataKey] || 0, 0);
      const value2 = safeNumber(data[i + 1][dataKey] || 0, 0);
      
      const x1 = x + (i * pointSpacing);
      const y1 = chartBottom - ((value1 / calculatedMax) * chartHeight);
      const x2 = x + ((i + 1) * pointSpacing);
      const y2 = chartBottom - ((value2 / calculatedMax) * chartHeight);

      pdf.line(x1, y1, x2, y2);

      // Draw point
      pdf.setFillColor(...color);
      pdf.circle(x1, y1, 1.5, 'F');
    }

    // Draw last point
    if (data.length > 0) {
      const lastValue = safeNumber(data[data.length - 1][dataKey] || 0, 0);
      const lastX = x + ((data.length - 1) * pointSpacing);
      const lastY = chartBottom - ((lastValue / calculatedMax) * chartHeight);
      pdf.setFillColor(...color);
      pdf.circle(lastX, lastY, 1.5, 'F');
    }
  });

  // Draw labels
  if (showLabels) {
    pdf.setFontSize(6);
    pdf.setTextColor(107, 114, 128);
    const labelInterval = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += labelInterval) {
      const label = String(data[i][labelKey] || '').substring(0, 8);
      const labelX = x + (i * pointSpacing);
      pdf.text(label, labelX, chartBottom + 3, { align: 'center' });
    }
  }

  // Draw Y-axis
  pdf.setDrawColor(107, 114, 128);
  pdf.setLineWidth(0.2);
  pdf.line(x, chartTop, x, chartBottom);
  pdf.line(x, chartBottom, x + width, chartBottom);

  // Y-axis labels
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
  const yAxisSteps = 5;
  for (let i = 0; i <= yAxisSteps; i++) {
    const value = (calculatedMax / yAxisSteps) * (yAxisSteps - i);
    const labelY = chartTop + (i * chartHeight / yAxisSteps);
    pdf.text(formatFixed(value, 0) + ' ' + unit, x - 5, labelY + 1, { align: 'right' });
  }
};

/**
 * Draw a pie/donut chart on PDF
 */
export const drawPieChart = (pdf, data, x, y, radius, options = {}) => {
  if (!data || data.length === 0) return;

  const {
    innerRadius = 0,
    colors = [[59, 130, 246], [16, 185, 129], [245, 158, 11], [139, 92, 246], [239, 68, 68]],
    labelKey = 'name',
    valueKey = 'value',
    showLabels = true,
    title = ''
  } = options;

  // Calculate total
  const total = data.reduce((sum, item) => sum + safeNumber(item[valueKey] || 0, 0), 0);
  if (total <= 0) return;

  // Draw title
  if (title) {
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, x, y - radius - 5);
  }

  // Draw pie slices
  let currentAngle = -90; // Start from top
  const centerX = x;
  const centerY = y;

  data.forEach((item, index) => {
    const value = safeNumber(item[valueKey] || 0, 0);
    if (value <= 0) return;

    const sliceAngle = (value / total) * 360;
    const color = colors[index % colors.length];

    // Draw outer arc
    pdf.setFillColor(...color);
    pdf.setDrawColor(...color);
    
    // Simple pie slice approximation using filled arc
    const startAngleRad = (currentAngle * Math.PI) / 180;
    const endAngleRad = ((currentAngle + sliceAngle) * Math.PI) / 180;
    
    // Draw multiple lines to approximate arc
    const steps = Math.max(5, Math.floor(sliceAngle / 5));
    const points = [];
    
    // Outer arc points
    for (let i = 0; i <= steps; i++) {
      const angle = currentAngle + (sliceAngle * i / steps);
      const angleRad = (angle * Math.PI) / 180;
      points.push({
        x: centerX + radius * Math.cos(angleRad),
        y: centerY + radius * Math.sin(angleRad)
      });
    }
    
    // Inner arc points (if donut)
    if (innerRadius > 0) {
      for (let i = steps; i >= 0; i--) {
        const angle = currentAngle + (sliceAngle * i / steps);
        const angleRad = (angle * Math.PI) / 180;
        points.push({
          x: centerX + innerRadius * Math.cos(angleRad),
          y: centerY + innerRadius * Math.sin(angleRad)
        });
      }
    } else {
      // Complete pie - add center point
      points.push({ x: centerX, y: centerY });
    }

    // Draw filled polygon
    pdf.setFillColor(...color);
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.1);
    
    // Draw polygon by connecting points
    for (let i = 0; i < points.length - 1; i++) {
      pdf.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
    if (points.length > 0) {
      pdf.line(points[points.length - 1].x, points[points.length - 1].y, points[0].x, points[0].y);
    }

    // Fill the slice (simplified - jsPDF doesn't have perfect polygon fill)
    const midAngle = currentAngle + sliceAngle / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;
    const fillRadius = (radius + innerRadius) / 2;
    const fillX = centerX + fillRadius * Math.cos(midAngleRad);
    const fillY = centerY + fillRadius * Math.sin(midAngleRad);
    
    // Draw a small circle to fill the slice
    pdf.setFillColor(...color);
    pdf.circle(fillX, fillY, (radius - innerRadius) / 2, 'F');

    // Draw label
    if (showLabels) {
      const labelAngleRad = midAngleRad;
      const labelRadius = radius + 8;
      const labelX = centerX + labelRadius * Math.cos(labelAngleRad);
      const labelY = centerY + labelRadius * Math.sin(labelAngleRad);
      
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      const label = String(item[labelKey] || '').substring(0, 12);
      const percentage = ((value / total) * 100).toFixed(1);
      pdf.text(`${label}: ${percentage}%`, labelX, labelY, { align: 'center' });
    }

    currentAngle += sliceAngle;
  });
};

/**
 * Safe text rendering helper
 */
export const safeText = (pdf, text, x, y, options = {}) => {
  try {
    const textStr = String(text || '');
    pdf.text(textStr, x, y, options);
  } catch (e) {
    console.warn('jsPDF text rendering error:', e.message, 'Text:', text);
    pdf.text(String(text || ''), x, y, options);
  }
};

