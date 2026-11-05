import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";
import EllipsisLoader from "../../components/common/EllipsisLoader";

// Summary cards stay intentionally compact: title and count only.
const overviewCards = [
  { key: "totalSubmitted", label: "Total", accent: "border-l-zinc-800" },
  { key: "pending", label: "Pending", accent: "border-l-amber-500" },
  { key: "active", label: "Active", accent: "border-l-emerald-600" },
  { key: "rejected", label: "Rejected", accent: "border-l-rose-500" },
];

const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

const REPORT_PERIODS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "month", label: "Select month" },
  { value: "custom", label: "Custom dates" },
];

// Tanzania uses UTC+03:00 year-round. Use calendar dates in that timezone.
const tzToday = () =>
  new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

const shiftCalendarDate = (ymd, days) => {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const monthRange = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { from: "", to: "" };
  const [year, numericMonth] = month.split("-").map(Number);
  const finalDay = new Date(Date.UTC(year, numericMonth, 0))
    .toISOString()
    .slice(0, 10);
  return { from: `${month}-01`, to: finalDay };
};

const reportRange = (period, month, from, to) => {
  const today = tzToday();
  switch (period) {
    case "today": return { from: today, to: today };
    case "7days": return { from: shiftCalendarDate(today, -6), to: today };
    case "30days": return { from: shiftCalendarDate(today, -29), to: today };
    case "thisMonth": return { from: `${today.slice(0, 7)}-01`, to: today };
    case "month": return monthRange(month);
    case "custom": return { from, to };
    default: return { from: "", to: "" };
  }
};

const statusClasses = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-red-200 bg-red-50 text-red-800",
  SUSPENDED: "border-zinc-300 bg-zinc-100 text-zinc-700",
};

const formatTanzaniaDate = (value) => {
  if (!value) return "Legacy / not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const CompanyVerification = () => {
  const { token } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1, limit: 10, total: 0, totalPages: 0,
  });
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortSelection, setSortSelection] = useState("submittedAt:desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tableMonth, setTableMonth] = useState("");
  const [showCustomTableDates, setShowCustomTableDates] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const refreshList = () => setListRefreshKey((value) => value + 1);

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [reportPeriod, setReportPeriod] = useState("all");
  const [reportMonth, setReportMonth] = useState(tzToday().slice(0, 7));
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const selectedReportRange = useMemo(
    () => reportRange(reportPeriod, reportMonth, reportFrom, reportTo),
    [reportPeriod, reportMonth, reportFrom, reportTo]
  );
  const invalidReportRange =
    (reportPeriod === "custom" && !selectedReportRange.from && !selectedReportRange.to) ||
    (selectedReportRange.from && selectedReportRange.to &&
      selectedReportRange.from > selectedReportRange.to);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [documentPreview, setDocumentPreview] = useState(null);
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [documentViewError, setDocumentViewError] = useState("");

  const [documentToVerify, setDocumentToVerify] = useState(null);
  const [reviewingDocumentId, setReviewingDocumentId] = useState(null);
  const [documentReviewError, setDocumentReviewError] = useState("");
  const verifyDialogRef = useRef(null);

  // Company-level decision (separate from document verification).
  const [showRejectCompany, setShowRejectCompany] = useState(false);
  const [companyRejectionReason, setCompanyRejectionReason] = useState("");
  const [rejectingCompany, setRejectingCompany] = useState(false);
  const [companyDecisionError, setCompanyDecisionError] = useState("");
  const [companyDecisionMessage, setCompanyDecisionMessage] = useState("");

  // Company approval requires an explicit final admin decision.
  const [companyToApprove, setCompanyToApprove] = useState(null);
  const [approvingCompany, setApprovingCompany] = useState(false);
  const approveDialogRef = useRef(null);

  // Fetch totals separately from the pending queue. A paginated list is
  // never an accurate source for dashboard-wide company counts.
  const loadOverview = useCallback(async (signal) => {
    setOverviewLoading(true);
    setOverviewError("");

    if (invalidReportRange) {
      setOverview(null);
      setOverviewError("Choose a valid reporting date range.");
      setOverviewLoading(false);
      return;
    }

    try {
      const params = {};
      if (selectedReportRange.from) params.dateFrom = selectedReportRange.from;
      if (selectedReportRange.to) params.dateTo = selectedReportRange.to;

      const response = await axios.get(
        `${API_URL}/api/admin/companies/overview`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
          ...(signal ? { signal } : {}),
        }
      );

      if (!response.data?.success || !response.data?.stats) {
        throw new Error("Unable to load company verification statistics.");
      }

      if (!signal?.aborted) setOverview(response.data.stats);
    } catch (err) {
      if (signal?.aborted || axios.isCancel(err)) return;
      setOverviewError(
        err.response?.data?.message ||
          err.message ||
          "Unable to retrieve company verification statistics."
      );
    } finally {
      if (!signal?.aborted) setOverviewLoading(false);
    }
  }, [token, selectedReportRange.from, selectedReportRange.to, invalidReportRange]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOverview(controller.signal);
    return () => controller.abort();
  }, [loadOverview]);

  // Avoid sending a request for every search keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Search, filter, sort and paginate on the server. Do not load all companies
  // into the browser or calculate page totals from the visible rows.
  useEffect(() => {
    const controller = new AbortController();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setLoading(false);
      setError("Start date cannot be after end date.");
      setCompanies([]);
      return () => controller.abort();
    }

    const loadCompanies = async () => {
      try {
        setLoading(true);
        setError("");
        const [sortBy, sortOrder] = sortSelection.split(":");
        const params = {
          search: debouncedSearch,
          status: statusFilter,
          sortBy,
          sortOrder,
          page,
          limit: pageSize,
        };
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const response = await axios.get(`${API_URL}/api/admin/companies`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
          signal: controller.signal,
        });

        if (!response.data?.success || !response.data?.pagination) {
          throw new Error("Unable to load company applications.");
        }

        if (controller.signal.aborted) return;
        const nextPagination = response.data.pagination;
        // A successful approval/rejection may empty the last page.
        if (nextPagination.totalPages > 0 && page > nextPagination.totalPages) {
          setPage(nextPagination.totalPages);
          return;
        }
        setCompanies(response.data.companies || []);
        setPagination(nextPagination);
      } catch (err) {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        setError(
          err.response?.data?.message || err.message ||
            "Unable to load company applications."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadCompanies();
    return () => controller.abort();
  }, [token, debouncedSearch, statusFilter, sortSelection, dateFrom, dateTo, page, pageSize, listRefreshKey]);

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setSortSelection("submittedAt:desc");
    setDateFrom("");
    setDateTo("");
    setTableMonth("");
    setShowCustomTableDates(false);
    setPage(1);
  };

  const toggleSort = (column) => {
    const [activeColumn, direction] = sortSelection.split(":");
    const nextDirection = activeColumn === column && direction === "asc" ? "desc" : "asc";
    setSortSelection(`${column}:${nextDirection}`);
    setPage(1);
  };

  const sortArrow = (column) => {
    const [activeColumn, direction] = sortSelection.split(":");
    return activeColumn === column ? (direction === "asc" ? "↑" : "↓") : "↕";
  };

  const setSubmissionMonth = (value) => {
    setTableMonth(value);
    const range = monthRange(value);
    setDateFrom(range.from);
    setDateTo(range.to);
    setPage(1);
  };

  const toggleCustomTableDates = () => {
    setShowCustomTableDates((current) => !current);
    setDateFrom("");
    setDateTo("");
    setTableMonth("");
    setPage(1);
  };

  // Fetch full details only when an application is selected.
  const handleViewApplication = async (companyId) => {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      setDocumentViewError("");
      setDocumentReviewError("");
      setCompanyDecisionError("");
      setCompanyDecisionMessage("");
      setShowRejectCompany(false);
      setCompanyRejectionReason("");
      setCompanyToApprove(null);
      setSelectedCompany(null);
      setDocumentPreview(null);

      const response = await axios.get(
        `${API_URL}/api/admin/companies/${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data?.success || !response.data.company) {
        throw new Error("Unable to retrieve company application details.");
      }

      setSelectedCompany(response.data.company);
    } catch (err) {
      setDetailsError(
        err.response?.data?.message ||
          err.message ||
          "Unable to retrieve company application details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseApplication = () => {
    if (reviewingDocumentId !== null || rejectingCompany || approvingCompany) return;
    setCompanyToApprove(null);
    setSelectedCompany(null);
    setShowRejectCompany(false);
    setCompanyRejectionReason("");
    setCompanyDecisionError("");
    setDocumentPreview(null);
    setDocumentToVerify(null);
    setDocumentViewError("");
    setDocumentReviewError("");
  };

  // Request a new, short-lived document URL for each preview.
  const handleViewDocument = async (doc) => {
    if (!selectedCompany?.id || viewingDocumentId !== null) return;

    try {
      setViewingDocumentId(doc.id);
      setDocumentViewError("");

      const response = await axios.get(
        `${API_URL}/api/admin/companies/${selectedCompany.id}/documents/${doc.id}/view`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const documentUrl = response.data?.document?.url;

      if (
        !response.data?.success ||
        typeof documentUrl !== "string" ||
        !documentUrl.startsWith("https://")
      ) {
        throw new Error("A valid document viewing URL was not returned.");
      }

      const format = new URL(documentUrl).searchParams
        .get("format")
        ?.toLowerCase();

      setDocumentPreview({
        id: doc.id,
        name: doc.documentType.replaceAll("_", " "),
        url: documentUrl,
        format,
      });
    } catch (err) {
      setDocumentViewError(
        err.response?.data?.message ||
          err.message ||
          "Unable to open verification document."
      );
    } finally {
      setViewingDocumentId(null);
    }
  };

  // The native dialog supplies focus handling and Escape behavior.
  useEffect(() => {
    const dialog = verifyDialogRef.current;
    if (!documentToVerify || !dialog) return;

    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [documentToVerify]);

  // Close the document preview with Escape.
  useEffect(() => {
    if (!documentPreview) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") setDocumentPreview(null);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [documentPreview]);

  // Called only after the admin confirms inside the styled dialog.
  const handleVerifyDocument = async () => {
    if (!documentToVerify || reviewingDocumentId !== null || rejectingCompany || approvingCompany) return;
    if (selectedCompany?.id !== documentToVerify.companyId) return;

    const companyId = documentToVerify.companyId;
    const documentId = documentToVerify.id;

    try {
      setReviewingDocumentId(documentId);
      setDocumentReviewError("");

      const response = await axios.patch(
        `${API_URL}/api/admin/companies/${companyId}/documents/${documentId}/review`,
        { reviewStatus: "VERIFIED", reviewNotes: "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data?.success) {
        throw new Error("Document verification failed.");
      }

      // Update the UI only after the backend confirms the review.
      setSelectedCompany((current) => {
        if (!current || current.id !== companyId) return current;

        return {
          ...current,
          documents: (current.documents || []).map((doc) =>
            doc.id === documentId
              ? {
                  ...doc,
                  reviewStatus: response.data.document.reviewStatus,
                  reviewNotes: response.data.document.reviewNotes,
                }
              : doc
          ),
        };
      });

      setDocumentToVerify(null);
    } catch (err) {
      // Leave the confirmation dialog open so the error is visible.
      setDocumentReviewError(
        err.response?.data?.message ||
          err.message ||
          "Unable to verify document."
      );
    } finally {
      setReviewingDocumentId(null);
    }
  };

  // Reject the whole company application (does not review individual documents).
  const handleRejectCompany = async (event) => {
    event.preventDefault();

    if (
      !selectedCompany?.id ||
      rejectingCompany ||
      approvingCompany ||
      reviewingDocumentId !== null
    ) return;

    const companyId = selectedCompany.id;
    const reason = companyRejectionReason.trim();

    if (reason.length < 10 || reason.length > 1000) {
      setCompanyDecisionError(
        "Rejection reason must contain 10 to 1000 characters."
      );
      return;
    }

    try {
      setRejectingCompany(true);
      setCompanyDecisionError("");
      setCompanyDecisionMessage("");

      const response = await axios.patch(
        `${API_URL}/api/admin/companies/${companyId}/reject`,
        { rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data?.success) {
        throw new Error("Unable to reject company application.");
      }

      // Refresh from the server: approved/rejected companies may remain
      // in the table when the administrator is viewing ALL statuses.
      refreshList();
      setSelectedCompany(null);
      setShowRejectCompany(false);
      setCompanyRejectionReason("");
      setDocumentPreview(null);
      setDocumentToVerify(null);
      setCompanyDecisionMessage("Company application rejected successfully.");
      void loadOverview(); // Refresh totals after the server confirms rejection.
    } catch (err) {
      setCompanyDecisionError(
        err.response?.data?.message ||
          err.message ||
          "Unable to reject company application."
      );
    } finally {
      setRejectingCompany(false);
    }
  };

  // Matches the server's document requirement; the backend remains authoritative.
  // All documents verified makes a company eligible, never automatically approved.
  const requiredDocumentTypes = [
    "REGISTRATION_CERTIFICATE",
    "TAX_CERTIFICATE",
    "BUSINESS_LICENSE",
  ];
  const currentDocuments = selectedCompany?.documents || [];
  const documentsReadyForApproval =
    requiredDocumentTypes.every((type) =>
      currentDocuments.some(
        (doc) => doc.documentType === type && doc.reviewStatus === "VERIFIED"
      )
    ) && currentDocuments.every((doc) => doc.reviewStatus === "VERIFIED");

  const canApproveCompany =
    selectedCompany?.verificationStatus === "PENDING" &&
    documentsReadyForApproval;

  useEffect(() => {
    const dialog = approveDialogRef.current;
    if (!companyToApprove || !dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [companyToApprove]);

  const handleApproveCompany = async () => {
    if (
      !companyToApprove ||
      !canApproveCompany ||
      selectedCompany?.id !== companyToApprove.id ||
      approvingCompany ||
      rejectingCompany ||
      reviewingDocumentId !== null
    ) return;

    const companyId = companyToApprove.id;
    try {
      setApprovingCompany(true);
      setCompanyDecisionError("");
      setCompanyDecisionMessage("");

      const response = await axios.patch(
        `${API_URL}/api/admin/companies/${companyId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data?.success) {
        throw new Error("Unable to approve company application.");
      }

      refreshList();
      setSelectedCompany(null);
      setCompanyToApprove(null);
      setShowRejectCompany(false);
      setCompanyRejectionReason("");
      setDocumentPreview(null);
      setCompanyDecisionMessage(
        "Company approved. Founding company administrator activated."
      );
      void loadOverview(); // Refresh totals after the server confirms approval.
    } catch (err) {
      setCompanyDecisionError(
        err.response?.data?.message ||
          err.message ||
          "Unable to approve company application."
      );
    } finally {
      setApprovingCompany(false);
    }
  };

  return (
    <div className="min-h-[70vh] space-y-4 rounded-2xl bg-zinc-100 p-3 sm:p-4">
      <header>
        <h1 className="text-xl font-semibold text-zinc-900">
          Company Verification
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review real-estate company registration applications.
        </p>
      </header>

      {/* Keep overview out of the way while reviewing a company. */}
      {!selectedCompany && !detailsLoading && (
        <section aria-labelledby="verification-overview-title" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="verification-overview-title" className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Verification overview
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter verification statistics by reporting period"
                title="Counts are grouped by application submission date in Tanzania time"
                value={reportPeriod}
                onChange={(event) => setReportPeriod(event.target.value)}
                className="h-8 cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium text-zinc-800 outline-none focus:border-zinc-500"
              >
                {REPORT_PERIODS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {reportPeriod === "month" && (
                <input
                  aria-label="Choose reporting month"
                  type="month"
                  value={reportMonth}
                  onChange={(event) => setReportMonth(event.target.value)}
                  className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-800"
                />
              )}
              {reportPeriod === "custom" && (
                <>
                  <input
                    aria-label="Statistics start date"
                    type="date"
                    value={reportFrom}
                    onChange={(event) => setReportFrom(event.target.value)}
                    className="h-8 rounded-md border border-zinc-300 bg-white px-1 text-xs text-zinc-800"
                  />
                  <span className="text-xs text-zinc-500">to</span>
                  <input
                    aria-label="Statistics end date"
                    type="date"
                    value={reportTo}
                    onChange={(event) => setReportTo(event.target.value)}
                    className="h-8 rounded-md border border-zinc-300 bg-white px-1 text-xs text-zinc-800"
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => void loadOverview()}
                disabled={overviewLoading || invalidReportRange}
                title="Refresh statistics"
                aria-label="Refresh verification statistics"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white text-base text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↻
              </button>
            </div>
          </div>

          {overviewError && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {overviewError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {overviewCards.map((card) => (
              <article
                key={card.key}
                className={`rounded-lg border border-zinc-200 border-l-[3px] ${card.accent} bg-white px-3 py-2.5 shadow-sm`}
              >
                <h3 className="text-xs font-medium text-zinc-600">{card.label}</h3>
                <p className="mt-0.5 text-xl font-semibold tabular-nums leading-tight text-zinc-950" aria-busy={overviewLoading}>
                  {overviewLoading ? "…" : overview?.[card.key] ?? "—"}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {companyDecisionMessage && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {companyDecisionMessage}
        </p>
      )}

      {/* Filters live in table headers; no separate multi-row filter toolbar. */}
      {!selectedCompany && !detailsLoading && (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-3 sm:px-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Company applications</h2>
              <p className="text-xs text-zinc-500">Submitted applications · {pagination.total} results</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => { refreshList(); void loadOverview(); }}
                className="cursor-pointer rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="m-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading && (
            <div className="p-6"><EllipsisLoader label="Loading company applications" /></div>
          )}
          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[890px] border-collapse text-left text-sm">
                  <thead className="bg-zinc-100 text-xs font-semibold text-zinc-700">
                    <tr className="border-b border-zinc-200 align-top">
                      <th scope="col" className="w-[26%] px-3 py-2.5 sm:px-4" aria-sort={sortSelection.startsWith("name:") ? (sortSelection.endsWith(":asc") ? "ascending" : "descending") : "none"}>
                        <button type="button" onClick={() => toggleSort("name")}
                          className="flex w-full cursor-pointer items-center justify-between gap-1 text-left font-semibold hover:text-zinc-950"
                          aria-label="Sort by company name">
                          Company <span className="text-zinc-500">{sortArrow("name")}</span>
                        </button>
                        <input
                          type="search"
                          aria-label="Search company name or registration number"
                          value={searchInput}
                          onChange={(event) => { setSearchInput(event.target.value); setPage(1); }}
                          maxLength={100}
                          placeholder="Search name or reg. no."
                          className="mt-1.5 h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-xs font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"
                        />
                      </th>
                      <th scope="col" className="px-3 py-2.5" aria-sort={sortSelection.startsWith("registrationNumber:") ? (sortSelection.endsWith(":asc") ? "ascending" : "descending") : "none"}>
                        <button type="button" onClick={() => toggleSort("registrationNumber")}
                          className="flex cursor-pointer items-center gap-1.5 text-left font-semibold hover:text-zinc-950"
                          aria-label="Sort by registration number">
                          Reg. no. <span className="text-zinc-500">{sortArrow("registrationNumber")}</span>
                        </button>
                      </th>
                      <th scope="col" className="min-w-[178px] px-3 py-2.5" aria-sort={sortSelection.startsWith("submittedAt:") ? (sortSelection.endsWith(":asc") ? "ascending" : "descending") : "none"}>
                        <button type="button" onClick={() => toggleSort("submittedAt")}
                          className="flex cursor-pointer items-center gap-1.5 text-left font-semibold hover:text-zinc-950"
                          aria-label="Sort by submission date">
                          Submitted <span className="text-zinc-500">{sortArrow("submittedAt")}</span>
                        </button>
                        {!showCustomTableDates ? (
                          <input
                            type="month"
                            aria-label="Filter applications by submission month"
                            title="Filter by submission month (Tanzania time)"
                            value={tableMonth}
                            onChange={(event) => setSubmissionMonth(event.target.value)}
                            className="mt-1.5 h-8 w-full rounded-md border border-zinc-300 bg-white px-1 text-xs font-normal text-zinc-900"
                          />
                        ) : (
                          <div className="mt-1.5 flex flex-col gap-1">
                            <input type="date" aria-label="Applications from date" value={dateFrom}
                              onChange={(event) => { setDateFrom(event.target.value); setPage(1); }}
                              className="h-8 w-full rounded-md border border-zinc-300 bg-white px-1 text-xs font-normal text-zinc-900" />
                            <input type="date" aria-label="Applications to date" value={dateTo}
                              onChange={(event) => { setDateTo(event.target.value); setPage(1); }}
                              className="h-8 w-full rounded-md border border-zinc-300 bg-white px-1 text-xs font-normal text-zinc-900" />
                          </div>
                        )}
                        <button type="button" onClick={toggleCustomTableDates}
                          className="mt-1 cursor-pointer text-[11px] font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline">
                          {showCustomTableDates ? "Filter by month" : "Custom range"}
                        </button>
                      </th>
                      <th scope="col" className="min-w-[138px] px-3 py-2.5" aria-sort={sortSelection.startsWith("verificationStatus:") ? (sortSelection.endsWith(":asc") ? "ascending" : "descending") : "none"}>
                        <button type="button" onClick={() => toggleSort("verificationStatus")}
                          className="flex cursor-pointer items-center gap-1.5 font-semibold hover:text-zinc-950"
                          aria-label="Sort by company status">
                          Status <span className="text-zinc-500">{sortArrow("verificationStatus")}</span>
                        </button>
                        <select
                          aria-label="Filter company status"
                          value={statusFilter}
                          onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                          className="mt-1.5 h-8 w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-1 text-xs font-normal text-zinc-900"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status === "ALL" ? "All statuses" : status === "APPROVED" ? "Active" : status[0] + status.slice(1).toLowerCase()}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th scope="col" className="px-3 py-2.5" aria-sort={sortSelection.startsWith("reviewedAt:") ? (sortSelection.endsWith(":asc") ? "ascending" : "descending") : "none"}>
                        <button type="button" onClick={() => toggleSort("reviewedAt")}
                          className="flex cursor-pointer items-center gap-1.5 font-semibold hover:text-zinc-950"
                          aria-label="Sort by review date">
                          Reviewed <span className="text-zinc-500">{sortArrow("reviewedAt")}</span>
                        </button>
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {companies.map((company) => (
                      <tr key={company._id} className="hover:bg-zinc-50">
                        <td className="max-w-[240px] px-3 py-3 align-middle sm:px-4">
                          <p className="break-words font-medium text-zinc-900">{company.name}</p>
                          <p className="truncate text-xs text-zinc-500" title={company.contactEmail}>{company.contactEmail || "—"}</p>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{company.registrationNumber || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{formatTanzaniaDate(company.submittedAt)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses[company.verificationStatus] || "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>
                            {company.verificationStatus === "APPROVED" ? "Active" : company.verificationStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{company.reviewedAt ? formatTanzaniaDate(company.reviewedAt) : "—"}</td>
                        <td className="px-3 py-3 text-right">
                          <button type="button" onClick={() => void handleViewApplication(company._id)}
                            className="cursor-pointer whitespace-nowrap rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100">
                            {company.verificationStatus === "PENDING" ? "Review" : "View"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {companies.length === 0 && (
                  <p className="px-4 py-10 text-center text-sm text-zinc-500">
                    No applications match these filters.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-3 py-3 sm:px-4">
                <p className="text-xs text-zinc-600" aria-live="polite">
                  {pagination.total > 0
                    ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`
                    : "0 applications"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="company-page-size" className="text-xs text-zinc-600">Rows</label>
                  <select id="company-page-size" value={pageSize}
                    onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
                    className="h-8 cursor-pointer rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900">
                    {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                  <button type="button" disabled={!pagination.hasPreviousPage}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="h-8 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">
                    Previous
                  </button>
                  <span className="min-w-[64px] text-center text-xs text-zinc-600">
                    {pagination.totalPages ? `${pagination.page} / ${pagination.totalPages}` : "0 / 0"}
                  </span>
                  <button type="button" disabled={!pagination.hasNextPage}
                    onClick={() => setPage((value) => value + 1)}
                    className="h-8 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {detailsError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {detailsError}
        </p>
      )}

      {detailsLoading && <EllipsisLoader label="Loading application details" />}

      {selectedCompany && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {selectedCompany.name}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Company Application Details
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseApplication}
              disabled={rejectingCompany}
              className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Back to Applications
            </button>
          </div>

          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            {[
              ["Registration Number", selectedCompany.registrationNumber],
              ["Contact Email", selectedCompany.contactEmail],
              ["Contact Phone", selectedCompany.contactPhone],
              ["Address", selectedCompany.address],
              ["Status", selectedCompany.verificationStatus],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className="mt-1 break-words font-medium text-zinc-900">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 border-t border-zinc-200 pt-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              Verification Documents
            </h3>

            {documentViewError && (
              <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {documentViewError}
              </p>
            )}

            {documentReviewError && !documentToVerify && (
              <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {documentReviewError}
              </p>
            )}

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {(selectedCompany.documents || []).map((doc) => {
                const pending =
                  selectedCompany.verificationStatus === "PENDING" &&
                  (!doc.reviewStatus || doc.reviewStatus === "PENDING");

                return (
                  <div key={doc.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold text-zinc-900">
                      {doc.documentType.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      Status: {doc.reviewStatus || "PENDING"}
                    </p>
                    {doc.reviewNotes && (
                      <p className="mt-1 break-words text-xs text-zinc-500">
                        Notes: {doc.reviewNotes}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleViewDocument(doc)}
                      disabled={viewingDocumentId !== null}
                      className="mt-3 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {viewingDocumentId === doc.id ? "Opening..." : "View Document"}
                    </button>

                    {pending && (
                      <button
                        type="button"
                        onClick={() => {
                          setDocumentReviewError("");
                          setDocumentToVerify({
                            id: doc.id,
                            companyId: selectedCompany.id,
                            name: doc.documentType.replaceAll("_", " "),
                          });
                        }}
                        disabled={reviewingDocumentId !== null}
                        className="mt-2 w-full cursor-pointer rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Verify Document
                      </button>
                    )}
                  </div>
                );
              })}

              {(selectedCompany.documents || []).length === 0 && (
                <p className="text-sm text-zinc-500">
                  No verification documents uploaded.
                </p>
              )}
            </div>
          </div>

          {/* Company-level rejection: separate from document decisions. */}
          {selectedCompany.verificationStatus === "PENDING" && (
            <div className="mt-6 border-t border-zinc-200 pt-5">
              <h3 className="text-sm font-semibold text-zinc-900">
                Company Verification Decision
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Document verification and final company approval are separate decisions.
                Review the company's details before approving or rejecting.
              </p>

              {companyDecisionError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {companyDecisionError}
                </p>
              )}

              <p className="mt-3 text-xs text-zinc-500">
                {documentsReadyForApproval
                  ? "All required documents are verified. The final company decision is still yours."
                  : "Approval requires all three required documents, and every submitted document, to be verified."}
              </p>

              {!showRejectCompany ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDecisionError("");
                      setCompanyToApprove({
                        id: selectedCompany.id,
                        name: selectedCompany.name,
                      });
                    }}
                    disabled={
                      !canApproveCompany ||
                      reviewingDocumentId !== null ||
                      rejectingCompany ||
                      approvingCompany
                    }
                    className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve Company
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDecisionError("");
                      setShowRejectCompany(true);
                    }}
                    disabled={reviewingDocumentId !== null || rejectingCompany || approvingCompany}
                    className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleRejectCompany}
                  className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div>
                    <label
                      htmlFor="companyRejectionReason"
                      className="mb-2 block text-sm font-medium text-zinc-900"
                    >
                      Reason for rejection
                    </label>
                    <textarea
                      id="companyRejectionReason"
                      value={companyRejectionReason}
                      onChange={(event) =>
                        setCompanyRejectionReason(event.target.value)
                      }
                      placeholder="Explain why this company application is being rejected..."
                      rows={4}
                      maxLength={1000}
                      required
                      disabled={rejectingCompany}
                      className="w-full resize-y rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Enter 10–1000 characters. This reason may be shared with the applicant.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={rejectingCompany}
                      onClick={() => {
                        setShowRejectCompany(false);
                        setCompanyRejectionReason("");
                        setCompanyDecisionError("");
                      }}
                      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        rejectingCompany ||
                        reviewingDocumentId !== null ||
                        companyRejectionReason.trim().length < 10
                      }
                      className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {rejectingCompany ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      )}

      {/* In-app preview replaces navigation to Cloudinary. */}
      {documentPreview && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setDocumentPreview(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Company verification document preview"
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 p-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-900">
                  {documentPreview.name}
                </h2>
                <p className="truncate text-xs text-zinc-500">
                  {selectedCompany?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentPreview(null)}
                aria-label="Close preview"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-zinc-100 p-3 sm:p-5">
              {["png", "jpg", "jpeg"].includes(documentPreview.format) ? (
                <div className="flex min-h-[250px] items-center justify-center">
                  <img
                    src={documentPreview.url}
                    alt={documentPreview.name}
                    className="max-h-[65dvh] max-w-full rounded-lg bg-white object-contain shadow-sm"
                  />
                </div>
              ) : documentPreview.format === "pdf" ? (
                <iframe
                  src={documentPreview.url}
                  title={documentPreview.name}
                  className="h-[65dvh] w-full rounded-lg border border-zinc-200 bg-white"
                />
              ) : (
                <div className="p-6 text-center text-sm text-zinc-500">
                  Preview unavailable. Try opening the document in a new tab.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white p-4">
              <a
                href={documentPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Open in New Tab
              </a>
              <button
                type="button"
                onClick={() => setDocumentPreview(null)}
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A styled, keyboard-accessible confirmation; no window.confirm(). */}
      {documentToVerify && (
        <dialog
          ref={verifyDialogRef}
          aria-labelledby="verify-dialog-title"
          aria-describedby="verify-dialog-description"
          onCancel={(event) => {
            if (reviewingDocumentId !== null) {
              event.preventDefault();
            } else {
              setDocumentToVerify(null);
            }
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/50"
        >
          <div className="p-6">
            <h2 id="verify-dialog-title" className="text-lg font-semibold text-zinc-950">
              Verify this document?
            </h2>
            <p id="verify-dialog-description" className="mt-3 text-sm leading-6 text-zinc-600">
              You are about to verify the{" "}
              <strong className="text-zinc-900">{documentToVerify.name}</strong>.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Confirm that you have inspected the document and checked its authenticity.
            </p>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              This decision cannot be changed.
            </p>

            {documentReviewError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {documentReviewError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocumentToVerify(null)}
                disabled={reviewingDocumentId !== null}
                className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyDocument}
                disabled={reviewingDocumentId !== null}
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewingDocumentId === documentToVerify.id
                  ? "Verifying..."
                  : "Verify Document"}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Separate final company approval confirmation. */}
      {companyToApprove && (
        <dialog
          ref={approveDialogRef}
          aria-labelledby="approve-company-title"
          aria-describedby="approve-company-description"
          onCancel={(event) => {
            if (approvingCompany) event.preventDefault();
            else setCompanyToApprove(null);
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/50"
        >
          <div className="p-6">
            <h2 id="approve-company-title" className="text-lg font-semibold text-zinc-950">
              Approve this company?
            </h2>
            <p id="approve-company-description" className="mt-3 text-sm leading-6 text-zinc-600">
              You are about to approve <strong className="text-zinc-900">{companyToApprove.name}</strong>.
              This will activate its founding company administrator membership.
            </p>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Document checks are complete, but you must independently confirm the company's eligibility.
              Approval grants the company access to permitted operations.
            </p>
            {companyDecisionError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {companyDecisionError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={approvingCompany}
                onClick={() => {
                  setCompanyDecisionError("");
                  setCompanyToApprove(null);
                }}
                className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approvingCompany || !canApproveCompany}
                onClick={handleApproveCompany}
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approvingCompany ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default CompanyVerification;