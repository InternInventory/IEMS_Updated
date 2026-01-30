import {
  MdOutlineDashboard,
  MdLaptop,
  MdOutlinePeopleAlt,
  MdOutlineAddLocationAlt,
  MdOutlineNotListedLocation,
  MdGroups,
  MdFlag,
  MdMap,
  MdLocationCity,
  MdLocationOn,
  MdList,
} from "react-icons/md";
import { LiaFileDownloadSolid } from "react-icons/lia";
import { IoAlertCircleSharp, IoNotificationsSharp } from "react-icons/io5";
import { CiLocationOn } from "react-icons/ci";
// import { FaUser } from "react-icons/fa";
import { FaTools } from "react-icons/fa";

export const routes = [


  {
    title: "Dashboard",
    href: "/dashboard",
    Icon: MdOutlineDashboard,
  },

  {
    title: "Device List",
    href: "/devices",
    Icon: MdList,
    elementImport: () => import("./components/device/DeviceListPage"),
    elementName: "default",
  },
  {
    title: "Device Management",
    href: "/device-list",
    Icon: MdLaptop,
  },
  {
    title: "Clients",
    href: "/client",
    Icon: MdGroups,
  },
  {
    title: "Location List",
    href: "/locations",
    Icon: MdLocationOn,
  },
  {
    title: "Location Management",
    Icon: CiLocationOn,
    href: "/location-list",
  },
  {
    title: "User Management",
    href: "/user",
    Icon: MdOutlinePeopleAlt,
  },
  {
    title: "Alerts",
    href: "/alerts",
    Icon: IoAlertCircleSharp,
  },
  {
    title: "Notifications",
    href: "/notifications",
    Icon: IoNotificationsSharp,
  },
  {
    title: "Report",
    href: "#",
    Icon: LiaFileDownloadSolid,
  },
  {
    title: "System Management",
    Icon: FaTools,
    subRoutes: [
      {
        title: "SI",
        href: "/system-management",
        Icon: FaTools,
      },
      {
        title: "Country",
        href: "/master/country",
        Icon: MdFlag,
      },
      {
        title: "Region",
        href: "/master/region",
        Icon: MdMap,
      },
      {
        title: "State",
        href: "/master/state",
        Icon: MdLocationCity,
      },
      {
        title: "City",
        href: "/master/city",
        Icon: MdLocationOn,
      },
    ],
  },
  
];
