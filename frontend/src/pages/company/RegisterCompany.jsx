import { useState } from "react";
import axios from "axios";

import Navbar from "../../components/common/Navbar";
import CompanyVerificationDocuments from "./CompanyVerificationDocuments";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

const initialFormData = {
  name: "",
  registrationNumber: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200";

const labelClass =
  "block text-sm font-medium text-zinc-800";

const RegisterCompany = () => {
  const { token } = useAuth();

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState(initialFormData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [registeredCompany, setRegisteredCompany] = useState(null);

  const activeStep = registeredCompany ? 3 : step;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // Validate each step separately
  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (formData.name.trim().length < 2) {
        setError(
          "Company name must contain at least 2 characters."
        );
        return false;
      }

      if (!formData.registrationNumber.trim()) {
        setError("Company registration number is required.");
        return false;
      }
    }

    if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(formData.contactEmail.trim())) {
        setError("Please enter a valid company email.");
        return false;
      }

      if (!formData.contactPhone.trim()) {
        setError("Company phone number is required.");
        return false;
      }

      if (!formData.address.trim()) {
        setError("Company address is required.");
        return false;
      }
    }

    return true;
  };

  // Move to contact information
  const handleNext = (e) => {
    e.preventDefault();

    setError("");

    if (!validateStep(1)) return;

    setStep(2);
  };

  // Return to company information
  const handleBack = () => {
    setError("");
    setStep(1);
  };

  // Submit company registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");
    setSuccess("");

    if (!token) {
      setError("Please log in before registering a company.");
      return;
    }

    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const companyData = {
        name: formData.name.trim(),
        registrationNumber:
          formData.registrationNumber.trim().toUpperCase(),
        contactEmail:
          formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        address: formData.address.trim(),
      };

      const response = await axios.post(
        `${API_URL}/api/companies/register`,
        companyData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setRegisteredCompany(response.data.company);

        setSuccess(
          response.data.message ||
            "Company registered successfully."
        );

        setFormData(initialFormData);
      } else {
        setError(
          response.data.message ||
            "Company registration failed."
        );
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else if (err.response?.status === 403) {
        setError(
          "You are not authorized to register a company."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to register company. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pt-[60px]">

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-4 sm:px-6">

        <div className="w-full max-w-[520px]">

          {/* Heading */}
          <div className="mb-5 text-center">

            <h1 className="text-2xl font-bold text-zinc-950">
              Register Your Company
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Complete the steps to register your
              real-estate company on Plotbase.
            </p>

          </div>

          {/* Step Progress */}
          <div className="mb-5 grid grid-cols-3 gap-2">

            {[
              "Company",
              "Contact",
              "Documents",
            ].map((label, index) => {
              const stepNumber = index + 1;
              const isActive = activeStep === stepNumber;
              const isCompleted = activeStep > stepNumber;

              return (
                <div key={label} className="text-center">

                  <div
                    className={`h-1.5 rounded-full ${
                      isActive || isCompleted
                        ? "bg-zinc-950"
                        : "bg-zinc-200"
                    }`}
                  />

                  <p
                    className={`mt-2 text-xs ${
                      isActive
                        ? "font-semibold text-zinc-950"
                        : "text-zinc-500"
                    }`}
                  >
                    {label}
                  </p>

                </div>
              );
            })}

          </div>

          {/* Registration Card */}
        <div
  className={
    registeredCompany
      ? "hidden"
      : "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"
  }
>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div
                role="status"
                className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
              >
                {success}
              </div>
            )}

            {/* STEP 1 */}
            {!registeredCompany && step === 1 && (

              <form
                onSubmit={handleNext}
                className="space-y-4"
              >

                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    Company Details
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Enter your company's official information.
                  </p>
                </div>

                {/* Company Name */}
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Company Name
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
                    className={inputClass}
                  />
                </div>

                {/* Registration Number */}
                <div>
                  <label
                    htmlFor="Incorporation Number"
                    className={labelClass}
                  >
                    Enter your BRELA incorporation number
                  </label>
                  <p className="mt-1.5 text-xs text-zinc-500">
  Enter the incorporation number shown on your
  BRELA Certificate of Incorporation.
</p>

                  <input
                    id="registrationNumber"
                    name="registrationNumber"
                    type="text"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="Official registration number"
                    required
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Continue to Contact Information →
                </button>

              </form>

            )}

            {/* STEP 2 */}
            {!registeredCompany && step === 2 && (

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    Contact Information
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    How can Plotbase contact your company?
                  </p>
                </div>

                {/* Contact Email */}
                <div>
                  <label
                    htmlFor="contactEmail"
                    className={labelClass}
                  >
                    Company Email
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
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label
                    htmlFor="contactPhone"
                    className={labelClass}
                  >
                    Company Phone
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
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </div>

                {/* Address */}
                <div>
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
                    rows={2}
                    required
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">

                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : "Register Company"}
                  </button>

                </div>

              </form>

            )}

            {/* STEP 3 */}
            {registeredCompany && (

              <div>

                <div className="mb-4">

                  <h2 className="text-lg font-semibold text-zinc-950">
                    Company Created Successfully
                  </h2>

                  <p className="mt-2 text-sm text-zinc-600">
                    {registeredCompany.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Verification Status:{" "}
                    <span className="font-semibold">
                      {registeredCompany.verificationStatus}
                    </span>
                  </p>

                </div>

                <p className="text-sm text-zinc-600">
                  Upload the required documents to continue
                  your company verification process.
                </p>

              </div>

            )}

          </div>

          {/* DOCUMENT UPLOAD STEP */}
          {registeredCompany && (
            <CompanyVerificationDocuments
              companyId={
                registeredCompany.id ||
                registeredCompany._id
              }
            />
          )}

        </div>

      </main>

    </div>
  );
};

export default RegisterCompany;