import { faChevronDown, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SuccessPopup from "./successPopUP";
import useAuthFetch from "../hooks/useAuthFetch";

const CreateSI = () => {
  const navigate = useNavigate();
  const handleFileInputClick = () => {
    document.getElementById("si-logo").click();
  };


  const [siName, setSIName] = useState("");
  const [siNameError, setSINameError] = useState("");
const authFetch = useAuthFetch();
const [logoPreview, setLogoPreview] = useState(null);

const [logoFile, setLogoFile] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success"); // or 'error'
  
  const [cities, setCities] = useState([]); // List of cities
  const [city, setCity] = useState("");     // Selected city
  const [cityError, setCityError] = useState("");
  
  const [isOtherCity, setIsOtherCity] = useState(false);
const [customCity, setCustomCity] = useState("");
const [states, setStates] = useState([]);
const [selectedState, setSelectedState] = useState("");
const [countries, setCountries] = useState([]);
const [selectedCountry, setSelectedCountry] = useState("");
const [countryError, setCountryError] = useState("");
const [stateError, setStateError] = useState("");

const [customCityError, setCustomCityError] = useState("");


  const checkSIName = async (name) => {
    try { 
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiURL}/check-name-si?si_name=${encodeURIComponent(name)}`,
        method: "GET"
      });

      if (res.data.exists) {
        setSINameError("SI name already exists.");
      } else {
        setSINameError("");
      }
    } catch (error) {
      console.error("Error checking si name:", error);
      setSINameError("Error validating si name.");
    }
  };


  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const res = await authFetch({
          url: `${apiURL}/countries`,
          method: "GET"
        });
        setCountries(res.data);
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };
  
    fetchCountries();
  }, []);
  
  useEffect(() => {
    const fetchStates = async () => {
      if (!selectedCountry) {
        setStates([]);
        return;
      }
      //states/by-country/${selectedCountry}
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const res = await authFetch({
          url: `${apiURL}/states/by-country/${selectedCountry}`,
          method: "GET"
        });
        setStates(res.data);
        setSelectedState(""); // reset selected state
        setCities([]); // reset cities
      } catch (err) {
        console.error("Error fetching states:", err);
      }
    };
  
    fetchStates();
  }, [selectedCountry]);
  
  useEffect(() => {
    const fetchCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }
      ///cities/by-state/${selectedState}
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const res = await authFetch({
          url: `${apiURL}/cities/by-state/${selectedState}`,
          method: "GET"
        });
        setCities(res.data);
      } catch (err) {
        console.error("Error fetching cities:", err);
      }
    };
  
    fetchCities();
  }, [selectedState]);
  
  


  const isNonEmptyText = (text) => text && text.trim().length > 0;

  const handleSINameChange = (e) => {
    const val = e.target.value;
    setSIName(val);

    if (!isNonEmptyText(val)) {
      setSINameError("Client name cannot be blank.");
    } else {
      setSINameError(""); // Clear error here, and validate onBlur
    }
  };

  const validateCity = (value) => {
    if (!value.trim()) {
      setCityError("City is required");
      return false;
    } else { 
      setCityError("");
      return true;
    }
  };


  const validateState = (value) => {
    if (!value.trim()) {
      setStateError("State is required");
      return false;
    } else {
      setStateError("");
      return true;
    }
  };
  
  const validateCountry = (value) => {
    if (!value.trim()) {
      setCountryError("Country is required");
      return false;
    } else {
      setCountryError("");
      return true;
    }
  };
const handleSubmit = async (e) => {
  const apiURL = import.meta.env.VITE_API_BASE_URL;

  e.preventDefault();

  let isValid = true;

  // Reset errors
  setCountryError("");
  setStateError("");
  setCityError("");
  setCustomCityError("");

  if (!selectedCountry) {
    setCountryError("Please select a country");
    isValid = false;
  }

  if (states.length === 0) {
    setStateError("No states available for selected country.");
    isValid = false;
  }else if (!selectedState) {
    setStateError("Please select a state");
    isValid = false;
  }
if(!siName){
  setSINameError("SI name cannot be blank.");
  isValid = false;
}
if (!city) {
  setCityError("Please select a city");
  isValid = false;
} else if (city === "other" && !customCity.trim()) {
  setCustomCityError("Please enter a new city name");
  isValid = false;
}
if (cities.length === 0) {
  setCityError("No cities available for selected state.");
  isValid = false;
}
  if (!isValid) return;

  // Proceed with form submission logic
  console.log("Submitting form...");

  const isCityValid = validateCity(city);
  const isSiNameValid = isNonEmptyText(siName);
  setSINameError(isSiNameValid ? "" : "SI name cannot be blank.");

  if (!isSiNameValid || !isCityValid) return;

  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    const res = await authFetch({
      url: `${apiURL}/check-name-si?si_name=${encodeURIComponent(siName)}`,
      method: "GET"
    });

    if (res.data.exists) {
      setSINameError("SI name already exists.");
      return;
    }
  } catch (err) {
    setSINameError("Error validating SI name.");
    return;
  }
  let finalCityId = city;

if (isOtherCity) {
  if (!customCity || !selectedState || !selectedCountry) {
    setCityError("All fields for new city must be filled");
    return;
  }

  try {
    const cityPayload = {
      city_name: customCity.trim(),
      state_id: selectedState,
      country_id: selectedCountry,
      is_active: true, 
    };

    const cityRes = await axios.post(`${apiURL}/city`, cityPayload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || sessionStorage.getItem("token"),
      },
    });

    if (cityRes.status === 201) {
      finalCityId = cityRes.data.city_id; // assign directly
    } else {
      setCityError("Failed to create new city.");
      return;
    }
  } catch (err) {
    console.error("Error creating new city:", err);
    setCityError("Error saving city.");
    return;
  }
}

  
  //  This was missing earlier
  const siData = {
    si_name: siName,
    logo_url: "", 
    is_active: true,
    city_id: finalCityId,
  };



  const formData = new FormData();
  if (logoFile) {
    formData.append("logo", logoFile);
  } // Assuming you want to upload a file here
  formData.append("si_name", siData.si_name);
  formData.append("is_active", siData.is_active);
  formData.append("city_id", siData.city_id);
  console.log("Form Data:", formData);
  console.log("Logo File Selected:", logoFile);

  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    const res = await authFetch({
      url: `${apiURL}/si`,
      method: "POST",
      data:formData,
    
    });


    if (res.status === 200 || res.status === 201) {
      setShowPopup(true);
      
      const siNameFromResponse = res.data.si_name || siName;
      setPopupMessage(`SI "${siNameFromResponse}" created successfully.`);
      setPopupType("success");
    
      setTimeout(() => {
        navigate("/system-management", { state: { siCreated: true } });
      }, 3000);
    }
  } catch (error) {
    console.error("Error creating SI:", error);
  }
};

  return (
    <div className="flex flex-col items-start justify-start pt-4 pl-1 2xl:gap-2 2xl:pt-6">
      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center">
            <span
              className="absolute top-4 right-6 text-gray-400 text-2xl cursor-pointer"
              onClick={() => setShowPopup(false)}
            >
              ×
            </span>

            {/* Icon circle - green for success, red for error */}
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6 ${popupType === "success" ? "bg-green-500" : "bg-red-500"
              }`}>
              {popupType === "success" ? "✓" : "!"}
            </div>

            <h2 className="text-2xl font-semibold mb-2">
              {popupMessage}
            </h2>

            {popupType === "success" && (
              <p className="text-base text-slate-400">
                Redirecting to SI List...
              </p>
            )}
          </div>
        </div>
      )}
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>Create SI</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="si-logo"
            >
              SI Logo
            </label>
            <input
              type="file"
              id="si-logo"
              name="siLogo"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                setLogoFile(file);
            
                if (file) {
                  const previewURL = URL.createObjectURL(file);
                  setLogoPreview(previewURL);
                } else {
                  setLogoPreview(null);
                }
              }}
            />
            
            <button
              type="button"
              onClick={handleFileInputClick}
              className="h-[150px] w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent border rounded shadow flex flex-col items-center justify-center"
            > {logoPreview ? (
              <img src={logoPreview} alt="SI Logo Preview" className="h-full w-full object-contain" />
            ) : (
              <>
                <FontAwesomeIcon icon={faUpload} size="2x" />
                <span className="mt-2">Upload Logo</span>
              </>
            )}
            </button>
            {/* Show selected file name */}
{logoFile && (
  <p className="mt-2 text-green-400 text-sm">
    Selected File: {logoFile.name}
  </p>
)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="si-name"
            >
              SI Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="si-name"
              name="siName"
              value={siName}
              onChange={handleSINameChange}
              onBlur={() => {
                if (isNonEmptyText(siName)) checkSIName(siName);
              }}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
            />
            {siNameError && (
              <p className="text-red-500 text-xs mt-1">{siNameError}</p>
            )}
          </div>

        
          {/* Line 2 */}
        
         {/* Country Dropdown */}
<div className="mb-4">
  <label className="block text-sm font-bold mb-2">Select Country *</label>
  <select
    value={selectedCountry}
   

    onChange={(e) => {
      const val = e.target.value;
     
      setSelectedCountry(e.target.value)
        // setIsOtherCity(val === "other");
        validateCountry(val);
        setStateError(""); //  clear previous state error
        setCityError("");  //  clear previous city error
    
   
    }}

    className="border rounded w-full px-4 py-2 bg-[#0a101f] text-white"
  >
    <option value="">-- Select Country --</option>
    {countries.map((c) => (
      <option key={c.country_id} value={c.country_id}>
        {c.country_name}
      </option>
    ))}
  </select>
  {countryError && <p className="text-red-500 text-xs mt-1">{countryError}</p>}

</div>

{/* State Dropdown */}
{selectedCountry && (
  <div className="mb-4">
    <label className="block text-sm font-bold mb-2">Select State *</label>
    <select
      value={selectedState}
     
      onChange={(e) => {
        const val = e.target.value;
        setSelectedState(e.target.value)
      
        // setIsOtherCity(val === "other");
        validateState(val);
        setCityError("");
      }}
      className="border rounded w-full px-4 py-2 bg-[#0a101f] text-white"
    >
      <option value="">-- Select State --</option>
      {states.map((s) => (
        <option key={s.state_id} value={s.state_id}>
          {s.state_name}
        </option>
      ))}
    </select>
    {stateError && <p className="text-red-500 text-xs mt-1">{stateError}</p>}

  </div>
)}

{/* City Dropdown */}
{selectedState && (
  <div className="mb-4">
    <label className="block text-sm font-bold mb-2">Select City *</label>
    <select
      value={city}
      onChange={(e) => {
        const val = e.target.value;
        setCity(val);
        // setIsOtherCity(val === "other");
        validateCity(val);
      }}
      className="border rounded w-full px-4 py-2 bg-[#0a101f] text-white"
    >
      <option value="">-- Select City --</option>
      {cities.map((c) => (
        <option key={c.city_id} value={c.city_id}>
          {c.city_name}
        </option>
      ))}
      {/* <option value="other">Other</option> */}
    </select>
    {cityError && <p className="text-red-500 text-xs mt-1">{cityError}</p>}
  </div>
)}

{/* Enter new city field */}
{isOtherCity && (
  <div className="mb-4">
    <label className="block text-sm font-bold mb-2">Enter New City Name *</label>
    <input
      type="text"
      className="bg-transparent border rounded w-full py-2 px-3 text-white"
      value={customCity}
      onChange={(e) => setCustomCity(e.target.value)}
    />
   {customCityError && <p className="text-red-500 text-xs mt-1">{customCityError}</p>}


  </div>
)}

         
          
        </div>

        <div className="flex items-center justify-end">
          <div className="p-3">
            <button
              type="button"
              className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
              onClick={() => navigate("/system-management")}
            >
              Cancel
            </button>
          </div>
          <div>
            <button
              type="submit"
              className="font-bold px-4 py-2 hover:opacity-90 text-black rounded-lg transition duration-300"
              style={{ backgroundColor: "#76df23" }}
              
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateSI;
