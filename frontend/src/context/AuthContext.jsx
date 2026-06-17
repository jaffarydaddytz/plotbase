import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

import API_URL from "../config";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("token") || sessionStorage.getItem("token") || null,
  );


  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      const storedUser =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }

    setLoading(false);
    

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response &&
          error.response.status === 403 &&
          error.response.data.message.includes("blocked")
        ) {
          logout();
        }

        return Promise.reject(error);
      },
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  //login function
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = res.data;
      setToken(token);
      setUser(user);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      return {
        success: true,
      };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Login denied or failed",
      };
    }
  };


  //register 

  const register = async (userData)=>{
    try {
        const res = await axios.post(`${API_URL}/api/auth/register`, userData)

        return {
            success: true,
            message: res.data.message
        }
    } catch (err) {
        return {
        success: false,
        message: err.response?.data?.message || "registration failed",
      };
        
    }

  }

// to logout
const logout =()=>{
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
};

// to get the user details
const refreshUser = async () => {
    if(!token) return ;
    try {
        const res = await axios.get(`${API_URL}/api/auth/me`, {
            header: {Authorization: `Bearer ${token}`},

        });

        if(res.data.success) {
            const updatedUser = res.data.user;
            setUser(updatedUser);
            const storage = localStorage.getItem("token");
        }
        
    } catch (err) {
      console.error("Failed to refresh the user", err);
        
    }
}
  return <AuthContext.Provider value={{
    user,
    setUser,
    token,
    loading,
    login,
    register,
    logout,
    refreshUser

  }}  >

    {children}


  </AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
