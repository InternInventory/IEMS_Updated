import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import SuccessPopup from "../system-management/successPopUP";
import { useTheme } from "../../context/ThemeContext";

const ThreePLibDeviceForm = () => {
  const navigate = useNavigate();
  const { dev_id } = useParams(); // undefined for Add, has value for Edit
  const { isDark } = useTheme();
  const isDarkMode = isDark;

  const [formData, setFormData] = useState({
    did: "",
    loc_id: "",
    macid: "",
    device_name: "",
    device_type: "",
    topic: "",
    response: "",
    is_active: true,
    device: "3p-libi" // Changed to match backend device type
  });
  const [locations, setLocations] = useState([]);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const deviceTypes = ["Relay"]; // Same device types

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "is_active" ? value === "true" : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Validation
  const validate = () => {
    const errs = {};
    if (!formData.did) errs.did = "DID is required";
    if (!formData.loc_id) errs.loc_id = "Location is required";
    if (!formData.macid) errs.macid = "MAC ID is required";
    if (!formData.device_name) errs.device_name = "Device Name is required";
    if (!formData.device_type) errs.device_type = "Device Type is required";
    if (!formData.topic) errs.topic = "Topic is required";
    if (!formData.response) errs.response = "Response is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Fetch locations and device data (edit mode)
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${apiURL}/device-location`, { headers: { Authorization: token } });
        setLocations(res.data);
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };

    const fetchDevice = async () => {
      if (!dev_id) return;
      try {
        const res = await axios.get(`${apiURL}/get3PLibDeviceById/${dev_id}`, { headers: { Authorization: token } });
        const data = res.data;
        setFormData({
          did: data.did || "",
          loc_id: data.loc_id || "",
          macid: data.macid || "",
          device_name: data.device_name || "",
          device_type: data.device_type || "",
          topic: data.topic || "",
          response: data.response || "",
          is_active: data.is_active !== undefined ? data.is_active : true,
          device: "3p-libi"
        });
      } catch (err) {
        console.error("Error fetching 3PLIB device data:", err);
        alert("Failed to fetch 3PLIB device data");
        navigate("/device-list");
      }
    };

    fetchLocations();
    fetchDevice();
  }, [dev_id]);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (dev_id) {
        // Edit
        await axios.put(`${apiURL}/update3PLibDevice/${dev_id}`, formData, {
          headers: { Authorization: token },
        });
      } else {
        // Add
        await axios.post(`${apiURL}/createDeviceManagement`, formData, {
          headers: { Authorization: token },
        });
      }
      setShowSuccess(true);
    } catch (err) {
      console.error("Failed to save 3PLIB device:", err);
      alert("Failed to save 3PLIB device.");
    }
  };

  return (
    <div className={`flex flex-col items-start justify-start pt-4 pl-1 ${!isDarkMode ? 'bg-[#f8f9fa]' : ''}`}>
      <div className={`font-bold text-2xl pb-2 pl-5 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <h1>{dev_id ? "Edit 3PLIB Device" : "Add 3PLIB Device"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* DID */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              DID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="did"
              value={formData.did}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 focus:outline-none focus:shadow-outline ${
                isDarkMode
                  ? 'bg-transparent text-white border-white'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
              disabled={!!dev_id} // cannot edit DID in edit mode
            />
            {errors.did && <p className="text-red-500 text-xs">{errors.did}</p>}
          </div>

          {/* Device Name */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Device Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="device_name"
              value={formData.device_name}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 focus:outline-none focus:shadow-outline ${
                isDarkMode
                  ? 'bg-transparent text-white border-white'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
            {errors.device_name && <p className="text-red-500 text-xs">{errors.device_name}</p>}
          </div>

          {/* MAC ID */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              MAC ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="macid"
              value={formData.macid}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 focus:outline-none focus:shadow-outline ${
                isDarkMode
                  ? 'bg-transparent text-white border-white'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
            {errors.macid && <p className="text-red-500 text-xs">{errors.macid}</p>}
          </div>

          {/* Device Type */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Device Type <span className="text-red-500">*</span>
            </label>
            <select
              name="device_type"
              value={formData.device_type}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 focus:outline-none focus:shadow-outline ${
                isDarkMode
                  ? 'bg-transparent text-white border-white'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            >
              <option value="" style={{ backgroundColor: isDarkMode ? '#1a253f' : '#ffffff', color: isDarkMode ? 'white' : '#111827' }}>Select a device type</option>
              {deviceTypes.map((type) => (
                
                <option key={type} value={type} style={{ backgroundColor: isDarkMode ? '#1a253f' : '#ffffff', color: isDarkMode ? 'white' : '#111827' }}>{type}</option>
              ))}
            </select>
            {errors.device_type && <p className="text-red-500 text-xs">{errors.device_type}</p>}
          </div>

          {/* Topic */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 focus:outline-none focus:shadow-outline ${
                isDarkMode
                  ? 'bg-transparent text-white border-white'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
            {errors.topic && <p className="text-red-500 text-xs">{errors.topic}</p>}
          </div>

          {/* Response */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Response <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="response"
              value={formData.response}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 focus:outline-none focus:shadow-outline ${
                isDarkMode
                  ? 'bg-transparent text-white border-white'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
            {errors.response && <p className="text-red-500 text-xs">{errors.response}</p>}
          </div>

          {/* Status */}
          {dev_id && (
            <div className="mb-4">
              <label className={`block text-sm font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Status</label>
              <select
                name="is_active"
                value={formData.is_active?.toString() || "true"}
                onChange={handleChange}
                className={`border rounded w-full py-2 px-3 ${
                  isDarkMode
                    ? 'bg-transparent text-white border-white'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              >
                <option value="true" style={{ backgroundColor: isDarkMode ? '#1a253f' : '#ffffff', color: isDarkMode ? 'white' : '#111827' }}>Active</option>
                <option value="false" style={{ backgroundColor: isDarkMode ? '#1a253f' : '#ffffff', color: isDarkMode ? 'white' : '#111827' }}>Inactive</option>
              </select>
            </div>
          )}

          {/* Location */}
          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Location <span className="text-red-500">*</span>
            </label>
            <select
              name="loc_id"
              value={formData.loc_id}
              onChange={handleChange}
              className={`border rounded w-full py-2 px-3 ${
                isDarkMode
                  ? 'bg-transparent text-white border-white'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            >
              <option value="" style={{ backgroundColor: isDarkMode ? '#1a253f' : '#ffffff', color: isDarkMode ? 'white' : '#111827' }}>Select a location</option>
              {locations.map((loc) => (
                <option key={loc.loc_id} value={loc.loc_id} style={{ backgroundColor: isDarkMode ? '#1a253f' : '#ffffff', color: isDarkMode ? 'white' : '#111827' }}>
                  {loc.loc_name}
                </option>
              ))}
            </select>
            {errors.loc_id && <p className="text-red-500 text-xs">{errors.loc_id}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-4 mt-4">
          <button
            type="button"
            className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
            onClick={() => navigate("/device-list")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="font-bold px-4 py-2 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
          >
            {dev_id ? "Update" : "Submit"}
          </button>
        </div>
      </form>

      <SuccessPopup
        isOpen={showSuccess}
        onClose={() => navigate("/device-list")}
        message={dev_id ? "3PLIB Device Updated Successfully" : "3PLIB Device Added Successfully"}
      />
    </div>
  );
};

export default ThreePLibDeviceForm;