
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TableComponent from "./TableComponent";
import "./users.css";
import useAuthFetch from '../hooks/useAuthFetch';


const User = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const authFetch = useAuthFetch();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_BASE_URL;
        // If clientId is present, fetch users for that client, otherwise fetch all users
        const endpoint = clientId 
          ? `${apiURL}/users-for-that-client/${clientId}`
          : `${apiURL}/users`;
        
        const response = await authFetch({
          url: endpoint,
          method: "GET"
        });
        console.log("Fetched users:", response.status, response.data);
        if (response.status !== 200) {
          throw new Error("Failed to fetch users");
        }
        setUsers(response.data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUsers();
  }, [clientId]);

  return (
    <div className="component-body">
      {/* <h1 className="page-header select-none">User Management</h1> */}
      <div className="w-full mt-0">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <TableComponent users={users} />
        )}
      </div>
    </div>
  );
};

export default User;

// Move this inside the component if you want to use navigate()
export const handleCreateUser = () => {
  const navigate = useNavigate();
  navigate("/create-user");
};
