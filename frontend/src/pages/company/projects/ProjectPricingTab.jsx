import { useEffect, useState } from "react";
import axios from "axios";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";

import API_URL from "../../../config";
import { useAuth } from "../../../context/AuthContext";

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("en-TZ").format(Number(value) || 0);

const money = (value) => `TZS ${formatNumber(value)}`;

// ==========================================
// METRIC CARD
// ==========================================

const Stat = ({ label, value }) => (
  <div className="rounded-lg border border-zinc-200 bg-white p-3">
    <p className="text-[11px] font-medium text-zinc-500">{label}</p>

    <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
  </div>
);

// ==========================================
// PROJECT PRICING TAB
// ==========================================

const ProjectPricingTab = ({
  companyId,
  projectId,
  project,
  hasUnsavedGeneralChanges,
  onUpdated,
}) => {
  const { token } = useAuth();

  // ========================================
  // STATE
  // ========================================

  const [input, setInput] = useState(String(project.pricePerSqm ?? ""));

  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  // ==========================================
  // PAYMENT TERMS STATE
  // ==========================================

  const [paymentTermsInput, setPaymentTermsInput] = useState({
    fullPaymentEnabled: project.paymentTerms?.fullPaymentEnabled ?? true,

    installmentDurationsMonths: [
      ...(project.paymentTerms?.installmentDurationsMonths ?? []),
    ],
  });

  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  // ========================================
  // SYNC CURRENT PROJECT PRICE
  // ========================================

  useEffect(() => {
    setInput(String(project.pricePerSqm ?? ""));
    setReviewing(false);
  }, [projectId, project.pricePerSqm]);

  // ==========================================
  // SYNC PROJECT PAYMENT TERMS
  // ==========================================

  useEffect(() => {
    setPaymentTermsInput({
      fullPaymentEnabled: project.paymentTerms?.fullPaymentEnabled ?? true,

      installmentDurationsMonths: [
        ...(project.paymentTerms?.installmentDurationsMonths ?? []),
      ],
    });

    setPaymentError("");
    setPaymentSuccess("");
  }, [projectId, project.paymentTerms]);

  // ========================================
  // VALIDATE PRICE
  // ========================================

  const rawPrice = input.trim();

  const validPrice =
    /^(0|[1-9]\d*)$/.test(rawPrice) && Number.isSafeInteger(Number(rawPrice));

  const nextPrice = validPrice ? Number(rawPrice) : null;

  const isChanged = validPrice && nextPrice !== Number(project.pricePerSqm);

  const stats = project.statistics || {};

  // ========================================
  // HANDLE INPUT
  // ========================================

  const onPriceChange = (event) => {
    setInput(event.target.value);

    setReviewing(false);
    setError("");
    setSuccess("");
    setWarning("");
  };

  // ========================================
  // REVIEW AND SAVE PRICING
  // ========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");
    setWarning("");

    if (!validPrice) {
      setError(
        "Enter a valid whole-number TZS price per sqm (zero or higher).",
      );
      return;
    }

    if (!isChanged) {
      setError("Enter a price different from the current rate.");
      return;
    }

    // First submission opens confirmation.
    if (!reviewing) {
      setReviewing(true);
      return;
    }

    // Second submission confirms the update.
    setSaving(true);

    try {
      const { data } = await axios.patch(
        `${API_URL}/api/companies/${companyId}/projects/${projectId}/pricing`,
        {
          pricePerSqm: nextPrice,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data?.success !== true || !data.project) {
        throw new Error("Invalid pricing update response.");
      }

      // Update the displayed project price.
      onUpdated(data.project);

      setInput(String(data.project.pricePerSqm));
      setReviewing(false);

      setSuccess(
        `Pricing saved. ${formatNumber(
          data.pricing?.availablePlotsMatched,
        )} AVAILABLE plot(s) were eligible for recalculation.`,
      );

      // Refresh inventory statistics after updating.
      // The PATCH response does not contain
      // aggregated inventory totals.

      try {
        const details = await axios.get(
          `${API_URL}/api/companies/${companyId}/projects/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (details.data?.success !== true || !details.data.project) {
          throw new Error("Refresh failed");
        }

        onUpdated(details.data.project);
      } catch {
        setWarning(
          "The new rate was saved, but inventory totals could not refresh. Reload the page to update the totals.",
        );
      }
    } catch (err) {
      setReviewing(false);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update pricing.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // SAVE PROJECT PAYMENT TERMS
  // ==========================================

  const handleSavePaymentTerms = async () => {
    if (paymentSaving) return;

    setPaymentError("");
    setPaymentSuccess("");

    const { fullPaymentEnabled, installmentDurationsMonths } =
      paymentTermsInput;

    // At least one payment method is required
    if (!fullPaymentEnabled && installmentDurationsMonths.length === 0) {
      setPaymentError("Enable at least one payment method.");
      return;
    }

    setPaymentSaving(true);

    try {
      const { data } = await axios.patch(
        `${API_URL}/api/companies/${companyId}/projects/${projectId}/payment-terms`,
        {
          fullPaymentEnabled,
          installmentDurationsMonths,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data?.success !== true || !data.paymentTerms) {
        throw new Error("Invalid payment terms response.");
      }

      // Update parent project state
      onUpdated({
        paymentTerms: data.paymentTerms,
      });

      setPaymentTermsInput({
        fullPaymentEnabled: data.paymentTerms.fullPaymentEnabled,

        installmentDurationsMonths:
          data.paymentTerms.installmentDurationsMonths,
      });

      setPaymentSuccess("Payment terms saved successfully.");
    } catch (err) {
      setPaymentError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save payment terms.",
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {/* HEADING */}

      <div>
        <h2 className="text-sm font-semibold text-zinc-950">Project Pricing</h2>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Update the rate for AVAILABLE plots. RESERVED and SOLD plot prices are
          protected.
        </p>
      </div>

      {/* CURRENT PRICING */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Current price/sqm"
          value={`${money(project.pricePerSqm)}/sqm`}
        />

        <Stat
          label="Total land area"
          value={`${formatNumber(stats.totalAreaSqm)} sqm`}
        />

        <Stat
          label="Total inventory value"
          value={money(stats.totalInventoryValue)}
        />
      </div>

      {/* PRICING FORM */}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-zinc-200 p-4">
        {/* PRICE INPUT */}

        <div>
          <label
            htmlFor="project-price-per-sqm"
            className="text-xs font-semibold text-zinc-800">
            New price per sqm (TZS)
          </label>

          <div className="mt-2 flex max-w-sm overflow-hidden rounded-lg border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900">
            <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-xs font-medium text-zinc-600">
              TZS
            </span>

            <input
              id="project-price-per-sqm"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={input}
              onChange={onPriceChange}
              disabled={saving}
              placeholder="e.g. 6000"
              aria-invalid={Boolean(error)}
              className="h-10 min-w-0 flex-1 px-3 text-sm text-zinc-950 outline-none disabled:bg-zinc-50"
            />

            <span className="flex items-center px-3 text-xs text-zinc-500">
              /sqm
            </span>
          </div>

          <p className="mt-1.5 text-[11px] text-zinc-500">
            Whole TZS values only. Pricing changes are saved separately from
            General Information.
          </p>
        </div>

        {/* PLOT STATUS OVERVIEW */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="AVAILABLE — repriced"
            value={formatNumber(stats.availablePlots)}
          />

          <Stat
            label="RESERVED — protected"
            value={formatNumber(stats.reservedPlots)}
          />

          <Stat
            label="SOLD — protected"
            value={formatNumber(stats.soldPlots)}
          />
        </div>

        {/* UNSAVED GENERAL CHANGES */}

        {hasUnsavedGeneralChanges && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            General Information has unsaved changes. Saving pricing will not
            save those changes.
          </p>
        )}

        {/* CONFIRMATION */}

        {reviewing && isChanged && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle size={16} />
              Confirm price update
            </div>

            <p className="mt-2 text-xs leading-5 text-amber-900">
              Change from <strong>{money(project.pricePerSqm)}/sqm</strong> to{" "}
              <strong>{money(nextPrice)}/sqm</strong>. Currently AVAILABLE plots
              will be recalculated using each plot's saved area. RESERVED and
              SOLD plot prices will not change.
              {project.status === "ACTIVE" &&
                " This project is ACTIVE, so public prices may change immediately."}
            </p>

            <p className="mt-2 text-[11px] text-amber-800">
              The plot counts are a snapshot. Eligibility is evaluated by the
              backend during the update.
            </p>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </p>
        )}

        {/* SUCCESS */}

        {success && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 size={15} className="shrink-0" />
            {success}
          </p>
        )}

        {/* WARNING */}

        {warning && (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {warning}
          </p>
        )}

        {/* ACTIONS */}

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-3">
          {reviewing && (
            <button
              type="button"
              onClick={() => setReviewing(false)}
              disabled={saving}
              className="h-9 rounded-lg border border-zinc-200 px-4 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={saving || !isChanged}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}

            {saving
              ? "Saving Pricing..."
              : reviewing
                ? "Confirm Price Update"
                : "Review Price Update"}
          </button>
        </div>
      </form>

      {/* ==========================================
    PROJECT PAYMENT TERMS
========================================== */}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-950">Payment Terms</h3>

          <p className="mt-1 text-xs text-zinc-500">
            Configure available payment options for this project.
          </p>
        </div>

        {/* FULL PAYMENT */}

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 p-3">
          <div>
            <p className="text-xs font-semibold text-zinc-900">Full Payment</p>

            <p className="mt-0.5 text-[11px] text-zinc-500">
              Customer pays the entire plot price.
            </p>
          </div>

          <input
            type="checkbox"
            checked={paymentTermsInput.fullPaymentEnabled}
            disabled={paymentSaving}
            onChange={(event) =>
              setPaymentTermsInput((previous) => ({
                ...previous,
                fullPaymentEnabled: event.target.checked,
              }))
            }
            className="h-4 w-4 accent-zinc-950"
          />
        </label>

        {/* INSTALLMENT OPTIONS */}

        <div className="mt-3 rounded-lg border border-zinc-200 p-3">
          <div className="mb-3">
            <p className="text-xs font-semibold text-zinc-900">
              Installment Payments
            </p>

            <p className="mt-0.5 text-[11px] text-zinc-500">
              Select available interest-free payment plans.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[3, 6, 12].map((month) => {
              const checked =
                paymentTermsInput.installmentDurationsMonths.includes(month);

              return (
                <label
                  key={month}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    checked
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={paymentSaving}
                    onChange={() => {
                      setPaymentTermsInput((previous) => ({
                        ...previous,

                        installmentDurationsMonths: checked
                          ? previous.installmentDurationsMonths.filter(
                              (value) => value !== month,
                            )
                          : [
                              ...previous.installmentDurationsMonths,
                              month,
                            ].sort((a, b) => a - b),
                      }));
                    }}
                    className="sr-only"
                  />
                  {month} Months
                </label>
              );
            })}
          </div>
        </div>

        {/* PAYMENT INFORMATION */}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <span className="rounded-md bg-zinc-100 px-2 py-1">Interest: 0%</span>

          <span className="rounded-md bg-zinc-100 px-2 py-1">
            Reservation: 24 hours
          </span>
        </div>

        {/* PAYMENT TERMS FEEDBACK */}

        {paymentError && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {paymentError}
          </p>
        )}

        {paymentSuccess && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            {paymentSuccess}
          </p>
        )}

        {/* SAVE PAYMENT TERMS */}

        <div className="mt-4 flex justify-end border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={handleSavePaymentTerms}
            disabled={paymentSaving || saving}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
            {paymentSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Payment Terms
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProjectPricingTab;
