import React, { useState } from "react";
import LineChartComponent from "./LineChartComponent";
import "../../assets/styles/common.css";

const LocationStats = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedWeek("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  const handleWeekChange = (e) => {
    setSelectedWeek(e.target.value);
    setSelectedDate("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setSelectedDate("");
    setSelectedWeek("");
    setSelectedYear("");
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setSelectedDate("");
    setSelectedWeek("");
    setSelectedMonth("");
  };

  const svgImagePath = "../src/assets/img/location/air-conditioner-1838.svg";
  const svgSignagePath = "../src/assets/img/location/signage.svg";
  const svgLightPath = "../src/assets/img/location/lights.svg";
  const svgACLightPath = "../src/assets/img/location/ac.svg";

  return (
    <div className="component-body">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="status-card shadow-yellow-600">
          <span className="flex items-center justify-center flex-col">
            <img
              src={svgImagePath}
              alt="Card 1"
              className="h-10 object-contain"
            />
            <h3 className="underline">AC-1</h3>
          </span>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Status</span>{" "}
            <span className="pr-3">On</span>{" "}
          </div>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Compressor</span>{" "}
            <span className="pr-3">On</span>{" "}
          </div>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Cooling</span>{" "}
            <span className="pr-3">On</span>{" "}
          </div>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Mode</span> <span className="pr-3">On</span>{" "}
          </div>
        </div>
        <div className="status-card shadow-red-600">
          <span className="flex items-center justify-center flex-col">
            <img
              src={svgImagePath}
              alt="Card 2"
              className="h-10 object-contain"
            />
            <h3 className="underline">AC-2</h3>
          </span>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Status</span>{" "}
            <span className="pr-3">On</span>{" "}
          </div>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Compressor</span>{" "}
            <span className="pr-3">On</span>{" "}
          </div>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Cooling</span>{" "}
            <span className="pr-3">On</span>{" "}
          </div>
          <div className="flex justify-between bg-slate-800 p-1 rounded-lg">
            <span className="pl-2">Mode</span> <span className="pr-3">On</span>{" "}
          </div>
        </div>
        <div className="status-card shadow-green-600">
          <img
            src={svgSignagePath}
            alt="Card 3"
            className="w-full h-24 object-contain mb-4"
          />
          <h3 className="text-lg text-center font-semibold">Signage</h3>
        </div>
        <div className="status-card shadow-green-600">
          <img
            src={svgLightPath}
            alt="Card 4"
            className="w-full h-24 object-contain mb-4"
          />
          <h3 className="text-lg text-center font-semibold">
            Raw Power Earthing
          </h3>
        </div>
        <div className="status-card shadow-green-600">
          <img
            src={svgImagePath}
            alt="Card 5"
            className="w-full h-24 object-contain mb-4"
          />
          <h3 className="text-lg text-center font-semibold">
            UPS Power Earthing
          </h3>
        </div>
        <div className="status-card shadow-yellow-600">
          <img
            src={svgImagePath}
            alt="Card 1"
            className="w-full h-24 object-contain"
          />
          <h3 className="text-lg text-center font-semibold">DVR</h3>
        </div>
      </div>
      <div className="w-full flex items-center justify-between">
        <h1 className="page-header select-none">Consumption Details</h1>
        <div className="download-alert-button">
          <img src="../src/assets/img/alerts/excel.svg" alt="excel" /> Download
          Excel
        </div>
      </div>
      <div className="grid grid-cols-6 justify-start w-full gap-4">
        <div>
          <input
            type="date"
            className="p-2 bg-[#0f172b] w-full rounded-full"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
        <div>
          <input
            type="week"
            className="p-2 bg-[#0f172b] w-full rounded-full"
            value={selectedWeek}
            onChange={handleWeekChange}
          />
        </div>
        <div>
          <input
            type="month"
            className="p-2 bg-[#0f172b] w-full rounded-full"
            value={selectedMonth}
            onChange={handleMonthChange}
          />
        </div>
        <select
          className="p-2 bg-[#0f172b] w-full rounded-full"
          value={selectedYear}
          onChange={handleYearChange}
        >
          <option value="" selected>
            Select Year
          </option>
          <option value="2023">2022</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
        </select>
      </div>
      <div className="p-3 w-full bg-[#0F172B] rounded-xl">
        <LineChartComponent />
      </div>
    </div>
  );
};

export default LocationStats;
