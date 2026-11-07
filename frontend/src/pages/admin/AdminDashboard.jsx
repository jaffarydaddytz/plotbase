import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

import {
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineCollection,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

/* =====================================================
   HELPERS
===================================================== */

const extractArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  if (Array.isArray(data?.data)) return data.data;

  return null;
};

const getCompanyId = (company) =>
  String(company?._id || company?.id || "");

const getCompanyName = (company) =>
  company?.companyName ||
  company?.name ||
  company?.businessName ||
  "Unnamed Company";

const getCompanyEmail = (company) =>
  company?.email ||
  company?.companyEmail ||
  company?.contactEmail ||
  company?.applicant?.email ||
  company?.owner?.email ||
  "Not provided";

const getCompanyDate = (company) =>
  company?.submittedAt ||
  company?.createdAt ||
  company?.applicationDate ||
  null;

const getCompanyStatus = (company) => {
  const status = String(
    company?.status || company?.verificationStatus || "PENDING"
  ).toUpperCase();

  if (status === "ACTIVE" || status === "VERIFIED") {
    return "APPROVED";
  }

  return status;
};

const getInitials = (name) =>
  String(name || "Company")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US")
    : "—";

/* =====================================================
   STAT CARD
===================================================== */

const StatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
  iconStyle = "bg-zinc-100 text-zinc-700",
}) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-zinc-500">
          {title}
        </p>

        {loading ? (
          <div className="mt-2 h-7 w-16 animate-pulse rounded bg-zinc-100" />
        ) : (
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
            {formatNumber(value)}
          </h3>
        )}

        <p className="mt-1 text-[10px] text-zinc-400">
          {subtitle}
        </p>
      </div>

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
    </div>
  </div>
);

/* =====================================================
   STATUS BADGE
===================================================== */

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
  };

  const dots = {
    PENDING: "bg-amber-500",
    APPROVED: "bg-emerald-500",
    REJECTED: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${
        styles[status] || "border-zinc-200 bg-zinc-50 text-zinc-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dots[status] || "bg-zinc-500"
        }`}
      />

      {status
        ? status.charAt(0) + status.slice(1).toLowerCase()
        : "Unknown"}
    </span>
  );
};

/* =====================================================
   TABLE SKELETON
===================================================== */

const TableSkeleton = () => (
  <div>
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3"
      >
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-zinc-100" />

        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-zinc-100" />
          <div className="h-2 w-28 animate-pulse rounded bg-zinc-100" />
        </div>

        <div className="hidden h-3 w-24 animate-pulse rounded bg-zinc-100 sm:block" />
        <div className="h-7 w-16 animate-pulse rounded bg-zinc-100" />
      </div>
    ))}
  </div>
);

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

const AdminDashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState(null);
  const [projects, setProjects] = useState(null);
  const [companies, setCompanies] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);

  /* =====================================================
     FETCH DASHBOARD DATA
  ===================================================== */

  const fetchDashboard = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!token) {
        setUsers(null);
        setProjects(null);
        setCompanies(null);
        setLoading(false);
        setRefreshing(false);
        setErrors(["Authentication is required."]);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrors([]);

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const results = await Promise.allSettled([
          axios.get(`${API_URL}/api/admin/users`, {
            headers,
            signal,
          }),

          axios.get(`${API_URL}/api/admin/properties`, {
            headers,
            signal,
          }),

          axios.get(`${API_URL}/api/admin/companies/pending`, {
            headers,
            signal,
          }),
        ]);

        if (signal?.aborted) return;

        const messages = [];

        /* USERS */

        if (results[0].status === "fulfilled") {
          const records = extractArray(
            results[0].value.data,
            ["users"]
          );

          setUsers(records);

          if (!records) {
            messages.push("User statistics are unavailable.");
          }
        } else {
          setUsers(null);
          messages.push("Unable to load user statistics.");
        }

        /* PROJECTS */

        if (results[1].status === "fulfilled") {
          const records = extractArray(
            results[1].value.data,
            ["properties", "projects"]
          );

          setProjects(records);

          if (!records) {
            messages.push("Project statistics are unavailable.");
          }
        } else {
          setProjects(null);
          messages.push("Unable to load project statistics.");
        }

        /* COMPANIES */

        if (results[2].status === "fulfilled") {
          const records = extractArray(
            results[2].value.data,
            ["companies", "applications"]
          );

          setCompanies(records);

          if (!records) {
            messages.push("Company applications are unavailable.");
          }
        } else {
          setCompanies(null);
          messages.push("Unable to load company applications.");
        }

        setErrors(messages);
      } catch (error) {
        if (axios.isCancel(error) || signal?.aborted) return;

        console.error("Dashboard fetch failed:", error);

        setErrors(["Unable to load dashboard information."]);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboard({ signal: controller.signal });

    return () => controller.abort();
  }, [fetchDashboard]);

  /* =====================================================
     DASHBOARD STATISTICS
  ===================================================== */

  const stats = useMemo(() => {
    const totalUsers = users ? users.length : null;

    const totalProjects = projects ? projects.length : null;

    const publishedProjects = projects
      ? projects.filter((project) => {
          const status = String(
            project?.status || project?.publicationStatus || ""
          ).toUpperCase();

          return status === "PUBLISHED" || status === "PUBLIC";
        }).length
      : null;

    const pendingApplications = companies
      ? companies.filter(
          (company) => getCompanyStatus(company) === "PENDING"
        ).length
      : null;

    return {
      totalUsers,
      totalProjects,
      publishedProjects,
      pendingApplications,
    };
  }, [users, projects, companies]);

  /* =====================================================
     RECENT COMPANY APPLICATIONS
  ===================================================== */

  const recentCompanies = useMemo(() => {
    if (!companies) return [];

    return [...companies]
      .sort((a, b) => {
        const aTime = new Date(getCompanyDate(a) || 0).getTime();
        const bTime = new Date(getCompanyDate(b) || 0).getTime();

        return bTime - aTime;
      })
      .slice(0, 5);
  }, [companies]);

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleReviewCompany = (company) => {
    const id = getCompanyId(company);

    if (!id) {
      setErrors(["Company ID is unavailable."]);
      return;
    }

    navigate(`/admin/company-verification/${id}`);
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="w-full min-w-0 space-y-5">

      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            Overview
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Monitor Plotbase platform performance and key operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDashboard({ silent: true })}
          disabled={loading || refreshing}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <HiOutlineRefresh
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {errors.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <HiOutlineExclamationCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

          <div>
            <p className="text-xs font-medium text-amber-900">
              Some dashboard information could not be loaded.
            </p>

            <p className="mt-1 text-[11px] text-amber-800">
              {errors.join(" ")}
            </p>
          </div>
        </div>
      )}

      {/* PLATFORM SUMMARY */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-zinc-950">
            Platform Summary
          </h2>

          <p className="mt-0.5 text-[11px] text-zinc-500">
            Key statistics across the Plotbase platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={HiOutlineUsers}
            loading={loading}
            subtitle="Registered accounts"
          />

          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            icon={HiOutlineCollection}
            loading={loading}
            subtitle="Projects in available records"
          />

          <StatCard
            title="Published Projects"
            value={stats.publishedProjects}
            icon={HiOutlineCheckCircle}
            iconStyle="bg-emerald-50 text-emerald-600"
            loading={loading}
            subtitle="Publicly available projects"
          />

          <StatCard
            title="Pending Applications"
            value={stats.pendingApplications}
            icon={HiOutlineClock}
            iconStyle="bg-amber-50 text-amber-600"
            loading={loading}
            subtitle="Awaiting company verification"
          />
        </div>
      </section>

      {/* RECENT COMPANY APPLICATIONS */}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              Recent Company Applications
            </h2>

            <p className="mt-1 text-[11px] text-zinc-500">
              Latest applications available in the verification queue.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/company-verification")}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            View All
            <HiOutlineArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left">
              <thead className="bg-zinc-50">
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Company
                  </th>

                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Submitted
                  </th>

                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {recentCompanies.length > 0 ? (
                  recentCompanies.map((company, index) => {
                    const id = getCompanyId(company);
                    const name = getCompanyName(company);
                    const email = getCompanyEmail(company);
                    const status = getCompanyStatus(company);

                    return (
                      <tr
                        key={id || index}
                        className="transition-colors hover:bg-zinc-50"
                      >
                        {/* COMPANY */}

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-[11px] font-semibold text-zinc-700">
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[230px] truncate text-xs font-semibold text-zinc-900">
                                {name}
                              </p>

                              <p className="mt-0.5 max-w-[230px] truncate text-[11px] text-zinc-500">
                                {email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* SUBMITTED */}

                        <td className="whitespace-nowrap px-4 py-3 text-[11px] text-zinc-600">
                          {formatDate(getCompanyDate(company))}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>

                        {/* ACTION */}

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleReviewCompany(company)}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition ${
                              status === "PENDING"
                                ? "bg-zinc-950 text-white hover:bg-zinc-800"
                                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                            }`}
                          >
                            {status === "PENDING" ? "Review" : "View"}
                            <HiOutlineArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100">
                        <HiOutlineOfficeBuilding className="h-5 w-5 text-zinc-400" />
                      </div>

                      <h3 className="mt-3 text-xs font-semibold text-zinc-900">
                        No applications available
                      </h3>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        There are no company applications to display.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FOOTER */}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-400">
          Plotbase Administration
        </p>

        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          Manage Users
          <HiOutlineArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;