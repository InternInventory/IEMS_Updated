import { PieChart, Pie, Cell } from "recharts";

const GaugeChart = ({ value = 60, max = 100 }) => {
  const percentage = Math.min(Math.max(value / max, 0), 1); // normalize
  const data = [
    { name: "Value", value: percentage * 100 },
    { name: "Remainder", value: 100 - percentage * 100 },
  ];

  const COLORS = ["#10B981", "#1E293B"]; // green + dark bg

  return (
    <div className="flex flex-col items-center justify-center">
      <PieChart width={200} height={200}>
        <Pie
          data={data}
          startAngle={180}
          endAngle={0}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
      <div className="text-center -mt-4">
        <p className="text-2xl font-bold text-green-400">{Math.round(percentage * 100)}%</p>
        <p className="text-gray-400 text-sm">Usage</p>
      </div>
    </div>
  );
};

export default GaugeChart;
