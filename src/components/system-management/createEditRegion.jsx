

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";

const RegionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const authFetch = useAuthFetch();

  const [regionType, setRegionType] = useState("");
  const [countryList, setCountryList] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [formData, setFormData] = useState({ is_active: "" });

  const [regionTypeError, setRegionTypeError] = useState("");
  const [countryError, setCountryError] = useState("");
  const [statusError, setStatusError] = useState("");

  const [validationPopup, setValidationPopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const apiURL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      await fetchCountries();

      if (isEditMode) {
        try {
          const response = await authFetch({ url: `${apiURL}/regionmaster/${id}` });
          const region = response.data;
          setRegionType(region.region_name);
          setSelectedCountryId(region.country_id || "");
          setFormData({ is_active: region.is_active });
        } catch (error) {
          console.error("Error fetching region details:", error.message);
        }
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const fetchCountries = async () => {
    try {
      const res = await authFetch({ url: `${apiURL}/countries` });
      setCountryList(res.data || []);
    } catch (error) {
      console.error("Failed to fetch countries", error.message);
    }
  };

  const checkRegionConflict = async () => {
    if (isEditMode) return false; // skip duplicate check in edit mode
    if (!regionType || !selectedCountryId) return false;
    try {
      const res = await authFetch({
        url: `${apiURL}/regionmaster/check-conflict?regionType=${regionType}&countryId=${selectedCountryId}`,
      });
      return res.data.exists;
    } catch (err) {
      console.error("Error checking region conflict", err.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setRegionTypeError("");
    setCountryError("");
    setStatusError("");

    if (!regionType || !selectedCountryId || (isEditMode && formData.is_active === "")) {
      if (!regionType) setRegionTypeError("Region type is required");
      if (!selectedCountryId) setCountryError("Country is required");
      if (isEditMode && formData.is_active === "") setStatusError("Status is required");
      setValidationPopup(true);
      return;
    }

    // Duplicate check only in create mode
    const exists = await checkRegionConflict();
    if (exists) {
      setCountryError("Region-country pair already exists");
      return;
    }

    const payload = {
      region_name: regionType,
      region_type: regionType,
      country_id: parseInt(selectedCountryId),
      is_active: isEditMode ? formData.is_active : true,
    };

    try {
      if (isEditMode) {
        await authFetch({
          url: `${apiURL}/regionmaster/${id}`,
          method: "PUT",
          data: payload,
        });
        setSuccessMessage("Region updated successfully!");
      } else {
        await authFetch({
          url: `${apiURL}/regionmaster`,
          method: "POST",
          data: payload,
        });
        setSuccessMessage("Region created successfully!");
      }

      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        navigate("/master/region");
      }, 3000);
    } catch (error) {
      console.error("Error saving region:", error.message);
    }
  };

  return (
    <div className="w-full">
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>{isEditMode ? "Edit Region" : "Create Region"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          {/* Region Type */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Region Type <span className="text-red-500">*</span>
            </label>
            <select
            value={regionType}
            onChange={(e) => setRegionType(e.target.value)}
            className={`w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white ${
              isEditMode ? "bg-gray-800 cursor-not-allowed" : ""
            }`}
            required
            disabled={isEditMode}
          >
            <option value="">Select Region</option>
            <option value="North">North</option>
            <option value="East">East</option>
            <option value="South">South</option>
            <option value="West">West</option>
          </select>
 
            {regionTypeError && <p className="text-red-500 text-sm mt-1">{regionTypeError}</p>}
          </div>

          {/* Country */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
              required
            >
              <option value="">Select Country</option>
              {countryList.map((country) => (
                <option key={country.country_id} value={country.country_id}>
                  {country.country_name}
                </option>
              ))}
            </select>
            {countryError && <p className="text-red-500 text-sm mt-1">{countryError}</p>}
          </div>

          {/* Status (Edit Mode Only) */}
          {isEditMode && (
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_active: e.target.value === "active",
                  }))
                }
                className="w-full px-4 py-2 rounded-md border bg-[#0a101f] text-white"
              >
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {statusError && <p className="text-red-500 text-sm mt-1">{statusError}</p>}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end mt-6">
          <button
            type="button"
            onClick={() => navigate("/master/region")}
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
            <p className="text-base text-slate-400">Redirecting to region list...</p>
          </div>
        </div>
      )}

      {/* Validation Popup */}
      {validationPopup && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-4">
              Please fill all required fields correctly
            </h2>
            <button
              onClick={() => setValidationPopup(false)}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionForm;
