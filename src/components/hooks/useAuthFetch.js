import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

const useAuthFetch = () => {
  const navigate = useNavigate();

  const authFetch = useCallback(async ({ url, method = 'GET', data = null, headers = {} }) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios({
        url,
        method,
        data,
        headers: {
          Authorization: token,
          ...headers,
        },
      });
      return response;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Access Denied');
        navigate('/');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
      throw error; // propagate error if caller wants to catch
    }
  }, [navigate]);

  return authFetch;
};

export default useAuthFetch;
