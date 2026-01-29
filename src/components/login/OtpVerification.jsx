import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const OtpVerification = () => {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [otpExpired, setOtpExpired] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const navigate = useNavigate();

  // Countdown timer effect
  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          setOtpExpired(true);
          localStorage.removeItem("forgot_email");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  // Email and 5-minute timeout to redirect
  useEffect(() => {
    const storedEmail = localStorage.getItem("forgot_email");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      setMessage("Email not found. Please go back to Forgot Password.");
      navigate("/forgotPassword");
    }

    const timeout = setTimeout(() => {
      alert("OTP expired. Please request a new one.");
      localStorage.removeItem("forgot_email");
      navigate("/forgotPassword");
    }, 5 * 60 * 1000);

    return () => clearTimeout(timeout);
  }, []);

  const handleVerifyOtp = async () => {
    


    if (otpExpired || timer <= 0) {
      setMessage("OTP has expired. Please request a new one.");
      return;
    }

    if (!otp || otp.length !== 6) {
      setMessage("Please enter a 6-digit OTP.");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      const response = await fetch(`${apiUrl}/validate-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, email }),
      });

      const data = await response.json();
      //setMessage(data.message);

      if (response.ok && data.success) {
        setTimer(5);
        setShowPopup(true);
        setTimeout(() => {
          setShowPopup(false);
          navigate("/resetPassword");
        }, 2000);
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setMessage("Something went wrong.");
    }
  };

  // Format timer as mm:ss
  const formatTimer = () => {
    const m = String(Math.floor(timer / 60)).padStart(2, "0");
    const s = String(timer % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div 
      className="flex flex-col md:flex-row h-screen relative overflow-hidden"
      style={{
        backgroundColor: colors.background,
        backgroundImage: isDark 
          ? "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)"
          : `linear-gradient(135deg, ${colors.background} 0%, ${colors.surface} 50%, ${colors.divider} 100%)`
      }}
    >
      {/* Popup */}
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
            <h2 className="text-2xl font-semibold mb-2">OTP Verified Successfully</h2>
            <p style={{ color: colors.textSecondary }}>Redirecting to reset password...</p>
          </div>
        </div>
      )}

      {/* Left Side: Image and Logo */}
      <div className="w-full md:w-3/5 relative h-2/5 md:h-full">
        <img
          src="src/assets/img/login/login.png"
          alt="Background"
          className="object-cover w-full h-full"
        />
        <img
          src="src/assets/img/login/buildintloginwhite.png"
          alt="Logo"
          className="absolute top-4 left-4 w-16 h-auto md:w-24"
        />
      </div>

      {/* Right Side: OTP Form */}
      <div className="w-full md:w-2/5 flex items-center justify-center relative">
        <div 
          className="absolute left-0 md:left-[-10%] w-full md:w-[110%] h-full flex flex-col justify-center p-[100px] shadow-lg z-10 rounded-none md:rounded-l-[30px]"
          style={{ backgroundColor: colors.background }}
        >
          <h1 
            className="text-start text-xl md:text-2xl font-bold mb-4 md:mb-6"
            style={{ color: "#76df23" }}
          >Verify OTP</h1>

          <form className="w-full max-w-sm" onSubmit={(e) => e.preventDefault()}>
            <div className="mb-4">
              <input
                className="shadow border rounded w-full py-2 px-3 focus:outline-none transition-all"
                id="otp"
                type="text"
                placeholder="Enter your OTP"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d{0,6}$/.test(value)) {
                    setOtp(value);
                  }
                }}
                maxLength={6}
                disabled={otpExpired || timer <= 0}
                style={{
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                  color: colors.textPrimary,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                  border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`,
                  caretColor: "#76df23",
                  opacity: otpExpired || timer <= 0 ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!(otpExpired || timer <= 0)) {
                    e.target.style.borderColor = "#76df23";
                    e.target.style.boxShadow = "0 0 0 2px #76df2320";
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
                  e.target.style.boxShadow = "none";
                }}
              />
              {message && <p className="text-sm mt-4" style={{ color: colors.error }}>{message}</p>}
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              className="w-full font-bold py-2 px-4 rounded focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={otpExpired || timer <= 0}
              style={{
                backgroundColor: "#76df23",
                color: "#111827",
                boxShadow: "0 4px 15px #76df2340"
              }}
              onMouseEnter={(e) => {
                if (!(otpExpired || timer <= 0)) {
                  e.target.style.transform = "scale(1.02)";
                  e.target.style.boxShadow = "0 8px 20px #76df2360";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 4px 15px #76df2340";
              }}
            >
              Verify OTP
            </button>

            <p 
              className="text-sm text-center mt-3 font-medium"
              style={{ color: timer <= 60 ? colors.error : colors.textSecondary }}
            >
              {otpExpired ? "OTP Expired" : `Time remaining: ${formatTimer()}`}
            </p>

            <div className="mt-4 text-right">
              <button
                className="text-sm font-medium transition-colors"
                onClick={() => navigate("/")}
                style={{ color: "#76df23" }}
                onMouseEnter={(e) => e.target.style.color = "#8ae648"}
                onMouseLeave={(e) => e.target.style.color = "#76df23"}
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
