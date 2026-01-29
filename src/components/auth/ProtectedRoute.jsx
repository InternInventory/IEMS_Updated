import { Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true = authenticated, false = not authenticated
  const [isLoading, setIsLoading] = useState(true);

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Verify token with backend
        await axios.get(`${API_BASE}/dashboard`, {
          headers: { authorization: token },
        });
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Token verification failed:", error);
        // Clear invalid tokens
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        sessionStorage.removeItem("userId");
        localStorage.removeItem("userId");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, API_BASE]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f1c]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-white text-lg">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Render protected content
  return <Outlet />;
};

export default ProtectedRoute;
