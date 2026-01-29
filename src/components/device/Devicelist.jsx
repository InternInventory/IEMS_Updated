import { useState } from "react";
import "./device.css";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import TableComponent from "./TableComponent";

const Devicelist = () => {
  const [tabIndex, setTabIndex] = useState(0);

  const clients = [
    {
      deviceId: "ICICI Bank", 
      locationId: "SB26621F62",
      address: "066",
      contact: "9092347820",
      email: "arunram12@gmail.com",
      org: "Diebold",
      status: "Active",
      category: "i-ATM",
    },
    {
      deviceId: "UNION Bank",
      locationId: "SB26621F62",
      address: "066",
      contact: "9092347820",
      email: "arunram12@gmail.com",
      org: "Diebold",
      status: "Active",
      category: "Piazza",
    },
  
  ];

  return (
    <>
      <div className="component-body">
        <h1 className="page-header select-none">Device Management</h1>
        <div className="w-full mt-4">
          <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
            <TabList>
              <Tab>i-ATM</Tab>
              <Tab>Piazza</Tab>
              <Tab>iZion</Tab>
            </TabList>

            <TabPanel>
              <TableComponent clients={clients.filter(client => client.category === "i-ATM")} />
            </TabPanel>
            <TabPanel>
              <TableComponent clients={clients.filter(client => client.category === "Piazza")} />
            </TabPanel>
            <TabPanel>
              <TableComponent clients={clients.filter(client => client.category === "iZion")} />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Devicelist;
