import React from "react";
import GaugeChart from "react-gauge-chart";

export default function LiveGauge({ vPhaseEarth, vPhaseNeutral }) {
  const maxVoltage = 245;
  const earthingVoltage = Math.abs(vPhaseEarth - vPhaseNeutral);

  return (
    <div className="p-6 bg-[#121f3d] rounded-xl text-white flex flex-col gap-8 items-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Phase to Earth */}
        <div className="flex flex-col items-center bg-[#0f172b] rounded-lg p-4">
          <p className="mb-2 text-gray-400">Phase → Earth</p>
          <GaugeChart
            id="phase-earth"
            nrOfLevels={20}
            colors={["#22c55e", "#4ade80", "#a3e635"]}
            arcWidth={0.3}
            percent={vPhaseEarth / maxVoltage}
            textColor="#0f172b"
            needleColor="#fff"
            needleBaseColor="#8884d8"
            animate={false}
          />
          <p className="mt-2 text-lg font-bold">{vPhaseEarth} V</p>
        </div>

        {/* Phase to Neutral */}
        <div className="flex flex-col items-center bg-[#0f172b] rounded-lg p-4">
          <p className="mb-2 text-gray-400">Phase → Neutral</p>
          <GaugeChart
            id="phase-neutral"
            nrOfLevels={20}
            colors={["#3b82f6", "#60a5fa", "#93c5fd"]}
            arcWidth={0.3}
            percent={vPhaseNeutral / maxVoltage}
            textColor="#0f172b"
            needleColor="#fff"
            needleBaseColor="#8884d8"
            animate={false}
          />
          <p className="mt-2 text-lg font-bold">{vPhaseNeutral} V</p>
        </div>

        {/* Earthing Voltage */}
        <div className="flex flex-col items-center bg-[#0f172b] rounded-lg p-4">
          <p className="mb-2 text-gray-400">Earthing Voltage</p>
          <GaugeChart
            id="earthing-voltage"
            nrOfLevels={20}
            colors={earthingVoltage > 15 ? ["#ef4444"] : ["#facc15", "#fde047"]}
            arcWidth={0.3}
            percent={earthingVoltage / 50} // max expected earthing voltage ~50V
            textColor="#0f172b"
            needleColor="#fff"
            needleBaseColor="#8884d8"
            animate={false}
          />
          <p className="mt-2 text-lg font-bold">{earthingVoltage.toFixed(2)} V</p>
        </div>
      </div>
    </div>
  );
}
