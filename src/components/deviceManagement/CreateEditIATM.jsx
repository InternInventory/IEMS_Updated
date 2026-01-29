import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";

const DeviceIATMForm = () => {
  const navigate = useNavigate();
  const { dev_id } = useParams(); // undefined for Add, has value for Edit
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  const [formData, setFormData] = useState({
    device_name: "",
    dev_id: "",
    serial_no: "",
    sim_no: "",
    no_of_batteries: "",
    total_battery_vol: "",
    channels: ["AC 1","AC 2","Light","Signage","DVR","Router","ATM","UPS"],
    loc_id: "",
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [locations, setLocations] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");
  const [existingDeviceIds, setExistingDeviceIds] = useState([]);

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // Fetch locations and existing device IDs
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${apiURL}/device-location`, { headers: { Authorization: token } });
        setLocations(res.data);
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };

    const fetchDeviceIds = async () => {
      try {
        const res = await axios.get(`${apiURL}/deviceManagement`, { headers: { Authorization: token } });
        const ids = res.data.map((d) => d.device_id);
        setExistingDeviceIds(ids);
      } catch (err) {
        console.error("Error fetching device IDs:", err);
      }
    };

    fetchLocations();
    fetchDeviceIds();
  }, []);

  // Fetch device data if editing
  useEffect(() => {
  if (!dev_id) return;

  const fetchDevice = async () => {
    try {
      const res = await axios.get(`${apiURL}/getDeviceManagementById/${dev_id}`, {
        headers: { Authorization: token }
      });

      // Adjust according to backend response
      const device = res.data.iatm_devices?.[0] || res.data; // <- check this
      if (!device) throw new Error("Device not found");

      setFormData({
        device_name: device.device_name || "",
        dev_id: device.dev_id || "",
        serial_no: device.serial_no || "",
        sim_no: device.sim_no || "",
        no_of_batteries: device.no_of_batteries || "",
        total_battery_vol: device.total_battery_vol || "",
        channels: device.channels?.length === 8 ? device.channels : ["AC 1","AC 2","Light","Signage","DVR","Router","ATM","UPS"],
        loc_id: device.loc_id || "",
        is_active: device.is_active !== undefined ? device.is_active : true,
      });
    } catch (err) {
      console.error("Error fetching device:", err);
      setPopupMessage("Failed to fetch device data");
      setPopupType("error");
      setShowPopup(true);
    }
  };

  fetchDevice();
}, [dev_id]);


  const handleChange = (e, index = null) => {
    const { name, value } = e.target;

    if (name === "channels" && index !== null) {
      const newChannels = [...formData.channels];
      newChannels[index] = value;
      setFormData(prev => ({ ...prev, channels: newChannels }));
      setErrors(prev => ({ ...prev, [`channel${index}`]: "" }));
    } else if (name === "is_active") {
      setFormData(prev => ({ ...prev, [name]: value === "true" }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.device_name) newErrors.device_name = "Device Name is required";
    if (!formData.dev_id) newErrors.dev_id = "Device ID is required";
    if (!formData.no_of_batteries) newErrors.no_of_batteries = "No. of Batteries is required";
    if (!formData.total_battery_vol) newErrors.total_battery_vol = "Total Battery Voltage is required";
    if (!formData.loc_id) newErrors.loc_id = "Location is required";

    formData.channels.forEach((ch, i) => {
      if (!ch) newErrors[`channel${i}`] = `Channel ${i + 1} is required`;
    });

    // Check duplicate ID if adding
    if (!dev_id && existingDeviceIds.includes(formData.dev_id)) newErrors.dev_id = "Device ID already exists";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (dev_id) {
        await axios.post(`${apiURL}/updateDeviceManagement/${dev_id}`, formData, { headers: { Authorization: token } });
        setPopupMessage("Device updated successfully!");
      } else {
        await axios.post(`${apiURL}/createDeviceManagement`, { ...formData, device: "iatm" }, { headers: { Authorization: token } });
        setPopupMessage("Device created successfully!");
      }

      setPopupType("success");
      setShowPopup(true);
      setTimeout(() => navigate("/device-list"), 2000);
    } catch (err) {
      console.error("Error saving device:", err);
      setPopupMessage("Failed to save device");
      setPopupType("error");
      setShowPopup(true);
    }
  };

  return (
    <div className="flex flex-col items-start justify-start pt-4 pl-1">
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className={`px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center ${
            isDarkMode ? "bg-[#0c1220] text-white" : "bg-white text-gray-900"
          }`}>
            <span className="absolute top-4 right-6 text-gray-400 text-2xl cursor-pointer" onClick={() => setShowPopup(false)}>×</span>
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6 ${popupType === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {popupType === "success" ? "✓" : "!"}
            </div>
            <h2 className="text-2xl font-semibold mb-2">{popupMessage}</h2>
          </div>
        </div>
      )}

      <div className="font-bold text-2xl pb-2 pl-5">
        <h1>{dev_id ? "Edit IATM Device" : "Add IATM Device"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Device Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Device Name *</label>
            <input type="text" value={formData.device_name} name="device_name" onChange={handleChange} className="bg-transparent border rounded w-full py-2 px-3" />
            {errors.device_name && <p className="text-red-500 text-xs">{errors.device_name}</p>}
          </div>

          {/* Device ID */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Device ID *</label>
            <input type="text" value={formData.dev_id} name="dev_id" onChange={handleChange} readOnly={!!dev_id} className="bg-transparent border rounded w-full py-2 px-3" />
            {errors.dev_id && <p className="text-red-500 text-xs">{errors.dev_id}</p>}
          </div>

          {/* Serial No */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Serial No.</label>
            <input type="text" value={formData.serial_no} name="serial_no" onChange={handleChange} className="bg-transparent border rounded w-full py-2 px-3" />
          </div>

          {/* Sim No */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Sim No.</label>
            <input type="text" value={formData.sim_no} name="sim_no" onChange={handleChange} className="bg-transparent border rounded w-full py-2 px-3" />
          </div>

          {/* No. of Batteries */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">No. of Batteries *</label>
            <input type="number" value={formData.no_of_batteries} name="no_of_batteries" onChange={handleChange} className="bg-transparent border rounded w-full py-2 px-3" />
            {errors.no_of_batteries && <p className="text-red-500 text-xs">{errors.no_of_batteries}</p>}
          </div>

          {/* Total Battery Voltage */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Total Battery Voltage *</label>
            <input type="number" value={formData.total_battery_vol} name="total_battery_vol" onChange={handleChange} className="bg-transparent border rounded w-full py-2 px-3" />
            {errors.total_battery_vol && <p className="text-red-500 text-xs">{errors.total_battery_vol}</p>}
          </div>

          {/* Channels */}
          {formData.channels.map((ch, i) => (
            <div className="mb-4" key={i}>
              <label className="block text-sm font-bold mb-2">Channel {i + 1} *</label>
              <input type="text" value={ch} name="channels" onChange={(e) => handleChange(e, i)} className="bg-transparent border rounded w-full py-2 px-3" />
              {errors[`channel${i}`] && <p className="text-red-500 text-xs">{errors[`channel${i}`]}</p>}
            </div>
          ))}

          {/* Location */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Location *</label>
            <select value={formData.loc_id} name="loc_id" onChange={handleChange} className="bg-transparent border rounded w-full py-2 px-3">
              <option value="">Select a location</option>
              {locations.map((loc) => <option key={loc.loc_id} value={loc.loc_id}>{loc.loc_name}</option>)}
            </select>
            {errors.loc_id && <p className="text-red-500 text-xs">{errors.loc_id}</p>}
          </div>

          {/* Status */}
          {dev_id && (
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Status</label>
              <select value={formData.is_active?.toString()} name="is_active" onChange={handleChange} className="bg-transparent border rounded w-full py-2 px-3">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 mt-4">
          <button type="button" className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}} onClick={() => navigate("/device-list")}>Cancel</button>
          <button type="submit" className="font-bold px-4 py-2 text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#76df23"}}>{dev_id ? "Update" : "Submit"}</button>
        </div>
      </form>
    </div>
  );
};

export default DeviceIATMForm;
