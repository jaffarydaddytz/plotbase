import { useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

// =====================================================
// CONFIGURATION
// =====================================================

const initialForm = {
  // Applicant information
  applicantPhone: "",
  positionTitle: "",
  relationshipToCompany: "",
  authorizedToApply: false,

  // Company information
  name: "",
  registrationNumber: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
};

const relationshipOptions = [
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
  "mt-1.5 w-full rounded-lg border border-zinc-300 " +
  "bg-white px-3.5 py-2.5 text-sm text-zinc-900 " +
  "placeholder:text-zinc-400 outline-none transition-colors " +
  "focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200 " +
  "disabled:cursor-not-allowed disabled:bg-zinc-100";

const labelClass =
  "block text-sm font-medium text-zinc-800";

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg " +
  "bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-zinc-800 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg " +
  "border border-zinc-300 bg-white px-5 py-2.5 " +
  "text-sm font-semibold text-zinc-700 transition-colors " +
  "hover:bg-zinc-50 disabled:cursor-not-allowed " +
  "disabled:opacity-50";

// =====================================================
// COMPANY DRAFT EDITOR
// =====================================================

const CompanyDraftEditor = ({
  companyId,
  onCancel,
  onSaved,
}) => {
  const { token, user } = useAuth();

  // ---------------------------------------------------
  // Form state
  // ---------------------------------------------------

  const [formData, setFormData] = useState(initialForm);

  // Applicant identity returned by the backend.
  // Name and email are displayed but never submitted
  // as editable company draft fields.

  const [applicantIdentity, setApplicantIdentity] =
    useState({
      fullName: "",
      email: "",
    });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  // ===================================================
  // LOAD EXISTING COMPANY DRAFT
  // ===================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadDraft = async () => {
      if (!companyId || !token) {
        setLoadError(
          "Company information or authentication is missing."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError("");
        setError("");

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
            "Unable to load company information."
          );
        }

        // Find the requested company application.

        const company = response.data.applications.find(
          (item) =>
            String(item.id) === String(companyId)
        );

        if (!company) {
          throw new Error(
            "Company application not found."
          );
        }

        // Only drafts may be edited.

        if (company.verificationStatus !== "DRAFT") {
          throw new Error(
            "Only draft applications can be edited."
          );
        }

        // Applicant details may be missing on older drafts.

        const applicant = company.applicantInfo || {};

        // ---------------------------------------------
        // Store applicant identity for display
        // ---------------------------------------------

        setApplicantIdentity({
          fullName:
            applicant.fullName || "",

          email:
            applicant.email || "",
        });

        // ---------------------------------------------
        // Populate editable fields
        // ---------------------------------------------

        setFormData({
          // Applicant information

          applicantPhone:
            applicant.phone ||
            user?.phone ||
            "",

          positionTitle:
            applicant.positionTitle || "",

          relationshipToCompany:
            applicant.relationshipToCompany || "",

          authorizedToApply:
            applicant.authorizedToApply === true,

          // Company information

          name:
            company.name || "",

          registrationNumber:
            company.registrationNumber || "",

          contactEmail:
            company.contactEmail || "",

          contactPhone:
            company.contactPhone || "",

          address:
            company.address || "",
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        setLoadError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load company draft."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadDraft();

    return () => controller.abort();
  }, [companyId, token, user?.phone]);

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
  // VALIDATE COMPANY INFORMATION
  // ===================================================

  const validateCompanyInformation = () => {
    if (formData.name.trim().length < 2) {
      setError(
        "Company name must contain at least 2 characters."
      );

      return false;
    }

    if (!formData.registrationNumber.trim()) {
      setError(
        "BRELA incorporation number is required."
      );

      return false;
    }

    if (
      !emailRegex.test(
        formData.contactEmail.trim()
      )
    ) {
      setError(
        "Please enter a valid company email address."
      );

      return false;
    }

    if (!formData.contactPhone.trim()) {
      setError(
        "Company phone number is required."
      );

      return false;
    }

    if (!formData.address.trim()) {
      setError(
        "Company physical address is required."
      );

      return false;
    }

    return true;
  };

  // ===================================================
  // VALIDATE APPLICANT INFORMATION
  // ===================================================

  const validateApplicantInformation = () => {
    const phone = formData.applicantPhone.trim();

    const position =
      formData.positionTitle.trim();

    const relationship =
      formData.relationshipToCompany.trim();

    // Applicant details may be incomplete while
    // the application is still a draft.

    if (phone.length > 30) {
      setError(
        "Personal phone number must not exceed 30 characters."
      );

      return false;
    }

    if (position.length > 100) {
      setError(
        "Position/title must not exceed 100 characters."
      );

      return false;
    }

    if (relationship.length > 100) {
      setError(
        "Relationship to company must not exceed 100 characters."
      );

      return false;
    }

    return true;
  };

  // ===================================================
  // SAVE COMPANY DRAFT
  // ===================================================

  const handleSave = async (event) => {
    event.preventDefault();

    if (isSaving || loading) return;

    setError("");

    if (!companyId || !token) {
      setError(
        "Company information or authentication is missing."
      );

      return;
    }

    if (!validateApplicantInformation()) {
      return;
    }

    if (!validateCompanyInformation()) {
      return;
    }

    setIsSaving(true);

    try {
      // ---------------------------------------------
      // Prepare update payload
      // ---------------------------------------------

      const updates = {
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

      // IMPORTANT:
      // Applicant full name and email are excluded.
      // The backend controls applicant identity.

      const response = await axios.patch(
        `${API_URL}/api/companies/${companyId}/draft`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Unable to save draft changes."
        );
      }

      // Notify parent component.
      // The parent returns to the application preview.

      onSaved?.(response.data.company);
    } catch (err) {
      if (err.response?.status === 401) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setError(
          "You are not authorized to edit this application."
        );
      } else if (err.response?.status === 409) {
        setError(
          err.response?.data?.message ||
            "This application can no longer be edited."
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to update company draft."
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ===================================================
  // AUTHENTICATED APPLICANT IDENTITY
  // ===================================================

  // Prefer the currently authenticated account details.
  // Fall back to the existing draft details if needed.

  const applicantName =
    user?.name ||
    applicantIdentity.fullName ||
    "";

  const applicantEmail =
    user?.email ||
    applicantIdentity.email ||
    "";

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div>
          <div className="mb-2 inline-flex items-center rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600">
            Company Verification
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            Edit Company Application
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Update your applicant and company
            information before final submission.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
          DRAFT
        </span>

      </div>

      {/* ============================================= */}
      {/* LOADING */}
      {/* ============================================= */}

      {loading ? (
        <div className={cardClass}>

          <div
            role="status"
            className="py-10 text-center"
          >
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />

            <p className="mt-4 text-sm text-zinc-500">
              Loading company application...
            </p>
          </div>

        </div>

      ) : loadError ? (

        /* =========================================== */
        /* LOAD ERROR */
        /* =========================================== */

        <div className={cardClass}>

          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {loadError}
          </div>

          <div className="mt-5">

            <button
              type="button"
              onClick={onCancel}
              className={secondaryButtonClass}
            >
              Return to Application
            </button>

          </div>
        </div>

      ) : (

        /* =========================================== */
        /* EDITOR FORM */
        /* =========================================== */

        <form
          onSubmit={handleSave}
          className="space-y-5"
        >

          {/* ----------------------------------------- */}
          {/* SAVE ERROR */}
          {/* ----------------------------------------- */}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* ======================================= */}
          {/* 1. APPLICANT INFORMATION */}
          {/* ======================================= */}

          <div className={cardClass}>

            <div className="mb-5 border-b border-zinc-100 pb-4">

              <h2 className="text-base font-semibold text-zinc-950">
                1. Applicant Information
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Personal details of the individual
                registering this company.
              </p>

            </div>

            {/* ----------------------------------- */}
            {/* ACCOUNT IDENTITY */}
            {/* ----------------------------------- */}

            <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">

              <div className="mb-4">

                <h3 className="text-sm font-semibold text-zinc-900">
                  Plotbase Account Information
                </h3>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Your name and email are linked
                  to your authenticated account
                  and cannot be edited here.
                </p>

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* Full Name */}

                <div>

                  <label
                    htmlFor="applicantName"
                    className={labelClass}
                  >
                    Full Name
                  </label>

                  <input
                    id="applicantName"
                    type="text"
                    value={applicantName}
                    readOnly
                    className={inputClass}
                  />

                </div>

                {/* Email */}

                <div>

                  <label
                    htmlFor="applicantEmail"
                    className={labelClass}
                  >
                    Email Address
                  </label>

                  <input
                    id="applicantEmail"
                    type="email"
                    value={applicantEmail}
                    readOnly
                    className={inputClass}
                  />

                </div>

              </div>

            </div>

            {/* ----------------------------------- */}
            {/* EDITABLE APPLICANT INFORMATION */}
            {/* ----------------------------------- */}

            <div className="grid gap-4 sm:grid-cols-2">

              {/* Personal Phone */}

              <div>

                <label
                  htmlFor="applicantPhone"
                  className={labelClass}
                >
                  Personal Phone Number
                </label>

                <input
                  id="applicantPhone"
                  name="applicantPhone"
                  type="tel"
                  value={formData.applicantPhone}
                  onChange={handleChange}
                  placeholder="+255 712 345 678"
                  autoComplete="tel"
                  maxLength={30}
                  disabled={isSaving}
                  className={inputClass}
                />

              </div>

              {/* Position / Title */}

              <div>

                <label
                  htmlFor="positionTitle"
                  className={labelClass}
                >
                  Position / Title in Company
                </label>

                <input
                  id="positionTitle"
                  name="positionTitle"
                  type="text"
                  value={formData.positionTitle}
                  onChange={handleChange}
                  placeholder="e.g. Managing Director"
                  maxLength={100}
                  disabled={isSaving}
                  className={inputClass}
                />

              </div>

              {/* Relationship */}

              <div className="sm:col-span-2">

                <label
                  htmlFor="relationshipToCompany"
                  className={labelClass}
                >
                  Relationship to Company
                </label>

                <select
                  id="relationshipToCompany"
                  name="relationshipToCompany"
                  value={formData.relationshipToCompany}
                  onChange={handleChange}
                  disabled={isSaving}
                  className={inputClass}
                >

                  <option value="">
                    Select relationship
                  </option>

                  {formData.relationshipToCompany &&
                    !relationshipOptions.includes(
                      formData.relationshipToCompany
                    ) && (
                      <option
                        value={formData.relationshipToCompany}
                      >
                        {formData.relationshipToCompany}
                      </option>
                    )}

                  {relationshipOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ))}

                </select>

              </div>

            </div>

            {/* ----------------------------------- */}
            {/* AUTHORIZATION CONFIRMATION */}
            {/* ----------------------------------- */}

            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  name="authorizedToApply"
                  checked={formData.authorizedToApply}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-950"
                />

                <span>

                  <span className="block text-sm font-medium text-zinc-900">
                    Authorization Confirmation
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-zinc-600">
                    I confirm that I am authorized
                    to submit this company registration
                    application and that the information
                    provided is accurate.
                  </span>

                </span>

              </label>

            </div>

            {/* ----------------------------------- */}
            {/* DRAFT INFORMATION */}
            {/* ----------------------------------- */}

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">

              <p className="text-xs leading-5 text-blue-800">
                You can save incomplete applicant
                information while the application
                remains a draft. All required fields
                and authorization confirmation must
                be completed before final submission.
              </p>

            </div>

          </div>

          {/* ======================================= */}
          {/* 2. COMPANY INFORMATION */}
          {/* ======================================= */}

          <div className={cardClass}>

            <div className="mb-5 border-b border-zinc-100 pb-4">

              <h2 className="text-base font-semibold text-zinc-950">
                2. Company Information
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Update the official business details
                of your real-estate company.
              </p>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              {/* Company Name */}

              <div className="sm:col-span-2">

                <label
                  htmlFor="name"
                  className={labelClass}
                >
                  Registered Company Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Registered company name"
                  autoComplete="organization"
                  required
                  disabled={isSaving}
                  className={inputClass}
                />

              </div>

              {/* Incorporation Number */}

              <div className="sm:col-span-2">

                <label
                  htmlFor="registrationNumber"
                  className={labelClass}
                >
                  BRELA Incorporation Number
                </label>

                <input
                  id="registrationNumber"
                  name="registrationNumber"
                  type="text"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="Official incorporation number"
                  required
                  disabled={isSaving}
                  className={inputClass}
                />

                <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                  Enter the registration number
                  shown on the company's BRELA
                  Certificate of Incorporation.
                </p>

              </div>

              {/* Company Email */}

              <div>

                <label
                  htmlFor="contactEmail"
                  className={labelClass}
                >
                  Company Email Address
                </label>

                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="company@example.com"
                  autoComplete="email"
                  required
                  disabled={isSaving}
                  className={inputClass}
                />

              </div>

              {/* Company Phone */}

              <div>

                <label
                  htmlFor="contactPhone"
                  className={labelClass}
                >
                  Company Phone Number
                </label>

                <input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+255 712 345 678"
                  autoComplete="tel"
                  required
                  disabled={isSaving}
                  className={inputClass}
                />

              </div>

              {/* Company Address */}

              <div className="sm:col-span-2">

                <label
                  htmlFor="address"
                  className={labelClass}
                >
                  Physical Address
                </label>

                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Company physical address"
                  rows={3}
                  required
                  disabled={isSaving}
                  className={inputClass}
                />

              </div>

            </div>

          </div>

          {/* ======================================= */}
          {/* ACTION BUTTONS */}
          {/* ======================================= */}

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

              {/* Cancel */}

              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className={secondaryButtonClass}
              >
                Cancel
              </button>

              {/* Save */}

              <button
                type="submit"
                disabled={isSaving}
                className={primaryButtonClass}
              >
                {isSaving
                  ? "Saving Changes..."
                  : "Save Changes & Return to Preview"}
              </button>

            </div>

          </div>

        </form>
      )}

    </section>
  );
};

export default CompanyDraftEditor;