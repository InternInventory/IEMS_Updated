import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const DeviceEdit = () => {
    const { dev_id } = useParams(); // device id from route
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const isDarkMode = isDark;

    // States
    const [deviceData, setDeviceData] = useState({
        device_name: "",
        device_id: "",
        serial_no: "",
        sim_no: "",
        no_of_batteries: "",
        total_battery_vol: "",
        is_active: "true",
        loc_id: "",
    });

    const [locations, setLocations] = useState([]);
    const [errors, setErrors] = useState({});
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [popupType, setPopupType] = useState("success");

    // Fetch device data
    useEffect(() => {
        const fetchDevice = async () => {
            try {
                const apiURL = import.meta.env.VITE_API_BASE_URL;
                const response = await axios.get(`${apiURL}/getDeviceManagementById/${dev_id}`, {
                    headers: {
                        Authorization:
                            localStorage.getItem("token") || sessionStorage.getItem("token"),
                    },
                });
                setDeviceData(response.data);
            } catch (error) {
                console.error("Error fetching device:", error);
            }
        };

        fetchDevice();
    }, [dev_id]);

    // Fetch locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const apiURL = import.meta.env.VITE_API_BASE_URL;
                const res = await axios.get(`${apiURL}/device-location`, {
                    headers: {
                        Authorization:
                            localStorage.getItem("token") || sessionStorage.getItem("token"),
                    },
                });
                setLocations(res.data);
            } catch (err) {
                console.error("Error fetching locations:", err);
            }
        };

        fetchLocations();
    }, []);

    // Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setDeviceData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    // Validation
    const validate = () => {
        const newErrors = {};
        if (!deviceData.device_name) newErrors.device_name = "Device Name is required";
        if (!deviceData.device_id) newErrors.device_id = "Device ID is required";
        if (!deviceData.no_of_batteries) newErrors.no_of_batteries = "No. of Batteries required";
        if (!deviceData.total_battery_vol) newErrors.total_battery_vol = "Voltage required";
        if (!deviceData.loc_id) newErrors.loc_id = "Location required";
        if (!deviceData.ch1_name) newErrors.ch1_name = "Channel 1 Name is required";
        if (!deviceData.ch2_name) newErrors.ch2_name = "Channel 2 Name is required";
        if (!deviceData.ch3_name) newErrors.ch3_name = "Channel 3 Name is required";
        if (!deviceData.ch4_name) newErrors.ch4_name = "Channel 4 Name is required";
        if (!deviceData.ch5_name) newErrors.ch5_name = "Channel 5 Name is required";
        if (!deviceData.ch6_name) newErrors.ch6_name = "Channel 6 Name is required";
        if (!deviceData.ch7_name) newErrors.ch7_name = "Channel 7 Name is required";
        if (!deviceData.ch8_name) newErrors.ch8_name = "Channel 8 Name is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        console.log("Submitting device data:", deviceData);

        try {
            const apiURL = import.meta.env.VITE_API_BASE_URL;
            const response = await axios.post(
                `${apiURL}/updateDeviceManagement/${dev_id}`,
                deviceData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization:
                            localStorage.getItem("token") || sessionStorage.getItem("token"),
                    },
                }
            );

            setPopupMessage(response.data.message || "Device updated successfully!");
            setPopupType("success");
            setShowPopup(true);
            setTimeout(() => {
                navigate("/device-list");
            }, 2000);
        } catch (err) {
            console.error("Update failed:", err);
            setPopupMessage("Failed to update device.");
            setPopupType("error");
            setShowPopup(true);
        }
    };

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

            <div className="font-bold text-2xl pb-2 pl-5">
                <h1>Edit Device</h1>
            </div>

            <form className="w-full p-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Form Fields */}
                    {[
                        { label: "Device Name", name: "device_name", required: true },
                        { label: "Device ID", name: "device_id", required: true, readOnly: true },
                        { label: "Serial No.", name: "serial_no" },
                        { label: "Sim No.", name: "sim_no" },
                        { label: "No. of Batteries", name: "no_of_batteries", type: "number", required: true },
                        { label: "Total Battery Voltage", name: "total_battery_vol", type: "number", required: true },
                        { label: "Channel 1", name: "ch1_name", required: true },
                        { label: "Channel 2", name: "ch2_name", required: true },
                        { label: "Channel 3", name: "ch3_name", required: true },
                        { label: "Channel 4", name: "ch4_name", required: true },
                        { label: "Channel 5", name: "ch5_name", required: true },
                        { label: "Channel 6", name: "ch6_name", required: true },
                        { label: "Channel 7", name: "ch7_name", required: true },
                        { label: "Channel 8", name: "ch8_name", required: true },
                    ].map(({ label, name, type = "text", required, readOnly }) => (
                        <div className="mb-4" key={name}>
                            <label className="block text-sm font-bold mb-2">
                                {label} {required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type={type}
                                name={name}
                                value={deviceData[name]}
                                onChange={handleChange}
                                className="bg-transparent border rounded w-full py-2 px-3"
                                readOnly={readOnly}
                            />
                            {errors[name] && <p className="text-red-500 text-xs">{errors[name]}</p>}
                        </div>
                    ))}


                    {/* Status */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Status</label>
                        <select
                            name="is_active"
                            value={deviceData.is_active}
                            onChange={handleChange}
                            className="bg-transparent border rounded w-full py-2 px-3"
                            style={{ backgroundColor: "#0f172b" }}
                        >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>

                    {/* Location Dropdown */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-white">
                            Location <span className="text-red-500"> *</span>
                        </label>
                        <select
                            name="loc_id"
                            value={deviceData.loc_id}
                            onChange={handleChange}
                            className="w-full py-2 px-3 rounded-lg border text-white"
                            style={{ backgroundColor: "#0f172b" }}
                        >
                            <option value="">Select a location</option>
                            {locations.map((loc) => (
                                <option key={loc.loc_id} value={loc.loc_id}>
                                    {loc.loc_name}
                                </option>
                            ))}
                        </select>
                        {errors.loc_id && (
                            <p className="text-red-500 text-xs mt-1">{errors.loc_id}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-4">
                    <button
                        type="button"
                        className="font-bold px-4 py-2 text-white rounded-lg hover:opacity-90"
                        style={{ backgroundColor: "#76df23" }}
                        onClick={() => navigate("/device-list")}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="font-bold px-4 py-2 text-white rounded-lg hover:opacity-90"
                        style={{ backgroundColor: "#76df23" }}
                    >
                        Update
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DeviceEdit;
