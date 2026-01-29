import moment from "moment";

/**
 * Get X-axis properties for Recharts based on timeframe and theme
 * @param {string} timeframe - The timeframe ('daily', 'weekly', 'monthly', 'yearly')
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @returns {object} X-axis configuration object
 */
export const getXAxisProps = (timeframe, isDarkMode) => {
  return {
    tick: { fill: isDarkMode ? "#9ca3af" : "#6b7280", fontSize: 12 },
    stroke: isDarkMode ? "#374151" : "#d1d5db",
    angle: timeframe === "daily" ? -45 : 0,
    textAnchor: timeframe === "daily" ? "end" : "middle",
    height: timeframe === "daily" ? 80 : 60,
  };
};

/**
 * Get Y-axis properties for Recharts based on theme and label
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @param {string} label - The Y-axis label (e.g., 'kWh', 'kg CO₂')
 * @returns {object} Y-axis configuration object
 */
export const getYAxisProps = (isDarkMode, label = "") => {
  return {
    tick: { fill: isDarkMode ? "#9ca3af" : "#6b7280", fontSize: 12 },
    stroke: isDarkMode ? "#374151" : "#d1d5db",
    label: label
      ? {
          value: label,
          angle: -90,
          position: "insideLeft",
          style: { fill: isDarkMode ? "#9ca3af" : "#6b7280", fontSize: 12 },
        }
      : undefined,
  };
};

/**
 * Get tooltip properties for Recharts based on theme, timeframe, and unit
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @param {string} timeframe - The timeframe ('daily', 'weekly', 'monthly', 'yearly')
 * @param {string} unit - The unit of measurement (e.g., 'kWh', 'kg CO₂')
 * @returns {object} Tooltip configuration object
 */
export const getTooltipProps = (isDarkMode, timeframe, unit = "") => {
  return {
    contentStyle: {
      backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
      border: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
      borderRadius: "8px",
      color: isDarkMode ? "#f9fafb" : "#111827",
    },
    labelStyle: {
      color: isDarkMode ? "#f9fafb" : "#111827",
      fontWeight: "bold",
    },
    itemStyle: {
      color: isDarkMode ? "#d1d5db" : "#374151",
    },
    formatter: (value, name) => {
      if (typeof value === "number") {
        return [`${value.toFixed(2)} ${unit}`, name];
      }
      return [value, name];
    },
    labelFormatter: (label) => {
      return formatLabel(label, timeframe);
    },
  };
};

/**
 * Get tick formatter function for X-axis based on timeframe
 * @param {string} timeframe - The timeframe ('daily', 'weekly', 'monthly', 'yearly')
 * @returns {function} Formatter function for tick values
 */
export const getTickFormatter = (timeframe) => {
  return (value) => {
    if (!value) return "";

    switch (timeframe) {
      case "daily":
        // Format for hourly data (e.g., "12 AM", "1 PM")
        if (typeof value === "string" && value.includes(":")) {
          return value;
        }
        // If it's a number, treat it as hour
        if (typeof value === "number") {
          const hour = value % 12 || 12;
          const period = value < 12 ? "AM" : "PM";
          return `${hour} ${period}`;
        }
        return value;

      case "weekly":
        // Format day names or dates
        if (moment(value, moment.ISO_8601, true).isValid()) {
          return moment(value).format("ddd");
        }
        return value;

      case "monthly":
        // Format dates for monthly view
        if (moment(value, moment.ISO_8601, true).isValid()) {
          return moment(value).format("MMM DD");
        }
        return value;

      case "yearly":
        // Format month names
        if (moment(value, moment.ISO_8601, true).isValid()) {
          return moment(value).format("MMM");
        }
        return value;

      default:
        return value;
    }
  };
};

/**
 * Format label for tooltip based on timeframe
 * @param {string|number} label - The label value
 * @param {string} timeframe - The timeframe ('daily', 'weekly', 'monthly', 'yearly')
 * @returns {string} Formatted label
 */
const formatLabel = (label, timeframe) => {
  if (!label) return "";

  switch (timeframe) {
    case "daily":
      if (typeof label === "string" && label.includes(":")) {
        return label;
      }
      if (typeof label === "number") {
        const hour = label % 12 || 12;
        const period = label < 12 ? "AM" : "PM";
        return `${hour}:00 ${period}`;
      }
      return label;

    case "weekly":
      if (moment(label, moment.ISO_8601, true).isValid()) {
        return moment(label).format("dddd, MMM DD");
      }
      return label;

    case "monthly":
      if (moment(label, moment.ISO_8601, true).isValid()) {
        return moment(label).format("MMMM DD, YYYY");
      }
      return label;

    case "yearly":
      if (moment(label, moment.ISO_8601, true).isValid()) {
        return moment(label).format("MMMM YYYY");
      }
      return label;

    default:
      return label;
  }
};
