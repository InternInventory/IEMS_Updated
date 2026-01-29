import axios from "axios";

export const verifyToken = async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  if (!token) return { valid: false };

  try {
    const apiURL = import.meta.env.VITE_API_BASE_URL;
    await axios.get(`${apiURL}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { valid: true };
  } catch (error) {
    console.error("Token verification failed:", error);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    return { valid: false };
  }
};
