import { useAuth } from "../../context/AuthContext";

import {
  Navigate,
  Outlet,
} from "react-router-dom";

import Navbar from "./Navbar";
import Loader from "./Loader";

// =====================================================
// ROLE-BASED REDIRECTS
// =====================================================

const getDashboardPath = (role) => {
  switch (role) {
    case "admin":
      return "/admin-dashboard";

    case "seller":
      // Legacy seller dashboard
      return "/seller/dashboard";

    case "investor":
    case "buyer":
      // Public project discovery
      return "/projects";

    default:
      return "/projects";
  }
};

// =====================================================
// AUTHENTICATION LOADING SCREEN
// =====================================================

// Keep the Navbar visible while authentication
// is being verified.
//
// The loader appears below the Navbar.
//
// Protected page content is NOT rendered until
// the authentication check completes.

const AuthenticationLoader = () => {
  return (
    <div className="min-h-dvh bg-zinc-50 pt-[60px]">
      {/* Navbar stays visible */}
      <Navbar />

      {/* Plotbase Text Shimmer */}
      <Loader />
    </div>
  );
};

// =====================================================
// PROTECTED ROUTE
// =====================================================

export const ProtectedRoute = ({
  allowedRoles,
}) => {
  const { user, loading } = useAuth();

  // ---------------------------------------------------
  // AUTHENTICATION LOADING
  // ---------------------------------------------------

  if (loading) {
    return <AuthenticationLoader />;
  }

  // ---------------------------------------------------
  // USER MUST BE AUTHENTICATED
  // ---------------------------------------------------

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // ---------------------------------------------------
  // CHECK GLOBAL ROLE PERMISSIONS
  // ---------------------------------------------------

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to={getDashboardPath(user.role)}
        replace
      />
    );
  }

  // ---------------------------------------------------
  // RENDER AUTHORIZED PAGE
  // ---------------------------------------------------

  return <Outlet />;
};

// =====================================================
// PUBLIC ROUTE
// =====================================================

// Prevent authenticated users from accessing
// login and registration pages.

export const PublicRoute = () => {
  const { user, loading } = useAuth();

  // ---------------------------------------------------
  // AUTHENTICATION LOADING
  // ---------------------------------------------------

  if (loading) {
    return <AuthenticationLoader />;
  }

  // ---------------------------------------------------
  // REDIRECT AUTHENTICATED USERS
  // ---------------------------------------------------

  if (user) {
    return (
      <Navigate
        to={getDashboardPath(user.role)}
        replace
      />
    );
  }

  // ---------------------------------------------------
  // RENDER PUBLIC PAGE
  // ---------------------------------------------------

  return <Outlet />;
};