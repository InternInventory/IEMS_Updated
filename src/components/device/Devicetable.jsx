import React from "react";

const Devicetable = () => {
  const data = Array(10)
    .fill(null)
    .map((_, index) => ({
      deviceName: "ROUTER001",
      deviceId: "R123",
      serialNumber: "m0t3n3x4s",
      simNumber: "9484849449",
      networkOperator: "AIRTEL",
    }));

  return (
    <div className="min-h-screen text-white pt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[#19223F]">
            <tr className="w-full ">
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
              </th>
              <th className="p-4 text-left text-xs 2xl:text-lg">Device Name</th>
              <th className="p-4 text-left text-xs 2xl:text-lg">Device ID</th>
              <th className="p-4 text-left text-xs 2xl:text-lg">
                Serial Number
              </th>
              <th className="p-4 text-left text-xs 2xl:text-lg">Sim Number</th>
              <th className="p-4 text-left text-xs 2xl:text-lg">
                Network Operator
              </th>
              <th className="p-4 text-left text-xs 2xl:text-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={index}
                className="border-b border-gray-700 hover:bg-gray-700"
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                </td>
                <td className="p-4 text-xs 2xl:text-lg">{item.deviceName}</td>
                <td className="p-4 text-xs 2xl:text-lg">{item.deviceId}</td>
                <td className="p-4 text-xs 2xl:text-lg">{item.serialNumber}</td>
                <td className="p-4 text-xs 2xl:text-lg">{item.simNumber}</td>
                <td className="p-4 text-xs 2xl:text-lg">
                  {item.networkOperator}
                </td>
                <td className="p-4 text-xs 2xl:text-lg">
                  <button className="text-blue-500 hover:text-blue-700">
                    <img
                      src="src/assets/img/devicelist/dotted.svg"
                      alt="excel"
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end justify-items-end">
        <button className="mt-4 p-2 text-black rounded bg-[#C7DB58] font-semibold">
          + Add Router
        </button>
      </div>
    </div>
  );
};

export default Devicetable;
