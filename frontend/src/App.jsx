import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { FaChevronUp } from "react-icons/fa";

// ============================================
// PUBLIC PAGES
// ============================================

import Properties from "./pages/shared/Properties";
import PropertyDetails from "./pages/shared/PropertyDetails";
import PropertyDetailPage from "./pages/shared/propertyDetailPage";

// ============================================
// AUTHENTICATION
// ============================================

import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import {
  ProtectedRoute,
  PublicRoute,
} from "./components/common/ProtectedRoute";

// ============================================
// SHARED PAGES
// ============================================

import Profile from "./pages/shared/Profile";
import ChatMessages from "./pages/shared/ChatMessages";
import Contact from "./pages/shared/Contact";

// ============================================
// INVESTOR PAGES
// ============================================

import MyInquiries from "./pages/buyer/MyInquiries";
import Wishlist from "./pages/buyer/Wishlist";

// ============================================
// ADMIN LAYOUT AND PAGES
// ============================================

import AdminLayout from "./components/common/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import SellerRequests from "./pages/admin/SellerRequests";

import CompanyVerification from "./pages/admin/CompanyVerification";

// NEW: Company Verification Details
import CompanyVerificationDetails from "./pages/admin/CompanyVerificationDetails";

import AdminProperties from "./pages/admin/AdminProperties";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminComingSoon from "./pages/admin/AdminComingSoon";

// ============================================
// SELLER LAYOUT AND PAGES
// ============================================

import SellerLayout from "./components/common/SellerLayout";
import SellerDashboard from "./pages/seller/SellerDashboard";
import AddProperty from "./pages/seller/AddProperty";
import EditProperty from "./pages/seller/EditProperty";
import MyProperties from "./pages/seller/MyProperties";

// ============================================
// COMPANY PAGES
// ============================================

import CompanyProjects from "./pages/company/projects/CompanyProjects";
import CreateProject from "./pages/company/projects/CreateProject";
import RegisterCompany from "./pages/company/RegisterCompany";
import CompanyCenter from "./pages/company/CompanyCenter";

/* =====================================================
   SCROLL TO TOP ON ROUTE CHANGE
===================================================== */

const ScrollToTopOnRouteChange = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  return null;
};

/* =====================================================
   SCROLL TO TOP BUTTON
===================================================== */

const ScrollTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to top"
      title="Back to top"
      className={`fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-white shadow-lg transition-all duration-300 hover:bg-zinc-800 ${
        visible
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-0 opacity-0"
      }`}
    >
      <FaChevronUp size={15} />
    </button>
  );
};

/* =====================================================
   MAIN APPLICATION
===================================================== */

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
        {/* ============================================
            PUBLIC AUTHENTICATION
        ============================================ */}

        <Route element={<PublicRoute />}>
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/verify-email"
            element={<VerifyEmail />}
          />
        </Route>

        {/* PASSWORD RECOVERY */}

<Route
  path="/forgot-password"
  element={<ForgotPassword />}
/>

<Route
  path="/reset-password/:token"
  element={<ResetPassword />}
/>

        {/* ============================================
            PUBLIC PAGES
        ============================================ */}

        {/* DEFAULT LANDING PAGE */}

        <Route
          path="/"
          element={<Navigate to="/projects" replace />}
        />

        {/* PUBLIC PROJECT LISTING */}

        <Route
          path="/projects"
          element={<Properties />}
        />

        {/* LEGACY PROPERTIES URL */}

        <Route
          path="/properties"
          element={<Navigate to="/projects" replace />}
        />

        {/* LEGACY PROJECT DETAILS PAGE */}

        <Route
          path="/propertydetailpage"
          element={<PropertyDetailPage />}
        />

        {/* PROJECT DETAILS */}

        <Route
          path="/property/:id"
          element={<PropertyDetails />}
        />

        {/* ============================================
            COMPANY CENTER AND REGISTRATION
        ============================================ */}

        <Route element={<ProtectedRoute />}>
          {/* COMPANY CENTER */}

          <Route
            path="/company/center"
            element={<CompanyCenter />}
          />

          {/* COMPANY REGISTRATION */}

          <Route
            path="/company/register"
            element={<RegisterCompany />}
          />

          {/* COMPANY APPLICATIONS */}

          <Route
            path="/company/applications"
            element={<RegisterCompany applicationsOnly />}
          />
        </Route>

        {/* ============================================
            INVESTOR ACCESS

            Legacy buyer accounts supported temporarily.
        ============================================ */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["investor", "buyer"]}
            />
          }
        >
          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/messages"
            element={<ChatMessages />}
          />

          <Route
            path="/inquiries"
            element={<MyInquiries />}
          />

          <Route
            path="/wishlist"
            element={<Wishlist />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />
        </Route>

        {/* ============================================
            LEGACY SELLER ACCESS

            Preserve during company architecture migration.
        ============================================ */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["seller"]} />
          }
        >
          <Route element={<SellerLayout />}>
            <Route
              path="/seller/inquiries"
              element={<MyInquiries />}
            />

            <Route
              path="/seller/profile"
              element={<Profile />}
            />

            <Route
              path="/seller/chat-messages"
              element={<ChatMessages />}
            />

            <Route
              path="/seller/contact"
              element={<Contact />}
            />

            <Route
              path="/seller/dashboard"
              element={<SellerDashboard />}
            />

            <Route
              path="/seller-dashboard"
              element={<SellerDashboard />}
            />

            <Route
              path="/add-property"
              element={<AddProperty />}
            />

            <Route
              path="/seller/my-properties"
              element={<MyProperties />}
            />

            <Route
              path="/edit-property/:id"
              element={<EditProperty />}
            />

            {/* TEMPORARY COMPANY PROJECT ROUTES */}

            <Route
              path="/company/projects"
              element={<CompanyProjects />}
            />

            <Route
              path="/company/projects/create"
              element={<CreateProject />}
            />
          </Route>
        </Route>

        {/* ============================================
            ADMIN ACCESS

            Platform administrators only.
        ============================================ */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]} />
          }
        >
          <Route element={<AdminLayout />}>
            {/* ADMIN DASHBOARD */}

            <Route
              path="/admin-dashboard"
              element={<AdminDashboard />}
            />

            {/* ADMIN MARKETPLACE */}
<Route
  path="/admin/marketplace"
  element={<Properties insideAdmin />}
/>

{/* ADMIN MARKETPLACE PROJECT DETAILS */}
<Route
  path="/admin/marketplace/:id"
  element={<PropertyDetails insideAdmin />}
/>

            {/* USER MANAGEMENT */}

            <Route
              path="/admin/users"
              element={<AdminUsers />}
            />

            {/* LEGACY SELLER REQUESTS */}

            <Route
              path="/admin/seller-requests"
              element={<SellerRequests />}
            />

            {/* ========================================
                COMPANY VERIFICATION
            ======================================== */}

            {/* COMPANY APPLICATIONS LIST */}

            <Route
              path="/admin/company-verification"
              element={<CompanyVerification />}
            />

            {/* NEW: INDIVIDUAL COMPANY REVIEW */}

            <Route
              path="/admin/company-verification/:companyId"
              element={<CompanyVerificationDetails />}
            />

            {/* ========================================
                OTHER ADMIN MODULES
            ======================================== */}

            <Route
              path="/admin/properties"
              element={<AdminProperties />}
            />

            <Route
              path="/admin/inquiries"
              element={<AdminInquiries />}
            />

            <Route
              path="/admin/contacts"
              element={<AdminContacts />}
            />

            {/* ========================================
                PLANNED ADMIN MODULES
            ======================================== */}

            <Route
              path="/admin/companies"
              element={<AdminComingSoon />}
            />

            <Route
              path="/admin/projects"
              element={<AdminComingSoon />}
            />

            <Route
              path="/admin/payments"
              element={<AdminComingSoon />}
            />

            <Route
              path="/admin/investment-partners"
              element={<AdminComingSoon />}
            />

            <Route
              path="/admin/audit-logs"
              element={<AdminComingSoon />}
            />

            <Route
              path="/admin/settings"
              element={<AdminComingSoon />}
            />
          </Route>
        </Route>

        {/* ============================================
            FALLBACK
        ============================================ */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </div>
  );
};

export default App;