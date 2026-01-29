import { useClickAway } from "react-use";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CgProfile } from "react-icons/cg";
import { RiArrowDropDownLine } from "react-icons/ri";
import { IoSettingsOutline, IoLogOutOutline, IoCloudUploadOutline } from "react-icons/io5";
import { IoIosHelpCircleOutline } from "react-icons/io";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";


const ProfileDropdown = ({ bgColor, textColor, handleLogout }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [userName, setUserName] = useState({ fname: "", lname: "" });
  const [roleName, setRoleName] = useState("User Role");
  const ref = useRef(null);
  useClickAway(ref, () => {
    setOpen(false);
  });
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.get(`${apiURL}/userDetails`, {
          headers: {
            Authorization: `${localStorage.getItem("token") || sessionStorage.getItem("token")}` // replace `token` with your actual token variable
          }
        });
        const { fname, lname, role_name } = response.data;
        setUserName({ fname, lname });
        setRoleName(role_name);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }

    };
    fetchUserData();
  }, []);

  const dropDown = [
    {
      label: "Settings",
      action: () => setOpen(true),
      Icon: IoSettingsOutline,
    },
    {
      label: "Help",
      action: () => setOpen(false),
      Icon: IoIosHelpCircleOutline,
    },
    {
      label: "Bin Uploads",
      action: () => navigate('/bin-uploads'),
      Icon: IoCloudUploadOutline,
    },
    {
      label: "Logout",
      action: handleLogout,
      Icon: IoLogOutOutline,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <div
        className="profile-dropdown-container"
        onClick={() => setOpen((prev) => !prev)}
      >
        <CgProfile size={25} style={{ color: theme === 'light' ? '#000000' : textColor }} />
        <div>
          <div className="profile-dropdown-user" style={{ color: theme === 'light' ? '#000000' : textColor }}>
            {capitalize(userName.fname)} {capitalize(userName.lname)}
          </div>
          <div className="profile-dropdown-role" style={{ color: theme === 'light' ? '#000000' : textColor }}>
            {roleName}
          </div>
        </div>
        <RiArrowDropDownLine
          size={20}
          style={{ color: theme === 'light' ? '#ffffff' : textColor }}
          className="profile-dropdown-arrow"
        />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "-10%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-10%", opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="profile-dropdown-content"
            style={{ backgroundColor: bgColor }}
          >
            <ul className="grid gap-1 2xl:gap-3 md:gap-0.5">
              {dropDown.map((item, idx) => {
                const { Icon } = item;
                return (
                  <motion.li
                    key={item.label}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.1 + idx / 40,
                    }}
                    className={`w-full p-[0.08rem] shadow-4xl border-b ${bgColor === '#0F172B' ? 'border-b-white/20 hover:bg-[#19223F]' : 'border-b-gray-200 hover:bg-blue-50'} 2xl:border-b-2`}
                  >
                    <button
                      onClick={() => {
                        setOpen(false);
                        item.action();
                      }}
                      className="flex items-center justify-start w-full p-3 gap-3"
                    >
                      <Icon
                        style={{ color: textColor }}
                        className="cursor-pointer"
                      />
                      <span
                        className="flex gap-1 text-base 2xl:text-xl md:text-sm cursor-pointer"
                        style={{ color: textColor }}
                      >
                        {item.label}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;

