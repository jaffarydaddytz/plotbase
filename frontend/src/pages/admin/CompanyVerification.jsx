import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

import {
  HiOutlineOfficeBuilding,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiCheck,
  HiX,
} from "react-icons/hi";

/* =====================================================
   CONFIGURATION
===================================================== */

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

/* =====================================================
   HELPERS
===================================================== */

const getCompanyId = (company) =>
  String(company?._id || company?.id || "");

const getCompanyName = (company) =>
  company?.companyName ||
  company?.name ||
  company?.businessName ||
  "Unnamed Company";

const getRegistrationNumber = (company) =>
  company?.registrationNumber ||
  company?.registrationNo ||
  company?.regNumber ||
  "—";

const getCompanyEmail = (company) =>
  company?.email ||
  company?.companyEmail ||
  company?.contactEmail ||
  company?.applicant?.email ||
  company?.owner?.email ||
  "Not provided";

const getCompanyStatus = (company) => {
  const status = String(
    company?.status ||
      company?.verificationStatus ||
      "PENDING"
  ).toUpperCase();

  if (status === "ACTIVE" || status === "VERIFIED") {
    return "APPROVED";
  }

  return status;
};

const getSubmittedDate = (company) =>
  company?.submittedAt ||
  company?.createdAt ||
  company?.applicationDate ||
  null;

const getReviewedDate = (company) =>
  company?.reviewedAt ||
  company?.approvedAt ||
  company?.rejectedAt ||
  null;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getTimestamp = (value) => {
  if (!value) return null;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

const getInitials = (name) =>
  String(name || "Company")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load company applications.";

/* =====================================================
   CUSTOM PLOTBASE DROPDOWN
===================================================== */

const PlotbaseDropdown = ({
  value,
  onChange,
  options,
  label,
  className = "min-w-[145px]",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selected =
    options.find((option) => option.value === value) ||
    options[0];

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={`flex h-9 w-full items-center justify-between gap-3 rounded-md border px-3 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-900/10 ${
          open
            ? "border-zinc-950 bg-zinc-950 text-white"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
        }`}
      >
        <span className="truncate">{selected?.label}</span>

        <HiChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-full overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-xs transition ${
                  isSelected
                    ? "bg-zinc-950 font-medium text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span className="whitespace-nowrap">
                  {option.label}
                </span>

                {isSelected && (
                  <HiCheck className="h-3.5 w-3.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* =====================================================
   OVERVIEW CARD

   ALL CARDS HAVE WHITE BACKGROUNDS
===================================================== */

const OverviewCard = ({
  title,
  value,
  icon: Icon,
  iconClass = "bg-zinc-100 text-zinc-700",
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
    >
      <Icon className="h-5 w-5" />
    </div>

    <div>
      <p className="text-[11px] font-medium text-zinc-500">
        {title}
      </p>

      <h3 className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-950">
        {value}
      </h3>
    </div>
  </div>
);

/* =====================================================
   STATUS BADGE
===================================================== */

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING:
      "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED:
      "border-red-200 bg-red-50 text-red-700",
  };

  const dotStyles = {
    PENDING: "bg-amber-500",
    APPROVED: "bg-emerald-500",
    REJECTED: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        styles[status] ||
        "border-zinc-200 bg-zinc-50 text-zinc-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dotStyles[status] || "bg-zinc-500"
        }`}
      />

      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

/* =====================================================
   LOADING SKELETON
===================================================== */

const TableSkeleton = () => (
  <div>
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-4 border-b border-zinc-100 px-5 py-4"
      >
        <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-200" />

        <div className="flex-1 space-y-2">
          <div className="h-3 w-36 animate-pulse rounded bg-zinc-200" />
          <div className="h-2 w-24 animate-pulse rounded bg-zinc-100" />
        </div>

        <div className="hidden h-3 w-20 animate-pulse rounded bg-zinc-100 md:block" />

        <div className="hidden h-3 w-24 animate-pulse rounded bg-zinc-100 lg:block" />

        <div className="h-7 w-16 animate-pulse rounded bg-zinc-100" />
      </div>
    ))}
  </div>
);

/* =====================================================
   COMPANY VERIFICATION PAGE
===================================================== */

const CompanyVerification = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* =====================================================
     FETCH APPLICATIONS
  ===================================================== */

  const fetchCompanies = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!token) {
        setCompanies([]);
        setLoading(false);
        setError("Authentication is required.");
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
const response = await axios.get(
  `${API_URL}/api/admin/companies`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      status: "ALL",
      page: 1,
      limit: 50,
    },
    signal,
  }
);
        if (signal?.aborted) return;

        const data = response.data;

        if (data?.success === false) {
          throw new Error(
            data.message || "Unable to load companies."
          );
        }

        const records = Array.isArray(data)
          ? data
          : Array.isArray(data?.companies)
            ? data.companies
            : Array.isArray(data?.applications)
              ? data.applications
              : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.data?.companies)
                  ? data.data.companies
                  : null;

        if (!records) {
          throw new Error(
            "Unexpected company applications API response."
          );
        }

        setCompanies(records);
      } catch (err) {
        if (axios.isCancel(err) || signal?.aborted) return;

        console.error("Company verification fetch failed:", err);

        setError(getErrorMessage(err));
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

    fetchCompanies({ signal: controller.signal });

    return () => controller.abort();
  }, [fetchCompanies]);

  /* =====================================================
     OVERVIEW COUNTS
  ===================================================== */

  const overview = useMemo(() => {
    return {
      total: companies.length,

      pending: companies.filter(
        (company) => getCompanyStatus(company) === "PENDING"
      ).length,

      approved: companies.filter(
        (company) => getCompanyStatus(company) === "APPROVED"
      ).length,

      rejected: companies.filter(
        (company) => getCompanyStatus(company) === "REJECTED"
      ).length,
    };
  }, [companies]);

  /* =====================================================
     FILTER & SORT
  ===================================================== */

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = companies.filter((company) => {
      const matchesSearch =
        !query ||
        [
          getCompanyName(company),
          getRegistrationNumber(company),
          getCompanyEmail(company),
        ].some((value) =>
          String(value).toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        getCompanyStatus(company) === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const aTime = getTimestamp(getSubmittedDate(a));
      const bTime = getTimestamp(getSubmittedDate(b));

      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1;
      if (bTime === null) return -1;

      return sortOrder === "oldest"
        ? aTime - bTime
        : bTime - aTime;
    });
  }, [companies, search, statusFilter, sortOrder]);

  /* =====================================================
     PAGINATION
  ===================================================== */

  const totalResults = filteredCompanies.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalResults / pageSize)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex = (safeCurrentPage - 1) * pageSize;

  const endIndex = Math.min(
    startIndex + pageSize,
    totalResults
  );

  const paginatedCompanies = useMemo(
    () => filteredCompanies.slice(startIndex, endIndex),
    [filteredCompanies, startIndex, endIndex]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortOrder, pageSize]);

  const goToPage = (page) => {
    setCurrentPage(
      Math.max(1, Math.min(page, totalPages))
    );
  };

  const visiblePages = useMemo(() => {
    const pages = [];

    for (let page = 1; page <= totalPages; page++) {
      if (
        totalPages <= 7 ||
        page === 1 ||
        page === totalPages ||
        Math.abs(page - safeCurrentPage) <= 1
      ) {
        pages.push(page);
      }
    }

    return pages;
  }, [totalPages, safeCurrentPage]);

  /* =====================================================
     ACTIONS
  ===================================================== */

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortOrder("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    sortOrder !== "newest";

  const handleReview = (company) => {
    const companyId = getCompanyId(company);

    if (!companyId) {
      setError("Company ID is unavailable.");
      return;
    }

    // Adjust this path if your registered detail route differs.
    navigate(`/admin/company-verification/${companyId}`);
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="w-full min-w-0 space-y-5">

      {/* PAGE HEADER */}

      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950 sm:text-2xl">
          Company Verification
        </h1>

        <p className="mt-1 text-xs text-zinc-500">
          Review and verify real-estate company registration applications.
        </p>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <HiOutlineExclamationCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

            <p className="text-xs text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="text-red-600"
          >
            <HiX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===============================================
          VERIFICATION OVERVIEW

          ALL CARDS WHITE
      =============================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <OverviewCard
          title="Total Applications"
          value={loading ? "—" : overview.total}
          icon={HiOutlineOfficeBuilding}
          iconClass="bg-zinc-100 text-zinc-900"
        />

        <OverviewCard
          title="Pending"
          value={loading ? "—" : overview.pending}
          icon={HiOutlineClock}
          iconClass="bg-amber-50 text-amber-600"
        />

        <OverviewCard
          title="Approved"
          value={loading ? "—" : overview.approved}
          icon={HiOutlineCheckCircle}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <OverviewCard
          title="Rejected"
          value={loading ? "—" : overview.rejected}
          icon={HiOutlineXCircle}
          iconClass="bg-red-50 text-red-600"
        />

      </div>

      {/* ===============================================
          APPLICATIONS TABLE CARD
      =============================================== */}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">

        {/* CARD HEADER */}

        <div className="border-b border-zinc-200 px-4 py-4 sm:px-5">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-sm font-semibold text-zinc-950">
                Company Applications
              </h2>

              <p className="mt-1 text-[11px] text-zinc-500">
                Submitted company registrations awaiting review and verification.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchCompanies({ silent: true })}
              disabled={loading || refreshing}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <HiOutlineRefresh
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              Refresh
            </button>
          </div>

          {/* FILTER TOOLBAR */}

          <div className="mt-4 flex flex-wrap items-center gap-2">

            {/* STATUS FILTER */}

            <PlotbaseDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              label="Filter by status"
              className="min-w-[150px]"
            />

            {/* SORT */}

            <PlotbaseDropdown
              value={sortOrder}
              onChange={setSortOrder}
              options={SORT_OPTIONS}
              label="Sort by submission date"
              className="min-w-[145px]"
            />

            {/* CLEAR FILTERS */}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-2 text-[11px] font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
              >
                Clear filters
              </button>
            )}

            {/* SEARCH ON FAR RIGHT */}

            <div className="relative ml-auto w-full sm:w-[280px] lg:w-[320px]">
              <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search company, reg. no. or email..."
                aria-label="Search company applications"
                className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          </div>
        </div>

        {/* ===============================================
            TABLE
        =============================================== */}

        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">

              <thead className="bg-zinc-50">
                <tr className="border-b border-zinc-200">

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Company
                  </th>

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Reg. No.
                  </th>

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Submitted
                  </th>

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Reviewed
                  </th>

                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {paginatedCompanies.length > 0 ? (
                  paginatedCompanies.map((company) => {
                    const id = getCompanyId(company);

                    const name = getCompanyName(company);
                    const email = getCompanyEmail(company);
                    const status = getCompanyStatus(company);

                    return (
                      <tr
                        key={id}
                        className="transition-colors hover:bg-zinc-50/80"
                      >

                        {/* COMPANY */}

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-[11px] font-semibold text-zinc-700">
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate text-xs font-semibold text-zinc-950">
                                {name}
                              </p>

                              <p className="mt-1 max-w-[240px] truncate text-[11px] text-zinc-500">
                                {email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* REGISTRATION NUMBER */}

                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-700">
                          {getRegistrationNumber(company)}
                        </td>

                        {/* SUBMITTED */}

                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
                          {formatDate(getSubmittedDate(company))}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>

                        {/* REVIEWED */}

                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
                          {formatDate(getReviewedDate(company))}
                        </td>

                        {/* ACTION */}

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleReview(company)}
                            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition ${
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
                    <td
                      colSpan={6}
                      className="px-6 py-14 text-center"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                        <HiOutlineOfficeBuilding className="h-6 w-6 text-zinc-400" />
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                        No applications found
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        {hasActiveFilters
                          ? "Try adjusting your search or filters."
                          : "No company applications are available."}
                      </p>

                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-4 rounded-md bg-zinc-950 px-4 py-2 text-xs font-medium text-white"
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ===============================================
            PAGINATION
        =============================================== */}

        {!loading && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 sm:px-5">

            {/* RESULTS */}

            <div className="flex flex-wrap items-center gap-3">

              <p className="text-[11px] text-zinc-500">
                {totalResults === 0
                  ? "Showing 0 applications"
                  : `Showing ${startIndex + 1}–${endIndex} of ${totalResults} applications`}
              </p>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">
                  Rows
                </span>

                <PlotbaseDropdown
                  value={String(pageSize)}
                  onChange={(value) =>
                    setPageSize(Number(value))
                  }
                  options={PAGE_SIZE_OPTIONS.map((size) => ({
                    value: String(size),
                    label: String(size),
                  }))}
                  label="Rows per page"
                  className="min-w-[72px]"
                />
              </div>
            </div>

            {/* PAGE NAVIGATION */}

            <nav
              aria-label="Company application pagination"
              className="flex items-center gap-1"
            >

              <button
                type="button"
                onClick={() =>
                  goToPage(safeCurrentPage - 1)
                }
                disabled={safeCurrentPage === 1}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <HiChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              {visiblePages.map((page, index) => (
                <div
                  key={page}
                  className="flex items-center gap-1"
                >
                  {index > 0 &&
                    page - visiblePages[index - 1] > 1 && (
                      <span className="px-1 text-xs text-zinc-400">
                        ...
                      </span>
                    )}

                  <button
                    type="button"
                    onClick={() => goToPage(page)}
                    aria-current={
                      page === safeCurrentPage
                        ? "page"
                        : undefined
                    }
                    className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[11px] font-medium transition ${
                      page === safeCurrentPage
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {page}
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  goToPage(safeCurrentPage + 1)
                }
                disabled={safeCurrentPage === totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <HiChevronRight className="h-3.5 w-3.5" />
              </button>

            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyVerification;