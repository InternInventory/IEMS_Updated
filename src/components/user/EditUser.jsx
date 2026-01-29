import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Select from 'react-select';
import useAuthFetch from '../hooks/useAuthFetch';
 
const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const countryCode = "+91";
 
  const [user, setUser] = useState({
    username: "",
    fname: "",
    lname: "",
    email: "",  
    contact_no: "",
    designation: "",
    org_name: "",
    role_name: "",
    country_name: "",
    is_active: true,
    created_by: localStorage.getItem("userId") || "system",
  });
 
  const [orgs, setOrgs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
 
  // ✅ Error States
  const [fnameError, setfnameError] = useState("");
  const [lnameError, setlnameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [organizationError, setOrganizationError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [countryError, setCountryError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [popupType, setPopupType] = useState(""); // "success" or "error"
  const [popupMessage, setPopupMessage] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locationError, setLocationError] = useState("");
  
  const clientOptions = orgs.map((org) => ({
    label: org.org_name,
    value: org.org_id, // or use org.org_id if that's what you want to store
  }));
  
  const locationOptions = locations.map((loc) => ({
    value: loc.loc_id,
    label: `${loc.loc_name} (${loc.org_name || 'N/A'})`,
    org_id: loc.org_id
  }));
 
 
 
  useEffect(() => {
  const fetchData = async () => {
    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
 
      const [orgsRes, rolesRes, countriesRes, locationsRes] = await Promise.all([
        authFetch({ url: `${apiURL}/client`, method: "GET" }),
        authFetch({ url: `${apiURL}/roles`, method: "GET" }),
        //authFetch({ url: `${apiURL}/countries`, method: "GET" }),
        fetch(`${apiURL}/countries`),
        authFetch({ url: `${apiURL}/locations`, method: "GET" })
      ]);
 
      const orgDataRaw = orgsRes.data;
      const roleData = rolesRes.data;
      //const countryData = countriesRes.data;
      const countryData = await countriesRes.json();
      const locationData = locationsRes.data;
 
      const orgData = orgDataRaw.map((org) => ({
        ...org,
        org_id: org.clientId,
        org_name: org.clientName,
      }));
 
      setOrgs(orgData);
      setRoles(roleData);
      setCountries(countryData);
      setLocations(locationData);
 
      const userRes = await authFetch({
        url: `${apiURL}/users/${id}`,
        method: "GET"
      });
 
      const userData = userRes.data;
 
      if (userData.contact_no && !userData.contact_no.startsWith("+91")) {
        userData.contact_no = "+91" + userData.contact_no;
      }
 
      const roleMatch = roleData.find((role) => role.role_id === userData.role_id);
      const countryMatch = countryData.find((c) => c.country_id === userData.country_id);
 
      // Parse data based on role
      if (userData.role_id === 4 && Array.isArray(userData.org_id)) {
        // Engineer: check if new format {org_id, loc_id} or old format (simple array)
        if (userData.org_id.length > 0 && typeof userData.org_id[0] === 'object') {
          // New format: array of {org_id, loc_id} objects
          const uniqueOrgIds = [...new Set(userData.org_id.map(item => item.org_id))];
          const locationIds = userData.org_id.map(item => item.loc_id);
          
          setUser({
            ...userData,
            org_name: uniqueOrgIds,
            role_name: roleMatch?.role_name || "",
            country_name: countryMatch?.country_name || "",
          });
          setSelectedLocations(locationIds);
        } else {
          // Old format: simple array of client IDs - no locations assigned yet
          setUser({
            ...userData,
            org_name: userData.org_id || [],
            role_name: roleMatch?.role_name || "",
            country_name: countryMatch?.country_name || "",
          });
          setSelectedLocations([]);
        }
      } else {
        // Non-engineer: org_id is simple array
        setUser({
          ...userData,
          org_name: userData.org_id || [],
          role_name: roleMatch?.role_name || "",
          country_name: countryMatch?.country_name || "",
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };
 
  fetchData();
}, [id]);
 
  const validatefname = (value) => {
    if (!value.trim()) setfnameError("First name is required");
    else setfnameError("");
  };
 
  const validatelname = (value) => {
    if (!value.trim()) setlnameError("Last name is required");
    else setlnameError("");
  };
 
  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!value.trim()) {
      setEmailError("Email is required");
      setEmailSuccess("");
    } else if (value !== value.toLowerCase()) {
      setEmailError("Email must be lowercase");
      setEmailSuccess("");
    } else if (!emailRegex.test(value)) {
      setEmailError("Invalid email format");
      setEmailSuccess("");
    } else {
      setEmailError("");
      setEmailSuccess("Email is valid");
    }
  };
 
 
const validatePhone = async (value) => {
  const numberPart = value.replace(countryCode, "").replace(/\D/g, "");
 
  if (!numberPart.trim()) {
    setPhoneError("Phone number is required");
    return false;
  } else if (numberPart.length !== 10) {
    setPhoneError("Phone number must be 10 digits");
    return false;
  }
 
  const fullPhone = `${countryCode}${numberPart}`;
 
  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    const response = await authFetch({
      url: `${apiURL}/users`,
      method: "GET",
    });
 
    const existingUser = response.data.find(
      (u) => u.contact_no === fullPhone && u.user_id !== id
    );
 
    if (existingUser) {
      setPhoneError("Phone number already exists");
      return false;
    }
 
    setPhoneError("");
    return true;
  } catch (error) {
    console.error("Phone validation error:", error);
    setPhoneError("Unable to validate phone number");
    return false;
  }
};
 
 
  const validateOrganization = (value) => {
    if (!value || value.length === 0) {
      setOrganizationError("Organization is required");
    } else {
      setOrganizationError("");
    }
  };
 
  const validateRole = (value) => {
    if (!value) {
      setRoleError("Role is required");
    } else {
      setRoleError("");
    }
  };
 
  const validateCountry = (value) => {
    if (!value) {
      setCountryError("Country is required");
    } else {
      setCountryError("");
    }
  };
  
  const validateLocations = (value, roleId) => {
    // Only validate if role is Engineer (role_id = 4)
    const roleIdNum = parseInt(roleId || user.role_id);
    if (roleIdNum === 4) {
      if (!value || value.length === 0) {
        setLocationError("At least one location is required for engineers");
      } else {
        setLocationError("");
      }
    } else {
      setLocationError("");
    }
  };
 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
 
    switch (name) {
      case "fname":
        validatefname(value);
        break;
      case "lname":
        validatelname(value);
        break;
      case "email":
        validateEmail(value);
        break;
      case "contact_no":
        validatePhone(value);
        break;
      case "role_name":
        const selectedRole = roles.find(r => r.role_name === value);
        if (selectedRole && parseInt(selectedRole.role_id) !== 4) {
          setSelectedLocations([]);
          setLocationError("");
        }
        validateRole(value);
        validateLocations(selectedLocations, selectedRole?.role_id);
        break;
      default:
        break;
    }
  };
 
 
  const handleSubmit = async (e) => {
  e.preventDefault();
 
  const selectedRole = roles.find(r => r.role_name === user.role_name);
  const isEngineer = selectedRole && parseInt(selectedRole.role_id) === 4;
  
  validatefname(user.fname);
  validatelname(user.lname);
  validateEmail(user.email);
  validatePhone(user.contact_no);
  
  // Validate organization for all roles
  validateOrganization(user.org_name);
  
  // Additionally validate locations for engineers
  if (isEngineer) {
    validateLocations(selectedLocations, selectedRole.role_id);
  }
  
  validateRole(user.role_name);
  validateCountry(user.country_name);
 
  const requiredFields = [
    { field: user.username, name: "Username" },
    { field: user.fname, name: "First Name" },
    { field: user.lname, name: "Last Name" },
    { field: user.email, name: "Email" },
    { field: user.contact_no, name: "Contact Number" },
    { field: user.org_name, name: "Organization" },
    { field: user.role_name, name: "Role" },
    { field: user.country_name, name: "Country" },
    { field: user.is_active ? "active" : "inactive", name: "Status" },
  ];
  
  // Add locations to required fields for engineers
  if (isEngineer) {
    requiredFields.push({ field: selectedLocations, name: "Locations" });
  }
 
  const missingFields = requiredFields.filter((f) => {
    if (typeof f.field === "string") {
      return f.field.trim() === "";
    }
    return f.field === null || f.field === undefined || f.field.length === 0;
  });
 
  const hasErrors =
    missingFields.length > 0 ||
    fnameError || lnameError || emailError || phoneError ||
    organizationError || roleError || countryError || locationError;
 
  if (hasErrors) {
    setPopupType("error");
    setPopupMessage("Please fill all required fields correctly.");
    setShowPopup(true);
    return;
  }
 
  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
 
    // Format org_id based on role
    let orgIdData;
    if (isEngineer) {
      // Engineer role - format as array of {org_id, loc_id} objects
      orgIdData = selectedLocations.map((locId) => {
        const location = locations.find(l => l.loc_id === parseInt(locId));
        return {
          org_id: location?.org_id || 1,
          loc_id: parseInt(locId)
        };
      });
      console.log('Engineer update payload:', { selectedLocations, orgIdData });
    } else {
      // Non-engineer role - simple array of org IDs
      orgIdData = user.org_name;
    }
    
    const payload = {
        ...user,
        org_id: orgIdData,
        contact_no: `${countryCode}${user.contact_no.replace(/\D/g, "").slice(-10)}`
      };
    
    // Remove org_name to prevent it from overriding org_id on the backend
    delete payload.org_name;
    
    console.log('Full update payload:', payload);
    const response = await authFetch({
      url: `${apiURL}/users/${id}`,
      method: "PUT",
      data: payload,  
    });
   
 
    setPopupType("success");
    setPopupMessage("User Updated Successfully");
    setShowPopup(true);
 
    setTimeout(() => {
      setShowPopup(false);
      navigate("/user");
    }, 1500);
  } catch (err) {
    console.error("Update error:", err);
    setPopupType("error");
    setPopupMessage(err?.response?.data?.error || "Something went wrong.");
    setShowPopup(true);
  }
};
 
 
 
  if (error) return <div>{error}</div>;
 
  return (
    <div className="flex-1 overflow-y-auto pt-4 w-full px-4">
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-[#0c1220] text-white px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center">
            <span
              className="absolute top-4 right-6 text-gray-400 text-2xl cursor-pointer"
              onClick={() => setShowPopup(false)}
            >
              ×
            </span>
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6 ${popupType === "success" ? "bg-green-500" : "bg-red-500"
              }`}>
              {popupType === "success" ? "✅" : "❌"}
            </div>
            <h2 className="text-2xl font-semibold mb-2">{popupMessage}</h2>
            {popupType === "success" && (
              <p className="text-base text-slate-400">Redirecting to user list...</p>
            )}
          </div>
        </div>
      )}
 
      <h2 className="text-2xl font-bold text-white mb-4">Edit User</h2>
      <form onSubmit={handleSubmit} className="bg-[#0f172b] p-6 rounded-lg text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Username <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="username"
              value={user.username}
              readOnly
              className="w-full px-4 py-2 rounded-md border border-gray-600 bg-[#1c1c1c] text-white cursor-not-allowed"
 
            />
          </div>
 
 
          <div>
            <label className="block mb-1">First Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="fname"
              value={user.fname}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-gray-600 bg-[#0a101f] text-white"
              onBlur={(e) => validatefname(e.target.value)}
            />
            {fnameError && <p className="text-red-500 text-sm mt-1">{fnameError}</p>}
 
          </div>
          <div>
            <label className="block mb-1">Last Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="lname"
              value={user.lname}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-gray-600 bg-[#0a101f] text-white"
              onBlur={(e) => validatelname(e.target.value)}
            />
            {lnameError && <p className="text-red-500 text-sm mt-1">{lnameError}</p>}
 
          </div>
          <div>
            <label className="block mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              name="email"
              value={user.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-gray-600 bg-[#0a101f] text-white"
              onBlur={(e) => validateEmail(e.target.value)}
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
            {!emailError && emailSuccess && (
              <p className="text-green-500 text-sm mt-1">{emailSuccess}</p>
            )}
 
          </div>
          <div>
            <label className="block mb-1">Contact Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="contact_no"
              value={user.contact_no}
              onChange={(e) => {
                const input = e.target.value;
                if (!input.startsWith(countryCode)) {
                  setUser((prev) => ({ ...prev, contact_no: countryCode }));
                  return;
                }
                const digits = input.slice(countryCode.length).replace(/\D/g, "");
                if (digits.length <= 10) {
                  setUser((prev) => ({ ...prev, contact_no: countryCode + digits }));
                }
                if (digits.trim()) setPhoneError("");
              }}
              onBlur={(e) => validatePhone(e.target.value)}
              className="bg-transparent shadow border rounded w-full py-2 px-3"
            />
            {phoneError && <p className="text-red-500 text-sm">{phoneError}</p>}
          </div>
          <div>
            <label className="block mb-1">Designation</label>
            <input
              type="text"
              name="designation"
              value={user.designation}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-gray-600 bg-[#0a101f] text-white"
            />
          </div>
 
          {/* Organization - Required for all roles including engineers */}
          <div>
            <label className="block mb-1">
              Organization <span className="text-red-500">*</span>
            </label>
            <Select
              isMulti
              options={clientOptions}
              value={clientOptions.filter((opt) => user.org_name.includes(opt.value))}
              onChange={(selectedOptions) => {
                const selectedValues = selectedOptions.map((opt) => opt.value);
                setUser((prev) => ({ ...prev, org_name: selectedValues }));
                validateOrganization(selectedValues);
              }}
              onBlur={() => validateOrganization(user.org_name)}
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
                  color: 'black',
                }),
              }}
            />
            {organizationError && <p className="text-red-500 text-sm">{organizationError}</p>}
          </div>
          
          {/* Locations - Additional field for engineers only */}
          {(() => {
            const selectedRole = roles.find(r => r.role_name === user.role_name);
            const isEngineer = selectedRole && parseInt(selectedRole.role_id) === 4;
            
            if (isEngineer) {
              return (
                <div>
                  <label className="block mb-1 text-white">
                    Assigned Locations <span className="text-red-500">*</span>
                  </label>
                  <Select
                    isMulti
                    options={locationOptions}
                    value={locationOptions.filter((opt) => selectedLocations.includes(opt.value))}
                    onChange={(selectedOptions) => {
                      const selectedValues = selectedOptions.map((opt) => opt.value);
                      setSelectedLocations(selectedValues);
                      validateLocations(selectedValues, selectedRole.role_id);
                    }}
                    onBlur={() => validateLocations(selectedLocations, selectedRole.role_id)}
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
                  <p className="text-gray-400 text-xs mt-1">Engineers will be assigned to all combinations of selected organizations and locations</p>
                </div>
              );
            }
            return null;
          })()}
 
          <div>
            <label className="block mb-1">Role <span className="text-red-500">*</span></label>
            <select
              name="role_name"
              value={user.role_name}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-gray-600 bg-[#0a101f] text-white"
              onBlur={(e) => validateRole(e.target.value)}
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_name}>{role.role_name}
                </option>
              ))}
            </select>
            {roleError && <p className="text-red-500 text-sm mt-1">{roleError}</p>}
          </div>
          <div>
            <label className="block mb-1">Country <span className="text-red-500">*</span></label>
            <select
              name="country_name"
              value={user.country_name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-600 bg-[#0a101f] text-white"
              onBlur={(e) => validateCountry(e.target.value)}
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.country_id} value={country.country_name}>
                  {country.country_name}
                </option>
              ))}
            </select>
            {countryError && <p className="text-red-500 text-sm mt-1">{countryError}</p>}
          </div>
          <div>
            <label className="block mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="is_active"
              value={user.is_active ? "active" : "inactive"}
              onChange={(e) =>
                setUser((prev) => ({
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
 
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => navigate("/user")}
            className="font-bold px-4 py-2 border text-white rounded-lg hover:opacity-90" style={{backgroundColor:"#ffffff31"}}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="text-white px-4 py-2 rounded lg font-bold hover:opacity-90"
            style={{ backgroundColor: "#76df23" }}
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};
 
export default EditUser;