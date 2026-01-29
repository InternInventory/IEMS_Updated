import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const Register = () => {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [usernameError, setUsernameError] = useState("");
  const [fnameError, setfnameError] = useState("");
  const [fname, setfname] = useState(""); // State to hold first name 

  const [lnameError, setlnameError] = useState("");
  const [lname, setlname] = useState(""); // State to hold last name

  const [username, setUsername] = useState(""); // State to hold username

  // State to hold countries and selected country
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(""); // hold selected value

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const [formErrors, setFormErrors] = useState({});
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [gender, setgender] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // State to hold entities and selected entity
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(""); // hold selected value

  // State to hold roles and selected role
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [roleError, setRoleError] = useState("");

  const [country, setCountry] = useState(""); // State to hold country
  const [countryError, setCountryError] = useState(""); // State to hold country error

  const [phone, setPhone] = useState(""); // State to hold phone number
  const [phoneError, setPhoneError] = useState(""); // State to hold phone error  

  const [newPassword, setNewPassword] = useState(""); // State to hold new password
  const [newPasswordError, setNewPasswordError] = useState(""); // State to hold new password error

  const [confirmPassword, setConfirmPassword] = useState(""); // State to hold confirm password
  const [confirmPasswordError, setConfirmPasswordError] = useState(""); // State to hold confirm password error

  const [individualOrg, setIndividualOrg] = useState(""); // State to hold individual/organization
  const [individualOrgError, setIndividualOrgError] = useState(""); // State to hold individual/organization error

  const [countryCode, setCountryCode] = useState(""); // NEW: Holds selected country code (e.g., +91)


  const validateAddress = (value) => {
    if (!value.trim()) {
      setAddressError("Address is required.");
    } else if (value.length > 255) {
      setAddressError("Address cannot exceed 255 characters.");
    } else {
      setAddressError("");
    }
  };


  const validateGender = (value) => {
    if (!value.trim()) {
      setGenderError("Gender is required.");
    } else {
      setGenderError("");
    }
  };




  const validateUsername = (value) => {
    if (!value.trim()) {
      setUsernameError("Username is required");
    } else {
      setUsernameError("");
    }
  };

  const validatefname = (value) => {
    if (!value.trim()) {
      setfnameError("First name is required");
    } else {
      setfnameError("");
    }
  };

  const validatelname = (value) => {
    if (!value.trim()) {
      setlnameError("Last name is required");
    } else {
      setlnameError("");
    }
  };


  const validatePhone = (value) => {
    const numberPart = value.replace(countryCode, "").replace(/\D/g, "");

    if (!numberPart.trim()) {
      setPhoneError("Phone number is required");
    } else if (numberPart.length !== 10) {
      setPhoneError("Phone number must be 10 digits");
    } else {
      setPhoneError("");
    }
  };

  const validateNewPassword = (value) => {
    //const confirmPasswordValue = document.getElementById("confirmPassword").value.trim();
    if (!value.trim()) {
      setNewPasswordError("New password is required");
    } else if (value.length < 8) {
      setNewPasswordError("Password must be at least 8 characters long");
    } else {

      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(value)) {
        setNewPasswordError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
      } else {
        setNewPasswordError(""); // Clear if valid
      }
    }

    const confirmPasswordValue = document.getElementById("confirmPassword")?.value.trim();
    if (confirmPasswordValue) {
      validateConfirmPassword(confirmPasswordValue);
    }
  };

  const validateConfirmPassword = (value) => {
    const newPasswordValue = document.getElementById("newPassword").value.trim();
    if (!value.trim()) {
      setConfirmPasswordError("Confirm password is required");
    } else if (value !== newPasswordValue) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError(""); // Clear if valid
    }
  };

  const validateIndividualOrg = (value) => {
    if (!value.trim()) {
      setIndividualOrgError("Individual/Organization is required");
    } else {
      setIndividualOrgError(""); // Clear if valid
    }
  };

  const validateRole = (value) => {
    if (!value.trim()) {
      setRoleError("Role is required");
    } else {
      setRoleError("");
    }
  };


  const validateCountry = (value) => {
    if (!value.trim()) {
      setCountryError("Country is required");
    } else {
      setCountryError(""); // Clear if valid
    }
  };



  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!value.trim()) {
      setEmailError("Email is required");
    } else if (!emailRegex.test(value)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError(""); // Clear if valid
    }
  };

  // Fetch countries and entities on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {

        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        console.log("API URL:", apiUrl);
        const response = await fetch(`${apiUrl}/countries`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(),
        });

        const data = await response.json();
        setCountries(data);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };

    const fetchEntities = async () => {
      try {
        // const response = await fetch("http://localhost:5000/entities");

        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        console.log("API URL:", apiUrl);
        const response = await fetch(`${apiUrl}/entities`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(),
        });
        const data = await response.json();
        setEntities(data);
      } catch (error) {
        console.error("Error fetching entities:", error);
      }
    };

    const fetchRoles = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${apiUrl}/roles`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setRoles(data);
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };

    fetchEntities();
    fetchRoles();

    fetchCountries();
  }, []);



  const validateForm = () => {
    const errors = {};

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const fname = document.getElementById("fname").value.trim();
    const lname = document.getElementById("lname").value.trim();
    const address = document.getElementById("address").value.trim();
    const gender = document.getElementById("gender").value.trim();
    if (!username) errors.username = "Username is required";
    if (!fname) errors.fname = "First name is required";
    if (!lname) errors.lname = "Last name is required";
    if (!email) errors.email = "Email is required";
    if (!phone) errors.phone = "Phone number is required";
    if (!newPassword) errors.newPassword = "Password is required";
    if (!confirmPassword) errors.confirmPassword = "Confirm password is required";
    if (newPassword && confirmPassword && newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (!selectedCountry) errors.country = "Country is required";
    if (!selectedEntity) errors.individualOrg = "Entity is required";
    if (!selectedRole) errors.role = "Role is required";
    if (!address) errors.address = "Address is required";
    if (!gender) errors.gender = "Gender is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };




  // Function to handle registration
  const handleSignup = async () => {
    // Handle registration logic here

    // Get values from input fields
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const country = document.getElementById("country").value;
    console.log("selectedCountry raw value:", selectedCountry);
    const countryValue = selectedCountry ? parseInt(selectedCountry, 10) : null;

    const address = document.getElementById("address").value;
    const lname = document.getElementById("lname").value;
    const fname = document.getElementById("fname").value;
    const gender = document.getElementById("gender").value;
    const individualOrg = document.getElementById("individualOrg").value;
    const individualOrgValue = selectedEntity ? parseInt(selectedEntity, 10) : null;
    const roleValue = selectedRole ? parseInt(selectedRole, 10) : null;


    if (!validateForm()) {
      return; // stop if validation fails
    }

    console.log("Registration Data:", {
      username,
      email,
      phone,
      newPassword,
      confirmPassword,
      individualOrg: individualOrgValue,
      role: roleValue,
      country: countryValue,
      address,
      fname,
      gender,
      lname
    });


    try {
      // const response =await fetch("http://localhost:5000/register", {
      //   method: "POST",
      //   headers: {
      //     "content-type": "application/json"
      //   },
      //   body: JSON.stringify({ username, fname, lname, phone, email, country: countryValue, newPassword, confirmPassword, address, individualOrg:individualOrgValue })
      // })


      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      console.log("API URL:", apiUrl);
      const response = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, fname, lname, gender, phone, email, country: countryValue, newPassword, confirmPassword, address, individualOrg: individualOrgValue, role_id: roleValue }),
      });
      const data = await response.json();
      console.log("Register API Response:", data);


      if (response.ok) {

        if (data.errors) {
          setUsernameError(data.errors.username || "");
          setEmailError(data.errors.email || "");
        } else if (data.error) {
          // fallback: check specific fields
          if (data.error.toLowerCase().includes("username")) {
            setUsernameError(data.error);
          } else if (data.error.toLowerCase().includes("email")) {
            setEmailError(data.error);
          } else {
            alert(data.error); // unknown error
          }
        } else {
          setUsernameError("");
          setEmailError("");

          // Registration successful, show popup
          setShowPopup(true);
          setTimeout(() => {
            // alert("Registration successful! Please log in.");
            navigate("/");
          }, 5000);
        }
      } else {
        alert(data.message || "Login failed");
      }

    } catch (error) {
      console.error("Registration error:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div 
      className="flex flex-col md:flex-row h-screen overflow-hidden"
      style={{
        backgroundColor: colors.background,
        backgroundImage: isDark 
          ? "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)"
          : `linear-gradient(135deg, ${colors.background} 0%, ${colors.surface} 50%, ${colors.divider} 100%)`
      }}
    >
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div 
            className="px-10 py-10 rounded-2xl shadow-2xl w-[500px] relative text-center"
            style={{
              backgroundColor: colors.card,
              color: colors.textPrimary
            }}
          >
            <span
              className="absolute top-4 right-6 text-2xl cursor-pointer transition-colors"
              onClick={() => setShowPopup(false)}
              style={{ color: colors.textSecondary }}
              onMouseEnter={(e) => e.target.style.color = colors.textPrimary}
              onMouseLeave={(e) => e.target.style.color = colors.textSecondary}
            >
              ×
            </span>
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6" style={{ backgroundColor: "#76df23" }}>
              ✅
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              Registration Successful
            </h2>
            <p style={{ color: colors.textSecondary }}>
              You can now log in with your credentials.
            </p>
          </div>
        </div>
      )}
      <div className="w-full md:w-3/5 relative h-2/5 md:h-full">
        <img
          src="src/assets/img/login/login.png"
          alt="Background"
          className="object-cover w-full h-full"
        />
        <img
          src="../src/assets/img/navbar/buildint_logo.png"
          alt="Logo"
          className="absolute top-4 left-4 w-16 h-auto md:w-24"
        />
      </div>

      <div className="w-full md:w-2/5 flex items-center justify-center relative">
        <div 
          className="absolute left-0 md:left-[-10%] w-full md:w-[110%] h-full flex flex-col justify-center p-6 md:p-[100px] shadow-lg z-10 rounded-none md:rounded-l-[30px]"
          style={{ backgroundColor: colors.background }}
        >
          <h1 
            className="text-start text-xl md:text-2xl font-bold mb-4 md:mb-6"
            style={{ color: "#76df23" }}
          >
            Welcome to i-EMS
          </h1>
          <h2 
            className="text-start text-md md:text-lg font-bold mb-4 md:mb-6"
            style={{ color: colors.textPrimary }}
          >
            Sign Up
          </h2>
          <div className="scrollable-container max-h-[400px] overflow-y-auto">
            <form className="w-full max-w-md space-y-4">
              <div>

                <label 
                  className="block text-start text-sm mb-2 font-medium"
                  htmlFor="username"
                  style={{ color: colors.textPrimary }}
                >
                  Username *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded transition-all focus:outline-none"
                  id="username"
                  onChange={(e) => {
                    const val = e.target.value;
                    setUsername(val);
                    if (usernameError) validateUsername(val);
                  }}
                  type="text"
                  placeholder="Enter a username"
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                    validateUsername(e.target.value);
                  }}
                />

                {usernameError && (
                  <p className="text-sm mt-1" style={{ color: colors.error }}>{usernameError}</p>
                )}

              </div>

              <div>
                <label 
                  className="block text-start text-sm mb-2 font-medium"
                  htmlFor="fname"
                  style={{ color: colors.textPrimary }}
                >
                  First Name *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded transition-all focus:outline-none"
                  id="fname"
                  type="text"
                  placeholder="Enter your first name"
                  onChange={(e) => {
                    const val = e.target.value;
                    setfname(val);
                    if (fnameError) validatefname(val);
                  }}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                    validatefname(e.target.value);
                  }}
                />
                {fnameError && (
                  <p className="text-sm mt-1" style={{ color: colors.error }}>{fnameError}</p>
                )}

              </div>


              <div>
                <label 
                  className="block text-start text-sm mb-2 font-medium"
                  htmlFor="lname"
                  style={{ color: colors.textPrimary }}
                >
                  Last Name *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded transition-all focus:outline-none"
                  id="lname"
                  type="text"
                  placeholder="Enter your last name"
                  onChange={(e) => {
                    const val = e.target.value;
                    setlname(val);
                    if (lnameError) validatelname(val);
                  }}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                    validatelname(e.target.value);
                  }}
                />
                {lnameError && (
                  <p className="text-sm mt-1" style={{ color: colors.error }}>{lnameError}</p>
                )}

              </div>

              <div>
                <label 
                  htmlFor="gender" 
                  className="block text-start text-sm mb-2 font-medium"
                  style={{ color: colors.textPrimary }}
                >Gender *</label>
                <select
                  id="gender"
                  required
                  onChange={(e) => {
                    const val = e.target.value;
                    setgender(val);
                    if (genderError) validateGender(val);
                  }}
                  className="w-full px-3 py-2 border rounded transition-all focus:outline-none"
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                    validateGender(e.target.value);
                  }}
                >
                  <option value="" >Select Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="others">Others</option>
                </select>
                {genderError && (
                  <p className="text-sm mt-1" style={{ color: colors.error }}>{genderError}</p>
                )}
              </div>


              <div>
                <label 
                  className="block text-start text-sm mb-2 font-medium"
                  htmlFor="email"
                  style={{ color: colors.textPrimary }}
                >
                  Email ID *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded transition-all focus:outline-none"
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmail(value);
                    validateEmail(value);
                  }}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
                {emailError ? (
                  <p className="text-sm mt-1" style={{ color: colors.error }}>{emailError}</p>
                ) : email && (
                  <p className="text-sm mt-1" style={{ color: "#76df23" }}>✓ Valid Email</p>
                )}
                {formErrors.email && <p className="text-sm mt-1" style={{ color: colors.error }}>{formErrors.email}</p>}

              </div>

              <div className="text-white">
                <label className="block text-start text-sm mb-2" htmlFor="country">
                  Country *
                </label>
                <select
                  className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  id="country"
                  value={selectedCountry}

                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCountry(val);
                    const selected = countries.find((c) => String(c.country_id) === val); // 👈 FIX HERE
                    const code = selected?.country_code || "";
                    setCountryCode(code);
                    setPhone(code);
                    setCountry(val);
                    if (countryError) validateCountry(val);
                  }}

                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    validateCountry(e.target.value);
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">-- Select Country --</option>
                  {countries.map((country) => (
                    <option key={country.country_id} value={country.country_id}>
                      {country.country_name}
                    </option>
                  ))}
                </select>
                {countryError && (
                  <p className="text-red-500 text-sm mt-1">{countryError}</p>
                )}
              </div>

              <div className="text-white">
                <label className="block text-start text-sm mb-2" htmlFor="phone">
                  Phone Number *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => {
                    const input = e.target.value;

                    //  Block deletion of country code
                    if (!input.startsWith(countryCode)) {
                      setPhone(countryCode);
                      return;
                    }

                    //  Extract only the digits typed after the country code
                    const userPart = input.slice(countryCode.length).replace(/\D/g, '');

                    // Limit to 10 digits after country code
                    if (userPart.length > 10) return;

                    setPhone(countryCode + userPart);
                    if (phoneError) validatePhone(countryCode + userPart); // live clear
                  }}
                  onKeyDown={(e) => {
                    //  Prevent deleting country code
                    if (
                      phone.startsWith(countryCode) &&
                      e.target.selectionStart <= countryCode.length &&
                      ['Backspace', 'Delete'].includes(e.key)
                    ) {
                      e.preventDefault();
                    }
                  }}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    validatePhone(e.target.value);
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                 
                />

                {phoneError && (
                  <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                )}
              </div>
              <div className="text-white relative">
                <label className="block text-start text-sm mb-2" htmlFor="newPassword">
                  New Password *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}

                  placeholder="Enter a new password"
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword(value);
                    validateNewPassword(value);
                  }}

                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    validateNewPassword(e.target.value);
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                 
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
                  <p className="text-green-500 text-sm mt-1">✓ Strong Password</p>
                )}
              </div>
              <div className="text-white relative">
                <label className="block text-start text-sm mb-2" htmlFor="confirmPassword">
                  Confirm Password *
                </label>
                <input
                  className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfirmPassword(value);
                    validateConfirmPassword(value);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();

                  }}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    validateConfirmPassword(e.target.value);
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}

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
              <div className="text-white">
                <label className="block text-start text-sm mb-2" htmlFor="individualOrg">
                  Entity *
                </label>
                <select
                  className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  id="individualOrg"
                  value={selectedEntity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedEntity(val);
                    setIndividualOrg(val);
                    
                    // Auto-set role based on entity
                    const selectedEntityObj = entities.find(ent => String(ent.entity_id) === val);
                    if (selectedEntityObj) {
                      if (selectedEntityObj.entity_name.toLowerCase() === 'individual') {
                        // Find "User" role and auto-select it
                        const userRole = roles.find(r => r.role_name.toLowerCase() === 'user');
                        if (userRole) {
                          setSelectedRole(String(userRole.role_id));
                          setRoleError("");
                        }
                      } else {
                        // Reset role for organization
                        setSelectedRole("");
                      }
                    }
                    
                    if (individualOrgError) validateIndividualOrg(val);
                  }}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    validateIndividualOrg(e.target.value);
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">-- Select Entity --</option>
                  {entities.map((individualOrg) => (
                    <option key={individualOrg.entity_id} value={individualOrg.entity_id}>
                      {individualOrg.entity_name}
                    </option>
                  ))}
                </select>
                {individualOrgError && (
                  <p className="text-red-500 text-sm mt-1">{individualOrgError}</p>
                )}
              </div>

              {/* Role Selection - Show conditionally */}
              {selectedEntity && (
                <div className="text-white">
                  <label className="block text-start text-sm mb-2" htmlFor="role">
                    Role *
                  </label>
                  {entities.find(e => String(e.entity_id) === selectedEntity)?.entity_name.toLowerCase() === 'individual' ? (
                    // For Individual - Show User role as disabled/read-only
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded text-gray-500 bg-gray-100 cursor-not-allowed"
                      value="User"
                      disabled
                      readOnly
                    />
                  ) : (
                    // For Organization - Show SI and Super Admin options
                    <select
                      className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      id="role"
                      value={selectedRole}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedRole(val);
                        if (roleError) validateRole(val);
                      }}
                      style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    validateRole(e.target.value);
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                    >
                      <option value="">-- Select Role --</option>
                      {roles
                        .filter(role => ['si', 'super admin'].includes(role.role_name.toLowerCase()))
                        .map((role) => (
                          <option key={role.role_id} value={role.role_id}>
                            {role.role_name}
                          </option>
                        ))}
                    </select>
                  )}
                  {roleError && (
                    <p className="text-red-500 text-sm mt-1">{roleError}</p>
                  )}
                </div>
              )}

              <div className="text-white">
                <label className="block text-start text-sm mb-2" htmlFor="address">
                  Address *
                </label>

                <textarea
                  className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-y"
                  id="address"
                  placeholder="Enter your address"
                  rows={3}
                  maxLength={255}
                  value={address}
                  onKeyDown={(e) => {
                    const currentValue = e.target.value;
                    const lines = currentValue.split('\n');
                    const currentLine = lines[lines.length - 1];

                    // Block Enter key if current line is not full
                    if (e.key === 'Enter' && currentLine.length < 50) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    let value = e.target.value;
                    const maxChars = 255;
                    const lineLimit = 82;

                    // Normalize line breaks
                    value = value.replace(/\r/g, '');

                    let formatted = '';
                    let line = '';

                    for (let i = 0; i < value.length && formatted.length < maxChars; i++) {
                      const char = value[i];

                      if (char === '\n') continue; // skip manual newlines

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
                   style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    validateAddress(e.target.value);
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                />


                {/* Always show character count */}
                <p className={`text-sm mt-1 ${address.length === 255 ? 'text-yellow-400' : 'text-gray-300'}`}>
                  ({address.length}/255)
                </p>

                {/* Show validation error if any */}
                {addressError && (
                  <p className="text-red-500 text-sm mt-1">{addressError}</p>
                )}
              </div>







              <div className="mt-4">
                <button
                  className="w-full font-bold py-2 px-4 rounded focus:outline-none transition-all"
                  type="button"
                  onClick={handleSignup}
                  style={{
                    backgroundColor: "#76df23",
                    color: "#111827",
                    boxShadow: "0 4px 15px #76df2340"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.02)";
                    e.target.style.boxShadow = "0 8px 20px #76df2360";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "0 4px 15px #76df2340";
                  }}
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>

          <div 
            className="mt-6 text-center text-sm"
            style={{ color: colors.textPrimary }}
          >
            <p>
              Already have an account? <Link to="/" className="font-semibold transition-colors" style={{ color: "#76df23" }} onMouseEnter={(e) => e.target.style.color = "#8ae648"} onMouseLeave={(e) => e.target.style.color = "#76df23"}>Login here!</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Register;