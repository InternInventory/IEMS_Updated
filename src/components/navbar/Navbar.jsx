import { useState, useEffect } from "react";
import { NavContent } from "./NavContent";
import ProfileDropdown from "./ProfileDropdown";
import NotificationDropdown from "./NotificationDropdown";
import { IoIosNotificationsOutline } from "react-icons/io";
import { useNavigate, Outlet, Link } from "react-router-dom";
import "./navbar.css";
import { useTheme } from "../../context/ThemeContext";
import buildIntDark from "../../assets/img/navbar/buildint_logo.png";
import buildIntLight from "../../assets/img/BuildINT.png";

export const Navbar = ({ bgColor, textColor }) => {
  const [isOpen, setOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const apiURL = import.meta.env.VITE_API_BASE_URL;

  const responsiveStyle = {
    margin: "54px auto",
  };

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${apiURL}/api/notifications/count`, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Poll for notification updates every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    sessionStorage.removeItem("userId");
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/");
  };

  const toggleNotificationDropdown = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[50] shadow-lg"
        style={{ backgroundColor: bgColor, height: "48px" }}
      >
        <nav className="flex items-center justify-between py-2 px-4 border-b border-white/10 backdrop-blur-md bg-opacity-90" id="main-navbar" style={{ backgroundColor: bgColor }}>
          <div className="flex items-center space-x-4 pl-2 md:pl-4">
            <NavContent
              bgColor={bgColor}
              textColor={textColor}
              isOpen={isOpen}
              setOpen={setOpen}
            />
            <Link
              to={"/dashboard"}
              className="logo font-bold text-xl md:text-2xl flex items-center space-x-2 cursor-pointer transition-transform duration-200 hover:scale-105"
            >
              <img
  src={theme === "light" ? buildIntLight : buildIntDark}
  className="w-auto h-6 md:h-7 2xl:h-8 mt-1 ml-6 select-none"
  alt="BuildINT logo"
/>

            </Link>
          </div>
          <div className="flex items-center gap-3 md:gap-4 px-3 md:px-5">
            {/* Notification Bell with Badge */}
            <div className="relative">
            

              <button
                onClick={toggleNotificationDropdown}
                className="relative p-2 rounded-lg focus:outline-none hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Notifications"
              >
                <IoIosNotificationsOutline
                  size={24}
                  style={{ color: theme === 'light' ? '#000000' : textColor }}
                  className="cursor-pointer transition-transform duration-200"
                />
                {/* Unread Badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 shadow-lg ring-2 ring-white/20 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              <NotificationDropdown
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                unreadCount={unreadCount}
                onUpdateCount={fetchUnreadCount}
              />
            </div>

             <button
              onClick={toggleTheme}
              className="relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 border border-white/20 hover:border-white/30 bg-white/5 hover:bg-white/10 backdrop-blur-sm"
              style={{ color: theme === 'light' ? '#000000' : textColor }}
              aria-label="Toggle theme"
            >
              <span className="flex items-center gap-2">
                {theme === "dark" ? (
                  <>
                    <span className="text-lg">🌙</span>
                    <span className="hidden sm:inline">Dark</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">☀️</span>
                    <span className="hidden sm:inline">Light</span>
                  </>
                )}
              </span>
            </button>


            <ProfileDropdown
              bgColor={bgColor}
              textColor={textColor}
              handleLogout={handleLogout}
            />
          </div>
        </nav>
      </div>
      <div
        style={responsiveStyle}
        className={`transition-all duration-300 ${isOpen ? "min-md-open" : ""}`}
      >
        <Outlet />
      </div>
    </>
  );
};
