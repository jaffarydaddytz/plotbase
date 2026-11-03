import { useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

const initialForm = {
  name: "",
  registrationNumber: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200";

const labelClass = "block text-xs font-semibold text-zinc-700";

const CompanyDraftEditor = ({
  companyId,
  onCancel,
  onSaved,
}) => {
  const { token } = useAuth();

  const [formData, setFormData] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  // Load existing company information
  useEffect(() => {
    const controller = new AbortController();

    const loadDraft = async () => {
      if (!companyId || !token) {
        setError("Company information or authentication is missing.");
        setLoading(false);
        return;
      }

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

        if (
          !response.data.success ||
          !Array.isArray(response.data.applications)
        ) {
          throw new Error("Unable to load company information.");
        }

        const company = response.data.applications.find(
          (item) => String(item.id) === String(companyId)
        );

        if (!company) {
          throw new Error("Company application not found.");
        }

        if (company.verificationStatus !== "DRAFT") {
          throw new Error("Only draft applications can be edited.");
        }

        setFormData({
          name: company.name || "",
          registrationNumber: company.registrationNumber || "",
          contactEmail: company.contactEmail || "",
          contactPhone: company.contactPhone || "",
          address: company.address || "",
        });

      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
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
  }, [companyId, token]);

  // Update form fields
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // Save draft changes
  const handleSave = async (e) => {
    e.preventDefault();

    if (isSaving || loading) return;

    setError("");

    if (!companyId || !token) {
      setError("Company information or authentication is missing.");
      return;
    }

    if (formData.name.trim().length < 2) {
      setError("Company name must contain at least 2 characters.");
      return;
    }

    setIsSaving(true);

    try {
      const updates = {
        name: formData.name.trim(),
        registrationNumber:
          formData.registrationNumber.trim().toUpperCase(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        address: formData.address.trim(),
      };

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
          response.data.message || "Unable to save changes."
        );
      }

      // Notify parent after successful save
      onSaved?.(response.data.company);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to update company draft."
      );

    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">
            Edit Company Information
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Update your company details before final submission.
          </p>
        </div>

        <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
          DRAFT
        </span>
      </div>

      {/* Editor Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">

        {loading ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            Loading company information...
          </p>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">

              <div className="grid gap-4 md:grid-cols-2">

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
                    disabled={isSaving}
                    required
                    className={inputClass}
                  />
                </div>

                {/* Incorporation Number */}
                <div>
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
                    disabled={isSaving}
                    required
                    className={inputClass}
                  />
                </div>

                {/* Company Email */}
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
                    disabled={isSaving}
                    required
                    className={inputClass}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label
                    htmlFor="contactPhone"
                    className={labelClass}
                  >
                    Phone Number
                  </label>

                  <input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    disabled={isSaving}
                    required
                    className={inputClass}
                  />
                </div>

                {/* Physical Address */}
                <div className="md:col-span-2">
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
                    disabled={isSaving}
                    rows={2}
                    required
                    className={inputClass}
                  />
                </div>

              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-between gap-3 border-t border-zinc-100 pt-4">

                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving Changes..."
                    : "Save Changes & Return to Preview"}
                </button>

              </div>

            </form>
          </>
        )}

      </div>

    </section>
  );
};

export default CompanyDraftEditor;