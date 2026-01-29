import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import SuccessPopup from "../system-management/successPopUP";
import { useTheme } from "../../context/ThemeContext";

const LibDeviceForm = () => {
  const navigate = useNavigate();
  const { dev_id } = useParams(); // undefined → Add, has value → Edit
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
    device: "lib",
  });

  const [locations, setLocations] = useState([]);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const deviceTypes = ["Relay"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "is_active" ? value === "true" : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

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

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${apiURL}/device-location`, {
          headers: { Authorization: token },
        });
        setLocations(res.data);
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };

    const fetchDevice = async () => {
      if (!dev_id) return;
      try {
        const res = await axios.get(`${apiURL}/getLibDeviceById/${dev_id}`, {
          headers: { Authorization: token },
        });
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
          device: "lib",
        });
      } catch (err) {
        console.error("Error fetching device:", err);
        alert("Failed to fetch device data");
        navigate("/device-list");
      }
    };

    fetchLocations();
    fetchDevice();
  }, [dev_id, apiURL, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (dev_id) {
        await axios.put(`${apiURL}/updateLibDevice/${dev_id}`, formData, {
          headers: { Authorization: token },
        });
      } else {
        await axios.post(`${apiURL}/createDeviceManagement`, formData, {
          headers: { Authorization: token },
        });
      }
      setShowSuccess(true);
    } catch (err) {
      console.error("Failed to save device:", err);
      alert("Failed to save device.");
    }
  };

  // Reusable input class
  const inputClasses =
    "bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-60";

  return (
    <div className="flex flex-col items-start justify-start pt-4 pl-1">
      <div className="font-bold text-2xl pb-2 pl-5 text-white">
        <h1>{dev_id ? "Edit LIB Device" : "Add LIB Device"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* DID */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              DID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="did"
              value={formData.did}
              onChange={handleChange}
              className={inputClasses}
              disabled={!!dev_id}
              placeholder="Enter DID"
            />
            {errors.did && <p className="text-red-500 text-xs mt-1">{errors.did}</p>}
          </div>

          {/* Device Name */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Device Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="device_name"
              value={formData.device_name}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter device name"
            />
            {errors.device_name && <p className="text-red-500 text-xs mt-1">{errors.device_name}</p>}
          </div>

          {/* MAC ID */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              MAC ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="macid"
              value={formData.macid}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter MAC ID"
            />
            {errors.macid && <p className="text-red-500 text-xs mt-1">{errors.macid}</p>}
          </div>

          {/* Device Type */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Device Type <span className="text-red-500">*</span>
            </label>
            <select
              name="device_type"
              value={formData.device_type}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select a device type</option>
              {deviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.device_type && <p className="text-red-500 text-xs mt-1">{errors.device_type}</p>}
          </div>

          {/* Topic */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter topic"
            />
            {errors.topic && <p className="text-red-500 text-xs mt-1">{errors.topic}</p>}
          </div>

          {/* Response */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Response <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="response"
              value={formData.response}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter response"
            />
            {errors.response && <p className="text-red-500 text-xs mt-1">{errors.response}</p>}
          </div>

          {/* Status (only in edit mode) */}
          {dev_id && (
            <div className="mb-4">
              <label className="block text-white text-sm font-bold mb-2">Status</label>
              <select
                name="is_active"
                value={formData.is_active?.toString() || "true"}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}

          {/* Location */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              name="loc_id"
              value={formData.loc_id}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc.loc_id} value={loc.loc_id}>
                  {loc.loc_name}
                </option>
              ))}
            </select>
            {errors.loc_id && <p className="text-red-500 text-xs mt-1">{errors.loc_id}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={() => navigate("/device-list")}
            className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-white font-bold rounded-lg hover:opacity-90 transition"
            style={{ backgroundColor: "#76df23" }}
          >
            {dev_id ? "Update" : "Submit"}
          </button>
        </div>
      </form>

      <SuccessPopup
        isOpen={showSuccess}
        onClose={() => navigate("/device-list")}
        message={dev_id ? "LIB Device Updated Successfully" : "LIB Device Added Successfully"}
      />
    </div>
  );
};

export default LibDeviceForm;