import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";
import { Skeleton } from "@/components/ui/skeleton";

// =====================================================
// CONFIGURATION
// =====================================================

const REQUIRED_DOCUMENTS = [
  "REGISTRATION_CERTIFICATE",
  "TAX_CERTIFICATE",
  "BUSINESS_LICENSE",
];

const DOCUMENT_LABELS = {
  REGISTRATION_CERTIFICATE: "Certificate of Incorporation",
  TAX_CERTIFICATE: "Tax Certificate",
  BUSINESS_LICENSE: "Business License",
};

const STATUS_STYLES = {
  DRAFT: "border-zinc-200 bg-zinc-50 text-zinc-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  SUSPENDED: "border-orange-200 bg-orange-50 text-orange-700",

  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 " +
  "rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white " +
  "transition hover:bg-zinc-800 disabled:cursor-not-allowed " +
  "disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 " +
  "rounded-lg border border-zinc-200 bg-white px-4 " +
  "text-sm font-medium text-zinc-800 transition " +
  "hover:bg-zinc-50 disabled:cursor-not-allowed " +
  "disabled:opacity-50";

// =====================================================
// HELPERS
// =====================================================

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-TZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.message ||
  fallback;

const getDocumentLabel = (documentType) =>
  DOCUMENT_LABELS[documentType] ||
  String(documentType || "Unknown Document").replaceAll("_", " ");

const normalizeStatus = (status) =>
  status || "PENDING";

// =====================================================
// STATUS BADGE
// =====================================================

const StatusBadge = ({ status }) => {
  const value = normalizeStatus(status);

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-md",
        "border px-2.5 py-1 text-[11px] font-semibold",
        STATUS_STYLES[value] || STATUS_STYLES.DRAFT,
      ].join(" ")}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
};

// =====================================================
// DETAIL FIELD
// =====================================================

const DetailField = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-zinc-500">
      {label}
    </dt>

    <dd className="mt-1 break-words text-sm font-medium text-zinc-900">
      {displayValue(value)}
    </dd>
  </div>
);

// =====================================================
// LOADING SKELETON
// =====================================================

const DetailsSkeleton = () => (
  <div
    role="status"
    aria-label="Loading company verification details"
    className="space-y-5"
  >
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-7 w-72 max-w-full" />
      <Skeleton className="h-4 w-56" />
    </div>

    {[1, 2, 3].map((item) => (
      <div
        key={item}
        className="rounded-xl border border-zinc-200 bg-white p-6"
      >
        <Skeleton className="h-5 w-48" />

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-48 max-w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40 max-w-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// =====================================================
// COMPANY VERIFICATION DETAILS
// =====================================================

const CompanyVerificationDetails = () => {
  const { companyId } = useParams();
  const { token } = useAuth();

  // ===================================================
  // STATE
  // ===================================================

  const [company, setCompany] = useState(null);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [viewingDocumentId, setViewingDocumentId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState("");

  // ===================================================
  // LOAD COMPANY DETAILS
  // ===================================================

  const loadCompany = useCallback(
    async ({ signal, initial = false } = {}) => {
      if (!token || !companyId) {
        setError("Authentication or company information is missing.");
        setLoading(false);
        return;
      }

      if (initial) {
        setLoading(true);
        setCompany(null);
      }

      try {
        const response = await axios.get(
          `${API_URL}/api/admin/companies/${companyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            ...(signal ? { signal } : {}),
          }
        );

        if (!response.data?.success || !response.data.company) {
          throw new Error("Unable to retrieve company details.");
        }

        if (!signal?.aborted) {
          setCompany(response.data.company);
          setError("");
        }
      } catch (err) {
        if (signal?.aborted || axios.isCancel(err)) {
          return;
        }

        setError(
          getErrorMessage(
            err,
            "Failed to load company verification details."
          )
        );
      } finally {
        if (initial && !signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [companyId, token]
  );

  useEffect(() => {
    const controller = new AbortController();

    setError("");
    setSuccess("");

    loadCompany({
      signal: controller.signal,
      initial: true,
    });

    return () => controller.abort();
  }, [loadCompany]);

  // ===================================================
  // MODAL CONTROLS
  // ===================================================

  const openAction = (type, document = null, decision = null) => {
    setAction({
      type,
      document,
      decision,
    });

    setNotes("");
    setActionError("");
    setError("");
    setSuccess("");
  };

  const closeAction = () => {
    if (working) return;

    setAction(null);
    setNotes("");
    setActionError("");
  };

  useEffect(() => {
    if (!action) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !working) {
        closeAction();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [action, working]);

  // ===================================================
  // VIEW DOCUMENT
  // ===================================================

  const handleViewDocument = async (documentId) => {
    if (!documentId || viewingDocumentId || working) return;

    setError("");

    // Open a tab immediately to avoid browser popup blocking
    // after the asynchronous request completes.
    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      setError(
        "Your browser blocked the document tab. Allow popups and try again."
      );
      return;
    }

    previewWindow.opener = null;

    setViewingDocumentId(documentId);

    try {
      const response = await axios.get(
        `${API_URL}/api/admin/companies/${companyId}/documents/${documentId}/view`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const url = response.data?.document?.url;

      if (!response.data?.success || !url) {
        throw new Error("Document viewing URL is unavailable.");
      }

      const documentUrl = new URL(url);

      if (documentUrl.protocol !== "https:") {
        throw new Error("A secure document viewing URL is required.");
      }

      // The backend provides a temporary document URL.
      previewWindow.location.replace(documentUrl.toString());
    } catch (err) {
      previewWindow.close();

      setError(
        getErrorMessage(
          err,
          "Unable to open verification document."
        )
      );
    } finally {
      setViewingDocumentId(null);
    }
  };

  // ===================================================
  // SUBMIT ADMIN ACTION
  // ===================================================

  const handleSubmitAction = async () => {
    if (!action || working) return;

    const trimmedNotes = notes.trim();

    setActionError("");

    // Document rejection requires notes.
    if (
      action.type === "document" &&
      action.decision === "REJECTED" &&
      !trimmedNotes
    ) {
      setActionError(
        "Review notes are required when rejecting a document."
      );
      return;
    }

    // Backend maximum for review notes.
    if (
      action.type === "document" &&
      trimmedNotes.length > 1000
    ) {
      setActionError(
        "Review notes must not exceed 1,000 characters."
      );
      return;
    }

    // Company rejection requires 10–1000 characters.
    if (
      action.type === "reject" &&
      (trimmedNotes.length < 10 || trimmedNotes.length > 1000)
    ) {
      setActionError(
        "Company rejection reason must contain 10 to 1,000 characters."
      );
      return;
    }

    setWorking(true);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      let response;

      // -----------------------------------------------
      // DOCUMENT REVIEW
      // -----------------------------------------------

      if (action.type === "document") {
        response = await axios.patch(
          `${API_URL}/api/admin/companies/${companyId}/documents/${action.document.id}/review`,
          {
            reviewStatus: action.decision,
            reviewNotes: trimmedNotes,
          },
          { headers }
        );
      }

      // -----------------------------------------------
      // COMPANY APPROVAL
      // -----------------------------------------------

      if (action.type === "approve") {
        response = await axios.patch(
          `${API_URL}/api/admin/companies/${companyId}/approve`,
          {},
          { headers }
        );
      }

      // -----------------------------------------------
      // COMPANY REJECTION
      // -----------------------------------------------

      if (action.type === "reject") {
        response = await axios.patch(
          `${API_URL}/api/admin/companies/${companyId}/reject`,
          {
            rejectionReason: trimmedNotes,
          },
          { headers }
        );
      }

      if (!response?.data?.success) {
        throw new Error("The requested action could not be completed.");
      }

      setAction(null);
      setNotes("");
      setActionError("");

      setSuccess(
        response.data.message || "Action completed successfully."
      );

      // Refresh from the backend instead of assuming
      // the new company or document status.
      await loadCompany();
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          "Unable to complete the requested action."
        )
      );
    } finally {
      setWorking(false);
    }
  };

  // ===================================================
  // DERIVED STATE
  // ===================================================

  const documents = Array.isArray(company?.documents)
    ? company.documents
    : [];

  const isPending = company?.verificationStatus === "PENDING";

  const hasRequiredVerifiedDocuments =
    REQUIRED_DOCUMENTS.every((requiredType) =>
      documents.some(
        (doc) =>
          doc.documentType === requiredType &&
          doc.reviewStatus === "VERIFIED"
      )
    );

  const allSubmittedDocumentsVerified =
    documents.length > 0 &&
    documents.every((doc) => doc.reviewStatus === "VERIFIED");

  const canApprove =
    isPending &&
    hasRequiredVerifiedDocuments &&
    allSubmittedDocumentsVerified &&
    !working;

  const verifiedCount = documents.filter(
    (doc) => doc.reviewStatus === "VERIFIED"
  ).length;

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return <DetailsSkeleton />;
  }

  // ===================================================
  // LOAD ERROR
  // ===================================================

  if (!company) {
    return (
      <div className="space-y-5">
        <Link
          to="/admin/company-verification"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-950"
        >
          <ArrowLeft size={16} />
          Back to Company Verification
        </Link>

        <div className={cardClass}>
          <h1 className="text-lg font-semibold text-zinc-950">
            Unable to Load Company
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {error || "Company information is unavailable."}
          </p>

          <button
            type="button"
            onClick={() => loadCompany({ initial: true })}
            className={`${primaryButtonClass} mt-5`}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="w-full min-w-0 space-y-5">

      {/* ============================================= */}
      {/* BACK NAVIGATION */}
      {/* ============================================= */}

      <Link
        to="/admin/company-verification"
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 transition hover:text-zinc-950"
      >
        <ArrowLeft size={15} />
        Back to Company Verification
      </Link>

      {/* ============================================= */}
      {/* PAGE HEADER */}
      {/* ============================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Building2 size={17} className="text-zinc-600" />

            <span className="text-xs font-medium text-zinc-500">
              Company Application Review
            </span>
          </div>

          <h1 className="break-words text-[22px] font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            {company.name}
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Review company information and verification documents.
          </p>
        </div>

        <StatusBadge status={company.verificationStatus} />
      </div>

      {/* ============================================= */}
      {/* NOTIFICATIONS */}
      {/* ============================================= */}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* ============================================= */}
      {/* COMPANY INFORMATION */}
      {/* ============================================= */}

      <section className={cardClass}>
        <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 pb-4">
          <Building2 size={17} className="text-zinc-600" />

          <h2 className="text-sm font-semibold text-zinc-950">
            Company Information
          </h2>
        </div>

        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <DetailField
            label="Registered Company Name"
            value={company.name}
          />

          <DetailField
            label="Registration Number"
            value={company.registrationNumber}
          />

          <DetailField
            label="Contact Email"
            value={company.contactEmail}
          />

          <DetailField
            label="Contact Phone"
            value={company.contactPhone}
          />

          <DetailField
            label="Physical Address"
            value={company.address}
          />

          <DetailField
            label="Application Created"
            value={formatDate(company.createdAt)}
          />
        </dl>
      </section>

      {/* ============================================= */}
      {/* REGISTERED ACCOUNT */}
      {/* ============================================= */}

      <section className={cardClass}>
        <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 pb-4">
          <UserRound size={17} className="text-zinc-600" />

          <h2 className="text-sm font-semibold text-zinc-950">
            Registered By
          </h2>
        </div>

        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <DetailField
            label="Account Name"
            value={company.createdBy?.name}
          />

          <DetailField
            label="Account Email"
            value={company.createdBy?.email}
          />
        </dl>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          This information identifies the Plotbase account that
          created the company application.
        </p>
      </section>

      {/* ============================================= */}
      {/* VERIFICATION DOCUMENTS */}
      {/* ============================================= */}

      <section className={cardClass}>
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={17} className="text-zinc-600" />

              <h2 className="text-sm font-semibold text-zinc-950">
                Verification Documents
              </h2>
            </div>

            <p className="mt-1 text-xs text-zinc-500">
              Review uploaded documents before approving a company.
            </p>
          </div>

          <span className="w-fit rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
            {verifiedCount}/{documents.length} Verified
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="py-10 text-center">
            <FileText
              size={25}
              className="mx-auto text-zinc-400"
            />

            <p className="mt-3 text-sm text-zinc-500">
              No verification documents have been uploaded.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {documents.map((doc) => {
              const status = normalizeStatus(doc.reviewStatus);

              const canReviewDocument =
                isPending &&
                status === "PENDING" &&
                !working;

              return (
                <div
                  key={doc.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4"
                >
                  {/* DOCUMENT INFORMATION */}

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                        <FileText
                          size={17}
                          className="text-zinc-600"
                        />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-950">
                          {getDocumentLabel(doc.documentType)}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          Uploaded: {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={status} />
                  </div>

                  {/* DOCUMENT REVIEW INFORMATION */}

                  {doc.reviewedAt && (
                    <p className="mt-3 text-xs text-zinc-500">
                      Reviewed: {formatDate(doc.reviewedAt)}
                    </p>
                  )}

                  {doc.reviewNotes && (
                    <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-[11px] font-semibold text-zinc-600">
                        Review Notes
                      </p>

                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-700">
                        {doc.reviewNotes}
                      </p>
                    </div>
                  )}

                  {/* DOCUMENT ACTIONS */}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
                    <button
                      type="button"
                      onClick={() => handleViewDocument(doc.id)}
                      disabled={
                        viewingDocumentId !== null ||
                        working
                      }
                      className={secondaryButtonClass}
                    >
                      <ExternalLink size={15} />

                      {viewingDocumentId === doc.id
                        ? "Opening..."
                        : "View Document"}
                    </button>

                    {canReviewDocument && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            openAction(
                              "document",
                              doc,
                              "VERIFIED"
                            )
                          }
                          className={secondaryButtonClass}
                        >
                          <CheckCircle2
                            size={15}
                            className="text-emerald-600"
                          />

                          Verify
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openAction(
                              "document",
                              doc,
                              "REJECTED"
                            )
                          }
                          className={secondaryButtonClass}
                        >
                          <XCircle
                            size={15}
                            className="text-red-600"
                          />

                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* APPROVAL REQUIREMENTS */}

        {isPending && (
          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-zinc-600"
              />

              <div>
                <p className="text-xs font-semibold text-zinc-900">
                  Company Approval Requirements
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  The Certificate of Incorporation, Tax Certificate,
                  Business License, and all additional submitted
                  documents must be verified before approval.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {hasRequiredVerifiedDocuments &&
                  allSubmittedDocumentsVerified ? (
                    <CheckCircle2
                      size={15}
                      className="text-emerald-600"
                    />
                  ) : (
                    <Clock3
                      size={15}
                      className="text-amber-600"
                    />
                  )}

                  <span className="text-xs font-medium text-zinc-700">
                    {hasRequiredVerifiedDocuments &&
                    allSubmittedDocumentsVerified
                      ? "Document verification complete"
                      : "Document verification incomplete"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============================================= */}
      {/* FINAL ADMIN DECISION */}
      {/* ============================================= */}

      <section className={cardClass}>
        <div className="border-b border-zinc-100 pb-4">
          <h2 className="text-sm font-semibold text-zinc-950">
            Final Verification Decision
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Approve or reject this real estate company application.
          </p>
        </div>

        {!isPending ? (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <ShieldCheck
              size={19}
              className="text-zinc-600"
            />

            <div>
              <p className="text-sm font-medium text-zinc-900">
                Application Already Reviewed
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Current status: {company.verificationStatus}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Approving a company activates its founding company
              administrator membership. This action is subject to
              final backend verification.
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => openAction("reject")}
                disabled={working}
                className={secondaryButtonClass}
              >
                <XCircle
                  size={16}
                  className="text-red-600"
                />

                Reject Company
              </button>

              <button
                type="button"
                onClick={() => openAction("approve")}
                disabled={!canApprove}
                className={primaryButtonClass}
              >
                <CheckCircle2 size={16} />

                Approve Company
              </button>
            </div>

            {!canApprove && (
              <p className="mt-3 text-right text-xs text-amber-700">
                Approval is available after all required and
                submitted documents are verified.
              </p>
            )}
          </>
        )}
      </section>

      {/* ============================================= */}
      {/* ACTION CONFIRMATION MODAL */}
      {/* ============================================= */}

      {action && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-zinc-950/50 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAction();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-action-title"
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
          >
            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="admin-action-title"
                  className="text-lg font-semibold text-zinc-950"
                >
                  {action.type === "approve"
                    ? "Approve Company"
                    : action.type === "reject"
                      ? "Reject Company"
                      : action.decision === "VERIFIED"
                        ? "Verify Document"
                        : "Reject Document"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {action.type === "approve"
                    ? "Confirm that this company has satisfied the verification requirements."
                    : action.type === "reject"
                      ? "Provide a reason for rejecting this company application."
                      : `Review ${getDocumentLabel(
                          action.document?.documentType
                        )}.`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAction}
                disabled={working}
                aria-label="Close dialog"
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* NOTES INPUT */}

            {action.type !== "approve" && (
              <div className="mt-5">
                <label
                  htmlFor="verification-notes"
                  className="block text-xs font-semibold text-zinc-800"
                >
                  {action.type === "reject"
                    ? "Rejection Reason"
                    : "Review Notes"}
                  {" "}
                  {action.type === "reject" ||
                  action.decision === "REJECTED"
                    ? "*"
                    : "(Optional)"}
                </label>

                <textarea
                  id="verification-notes"
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setActionError("");
                  }}
                  maxLength={1000}
                  rows={4}
                  autoFocus
                  placeholder={
                    action.type === "reject"
                      ? "Explain why the company application is being rejected..."
                      : action.decision === "REJECTED"
                        ? "Explain why this document is being rejected..."
                        : "Add optional document verification notes..."
                  }
                  disabled={working}
                  className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50"
                />

                <p className="mt-1 text-right text-[11px] text-zinc-500">
                  {notes.length}/1000
                </p>
              </div>
            )}

            {/* ACTION ERROR */}

            {actionError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
              >
                {actionError}
              </div>
            )}

            {/* MODAL ACTIONS */}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeAction}
                disabled={working}
                className={secondaryButtonClass}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitAction}
                disabled={working}
                className={primaryButtonClass}
              >
                {working
                  ? "Processing..."
                  : action.type === "approve"
                    ? "Confirm Approval"
                    : action.type === "reject"
                      ? "Confirm Rejection"
                      : action.decision === "VERIFIED"
                        ? "Verify Document"
                        : "Reject Document"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CompanyVerificationDetails;