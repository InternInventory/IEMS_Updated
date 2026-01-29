import { Navbar } from "./components/navbar/Navbar";
import Login from "./components/login/Login";
import Dashboard from "./components/dashboard/Dashboard";
import Client from "./components/client/Client";
import ClientDetails from "./components/client/ClientDetails";
import ClientForm from "./components/client/ClientForm";
import Neonir from "./components/client/neon/neonir";
import Libi from "./components/client/Libi";
import Neonmodbus from "./components/client/neon/neonmodbus";
import Neonrelay from "./components/client/neon/neonrelay";
import ClientDashboard from "./components/dashboard/ClientDashBoard";
import Libi3p from "./components/client/Libi3p";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import CreateClient from "./components/client/CreateClient";
// import EditClient from "./components/client/EditClient";
import Alert from "./components/alert/Alert";
import AlertsLog from "./components/alert/AlertsLog";
import Notifications from "./components/notification/Notifications"; 
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Location from "./components/location/Location";
import LocationDetails from "./components/location/LocationDetails";
// import CreateLocation from "./components/location/CreateLocation";
import AddDevice from "./components/device/AddDevice";
import Users from "./components/user/Users";
import DeviceList from "./components/deviceManagement/DeviceList";
import DeviceListPage from "./components/device/DeviceListPage";

import LocationListPage from "./components/location/LocationListPage";

import Register from "./components/login/Register"; // Import SignUp component
import OtpVerification from "./components/login/OtpVerification"; // Import OtpVerification component
import ResetPassword from "./components/login/ResetPassword"; // Import ResetPassword component
import ForgotPassword from "./components/login/ForgotPassword";
// Import DeviceEdit component
import CreateUser from "./components/user/CreateUser";

import EditUser from "./components/user/EditUser";
import SI from "./components/system-management/system-management";
import SI_Details from "./components/system-management/SI_Details";
import CreateSI from "./components/system-management/CreateSI";
import EditSI from "./components/system-management/EditSI";
import ViewLocation from "./components/client/ViewLocation";
import LocationForm from "./components/location/CreateLocation";
import Country from "./components/system-management/Country";
import City from "./components/system-management/City";
import Region from "./components/system-management/Region";
import State from "./components/system-management/State";
// import CreateCountry from "./components/masterManagement/createEditCountry";
import CountryForm from "./components/system-management/createEditCountry";
import RegionForm from "./components/system-management/createEditRegion";
import StateForm from "./components/system-management/createEditState";
import CityForm from "./components/system-management/createEditCity";
import BigIODeviceAddForm from "./components/deviceManagement/DeviceAddbigIo"
import BinUploads from "./components/system-management/BinUploads";

// import LibiDeviceCard from "./components/client/Libi";
import DeviceIATMForm from "./components/deviceManagement/CreateEditIATM";
import BigIODeviceForm from "./components/deviceManagement/CreateEditBigIo";
import NeonDeviceForm from "./components/deviceManagement/CreateEditNeon";
import LibDeviceForm from "./components/deviceManagement/CreateEditlib";
import ThreePLibDeviceForm from "./components/deviceManagement/CreateEdit3plib";
import ScheduleManager from "./components/ScheduleManager/NeonSM";
import Lib3pScheduleManager  from "./components/ScheduleManager/lib3pSM";
import LibScheduleManager from "./components/ScheduleManager/libSM";
import ChecklistReportDetail from "./components/checklist/ChecklistReportDetail";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useEffect } from "react";
import { useTheme } from "./context/ThemeContext";
import PDFReport from "./components/client/PDFReport";


export default function App() {
    const { theme } = useTheme();

  const bgColor = theme === "dark" ? "#0F172B" : "#ffffff";
  const textColor = theme === "dark" ? "#ffffff" : "#0F172B";
 
  useEffect(() => {
    const bgColor = theme === "dark"
      ? "rgb(10 16 31 / var(--tw-bg-opacity))"
      : "#f0f2f5"; // soft dull white for light mode

    const textColor = theme === "dark" ? "#ffffff" : "#0F172B";

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = textColor;
   
  }, [theme]);
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/otpVerification" element={<OtpVerification />} />
        <Route path="/resetPassword" element={<ResetPassword />} />
        
        
        {/* Protected Routes - All routes wrapped in ProtectedRoute */}
        <Route element={<ProtectedRoute />}>
          <Route
            element={<Navbar bgColor={bgColor} textColor={textColor} />}
          >
          
          <Route path="dashboard" element={<Dashboard title="Dashboard" />} />
          <Route path="client" element={<Client />} />
          <Route path="client-details/:clientId" element={<ClientDetails />} />
          <Route path="/client/:clientId/dashboard" element={<ClientDashboard />} />
          <Route path="devices" element={<DeviceListPage />} />
          {/* <Route path="create-client" element={<CreateClient />} />
          <Route path="edit-client/:clientId" element={<EditClient />} /> */}
          <Route path="/client/create" element={<ClientForm />} />
          <Route path="/client/edit/:clientId" element={<ClientForm />} />
          <Route path="user" element={<Users />} />
          <Route path="edit-user/:id" element={<EditUser />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="alerts" element={<Alert />} />
          <Route path="alerts-log" element={<AlertsLog />} />
          <Route path="notifications" element={<Notifications />} />
          {/* <Route path="device-list" element={<Devicelist />} /> */}
         
          <Route path="device-list" element={<DeviceList />} />
          <Route path="locations" element={<LocationListPage />} />
          
          <Route path="/device-add" element={<DeviceIATMForm />} />
          <Route path="/device-edit/:dev_id" element={<DeviceIATMForm />} />
          <Route path="/bigio-device-edit/:dev_id" element={<BigIODeviceForm />} />
          <Route path="/neon-device-edit/:dev_id" element={<NeonDeviceForm />} />
          <Route path="/bigio-device-add" element={<BigIODeviceForm />} />
          <Route path="/neon-device-add" element={<NeonDeviceForm />} />
          <Route path="location" element={<ViewLocation />} />
          <Route path="location-list" element={<Location />} />
     
          {/* <Route path="/device-add" element={<DeviceAdd />} /> */}
          {/* <Route path="/device-edit/:dev_id" element={<DeviceEdit />} /> */}
          <Route path="/bigio-device-add" element={<BigIODeviceAddForm />} />

          <Route path="location" element={<ViewLocation />} />
          <Route path="location-list" element={<Location />} />

          <Route
            path="Location-details/:locationId"
            element={<LocationDetails />}
          />
          {/* <Route path="create-location" element={<CreateLocation />} /> */}
          <Route path="add-device" element={<AddDevice />} />

          <Route path="system-management" element={<SI />} />
          <Route path="si-details/:siId" element={<SI_Details />} />
          <Route path="create-si" element={<CreateSI />} />
          <Route path="edit-si/:siId" element={<EditSI />} />
          <Route path="bin-uploads" element={<BinUploads />} />

          <Route path="create-location" element={<LocationForm />} />
          <Route path="edit-location/:id" element={<LocationForm />} />
          {/* <Route path="/location/:locationId" element={<ViewLocation />} /> */}

          <Route path="/master/country" element={<Country />} />
          <Route path="/create-country" element={<CountryForm />} />
          <Route path="/edit-country/:id" element={<CountryForm />} />


          <Route path="/master/region" element={<Region />} />
          <Route path="/create-region" element={<RegionForm />} />
          <Route path="/edit-region/:id" element={<RegionForm />} />

          <Route path="/master/state" element={<State />} />
          <Route path="/create-state" element={<StateForm />} />
          <Route path="/edit-state/:id" element={<StateForm />} />

          <Route path="/master/city" element={<City />} />
          <Route path="/create-city" element={<CityForm />} />
          <Route path="/edit-city/:id" element={<CityForm />} />

          <Route path="create-location" element={<LocationForm />} />
          <Route path="edit-location/:id" element={<LocationForm />} />

          <Route path="Neonir/:did" element={<Neonir />} />
          <Route path="neonmodbus/:did" element={<Neonmodbus />} />
          <Route path="neonrelay/:did" element={<Neonrelay />} />
          <Route path="lib-device-edit/:dev_id" element={<LibDeviceForm />} />
          <Route path="lib-device-add" element={<LibDeviceForm />} />
          <Route path="libi-device-edit/:dev_id" element={<LibDeviceForm />} />
          <Route path="libi-device-add" element={<LibDeviceForm />} />
          <Route path="3plib-device-edit/:dev_id" element={<ThreePLibDeviceForm />} />
          <Route path="3plib-device-add" element={<ThreePLibDeviceForm />} />
          <Route path="3p-libi-device-edit/:dev_id" element={<ThreePLibDeviceForm />} />
          <Route path="3p-libi-device-add" element={<ThreePLibDeviceForm />} />
          <Route path="lib/:did" element={<Libi />} />
          
          <Route path="/device/schedule" element={<ScheduleManager />} />

          <Route path="lib3p/:did" element={<Libi3p />} />
          <Route path="lib3p/device/schedule" element={<Lib3pScheduleManager  />} />
          <Route path="lib/device/schedule" element={<LibScheduleManager />} />
          
          <Route path="checklist-report/:reportId" element={<ChecklistReportDetail />} />
          
          </Route>
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
     
    </Router>
  );
}
