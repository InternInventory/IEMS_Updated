import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";

const CountryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countryLogo, setCountryLogo] = useState(null);
  const [existingLogo, setExistingLogo] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [validationPopup, setValidationPopup] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    is_active: "",
  });

  const [countryNameError, setCountryNameError] = useState("");
  const [countryCodeError, setCountryCodeError] = useState("");

  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const authFetch = useAuthFetch();

  useEffect(() => {
    if (isEditMode) {
      authFetch({
        url: `${apiURL}/master/country/${id}`,
        method: "GET",
      })
        .then((res) => {
          const data = res.data;
          setCountryName(data.country_name || "");
          setCountryCode(data.country_code || "");
          setExistingLogo(data.logo_url || "");
          setFormData({ is_active: data.is_active });
        })
        .catch((err) => {
          console.error("Error fetching country data:", err);
          setCountryNameError("Failed to load country data.");
        });
    }
  }, [id, isEditMode]);

  const handleFileInputClick = () => {
    document.getElementById("country-logo").click();
  };

  const checkCountryNameExists = async (name) => {
    if (!name.trim()) return;
    try {
      const res = await authFetch({
        url: `${apiURL}/master/country/check-name?name=${encodeURIComponent(name)}`,
        method: "GET",
      });
      if (res.data.exists && (!isEditMode || name.toLowerCase() !== countryName.toLowerCase())) {
        setCountryNameError("Country name already exists");
      } else {
        setCountryNameError("");
      }
    } catch (error) {
      console.error("Error checking country name:", error);
    }
  };

  const isValidCountryCode = (code) => {
    const pattern = /^\+\d{2,}$/; // must start with + followed by at least two digits
    return pattern.test(code.trim());
  };

  const checkCountryCodeExists = async (code) => {
    if (!code.trim()) return;
    try {
      const res = await authFetch({
        url: `${apiURL}/master/country/check-code?code=${encodeURIComponent(code)}`,
        method: "GET",
      });
      if (res.data.exists && (!isEditMode || code.toUpperCase() !== countryCode.toUpperCase())) {
        setCountryCodeError("Country code already exists");
      } else {
        setCountryCodeError("");
      }
    } catch (error) {
      console.error("Error checking country code:", error);
    }
  };

  const handleLogoChange = (e) => {
    setCountryLogo(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setCountryNameError("");
    setCountryCodeError("");
    setStatusError("");

    if (!countryName || !countryCode || (isEditMode && formData.is_active === "")) {
      if (isEditMode && formData.is_active === "") {
        setStatusError("Status is required");
      }
      setValidationPopup(true);
      return;
    }

     if (!isValidCountryCode(countryCode)) {
  setCountryCodeError("Country code must start with '+' and include at least 2 digits");
  setValidationPopup(true);
  return;
}

    try {
      if (isEditMode) {
        await authFetch({
          url: `${apiURL}/master/country/${id}`,
          method: "PUT",
          data: {
            country_name: countryName,
            country_code: countryCode,
            is_active: formData.is_active,
            updated_by: 1,
          },
        });
        setSuccessMessage("Country updated successfully!");
      } else {
        await authFetch({
          url: `${apiURL}/master/country`,
          method: "POST",
          data: {
            country_name: countryName,
            country_code: countryCode,
            created_by: 1,
          },
        });
        setSuccessMessage("Country created successfully!");
      }

      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        navigate("/master/country");
      }, 3000);
    } catch (error) {
      console.error("Error saving country:", error);

      if (error.response?.data?.errors) {
        const { country_name, country_code, general } = error.response.data.errors;
        setCountryNameError(country_name || "");
        setCountryCodeError(country_code || "");
        if (general && !country_name && !country_code) {
          setCountryNameError(general);
        }
      } else {
        setCountryCodeError("Country code already exists");
      }
    }
  };

  return (
    <div className="w-full">
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>{isEditMode ? "Edit Country" : "Create Country"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          {/* Logo */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="country-logo">
              Country Logo
            </label>
            <input
              type="file"
              id="country-logo"
              name="countryLogo"
              onChange={handleLogoChange}
              className="hidden"
              accept="image/*"
            />
            <button
              type="button"
              onClick={handleFileInputClick}
              className="h-[90px] w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent border rounded shadow flex flex-col items-center justify-center"
            >
              <FontAwesomeIcon icon={faUpload} size="2x" />
              <span className="mt-2">
                {countryLogo
                  ? countryLogo.name
                  : existingLogo
                  ? "Existing Logo"
                  : "Upload Logo"}
              </span>
            </button>
            {existingLogo && !countryLogo && (
              <img
                src={existingLogo}
                alt="Country Logo"
                className="mt-2 h-16 object-contain"
              />
            )}
          </div>

          {/* Country Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="country-name">
              Country Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="country-name"
              name="countryName"
              value={countryName}
              onChange={(e) => {
                setCountryName(e.target.value);
                setCountryNameError("");
              }}
              onBlur={() => checkCountryNameExists(countryName)}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
              required
            />
            {countryNameError && <p className="text-red-500 text-sm mt-1">{countryNameError}</p>}
          </div>

          {/* Country Code */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="country-code">
              Country Code <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                id="country-code"
                name="countryCode"
                value={countryCode}
                onChange={(e) => {
                  const value = e.target.value;
 
                  // Allow only + followed by numbers
                  if (/^\+?\d*$/.test(value)) {
                    setCountryCode(value);
                    setCountryCodeError("");
                  }
                }}
                onBlur={() => {
                  if (!isValidCountryCode(countryCode)) {
                    setCountryCodeError("Country code must start with '+' and have at least 2 digits");
                  } else {
                    checkCountryCodeExists(countryCode);
                  }
                }}
                className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            {countryCodeError && <p className="text-red-500 text-sm mt-1">{countryCodeError}</p>}
          </div>
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
              className="w-full px-4 py-2 rounded-md border border-gray-600 bg-[#0a101f] text-white"
            >
              <option value="">Select Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {statusError && <p className="text-red-500 text-sm mt-1">{statusError}</p>}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end mt-6">
          <div className="p-3">
            <button
              type="button"
              className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
              onClick={() => navigate("/master/country")}
            >
              Cancel
            </button>
          </div>
          <div>
            <button
              type="submit"
              className="font-bold px-4 py-2 hover:opacity-90 text-white rounded-lg transition duration-300"
              style={{ backgroundColor: "#76df23" }}
            >
              {isEditMode ? "Update" : "Submit"}
            </button>
          </div>
        </div>
      </form>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center">
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              ✅
            </div>
            <h2 className="text-2xl font-semibold mb-2">{successMessage}</h2>
            <p className="text-base text-slate-400">Redirecting to country list...</p>
          </div>
        </div>
      )}

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

export default CountryForm;
