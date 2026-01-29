import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

const BigIODeviceAddForm = () => {
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

    const [status, setStatus] = useState("true"); // default active
    const [locations, setLocations] = useState([]);

    const [locationId, setLocationId] = useState("");
    const [locationIdError, setLocationIdError] = useState("");

    const [existingDeviceIds, setExistingDeviceIds] = useState([]);

    // Channel states
    const [phaseType, setPhaseType] = useState({
        ch1: "",
        ch2: "",
        ch3: "",
        ch4: "",
    });

    const [phaseNames, setPhaseNames] = useState({
        ch1: { r: "", y: "", b: "" },
        ch2: { r: "", y: "", b: "" },
        ch3: { r: "", y: "", b: "" },
        ch4: { r: "", y: "", b: "" },
    });

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

        if (!isNonEmpty(locationId)) {
            setLocationIdError("Location Id is required");
            valid = false;
        } else setLocationIdError("");

        return valid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (existingDeviceIds.includes(deviceId.trim())) {
            setDeviceIdError("Device ID already exists");
            return;
        }

        const mergedChannels = {};
        [1, 2, 3, 4].forEach(ch => {
            mergedChannels[`ch${ch}`] = {
                phaseType: Number(phaseType[`ch${ch}`]), // convert to number
                ...phaseNames[`ch${ch}`] // merge r, y, b
            };
        });

        const deviceData = {
            device_name: deviceName,
            device_id: deviceId,
            serial_no: serialNo,
            sim_no: simNo,
            is_active: status === "true",
            loc_id: locationId,
            device_type: "bigio",
            channels: mergedChannels, // optional if API needs
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

    // Function to render channel section
    const renderChannel = (ch) => (
        <div key={ch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Channel Heading */}
            <div className="mb-4 flex items-center justify-center">
                <div className={`w-full flex items-center justify-center py-2 px-3 text-center font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>
                    Channel {ch}
                </div>
            </div>

            {/* Phase Type */}
            <div className="mb-4">
                <label className={`block text-sm font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>Phase Type</label>
                <select
                    value={phaseType[`ch${ch}`]}
                    onChange={(e) =>
                        setPhaseType((prev) => ({ ...prev, [`ch${ch}`]: e.target.value }))
                    }
                    className={`w-full py-2 px-3 rounded-lg border ${
                      isDarkMode ? "bg-[#1a253f] text-white border-white" : "bg-white text-gray-900 border-gray-300"
                    }`}
                >
                    <option value="" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Select Phase</option>
                    <option value="1" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Single Phase</option>
                    <option value="3" style={{ backgroundColor: isDarkMode ? "#1a253f" : "#ffffff", color: isDarkMode ? "white" : "#111827" }}>Three Phase</option>
                </select>
            </div>

            {/* R / Load Name */}
            <div className={`mb-4 ${phaseType[`ch${ch}`] === "3" ? "md:col-span-2" : ""}`}>
                <label className={`block text-sm font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>
                    {phaseType[`ch${ch}`] === "3" ? "Load Name" : "R Phase Name"}
                </label>
                <input
                    type="text"
                    className={`border rounded w-full py-2 px-3 ${
                      isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
                    }`}
                    value={phaseNames[`ch${ch}`].r}
                    onChange={(e) =>
                        setPhaseNames((prev) => ({
                            ...prev,
                            [`ch${ch}`]: { ...prev[`ch${ch}`], r: e.target.value },
                        }))
                    }
                />
            </div>

            {/* Y and B Phase Names */}
            {phaseType[`ch${ch}`] !== "3" && (
                <>
                    <div className="mb-4">
                        <label className={`block text-sm font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>Y Phase Name</label>
                        <input
                            type="text"
                            className={`border rounded w-full py-2 px-3 ${
                              isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
                            }`}
                            value={phaseNames[`ch${ch}`].y}
                            onChange={(e) =>
                                setPhaseNames((prev) => ({
                                    ...prev,
                                    [`ch${ch}`]: { ...prev[`ch${ch}`], y: e.target.value },
                                }))
                            }
                        />
                    </div>
                    <div className="mb-4">
                        <label className={`block text-sm font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>B Phase Name</label>
                        <input
                            type="text"
                            className={`border rounded w-full py-2 px-3 ${
                              isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
                            }`}
                            value={phaseNames[`ch${ch}`].b}
                            onChange={(e) =>
                                setPhaseNames((prev) => ({
                                    ...prev,
                                    [`ch${ch}`]: { ...prev[`ch${ch}`], b: e.target.value },
                                }))
                            }
                        />
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="flex flex-col items-start justify-start pt-4 pl-1">
            {/* Popup */}
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className={`px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center ${
                      isDarkMode ? "bg-[#0c1220] text-white" : "bg-white text-gray-900"
                    }`}>
                        <span
                            className="absolute top-4 right-6 text-gray-400 text-2xl cursor-pointer"
                            onClick={() => setShowPopup(false)}
                        >
                            ×
                        </span>
                        <div
                            className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6 ${popupType === "success" ? "bg-green-500" : "bg-red-500"
                                }`}
                        >
                            {popupType === "success" ? "✓" : "!"}
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">{popupMessage}</h2>
                    </div>
                </div>
            )}

            <div className={`font-bold text-2xl pb-2 pl-5 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>
                <h1>Create Device</h1>
            </div>

            <form className="w-full p-5" onSubmit={handleSubmit}>
                {/* Device Info */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Device Name */}
                    <div className="mb-4">
                        <label className={`block text-sm font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>
                            Device Name <span className="text-red-500"> *</span>
                        </label>
                        <input
                            type="text"
                            className={`border rounded w-full py-2 px-3 ${
                              isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
                            }`}
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
                        <label className={`block text-sm font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>
                            Device ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className={`border rounded w-full py-2 px-3 ${
                              isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
                            }`}
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
                        <label className={`block text-sm font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>Serial No.</label>
                        <input
                            type="text"
                            className={`border rounded w-full py-2 px-3 ${
                              isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
                            }`}
                            value={serialNo}
                            onChange={(e) => setSerialNo(e.target.value)}
                        />
                    </div>

                    {/* Sim No */}
                    <div className="mb-4">
                        <label className={`block text-sm font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>Sim No.</label>
                        <input
                            type="text"
                            className={`border rounded w-full py-2 px-3 ${
                              isDarkMode ? "bg-transparent text-white border-white" : "bg-white text-gray-900 border-gray-300"
                            }`}
                            value={simNo}
                            onChange={(e) => setSimNo(e.target.value)}
                        />
                    </div>

                    {/* Location Id */}
                    <div className="mb-4">
                        <label className={`block text-sm font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>
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

                {/* Channels 1–4 */}
                {[1, 2, 3, 4].map((ch) => renderChannel(ch))}

                {/* Buttons */}
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

export default BigIODeviceAddForm;
