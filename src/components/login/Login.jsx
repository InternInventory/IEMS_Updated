// src/LoginPage.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";
import { Link } from "react-router-dom";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import "./login.css";

const Login = () => {
  const { theme, colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.token;
        if (rememberMe) {
          localStorage.setItem("token", token);
        } else {
          sessionStorage.setItem("token", token);
        }
        navigate("/dashboard");
      } else {
        setError(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === "dark";

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
      {/* Left Side - Image Section */}
      <div className="w-full md:w-3/5 relative h-2/5 md:h-full overflow-hidden">
        <img
          src="../src/assets/img/login/login.png"
          alt="Background"
          className="object-cover w-full h-full transition-transform duration-700 hover:scale-105"
        />
        <img
          src="../src/assets/img/navbar/buildint_logo.png"
          alt="Logo"
          className="absolute top-6 left-6 w-20 h-auto md:w-28 z-20 transition-transform duration-300 hover:scale-105"
        />
      </div>

      {showForgotPassword ? (
        <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />
      ) : (
        <div 
          className="w-full md:w-2/5 flex items-center justify-center relative"
          style={{ backgroundColor: colors.background }}
        >
          <div className="w-full max-w-md px-8 md:px-12 py-12 md:py-16 animate-fade-in">
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 
                className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent animate-gradient"
                style={{
                  backgroundImage: `linear-gradient(90deg, #76df23, #8ae648, #76df23)`
                }}
              >
                Welcome to i-EMS
              </h1>
              <h2 
                className="text-xl md:text-2xl font-semibold"
                style={{ color: colors.textPrimary }}
              >
                Login to your account
              </h2>
            </div>

            {/* Login Form */}
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Username Field */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="username"
                  style={{ color: colors.textPrimary }}
                >
                  Username
                </label>
                <input
                  className="form-input w-full py-3 px-4 rounded-lg transition-all duration-200"
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                  disabled={loading}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`,
                    caretColor: colors.primary
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)";
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="password"
                  style={{ color: colors.textPrimary }}
                >
                  Password
                </label>
                <input
                  className="form-input w-full py-3 px-4 pr-12 rounded-lg transition-all duration-200"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: colors.textPrimary,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`,
                    caretColor: "#76df23"
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)";
                    e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-[38px] transition-colors duration-200 p-1"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  style={{ color: colors.textSecondary }}
                  onMouseEnter={(e) => e.target.style.color = "#76df23"}
                  onMouseLeave={(e) => e.target.style.color = colors.textSecondary}
                >
                  {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="px-4 py-3 rounded-lg text-sm animate-slide-down border"
                  style={{
                    backgroundColor: `${colors.error}15`,
                    borderColor: `${colors.error}30`,
                    color: colors.error
                  }}
                >
                  {error}
                </div>
              )}

              {/* Remember Me & Forgot Password */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <label className="inline-flex items-center cursor-pointer group" style={{ color: colors.textSecondary }}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded transition-all duration-200"
                    id="rememberMe"
                    name="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    style={{
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : colors.border,
                      border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.2)" : colors.border}`,
                      accentColor: colors.primary
                    }}
                  />
                  <span className="ml-2 text-sm transition-colors" style={{ color: colors.textSecondary }}>
                    Remember Me
                  </span>
                </label>
                <Link
                  to="/forgotPassword"
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: "#76df23" }}
                  onMouseEnter={(e) => e.target.style.color = "#8ae648"}
                  onMouseLeave={(e) => e.target.style.color = "#76df23"}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/forgotPassword");
                  }}
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Login Button */}
              <button
                className="w-full font-semibold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: "#76df23",
                  color: "#111827",
                  backgroundImage: "linear-gradient(90deg, #76df23, #8ae648)",
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
                {loading ? (
                  <>
                    <div className="spinner w-5 h-5 border-2 border-[#091224]/30 border-t-[#091224]"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p style={{ color: colors.textSecondary }}>
                Don't have an account?{" "}
                <Link 
                  to="/register" 
                  className="font-semibold transition-colors duration-200"
                  style={{ color: "#76df23", textDecoration: "underline", textDecorationOffset: "2px" }}
                  onMouseEnter={(e) => e.target.style.color = "#8ae648"}
                  onMouseLeave={(e) => e.target.style.color = "#76df23"}
                >
                  Sign up now!
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
