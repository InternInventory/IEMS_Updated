import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import useAuthFetch from "../hooks/useAuthFetch";
import { useTheme } from "../../context/ThemeContext";

const LocationForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const { isDarkMode } = useTheme();

  const [formData, setFormData] = useState({
    branch_code: "",
    loc_name: "",
    site_person_name: "",
    site_person_contact: "",
    site_person_email: "",
    latitude: "",
    longitude: "",
    org_id: "",
    country_id: "",
    region_id: "",
    state_id: "",
    city_id: "",
    loc_type_id: "",
    working_hours: "",
    checklist: "",
    active_hours_start: "08:00",
    active_hours_end: "20:00",
    is_active: true,
  });

  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [errors, setErrors] = useState({});
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [clients, setClients] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [validationPopup, setValidationPopup] = useState(false);
  const [countryCode, setCountryCode] = useState("");
  const [statusError, setStatusError] = useState("");

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [countryRes, clientRes, typeRes] = await Promise.all([
          authFetch({ url: `${apiUrl}/countries`, method: "GET" }).then(res => res.data),
          authFetch({ url: `${apiUrl}/client-details`, method: "GET" }).then(res => res.data),
          authFetch({ url: `${apiUrl}/location-types`, method: "GET" }).then(res => res.data),
        ]);

        setCountries(countryRes);
        setClients(clientRes);
        setLocationTypes(typeRes);
      } catch (err) {
        console.error("Error fetching initial data:", err.response?.data || err.message);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch location data if editing
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await authFetch({ url: `${apiUrl}/location/${id}`, method: "GET" });
        const data = res.data;

        setFormData({
          branch_code: data.branch_code || "",
          loc_name: data.loc_name,
          site_person_name: data.contact_person_name,
          site_person_contact: data.contact_person_mobile,
          site_person_email: data.contact_person_email,
          latitude: data.geo_lat,
          longitude: data.geo_long,
          loc_type_id: data.loc_type_id,
          org_id: data.org_id,
          country_id: data.country_id,
          region_id: data.region_id,
          state_id: data.state_id,
          city_id: data.city_id,
          working_hours: "",
          checklist: "",
          active_hours_start: data.active_hours_start || "08:00",
          active_hours_end: data.active_hours_end || "20:00",
          is_active: data.is_active ?? true,
        });
        setAddress(data.loc_address || "");

        await fetchRegions(data.country_id).then(() => {
          setFormData((prev) => ({ ...prev, region_id: data.region_id }));
        });
        await fetchStates(data.region_id).then(() => {
          setFormData((prev) => ({ ...prev, state_id: data.state_id }));
        });
        await fetchCities(data.state_id).then(() => {
          setFormData((prev) => ({ ...prev, city_id: data.city_id }));
        });

        setLoading(false);
      } catch (err) {
        console.error("Error loading location:", err.response?.data || err.message);
        setLoading(false);
      }
    };

    if (isEditMode) fetchLocation();
    else setLoading(false);
  }, [id]);

  // Fetch regions, states, cities
  const fetchRegions = async (countryId) => {
    try {
      const res = await authFetch({ url: `${apiUrl}/regions/${countryId}`, method: "GET" });
      setRegions(res.data);
    } catch (err) {
      console.error("Error fetching regions:", err.response?.data || err.message);
    }
  };

  const fetchStates = async (regionId) => {
    try {
      const res = await authFetch({ url: `${apiUrl}/states/${regionId}`, method: "GET" });
      setStates(res.data);
    } catch (err) {
      console.error("Error fetching states:", err.response?.data || err.message);
    }
  };

  const fetchCities = async (stateId) => {
    try {
      const res = await authFetch({ url: `${apiUrl}/cities/${stateId}`, method: "GET" });
      setCities(res.data);
    } catch (err) {
      console.error("Error fetching cities:", err.response?.data || err.message);
    }
  };

  // Validate address
  const validateAddress = (value) => {
    if (!value.trim()) setAddressError("Address is required.");
    else if (value.length > 255) setAddressError("Address cannot exceed 255 characters.");
    else setAddressError("");
  };

  // Handle cascading dropdowns & country code
  useEffect(() => {
    if (formData.country_id) {
      fetchRegions(formData.country_id);
      const selected = countries.find((c) => String(c.country_id) === String(formData.country_id));
      const code = selected?.country_code || "";
      setCountryCode(code);

      if (!isEditMode) {
        setFormData((prev) => ({
          ...prev,
          site_person_contact: code,
          region_id: "",
          state_id: "",
          city_id: "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          region_id: "",
          state_id: "",
          city_id: "",
        }));
      }
    }
  }, [formData.country_id, countries, isEditMode]);

  useEffect(() => {
    if (formData.region_id) {
      fetchStates(formData.region_id);
      setFormData((prev) => ({ ...prev, state_id: "", city_id: "" }));
    }
  }, [formData.region_id]);

  useEffect(() => {
    if (formData.state_id) {
      fetchCities(formData.state_id);
      setFormData((prev) => ({ ...prev, city_id: "" }));
    }
  }, [formData.state_id]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "site_person_contact") {
      if (!value.startsWith(countryCode)) {
        setFormData((prev) => ({ ...prev, site_person_contact: countryCode }));
        return;
      }
      const numberPart = value.slice(countryCode.length).replace(/\D/g, "");
      if (numberPart.length <= 10) {
        setFormData((prev) => ({ ...prev, site_person_contact: countryCode + numberPart }));
        setErrors((prev) => ({ ...prev, site_person_contact: "" }));
      }
      return;
    }

    const allowedChars = /^-?\d*\.?\d*$/;
    if (name === "latitude" || name === "longitude") {
      if (value === "" || allowedChars.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Blur validations
  const handleBlur = async (e) => {
    const { name, value } = e.target;
    if (!value) return;

    if (name === "site_person_contact") {
      const numberPart = value.replace(countryCode, "").replace(/\D/g, "");
      if (!/^\d{10}$/.test(numberPart)) {
        setErrors((prev) => ({ ...prev, site_person_contact: "Mobile number must be exactly 10 digits" }));
      } else {
        setErrors((prev) => ({ ...prev, site_person_contact: "" }));
      }
      return;
    }
  };

  // Validate entire form
  const validate = () => {
    const requiredFields = [
      "branch_code", "loc_name", "site_person_name", "site_person_contact", "site_person_email",
      "latitude", "longitude", "org_id", "country_id", "region_id", "state_id", "city_id", "loc_type_id",
      "active_hours_start", "active_hours_end"
    ];
    let valid = true;
    let newErrors = {};

    requiredFields.forEach((field) => {
      console.log(`Validating field: ${field}, value: ${formData[field]}`);
      if (!formData[field]) {
        newErrors[field] = "This field is required";
        valid = false;
      }
    });

    console.log(`Validating field: address, value: ${address}`);
    if (!address.trim()) {
      newErrors.address = "Address is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Submit handler
  const handleSubmit = async e => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      setValidationPopup(true);
      return;
    }

    const { working_hours, checklist, ...dataToSend } = formData;
    dataToSend.loc_address = address;

    if (isEditMode) {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const payload = JSON.parse(atob(token.split(".")[1]));
      dataToSend.updated_by = payload.user_id;
    }

    const url = isEditMode ? `${apiUrl}/locations/${id}` : `${apiUrl}/locations`;
    const method = isEditMode ? "PUT" : "POST";

    try {
      await authFetch({ url, method, data: dataToSend });
      setSuccessMessage(isEditMode ? "Location Updated Successfully" : "Location Created Successfully");
      setShowPopup(true);
      setTimeout(() => navigate("/location"), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "";
      if (errorMsg.includes("Branch Code")) {
        setErrors(prev => ({ ...prev, branch_code: "Branch Code already exists" }));
      } else if (errorMsg) {
        setValidationPopup(true);
      }
    }
  };

  // UI rendering (your existing JSX)
  const renderSearchSelect = (label, name, options = [], labelKey, valueKey) => {
    const isRequired = [
      "branch_code", "loc_name", "site_person_name", "site_person_contact",
      "site_person_email", "latitude", "longitude", "org_id",
      "country_id", "region_id", "state_id", "city_id", "loc_type_id"
    ].includes(name);

    return (
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <Select
          name={name}
          value={options.find((opt) => String(opt[valueKey]) === String(formData[name])) || null}
          onChange={(selected) =>
            setFormData((prev) => ({ ...prev, [name]: selected ? selected[valueKey] : "" }))
          }
          options={options}
          getOptionLabel={(option) => option[labelKey]}
          getOptionValue={(option) => option[valueKey]}
          isSearchable
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: isDarkMode ? "#0a101f" : "#FFFFFF",
              borderColor: isDarkMode ? "#e8ebf1ff" : "#D1D5DB",
              borderRadius: "0.375rem",
              padding: "0.10rem 0.55rem",
              color: isDarkMode ? "white" : "#111827",
              boxShadow: "none",
              "&:hover": { borderColor: "#facc15" },
            }),
            singleValue: (base) => ({ ...base, color: isDarkMode ? "white" : "#111827" }),
            menu: (base) => ({ ...base, backgroundColor: isDarkMode ? "#0a101f" : "#FFFFFF", color: isDarkMode ? "white" : "#111827" }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused 
                ? (isDarkMode ? "#1f2937" : "#F3F4F6") 
                : (isDarkMode ? "#0a101f" : "#FFFFFF"),
              color: isDarkMode ? "white" : "#111827",
            }),
            input: (base) => ({ ...base, color: isDarkMode ? "white" : "#111827" }),
            placeholder: (base) => ({ ...base, color: "#9ca3af" }),
          }}
        />
        {errors[name] && <p className="text-red-500 text-sm">{errors[name]}</p>}
      </div>
    );
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-5">
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className={`${isDarkMode ? 'bg-[#0c1220] text-white' : 'bg-white text-gray-900'} px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center`}>
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              ✅
            </div>
            <h2 className="text-2xl font-semibold mb-2">{successMessage}</h2>
            <p className={`text-base ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Redirecting to location list...</p>
          </div>
        </div>
      )}

      {validationPopup && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-4">
              Please fill all required fields correctly
            </h2>
            <button onClick={() => setValidationPopup(false)} className="bg-red-500 text-white px-4 py-2 rounded">
              Close
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">{isEditMode ? "Edit Location" : "Create Location"}</h1>
      <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
        {/* Branch Code */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Branch Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="branch_code"
            value={formData.branch_code}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isEditMode}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.branch_code && <p className="text-red-500 text-sm">{errors.branch_code}</p>}
        </div>

        {/* Location Name */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Location Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="loc_name"
            value={formData.loc_name}
            onChange={handleChange}
            onBlur={handleBlur}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.loc_name && <p className="text-red-500 text-sm">{errors.loc_name}</p>}
        </div>

        {/* Site Person Name */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Site Person Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="site_person_name"
            value={formData.site_person_name}
            onChange={handleChange}
            onBlur={handleBlur}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.site_person_name && <p className="text-red-500 text-sm">{errors.site_person_name}</p>}
        </div>

        {/* Country */}
        {renderSearchSelect("Country", "country_id", countries, "country_name", "country_id")}

        {/* Site Person Contact */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Site Person Contact <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="site_person_contact"
            value={formData.site_person_contact}
            onChange={handleChange}
            onBlur={handleBlur}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.site_person_contact && (
            <p className="text-red-500 text-sm">{errors.site_person_contact}</p>
          )}
        </div>

        {/* Site Person Email */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Site Person Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="site_person_email"
            value={formData.site_person_email}
            onChange={handleChange}
            onBlur={handleBlur}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.site_person_email && (
            <p className="text-red-500 text-sm">{errors.site_person_email}</p>
          )}
        </div>

        {/* Latitude */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Latitude <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            onBlur={handleBlur}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.latitude && <p className="text-red-500 text-sm">{errors.latitude}</p>}
        </div>

        {/* Longitude */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Longitude <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            onBlur={handleBlur}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.longitude && <p className="text-red-500 text-sm">{errors.longitude}</p>}
        </div>


        {renderSearchSelect("Region", "region_id", regions, "region_name", "region_id")}
        {renderSearchSelect("State", "state_id", states, "state_name", "state_id")}
        {renderSearchSelect("City", "city_id", cities, "city_name", "city_id")}

        {/* Client Name */}
        {renderSearchSelect("Client Name", "org_id", clients, "clientName", "clientId")}
        {renderSearchSelect("Location Type", "loc_type_id", locationTypes, "loc_type_name", "loc_type_id")}

        {/* Working Hours */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Working Hours (Optional)</label>
          <input
            type="text"
            name="working_hours"
            value={formData.working_hours}
            onChange={handleChange}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
        </div>

        {/* Checklist */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Checklist (Optional)</label>
          <input
            type="text"
            name="checklist"
            value={formData.checklist}
            onChange={handleChange}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
        </div>
        {/* Active Hours Start */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Active Hours Start <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            name="active_hours_start"
            value={formData.active_hours_start}
            onChange={handleChange}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.active_hours_start && (
            <p className="text-red-500 text-sm">{errors.active_hours_start}</p>
          )}
        </div>

        {/* Active Hours End */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">
            Active Hours End <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            name="active_hours_end"
            value={formData.active_hours_end}
            onChange={handleChange}
            className="bg-transparent shadow border rounded w-full py-2 px-3"
          />
          {errors.active_hours_end && (
            <p className="text-red-500 text-sm">{errors.active_hours_end}</p>
          )}
        </div>
        {isEditMode && (
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="is_active"
              value={formData.is_active ? "active" : "inactive"}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_active: e.target.value === "active",
                }))
              }
              className={`w-full px-4 py-2 rounded-md border ${isDarkMode ? 'border-gray-600 bg-[#0a101f] text-white' : 'border-gray-300 bg-white text-gray-900'}`}
            >
              <option value="">Select Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {statusError && (
              <p className="text-red-500 text-sm mt-1">{statusError}</p>
            )}
          </div>
        )}


        {/*Address Field*/}
        <div className="text-white">
          <label className="block text-sm font-bold mb-2" htmlFor="address">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            className="bg-transparent shadow border rounded w-full py-2 px-3"
            id="address"
            placeholder="Enter your address"
            rows={3}
            maxLength={255}
            value={address}
            onKeyDown={(e) => {
              const currentValue = e.target.value;
              const lines = currentValue.split('\n');
              const currentLine = lines[lines.length - 1];
              if (e.key === 'Enter' && currentLine.length < 50) {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              let value = e.target.value;
              const maxChars = 255;
              const lineLimit = 82;

              value = value.replace(/\r/g, '');

              let formatted = '';
              let line = '';

              for (let i = 0; i < value.length && formatted.length < maxChars; i++) {
                const char = value[i];
                if (char === '\n') continue;
                line += char;
                if (line.length === lineLimit) {
                  formatted += line + '\n';
                  line = '';
                }
              }
              formatted += line;
              if (formatted.length > maxChars) {
                formatted = formatted.slice(0, maxChars);
              }

              setAddress(formatted);
              validateAddress(formatted);
            }}
          />
          <p className={`text-sm mt-1 ${address.length === 255 ? 'text-yellow-400' : 'text-gray-300'}`}>
            ({address.length}/255)
          </p>
          {addressError && (
            <p className="text-red-500 text-sm mt-1">{addressError}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 col-span-4">
          <button type="button" onClick={() => navigate("/location")} className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}>
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg font-bold text-white hover:opacity-90" style={{ backgroundColor: "#76df23" }}>
            {isEditMode ? "Submit" : "Create Location"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LocationForm;
