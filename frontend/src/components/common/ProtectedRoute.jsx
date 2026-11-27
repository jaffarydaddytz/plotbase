import { useAuth } from "../../context/AuthContext";
import PublicPlatformNavbar from "./PublicPlatformNavbar";

import {
  Navigate,
  Outlet,
  useLocation,
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
      return "/seller/dashboard";

    case "investor":
    case "buyer":
    default:
      return "/";
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

const AuthenticationLoader = ({ isRems = false }) => {
  return (
    <div className="min-h-dvh bg-zinc-50 pt-[60px]">

      {isRems ? <Navbar /> : <PublicPlatformNavbar />}

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

  const { pathname } = useLocation();

const isRemsRoute =
  pathname === "/rems" ||
  pathname.startsWith("/rems/");

  // ---------------------------------------------------
  // AUTHENTICATION LOADING
  // ---------------------------------------------------

if (loading) {
  return <AuthenticationLoader isRems={isRemsRoute} />;
}

  // ---------------------------------------------------
  // USER MUST BE AUTHENTICATED
  // ---------------------------------------------------

if (!user) {
  return (
    <Navigate
      to={isRemsRoute ? "/rems/login" : "/login"}
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

  const { pathname, state } = useLocation();

  const isRemsRoute =
    pathname === "/rems" ||
    pathname.startsWith("/rems/") ||
    (pathname === "/verify-email" && state?.isRems === true);

  if (loading) {
    return <AuthenticationLoader isRems={isRemsRoute} />;
  }

  if (user) {
    return (
      <Navigate
        to={
          isRemsRoute
            ? "/rems"
            : getDashboardPath(user.role)
        }
        replace
      />
    );
  }

  return <Outlet />;
};