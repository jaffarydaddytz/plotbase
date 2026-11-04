import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";
import EllipsisLoader from "../../components/common/EllipsisLoader";

const CompanyVerification = () => {
  const { token } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Retrieve submitted company applications.
  useEffect(() => {
    const controller = new AbortController();

    const fetchPendingCompanies = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/api/admin/companies/pending`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );

        if (!response.data?.success) {
          throw new Error("Unable to load pending companies.");
        }

        setCompanies(response.data.companies || []);
      } catch (err) {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load pending company applications."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchPendingCompanies();
    return () => controller.abort();
  }, [token]);

  // Fetch full details only when an application is selected.
  const handleViewApplication = async (companyId) => {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      setDocumentViewError("");
      setDocumentReviewError("");
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
    if (reviewingDocumentId !== null) return;
    setSelectedCompany(null);
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
    if (!documentToVerify || reviewingDocumentId !== null) return;
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

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-zinc-900">
          Company Verification
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review real-estate company registration applications.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Pending Applications
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">
          {companies.length}
        </p>
      </div>

      {loading && <EllipsisLoader label="Loading company applications" />}

      {!loading && error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && !selectedCompany && !detailsLoading && companies.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          No pending company applications.
        </div>
      )}

      {detailsError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {detailsError}
        </p>
      )}

      {!loading && !error && !selectedCompany && !detailsLoading && companies.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {companies.map((company) => (
            <article
              key={company._id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-base font-semibold text-zinc-900">
                    {company.name}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Registration: {company.registrationNumber}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Pending
                </span>
              </div>

              <div className="mt-3 space-y-1 break-words text-sm text-zinc-600">
                <p>{company.contactEmail}</p>
                <p>{company.contactPhone}</p>
                <p>{company.address}</p>
              </div>

              <div className="mt-3 border-t border-zinc-100 pt-3">
                <p className="text-xs text-zinc-500">
                  Submitted: {company.submittedAt
                    ? new Date(company.submittedAt).toLocaleDateString()
                    : "Legacy application"}
                </p>
                <button
                  type="button"
                  onClick={() => handleViewApplication(company._id)}
                  className="mt-3 w-full cursor-pointer rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Review Application
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {detailsLoading && <EllipsisLoader label="Loading application details" />}

      {selectedCompany && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
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
                const pending = !doc.reviewStatus || doc.reviewStatus === "PENDING";

                return (
                  <div key={doc.id} className="rounded-lg border border-zinc-200 p-3">
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
    </div>
  );
};

export default CompanyVerification;
