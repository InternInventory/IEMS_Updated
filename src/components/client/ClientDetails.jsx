import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "../../assets/styles/common.css";
import { useTheme } from "../../context/ThemeContext";
// import Dashboard from "../dashboard/Dashboard";
import "./client.css";
import LocationTableComponent from "./LocationTableComponent";
import ClientDashboard from "../dashboard/ClientDashBoard";
import ChecklistReportsList from "../checklist/ChecklistReportsList";

const ClientDetails = () => {
  const { clientId } = useParams();
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const [tabIndex, setTabIndex] = useState(0);
  const [clientData, setClient] = useState(null);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  
  // ✅ Fetch client details
  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        // ✅ Correct endpoint for client details
        const response = await axios.get(`${apiURL}/client/${clientId}`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization":
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
        });

        console.log("Client details fetched:", response.data);
        setClient(response.data);
      } catch (error) {
        console.error("Error fetching client details:", error);
      }
    };

    if (clientId) fetchClientDetails();
  }, [clientId]);

  // ✅ Fetch client locations
  useEffect(() => {
    const fetchClientLocations = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.get(`${apiURL}/${clientId}/locations`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization":
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
        });

        console.log("Locations fetched:", response.data);
        setLocations(response.data);
      } catch (error) {
        console.error("Error fetching client locations:", error);
      }
    };

    if (clientId) fetchClientLocations();
  }, [clientId]);

  // ✅ Fetch client users
  useEffect(() => {
    const fetchClientUsers = async () => {
      setUsersLoading(true);
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.get(`${apiURL}/users-for-that-client/${clientId}`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization":
              localStorage.getItem("token") || sessionStorage.getItem("token"),
          },
        });

        console.log("Users fetched:", response.data);
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching client users:", error);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    if (clientId) fetchClientUsers();
  }, [clientId]);

  if (!clientData) {
    return <div className="component-body">Loading client details...</div>;
  }

  return (
    <div className={`p-5 ${!isDarkMode ? 'bg-[#f8f9fa]' : ''}`}>
      <div className={`page-header select-none ${!isDarkMode ? 'bg-white' : ''}`}>
        <h1 className={isDarkMode ? 'text-white' : 'text-gray-900'}>Client Details</h1>
      </div>

      {/* ✅ Client Card */}
      <div className={`flex items-center w-full h-auto p-1 mt-0 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-[rgba(15,23,43,0.8)] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
        <div className="item-container">
          <div className="card-item">
            <img
              src={clientData.logo_url || "https://via.placeholder.com/100"}
              alt="Logo"
              className="h-px-50 w-40 object-contain center client-image"
            />
          </div>
          <div className="card-item">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Client Name</span>
            <span className={`font-bold pt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{clientData.org_name}</span>
          </div>
          <div className="card-item hidden-1">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Contact Person</span>
            <span className={`font-bold pt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {clientData.contact_person_name || "N/A"}
            </span>
          </div>
          <div className="card-item hidden-1">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Contact Number</span>
            <span className={`font-bold pt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {clientData.contact_person_mobile || "N/A"}
            </span>
          </div>
          <div className="card-item hidden">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Created Date</span>
            <span className={`font-bold pt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {new Date(clientData.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="card-item">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status</span>
            <span className={`font-bold pt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {clientData.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* ✅ Tabs Section */}
      <div className="w-full">
        <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
          <TabList>
            <Tab>Dashboard</Tab>
            <Tab>Location</Tab>
            <Tab>User</Tab>
            <Tab>ServiceReport</Tab>
          </TabList>

          <TabPanel>
            <ClientDashboard />
          </TabPanel>

          <TabPanel>
            {/* ✅ Pass the locations state here */}
            <LocationTableComponent locations={locations} />
          </TabPanel>

          <TabPanel>
            <div className={`p-2 rounded-lg mt-4 ${isDarkMode ? 'bg-[#0F172B]' : 'bg-white border border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Client Users</h3>
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Users: <span className={`font-bold ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>{users.length}</span>
                </span>
              </div>
              
              {usersLoading ? (
                <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading users...</div>
              ) : users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={isDarkMode ? 'bg-[#1e293b]' : 'bg-gray-100'}>
                      <tr>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Username</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contact</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Designation</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Role</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Country</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, idx) => (
                        <tr key={user.id} className={`border-b transition ${isDarkMode ? 'border-gray-700 hover:bg-[#1e293b]/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{user.username}</td>
                          <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{`${user.fname} ${user.lname}`}</td>
                          <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.email}</td>
                          <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.contact_no}</td>
                          <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.designation || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                              {user.role_name}
                            </span>
                          </td>
                          <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.country_name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                user.is_active
                                  ? isDarkMode ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
                                  : isDarkMode ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No users found for this client
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel>
            <div className="w-full space-y-6">
              {/* Service Report Section */}
              <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Device Checklist Reports</h3>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    + Add Service Report
                  </button>
                </div>

                <ChecklistReportsList orgId={clientData?.org_id} />
              </div>

              {/* AMC Information Section */}
              <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#0F172B] border-[#1e293b]' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>AMC (Annual Maintenance Contract)</h3>
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Update AMC Details
                  </button>
                </div>

                <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <svg className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <p className="text-lg">No AMC details available</p>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Add AMC information to track maintenance contracts</p>
                </div>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDetails;
