import { useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

const DOCUMENTS = [
  {
    value: "REGISTRATION_CERTIFICATE",
    label: "Certificate of Registration",
    description: "Upload your company's official registration certificate.",
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

const CompanyVerificationDocuments = ({ companyId }) => {
  const { token } = useAuth();

  const [uploadedTypes, setUploadedTypes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentStep = uploadedTypes.length;
  const currentDocument = DOCUMENTS[currentStep];

  const allUploaded = currentStep === DOCUMENTS.length;

  // Handle file selection
  const handleFileChange = (e) => {
    setError("");

    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Only PDF, JPG, and PNG files are allowed.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Select a valid document not exceeding 5 MB.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  // Upload current document
  const handleUpload = async (e) => {
    e.preventDefault();

    if (isUploading || allUploaded) return;

    setError("");
    setSuccess("");

    if (!companyId || !token) {
      setError("Company information or authentication is missing.");
      return;
    }

    if (!selectedFile || !currentDocument) {
      setError("Please select a document.");
      return;
    }

    const formData = new FormData();

    formData.append("documentType", currentDocument.value);
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
          response.data.message || "Document upload failed."
        );
      }

      setUploadedTypes((prev) => [
        ...prev,
        currentDocument.value,
      ]);

      setSelectedFile(null);

      setSuccess(`${currentDocument.label} uploaded successfully.`);

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
    <section className="mx-auto w-full max-w-[520px] rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">

      {/* Progress Header */}
      <div className="mb-5">

        <h2 className="text-xl font-bold text-zinc-950">
          Verification Documents
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          {allUploaded
            ? "All required documents submitted."
            : `Document ${currentStep + 1} of ${DOCUMENTS.length}`}
        </p>

      </div>

      {/* Progress Indicator */}
      <div className="mb-6 grid grid-cols-3 gap-2">

        {DOCUMENTS.map((document, index) => (
          <div
            key={document.value}
            className={`h-1.5 rounded-full ${
              index <= currentStep
                ? "bg-zinc-950"
                : "bg-zinc-200"
            }`}
          />
        ))}

      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* Current Document Step */}
      {!allUploaded && currentDocument && (

        <form onSubmit={handleUpload} className="space-y-5">

          <div>

            <h3 className="text-lg font-semibold text-zinc-950">
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
              className="block w-full min-w-0 rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-900"
            />

            <p className="mt-2 text-xs text-zinc-500">
              Accepted formats: PDF, JPG, PNG · Maximum 5 MB
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
            disabled={isUploading || !selectedFile}
            className="w-full rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading
              ? "Uploading..."
              : currentStep === DOCUMENTS.length - 1
              ? "Upload Final Document"
              : "Upload & Continue"}
          </button>

        </form>

      )}

      {/* Completed */}
      {allUploaded && (

        <div className="text-center">

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-950">
            ✓
          </div>

          <h3 className="text-xl font-bold text-zinc-950">
            Documents Submitted
          </h3>

          <p className="mt-3 text-sm text-zinc-600">
            All three verification documents have been uploaded
            successfully.
          </p>

          <p className="mt-3 text-sm text-zinc-600">
            Your company application remains pending until
            reviewed and approved by a Plotbase administrator.
          </p>

        </div>

      )}

    </section>
  );
};

export default CompanyVerificationDocuments;