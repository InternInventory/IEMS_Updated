import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";
import { Eye, EyeOff } from "lucide-react"; // or use FontAwesome if preferred
import Select from "react-select";
import useAuthFetch from '../hooks/useAuthFetch';



const CreateUser = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState("");
  const [client, setClient] = useState([]);
  const [profileImage, setProfileImage] = useState(null);


  const [countries, setCountries] = useState([]);
  const [roles, setRoles] = useState([]);
  const [clients, setClients] = useState([]);

  const [usernameError, setUsernameError] = useState("");
  const [fnameError, setfnameError] = useState("");
  const [lnameError, setLnameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [countryError, setCountryError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [designationError, setDesignationError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [clientError, setClientError] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [entity, setEntity] = useState("");
  const [entityError, setEntityError] = useState("");
  const [entities, setEntities] = useState([]);
  const [systemIntegrator, setsystemIntegrator] = useState([]);
  const [systemIntegratorSelected, setsystemIntegratorSelected] = useState("");
  const [systemIntegratorError, setsystemIntegratorError] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locationError, setLocationError] = useState("");

  const systemIntegratorOption = systemIntegrator.map((c) => ({
    value: c.siId,
    label: c.siName,
  }));

  const clientOptions = clients.map((c) => ({
    value: c.clientId,
    label: c.clientName,
  }));

  const entityOptions = entities.map((e) => ({
    value: e.entity_id,
    label: e.entity_name,
  }));
  const updatedEntityOptions = [{ label: 'SI', value: 1 }, ...entityOptions];
  const [entityId, setEntityId] = useState(null); // State to hold selected entity ID

  // Location options for engineers
  const locationOptions = locations.map((loc) => ({
    value: loc.loc_id,
    label: `${loc.loc_name} (${loc.org_name || 'N/A'})`,
    org_id: loc.org_id
  }));

  useEffect(() => {
    const fetchEntityId = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await authFetch({
          url: `${apiUrl}/userDetails`,
          method: 'GET'
        });
        console.log("User Details API Response:", response.data);

        const { entity_id } = response.data;
        console.log("Entity ID from API:", entity_id);

        setEntityId(entity_id);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchEntityId();
  }, []);


  const validateUsername = (value) => {
    if (!value.trim()) setUsernameError("Username is required");
    else setUsernameError("");
  };

  const validatefname = (value) => {
    if (!value.trim()) setfnameError("First name is required");
    else setfnameError("");
  };

  const validatelname = (value) => {
    if (!value.trim()) setLnameError("Last name is required");
    else setLnameError("");
  };
  const validateClient = (value) => {
    if ((!value || value.length === 0) && entityId != 0) {
      setClientError("Please select at least one client.");
    } else {
      setClientError("");
    }
  };

  const validateEntity = (value) => {
    if (!value || value.length === 0) {
      setEntityError("Please select at least one entity.");
    } else {
      setEntityError("");
    }
  };

  const validateSystemIntegrator = (value) => {
    if (!value || value.length === 0) {
      setsystemIntegratorError("Please select at least one SI.");
    } else {
      setsystemIntegratorError("");
    }
  };

  const validateLocations = (value) => {
    // Only validate if role is Engineer (role_id = 4)
    if (parseInt(role) === 4) {
      if (!value || value.length === 0) {
        setLocationError('At least one location is required for engineers');
      } else {
        setLocationError('');
      }
    } else {
      setLocationError('');
    }
  };

  const validateRole = (value) => {
    if (!value.trim()) setRoleError("Role is required");
    else setRoleError("");
  };
  const validateDesignation = (value) => {
    if (!value.trim()) setDesignationError("Designation is required");
    else setDesignationError("");
  };
  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!value.trim()) {
      setEmailError("Email is required");
      setEmailSuccess("");
    } else if (value !== value.toLowerCase()) {
      setEmailError("Email must be in lowercase");
      setEmailSuccess("");
    } else if (!emailRegex.test(value)) {
      setEmailError("Invalid email format");
      setEmailSuccess("");
    } else {
      setEmailError("");
      setEmailSuccess("Email is valid");
    }
  };

  const validateNewPassword = (value) => {
    if (!value.trim()) {
      setNewPasswordError("New password is required");
      setPasswordSuccess("");
    } else if (value.length < 8) {
      setNewPasswordError("Password must be at least 8 characters long");
      setPasswordSuccess("");
    } else {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
      if (!strongPasswordRegex.test(value)) {
        setNewPasswordError("Password must include uppercase, lowercase, number & special character");
        setPasswordSuccess("");
      } else {
        setNewPasswordError("");
        setPasswordSuccess("✓ Strong Password");
      }
    }

    const confirmPasswordValue = document.getElementById("confirmPassword")?.value.trim();
    if (confirmPasswordValue) {
      validateConfirmPassword(confirmPasswordValue);
    }
  };

  const validateConfirmPassword = (value) => {
    const newPasswordValue = document.getElementById("newPassword")?.value.trim();
    if (!value.trim()) {
      setConfirmPasswordError("Confirm password is required");
    } else if (value !== newPasswordValue) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const validateCountry = (value) => {
    if (!value.trim()) setCountryError("Country is required");
    else setCountryError("");
  };

  const validatePhone = (value) => {
    const numberPart = value.replace(countryCode, "").replace(/\D/g, "");
    if (!numberPart.trim()) setPhoneError("Phone is required");
    else if (numberPart.length !== 10) setPhoneError("Phone must be 10 digits");
    else setPhoneError("");
  };

  const checkPhoneExists = async (value) => {
    if (!value.trim()) return false;
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await authFetch({ url: `${apiUrl}/users`, method: "GET" });
      const data = response.data;
      const exists = data.some((user) => user.contact_no === value);
      if (exists) {
        setPhoneError("Phone number already exists");
      } else {
        // Only clear error if there's no validation error
        const numberPart = value.replace(countryCode, "").replace(/\D/g, "");
        if (numberPart.trim() && numberPart.length === 10) {
          setPhoneError("");
        }
      }
      return exists;
    } catch (err) {
      console.error("Error checking phone:", err);
      return false;
    }
  };

  // const checkUsernameExists = async (value) => {
  //   if (!value.trim()) return;
  //   try {
  //     const apiUrl = import.meta.env.VITE_API_BASE_URL;
  //     const response = await authFetch({url:`${apiUrl}/users`,method:"GET"});
  //     const data = await response.json();
  //     const exists = data.some((user) => user.username === value);
  //     if (exists) {
  //       setUsernameError("Username already exists");
  //     }
  //   } catch (err) {
  //     console.error("Error checking username:", err);
  //   }
  // };

  const checkUsernameExists = async (value) => {
    if (!value.trim()) {
      setUsernameError("Username is required");
      return false;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await authFetch({ url: `${apiUrl}/users`, method: "GET" });
      const data = response.data;
      const exists = data.some((user) => user.username === value);

      if (exists) {
        setUsernameError("Username already exists");
      } else {
        setUsernameError("");
      }

      return exists;
    } catch (err) {
      console.error("Error checking username:", err);
      return false;
    }
  };



  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const promises = [
          authFetch({ url: `${apiUrl}/user-clients`, method: "GET" }),
          authFetch({ url: `${apiUrl}/entities`, method: "GET" }),
          authFetch({ url: `${apiUrl}/roles`, method: "GET" }),
          authFetch({ url: `${apiUrl}/countries1`, method: "GET" }),
          authFetch({ url: `${apiUrl}/locations`, method: "GET" })
        ];

        if (entityId === 0) {
          promises.push(authFetch({ url: `${apiUrl}/si`, method: "GET" }));
        }

        const results = await Promise.all(promises);

        let orgRes, entityRes, rolesRes, systemIntegratorRes = null, countriesRes, locationsRes;

        if (entityId === 0) {
          [orgRes, entityRes, rolesRes, systemIntegratorRes, countriesRes, locationsRes] = results;
        } else {
          [orgRes, entityRes, rolesRes, countriesRes, locationsRes] = results;
        }

        const orgData = orgRes.data;
        const entityData = entityRes.data;
        const roleData = rolesRes.data;
        const countryData = countriesRes.data;
        const systemIntegratorData = systemIntegratorRes ? systemIntegratorRes.data : [];
        const locationsData = locationsRes.data;

        setClients(orgData);
        setEntities(entityData);
        setRoles(roleData);
        setCountries(countryData);
        setsystemIntegrator(systemIntegratorData);
        setLocations(locationsData);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    fetchData();
  }, []);

  const handleFileInputClick = () => document.getElementById("user-image").click();
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setProfileImage(file);
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    validateUsername(username);
    validatefname(fname);
    validatelname(lname);
    validateEmail(email);
    validateNewPassword(newPassword);
    validateConfirmPassword(confirmPassword);
    validateCountry(selectedCountry);
    validatePhone(phone);
    if (phone.trim()) {
      await checkPhoneExists(phone);
    }
    validateRole(role);
    if (parseInt(entityId) !== 0) {
      validateClient(client);
    }
    if (parseInt(entityId) === 0) {
      validateEntity(entity);
    }
    validateDesignation(designation);
    validateSystemIntegrator(systemIntegratorSelected);
    validateLocations(selectedLocations);

    if (
      usernameError || fnameError || lnameError || emailError || newPasswordError ||
      confirmPasswordError || countryError || phoneError || designationError || roleError || clientError || entityError || locationError
    ) {
      console.log("Validation Errors:");
      console.log({ usernameError, fnameError, lnameError, emailError, newPasswordError, confirmPasswordError, countryError, phoneError, designationError, roleError, clientError, entityError, locationError });
      return;
    }

    // Special validation for engineers
    if (parseInt(role) === 4) {
      if (!selectedLocations || selectedLocations.length === 0) {
        setLocationError('Engineers must be assigned to at least one location');
        return;
      }
    }

    if (
      !username || !fname || !lname || !email || !newPassword || !confirmPassword ||
      !selectedCountry || !phone || !role || !designation || (entityId === 0 && !entity)
    ) {
      console.log("Missing Fields:");
      console.log({ username, fname, lname, email, newPassword, confirmPassword, selectedCountry, phone, role, client, designation, entity });
      return;
    }

    // Additional validation for non-engineer roles
    if (parseInt(role) !== 4 && (!client || client.length === 0)) {
      setClientError('Client selection is required for non-engineer roles');
      return;
    }


    // Format org_id based on role
    let orgIdData;
    if (parseInt(role) === 4) {
      // Engineer role - format as array of {org_id, loc_id} objects
      orgIdData = selectedLocations.map((locId) => {
        const location = locations.find(l => l.loc_id === parseInt(locId));
        return {
          org_id: location?.org_id || 1,
          loc_id: parseInt(locId)
        };
      });
    } else {
      // Non-engineer roles - use existing client array format
      orgIdData = client.map((id) => parseInt(id));
    }

    const payload = {
      username,
      fname,
      lname,
      email,
      password: newPassword,
      org_id: orgIdData,
      role_id: parseInt(role),
      contact_no: phone,
      country_id: parseInt(selectedCountry),
      designation,
      is_active: true,
      entity_id: parseInt(entity),
      si_id: parseInt(systemIntegratorSelected),
    };

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await authFetch({
        url: `${apiUrl}/createusers`,
        method: "POST",
        data: payload,
      });

      const result = res.data;

      if (res.status === 200 || res.status === 201) {
        setShowPopup(true);
        setTimeout(() => {
          navigate("/user");
        }, 2000);
      } else {
        alert(result.error || "Error creating user");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert(err?.response?.data?.error || "Something went wrong");
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
              ✅
            </div>
            <h2 className="text-2xl font-semibold mb-2">User Created Successfully</h2>
            <p className="text-base text-slate-400">Redirecting to user list...</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>Create User</h1>
      </div>

      <form className="w-full p-5" onSubmit={handleSubmit}>
        {/* Image Upload Section */}
        <div className="mb-6">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-bold mb-2">User Profile Image</label>
            <input
              type="file"
              id="user-image"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handleFileInputClick}
              className="h-[150px] w-full border rounded shadow flex flex-col justify-center items-center"
            >
              <FontAwesomeIcon icon={faUpload} size="2x" />
              <span className="mt-2">Upload Image</span>
            </button>
          </div>
        </div>

        {/* All other fields in 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (e.target.value.trim()) setUsernameError("");
              }}
              onBlur={(e) => {
                validateUsername(e.target.value);
                checkUsernameExists(e.target.value);
              }}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
            />
            {usernameError && <p className="text-red-500 text-sm">{usernameError}</p>}
          </div>

          {/* First Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">First Name *</label>
            <input
              type="text"
              value={fname}
              onChange={(e) => {
                setFname(e.target.value);
                if (e.target.value.trim()) setfnameError("");
              }}
              onBlur={(e) => validatefname(e.target.value)}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
            />
            {fnameError && <p className="text-red-500 text-sm">{fnameError}</p>}
          </div>

          {/* Last Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Last Name *</label>
            <input
              type="text"
              value={lname}
              onChange={(e) => {
                setLname(e.target.value);
                if (e.target.value.trim()) setLnameError("");
              }}
              onBlur={(e) => validatelname(e.target.value)}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
            />
            {lnameError && <p className="text-red-500 text-sm">{lnameError}</p>}
          </div>



          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value.trim()) setEmailError("");
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
            />
            {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
            {emailSuccess && !emailError && <p className="text-green-500 text-sm">{emailSuccess}</p>}
          </div>

          {/* New Password */}
          <div className="text-white relative">
            <label className="block text-start text-sm mb-2" htmlFor="newPassword">
              New Password *
            </label>
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
              placeholder="Enter a new password"
              onChange={(e) => {
                const value = e.target.value;
                setNewPassword(value);
                validateNewPassword(value);
              }}
              onBlur={(e) => validateNewPassword(e.target.value)}
            />
            {newPassword && (
              <span
                className="absolute right-3 top-10 text-gray-600 cursor-pointer select-none"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </span>
            )}
            {newPasswordError ? (
              <p className="text-red-500 text-sm mt-1">{newPasswordError}</p>
            ) : newPassword && (
              <p className="text-green-500 text-sm mt-1">{passwordSuccess}</p>
            )}
          </div>


          {/* Confirm Password */}
          <div className="text-white relative">
            <label className="block text-start text-sm mb-2" htmlFor="confirmPassword">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
              placeholder="Confirm your password"
              onChange={(e) => {
                const value = e.target.value;
                setConfirmPassword(value);
                validateConfirmPassword(value);
              }}
              onPaste={(e) => {
                e.preventDefault();
                alert("Pasting is disabled for Confirm Password.");
              }}
              onBlur={(e) => validateConfirmPassword(e.target.value)}
            />
            {confirmPassword && (
              <span
                className="absolute right-3 top-10 text-gray-600 cursor-pointer select-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </span>
            )}
            {confirmPasswordError ? (
              <p className="text-red-500 text-sm mt-1">{confirmPasswordError}</p>
            ) : confirmPassword && (
              <p className="text-green-500 text-sm mt-1">✓ Passwords Match</p>
            )}
          </div>


          {/* Country */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Country *</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCountry(val);
                const selected = countries.find((c) => String(c.country_id) === val);
                const code = selected?.country_code || "";
                setCountryCode(code);
                setPhone(code);
                if (val.trim()) setCountryError("");
              }}
              onBlur={(e) => validateCountry(e.target.value)}
              className="border rounded w-full px-4 py-2 border border-gray-600 bg-[#0a101f] hover:bg-[#1a253f] text-white cursor-pointer"
            >
              <option value="">-- Select Country --</option>
              {countries.map((c) => (
                <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
              ))}
            </select>
            {countryError && <p className="text-red-500 text-sm">{countryError}</p>}
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Phone *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const input = e.target.value;
                if (!input.startsWith(countryCode)) {
                  setPhone(countryCode);
                  return;
                }
                const digits = input.slice(countryCode.length).replace(/\D/g, "");
                if (digits.length <= 10) {
                  setPhone(countryCode + digits);
                }
                if (digits.trim()) setPhoneError("");
              }}
              onBlur={(e) => {
                validatePhone(e.target.value);
                if (e.target.value.trim()) {
                  checkPhoneExists(e.target.value);
                }
              }}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
            />
            {phoneError && <p className="text-red-500 text-sm">{phoneError}</p>}
          </div>

          {/* Designation */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              onBlur={(e) => validateDesignation(e.target.value)}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
            />
            {designationError && <p className="text-red-500 text-sm">{designationError}</p>}
          </div>

          {/* Role */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">User Role *</label>
            <select
              value={role}
              onChange={(e) => {
                const newRole = e.target.value;
                setRole(newRole);
                validateRole(newRole);
                // Clear location selection if changing from engineer role
                if (parseInt(newRole) !== 4) {
                  setSelectedLocations([]);
                  setLocationError('');
                }
              }}
              onBlur={(e) => validateRole(e.target.value)}
              className="border rounded w-full px-4 py-2 border border-gray-600 bg-[#0a101f] hover:bg-[#1a253f] text-white cursor-pointer"
            >
              <option value="">-- Select Role --</option>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
              ))}
            </select>
            {roleError && <p className="text-red-500 text-sm">{roleError}</p>}
          </div>

          {/* Location Selection for Engineers */}
          {parseInt(role) === 4 && (
            <div className="mb-4 w-full">
              <label className="block text-sm font-bold mb-2 text-white">Assigned Locations *</label>
              <Select
                isMulti
                options={locationOptions}
                value={locationOptions.filter((opt) => selectedLocations.includes(opt.value))}
                onChange={(selectedOptions) => {
                  const selectedValues = selectedOptions.map((opt) => opt.value);
                  setSelectedLocations(selectedValues);
                  validateLocations(selectedValues);
                }}
                onBlur={() => validateLocations(selectedLocations)}
                placeholder="Select locations for engineer..."
                className="text-black"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#0a101f',
                    borderColor: '#4b5563',
                    color: 'black',
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: '#76df23',
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: 'white',
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    color: 'white',
                    ':hover': {
                      backgroundColor: '#5bc01a',
                      color: 'white',
                    },
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'white',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: '#1a253f',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? '#2a354f' : '#1a253f',
                    color: 'white',
                  }),
                }}
              />
              {locationError && <p className="text-red-500 text-sm mt-1">{locationError}</p>}
              <p className="text-gray-400 text-xs mt-1">Engineers can be assigned to multiple locations</p>
            </div>
          )}

          {/* Client */}
          {entityId == 1 && parseInt(role) !== 4 && (<div className="mb-4 w-full">
            <label className="block text-sm font-bold mb-2 text-white">Client *</label>
            <Select
              isMulti
              options={clientOptions}
              value={clientOptions.filter((opt) => client.includes(opt.value))}
              onChange={(selectedOptions) => {
                const selectedValues = selectedOptions.map((opt) => opt.value);
                setClient(selectedValues);
                validateClient(selectedValues);
              }}
              onBlur={() => validateClient(client)}
              className="text-black"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#0a101f',
                  borderColor: '#4b5563',
                  color: 'black',
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: 'black',
                }),
                input: (base) => ({
                  ...base,
                  color: 'white',
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#1a253f',
                  color: 'black',
                }),
              }}
            />
            {clientError && <p className="text-red-500 text-sm mt-1">{clientError}</p>}
          </div>
          )}

          {entityId == 0 && (

            <div className="mb-4 w-full">
              <label className="block text-sm font-bold mb-2 text-white">Entity *</label>
              <Select

                options={updatedEntityOptions}
                value={updatedEntityOptions.find((opt) => opt.value === entity)}
                onChange={(selectedOptions) => {
                  // const selectedValues = selectedOptions.map((opt) => opt.value);
                  setEntity(selectedOptions.value);
                  validateEntity(selectedOptions.value);
                }}
                onBlur={() => validateEntity(entity)}
                className="text-black"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#0a101f',
                    borderColor: '#4b5563',
                    color: 'black',
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: 'black',
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'white',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: '#1a253f',
                    color: 'black',
                  }),
                }}
              />
              {entityError && <p className="text-red-500 text-sm mt-1">{entityError}</p>}
            </div>
          )}

          {entityId == 0 && entity == 1 && (

            <div className="mb-4 w-full">
              <label className="block text-sm font-bold mb-2 text-white">System Integrator *</label>
              <Select

                options={systemIntegratorOption}
                value={systemIntegratorOption.find((opt) => opt.value === systemIntegratorSelected)}
                onChange={(selectedOptions) => {
                  // const selectedValues = selectedOptions.map((opt) => opt.value);
                  setsystemIntegratorSelected(selectedOptions.value);
                  validateSystemIntegrator(selectedOptions.value);
                }}
                onBlur={() => validateSystemIntegrator(systemIntegratorSelected)}
                className="text-black"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#0a101f',
                    borderColor: '#4b5563',
                    color: 'black',
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: 'black',
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'white',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: '#1a253f',
                    color: 'black',
                  }),
                }}
              />
              {systemIntegratorError && <p className="text-red-500 text-sm mt-1">{systemIntegratorError}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end mt-6 gap-4">
          <button
            type="button"
            className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
            onClick={() => navigate("/user")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg font-bold text-white hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
            onClick={handleSubmit}
          >
            Submit
          </button>

        </div>

      </form>
    </div>
  );

};

export default CreateUser;
