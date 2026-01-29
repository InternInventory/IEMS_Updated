import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const ForgotPassword = () => {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    if (!email) {
      setMessage("Please enter your email.");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    console.log("API URL:", apiUrl);

    try {
      const response = await fetch(`${apiUrl}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      // console.log("Response data:", data);
      setMessage(data.message);

      if (response.ok) {

        setShowPopup(true);
        setTimeout(() => {
          setShowPopup(false);
          navigate("/otpVerification");
        }, 5000);
        localStorage.setItem('forgot_email', email);

      }
    } catch (error) {
      console.error("Error sending OTP:" + error);
      setMessage("Something went wrong. Please try again.");
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
      {/* ✅ Popup */}
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
            <h2 className="text-2xl font-semibold mb-2">OTP Sent Successfully</h2>
            <p style={{ color: colors.textSecondary }}>Redirecting to OTP verification...</p>
          </div>
        </div>
      )}
      {/* Left Image Section */}
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

      {/* Right Form Section */}
      <div className="w-full md:w-2/5 flex items-center justify-center relative">
        <div 
          className="absolute left-0 md:left-[-10%] w-full md:w-[110%] h-full flex flex-col justify-center p-[100px] shadow-lg z-10 rounded-none md:rounded-l-[30px]"
          style={{ backgroundColor: colors.background }}
        >
          <h1 
            className="text-start text-xl md:text-2xl font-bold mb-4 md:mb-6"
            style={{ color: "#76df23" }}
          >
            Forgot Password
          </h1>

          <form className="w-full max-w-sm" onSubmit={(e) => e.preventDefault()}>
            <div className="mb-4">
              <label 
                className="block text-start text-sm mb-2 font-medium"
                htmlFor="email"
                style={{ color: colors.textPrimary }}
              >
                Email ID
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none transition-all"
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                  color: colors.textPrimary,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : colors.border,
                  border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : colors.border}`,
                  caretColor: "#76df23"
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
              {message && (
                <p className="text-sm mt-4" style={{ color: colors.error }}>{message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                className="w-full font-bold py-2 px-4 md:px-9 rounded focus:outline-none transition-all"
                type="button"
                onClick={handleSendOtp}
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
                Send OTP
              </button>
            </div>


            <div className="mt-4 text-right">
              <button
                className="text-sm font-medium transition-colors"
                type="button"
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

export default ForgotPassword;
