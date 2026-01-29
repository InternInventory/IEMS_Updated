import React from "react";

const ChartHeader = ({ title, dateLabel }) => {
  return (
    <div className="flex justify-between items-baseline mb-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {dateLabel && (
        <div className="text-sm text-gray-400 ml-4">{dateLabel}</div>
      )}
    </div>
  );
};

export default ChartHeader;
