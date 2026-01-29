import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getXAxisProps, getYAxisProps, getTooltipProps, getTickFormatter } from "../../utils/chartFormatting";

const data = [
  {  },
];

export default function CarbonChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{
          top: 30,
          right: 30,
          left: 0,
          bottom: 10,
        }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1AB517" stopOpacity={0.9} />
            <stop offset="60%" stopColor="#1AB517" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#1AB517" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" {...getXAxisProps('yearly', true)} tickFormatter={getTickFormatter('yearly')} />
        <YAxis {...getYAxisProps(true, 'Carbon Emissions')} />
        <Tooltip {...getTooltipProps(true, 'yearly', 'kg CO₂')} />
        <Area
          type="linear"
          dataKey="carbon"
          stroke="#8884d8"
          fill="url(#colorUv)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
