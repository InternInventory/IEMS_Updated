import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { useTheme } from '../../context/ThemeContext';

const ResetPassword = () => {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const [passwordValidations, setPasswordValidations] = useState({
    startsWithCapital: false,
    isLongEnough: false,
    hasNumber: false,
  });
  const [touchedNewPassword, setTouchedNewPassword] = useState(false);
  const [touchedConfirmPassword, setTouchedConfirmPassword] = useState(false); // ✅ NEW

  useEffect(() => {
    const storedEmail = localStorage.getItem('forgot_email');
    if (!storedEmail) {
      alert('Access denied. Please initiate password reset from the "Forgot Password" page.');
      navigate('/forgotPassword');
    } else {
      setEmail(storedEmail);
    }
  }, []);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    const passwordPattern = /^[A-Z][A-Za-z\d@$!%*#?&^_-]{7,}$/;
    const containsNumber = /\d/.test(newPassword);

    if (!passwordPattern.test(newPassword) || !containsNumber) {
      setMessage('Password must start with a capital letter, be at least 8 characters long, and contain at least one number.');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      const response = await fetch(`${apiUrl}/new-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();
      // setMessage(data.message);

      if (response.ok && data.success) {
        setShowPopup(true);
        localStorage.removeItem('forgot_email');
        setTimeout(() => {
          setShowPopup(false);
          navigate('/');
        }, 5000);
      }

    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage('Something went wrong.');
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
            >×</span>
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white text-2xl mb-6" style={{ backgroundColor: "#76df23" }}>✅</div>
            <h2 className="text-2xl font-semibold mb-2">Password Reset Successfully</h2>
            <p style={{ color: colors.textSecondary }}>Redirecting to login...</p>
          </div>
        </div>
      )}

      <div className="w-full md:w-3/5 relative h-2/5 md:h-full">
        <img src="src/assets/img/login/login.png" alt="Background" className="object-cover w-full h-full" />
        <img src="src/assets/img/login/buildintloginwhite.png" alt="Logo" className="absolute top-4 left-4 w-16 h-auto md:w-24" />
      </div>

      <div className="w-full md:w-2/5 flex items-center justify-center relative">
        <div 
          className="absolute left-0 md:left-[-10%] w-full md:w-[110%] h-full flex flex-col justify-center p-[100px] shadow-lg z-10 rounded-none md:rounded-l-[30px]"
          style={{ backgroundColor: colors.background }}
        >
          <h1 
            className="text-start text-xl md:text-2xl font-bold mb-4 md:mb-6"
            style={{ color: "#76df23" }}
          >Reset Password</h1>

          <form className="w-full max-w-sm" onSubmit={(e) => e.preventDefault()}>
            <div className="mb-4 relative">
              <label 
                className="block text-start text-sm mb-2 font-medium"
                htmlFor="newPassword"
                style={{ color: colors.textPrimary }}
              >New Password</label>
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                className="shadow border rounded w-full py-2 px-3 pr-10 leading-tight focus:outline-none transition-all"
                value={newPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewPassword(value);
                  setTouchedNewPassword(true);
                  setPasswordValidations({
                    startsWithCapital: /^[A-Z]/.test(value),
                    isLongEnough: value.length >= 8,
                    hasNumber: /\d/.test(value),
                  });
                }}
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
              <span 
                className="absolute top-[42px] right-3 cursor-pointer transition-colors"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => e.target.style.color = colors.textPrimary}
                onMouseLeave={(e) => e.target.style.color = colors.textSecondary}
              >
                {showNewPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </span>

              {touchedNewPassword && (
                <div className="text-sm mt-2 space-y-1">
                  <p style={{ color: passwordValidations.startsWithCapital ? "#76df23" : colors.error }}>• Starts with a capital letter</p>
                  <p style={{ color: passwordValidations.isLongEnough ? "#76df23" : colors.error }}>• At least 8 characters long</p>
                  <p style={{ color: passwordValidations.hasNumber ? "#76df23" : colors.error }}>• Contains at least one number</p>
                </div>
              )}
            </div>

            <div className="mb-4 relative">
              <label 
                className="block text-start text-sm mb-2 font-medium"
                htmlFor="confirmPassword"
                style={{ color: colors.textPrimary }}
              >Confirm Password</label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                className="shadow border rounded w-full py-2 px-3 pr-10 leading-tight focus:outline-none transition-all"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setTouchedConfirmPassword(true);
                }}
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
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
              <span 
                className="absolute top-[42px] right-3 cursor-pointer transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => e.target.style.color = colors.textPrimary}
                onMouseLeave={(e) => e.target.style.color = colors.textSecondary}
              >
                {showConfirmPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </span>

              {touchedConfirmPassword && (
                <div className="text-sm mt-2">
                  <p style={{ color: confirmPassword === newPassword ? "#76df23" : colors.error }}>
                    {confirmPassword === newPassword ? "✓ Passwords match" : "Passwords do not match"}
                  </p>
                </div>
              )}
            </div>

            {message && <p className="text-sm mt-4" style={{ color: colors.error }}>{message}</p>}

            <button
              type="button"
              onClick={handleResetPassword}
              className="w-full font-bold py-2 px-4 rounded focus:outline-none mt-4 transition-all"
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
              Reset Password
            </button>

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

export default ResetPassword;
