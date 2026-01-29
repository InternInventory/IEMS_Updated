import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

const DeviceAdd = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  // Form state
  const [deviceName, setDeviceName] = useState("");
  const [deviceNameError, setDeviceNameError] = useState("");

  const [deviceId, setDeviceId] = useState("");
  const [deviceIdError, setDeviceIdError] = useState("");

  const [serialNo, setSerialNo] = useState("");
  const [serialNoError, setSerialNoError] = useState("");

  const [simNo, setSimNo] = useState("");
  const [simNoError, setSimNoError] = useState("");

  const [noOfBatteries, setNoOfBatteries] = useState("");
  const [noOfBatteriesError, setNoOfBatteriesError] = useState("");

  const [totalBatteryVoltage, setTotalBatteryVoltage] = useState("");
  const [totalBatteryVoltageError, setTotalBatteryVoltageError] = useState("");

  const [status, setStatus] = useState("true"); // default active
  const [locations, setLocations] = useState([]);

  const [locationId, setLocationId] = useState("");
  const [locationIdError, setLocationIdError] = useState("");

  const [existingDeviceIds, setExistingDeviceIds] = useState([]);

  // Channels state (8 channels)
  // const [channels, setChannels] = useState(Array.from({ length: 8 }, () => ""));
  const [channels, setChannels] = useState([
  "AC 1",
  "AC 2",
  "Light",
  "Signage",
  "DVR",
  "Router",
  "ATM",
  "UPS"
]);
  const [channelErrors, setChannelErrors] = useState(Array.from({ length: 8 }, () => ""));

  // Popup
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  // Validation helpers
  const isNonEmpty = (val) => {
    if (val === null || val === undefined) return false;
    return String(val).trim().length > 0;
  };

  const validateForm = () => {
    let valid = true;

    if (!isNonEmpty(deviceName)) {
      setDeviceNameError("Device Name is required");
      valid = false;
    } else setDeviceNameError("");

    if (!isNonEmpty(deviceId)) {
      setDeviceIdError("Device ID is required");
      valid = false;
    } else setDeviceIdError("");

    if (!isNonEmpty(noOfBatteries)) {
      setNoOfBatteriesError("No. of Batteries is required");
      valid = false;
    } else setNoOfBatteriesError("");

    if (!isNonEmpty(totalBatteryVoltage)) {
      setTotalBatteryVoltageError("Total Battery Voltage is required");
      valid = false;
    } else setTotalBatteryVoltageError("");

    if (!isNonEmpty(locationId)) {
      setLocationIdError("Location Id is required");
      valid = false;
    } else setLocationIdError("");

    // Validate channels
    const newErrors = [...channelErrors];
    channels.forEach((ch, index) => {
      if (!isNonEmpty(ch)) {
        newErrors[index] = `Channel ${index + 1} is required`;
        valid = false;
      } else {
        newErrors[index] = "";
      }
    });
    setChannelErrors(newErrors);

    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Extra validation for duplicate ID
    if (existingDeviceIds.includes(deviceId.trim())) {
      setDeviceIdError("Device ID already exists");
      return;
    }

    const deviceData = {
      device_name: deviceName,
      device_id: deviceId,
      serial_no: serialNo,
      sim_no: simNo,
      no_of_batteries: noOfBatteries,
      total_battery_vol: totalBatteryVoltage,
      is_active: status === "true",
      loc_id: locationId,
      channels: channels, // array of channel values
      device_type: "iatm",
    };

    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const response = await axios.post(
        `${apiURL}/createDeviceManagement`,
        deviceData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setShowPopup(true);
        setPopupType("success");
        setPopupMessage(response.data.message || "Device created successfully!");
        setTimeout(() => {
          navigate("/device-list", { state: { deviceCreated: true } });
        }, 2000);
      }
    } catch (err) {
      console.error("Error creating device:", err);
      setShowPopup(true);
      setPopupType("error");
      setPopupMessage("Failed to create device.");
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.get(`${apiURL}/device-location`, {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
        });
        setLocations(response.data);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const fetchDeviceIds = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.get(`${apiURL}/deviceManagement`, {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
        });
        const ids = response.data.map((device) => device.device_id);
        setExistingDeviceIds(ids);
      } catch (err) {
        console.error("Error fetching device IDs:", err);
      }
    };
    fetchDeviceIds();
  }, []);

  return (
    <div className="flex flex-col items-start justify-start pt-4 pl-1">
      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className={`px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center ${
            isDarkMode ? "bg-[#0c1220] text-white" : "bg-white text-gray-900"
          }`}>
            <span
              className={`absolute top-4 right-6 text-2xl cursor-pointer ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
              onClick={() => setShowPopup(false)}
            >
              ×
            </span>
            <div
              className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6 ${
                popupType === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {popupType === "success" ? "✓" : "!"}
            </div>
            <h2 className="text-2xl font-semibold mb-2">{popupMessage}</h2>
          </div>
        </div>
      )}

      <div className="font-bold text-2xl pb-2 pl-5">
        <h1>Create Device</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Device Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Device Name <span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              className="bg-transparent border rounded w-full py-2 px-3"
              value={deviceName}
              onChange={(e) => {
                setDeviceName(e.target.value);
                if (e.target.value.trim() !== "") setDeviceNameError("");
              }}
            />
            {deviceNameError && (
              <p className="text-red-500 text-xs">{deviceNameError}</p>
            )}
          </div>

          {/* Device ID */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Device ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="bg-transparent border rounded w-full py-2 px-3"
              value={deviceId}
              onChange={(e) => {
                const value = e.target.value.trim();
                setDeviceId(value);
                setDeviceIdError("");
                if (
                  existingDeviceIds.some(
                    (id) => id.toLowerCase() === value.toLowerCase()
                  )
                ) {
                  setDeviceIdError("Device ID already exists");
                }
              }}
            />
            {deviceIdError && (
              <p className="text-red-500 text-xs">{deviceIdError}</p>
            )}
          </div>

          {/* Serial No */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Serial No.</label>
            <input
              type="text"
              className="bg-transparent border rounded w-full py-2 px-3"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
            />
          </div>

          {/* Sim No */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Sim No.</label>
            <input
              type="text"
              className="bg-transparent border rounded w-full py-2 px-3"
              value={simNo}
              onChange={(e) => setSimNo(e.target.value)}
            />
          </div>

          {/* No. of Batteries */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              No. of Batteries<span className="text-red-500"> *</span>
            </label>
            <input
              type="number"
              className="bg-transparent border rounded w-full py-2 px-3"
              value={noOfBatteries}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 0) {
                  setNoOfBatteries(value);
                  setNoOfBatteriesError("");
                } else {
                  setNoOfBatteriesError("Value cannot be negative");
                }
              }}
            />
            {noOfBatteriesError && (
              <p className="text-red-500 text-xs">{noOfBatteriesError}</p>
            )}
          </div>

          {/* Total Battery Voltage */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Total Battery Voltage<span className="text-red-500"> *</span>
            </label>
            <input
              type="number"
              className="bg-transparent border rounded w-full py-2 px-3"
              value={totalBatteryVoltage}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 0) {
                  setTotalBatteryVoltage(value);
                  setTotalBatteryVoltageError("");
                } else {
                  setTotalBatteryVoltageError("Value cannot be negative");
                }
              }}
            />
            {totalBatteryVoltageError && (
              <p className="text-red-500 text-xs">{totalBatteryVoltageError}</p>
            )}
          </div>

          {/* Channels */}
          {channels.map((value, index) => (
            <div className="mb-4" key={index}>
              <label className="block text-sm font-bold mb-2">
                Channel {index + 1} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="bg-transparent border rounded w-full py-2 px-3"
                value={value}
                onChange={(e) => {
                  const newChannels = [...channels];
                  newChannels[index] = e.target.value;
                  setChannels(newChannels);
                  const newErrors = [...channelErrors];
                  newErrors[index] = "";
                  setChannelErrors(newErrors);
                }}
              />
              {channelErrors[index] && (
                <p className="text-red-500 text-xs">{channelErrors[index]}</p>
              )}
            </div>
          ))}

          {/* Location Id */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2 text-white">
              Location <span className="text-red-500"> *</span>
            </label>
            <select
              className={`w-full py-2 px-3 rounded-lg border ${
                isDarkMode ? "bg-[#1a253f] text-white" : "bg-white text-gray-900 border-gray-300"
              }`}
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                if (e.target.value.trim() !== "") setLocationIdError("");
              }}
            >
              <option value="" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>
                Select a location
              </option>
              {locations.map((loc) => (
                <option
                  key={loc.loc_id}
                  value={loc.loc_id}
                  style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}
                >
                  {loc.loc_name}
                </option>
              ))}
            </select>
            {locationIdError && (
              <p className="text-red-500 text-xs mt-1">{locationIdError}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <div className="p-3">
            <button
              type="button"
              className="font-bold px-4 py-2 text-white rounded-lg hover:opacity-90"
              style={{ backgroundColor: "#76df23" }}
              onClick={() => navigate("/device-list")}
            >
              Cancel
            </button>
          </div>
          <div>
            <button
              type="submit"
              className="font-bold px-4 py-2 text-white rounded-lg hover:opacity-90"
              style={{ backgroundColor: "#76df23" }}
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DeviceAdd;
