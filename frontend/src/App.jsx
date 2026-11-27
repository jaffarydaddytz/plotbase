import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FaChevronUp } from "react-icons/fa";

// ==========================================
// PUBLIC PAGES
// ==========================================
import PublicHome from "./pages/public/PublicHome";
import Properties from "./pages/shared/Properties";
import PropertyDetails from "./pages/shared/PropertyDetails";
import PropertyDetailPage from "./pages/shared/propertyDetailPage";
import Mashamba from "./pages/shared/Mashamba";
import Maarifa from "./pages/shared/Maarifa";
import About from "./pages/shared/About";
import AskPlotbase from "./pages/shared/AskPlotbase";
import Footer from "./components/common/Footer";

import { useAuth } from "./context/AuthContext";
import PublicMobileNavigation from "./components/common/PublicMobileNavigation";


// ==========================================
// AUTHENTICATION
// ==========================================

import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import {
  ProtectedRoute,
  PublicRoute,
} from "./components/common/ProtectedRoute";

import CompanyWorkspaceGuard from "./components/common/CompanyWorkspaceGuard";
import PublicProjectDetails from "./pages/shared/PublicProjectDetails";

// ==========================================
// SHARED AND INVESTOR PAGES
// ==========================================

import Profile from "./pages/shared/Profile";
import ChatMessages from "./pages/shared/ChatMessages";
import Contact from "./pages/shared/Contact";
import MyReservations from "./pages/shared/MyReservations";

import MyInquiries from "./pages/buyer/MyInquiries";
import Wishlist from "./pages/buyer/Wishlist";

// ==========================================
// COMPANY PAGES
// ==========================================

import RegisterCompany from "./pages/company/RegisterCompany";
import CompanyCenter from "./pages/company/CompanyCenter";
import CompanyReservations from "./pages/company/CompanyReservations";

import CompanyProjects from "./pages/company/projects/CompanyProjects";
import CreateProject from "./pages/company/projects/CreateProject";
import CompanyProjectDetails from "./pages/company/projects/CompanyProjectDetails";
import EditProject from "./pages/company/projects/EditProject";

import {
  CompanyProjectsLayout,
  CompanyProjectEditorGuard,
} from "./components/common/CompanyProjectsLayout";

// ==========================================
// LEGACY SELLER PAGES
// ==========================================

import SellerLayout from "./components/common/SellerLayout";
import SellerDashboard from "./pages/seller/SellerDashboard";
import AddProperty from "./pages/seller/AddProperty";
import EditProperty from "./pages/seller/EditProperty";
import MyProperties from "./pages/seller/MyProperties";

// ==========================================
// ADMIN PAGES
// ==========================================

import AdminLayout from "./components/common/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import SellerRequests from "./pages/admin/SellerRequests";
import CompanyVerification from "./pages/admin/CompanyVerification";
import CompanyVerificationDetails from "./pages/admin/CompanyVerificationDetails";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminComingSoon from "./pages/admin/AdminComingSoon";

// ==========================================
// SCROLL TO TOP ON ROUTE CHANGE
// ==========================================

// ==========================================
// SCROLL TO TOP ON ROUTE CHANGE
// ==========================================

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


// ==========================================
// SCROLL TO TOP BUTTON
// ==========================================

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

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      }
      aria-label="Scroll to top"
      title="Back to top"
      className={`fixed bottom-5 left-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-white shadow-lg transition-all duration-300 hover:bg-zinc-800 ${
        visible
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-0 opacity-0"
      }`}
    >
      <FaChevronUp size={15} />
    </button>
  );
};

// ==========================================
// MAIN APPLICATION
// ==========================================

// ==========================================
// MAIN APPLICATION
// ==========================================

const publicMobileRoutes = new Set([
  "/",
  "/ramani",
  "/fikasite",
  "/maarifa",
  "/profile",
  "/about",
  "/contact",
]);

const App = () => {
  const { pathname } = useLocation();
  const { user, loading: authLoading } = useAuth();

  const isPublicRoute = publicMobileRoutes.has(
    pathname.replace(/\/+$/, "") || "/"
  );

  const isPublicMember = ["investor", "buyer"].includes(
    user?.role
  );

  const showPublicMobileNavigation =
    !authLoading &&
    Boolean(user) &&
    isPublicMember &&
    isPublicRoute;

  // ========================================
  // PUBLIC SEO METADATA
  // ========================================

  useEffect(() => {
    const defaultSEO = {
      title: "Plotbase Tanzania | Viwanja, Mashamba & Land Investment",
      description:
        "Discover viwanja, mashamba and land projects in Tanzania with Plotbase.",
    };

    const landSEO = {
      title: "Viwanja Tanzania | Explore Land Projects - Plotbase",
      description:
        "Explore viwanja and land projects across Tanzania. Discover locations, compare plot prices and find land investment opportunities with Plotbase.",
    };

    const seoPages = {
      "/viwanja": landSEO,
      "/projects": landSEO,

      "/mashamba": {
        title: "Mashamba Tanzania | Plotbase",
        description:
          "Discover the upcoming Mashamba experience on Plotbase, focused on agricultural land and farming opportunities in Tanzania.",
      },

      "/maarifa": {
        title: "Maarifa | Land Investment Knowledge - Plotbase",
        description:
          "Explore land investment knowledge, property information and educational resources through Plotbase Maarifa.",
      },

      "/about": {
        title: "About Plotbase | Land Investment Platform Tanzania",
        description:
          "Learn about Plotbase, a platform designed to help people explore land projects and real estate investment opportunities in Tanzania.",
      },

      "/ask-plotbase": {
        title: "Ask Mtaalamu | Plotbase Tanzania",
        description:
          "Ask questions about land, property and real estate investment through Plotbase Mtaalamu.",
      },

      "/": {
  title: "Plotbase Tanzania | Digital Tools for Smarter Real Estate",
  description:
    "Explore Ramani, FikaSite and Maarifa. Digital real estate tools and management solutions for Viwanja na Mashamba in Tanzania.",
},
    };

    const seo = seoPages[pathname] || defaultSEO;

    document.title = seo.title;

    // Update metadata
    const updateMeta = (attribute, key, content) => {
      let element = document.head.querySelector(
        `meta[${attribute}="${key}"]`
      );

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    updateMeta("name", "description", seo.description);
    updateMeta("property", "og:title", seo.title);
    updateMeta("property", "og:description", seo.description);

    // ======================================
    // SEARCH ENGINE INDEXING
    // ======================================

    const shouldIndex = new Set(["/", "/about"]).has(pathname);

    const robots =
      pathname === "/viwanja"
        ? "noindex, follow"
        : shouldIndex
          ? "index, follow"
          : "noindex, nofollow";

    updateMeta("name", "robots", robots);

    // ======================================
    // CANONICAL URL MANAGEMENT
    // ======================================

    const canonicalRoutes = {
      "/": "/",
      "/viwanja": "/viwanja",
      "/projects": "/viwanja",
      "/properties": "/viwanja",
      "/about": "/about",
    };

    const canonicalPath = canonicalRoutes[pathname];

    let canonicalLink = document.querySelector(
      'link[rel="canonical"]'
    );

    if (canonicalPath) {
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }

      canonicalLink.setAttribute(
        "href",
        `https://plotbase.co.tz${canonicalPath}`
      );
    } else {
      canonicalLink?.remove();
    }
  }, [pathname]);

  // ========================================
  // PUBLIC FOOTER ROUTES
  // ========================================

  const publicFooterRoutes = [
      "/",
  "/viwanja",
    "/projects",
    "/mashamba",
    "/maarifa",
    "/about",
    "/propertydetailpage",
  ];

  const showFooter =
    publicFooterRoutes.includes(pathname) ||
    /^\/property\/[^/]+\/?$/.test(pathname);

  // ========================================
  // PREVENT HORIZONTAL OVERFLOW
  // ========================================

  useEffect(() => {
document.body.style.overflowX = "clip";
document.documentElement.style.overflowX = "clip";

    return () => {
      document.body.style.overflowX = "";
      document.documentElement.style.overflowX = "";
    };
  }, []);

  // ========================================
  // APPLICATION ROUTES
  // ========================================

  return (
   <div
  className={`min-h-screen w-full overflow-x-clip ${
    showPublicMobileNavigation
      ? "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      : ""
  }`}
>
      <ScrollToTopOnRouteChange />

    <div
  className={
    showPublicMobileNavigation
      ? "hidden md:block"
      : ""
  }
>
  <ScrollTopButton />
</div>

    

      <Routes>
        {/* ==================================
            AUTHENTICATION
        ================================== */}

<Route element={<PublicRoute />}>
  {/* PUBLIC AUTHENTICATION */}
  <Route path="/login" element={<Login />} />

  <Route path="/register" element={<Register />} />

  {/* REMS AUTHENTICATION */}
  <Route path="/rems/login" element={<Login isRems />} />

  <Route path="/rems/register" element={<Register isRems />} />

  {/* EMAIL VERIFICATION */}
  <Route
    path="/verify-email"
    element={<VerifyEmail />}
  />
</Route>

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password/:token"
          element={<ResetPassword />}
        />

        {/* ==================================
            PUBLIC PAGES
        ================================== */}

 {/* ==================================
    PUBLIC PAGES
================================== */}

<Route path="/" element={<PublicHome />} />

{/* REMS ENTRY POINT */}

{/* ==================================
    REMS MARKETPLACE
================================== */}

<Route path="/rems" element={<Properties />} />

<Route path="/rems/viwanja" element={<Properties />} />

<Route path="/rems/mashamba" element={<Mashamba />} />

<Route path="/rems/maarifa" element={<Maarifa />} />

{/* REMS PROJECT DETAILS */}

<Route
  path="/rems/viwanja/:slug/:projectId"
  element={<PublicProjectDetails />}
/>

<Route
  path="/rems/mashamba/:slug/:projectId"
  element={<PublicProjectDetails />}
/>
<Route path="/contact" element={<Contact />} />

<Route path="/viwanja" element={<Properties />} />

<Route path="/projects" element={<Properties />} />

<Route
  path="/properties"
  element={<Navigate to="/projects" replace />}
/>

<Route path="/mashamba" element={<Mashamba />} />

<Route path="/maarifa" element={<Maarifa />} />

<Route path="/about" element={<About />} />

<Route path="/ask-plotbase" element={<AskPlotbase />} />

<Route
  path="/propertydetailpage"
  element={<PropertyDetailPage />}
/>

<Route
  path="/property/:id"
  element={<PropertyDetails />}
/>
{/* ==================================
    PUBLIC COMPANY PROJECT DETAILS
================================== */}

{/* VIWANJA PROJECT DETAILS */}

<Route
  path="/viwanja/:slug/:projectId"
  element={<PublicProjectDetails />}
/>

{/* MASHAMBA PROJECT DETAILS */}

<Route
  path="/mashamba/:slug/:projectId"
  element={<PublicProjectDetails />}
/>

{/* LEGACY PROJECT URL - REDIRECT SUPPORT */}

<Route
  path="/project/:projectId"
  element={<PublicProjectDetails />}
/>

        {/* ==================================
            COMPANY WORKSPACE
        ================================== */}

<Route element={<ProtectedRoute />}>



  {/* COMPANY CENTER */}

  <Route
    path="/company/center"
    element={<CompanyCenter />}
  />

          {/* ==================================
              COMPANY PROJECT MANAGEMENT
              SHARED SIDEBAR LAYOUT
          ================================== */}

          <Route
            path="/company/:companyId/projects"
            element={<CompanyWorkspaceGuard />}
          >
            <Route element={<CompanyProjectsLayout />}>
              {/* COMPANY PROJECTS LIST */}

              <Route
                index
                element={<CompanyProjects />}
              />

              {/* ==================================
                  CREATE AND EDIT PROJECT
                  COMPANY ADMIN / MANAGER
              ================================== */}

              <Route element={<CompanyProjectEditorGuard />}>
                <Route
                  path="create"
                  element={<CreateProject />}
                />

                <Route
                  path=":projectId/edit"
                  element={<EditProject />}
                />
              </Route>

              {/* ==================================
                  COMPANY PROJECT DETAILS
                  ALL ACTIVE COMPANY MEMBERS
              ================================== */}

              <Route
                path=":projectId"
                element={<CompanyProjectDetails />}
              />
            </Route>
          </Route>

                    {/* ==================================
              COMPANY RESERVATION MANAGEMENT
              APPROVED COMPANY MEMBERS
          ================================== */}

          <Route
            path="/company/:companyId/reservations"
            element={
              <CompanyWorkspaceGuard
                allowedRoles={[
                  "COMPANY_ADMIN",
                  "MANAGER",
                  "SALES_OFFICER",
                  "ACCOUNTANT",
                ]}
              />
            }
          >
            <Route element={<CompanyProjectsLayout />}>
              <Route
                index
                element={<CompanyReservations />}
              />
            </Route>
          </Route>

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

        {/* ==================================
    INVESTOR RESERVATION MANAGEMENT
================================== */}


        {/* ==================================
            INVESTOR ACCESS
        ================================== */}

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
  path="/rems/profile"
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

          {/* INVESTOR RESERVATIONS */}

        <Route
          path="/my-reservations"
          element={<MyReservations />}
        />


        </Route>

        {/* ==================================
            LEGACY SELLER ACCESS
            PRESERVED DURING MIGRATION
        ================================== */}

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

            {/* LEGACY COMPANY PROJECT ROUTES */}

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

        {/* ==================================
            PLATFORM ADMIN ACCESS
        ================================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]} />
          }
        >
          <Route element={<AdminLayout />}>
            <Route
              path="/admin-dashboard"
              element={<AdminDashboard />}
            />

            {/* MARKETPLACE */}

            <Route
              path="/admin/marketplace"
              element={<Properties insideAdmin />}
            />

            <Route
              path="/admin/marketplace/:id"
              element={<PropertyDetails insideAdmin />}
            />

            {/* USERS */}

            <Route
              path="/admin/users"
              element={<AdminUsers />}
            />

            {/* LEGACY SELLER REQUESTS */}

            <Route
              path="/admin/seller-requests"
              element={<SellerRequests />}
            />

            {/* COMPANY VERIFICATION */}

            <Route
              path="/admin/company-verification"
              element={<CompanyVerification />}
            />

            <Route
              path="/admin/company-verification/:companyId"
              element={<CompanyVerificationDetails />}
            />

            {/* OTHER ADMIN PAGES */}

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

            {/* PLANNED ADMIN MODULES */}

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

        {/* ==================================
            FALLBACK
        ================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>

      {/* PUBLIC FOOTER */}

   {/* PUBLIC FOOTER */}

{showFooter && (
  <div
    className={
      showPublicMobileNavigation
        ? "hidden md:block"
        : ""
    }
  >
    <Footer />
  </div>
)}

{/* AUTHENTICATED PUBLIC MOBILE NAVIGATION */}

{showPublicMobileNavigation && (
  <PublicMobileNavigation />
)}
    </div>
  );
};

export default App;