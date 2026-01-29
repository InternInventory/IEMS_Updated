
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";

const CityForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = id && !isNaN(id);
  const authFetch = useAuthFetch();

  const [countryList, setCountryList] = useState([]);
  const [regionList, setRegionList] = useState([]);
  const [stateList, setStateList] = useState([]);

  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");

  const [cityName, setCityName] = useState("");
  const [isActive, setIsActive] = useState("active");

  const [errors, setErrors] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const apiURL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchCountries().then(() => {
      if (isEditMode && id && !isNaN(id)) {
        fetchCityDetails();
      }
    });
  }, [id]);

  useEffect(() => {
    if (selectedCountryId) {
      fetchRegions(selectedCountryId);
    } else {
      setRegionList([]);
      setStateList([]);
    }
  }, [selectedCountryId]);

  useEffect(() => {
    if (selectedRegionId) {
      fetchStates(selectedRegionId);
    } else {
      setStateList([]);
    }
  }, [selectedRegionId]);

  const fetchCountries = async () => {
    try {
      const res = await authFetch({ url: `${apiURL}/countries` });
      setCountryList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch countries", err);
    }
  };

  const fetchRegions = async (country_id) => {
    try {
      const res = await authFetch({ url: `${apiURL}/regions/by-country/${country_id}` });
      setRegionList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch regions", err);
    }
  };

  const fetchStates = async (region_id) => {
    try {
      const res = await authFetch({ url: `${apiURL}/states/by-region/${region_id}` });
      setStateList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch states", err);
    }
  };

  const fetchCityDetails = async () => {
    try {
      const res = await authFetch({ url: `${apiURL}/citymaster/${id}` });
      const city = res.data;

      setCityName(city.city_name);
      setSelectedCountryId(String(city.country_id));

      const regionRes = await authFetch({ url: `${apiURL}/regions/by-country/${city.country_id}` });
      setRegionList(regionRes.data || []);
      setSelectedRegionId(String(city.region_id));

      const stateRes = await authFetch({ url: `${apiURL}/states/by-region/${city.region_id}` });
      setStateList(stateRes.data || []);
      setSelectedStateId(String(city.state_id));

      setIsActive(city.is_active ? "active" : "inactive");
    } catch (err) {
      console.error("Error fetching city details", err);
    }
  };

  // Check duplicate city via API
  const checkCityDuplicate = async (name, countryId, regionId, stateId) => {
    if (!name || !countryId || !regionId || !stateId || isEditMode) return false; // skip in edit mode
    try {
      const res = await authFetch({
        url: `${apiURL}/citymaster/check-duplicate`,
        method: "POST",
        data: {
          city_name: name,
          country_id: parseInt(countryId),
          region_id: parseInt(regionId),
          state_id: parseInt(stateId),
        },
      });
      return res.data.exists;
    } catch (err) {
      console.error("Error checking duplicate city", err);
      return false;
    }
  };

  // Validate duplicate city (only in create mode)
  const validateDuplicateCity = async () => {
    if (!isEditMode && cityName && selectedCountryId && selectedRegionId && selectedStateId) {
      const duplicate = await checkCityDuplicate(cityName, selectedCountryId, selectedRegionId, selectedStateId);
      if (duplicate) {
        setErrors(prev => ({ ...prev, cityName: "City already exists for this Country, Region, and State" }));
      } else {
        setErrors(prev => ({ ...prev, cityName: "" }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!cityName) validationErrors.cityName = "City name is required";
    if (!selectedCountryId) validationErrors.country = "Country is required";
    if (!selectedRegionId) validationErrors.region = "Region is required";
    if (!selectedStateId) validationErrors.state = "State is required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Final duplicate check before submit (only in create mode)
    if (!isEditMode) {
      const isDuplicate = await checkCityDuplicate(cityName, selectedCountryId, selectedRegionId, selectedStateId);
      if (isDuplicate) {
        setErrors({ cityName: "City already exists for this Country, Region, and State" });
        return;
      }
    }

    const payload = {
      city_name: cityName,
      state_id: parseInt(selectedStateId),
      region_id: parseInt(selectedRegionId),
      country_id: parseInt(selectedCountryId),
      is_active: isActive === "active",
    };

    try {
      if (isEditMode) {
        await authFetch({ url: `${apiURL}/citymaster/${id}`, method: "PUT", data: payload });
        setSuccessMessage("City updated successfully!");
      } else {
        await authFetch({ url: `${apiURL}/citymaster`, method: "POST", data: payload });
        setSuccessMessage("City created successfully!");
      }

      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        navigate("/master/city");
      }, 3000);
    } catch (error) {
      console.error("Error saving city", error);
    }
  };

  return (
    <div className="w-full">
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>{isEditMode ? "Edit City" : "Create City"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          {/* Country */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Country <span className="text-red-500">*</span></label>
            <select
              value={selectedCountryId}
              onChange={(e) => {
                setSelectedCountryId(e.target.value);
                setSelectedRegionId("");
                setSelectedStateId("");
              }}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
            >
              <option value="">Select Country</option>
              {countryList.map((c) => (
                <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
              ))}
            </select>
            {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
          </div>

          {/* Region */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Region <span className="text-red-500">*</span></label>
            <select
              value={selectedRegionId}
              onChange={(e) => {
                setSelectedRegionId(e.target.value);
                setSelectedStateId("");
              }}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
            >
              <option value="">Select Region</option>
              {regionList.map((r) => (
                <option key={r.region_id} value={r.region_id}>{r.region_name}</option>
              ))}
            </select>
            {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
          </div>

          {/* State */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">State <span className="text-red-500">*</span></label>
            <select
              value={selectedStateId}
              onChange={(e) => setSelectedStateId(e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
            >
              <option value="">Select State</option>
              {stateList.map((s) => (
                <option key={s.state_id} value={s.state_id}>{s.state_name}</option>
              ))}
            </select>
            {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
          </div>

          {/* City Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">City Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              onBlur={validateDuplicateCity}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
            />
            {errors.cityName && <p className="text-red-500 text-sm mt-1">{errors.cityName}</p>}
          </div>

          {/* Status */}
          {isEditMode && (
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Status</label>
              <select
                value={isActive}
                onChange={(e) => setIsActive(e.target.value)}
                className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end mt-6">
          <button
            type="button"
            onClick={() => navigate("/master/city")}
            className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="font-bold px-4 py-2 ml-4 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
          >
            {isEditMode ? "Update" : "Submit"}
          </button>
        </div>
      </form>

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center">
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              ✅
            </div>
            <h2 className="text-2xl font-semibold mb-2">{successMessage}</h2>
            <p className="text-base text-slate-400">Redirecting to city list...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityForm;

