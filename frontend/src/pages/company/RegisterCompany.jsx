import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/common/Navbar";
import Loader from "../../components/common/Loader";
import CompanyVerificationDocuments from "./CompanyVerificationDocuments";
import CompanyApplicationPreview from "./CompanyApplicationPreview";
import CompanyDraftEditor from "./CompanyDraftEditor.jsx";
import MyCompanyApplications from "./MyCompanyApplications";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

// =====================================================
// CONFIGURATION
// =====================================================

const STEPS = [
  "Applicant",
  "Company",
  "Documents",
  "Review",
];

const RELATIONSHIPS = [
  "Founder",
  "Director",
  "Employee",
  "Authorized Representative",
  "Other",
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =====================================================
// STYLES
// =====================================================

const inputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 " +
  "text-sm text-zinc-900 placeholder:text-zinc-400 outline-none " +
  "focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200 " +
  "read-only:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100";

const labelClass =
  "block text-sm font-medium text-zinc-800";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-zinc-950 px-5 py-2.5 " +
  "text-sm font-semibold text-white hover:bg-zinc-800 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 " +
  "bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// =====================================================
// INITIAL FORM DATA
// =====================================================

const initialForm = (user) => ({
  // Applicant information
  applicantPhone: user?.phone || "",
  positionTitle: "",
  relationshipToCompany: "",
  authorizedToApply: false,

  // Company information
  name: "",
  registrationNumber: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
});

// =====================================================
// REUSABLE FORM FIELD
// =====================================================

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  readOnly = false,
  disabled = false,
  placeholder = "",
  maxLength,
  multiline = false,
  autoComplete,
  className = "",
}) {
  const common = {
    id: name,
    name,
    value,
    onChange,
    required,
    readOnly,
    disabled,
    placeholder,
    maxLength,
    autoComplete,
    className: inputClass,
  };

  return (
    <div className={className}>
      <label htmlFor={name} className={labelClass}>
        {label}

        {required && (
          <span className="ml-1 text-red-600">
            *
          </span>
        )}
      </label>

      {multiline ? (
        <textarea {...common} rows={3} />
      ) : (
        <input {...common} type={type} />
      )}
    </div>
  );
}

// =====================================================
// REGISTER COMPANY COMPONENT
// =====================================================

export default function RegisterCompany({
  applicationsOnly = false,
}) {
  const { token, user } = useAuth();

  const navigate = useNavigate();

  // ===================================================
  // APPLICATIONS STATE
  // ===================================================

  const [applications, setApplications] = useState([]);

  const [applicationsLoading, setApplicationsLoading] =
    useState(true);

  const [applicationsError, setApplicationsError] =
    useState("");

  // ===================================================
  // REGISTRATION STATE
  // ===================================================

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState(() =>
    initialForm(user)
  );

  const [registeredCompany, setRegisteredCompany] =
    useState(null);

  const [showPreview, setShowPreview] = useState(false);

  const [showEditor, setShowEditor] = useState(false);

  const [submissionStage, setSubmissionStage] =
    useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // ===================================================
  // COMPANY IDENTIFIER
  // ===================================================

  const companyId =
    registeredCompany?.id ||
    registeredCompany?._id;

  // ===================================================
  // ACTIVE REGISTRATION STEP
  // ===================================================

  const activeStep = registeredCompany
    ? showPreview
      ? 4
      : 3
    : step;

  // ===================================================
  // RESET REGISTRATION WHEN NAVIGATING BACK
  // ===================================================

  // React Router may reuse the component when moving
  // between /company/applications and /company/register.
  //
  // This ensures /company/register starts a fresh
  // registration workflow.

  useEffect(() => {
    if (applicationsOnly) return;

    setStep(1);
    setFormData(initialForm(user));

    setRegisteredCompany(null);

    setShowPreview(false);
    setShowEditor(false);

    setSubmissionStage(null);

    setError("");
    setSuccess("");
  }, [applicationsOnly]);

  // ===================================================
  // PREFILL APPLICANT PHONE
  // ===================================================

  useEffect(() => {
    if (!user?.phone) return;

    setFormData((previous) =>
      previous.applicantPhone
        ? previous
        : {
            ...previous,
            applicantPhone: user.phone,
          }
    );
  }, [user?.phone]);

  // ===================================================
  // LOAD COMPANY APPLICATIONS
  // ===================================================

  // Only fetch applications when the user opens:
  //
  // /company/applications
  //
  // This avoids unnecessary requests while registering
  // a new company.

  useEffect(() => {
    if (!applicationsOnly) return;

    if (!token) {
      setApplications([]);

      setApplicationsError(
        "Please log in to view your applications."
      );

      setApplicationsLoading(false);

      return;
    }

    const controller = new AbortController();

    const fetchApplications = async () => {
      setApplicationsLoading(true);
      setApplicationsError("");

      try {
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

        setApplications(response.data.applications);
      } catch (err) {
        if (controller.signal.aborted) return;

        setApplicationsError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load applications."
        );
      } finally {
        if (!controller.signal.aborted) {
          setApplicationsLoading(false);
        }
      }
    };

    fetchApplications();

    return () => controller.abort();
  }, [applicationsOnly, token]);

  // ===================================================
  // REDIRECT AFTER SUCCESSFUL SUBMISSION
  // ===================================================

  // The application must redirect to My Applications,
  // not back to the registration page.

  useEffect(() => {
    if (submissionStage !== "received") return;

    const timer = window.setTimeout(() => {
      navigate("/company/applications", {
        replace: true,
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [submissionStage, navigate]);

  // ===================================================
  // HANDLE FORM CHANGES
  // ===================================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setError("");
  };

  // ===================================================
  // VALIDATE APPLICANT INFORMATION
  // ===================================================

  const validateApplicant = () => {
    if (!token) {
      return "Please log in before registering a company.";
    }

    if (
      (user?.name || "").trim().length < 2 ||
      !emailRegex.test(
        (user?.email || "").trim()
      )
    ) {
      return (
        "Your account must have a valid name and email. " +
        "Please sign in again if these are missing."
      );
    }

    if (!formData.applicantPhone.trim()) {
      return "Enter your personal phone number.";
    }

    if (formData.applicantPhone.trim().length > 30) {
      return "Personal phone number is too long.";
    }

    if (!formData.positionTitle.trim()) {
      return "Enter your position or title in the company.";
    }

    if (formData.positionTitle.trim().length > 100) {
      return "Position/title is too long.";
    }

    if (!formData.relationshipToCompany.trim()) {
      return "Select your relationship to the company.";
    }

    if (
      formData.relationshipToCompany.trim().length > 100
    ) {
      return "Relationship to company is too long.";
    }

    if (!formData.authorizedToApply) {
      return (
        "Confirm you are authorized to register " +
        "this company."
      );
    }

    return "";
  };

  // ===================================================
  // VALIDATE COMPANY INFORMATION
  // ===================================================

  const validateCompany = () => {
    if (formData.name.trim().length < 2) {
      return (
        "Company name must contain at least 2 characters."
      );
    }

    if (!formData.registrationNumber.trim()) {
      return "BRELA incorporation number is required.";
    }

    if (
      !emailRegex.test(
        formData.contactEmail.trim()
      )
    ) {
      return "Enter a valid company email address.";
    }

    if (!formData.contactPhone.trim()) {
      return "Company phone number is required.";
    }

    if (!formData.address.trim()) {
      return "Company physical address is required.";
    }

    return "";
  };

  // ===================================================
  // STEP 1: CONTINUE TO COMPANY INFORMATION
  // ===================================================

  const handleNext = (event) => {
    event.preventDefault();

    const validationError = validateApplicant();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep(2);
  };

  // ===================================================
  // STEP 2: SAVE COMPANY DRAFT
  // ===================================================

  const handleSaveDraft = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const validationError =
      validateApplicant() ||
      validateCompany();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    setError("");
    setSuccess("");

    try {
      // -----------------------------------------------
      // REQUEST PAYLOAD
      // -----------------------------------------------

      const payload = {
        // Company information

        name:
          formData.name.trim(),

        registrationNumber:
          formData.registrationNumber
            .trim()
            .toUpperCase(),

        contactEmail:
          formData.contactEmail
            .trim()
            .toLowerCase(),

        contactPhone:
          formData.contactPhone.trim(),

        address:
          formData.address.trim(),

        // Applicant information

        applicantInfo: {
          phone:
            formData.applicantPhone.trim(),

          positionTitle:
            formData.positionTitle.trim(),

          relationshipToCompany:
            formData.relationshipToCompany.trim(),

          authorizedToApply:
            formData.authorizedToApply,
        },
      };

      // Applicant name and email are not submitted.
      // The backend obtains them from req.user.

      const response = await axios.post(
        `${API_URL}/api/companies/register`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        !response.data.success ||
        !(
          response.data.company?.id ||
          response.data.company?._id
        )
      ) {
        throw new Error(
          response.data.message ||
            "Unable to save company draft."
        );
      }

      // -----------------------------------------------
      // MOVE TO VERIFICATION DOCUMENTS
      // -----------------------------------------------

      setRegisteredCompany(
        response.data.company
      );

      setShowPreview(false);
      setShowEditor(false);

      setSuccess(
        response.data.message ||
          "Company draft saved successfully."
      );

      setFormData(initialForm(user));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save company draft."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================================================
  // STEP 4: FINAL APPLICATION SUBMISSION
  // ===================================================

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;

    if (!companyId || !token) {
      setError(
        "Company information or authentication is missing."
      );

      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/api/companies/${companyId}/submit`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Unable to submit the application."
        );
      }

      // Display confirmation before redirecting.

      setSubmissionStage("received");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to submit the application."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pt-[60px]">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-start justify-center px-4 py-8 sm:px-6 lg:py-10">

        {/* ============================================= */}
        {/* MY COMPANY APPLICATIONS PAGE */}
        {/* ============================================= */}

        {applicationsOnly ? (

          <div className="w-full max-w-5xl">

            {/* LOADING */}

{applicationsLoading ? (
  <section
    className="w-full"
    role="status"
    aria-label="Loading company applications"
    aria-busy="true"
  >
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">

      {/* Company selector and status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div className="w-full space-y-2 sm:max-w-sm">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>

      </div>

      {/* Main application information */}
      <div className="mt-6 grid gap-8 border-t border-zinc-100 pt-6 md:grid-cols-2">

        {/* Company information */}
        <div className="space-y-5">

          <Skeleton className="h-4 w-40 rounded" />

          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-4 w-48 max-w-full rounded" />
            </div>
          ))}

        </div>

        {/* Verification documents */}
        <div className="space-y-4">

          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-44 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4"
            >
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          ))}

        </div>

      </div>

      {/* Application status */}
      <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
        <Skeleton className="h-3 w-full max-w-lg rounded" />
        <Skeleton className="mt-3 h-3 w-3/4 rounded" />
      </div>

    </div>
  </section>
) : applicationsError ? (

              /* ERROR */

              <div className="rounded-xl border border-red-200 bg-white p-6">
                <p
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {applicationsError}
                </p>
              </div>

            ) : applications.length > 0 ? (

              /* EXISTING APPLICATIONS */

              <MyCompanyApplications
                applications={applications}
                onRegisterAnother={() =>
                  navigate("/company/register")
                }
              />

            ) : (

              /* NO APPLICATIONS */

              <section className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">

                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl font-bold text-zinc-700">
                  +
                </div>

                <h1 className="text-xl font-semibold text-zinc-950">
                  No Company Applications Yet
                </h1>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  You have not registered a company yet.
                  Start a registration to begin the
                  Plotbase verification process.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/company/register")
                  }
                  className={`${primaryButtonClass} mt-6`}
                >
                  Register Company
                </button>

              </section>

            )}

          </div>

        ) : submissionStage === "received" ? (

          /* =========================================== */
          /* SUBMISSION CONFIRMATION */
          /* =========================================== */

          <section
            role="status"
            aria-live="polite"
            className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm"
          >

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
              ✓
            </div>

            <h1 className="text-xl font-semibold text-zinc-950">
              Application Submitted
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Your company application has been
              submitted for administrator review.
              Opening My Company Applications...
            </p>

            <button
              type="button"
              className={`${secondaryButtonClass} mt-6`}
              onClick={() =>
                navigate("/company/applications", {
                  replace: true,
                })
              }
            >
              View My Applications
            </button>

          </section>

        ) : (

          /* =========================================== */
          /* COMPANY REGISTRATION PAGE */
          /* =========================================== */

          <div
            className={`w-full ${
              showPreview
                ? "max-w-5xl"
                : "max-w-2xl"
            }`}
          >

            {/* --------------------------------------- */}
            {/* PAGE HEADER */}
            {/* --------------------------------------- */}

            {!showPreview && (

              <header className="mb-6">

                <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600">
                  Company Verification
                </span>

                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">

                  <div>

                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                      Register Your Company
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Register a real-estate company
                      for verification on Plotbase.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/company/applications")
                    }
                    className={secondaryButtonClass}
                  >
                    My Applications
                  </button>

                </div>

              </header>

            )}

            {/* ======================================= */}
            {/* REGISTRATION PROGRESS */}
            {/* ======================================= */}

            <nav
              aria-label="Registration progress"
              className="mb-6 grid grid-cols-4 gap-2 sm:gap-3"
            >

              {STEPS.map((label, index) => {
                const number = index + 1;

                const active =
                  number === activeStep;

                const completed =
                  number < activeStep;

                return (
                  <div
                    key={label}
                    aria-current={
                      active ? "step" : undefined
                    }
                  >

                    <div
                      className={`h-1.5 rounded-full ${
                        active || completed
                          ? "bg-zinc-950"
                          : "bg-zinc-200"
                      }`}
                    />

                    <p
                      className={`mt-2 text-xs ${
                        active
                          ? "font-semibold text-zinc-950"
                          : "text-zinc-500"
                      }`}
                    >
                      <span className="hidden sm:inline">
                        {number}.{" "}
                      </span>

                      {label}
                    </p>

                  </div>
                );
              })}

            </nav>

            {/* ======================================= */}
            {/* APPLICANT + COMPANY FORMS */}
            {/* ======================================= */}

            {!registeredCompany && (

              <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">

                {/* ERROR MESSAGE */}

                {error && (

                  <div
                    role="alert"
                    className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>

                )}

                {/* =================================== */}
                {/* STEP 1: APPLICANT INFORMATION */}
                {/* =================================== */}

                {step === 1 ? (

                  <form
                    onSubmit={handleNext}
                    className="space-y-5"
                  >

                    <div className="border-b border-zinc-100 pb-4">

                      <h2 className="text-lg font-semibold text-zinc-950">
                        1. Applicant Information
                      </h2>

                      <p className="mt-1 text-sm text-zinc-500">
                        Information about the person
                        applying on behalf of the company.
                      </p>

                    </div>

                    {/* ACCOUNT IDENTITY */}

                    <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">

                      <FormField
                        label="Full Name"
                        name="applicantName"
                        value={user?.name || ""}
                        readOnly
                      />

                      <FormField
                        label="Email Address"
                        name="applicantEmail"
                        type="email"
                        value={user?.email || ""}
                        readOnly
                      />

                      <p className="text-xs text-zinc-500 sm:col-span-2">
                        Your name and email come from
                        your Plotbase account and cannot
                        be edited here.
                      </p>

                    </div>

                    {/* PERSONAL CONTACTS */}

                    <div className="grid gap-4 sm:grid-cols-2">

                      <FormField
                        label="Personal Phone Number"
                        name="applicantPhone"
                        type="tel"
                        value={formData.applicantPhone}
                        onChange={handleChange}
                        placeholder="+255 712 345 678"
                        maxLength={30}
                        required
                      />

                      <FormField
                        label="Position / Title"
                        name="positionTitle"
                        value={formData.positionTitle}
                        onChange={handleChange}
                        placeholder="e.g. Managing Director"
                        maxLength={100}
                        required
                      />

                    </div>

                    {/* RELATIONSHIP TO COMPANY */}

                    <div>

                      <label
                        htmlFor="relationshipToCompany"
                        className={labelClass}
                      >
                        Relationship to Company{" "}

                        <span className="text-red-600">
                          *
                        </span>
                      </label>

                      <select
                        id="relationshipToCompany"
                        name="relationshipToCompany"
                        value={
                          formData.relationshipToCompany
                        }
                        onChange={handleChange}
                        required
                        className={inputClass}
                      >

                        <option value="">
                          Select relationship
                        </option>

                        {RELATIONSHIPS.map(
                          (relationship) => (

                            <option
                              key={relationship}
                              value={relationship}
                            >
                              {relationship}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                    {/* AUTHORIZATION */}

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">

                      <input
                        type="checkbox"
                        name="authorizedToApply"
                        checked={
                          formData.authorizedToApply
                        }
                        onChange={handleChange}
                        required
                        className="mt-1 h-4 w-4 accent-zinc-950"
                      />

                      <span className="text-sm leading-6 text-zinc-700">
                        I confirm that I am authorized
                        to register this company and
                        that the information provided
                        is accurate.
                      </span>

                    </label>

                    {/* PRIVACY NOTICE */}

                    <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                      Your applicant information will
                      be visible to authorized Plotbase
                      administrators during verification.
                    </p>

                    {/* CONTINUE */}

                    <div className="flex justify-end border-t border-zinc-100 pt-5">

                      <button
                        type="submit"
                        className={primaryButtonClass}
                      >
                        Continue to Company Details
                      </button>

                    </div>

                  </form>

                ) : (

                  /* ================================= */
                  /* STEP 2: COMPANY INFORMATION */
                  /* ================================= */

                  <form
                    onSubmit={handleSaveDraft}
                    className="space-y-5"
                  >

                    <div className="border-b border-zinc-100 pb-4">

                      <h2 className="text-lg font-semibold text-zinc-950">
                        2. Company Information
                      </h2>

                      <p className="mt-1 text-sm text-zinc-500">
                        Official details of the
                        real-estate company.
                      </p>

                    </div>

                    {/* COMPANY NAME */}

                    <FormField
                      label="Registered Company Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Registered company name"
                      disabled={isSubmitting}
                      required
                    />

                    {/* BRELA NUMBER */}

                    <FormField
                      label="BRELA Incorporation Number"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      placeholder="Official incorporation number"
                      disabled={isSubmitting}
                      required
                    />

                    {/* COMPANY CONTACTS */}

                    <div className="grid gap-4 sm:grid-cols-2">

                      <FormField
                        label="Company Email"
                        name="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        placeholder="company@example.com"
                        disabled={isSubmitting}
                        required
                      />

                      <FormField
                        label="Company Phone"
                        name="contactPhone"
                        type="tel"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        placeholder="+255 712 345 678"
                        disabled={isSubmitting}
                        required
                      />

                    </div>

                    {/* PHYSICAL ADDRESS */}

                    <FormField
                      label="Physical Address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      multiline
                      disabled={isSubmitting}
                      required
                    />

                    {/* DRAFT NOTICE */}

                    <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
                      Your information will be saved
                      as a draft first. You will then
                      upload verification documents
                      and review the application
                      before submission.
                    </p>

                    {/* ACTION BUTTONS */}

                    <div className="flex flex-col-reverse justify-between gap-3 border-t border-zinc-100 pt-5 sm:flex-row">

                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setError("");
                        }}
                        disabled={isSubmitting}
                        className={secondaryButtonClass}
                      >
                        Back
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={primaryButtonClass}
                      >
                        {isSubmitting
                          ? "Saving Draft..."
                          : "Save Draft & Continue"}
                      </button>

                    </div>

                  </form>

                )}

              </section>

            )}

            {/* ======================================= */}
            {/* STEP 3: VERIFICATION DOCUMENTS */}
            {/* ======================================= */}

            {registeredCompany && !showPreview && (

              <div className="space-y-4">

                {success && (

                  <div
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                  >
                    {success}
                  </div>

                )}

                {error && (

                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>

                )}

                <CompanyVerificationDocuments
                  companyId={companyId}
                  onContinueToPreview={() => {
                    setShowPreview(true);
                    setError("");
                    setSuccess("");
                  }}
                />

              </div>

            )}

            {/* ======================================= */}
            {/* STEP 4: PREVIEW / EDIT / SUBMIT */}
            {/* ======================================= */}

            {registeredCompany && showPreview && (

              showEditor ? (

                <CompanyDraftEditor
                  companyId={companyId}
                  onCancel={() =>
                    setShowEditor(false)
                  }
                  onSaved={() => {
                    setShowEditor(false);
                    setError("");
                  }}
                />

              ) : (

                <div className="space-y-4">

                  {error && (

                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {error}
                    </div>

                  )}

                  <CompanyApplicationPreview
                    companyId={companyId}
                    onBack={() => {
                      setShowPreview(false);
                      setError("");
                    }}
                    onEdit={() => {
                      setShowEditor(true);
                      setError("");
                    }}
                    onSubmit={handleFinalSubmit}
                    isSubmitting={isSubmitting}
                  />

                </div>

              )

            )}

          </div>

        )}

      </main>
    </div>
  );
}