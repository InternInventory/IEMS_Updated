import { faCheck, faChevronDown, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuthFetch from "../hooks/useAuthFetch";
const apiURL = import.meta.env.VITE_API_BASE_URL;
const ClientForm = () => {
  const { clientId } = useParams();
  const isEditMode = Boolean(clientId);
  const navigate = useNavigate();
  const authFetch = useAuthFetch();

  const [client, setClient] = useState({
    org_name: "",
    reg_number: "",
    client_type: "Direct",
    is_active: "Active",
    logo_url: "",
    contact_person_name: "",
    contact_person_mobile: "",
    contact_person_email: "",
    org_website: "",
    ho_address: "",
    country_id: "",
  });

  const [originalClient, setOriginalClient] = useState(null);
  const [countries, setCountries] = useState([]);
  const [logoPreview, setLogoPreview] = useState(null);
  const [popup, setPopup] = useState({ message: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [registrationNumberError, setRegistrationNumberError] = useState("");
  const [clientNameError, setClientNameError] = useState("");

  // Validation state
  const [errors, setErrors] = useState({});
  const [countryCode, setCountryCode] = useState("");

  // Validation functions
  const validateEmailFormat = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return regex.test(email);
  };

  const partialDomainRegex = /^[\w\-.:/]*$/i;
  const fullDomainRegex =
    /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-./?%&=]*)?$/i;

  const isNonEmptyText = (val) => val.trim().length > 0 && val.trim() !== "";

  const validateContactNumber = (phone) => {
    if (!phone || !countryCode) return false;
    const userPart = phone.slice(countryCode.length);
    return userPart.length === 10;
  };

  const validateContactEmail = (email) => {
    if (!email.trim()) return false;
    return validateEmailFormat(email);
  };

  const validateClientDomain = (domain) => {
    if (!domain) return true; // Optional field
    if (!partialDomainRegex.test(domain)) return false;
    if (domain.length > 3 && !fullDomainRegex.test(domain)) return false;
    return true;
  };

  const validateHoAddress = (address) => {
    const trimmed = address.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 255) return false;
    const validAddressRegex = /^[a-zA-Z0-9\s,.\-/#()]+$/;
    return validAddressRegex.test(trimmed);
  };

  const checkClientName = async (name) => {
    // if (!name.trim()) return;
    // try {
    //   const res = await fetch(
    //     `${
    //       import.meta.env.VITE_API_BASE_URL
    //     }/client/check-name?name=${encodeURIComponent(name)}`
    //   );
    //   const data = await res.json();
    //   if (data.exists) {
    //     setErrors((prev) => ({
    //       ...prev,
    //       org_name: "Client name already exists.",
    //     }));
    //   } else {
    //     setErrors((prev) => ({ ...prev, org_name: null }));
    //   }
    // } catch (err) {
    //   console.error("Error checking client name:", err);
    //   setErrors((prev) => ({
    //     ...prev,
    //     org_name: "Error validating client name.",
    //   }));
    // }
    if (!isNonEmptyText(name) || name.trim() === "") {
      setClientNameError("Client name cannot be blank.");
      return;
    }
    try {
      // const response = await axios.get(`${apiURL}/check-name`, {
      //   params: { name },
      //   headers: {
      //     Authorization: `${localStorage.getItem("token") || sessionStorage.getItem("token")
      //       }`,
      //   },
      // });
      const response = await authFetch({
        url: `${apiURL}/check-name?name=${encodeURIComponent(name)}`,
        method: "GET",
      });

      if (
        response.data.exists &&
        (!isEditMode || name.trim() !== client.org_name)
      ) {
        setClientNameError("Client name already exists.");
      } else {
        setClientNameError("");
      }
    } catch (error) {
      console.error("Error checking client name:", error);
      setClientNameError("Client name cannot be blank..");
    }
  };

  const checkRegistrationNumber = async (regNumber) => {
   

    try {
      // const response = await axios.get(`${apiURL}/check-registration`, {
      //   params: { reg_number: regNumber },
      //   headers: {
      //     Authorization: `${
      //       localStorage.getItem("token") || sessionStorage.getItem("token")
      //     }`,
      //   },
      // });
      const response = await authFetch({
        url: `${apiURL}/check-registration?reg_number=${encodeURIComponent(
          regNumber
        )}`,
        method: "GET",
      });

      if (
        response.data.exists &&
        (!isEditMode || regNumber !== client.reg_number)
      ) {
        setRegistrationNumberError("Registration number already exists.");
      } else {
        setRegistrationNumberError("");
      }
    } catch (error) {
      console.error("Error checking registration number:", error);
      setRegistrationNumberError("Error validating registration number.");
    }
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/countries`,
          {
            headers: {
              Authorization: `${localStorage.getItem("token") || sessionStorage.getItem("token")
                }`,
            },
          }
        );
        // const response = await authFetch({
        //   url: `${apiURL}/countries`,
        //   method: "GET",
        // });
        const data = await res.json();
        setCountries(data);
        if (isEditMode) {
          fetchClient(data); // pass country list
        }
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };

   
    const fetchClient = async (countryList) => {
      try {
        // const res = await fetch(
        //   `${import.meta.env.VITE_API_BASE_URL}/client/${clientId}`,
        //   {
        //     headers: {
        //       Authorization: `${localStorage.getItem("token") || sessionStorage.getItem("token")
        //         }`,
        //     },
        //   }
        // );
        // const data = await res.json();
        const response = await authFetch({
          url: `${apiURL}/client/${clientId}`,
          method: "GET",
        });
        setClient(response.data);
        setOriginalClient(response.data);

        if (response.data.country_id) {
          const country = countryList.find(
            (c) => c.country_id === parseInt(response.data.country_id)
          );
          if (country) {
            setCountryCode(country.country_code.toString());
          }
        }
      } catch (err) {
        console.error("Error fetching client:", err);
      }
    };
    fetchCountries();
    //fetchClient();
  }, [clientId]);

  useEffect(() => {
    if (popup.message) {
      const timer = setTimeout(() => {
        setPopup({ message: "", type: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [popup.message]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    switch (name) {
      case "org_name":
        if (!isNonEmptyText(value) || value.trim() === "") {
          setErrors((prev) => ({
            ...prev,
            org_name: "Client name cannot be blank.",
          }));
        } else {
          setErrors((prev) => ({ ...prev, org_name: null }));
        }
        break;

      case "contact_person_name":
        if (!isNonEmptyText(value)) {
          setErrors((prev) => ({
            ...prev,
            contact_person_name: "Contact person name cannot be blank.",
          }));
        } else {
          setErrors((prev) => ({ ...prev, contact_person_name: null }));
        }
        break;

      case "reg_number":
        if (!isNonEmptyText(value)) {
          setErrors((prev) => ({
            ...prev,
            reg_number: "Registration number cannot be blank.",
          }));
        } else {
          setErrors((prev) => ({ ...prev, reg_number: null }));
        }
        break;

      case "contact_person_email":
        if (!value.trim()) {
          setErrors((prev) => ({
            ...prev,
            contact_person_email: "Email is required.",
          }));
        } else if (!validateEmailFormat(value)) {
          setErrors((prev) => ({
            ...prev,
            contact_person_email: "Please enter a valid email address.",
          }));
        } else {
          setErrors((prev) => ({ ...prev, contact_person_email: null }));
        }
        break;

      case "org_website":
        if (value && !partialDomainRegex.test(value)) {
          setErrors((prev) => ({
            ...prev,
            org_website: "Invalid characters detected.",
          }));
        } else if (value && value.length > 3 && !fullDomainRegex.test(value)) {
          setErrors((prev) => ({
            ...prev,
            org_website: "Please enter a valid website URL.",
          }));
        } else {
          setErrors((prev) => ({ ...prev, org_website: null }));
        }
        break;

      case "ho_address":
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          setErrors((prev) => ({
            ...prev,
            ho_address: "HO Address cannot be blank.",
          }));
        } else if (value.length > 255) {
          setErrors((prev) => ({
            ...prev,
            ho_address: "HO Address cannot exceed 255 characters.",
          }));
        } else {
          const validAddressRegex = /^[a-zA-Z0-9\s,.\-/#()]+$/;
          if (!validAddressRegex.test(trimmed)) {
            setErrors((prev) => ({
              ...prev,
              ho_address: "HO Address contains invalid characters.",
            }));
          } else {
            setErrors((prev) => ({ ...prev, ho_address: null }));
          }
        }
        break;

      case "country_id":
       
        const selectedCountry = countries.find(
          (c) => c.country_id === parseInt(value)
        );
        if (selectedCountry) {
          const code = selectedCountry.country_code.toString();
          setCountryCode(code);

          // Set the initial mobile number to just the country code
          setClient((prev) => ({
            ...prev,
            country_id: value,
            contact_person_mobile: code,
          }));
        } else {
          setCountryCode("");
          setClient((prev) => ({
            ...prev,
            country_id: "",
            contact_person_mobile: "",
          }));
        }
        break;

      case "contact_person_mobile":
        let input = value;

        // If no country selected yet, block input
        if (!countryCode) return;

        // Prevent user from deleting or altering the country code
        if (!input.startsWith(countryCode)) {
          input = countryCode;
        }

        const rawUserPart = input.slice(countryCode.length).replace(/\D/g, "");

        const limitedUserPart = rawUserPart.slice(0, 10);
        const finalNumber = countryCode + limitedUserPart;

        setClient((prev) => ({ ...prev, contact_person_mobile: finalNumber }));

        if (limitedUserPart.length === 10) {
          setErrors((prev) => ({ ...prev, contact_person_mobile: null }));
        } else if (limitedUserPart.length > 0) {
          setErrors((prev) => ({
            ...prev,
            contact_person_mobile: "Contact number must be exactly 10 digits.",
          }));
        }
        return;

      
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    // Backend validations on blur
    if (name === "org_name" && !isEditMode && isNonEmptyText(value)) {
      checkClientName(value);
    }

    if (name === "reg_number" && isNonEmptyText(value)) {
      checkRegistrationNumber(value);
    }

    // if (name === "contact_person_mobile") {
    //   const userPart = value.slice(countryCode.length);
    //   if (userPart.length !== 10 && userPart.length > 0) {
    //     setErrors((prev) => ({
    //       ...prev,
    //       contact_person_mobile: "Contact number must be exactly 10 digits.",
    //     }));
    //   }
    // }

    if (name === "contact_person_mobile") {
      const userPart = value.startsWith(countryCode)
        ? value.slice(countryCode.length)
        : value;

      if (userPart.length !== 10 && userPart.length > 0) {
        setErrors((prev) => ({
          ...prev,
          contact_person_mobile: "Contact number must be exactly 10 digits.",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          contact_person_mobile: null,
        }));
      }
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setClient((prev) => ({ ...prev, logo_file: file }));
    }
  };

  const handleFileInputClick = () => {
    document.getElementById("client-logo").click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await checkRegistrationNumber(client.reg_number);
    await checkClientName(client.org_name);
    // Validate all fields
    const validationErrors = {};

    if (!isNonEmptyText(client.org_name) || client.org_name.trim() === "") {
      validationErrors.org_name = "Client name cannot be blank.";
    }

    if (!isNonEmptyText(client.contact_person_name)) {
      validationErrors.contact_person_name =
        "Contact person name cannot be blank.";
    }

    if (!isNonEmptyText(client.reg_number)) {
      validationErrors.reg_number = "Registration number cannot be blank.";
    }

    if (!validateContactEmail(client.contact_person_email)) {
      validationErrors.contact_person_email =
        "Please enter a valid email address.";
    }

    // if (!validateContactNumber(client.contact_person_mobile)) {
    //   validationErrors.contact_person_mobile =
    //     "Contact number must be exactly 10 digits.";
    // }

    // Extract user part after country code
    const userPart = client.contact_person_mobile.startsWith(countryCode)
      ? client.contact_person_mobile.slice(countryCode.length)
      : client.contact_person_mobile;

    // Validate user part length
    if (userPart.length !== 10) {
      validationErrors.contact_person_mobile =
        "Contact number must be exactly 10 digits.";
    }

    if (!validateClientDomain(client.org_website)) {
      validationErrors.org_website = "Please enter a valid website URL.";
    }

    if (!validateHoAddress(client.ho_address)) {
      validationErrors.ho_address = "HO Address is required and must be valid.";
    }

    if (!client.country_id) {
      validationErrors.country_id = "Please select a country.";
    }

    // Check for existing validation errors
    const hasExistingErrors = Object.values(errors).some(
      (error) => error !== null && error !== undefined
    );

    if (Object.keys(validationErrors).length > 0 || hasExistingErrors) {
      setErrors((prev) => ({ ...prev, ...validationErrors }));
      setPopup({
        message: "Please fix all validation errors before submitting.",
        type: "error",
      });
      return;
    }

    const userId = localStorage.getItem("userId");
    const payload = {
      ...client,
      updated_by: userId,
      is_active: client.is_active === "Active" || client.is_active === true,
    };

    const url = isEditMode
      ? `${apiURL}/client/${clientId}`
      : `${apiURL}/client`;
    //const url = isEditMode ? `/client/${clientId}` : `/client`;
    const method = isEditMode ? "PUT" : "POST";
    // const token =
    //   localStorage.getItem("token") || sessionStorage.getItem("token");
    //console.log("logo_file", client.logo_file);
    const formData = new FormData();
    formData.append("logo", client.logo_file); // actual File object from <input type="file" />
    formData.append("client_type", client.client_type);
    formData.append("org_name", client.org_name);
    formData.append("reg_number", client.reg_number);
    formData.append("contact_person_email", client.contact_person_email);
    formData.append("contact_person_mobile", client.contact_person_mobile);
    formData.append("contact_person_name", client.contact_person_name);
    formData.append("country_id", client.country_id);
    formData.append("ho_address", client.ho_address);
    formData.append("org_website", client.org_website);
    formData.append(
      "is_active",
      client.is_active === "Active" || client.is_active === true
    );
    console.log("Submitting client data:", formData);
    try {
      // const res = await fetch(url, {
      //   method,
      //   headers: { Authorization: token },
      //   body: formData,
      // });
      const res = await authFetch({
        url,
        method,
        data: formData,
        headers:{
          "Content-Type": "multipart/form-data",
        }
      });

      // if (!res.ok) {
      //   const text = await res.text();
      //   const errData = text ? JSON.parse(text) : {};
      //   throw new Error(errData.message || "Failed to save client");
      // }

      setPopupMessage(
        isEditMode
          ? "Client updated successfully!"
          : "Client created successfully!"
      );
      setShowPopup(true);
      setTimeout(() => navigate("/client"), 2000);
    } catch (err) {
      console.error("Error saving client:", err);
      setPopup({ message: err.message, type: "error" });
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
            <div className="bg-green-500 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6">
              <FontAwesomeIcon icon={faCheck} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">{popupMessage}</h2>
            <p className="text-base text-slate-400">
              {popupMessage.includes("successfully") ? "Redirecting..." : ""}
            </p>
          </div>
        </div>
      )}

      {/* Error/Success Popup */}
      {popup.message && (
        <div
          className={`fixed bottom-5 right-5 p-4 rounded shadow-lg text-white z-50 ${
            popup.type === "success"
              ? "bg-green-600"
              : popup.type === "error"
              ? "bg-red-600"
              : "bg-gray-600"
          }`}
        >
          {popup.message}
        </div>
      )}

      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>{isEditMode ? "Edit Client" : "Create Client"}</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="client-logo"
            >
              Client Logo
            </label>
            <input
              type="file"
              id="client-logo"
              name="clientLogo"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={handleFileInputClick}
              className="h-[150px] w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent border rounded shadow flex flex-col items-center justify-center"
            >
              {logoPreview || client.logo_url ? (
                <img
                  src={logoPreview || client.logo_url}
                  alt="Client Logo"
                  className="object-contain h-full"
                />
              ) : (
                <>
                  <FontAwesomeIcon icon={faUpload} size="2x" />
                  <span className="mt-2">Upload Logo</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="client-name"
            >
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="client-name"
              name="org_name"
              value={client.org_name}
              onChange={handleInputChange}
              readOnly={isEditMode}
              onBlur={() => checkClientName(client.org_name)}
              className={`appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${
                isEditMode
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed border-gray-400"
                  : "bg-transparent text-gray-700 border-gray-300"
              } ${clientNameError ? "border-red-500" : ""}`}

              //clientNameError ? "border-red-500" : "border-gray-300"

              // className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {clientNameError && (
              <p className="text-red-500 text-xs mt-1">{clientNameError}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="client-type"
            >
              Client Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="client-type"
                name="client_type"
                value={client.client_type}
                onChange={handleInputChange}
                className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="Direct">Direct</option>
                <option value="Indirect">Indirect</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-gray-700"
                />
              </div>
            </div>
          </div>
          {isEditMode && (
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2"
                htmlFor="client-status"
              >
                Status <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="client-status"
                  name="is_active"
                  value={client.is_active}
                  onChange={handleInputChange}
                  className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="text-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="registration-number"
            >
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="registration-number"
              name="reg_number"
              value={client.reg_number}
              onChange={handleInputChange}
              //onBlur={handleBlur}
              readOnly={isEditMode}
              onBlur={() => checkRegistrationNumber(client.reg_number)}
              className={`appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline ${
                isEditMode
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed border-gray-400"
                  : "bg-transparent text-gray-700 border-gray-300"
              } ${registrationNumberError ? "border-red-500" : ""}`}
              //className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {registrationNumberError && (
              <p className="text-red-500 text-xs mt-1">
                {registrationNumberError}
              </p>
            )}
          </div>

          {/* <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="client-status"
            >
              Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="client-status"
                name="is_active"
                value={client.is_active}
                onChange={handleInputChange}
                className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-gray-700"
                />
              </div>
            </div>
          </div> */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="country">
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="country"
                name="country_id"
                value={client.country_id}
                onChange={handleInputChange}
                className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
            {errors.country_id && (
              <p className="text-red-500 text-xs mt-1">{errors.country_id}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="contact-name"
            >
              Contact Person Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="contact-name"
              name="contact_person_name"
              value={client.contact_person_name}
              onChange={handleInputChange}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.contact_person_name && (
              <p className="text-red-500 text-xs mt-1">
                {errors.contact_person_name}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="contact-email"
            >
              Contact Person Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="contact-email"
              name="contact_person_email"
              value={client.contact_person_email}
              onChange={handleInputChange}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.contact_person_email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.contact_person_email}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="contact-number"
            >
              Contact Person Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="contact-number"
              name="contact_person_mobile"
              value={client.contact_person_mobile}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={
                !countryCode && !isEditMode ? "Select country first" : ""
              }
              disabled={!isEditMode && !countryCode} // ✅ Disable if no country selected
              onKeyDown={(e) => {
                if (
                  client.contact_person_mobile.startsWith(countryCode) &&
                  e.target.selectionStart <= countryCode.length &&
                  ["Backspace", "Delete"].includes(e.key)
                ) {
                  e.preventDefault();
                }
              }}
              // className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
              className={`bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-400 ${
                !isEditMode && !countryCode
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-transparent text-white-700"
              }`}
            />
            {errors.contact_person_mobile && (
              <p className="text-red-500 text-xs mt-1">
                {errors.contact_person_mobile}
              </p>
            )}
          </div>

          {/* <div className="mb-4">
            <label className="block text-sm font-bold mb-2" htmlFor="country">
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="country"
                name="country_id"
                value={client.country_id}
                onChange={handleInputChange}
                className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
            {errors.country_id && (
              <p className="text-red-500 text-xs mt-1">{errors.country_id}</p>
            )}
          </div> */}

          <div className="mb-4">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="client-domain"
            >
              Client Domain
            </label>
            <input
              type="text"
              id="client-domain"
              name="org_website"
              value={client.org_website}
              onChange={handleInputChange}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {errors.org_website && (
              <p className="text-red-500 text-xs mt-1">{errors.org_website}</p>
            )}
          </div>

          <div className="mb-4 col-span-2">
            <label
              className="block text-sm font-bold mb-2"
              htmlFor="ho-address"
            >
              HO Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ho-address"
              name="ho_address"
              value={client.ho_address}
              onChange={handleInputChange}
              maxLength={255}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-white-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.ho_address ? (
                <p className="text-red-500 text-xs">{errors.ho_address}</p>
              ) : (
                <span className="text-gray-400 text-xs">
                  Characters: {client.ho_address.length} / 255
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <div className="p-3">
            <button
              type="button"
              className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
              onClick={() => navigate("/client")}
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
              {isEditMode ? "Save Changes" : "Create Client"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
