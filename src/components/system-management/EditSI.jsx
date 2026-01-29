import { faChevronDown, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";


const EditSI = () => {
  const { siId } = useParams();
  const navigate = useNavigate();

  const [si, setSi] = useState({
    siName: "",
    status: "Inactive",
    logoUrl: "",
    country_id: "", // only if used
  });


  const authFetch = useAuthFetch();
  const [logoPreview, setLogoPreview] = useState(null);
  const [originalSI, setOriginalSI] = useState(null);
  const [countries, setCountries] = useState([]);
  const [errors, setErrors] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  // Popup state
  const [popup, setPopup] = useState({ message: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [stateError, setStateError] = useState("");
  const [customCityError, setCustomCityError] = useState("");
  const [cityError, setCityError] = useState("");
  useEffect(() => {
    // Fetch the client details based on clientId
    const fetchSI = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const res = await authFetch({
          url: `${apiURL}/si/${siId}`,
          method: "GET"
        });
        const data = res.data;

        // Map the API response to your local state format
        const mappedSI = {
          siName: data.siName || data.si_name,
          status: data.status === true || data.status === "Active" ? "Active" : "Inactive",
          logoUrl: data.logoUrl || data.logo_url,
          country_id: data.country_id,
          state_id: String(data.state_id),
          city_id: String(data.city_id)
        };

        setSi(mappedSI);
        setOriginalSI(mappedSI);
      } catch (error) {
        console.error("Error fetching si:", error);
      }
    };

    // Fetch list of countries from backend
    const fetchCountries = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/countries`
        );
        const data = await res.json();
        setCountries(data); // *** set countries list [{country_id, country_name}, ...]
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };

    fetchSI();
    fetchCountries();
  }, [siId]);


  useEffect(() => {
    if (si.country_id) {
      const fetchStates = async () => {
        try {

          const apiURL = import.meta.env.VITE_API_BASE_URL;
          const res = await authFetch({
            url: `${apiURL}/states/by-country/${si.country_id}`,
            method: "GET"
          });



          const data = res.data;
          setStates(data);

          // Only reset if state_id is not in SI
          if (!si.state_id) {
            setSi((prev) => ({ ...prev, state_id: "", city_id: "" }));
          }

          setCities([]); // Clear city list
        } catch (error) {
          console.error("Error fetching states:", error);
        }
      };
      fetchStates();
    }
  }, [si.country_id]);

  useEffect(() => {
    if (si.state_id) {
      const fetchCities = async () => {
        try {


          const apiURL = import.meta.env.VITE_API_BASE_URL;
          const res = await authFetch({
            url: `${apiURL}/cities/by-state/${si.state_id}`,
            method: "GET"
          });


          const data = await res.data;
          setCities(data);

          // Only reset city_id if not already present
          if (!si.city_id) {
            setSi((prev) => ({ ...prev, city_id: "" }));
          }
        } catch (error) {
          console.error("Error fetching cities:", error);
        }
      };
      fetchCities();
    }
  }, [si.state_id]);


  // Auto-hide popup after 3 seconds
  useEffect(() => {
    if (popup.message) {
      const timer = setTimeout(() => {
        setPopup({ message: "", type: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [popup.message]);

  // Compare if any field changed
  const isSIChanged = () => {
    if (!originalSI) return false;

    const keysToCheck = [
      "siName",

      "status",
      "logoUrl",

      "country_id",
    ];

    return keysToCheck.some(
      (key) =>
        (si[key] ?? "").toString().trim() !==
        (originalSI[key] ?? "").toString().trim()
    );
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
  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    // Update local state
    setSi((prevSI) => ({
      ...prevSI,
      [name === "si_name" ? "siName" : name]: value,
    }));

    // Only validate SI name on blur/change
    if (name === "si_name") {
      if (value.trim() === "") return;

      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const res = await authFetch({
          url: `${apiURL}/check-name-si?si_name=${encodeURIComponent(value)}`,
          method: "GET"
        });
        const data = res.data;

        if (data.exists) {
          setErrors((prev) => ({
            ...prev,
            si_name: "SI name already exists."
          }));
          setPopup({ message: "SI name already exists.", type: "error" });
        } else {
          setErrors((prev) => ({ ...prev, si_name: null }));
        }






      } catch (err) {
        console.error("Error checking si name:", err);
      }
    }
  };

  const handleFileInputChange = (e) => {
    // setClient({
    //   ...client,
    //   clientLogo: e.target.files[0],
    // });
    const file = e.target.files[0];
    if (file) {
      // Create preview URL for the selected file
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);

      // Save the file object to client state (for upload)
      setSi((prevSI) => ({
        ...prevSI,
        logo_file: file, // store file separately
      }));
    }
  };

  const handleFileInputClick = () => {
    document.getElementById("si-logo").click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for unchanged data
    const isChanged = Object.keys(si).some(
      (key) => si[key] !== originalSI[key]
    );
    if (!isChanged) {
      //alert("No changes made.");
      //setPopup({ message: "No changes made.", type: "info" });
      setPopupMessage("No changes made.");
      setShowPopup(true);
      return;
    }

    if (errors.si_name) {
      setPopup({
        message: "Please fix validation errors before submitting.",
        type: "error",
      });
      return;
    }
    let isValid = true;
    setStateError("");
    setCityError("");
    setCustomCityError("");
    console.log("SI Values on Submit:", si);
    if (!si.country_id) {
      setCountryError("Please select a country");
      isValid = false;
    }

    if (!states.length) {
      setStateError("No states exist for the selected country");
      isValid = false;
    } else if (!si.state_id) {
      setStateError("Please select a state");
      isValid = false;
    }


    if (!cities.length) {
      setCityError("No cities exist for the selected state");
      isValid = false;
    } else if (!si.city_id) {
      setCityError("Please select a city");
      isValid = false;
    } else if (city === "other" && !customCity.trim()) {
      setCustomCityError("Please enter a new city name");
      isValid = false;
    }
    if (!isValid) {
      setPopup({
        message: "Please fill all required fields.",
        type: "error",
      });
      return;
    }






    const payload = {
      si_name: si.siName,
      is_active: si.status === "Active" || si.is_active === true,
      logo_url: si.logoUrl,


      country_id: si.country_id,
      state_id: si.state_id,
      city_id: si.city_id,
    };

    const formData = new FormData();
    if (logoFile) {
      formData.append("logo", logoFile);
    }
    formData.append("si_name", si.siName);
    formData.append("is_active", si.status === "Active" || si.is_active === true);
    // formData.append("logo", si.logoUrl);
    formData.append("country_id", si.country_id);
    formData.append("state_id", si.state_id);
    formData.append("city_id", si.city_id);

    console.log("Payload sent for update:", payload);
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiURL}/si/${siId}`,
        method: "PUT",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.status !== 200) {
        throw new Error(res.data?.message || "Update failed");
      }
      //setPopup({ message: "Client updated successfully!", type: "success" });

      // alert("Client updated successfully!");
      //navigate("/client");
      setPopupMessage("SI updated successfully!");
      setShowPopup(true);
      setTimeout(() => {
        navigate("/system-management");
      }, 2000); // Navigate after popup shows
    } catch (err) {
      console.error("Update failed:", err);
      setPopup({ message: err.message, type: "error" });
    }
  };

  return (
    <div className="flex flex-col items-start justify-start pt-4 pl-1 2xl:gap-2 2xl:pt-6">
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>Edit SI</h1>
      </div>

      {/* Popup Toast */}
      {popup.message && (
        <div
          className={`fixed bottom-5 right-5 p-4 rounded shadow-lg text-white z-50 ${popup.type === "success"
            ? "bg-green-600"
            : popup.type === "error"
              ? "bg-red-600"
              : "bg-gray-600"
            } flex items-center space-x-4`}
        >

          <span>{popup.message}</span>
          <button
            className="font-bold ml-4"
            onClick={() => setPopup({ message: "", type: "" })}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}
      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="si-logo"
            >
              SI Logo
            </label>
            <input
              type="file"
              id="si-logo"
              accept="image/*"
              name="logo_url"
              className="hidden"
              // value={client.logo_url}

              onChange={(e) => {
                handleFileInputChange(e);
                const file = e.target.files[0];
                setLogoFile(file);
              }
              }
            />

            <div
              className="relative w-full h-[180px] border border-gray-400 rounded flex items-center justify-center cursor-pointer group overflow-hidden"
              onClick={handleFileInputClick}
              title="Upload Logo"
            >
              {logoPreview || si.logo_url ? (
                <img
                  src={logoPreview || si.logo_url}
                  alt="SI Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-700">
                  <FontAwesomeIcon icon={faUpload} size="2x" />
                  <span className="mt-2">Upload Logo</span>
                </div>
              )}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black text-white text-xs rounded px-2 py-1 z-10">
                Upload Logo
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="si-name"
            >
              SI Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="si-name"
              name="si_name"
              value={si.siName}
              onChange={handleInputChange}
              readOnly
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-gray-500 text-xs mt-1">SI Name cannot be edited.</p>
            {errors.si_name && (
              <p className="text-red-500 text-sm mt-1">{errors.si_name}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="si-status"
            >
              Status
            </label>
            <div className="relative">
              <select
                id="si-status"
                name="status"
                value={si.status}
                onChange={handleInputChange}
                className=" bg-[#0a101f] text-white shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline"
              // className="shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent"
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-gray-700"
                />
              </div>
            </div>
          </div>
          {/* Line 2 */}


          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="country"
            >
              Country
            </label>

            <div className="relative">
              {countries.length > 0 && (
                <select
                  id="country"
                  name="country_id"
                  value={si.country_id}
                  onChange={(e) => {
                    handleInputChange(e);
                    setStateError(""); // clear state error when changing country
                    setCityError("");
                    setSi((prev) => ({ ...prev, state_id: "", city_id: "" }));
                  }}
                  // className="shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent"
                  className=" bg-[#0a101f] text-white shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Select Country</option>
                  {countries.map((c) => (
                    <option key={c.country_id} value={String(c.country_id)}>
                      {c.country_name}
                    </option>
                  ))}
                </select>
              )}

              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-gray-700"
                />
              </div>
            </div>
          </div>


          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="state"
            >
              State
            </label>

            <div className="relative">

              <select
                id="state"
                name="state_id"
                value={si.state_id}
                onChange={(e) => {
                  handleInputChange(e);
                  setCityError("");       // clear any previous errors
                  setSi((prev) => ({ ...prev, city_id: "" }));  // reset city_id
                }}
                className=" bg-[#0a101f] text-white shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline"

              >
                <option value="">Select State</option>
                {states.length > 0 ? (
                  states.map((c) => (
                    <option key={c.state_id} value={String(c.state_id)}>
                      {c.state_name}
                    </option>
                  ))
                ) : (
                  <option disabled value="">
                    No states available for selected country
                  </option>
                )}

              </select>


              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-gray-700"
                />
              </div>

              {stateError && <p className="text-red-500 text-xs mt-1">{stateError}</p>}

            </div>
          </div>


          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="city"
            >
              City
            </label>

            <div className="relative">

              <select
                id="city"
                name="city_id"
                value={si.city_id}
                onChange={(e) => {
                  handleInputChange(e);
                  setCityError("");
                }}
                // className="shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent"
                className=" bg-[#0a101f] text-white shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Select City</option>
                {cities.length > 0 ? (
                  cities.map((c) => (
                    <option key={c.city_id} value={String(c.city_id)}>
                      {c.city_name}
                    </option>
                  ))
                ) : (
                  <option disabled value="">
                    No cities available for selected state
                  </option>
                )}
              </select>


              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-gray-700"
                />
              </div>
              {cityError && <p className="text-red-500 text-xs mt-1">{cityError}</p>}
            </div>
          </div>




          {/* Line 3 */}


          {/* <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="country"
            >
              Country
            </label>
 
            <div className="relative">
              <select
                id="country"
                name="country_id"
                value={si.country_id || ""} // *** controlled select input with fallback to ""
                onChange={handleInputChange}
                className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Select Country</option>
                {countries.map((c) => (
                  <option key={c.country_id} value={c.country_id}>
                    {c.country_name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-gray-700"
                />
              </div>
            </div>
          </div> */}
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
              className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90 transition duration-300"
              style={{ backgroundColor: "#76df23" }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center">
            <span
              className="absolute top-4 right-6 text-gray-400 text-2xl cursor-pointer"
              onClick={() => setShowPopup(false)}
            >
              ×
            </span>
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              ✅
            </div>
            <h2 className="text-2xl font-semibold mb-2">{popupMessage}</h2>
            <p className="text-base text-slate-400">
              {popupMessage === "SI updated successfully!"
                ? "Redirecting to SI list..."
                : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditSI;
