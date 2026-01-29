import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "../../assets/styles/common.css";
import Dashboard from "../dashboard/Dashboard";
import "./system-management.css";

const SI_Details = () => {
  const { siId } = useParams();
  const [tabIndex, setTabIndex] = useState(0);
  const [siData, setSI] = useState(null);

  useEffect(() => {
    const fetchSIDetails = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        const response = await axios.get(`${apiURL}/si/${siId}`,{
          headers: {
            "Content-Type": "application/json",
            "Authorization": `${localStorage.getItem("token")||sessionStorage.getItem("token")}`, 
          },
        });
        
        console.log("SI details fetched:", response.data);
        setSI(response.data);
      } catch (error) {
        console.error("Error fetching SI details:", error);
      }
    };

    fetchSIDetails();
  }, [siId]);

  if (!siData) {
    return <div className="component-body">Loading si details...</div>;
  }

  return (
    <div className="component-body">
      <div className="page-header select-none">
        <h1>SI Details</h1>
      </div>
      <div className="si-card">
        <div className="item-container">
          <div className="card-item">
            <img
              src={siData.logoUrl || "https://via.placeholder.com/100"}
              alt="Logo"
              className="si-image"
            />
            <div className="divider-line"></div>
          </div>
          <div className="card-item">
            <span>SI Name</span>
            <span className="font-bold pt-2">{siData.siName}</span>
            <div className="divider-line"></div>
          </div>
          
          
          <div className="card-item hidden">
            <span>Created Date</span>
            <span className="font-bold pt-2">
  {siData.created_at
    ? new Date(siData.created_at).toLocaleDateString()
    : "N/A"}
</span>

            <div className="divider-line"></div>
          </div>
          <div className="card-item">
            <span>Status</span>
            <span className="font-bold pt-2">{siData.status ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </div>

      Tabs Section
      <div className="w-full mt-4">
        <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
          <TabList>
            <Tab>Dashboard</Tab>
            <Tab>Location</Tab>
            <Tab>User</Tab>
          </TabList>

          <TabPanel>
            <Dashboard />
          </TabPanel>
          <TabPanel>
            <h2>Location Content</h2>
            <p>Details about the client's locations go here.</p>
          </TabPanel>
          <TabPanel>
            <h2>User Content</h2>
            <p>Details about the client's users go here.</p>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default SI_Details;
