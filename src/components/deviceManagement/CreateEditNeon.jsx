import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import SuccessPopup from "../system-management/successPopUP";
import { useTheme } from "../../context/ThemeContext";

const NeonDeviceForm = () => {
  const navigate = useNavigate();
  const { dev_id } = useParams(); // undefined → Add, number → Edit
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const [formData, setFormData] = useState({
    did: "",
    loc_id: "",
    macid: "",
    device_name: "",
    device_type: "",
    topic: "",
    response: "",
    is_active: true,
    device: "neon",
  });
  const [locations, setLocations] = useState([]);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkingDid, setCheckingDid] = useState(false);

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const deviceTypes = ["IR", "Relay", "Modbus"];

  const originalDid = useRef("");
  const didCheckTimeout = useRef(null);

  // -------------------------------------------------
  // 1. INPUT CHANGE
  // -------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "is_active" ? value === "true" : value,
    }));

    // Clear error when user starts typing
    if (name === "did") {
      setErrors((prev) => ({ ...prev, did: "" }));
    }
  };

  // -------------------------------------------------
  // 2. DEBOUNCED DID UNIQUENESS CHECK
  // -------------------------------------------------
  const checkDidUniqueness = async (did) => {
    if (!did) {
      setErrors((prev) => ({ ...prev, did: "DID is required" }));
      return;
    }

    // Skip check if in edit mode and DID hasn't changed
    if (dev_id && did === originalDid.current) {
      setErrors((prev) => ({ ...prev, did: "" }));
      return;
    }

    setCheckingDid(true);
    try {
      const { data } = await axios.get(`${apiURL}/checkDid/${did}`, {
        headers: { Authorization: token },
      });

      if (data.exists) {
        setErrors((prev) => ({ ...prev, did: "DID already exists in database" }));
      } else {
        setErrors((prev) => ({ ...prev, did: "" }));
      }
    } catch (e) {
      setErrors((prev) => ({ ...prev, did: "Failed to verify DID. Please try again." }));
    } finally {
      setCheckingDid(false);
    }
  };

  // Trigger check on DID change (debounced)
  useEffect(() => {
    if (didCheckTimeout.current) clearTimeout(didCheckTimeout.current);

    didCheckTimeout.current = setTimeout(() => {
      checkDidUniqueness(formData.did.trim());
    }, 500);

    return () => clearTimeout(didCheckTimeout.current);
  }, [formData.did, dev_id]);

  // -------------------------------------------------
  // 3. LOCAL VALIDATION
  // -------------------------------------------------
  const validate = () => {
    const errs = {};

    if (!formData.did.trim()) errs.did = "DID is required";
    if (!formData.loc_id) errs.loc_id = "Location is required";
    if (!formData.macid.trim()) errs.macid = "MAC ID is required";
    if (!formData.device_name.trim()) errs.device_name = "Device Name is required";
    if (!formData.device_type) errs.device_type = "Device Type is required";
    if (!formData.topic.trim()) errs.topic = "Topic is required";
    if (!formData.response.trim()) errs.response = "Response is required";

    // Merge with async DID error
    if (errors.did) errs.did = errors.did;

    setErrors(errs);
    return Object.keys(errs).length === 0 && !checkingDid;
  };

  // -------------------------------------------------
  // 4. FETCH DATA
  // -------------------------------------------------
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
        const res = await axios.get(`${apiURL}/getNeonDeviceById/${dev_id}`, {
          headers: { Authorization: token },
        });
        const d = res.data;
        setFormData({
          did: d.did || "",
          loc_id: d.loc_id || "",
          macid: d.macid || "",
          device_name: d.device_name || "",
          device_type: d.device_type || "",
          topic: d.topic || "",
          response: d.response || "",
          is_active: d.is_active ?? true,
          device: "neon",
        });
        originalDid.current = d.did || "";
      } catch (err) {
        console.error("Error fetching device:", err);
        alert("Failed to fetch device data");
        navigate("/device-list");
      }
    };

    fetchLocations();
    fetchDevice();
  }, [dev_id, apiURL, token, navigate]);

  // -------------------------------------------------
  // 5. SUBMIT
  // -------------------------------------------------
 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  try {
    // Extract user_id from token
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    let user_id = 1;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        user_id = payload.user_id || payload.id || 1;
      } catch (e) {}
    }

    const submitData = {
      ...formData,
      updated_by: user_id,
    };

    if (dev_id) {
      await axios.put(`${apiURL}/updateDeviceManagement/${dev_id}`, submitData, {
        headers: { Authorization: token },
      });
    } else {
      await axios.post(`${apiURL}/createDeviceManagement`, submitData, {
        headers: { Authorization: token },
      });
    }
    setShowSuccess(true);
  } catch (err) {
    const msg = err.response?.data?.error || "Failed to save device.";
    alert(msg);
  }
};

  // -------------------------------------------------
  // 6. RENDER
  // -------------------------------------------------
  return (
    <div className="flex flex-col items-start justify-start pt-4 pl-1 text-white">
      <div className="font-bold text-2xl pb-2 pl-5">
        <h1>{dev_id ? "Edit Neon Device" : "Add Neon Device"}</h1>
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
              disabled={!!dev_id}
              className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'} text-white shadow appearance-none border rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-60`}
              placeholder="Enter unique DID"
            />
            {/* ERROR MESSAGE */}
            {errors.did && (
              <p className="text-red-400 text-xs mt-1 font-medium">
                {errors.did}
              </p>
            )}
            {checkingDid && !errors.did && (
              <p className="text-yellow-400 text-xs mt-1 animate-pulse">
                Checking availability...
              </p>
            )}
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
              className="bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="e.g. Living Room Light"
            />
            {errors.device_name && <p className="text-red-400 text-xs mt-1">{errors.device_name}</p>}
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
              className="bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="AA:BB:CC:DD:EE:FF"
            />
            {errors.macid && <p className="text-red-400 text-xs mt-1">{errors.macid}</p>}
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
              className="bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Select Type</option>
              {deviceTypes.map((type) => (
                <option key={type} value={type} className="bg-gray-700">
                  {type}
                </option>
              ))}
            </select>
            {errors.device_type && <p className="text-red-400 text-xs mt-1">{errors.device_type}</p>}
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
              className="bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="e.g. home/kitchen/fan"
            />
            {errors.topic && <p className="text-red-400 text-xs mt-1">{errors.topic}</p>}
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
              className="bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="e.g. ON, 1, OK"
            />
            {errors.response && <p className="text-red-400 text-xs mt-1">{errors.response}</p>}
          </div>

          {/* Status (Edit Only) */}
          {dev_id && (
            <div className="mb-4">
              <label className="block text-white text-sm font-bold mb-2">Status</label>
              <select
                name="is_active"
                value={formData.is_active?.toString() || "true"}
                onChange={handleChange}
                className="bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="true" className="bg-gray-700">Active</option>
                <option value="false" className="bg-gray-700">Inactive</option>
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
              className="bg-gray-800 text-white shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Select Location</option>
              {locations.map((loc) => (
                <option key={loc.loc_id} value={loc.loc_id} className="bg-gray-700">
                  {loc.loc_name}
                </option>
              ))}
            </select>
            {errors.loc_id && <p className="text-red-400 text-xs mt-1">{errors.loc_id}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => navigate("/device-list")}
            className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={checkingDid || !!errors.did}
            className="font-bold px-6 py-2 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#76df23" }}
          >
            {checkingDid ? "Checking..." : dev_id ? "Update" : "Submit"}
          </button>
        </div>
      </form>

      <SuccessPopup
        isOpen={showSuccess}
        onClose={() => navigate("/device-list")}
        message={dev_id ? "Device Updated Successfully" : "Device Added Successfully"}
      />
    </div>
  );
};

export default NeonDeviceForm;