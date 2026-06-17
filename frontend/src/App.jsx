import React, { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import LandingPage from "./pages/shared/LandingPage";
import Properties from "./pages/shared/Properties";
import PropertyDetails from "./pages/shared/PropertyDetails";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Login from "./pages/auth/Login";
import Profile from "./pages/shared/Profile";
import AdminLayout from "./components/common/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import SellerRequests from "./pages/admin/SellerRequests";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminContacts from "./pages/admin/AdminContacts";
import SellerLayout from "./components/common/SellerLayout";
import SellerDashboard from "./pages/seller/SellerDashboard";
import AddProperty from "./pages/seller/AddProperty";
import EditProperty from "./pages/seller/EditProperty";
import { FaChevronUp } from "react-icons/fa";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/common/ProtectedRoute";
import MyProperties from "./pages/seller/MyProperties";
import MyInquiries from "./pages/buyer/MyInquiries";
import ChatMessages from "./pages/shared/ChatMessages";
import Contact from "./pages/shared/Contact";



const ScrollToTopOnRouteChange = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  },[pathname]);
  return null;
};


const ScrollTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${visible ? "scale-100 opacity-100 bg-emerald-500 text-white hover:bg-green-400" : "pointer-events-none scale-0 opacity-0 "}`}
    >
      <FaChevronUp size={22} />
    </button>
  );
};

{/ * smart layout wrapper for seller and buyer * /}

const SellerLayoutWrapper = () => {
  const { user } = useAuth();

  if (user?.role !== "seller") return <Navigate to="/" replace />;

  return <Outlet />;
};

const App = () => {
  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";

    return () => {
      document.body.style.overflowX = "";
      document.documentElement.style.overflowX = "";
    };
  }, []); 

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <ScrollToTopOnRouteChange />
      <ScrollTopButton />

      <Routes>

        {/* PUBLIC AUTH */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        {/* PUBLIC PAGES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:id" element={<PropertyDetails />} />

        {/* PROTECTED AREA */}
        <Route element={<ProtectedRoute allowedRoles={["buyer", "seller", "admin"]} />}>

          {/* SELLER + SHARED LAYOUT */}
          <Route element={<SellerLayout />}>

            {/* PROFILE (FIXED: now has sidebar/header) */}
            <Route path="/profile" element={<Profile />} />
             <Route path="/inquiries" element={<MyInquiries/>} />
              <Route path="/contact" element={<Contact/>} />
             
             <Route path="/chat-messages" element={<ChatMessages/>} />

            {/* SELLER ONLY */}
            <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
              <Route path="/dashboard" element={<SellerDashboard />} />
              <Route path="/seller-dashboard" element={<SellerDashboard />} />
              <Route path="/add-property" element={<AddProperty />} />
              <Route path="/my-properties" element={<MyProperties />} />
              <Route path="/edit-property/:id" element={<EditProperty />} />
            </Route>

          </Route>

          {/* ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/seller-requests" element={<SellerRequests />} />
              <Route path="/admin/properties" element={<AdminProperties />} />
              <Route path="/admin/inquiries" element={<AdminInquiries />} />
              <Route path="/admin/contacts" element={<AdminContacts />} />
            </Route>
          </Route>

        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>



    </div>
  );
};

export default App;
