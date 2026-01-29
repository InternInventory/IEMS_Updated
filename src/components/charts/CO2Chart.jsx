import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts';

/**
 * CO2 Emission Chart Component
 * Displays CO2 emissions (kg) over time with conditional coloring
 * 
 * Requirements:
 * - Line is GREEN by default
 * - Line turns RED when it surpasses the baseline
 * - Y-axis labeled "CO2 (kg)"
 * - Uses SVG gradient for smooth color transition
 * 
 * Gradient Math:
 * The gradient offset is calculated based on the baseline position relative to the chart domain.
 * R = (Y_max - Y_baseline) / (Y_max - Y_min)
 * - Area above baseline (0 to R): RED
 * - Area below baseline (R to 1): GREEN
 */
const CO2Chart = ({ 
  data = [], 
  baseline = 0, 
  width = 400, 
  height = 200,
  showGrid = true 
}) => {
  // Calculate gradient offset for conditional coloring
  // MUST be called before any early returns to follow Rules of Hooks
  const gradientConfig = useMemo(() => {
    if (!data || data.length === 0 || baseline <= 0) {
      return { 
        offset: 1, 
        useGradient: false,
        domainMax: 100,
        domainMin: 0,
      };
    }

    const maxActual = Math.max(...data.map(d => d.actual || d.co2 || 0), 1);
    const minActual = Math.min(...data.map(d => d.actual || d.co2 || 0), 0);
    const domainMax = Math.max(maxActual, baseline) * 1.1;
    const domainMin = Math.max(0, minActual * 0.9);

    // Calculate offset ratio: R = (Y_max - Y_baseline) / (Y_max - Y_min)
    // In SVG gradients, 0 = top, 1 = bottom
    let offset = (domainMax - baseline) / (domainMax - domainMin);

    // Clamp offset between 0 and 1
    offset = Math.max(0, Math.min(1, offset));

    // Check if any data points exceed baseline
    const hasExceeded = data.some(d => (d.actual || d.co2 || 0) > baseline);

    return {
      offset,
      useGradient: hasExceeded && offset > 0 && offset < 1,
      domainMax,
      domainMin,
    };
  }, [data, baseline]);

  // Split data into segments: below baseline (green) and above baseline (red)
  // MUST be called before any early returns to follow Rules of Hooks
  const splitData = useMemo(() => {
    if (!data || data.length === 0) {
      return { belowBaseline: [], aboveBaseline: [] };
    }

    // Check if any data exceeds baseline
    const hasExceeded = data.some(d => (d.actual || d.co2 || 0) > baseline);
    
    if (!hasExceeded || baseline <= 0) {
      return { belowBaseline: data, aboveBaseline: [] };
    }

    // Split into segments based on baseline
    const segments = [];
    let currentSegment = [];
    let currentIsAbove = null;

    data.forEach((point, index) => {
      const value = point.actual || point.co2 || 0;
      const isAbove = value > baseline;

      if (index === 0) {
        currentIsAbove = isAbove;
        currentSegment = [point];
      } else if (isAbove !== currentIsAbove) {
        // Transition point - save current segment
        segments.push({
          data: [...currentSegment, point], // Include transition point
          isAbove: currentIsAbove,
        });
        currentIsAbove = isAbove;
        currentSegment = [point];
      } else {
        currentSegment.push(point);
      }
    });

    // Add final segment
    if (currentSegment.length > 0) {
      segments.push({
        data: currentSegment,
        isAbove: currentIsAbove,
      });
    }

    const belowBaseline = segments.filter(s => !s.isAbove).flatMap(s => s.data);
    const aboveBaseline = segments.filter(s => s.isAbove).flatMap(s => s.data);

    return { belowBaseline, aboveBaseline };
  }, [data, baseline]);

  // Early return AFTER all hooks are called
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <span style={{ color: '#6b7280' }}>No data available</span>
      </div>
    );
  }

  const { offset, useGradient, domainMax, domainMin } = gradientConfig;

  return (
    <div style={{ width, height, backgroundColor: '#f9fafb', borderRadius: '8px', padding: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          
          <XAxis 
            dataKey="label" 
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            label={{ value: 'Time', position: 'insideBottom', offset: -5, style: { fill: '#6b7280', fontSize: 11 } }}
          />
          
          <YAxis 
            domain={[domainMin, domainMax]}
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 11 }}
          >
            <Label 
              value="CO2 (kg)" 
              angle={-90} 
              position="insideLeft" 
              style={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} 
            />
          </YAxis>
          
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              color: '#1f2937',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            formatter={(value) => [`${Number(value).toFixed(2)} kg`, 'Emission']}
            labelFormatter={(label) => `Time: ${label}`}
          />
          
          {/* Baseline Reference Line - Parallel to X-axis */}
          {baseline > 0 && (
            <ReferenceLine 
              y={baseline} 
              stroke="#60a5fa" 
              strokeDasharray="6 6" 
              strokeWidth={2}
              label={{ value: 'Baseline', position: 'topRight', fill: '#94a3b8', fontSize: 10 }}
            />
          )}
          
          {/* Emission Line - Green segments below baseline */}
          {splitData.belowBaseline.length > 0 && (
            <Line
              type="monotone"
              dataKey="actual"
              data={splitData.belowBaseline}
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#22c55e" }}
              activeDot={{ r: 6 }}
              name="Emission"
              connectNulls={true}
            />
          )}
          
          {/* Emission Line - Red segments above baseline */}
          {splitData.aboveBaseline.length > 0 && (
            <Line
              type="monotone"
              dataKey="actual"
              data={splitData.aboveBaseline}
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#ef4444" }}
              activeDot={{ r: 6 }}
              name="Emission"
              connectNulls={true}
            />
          )}
          
          {/* Fallback: Single green line if no exceedance */}
          {splitData.belowBaseline.length === data.length && (
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#22c55e" }}
              activeDot={{ r: 6 }}
              name="Emission"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CO2Chart;

