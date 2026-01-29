import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";

const StateForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const authFetch = useAuthFetch();

  const [countryList, setCountryList] = useState([]);
  const [regionList, setRegionList] = useState([]);

  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");

  const [stateName, setStateName] = useState("");
  const [isActive, setIsActive] = useState("active");

  const [errors, setErrors] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const apiURL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchCountries();
    if (isEditMode) {
      fetchStateDetails();
    }
  }, [id]);

  useEffect(() => {
    if (selectedCountryId) {
      fetchRegions(selectedCountryId);
    } else {
      setRegionList([]);
    }
  }, [selectedCountryId]);

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

  const fetchStateDetails = async () => {
    try {
      const res = await authFetch({ url: `${apiURL}/statemaster/${id}` });
      const state = res.data;
      setStateName(state.state_name);
      setSelectedCountryId(state.country_id);
      setSelectedRegionId(state.region_id);
      setIsActive(state.is_active ? "active" : "inactive");
    } catch (err) {
      console.error("Error fetching state details", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!stateName) validationErrors.stateName = "State name is required";
    if (!selectedRegionId) validationErrors.region = "Region is required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Check duplicate only in create mode
      if (!isEditMode) {
        const dupRes = await authFetch({
          url: `${apiURL}/statemaster/check-duplicate`,
          method: "POST",
          data: { state_name: stateName, region_id: parseInt(selectedRegionId) }
        });

        if (dupRes.data.exists) {
          setErrors({ stateName: "This state already exists with this country and region." });
          return;
        }
      }

      const payload = {
        state_name: stateName,
        region_id: parseInt(selectedRegionId),
        is_active: isActive === "active",
      };

      if (isEditMode) {
        await authFetch({
          url: `${apiURL}/statemaster/${id}`,
          method: "PUT",
          data: payload,
        });
        setSuccessMessage("State updated successfully!");
      } else {
        await authFetch({
          url: `${apiURL}/statemaster`,
          method: "POST",
          data: payload,
        });
        setSuccessMessage("State created successfully!");
      }

      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        navigate("/master/state");
      }, 3000);
    } catch (error) {
      if (error.response?.data?.error) {
        setErrors({ stateName: error.response.data.error });
      } else {
        console.error("Error saving state", error);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>{isEditMode ? "Edit State" : "Create State"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          {/* Country */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
            >
              <option value="">Select Country</option>
              {countryList.map((country) => (
                <option key={country.country_id} value={country.country_id}>
                  {country.country_name}
                </option>
              ))}
            </select>
            {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
          </div>

          {/* Region */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Region <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
            >
              <option value="">Select Region</option>
              {regionList.map((region) => (
                <option key={region.region_id} value={region.region_id}>
                  {region.region_name}
                </option>
              ))}
            </select>
            {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
          </div>

          {/* State Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              State Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
            />
            {errors.stateName && <p className="text-red-500 text-sm mt-1">{errors.stateName}</p>}
          </div>

          {/* Status */}
          {isEditMode && (
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                Status <span className="text-red-500">*</span>
              </label>
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
            onClick={() => navigate("/master/state")}
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
            <p className="text-base text-slate-400">Redirecting to state list...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StateForm;
