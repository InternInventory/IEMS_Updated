import { ALERT_STATUS_STYLES } from "./alertStatusConfig";

const AlertStatusBadge = ({ status }) => {
  const key = status?.toLowerCase();
  const style = ALERT_STATUS_STYLES[key];

  if (!style) {
    return (
      <span className="px-3 py-1 rounded-full text-sm bg-gray-500 text-white">
        {status}
      </span>
    );
  }

  return (
    <span
      className="px-3 py-1 rounded-full text-sm font-semibold select-none"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        minWidth: 90,
        display: "inline-block",
        textAlign: "center",
      }}
    >
      {style.label}
    </span>
  );
};

export default AlertStatusBadge;
