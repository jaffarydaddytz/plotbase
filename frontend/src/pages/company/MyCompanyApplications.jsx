import { useState } from "react";

const STATUS_STYLES = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  SUSPENDED: "bg-orange-50 text-orange-700",
};

const DOCUMENTS = [
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

const STATUS_MESSAGES = {
  DRAFT: "Registration is incomplete. Draft continuation will be available once the new submission workflow is implemented.",
  PENDING: "Your application is awaiting administrator review.",
  APPROVED: "Your company has been verified and approved by Plotbase.",
  REJECTED: "Your application was rejected. Review the administrator's feedback.",
  SUSPENDED: "This company is currently suspended.",
};

const MyCompanyApplications = ({
  applications = [],
  onRegisterAnother,
}) => {
  const [selectedId, setSelectedId] = useState("");

  const selectedCompany =
    applications.find((company) => company.id === selectedId) ||
    applications[0];

  if (!selectedCompany) return null;

  const status = selectedCompany.verificationStatus;
  const uploadedDocuments = selectedCompany.documents || [];

  const uploadedCount = DOCUMENTS.filter((item) =>
    uploadedDocuments.some(
      (document) => document.documentType === item.type
    )
  ).length;

  return (
    <section className="mx-auto w-full max-w-5xl">

      {/* PAGE HEADER */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-xl font-bold text-zinc-950 sm:text-2xl">
            My Company Applications
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage and track your company applications.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegisterAnother}
          className="shrink-0 self-start rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:self-auto"
        >
          + Register Another Company
        </button>

      </div>

      {/* MAIN CARD */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">

        {/* COMPANY SELECTOR AND STATUS */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div className="w-full sm:max-w-md">

            <label
              htmlFor="selectedCompany"
              className="block text-xs font-semibold text-zinc-700"
            >
              Select Company
            </label>

            <select
              id="selectedCompany"
              value={selectedCompany.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200"
            >
              {applications.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} — {company.verificationStatus}
                </option>
              ))}
            </select>

          </div>

          <div className="flex items-center gap-2">

            <span className="text-xs text-zinc-500">
              {applications.length} Application(s)
            </span>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                STATUS_STYLES[status] || STATUS_STYLES.DRAFT
              }`}
            >
              {status === "PENDING" ? "Pending Review" : status}
            </span>

          </div>

        </div>

        {/* INFORMATION GRID */}
        <div className="mt-4 grid gap-5 border-t border-zinc-100 pt-4 md:grid-cols-2">

          {/* LEFT: COMPANY INFORMATION */}
          <section>

            <h2 className="text-sm font-bold text-zinc-950">
              Company Information
            </h2>

            <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">

              <div className="sm:col-span-2">
                <p className="text-xs text-zinc-500">
                  Company Name
                </p>

                <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                  {selectedCompany.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Incorporation Number
                </p>

                <p className="mt-0.5 break-words text-sm font-medium text-zinc-800">
                  {selectedCompany.registrationNumber}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Phone Number
                </p>

                <p className="mt-0.5 text-sm font-medium text-zinc-800">
                  {selectedCompany.contactPhone}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Company Email
                </p>

                <p className="mt-0.5 break-all text-sm font-medium text-zinc-800">
                  {selectedCompany.contactEmail}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Physical Address
                </p>

                <p className="mt-0.5 break-words text-sm font-medium text-zinc-800">
                  {selectedCompany.address}
                </p>
              </div>

            </div>

          </section>

          {/* RIGHT: VERIFICATION DOCUMENTS */}
          <section>

            <div className="flex items-center justify-between gap-2">

              <h2 className="text-sm font-bold text-zinc-950">
                Verification Documents
              </h2>

              <span className="text-xs font-semibold text-zinc-600">
                {uploadedCount}/{DOCUMENTS.length} Uploaded
              </span>

            </div>

            <div className="mt-3 space-y-2">

              {DOCUMENTS.map((item) => {

                const document = uploadedDocuments.find(
                  (doc) => doc.documentType === item.type
                );

                return (
                  <div
                    key={item.type}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
                  >

                    <p className="min-w-0 text-xs font-medium text-zinc-800">
                      {item.label}
                    </p>

                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        document
                          ? "text-green-700"
                          : "text-zinc-400"
                      }`}
                    >
                      {document
                        ? document.reviewStatus || "Uploaded"
                        : "Not Uploaded"}
                    </span>

                  </div>
                );
              })}

            </div>

          </section>

        </div>

        {/* APPLICATION STATUS MESSAGE */}
        <div
          className={`mt-4 rounded-lg border px-3 py-3 ${
            status === "REJECTED"
              ? "border-red-200 bg-red-50"
              : "border-zinc-200 bg-zinc-50"
          }`}
        >

          <p
            className={`text-xs leading-relaxed ${
              status === "REJECTED"
                ? "text-red-700"
                : "text-zinc-700"
            }`}
          >
            {STATUS_MESSAGES[status] || "Application status unavailable."}
          </p>

          {status === "REJECTED" &&
            selectedCompany.rejectionReason && (

              <p className="mt-2 text-xs font-medium text-red-800">
                Reason: {selectedCompany.rejectionReason}
              </p>

            )}

        </div>

      </div>

    </section>
  );
};

export default MyCompanyApplications;