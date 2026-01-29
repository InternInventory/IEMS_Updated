import React from 'react';
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
 * Energy Consumption Chart Component
 * Displays energy consumption (kWh) over time with a baseline reference line
 * 
 * Requirements:
 * - Baseline must be parallel to X-axis (Time)
 * - Y-axis labeled "E(kWh)"
 * - Professional blue theme
 */
const EnergyChart = ({ 
  data = [], 
  baseline = 0, 
  width = 400, 
  height = 200,
  showGrid = true 
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <span style={{ color: '#6b7280' }}>No data available</span>
      </div>
    );
  }

  // Calculate dynamic domain to ensure baseline is always visible
  const maxActual = Math.max(...data.map(d => d.actual || d.kwh || 0), 1);
  const minActual = Math.min(...data.map(d => d.actual || d.kwh || 0), 0);
  const domainMax = Math.max(maxActual, baseline) * 1.1;
  const domainMin = Math.max(0, minActual * 0.9);

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
              value="E (kWh)" 
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
            formatter={(value) => [`${Number(value).toFixed(2)} kWh`, 'Consumption']}
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
          
          {/* Consumption Line - Green by default */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10b981' }}
            activeDot={{ r: 6 }}
            name="Consumption"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnergyChart;

