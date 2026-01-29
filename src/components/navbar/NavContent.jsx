import { useClickAway } from "react-use";
import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
//import { Squash as Hamburger } from "hamburger-react";
import { routes } from "../../routes";
import { RiArrowDropDownLine } from "react-icons/ri";
import { useNavigate, useLocation } from "react-router-dom";
import { FiMenu } from "react-icons/fi"; // drawer-style icon
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";

export const NavContent = ({ bgColor, textColor, isOpen, setOpen }) => {
  // const [isOpen, setOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const [navAccess, setNavAccess] = useState({});
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  useClickAway(ref, () => {
    if (!isOpen) return;
    setOpen(false);
    setOpenSubMenu(null);
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.get(`${apiURL}/userDetails`, {
          headers: {
            Authorization: `${localStorage.getItem("token") || sessionStorage.getItem("token")}`,
          },
        });

        const { navContent } = response.data;

        setNavAccess(navContent || {}); // store navContent access flags
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleSubMenuToggle = (idx) => {
    setOpenSubMenu((prev) => (prev === idx ? null : idx));
  };

  const handleNavigation = (href) => {
    if (href !== "#") {
      navigate(href);
      // setOpen(false);
    }
  };

  return (
    <div ref={ref}>
      <button
  onClick={() => setOpen(!isOpen)}
  className="fixed top-4 left-5 p-2 rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
  aria-label="Toggle menu"
>

        <FiMenu
          size={24}
          color={theme === 'light' ? '#000000' : textColor}
          className="transition-transform duration-200"
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              key="nav-backdrop"
              className="fixed inset-0 bg-black/40 z-[55] md:hidden nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setOpen(false);
                setOpenSubMenu(null);
              }}
            />

            {/* Sidebar drawer */}
            <motion.div
              key="nav-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2 }}
              className="fixed side-bar shadow-2xl p-5 z-[60] overflow-y-auto border-r border-white/10 backdrop-blur-md custom-sidebar-scrollbar"
              style={{
                backgroundColor: theme === "light" ? "#ffffff" : "#0f172b",
                top: "48px",
              }}
            >
              <ul className="grid gap-1">
                {routes
                  .filter((route) => navAccess[route.title] !== false)
                  .map((route, idx) => {
                    const { Icon, subRoutes } = route;
                    const isActive = location.pathname === route.href;

                    return (
                      <div key={route.title}>
                        <motion.li
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.1 + idx / 10,
                          }}
                          className={`w-full p-[0.08rem] rounded-xl transition-all duration-200 ${
                            isActive
                              ? theme === "light"
                                ? "bg-gradient-to-r from-[#ffffff] to-[#8ef045] shadow-md"
                                : "bg-gradient-to-r from-[#ffffff] to-[#1e293b] shadow-md"
                              : ""
                          } ${
                            theme === "light"
                              ? "hover:bg-[#f3ffea] hover:shadow-sm"
                              : "hover:bg-[#2d3b5e] hover:shadow-sm"
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (subRoutes) {
                                handleSubMenuToggle(idx);
                              } else {
                                handleNavigation(route.href);
                                setOpen(false);
                              }
                            }}
                            className="flex items-center justify-between w-full rounded-xl p-3 bg-transparent border-none cursor-pointer transition-all duration-200 hover:transform hover:translate-x-1"
                          >
                            <div className="flex items-center gap-3 justify-start">
                              <Icon
                                className={`nav-icon ${
                                  isActive
                                    ? theme === "light"
                                      ? "text-[#0f172b]"
                                      : "text-[#E6FC5F]"
                                    : ""
                                }`}
                                style={{ color: !isActive ? textColor : "" }}
                              />
                              <span
                                className={`flex gap-1 nav-label ${
                                  isActive
                                    ? theme === "light"
                                      ? "text-[#0f172b]"
                                      : "text-[#E6FC5F]"
                                    : ""
                                } select-none`}
                                style={{ color: !isActive ? textColor : "" }}
                              >
                                {route.title}
                              </span>
                            </div>
                            <div>
                              {subRoutes && (
                                <RiArrowDropDownLine
                                  className="dropdown-arrow"
                                  style={{ color: textColor }}
                                />
                              )}
                            </div>
                          </button>
                        </motion.li>
                        {subRoutes && openSubMenu === idx && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="pl-4"
                          >
                            {subRoutes.map((subRoute) => {
                              const isSubActive =
                                location.pathname === subRoute.href;

                              return (
                                <motion.li
                                  key={subRoute.title}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 20,
                                    delay: 0.1 + idx / 20,
                                  }}
                                  className={`w-full p-[0.08rem] rounded-xl transition-all duration-200 ${
                                    isSubActive
                                      ? theme === "light"
                                        ? "bg-gradient-to-r from-[#ffffff] to-[#8ef045] shadow-sm"
                                        : "bg-gradient-to-r from-[#19223F] to-[#1e293b] shadow-sm"
                                      : ""
                                  } ${
                                    theme === "light"
                                      ? "hover:bg-[#f3ffea] hover:shadow-sm"
                                      : "hover:bg-[#2d3b5e] hover:shadow-sm"
                                  }`}
                                >
                                  <button
                                    onClick={() => {
                                      handleNavigation(subRoute.href);
                                      setOpen(false);
                                    }}
                                    className="flex items-center justify-start w-full p-3 gap-3 rounded-xl bg-transparent border-none cursor-pointer transition-all duration-200 hover:transform hover:translate-x-1"
                                  >
                                    <subRoute.Icon
                                      className={`nav-icon ${
                                        isSubActive
                                          ? theme === "light"
                                            ? "text-[#0f172b]"
                                            : "text-[#E6FC5F]"
                                          : ""
                                      } select-none`}
                                      style={{
                                        color: !isSubActive ? textColor : "",
                                      }}
                                    />
                                    <span
                                      className={`flex gap-1 nav-label ${
                                        isSubActive
                                          ? theme === "light"
                                            ? "text-[#0f172b]"
                                            : "text-[#E6FC5F]"
                                          : ""
                                      } select-none`}
                                      style={{
                                        color: !isSubActive ? textColor : "",
                                      }}
                                    >
                                      {subRoute.title}
                                    </span>
                                  </button>
                                </motion.li>
                              );
                            })}
                          </motion.ul>
                        )}
                      </div>
                    );
                  })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
