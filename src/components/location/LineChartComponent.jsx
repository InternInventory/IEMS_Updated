import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "00:00",
    totalPower: 0.62,
    atmAc1: 0,
    atmAc2: 0,
    signage: 0.15,
    ups: 0.47,
  },
  {
    name: "01:00",
    totalPower: 0.64,
    atmAc1: 0,
    atmAc2: 0,
    signage: 0.15,
    ups: 0.49,
  },
  {
    name: "02:00",
    totalPower: 0.63,
    atmAc1: 0,
    atmAc2: 0,
    signage: 0.16,
    ups: 0.45,
  },
  {
    name: "03:00",
    totalPower: 0.71,
    atmAc1: 0,
    atmAc2: 0,
    signage: 0.14,
    ups: 0.44,
  },
  {
    name: "04:00",
    totalPower: 0.69,
    atmAc1: 0,
    atmAc2: 0,
    signage: 0.17,
    ups: 0.42,
  },
  {
    name: "05:00",
    totalPower: 0.61,
    atmAc1: 0,
    atmAc2: 0,
    signage: 0.14,
    ups: 0.47,
  },
  {
    name: "06:00",
    totalPower: 0.62,
    atmAc1: 0,
    atmAc2: 0,
    signage: 0.15,
    ups: 0.47,
  },
  {
    name: "07:00",
    totalPower: 0.94,
    atmAc1: 0.5,
    atmAc2: 0,
    signage: 0,
    ups: 0.45,
  },
  {
    name: "08:00",
    totalPower: 1.48,
    atmAc1: 1.1,
    atmAc2: 0,
    signage: 0,
    ups: 0.42,
  },
  {
    name: "09:00",
    totalPower: 1.68,
    atmAc1: 1.43,
    atmAc2: 0,
    signage: 0,
    ups: 0.44,
  },
  {
    name: "10:00",
    totalPower: 1.32,
    atmAc1: 0.3,
    atmAc2: 0.67,
    signage: 0,
    ups: 0.45,
  },
  {
    name: "11:00",
    totalPower: 1.65,
    atmAc1: 0,
    atmAc2: 1.2,
    signage: 0,
    ups: 0.45,
  },
  {
    name: "12:00",
    totalPower: 2,
    atmAc1: 0,
    atmAc2: 1.46,
    signage: 0,
    ups: 0.45,
  },
  {
    name: "13:00",
    totalPower: 1.76,
    atmAc1: 0.91,
    atmAc2: 0.2,
    signage: 0,
    ups: 0.45,
  },
  {
    name: "14:00",
    totalPower: 1.84,
    atmAc1: 1.32,
    atmAc2: 0,
    signage: 0,
    ups: 0.45,
  },
  {
    name: "15:00",
    totalPower: 1.94,
    atmAc1: 1.5,
    atmAc2: 0,
    signage: 0,
    ups: 0.45,
  },
];

const LineChartComponent = () => (
  <ResponsiveContainer width="100%" height={320}>
    <LineChart
      width={500}
      height={300}
      data={data}
      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
    >
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip
        contentStyle={{
          backgroundColor: "#0F172B",
          border: "none",
          borderRadius: 6,
          color: "#E6EEF8",
        }}
        itemStyle={{ color: "#E6EEF8", fontWeight: "bold" }}
        labelStyle={{ color: "#9CA3AF", fontSize: 12, fontWeight: "bold" }}
      />
      <Legend
        formatter={(value, entry) => (
          <span style={{ color: entry.color }}>{value}</span>
        )}
      />
      <Line
        type="monotone"
        dataKey="totalPower"
        stroke="#7db9f3"
        dot={{ r: 2.5, stroke: "#7db9f3", fill: "#7db9f3" }}
        activeDot={{
          r: 6,
          stroke: "#7db9f3",
          fill: "#7db9f3",
          // strokeDasharray: "",
        }}
      />
      <Line
        type="monotone"
        dataKey="atmAc1"
        stroke="#2b908f"
        dot={{ r: 2.5, stroke: "#2b908f", fill: "#2b908f" }}
        activeDot={{
          r: 6,
          stroke: "#2b908f",
          fill: "#2b908f",
          // strokeDasharray: "",
        }}
      />
      <Line
        type="monotone"
        dataKey="atmAc2"
        stroke="#79a7d4"
        dot={{ r: 2.5, stroke: "#79a7d4", fill: "#79a7d4" }}
        activeDot={{
          r: 6,
          stroke: "#79a7d4",
          fill: "#79a7d4",
          // strokeDasharray: "",
        }}
      />
      <Line
        type="monotone"
        dataKey="signage"
        stroke="#6abb15"
        dot={{ r: 2.5, stroke: "#6abb15", fill: "#6abb15" }}
        activeDot={{
          r: 6,
          stroke: "#6abb15",
          fill: "#6abb15",
          // strokeDasharray: "",
        }}
      />
      <Line
        type="monotone"
        dataKey="ups"
        stroke="#f8a35c"
        dot={{ r: 2.5, stroke: "#f8a35c", fill: "#f8a35c" }}
        activeDot={{
          r: 6,
          stroke: "#f8a35c",
          fill: "#f8a35c",
          // strokeDasharray: "",
        }}
      />
    </LineChart>
  </ResponsiveContainer>
);

export default LineChartComponent;
