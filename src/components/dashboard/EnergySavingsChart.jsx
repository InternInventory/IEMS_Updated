// EnergySavingsChart.jsx — FINAL & BULLETPROOF (kWh version only)
import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
} from "recharts";
import moment from "moment";
import { getXAxisProps, getYAxisProps, getTooltipProps, getTickFormatter } from "../../utils/chartFormatting";

const EnergySavingsChart = ({
  data = [],
  apiResponse = {},
  timeframe, // "daily" | "monthly"
  selectedDate,
  loading,
  error,
  type = "energy", // "energy" | "carbon"
  isDarkMode = true,
  hourlyData = [],
  hideSubcards = false,
}) => {

  // ── CHART DATA (Cumulative) ──
  const processedChartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const valueMap = new Map();
    let cumulative = 0;

    const getDayWithSuffix = (day) => {
      if (day >= 11 && day <= 13) return `${day}`;
      switch (day % 10) {
        case 1: return `${day}`;
        case 2: return `${day}`;
        case 3: return `${day}`;
        default: return `${day}`;
      }
    };

    const monthMoment = selectedDate ? moment.utc(`${selectedDate}-01`) : moment.utc();

    data.forEach((item) => {
      const ts = item.period || item.recorded_at;
      if (!ts) return;

      // Ensure ts is a valid date format for moment
      let date;
      if (typeof ts === 'string') {
        date = moment.utc(ts);
      } else if (ts instanceof Date) {
        date = moment.utc(ts.toISOString());
      } else {
        // Skip invalid date formats
        return;
      }
      
      if (!date.isValid()) return;
      
      // Key based on timeframe
      let key;
      if (timeframe === "monthly") {
        key = date.date();
      } else if (timeframe === "yearly") {
        key = date.month(); // 0-11 for Jan-Dec
      } else if (timeframe === "custom") {
        key = date.format("YYYY-MM-DD"); // Full date string for custom range
      } else {
        key = date.hours(); // daily - by hour
      }

      const value = type === "carbon"
        ? parseFloat(item.carbon_emission_kg) || 0
        : parseFloat(item.power_consumption_kwh) || 0;

      valueMap.set(key, (valueMap.get(key) || 0) + value);
    });

    const keys = Array.from(valueMap.keys()).sort((a, b) => {
      // Sort custom dates chronologically
      if (timeframe === "custom") {
        return moment(a).valueOf() - moment(b).valueOf();
      }
      return a - b;
    });
    
    const result = [];

    // For custom/yearly timeframes, iterate over actual keys only
    if (timeframe === "custom" || timeframe === "yearly") {
      keys.forEach((key) => {
        const val = valueMap.get(key) || 0;
        cumulative += val;

        let label;
        if (timeframe === "custom") {
          label = moment(key).format("DD MMM");
        } else if (timeframe === "yearly") {
          label = moment().month(key).format("MMM");
        }

        result.push({
          label,
          actual: Number(cumulative.toFixed(4)),
          hasData: true,
          originalKey: key,
        });
      });
    } else {
      // For daily/monthly, fill in the range
      const lastKey = keys.length > 0 ? Math.max(...keys) : (timeframe === "monthly" ? 31 : 23);
      const start = timeframe === "monthly" ? 1 : 0;

      for (let i = start; i <= lastKey; i++) {
        const val = valueMap.get(i) || 0;
        cumulative += val;

        const label = timeframe === "monthly"
          ? `${getDayWithSuffix(i)} ${monthMoment.format("MMM")}`
          : `${String(i).padStart(2, "0")}:00`;

        result.push({
          label,
          actual: Number(cumulative.toFixed(4)),
          hasData: valueMap.has(i),
          day: timeframe === "monthly" ? i : undefined,
        });
      }
    }

    return result;
  }, [data, timeframe, type, selectedDate]);

  // ── TOTALS (kWh & kg CO₂ only) ──
  const totals = useMemo(() => {
    if (type === "carbon") {
      return {
        baseline: parseFloat(apiResponse?.baseline?.baseline_carbon_kg || 0),
        actual: parseFloat(apiResponse?.current_consumption?.total_carbon_kg || 0),
        saved: parseFloat(apiResponse?.savings?.carbon_saved_kg || 0),
        unit: "kg CO₂",
        yLabel: "kg CO₂",
        decimals: 2,
        title: "Carbon Emissions vs Baseline",
      };
    }
    return {
      baseline: parseFloat(apiResponse?.baseline?.total_baseline_kwh || 0),
      actual: parseFloat(apiResponse?.current_consumption?.total_power_kwh || 0),
      saved: parseFloat(apiResponse?.savings?.power_saved_kwh || 0),
      unit: "kWh",
      yLabel: "kWh",
      decimals: 2,
      title: "Energy Consumption vs Baseline",
    };
  }, [apiResponse, type]);

  // ── ACTIVE / INACTIVE HOURS (from backend or fallback) ──
  const { activeTotal, inactiveTotal } = useMemo(() => {
    // Priority 1: Use backend-calculated values if available
    if (type === "carbon" && apiResponse?.active_inactive?.active_hours_carbon_kg !== undefined) {
      return {
        activeTotal: parseFloat(apiResponse.active_inactive.active_hours_carbon_kg || 0).toFixed(totals.decimals),
        inactiveTotal: parseFloat(apiResponse.active_inactive.inactive_hours_carbon_kg || 0).toFixed(totals.decimals),
      };
    }
    
    if (type === "energy" && apiResponse?.active_inactive?.active_hours_consumption !== undefined) {
      return {
        activeTotal: parseFloat(apiResponse.active_inactive.active_hours_consumption || 0).toFixed(totals.decimals),
        inactiveTotal: parseFloat(apiResponse.active_inactive.inactive_hours_consumption || 0).toFixed(totals.decimals),
      };
    }

    // Priority 2: Fallback to client-side calculation with IST 8AM–8PM
    let active = 0, inactive = 0;

    data.forEach((item) => {
      const ts = item.period || item.recorded_at;
      if (!ts) return;

      const istHour = moment.utc(ts).utcOffset("+05:30").hour();
      const value = type === "carbon"
        ? parseFloat(item.carbon_emission_kg) || 0
        : parseFloat(item.power_consumption_kwh) || 0;

      if (istHour >= 8 && istHour < 20) active += value;
      else inactive += value;
    });

    return {
      activeTotal: Number(active).toFixed(totals.decimals),
      inactiveTotal: Number(inactive).toFixed(totals.decimals),
    };
  }, [data, type, totals.decimals, apiResponse]);

  if (loading) return <LoadingState title={totals.title} isDarkMode={isDarkMode} />;
  if (error || processedChartData.length === 0) return <NoDataState title={totals.title} isDarkMode={isDarkMode} />;

  return (
    <div
      className={`rounded-xl p-3 shadow-lg border ${
        isDarkMode
          ? "bg-[#0F172B] border-[#1e293b] text-white"
          : "bg-white border-gray-200 text-slate-900"
      }`}
    >
      <h3
  className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
    isDarkMode ? 'text-white' : 'text-gray-900'
  }`}
>
  {type === "energy" ? (
    // ⚡ Energy Icon
    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
  ) : (
    // 🌍 Carbon Footprint / Energy Saving Icon
    <svg
      className="w-5 h-5 text-emerald-500"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      {/* Globe */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18"
      />
      {/* Leaf */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.5 14.5c-1.5 0-3 1-3 2.5 0 1.2 1 2 2.5 2 2 0 3.5-2 3.5-4.5-1 1-2 1-3 1z"
      />
    </svg>
  )}

  {totals.title} ({totals.unit})
</h3>


      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={processedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? "#334155" : "#e5e7eb"}
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="label"
              {...getXAxisProps(timeframe, isDarkMode)}
              tickFormatter={getTickFormatter(timeframe)}
            />
            <YAxis {...getYAxisProps(isDarkMode, totals.yLabel)} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#1E293B" : "#ffffff",
                border: `1px solid ${isDarkMode ? "#475569" : "#e5e7eb"}`,
                borderRadius: "8px",
                padding: "8px 12px"
              }}
              formatter={(value, name, props) => {
                const dataPoint = props.payload;
                const index = props.index || 0;
                
                // Calculate actual consumption for this period (current - previous)
                const currentValue = Number(value);
                const previousValue = index > 0 ? Number(processedChartData[index - 1]?.actual || 0) : 0;
                const periodConsumption = currentValue - previousValue;
                
                // Build time range based on timeframe
                let timeRange = '';
                let hourlyConsumption = null;
                if (timeframe === "daily") {
                  const hourMatch = dataPoint?.label?.match(/(\d+):(\d+)/);
                  if (hourMatch) {
                    const startHour = parseInt(hourMatch[1]);
                    const endHour = (startHour + 1) % 24;
                    timeRange = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
                    
                    // Get hourly consumption for this hour from hourlyData
                    if (hourlyData && hourlyData.length > 0) {
                      const hourlyItem = hourlyData.find(h => {
                        const hMatch = (h.displayHour || h.hour || h.label || '').match(/(\d+):(\d+)/);
                        return hMatch && parseInt(hMatch[1]) === startHour;
                      });
                      if (hourlyItem && index > 0) {
                        const currentHourly = Number(hourlyItem.usage || 0);
                        const previousHourly = Number(hourlyData[hourlyData.indexOf(hourlyItem) - 1]?.usage || 0);
                        hourlyConsumption = currentHourly - previousHourly;
                      } else if (hourlyItem && index === 0) {
                        hourlyConsumption = Number(hourlyItem.usage || 0);
                      }
                    }
                  }
                } else if (timeframe === "monthly") {
                  const dateMatch = dataPoint?.label?.match(/\d+/);
                  if (dateMatch) {
                    timeRange = `Day ${dateMatch[0]}`;
                  }
                }
                
                if (name === "Actual") {
                  return [
                    <div key="tooltip" style={{ lineHeight: '1.6', color: isDarkMode ? '#f9fafb' : '#111827' }}>
                      <div><strong>Baseline:</strong> {totals.baseline.toFixed(totals.decimals)} {totals.unit}</div>
                      <div><strong>Actual:</strong> {periodConsumption.toFixed(totals.decimals)} {totals.unit}</div>
                      <div><strong>Excess:</strong> {Math.max(0, periodConsumption - totals.baseline).toFixed(totals.decimals)} {totals.unit}</div>
                      {timeRange && <div><strong>Hour Range:</strong> {timeRange}</div>}
                      {hourlyConsumption !== null && type === "energy" && (
                        <div><strong>Hourly Consumption:</strong> {hourlyConsumption.toFixed(2)} kWh</div>
                      )}
                    </div>,
                    ''
                  ];
                }
                if (name === "Baseline") return [`${totals.baseline.toFixed(totals.decimals)} ${totals.unit}`, "Total Baseline Target"];
                return [`${periodConsumption.toFixed(totals.decimals)} ${totals.unit}`, name];
              }}
              labelFormatter={() => ''}
            />

            {/* Flat Baseline Line */}
            <Line
              type="linear"
              dataKey={() => totals.baseline}
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="8 5"
              dot={false}
              name="Baseline"
              isAnimationActive={false}
            />

            {/* Actual Cumulative */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10B981" }}
              activeDot={{ r: 6 }}
              name="Actual"
            />

            {/* Red Area when exceeding baseline */}
            <Area
              type="monotone"
              dataKey={(d) => Math.max(0, d.actual - totals.baseline)}
              fill="#EF4444"
              fillOpacity={0.3}
              stroke="#EF4444"
              strokeWidth={1}
              name="Excess"
            />
          </ComposedChart>
        </ResponsiveContainer>

      {!hideSubcards && (
        <SummaryCards
          consumption={`${totals.actual.toFixed(totals.decimals)} ${totals.unit}`}
          baseline={`${totals.baseline.toFixed(totals.decimals)} ${totals.unit}`}
          saved={`${totals.saved.toFixed(totals.decimals)} ${totals.unit}`}
          savedLabel={timeframe === 'daily' && moment(selectedDate).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD') ? 'Assumed Saving' : 'Saved'}
          active={`${activeTotal} ${totals.unit}`}
          inactive={`${inactiveTotal} ${totals.unit}`}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

// UI Components
const LoadingState = ({ title, isDarkMode }) => (
  <div
    className={`rounded-xl p-6 border ${
      isDarkMode
        ? "bg-[#0F172B] border-[#1e293b] text-gray-400"
        : "bg-white border-gray-200 text-gray-500"
    }`}
  >
    <div className="h-[300px] flex items-center justify-center">
      <span>Loading...</span>
    </div>
  </div>
);

const NoDataState = ({ title, isDarkMode }) => (
  <div
    className={`rounded-xl p-6 border ${
      isDarkMode
        ? "bg-[#0F172B] border-[#1e293b] text-gray-400"
        : "bg-white border-gray-200 text-gray-500"
    }`}
  >
    <div className="h-[300px] flex items-center justify-center">
      <span>No data available</span>
    </div>
  </div>
);

const SummaryCards = ({ consumption, baseline, saved, active, inactive, isDarkMode, savedLabel = 'Saved' }) => {
  const cardBackgroundDark =
    "linear-gradient(180deg, rgba(15,23,43,0.95), rgba(7,10,14,0.9))";
  const cardBackgroundLight =
    "linear-gradient(180deg, rgba(248,250,252,1), rgba(241,245,249,1))";
  const labelColor = isDarkMode ? "#d1d5db" : "#4b5563";
  const valueDefaultColor = isDarkMode ? "#ffffff" : "#111827";

  return (
    <div className="-mt-10 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Consumption", value: consumption, color: "#FB923C" },
          { label: "Baseline", value: baseline, color: "#60A5FA" },
          { label: savedLabel, value: saved, color: "#34D399" },
        ].map((item, i) => (
          <div
            key={i}
            className="rounded-lg p-3 text-center border"
            style={{
              borderColor: item.color,
              background: isDarkMode ? cardBackgroundDark : cardBackgroundLight,
            }}
          >
            <div className="text-xs mb-2" style={{ color: labelColor }}>
              {item.label}
            </div>
            <div
              className="font-semibold"
              style={{
                color:
                  item.label === "Saved"
                    ? "#34D399"
                    : valueDefaultColor,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Active Hours", value: active, color: "#10B981" },
          { label: "Inactive Hours", value: inactive, color: "#9CA3AF" },
        ].map((item, i) => (
          <div
            key={i}
            className="rounded-lg p-3 text-center border"
            style={{
              borderColor: item.color,
              background: isDarkMode ? cardBackgroundDark : cardBackgroundLight,
            }}
          >
            <div className="text-xs mb-2" style={{ color: labelColor }}>
              {item.label}
            </div>
            <div
              className="font-semibold text-lg"
              style={{ color: valueDefaultColor }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnergySavingsChart;