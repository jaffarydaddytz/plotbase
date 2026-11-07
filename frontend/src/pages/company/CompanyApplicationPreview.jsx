import { useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

// =====================================================
// CONFIGURATION
// =====================================================

const REQUIRED_DOCUMENTS = [
  {
    type: "REGISTRATION_CERTIFICATE",
    label: "Certificate of Incorporation",
  },
  {
    type: "TAX_CERTIFICATE",
    label: "Tax Certificate",
  },
  {
    type: "BUSINESS_LICENSE",
    label: "Business License",
  },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasText = (value) =>
  typeof value === "string" &&
  value.trim().length > 0;

const displayValue = (value) =>
  hasText(value) ? value : "Not provided";

// =====================================================
// STYLES
// =====================================================

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6";

const sectionTitleClass =
  "text-sm font-semibold text-zinc-950";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg " +
  "border border-zinc-300 bg-white px-4 py-2.5 " +
  "text-sm font-medium text-zinc-700 transition-colors " +
  "hover:bg-zinc-50 disabled:cursor-not-allowed " +
  "disabled:opacity-50";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg " +
  "bg-zinc-950 px-5 py-2.5 text-sm font-semibold " +
  "text-white transition-colors hover:bg-zinc-800 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// =====================================================
// REUSABLE DETAIL COMPONENT
// =====================================================

const DetailField = ({
  label,
  value,
  fullWidth = false,
}) => (
  <div
    className={
      fullWidth
        ? "min-w-0 sm:col-span-2"
        : "min-w-0"
    }
  >
    <dt className="text-xs font-medium text-zinc-500">
      {label}
    </dt>

    <dd className="mt-1 break-words text-sm font-medium text-zinc-900">
      {displayValue(value)}
    </dd>
  </div>
);

// =====================================================
// COMPANY APPLICATION PREVIEW
// =====================================================

const CompanyApplicationPreview = ({
  companyId,
  onBack,
  onEdit,
  onSubmit,
  isSubmitting = false,
}) => {
  const { token } = useAuth();

  const [company, setCompany] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ===================================================
  // LOAD COMPANY APPLICATION
  // ===================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadApplication = async () => {
      try {
        setLoading(true);
        setError("");
        setCompany(null);

        const response = await axios.get(
          `${API_URL}/api/companies/my-applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (
          !response.data.success ||
          !Array.isArray(response.data.applications)
        ) {
          throw new Error(
            "Unable to retrieve company applications."
          );
        }

        const application =
          response.data.applications.find(
            (item) =>
              String(item.id) === String(companyId)
          );

        if (!application) {
          throw new Error(
            "Company application not found."
          );
        }

        setCompany(application);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load company application."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (token && companyId) {
      loadApplication();
    } else {
      setCompany(null);
      setError(
        "Authentication or company information is missing."
      );
      setLoading(false);
    }

    return () => controller.abort();
  }, [companyId, token]);

  // ===================================================
  // LOADING STATE
  // ===================================================

  if (loading) {
    return (
      <div
        role="status"
        className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm"
      >
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />

        <p className="mt-4 text-sm text-zinc-500">
          Loading your application preview...
        </p>
      </div>
    );
  }

  // ===================================================
  // ERROR STATE
  // ===================================================

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
      >
        {error}
      </div>
    );
  }

  if (!company) return null;

  // ===================================================
  // APPLICANT INFORMATION
  // ===================================================

  const applicant = company.applicantInfo || {};

  const applicantName = applicant.fullName || "";
  const applicantEmail = applicant.email || "";
  const applicantPhone = applicant.phone || "";

  const applicantPosition =
    applicant.positionTitle || "";

  const applicantRelationship =
    applicant.relationshipToCompany || "";

  const isAuthorized =
    applicant.authorizedToApply === true;

  // ===================================================
  // DOCUMENT INFORMATION
  // ===================================================

  const documents = Array.isArray(company.documents)
    ? company.documents
    : [];

  const uploadedCount = REQUIRED_DOCUMENTS.filter(
    (requiredDocument) =>
      documents.some(
        (document) =>
          document.documentType ===
          requiredDocument.type
      )
  ).length;

  // ===================================================
  // APPLICANT VALIDATION
  // ===================================================

  const missingApplicantFields = [];

  if (applicantName.trim().length < 2) {
    missingApplicantFields.push(
      "Applicant full name"
    );
  }

  if (!emailRegex.test(applicantEmail.trim())) {
    missingApplicantFields.push(
      "Applicant email address"
    );
  }

  if (!hasText(applicantPhone)) {
    missingApplicantFields.push(
      "Personal phone number"
    );
  }

  if (!hasText(applicantPosition)) {
    missingApplicantFields.push(
      "Position or title in company"
    );
  }

  if (!hasText(applicantRelationship)) {
    missingApplicantFields.push(
      "Relationship to company"
    );
  }

  if (!isAuthorized) {
    missingApplicantFields.push(
      "Authorization confirmation"
    );
  }

  // ===================================================
  // COMPANY VALIDATION
  // ===================================================

  const missingCompanyFields = [];

  if (
    typeof company.name !== "string" ||
    company.name.trim().length < 2
  ) {
    missingCompanyFields.push(
      "Registered company name"
    );
  }

  if (!hasText(company.registrationNumber)) {
    missingCompanyFields.push(
      "BRELA incorporation number"
    );
  }

  if (
    !emailRegex.test(
      String(company.contactEmail || "").trim()
    )
  ) {
    missingCompanyFields.push(
      "Company email address"
    );
  }

  if (!hasText(company.contactPhone)) {
    missingCompanyFields.push(
      "Company phone number"
    );
  }

  if (!hasText(company.address)) {
    missingCompanyFields.push(
      "Company physical address"
    );
  }

  // ===================================================
  // DOCUMENT VALIDATION
  // ===================================================

  const missingDocuments = REQUIRED_DOCUMENTS.filter(
    (requiredDocument) =>
      !documents.some(
        (document) =>
          document.documentType ===
          requiredDocument.type
      )
  );

  // ===================================================
  // SUBMISSION READINESS
  // ===================================================

  const isDraft =
    company.verificationStatus === "DRAFT";

  const applicantComplete =
    missingApplicantFields.length === 0;

  const companyComplete =
    missingCompanyFields.length === 0;

  const documentsComplete =
    missingDocuments.length === 0;

  const readyToSubmit =
    isDraft &&
    applicantComplete &&
    companyComplete &&
    documentsComplete;

  const missingInformation = [
    ...missingApplicantFields,
    ...missingCompanyFields,
    ...missingDocuments.map(
      (document) => document.label
    ),
  ];

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">

      {/* ============================================= */}
      {/* PAGE HEADER */}
      {/* ============================================= */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div>
          <div className="mb-2 inline-flex items-center rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600">
            Company Verification
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            Review Company Application
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Review your personal information,
            company details, and verification
            documents before submitting.
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
          {company.verificationStatus || "UNKNOWN"}
        </span>
      </div>

      {/* ============================================= */}
      {/* APPLICATION READINESS */}
      {/* ============================================= */}

      <div
        className={`rounded-xl border px-4 py-3 ${
          readyToSubmit
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-start gap-3">

          <div
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              readyToSubmit
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {readyToSubmit ? "✓" : "!"}
          </div>

          <div>
            <p
              className={`text-sm font-semibold ${
                readyToSubmit
                  ? "text-emerald-900"
                  : "text-amber-900"
              }`}
            >
              {readyToSubmit
                ? "Application Ready for Submission"
                : isDraft
                  ? "Application Requires Attention"
                  : "Application Is Not a Draft"}
            </p>

            <p
              className={`mt-1 text-xs leading-5 ${
                readyToSubmit
                  ? "text-emerald-800"
                  : "text-amber-800"
              }`}
            >
              {readyToSubmit
                ? "All required applicant details, company information, and verification documents are available."
                : isDraft
                  ? "Complete the missing information before submitting your application."
                  : "Only applications with DRAFT status can be submitted."}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* 1. APPLICANT INFORMATION */}
      {/* ============================================= */}

      <div className={cardClass}>

        <div className="mb-5 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">

          <div>
            <h2 className={sectionTitleClass}>
              1. Applicant Information
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Person responsible for registering
              this company.
            </p>
          </div>

          <span
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              applicantComplete
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {applicantComplete
              ? "Complete"
              : "Incomplete"}
          </span>
        </div>

        <dl className="grid gap-x-5 gap-y-5 sm:grid-cols-2">

          <DetailField
            label="Full Name"
            value={applicantName}
          />

          <DetailField
            label="Email Address"
            value={applicantEmail}
          />

          <DetailField
            label="Personal Phone Number"
            value={applicantPhone}
          />

          <DetailField
            label="Position / Title"
            value={applicantPosition}
          />

          <DetailField
            label="Relationship to Company"
            value={applicantRelationship}
            fullWidth
          />

        </dl>

        {/* Authorization */}

        <div className="mt-5 border-t border-zinc-100 pt-4">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <p className="text-xs font-medium text-zinc-500">
                Authorization to Apply
              </p>

              <p className="mt-1 text-sm text-zinc-800">
                Applicant confirmation of
                authority to represent the company.
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isAuthorized
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {isAuthorized
                ? "Confirmed"
                : "Not Confirmed"}
            </span>

          </div>
        </div>

      </div>

      {/* ============================================= */}
      {/* 2. COMPANY INFORMATION */}
      {/* ============================================= */}

      <div className={cardClass}>

        <div className="mb-5 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">

          <div>
            <h2 className={sectionTitleClass}>
              2. Company Information
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Official registration and business
              contact details.
            </p>
          </div>

          <span
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              companyComplete
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {companyComplete
              ? "Complete"
              : "Incomplete"}
          </span>

        </div>

        <dl className="grid gap-x-5 gap-y-5 sm:grid-cols-2">

          <DetailField
            label="Registered Company Name"
            value={company.name}
            fullWidth
          />

          <DetailField
            label="BRELA Incorporation Number"
            value={company.registrationNumber}
          />

          <DetailField
            label="Company Phone Number"
            value={company.contactPhone}
          />

          <DetailField
            label="Company Email Address"
            value={company.contactEmail}
            fullWidth
          />

          <DetailField
            label="Physical Address"
            value={company.address}
            fullWidth
          />

        </dl>

      </div>

      {/* ============================================= */}
      {/* 3. VERIFICATION DOCUMENTS */}
      {/* ============================================= */}

      <div className={cardClass}>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">

          <div>
            <h2 className={sectionTitleClass}>
              3. Verification Documents
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Required documents for company
              verification.
            </p>
          </div>

          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              documentsComplete
                ? "bg-emerald-50 text-emerald-700"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {uploadedCount}/3 Uploaded
          </span>

        </div>

        <div className="space-y-3">

          {REQUIRED_DOCUMENTS.map((item) => {
            const uploaded = documents.find(
              (document) =>
                document.documentType === item.type
            );

            return (
              <div
                key={item.type}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
              >

                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {item.label}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {uploaded
                      ? "Document uploaded"
                      : "Document required"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    uploaded
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {uploaded
                    ? "Uploaded"
                    : "Missing"}
                </span>

              </div>
            );
          })}

        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Uploaded documents will be reviewed
          by authorized Plotbase administrators
          after your application is submitted.
          Uploading a document does not mean
          it has already been verified.
        </p>

      </div>

      {/* ============================================= */}
      {/* MISSING INFORMATION */}
      {/* ============================================= */}

      {isDraft && missingInformation.length > 0 && (

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

          <h3 className="text-sm font-semibold text-amber-900">
            Information Required Before Submission
          </h3>

          <p className="mt-1 text-xs leading-5 text-amber-800">
            The following information must be
            completed before this application
            can be submitted:
          </p>

          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-amber-900">

            {missingInformation.map((field) => (
              <li key={field}>
                {field}
              </li>
            ))}

          </ul>

          <p className="mt-3 text-xs text-amber-800">
            Use Edit Information or return to
            Documents to complete the application.
          </p>

        </div>
      )}

      {/* ============================================= */}
      {/* 4. REVIEW & SUBMIT */}
      {/* ============================================= */}

      <div className={cardClass}>

        <div className="border-b border-zinc-100 pb-4">
          <h2 className={sectionTitleClass}>
            4. Review & Submit
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Final application confirmation.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">

          <p className="text-sm leading-6 text-zinc-700">
            Please confirm that your personal
            information, position within the
            company, official company information,
            and verification documents are correct.
          </p>

          <p className="mt-3 text-sm leading-6 text-zinc-700">
            Once submitted, your application
            will be sent to Plotbase administrators
            for verification and approval.
          </p>

          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Company registration does not
            automatically grant permission to
            publish projects. Company operations
            require successful platform approval.
          </p>

        </div>

        {/* ----------------------------------------- */}
        {/* ACTION BUTTONS */}
        {/* ----------------------------------------- */}

        <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

          {/* Back and Edit */}

          <div className="flex flex-wrap gap-3">

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className={secondaryButtonClass}
              >
                Back to Documents
              </button>
            )}

            {onEdit && isDraft && (
              <button
                type="button"
                onClick={onEdit}
                disabled={isSubmitting}
                className={secondaryButtonClass}
              >
                Edit Information
              </button>
            )}

          </div>

          {/* Submit */}

          {onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={
                !readyToSubmit ||
                isSubmitting
              }
              className={
                primaryButtonClass +
                " w-full sm:w-auto"
              }
            >
              {isSubmitting
                ? "Submitting Application..."
                : "Submit for Admin Review"}
            </button>
          )}

        </div>

        {/* Submission guidance */}

        {!readyToSubmit && isDraft && (
          <p
            role="status"
            className="mt-3 text-xs text-amber-700"
          >
            Submission is disabled until
            all required information and
            documents are available.
          </p>
        )}

      </div>

    </section>
  );
};

export default CompanyApplicationPreview;