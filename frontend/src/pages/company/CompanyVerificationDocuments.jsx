import { useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

const DOCUMENTS = [
  {
    value: "REGISTRATION_CERTIFICATE",
    label: "Certificate of Incorporation",
    description: "Upload your company's incorporation certificate.",
  },
  {
    value: "TAX_CERTIFICATE",
    label: "Tax Certificate",
    description: "Upload your company's tax registration certificate.",
  },
  {
    value: "BUSINESS_LICENSE",
    label: "Business License",
    description: "Upload your company's valid business license.",
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const CompanyVerificationDocuments = ({
  companyId,
  onContinueToPreview,
}) => {
  const { token } = useAuth();

  const [uploadedTypes, setUploadedTypes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Restore previously uploaded documents from the backend
  useEffect(() => {
    const controller = new AbortController();

    const loadDocuments = async () => {
      setLoading(true);
      setLoadError("");
      setError("");
      setSuccess("");
      setUploadedTypes([]);
      setSelectedFile(null);

      // Validate required information
      if (!companyId) {
        setLoadError(
          "Company draft ID is missing. Return to My Company Applications."
        );
        setLoading(false);
        return;
      }

      if (!token) {
        setLoadError(
          "Authentication is missing. Please log in again."
        );
        setLoading(false);
        return;
      }

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

        // Find the current company
        const company = response.data.applications.find(
          (application) =>
            String(application.id) === String(companyId)
        );

        if (!company) {
          throw new Error(
            "Company application not found."
          );
        }

        // Only draft applications can continue uploading
        if (company.verificationStatus !== "DRAFT") {
          throw new Error(
            "This application is no longer a draft. View its status in My Company Applications."
          );
        }

        // Restore document progress
        const uploaded = DOCUMENTS.filter((document) =>
          company.documents?.some(
            (item) => item.documentType === document.value
          )
        ).map((document) => document.value);

        if (!controller.signal.aborted) {
          setUploadedTypes(uploaded);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setLoadError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load verification documents."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadDocuments();

    return () => controller.abort();
  }, [companyId, token]);

  // Determine the next required document
  const currentDocument = DOCUMENTS.find(
    (document) => !uploadedTypes.includes(document.value)
  );

  const currentStep = uploadedTypes.length;

  const allUploaded =
    currentStep === DOCUMENTS.length;

  // Handle file selection
  const handleFileChange = (e) => {
    setError("");
    setSuccess("");

    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError(
        "Only PDF, JPG, and PNG files are allowed."
      );

      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    if (
      file.size === 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      setError(
        "Select a valid document not exceeding 5 MB."
      );

      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  // Upload the selected document
  const handleUpload = async (e) => {
    e.preventDefault();

    if (
      isUploading ||
      loading ||
      loadError ||
      allUploaded
    ) {
      return;
    }

    setError("");
    setSuccess("");

    if (!companyId || !token) {
      setError(
        "Company information or authentication is missing."
      );
      return;
    }

    if (!selectedFile || !currentDocument) {
      setError("Please select a document.");
      return;
    }

    const formData = new FormData();

    formData.append(
      "documentType",
      currentDocument.value
    );

    formData.append("document", selectedFile);

    setIsUploading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/companies/${companyId}/documents`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Document upload failed."
        );
      }

      // Update progress only after successful upload
      setUploadedTypes((prev) =>
        prev.includes(currentDocument.value)
          ? prev
          : [...prev, currentDocument.value]
      );

      setSelectedFile(null);

      setSuccess(
        `${currentDocument.label} uploaded successfully.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to upload document."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[520px] rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">

      {/* HEADER */}
      <div className="mb-4 flex items-start justify-between gap-3">

        <div>
          <h2 className="text-lg font-bold text-zinc-950">
            Verification Documents
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {loading
              ? "Loading documents..."
              : allUploaded
              ? "All required documents uploaded."
              : `Document ${currentStep + 1} of ${DOCUMENTS.length}`}
          </p>
        </div>

        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          DRAFT
        </span>

      </div>

      {/* LOADING */}
      {loading && (
        <p
          role="status"
          className="py-5 text-center text-sm text-zinc-500"
        >
          Checking uploaded documents...
        </p>
      )}

      {/* LOAD ERROR */}
      {!loading && loadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      )}

      {!loading && !loadError && (
        <>

          {/* PROGRESS INDICATOR */}
          <div className="mb-4 grid grid-cols-3 gap-2">

            {DOCUMENTS.map((document) => (
              <div
                key={document.value}
                className={`h-1.5 rounded-full ${
                  uploadedTypes.includes(document.value)
                    ? "bg-zinc-950"
                    : "bg-zinc-200"
                }`}
              />
            ))}

          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {success && !allUploaded && (
            <div
              role="status"
              className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          {/* DOCUMENT UPLOAD FORM */}
          {!allUploaded && currentDocument && (

            <form
              onSubmit={handleUpload}
              className="space-y-4"
            >

              {/* Document Information */}
              <div>
                <h3 className="text-base font-semibold text-zinc-950">
                  {currentDocument.label}
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  {currentDocument.description}
                </p>
              </div>

              {/* File Selection */}
              <div>
                <label
                  htmlFor="verificationDocument"
                  className="mb-2 block text-sm font-medium text-zinc-800"
                >
                  Select Document
                </label>

                <input
                  key={currentDocument.value}
                  id="verificationDocument"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  required
                  className="block w-full min-w-0 rounded-lg border border-zinc-300 bg-zinc-50 p-2.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-900"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  PDF, JPG, PNG - Maximum 5 MB
                </p>
              </div>

              {/* Selected File */}
              {selectedFile && (
                <div className="rounded-lg bg-zinc-50 p-3">

                  <p className="break-all text-sm font-medium text-zinc-800">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                </div>
              )}

              {/* Upload Button */}
              <button
                type="submit"
                disabled={
                  isUploading ||
                  !selectedFile
                }
                className="w-full rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading
                  ? "Uploading..."
                  : currentStep === DOCUMENTS.length - 1
                  ? "Upload Final Document"
                  : "Upload & Continue"}
              </button>

            </form>

          )}

          {/* ALL DOCUMENTS UPLOADED */}
          {allUploaded && (

            <div className="space-y-4">

              <div className="rounded-lg bg-green-50 p-4 text-center">

                <h3 className="text-base font-bold text-green-800">
                  All Documents Uploaded
                </h3>

                <p className="mt-2 text-sm text-green-700">
                  All three verification documents have been uploaded successfully.
                </p>

              </div>

              <p className="text-center text-sm text-zinc-600">
                Your application is still a draft.
                Review your information before submitting
                it for administrator approval.
              </p>

              {/* Continue to Preview */}
              {onContinueToPreview && (
                <button
                  type="button"
                  onClick={onContinueToPreview}
                  className="w-full rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Continue to Preview &rarr;
                </button>
              )}

            </div>

          )}

        </>
      )}

    </section>
  );
};

export default CompanyVerificationDocuments;