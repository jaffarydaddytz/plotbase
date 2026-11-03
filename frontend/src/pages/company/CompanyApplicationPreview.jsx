import { useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

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

  useEffect(() => {
    const controller = new AbortController();

    const loadApplication = async () => {
      try {
        setLoading(true);
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

        const application = response.data.applications?.find(
          (item) => String(item.id) === String(companyId)
        );

        if (!application) {
          throw new Error("Company draft not found.");
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
      setError("Authentication or company information is missing.");
      setLoading(false);
    }

    return () => controller.abort();
  }, [companyId, token]);

  if (loading) {
    return (
      <p role="status" className="py-8 text-center text-sm text-zinc-500">
        Loading application preview...
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error}
      </div>
    );
  }

  if (!company) return null;

  const documents = company.documents || [];

  const uploadedCount = REQUIRED_DOCUMENTS.filter((item) =>
    documents.some((doc) => doc.documentType === item.type)
  ).length;

  const readyToSubmit =
    company.verificationStatus === "DRAFT" &&
    uploadedCount === REQUIRED_DOCUMENTS.length;

  return (
    <section className="mx-auto w-full max-w-5xl">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">
            Review Company Application
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Confirm your information before submitting for administrator review.
          </p>
        </div>

        <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
          {company.verificationStatus}
        </span>
      </div>

      {/* Main Preview */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Company Information */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-zinc-950">
            Company Information
          </h2>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-xs text-zinc-500">Company Name</p>
              <p className="font-semibold text-zinc-900">
                {company.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">
                Incorporation Number
              </p>
              <p className="font-medium text-zinc-900">
                {company.registrationNumber}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">
                Phone Number
              </p>
              <p className="font-medium text-zinc-900">
                {company.contactPhone}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-zinc-500">
                Company Email
              </p>
              <p className="break-all font-medium text-zinc-900">
                {company.contactEmail}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-zinc-500">
                Physical Address
              </p>
              <p className="font-medium text-zinc-900">
                {company.address}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Documents */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-zinc-950">
              Verification Documents
            </h2>

            <span className="text-xs font-semibold text-zinc-600">
              {uploadedCount}/3 Uploaded
            </span>
          </div>

          <div className="space-y-3">
            {REQUIRED_DOCUMENTS.map((item) => {
              const uploaded = documents.find(
                (doc) => doc.documentType === item.type
              );

              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3"
                >
                  <p className="text-xs font-medium text-zinc-800">
                    {item.label}
                  </p>

                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      uploaded ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {uploaded ? "Uploaded" : "Missing"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Uploaded documents will be reviewed by the
            Plotbase administrator after final submission.
          </p>
        </div>
      </div>

      {/* Confirmation */}
      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-100 p-4">
        <p className="text-sm text-zinc-700">
          Please verify that your company information is correct.
          Your application will only be sent for administrator review
          after you confirm submission.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            ← Back to Documents
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            disabled={isSubmitting}
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Edit Information
          </button>
        )}

        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!readyToSubmit || isSubmitting}
            className="rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Submitting..."
              : "Submit for Admin Review"}
          </button>
        )}
      </div>
    </section>
  );
};

export default CompanyApplicationPreview;