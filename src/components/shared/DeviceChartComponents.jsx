import moment from "moment";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

// ────────────────────── SUMMARY CARDS ──────────────────────
export const SummaryCards = ({ consumption, baseline, saved, active, inactive, unit = 'kWh', savedLabel = 'Saved' }) => {
  return (
    <div className="mt-3 space-y-2">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {[
          { label: 'Consumption', value: consumption, color: '#FB923C' },
          { label: 'Baseline', value: baseline, color: '#60A5FA' },
          { label: savedLabel, value: saved, color: parseFloat(saved) >= 0 ? '#34D399' : '#EF4444' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))',
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className="text-xs text-gray-300 truncate mb-2">{item.label}</div>
            <div
              className="font-semibold"
              style={{
                fontSize: '1rem',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                color: item.label === 'Saved' ? (parseFloat(saved) >= 0 ? '#34D399' : '#EF4444') : '#ffffff'
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
        }}
      >
        {[
          { label: 'Active', value: active, color: '#10B981' },
          { label: 'Inactive', value: inactive, color: '#9CA3AF' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))',
              border: `1px solid ${item.color}`,
              boxSizing: 'border-box',
              minHeight: 80,
            }}
          >
            <div className="text-xs text-gray-300 truncate mb-2">{item.label}</div>
            <div
              className="text-white font-semibold"
              style={{
                fontSize: '1.15rem',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────── ENHANCED HOURLY USAGE ──────────────────────
export const EnhancedHourlyUsage = ({ data = [], timeframe, selectedDate, unit = 'kWh', decimalPlaces = 2 }) => {
  if (!data || (!Array.isArray(data) && !data.data) || (data.data && data.data.length === 0)) {
    return (
      <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6">Hourly Usage</h3>
        <div className="text-center text-gray-400 py-8">
          No data available for the selected timeframe
        </div>
      </div>
    );
  }

  const response = Array.isArray(data) ? { data } : data;
  const dataArray = response.data || [];

  let totalConsumption = 0;
  let peakDemand = 0;
  let peakDateLabel = "";
  let activeTotal = 0;
  let inactiveTotal = 0;

  const dailyMap = {}; // { "2025-12-10": total_kwh }

  dataArray.forEach(item => {
    const consumption = parseFloat(item.consumption || item.usage || item.total || 0);
    const active = parseFloat(item.active_consumption || 0);
    const inactive = parseFloat(item.inactive_consumption || 0);
    
    totalConsumption += consumption;
    activeTotal += active;
    inactiveTotal += inactive;

    if (consumption > peakDemand) {
      peakDemand = consumption;
      peakDateLabel = item.period || item.time || item.label || "";
    }

    // Track daily totals for monthly/yearly
    if (item.period) {
      const dateKey = item.period.split('T')[0];
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + consumption;
    }
  });

  // Generate chart data
  const chartData = [];

  if (timeframe === "daily") {
    // Hourly data - create 24 hour buckets
    const hourlyBuckets = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      usage: 0
    }));

    dataArray.forEach(item => {
      const date = new Date(item.period || item.time);
      const hour = date.getHours();
      if (hour >= 0 && hour < 24) {
        hourlyBuckets[hour].usage += parseFloat(item.consumption || item.usage || item.total || 0);
      }
    });

    chartData.push(...hourlyBuckets);
  } else {
    // Daily or Monthly data
    dataArray.forEach(item => {
      const date = new Date(item.period || item.time);
      const label = timeframe === "monthly" 
        ? moment(date).format("DD MMM")
        : moment(date).format("MMM YYYY");
      
      chartData.push({
        label,
        usage: parseFloat(item.consumption || item.usage || item.total || 0)
      });
    });
  }

  // Calculate peak window (only for daily)
  let peakWindowText = "N/A";
  if (timeframe === "daily") {
    const peakDate = new Date(peakDateLabel);
    const startHour = peakDate.getHours();
    const endHour = (startHour + 1) % 24;
    peakWindowText = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
  }

  return (
    <div className="bg-[#0F172B] rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-6">
        Hourly Usage –{" "}
        {timeframe === "daily"
          ? moment(selectedDate).format("DD MMM YYYY")
          : timeframe === "monthly"
          ? moment(selectedDate).format("MMM YYYY")
          : "Usage"}
      </h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="#FB923C" strokeDasharray="4 4" strokeOpacity={0.9} />
            
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              angle={timeframe !== "daily" ? -45 : 0}
              textAnchor={timeframe !== "daily" ? "end" : "middle"}
              height={timeframe !== "daily" ? 65 : 50}
            />
            
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: unit, angle: -90, position: "insideLeft", style: { fill: "#94a3b8" } }}
            />

            <Tooltip
              contentStyle={{ backgroundColor: "#0F172B", border: "1px solid #FB923C", borderRadius: 8, color: "white" }}
              formatter={(value, name, props) => {
                const index = props.index || 0;
                const dataPoint = props.payload;
                const hour = dataPoint?.hour || dataPoint?.label || '';
                
                // Calculate actual consumption for this hour (current - previous)
                const currentValue = Number(value);
                const previousValue = index > 0 ? Number(chartData[index - 1]?.usage || 0) : 0;
                const hourConsumption = currentValue - previousValue;
                
                // Extract hour from label (e.g., "10:00" -> 10)
                const hourMatch = hour.match(/(\d+):(\d+)/);
                if (hourMatch && timeframe === "daily") {
                  const startHour = parseInt(hourMatch[1]);
                  const endHour = (startHour + 1) % 24;
                  const hourRange = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
                  
                  return [
                    <div key="tooltip" style={{ lineHeight: '1.6' }}>
                      <div><strong>Hour Range:</strong> {hourRange}</div>
                      <div><strong>Consumption:</strong> {hourConsumption.toFixed(decimalPlaces)} {unit}</div>
                    </div>,
                    ''
                  ];
                }
                return `${Number(value).toFixed(decimalPlaces)} ${unit}`;
              }}
              labelFormatter={() => ''}
            />

            <Bar dataKey="usage" radius={[8, 8, 0, 0]} fill="#FB923C" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
         
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{ background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))', border: '1px solid #60A5FA', minHeight: 80 }}>
            <div className="text-xs text-gray-300 mb-2">Maximum Demand</div>
            <div className="text-white font-semibold text-base">{peakDemand.toFixed(decimalPlaces)} {unit}</div>
          </div>

          {timeframe === "daily" && (
            <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
              style={{ background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))', border: '1px solid #FB923C', minHeight: 80 }}>
              <div className="text-xs text-gray-300 mb-2">Peak Window</div>
              <div className="text-white font-semibold text-base">{peakWindowText}</div>
            </div>
          )}

          <div className={`${timeframe === "daily" ? "lg:col-span-1" : "col-span-2"} rounded-lg p-3 flex flex-col items-center justify-center text-center`}
            style={{ background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))', border: '1px solid #10B981', minHeight: 80 }}>
            <div className="text-xs text-gray-300 mb-2">Total Consumption</div>
            <div className="text-white font-semibold text-lg">{totalConsumption.toFixed(decimalPlaces)} {unit}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{ background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))', border: '1px solid #10B981', minHeight: 80 }}>
            <div className="text-xs text-gray-300 mb-2">Active Hours</div>
            <div className="text-white font-semibold text-lg">{activeTotal.toFixed(decimalPlaces)} {unit}</div>
          </div>

          <div className="rounded-lg p-3 flex flex-col items-center justify-center text-center"
            style={{ background: 'linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))', border: '1px solid #9CA3AF', minHeight: 80 }}>
            <div className="text-xs text-gray-300 mb-2">Inactive Hours</div>
            <div className="text-white font-semibold text-lg">{inactiveTotal.toFixed(decimalPlaces)} {unit}</div>
          </div>
        </div>
      </div>
  </div>
  );
};
