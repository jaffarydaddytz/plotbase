import { useState } from "react";

import {
  ArrowLeft,
  CalendarPlus,
  Globe,
  LockKeyhole,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";

import { createVisit } from "./utils/visitStorage";

import {
  formatText,
  normalizePhone,
  formatLocalPhone,
} from "./utils/visitFormatting";

// ==========================================
// INITIAL FORM
// ==========================================

const initialForm = {
  title: "",
  organizer: "",
  destination: "",
  visitDate: "",
  departureTime: "",
  meetingPoint: "",
  contactPhone: "",
  fee: "0",
  visibility: "PRIVATE",
};

// ==========================================
// REUSABLE FORM FIELD
// ==========================================

const FormField = ({
  label,
  name,
  helperText,
  wrapperClassName = "",
  ...props
}) => {
  return (
    <div className={`min-w-0 space-y-1 ${wrapperClassName}`}>
      <label
        htmlFor={name}
        className="block text-xs font-medium sm:text-sm"
      >
        {label}
      </label>

      <Input
        id={name}
        name={name}
        className="h-9 w-full min-w-0"
        aria-describedby={
          helperText ? `${name}-hint` : undefined
        }
        {...props}
      />

      {helperText && (
        <p
          id={`${name}-hint`}
          className="text-[11px] text-muted-foreground"
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

// ==========================================
// CREATE VISIT
// ==========================================

const CreateVisit = ({ onCancel, onCreated }) => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  // ========================================
  // INPUT CHANGES
  // ========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ========================================
  // TEXT FORMATTING
  // ========================================

  const handleTextBlur = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: formatText(value),
    }));
  };

  // ========================================
  // PHONE FORMATTING
  // ========================================

  const handlePhoneBlur = () => {
    const normalized = normalizePhone(form.contactPhone);

    if (normalized) {
      setForm((previous) => ({
        ...previous,
        contactPhone: formatLocalPhone(normalized),
      }));
    }
  };

  // ========================================
  // FORM SUBMISSION
  // ========================================

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    const requiredFields = [
      form.title,
      form.organizer,
      form.destination,
      form.visitDate,
      form.departureTime,
      form.meetingPoint,
      form.contactPhone,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setError("Please complete all required fields.");
      return;
    }

    // Validate the organizer's mobile number.

    const contactPhone = normalizePhone(
      form.contactPhone
    );

    if (!contactPhone) {
      setError(
        "Enter a valid 10-digit mobile number starting with 06 or 07."
      );

      return;
    }

    // Validate the Go & Return Fee.

    const fee = Number(form.fee);

    if (
      form.fee.trim() === "" ||
      !Number.isSafeInteger(fee) ||
      fee < 0
    ) {
      setError("Enter a valid Go & Return Fee.");
      return;
    }

    // Validate date and departure time using EAT.

    const visitDateTime = new Date(
      `${form.visitDate}T${form.departureTime}:00+03:00`
    );

    if (
      Number.isNaN(visitDateTime.getTime()) ||
      visitDateTime <= new Date()
    ) {
      setError(
        "The site visit must be scheduled in the future."
      );

      return;
    }

    // Create and save visit.

    let visit;

    try {
      visit = createVisit({
        ...form,

        title: form.title.trim().replace(/\s+/g, " "),

        organizer: form.organizer
          .trim()
          .replace(/\s+/g, " "),

        destination: formatText(form.destination),

        meetingPoint: formatText(form.meetingPoint),

        contactPhone,

        fee,
      });
    } catch {
      setError(
        "Unable to save your visit. Please check that browser storage is available."
      );

      return;
    }

    onCreated(visit);
  };

  return (
    <section className="mx-auto w-full max-w-4xl">

      {/* ======================================
          COMPACT HEADING
      ====================================== */}

      <div className="mb-3 flex items-center gap-2">

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Back to FikaSite"
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <h1 className="text-xl font-semibold tracking-tight">
          Create a site visit
        </h1>

      </div>

      {/* ======================================
          VISIT FORM
      ====================================== */}

      <Card className="gap-0 rounded-xl py-0 shadow-none">

        <CardContent className="p-3 sm:p-4">

          <form
            onSubmit={handleSubmit}
            className="space-y-3"
          >

            <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:grid-cols-3">

              {/* Visit title */}

              <FormField
                label="Visit title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Vikindu Site Visit"
                maxLength={120}
                wrapperClassName="col-span-2 md:col-span-1"
                required
              />

              {/* Organizer */}

              <FormField
                label="Organizer"
                name="organizer"
                value={form.organizer}
                onChange={handleChange}
                placeholder="Company or individual"
                maxLength={100}
                wrapperClassName="col-span-2 md:col-span-1"
                required
              />

              {/* Destination */}

              <FormField
                label="Destination"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                onBlur={handleTextBlur}
                placeholder="e.g. Vikindu"
                maxLength={150}
                wrapperClassName="col-span-2 md:col-span-1"
                required
              />

              {/* Visit date */}

              <FormField
                label="Visit date"
                name="visitDate"
                type="date"
                value={form.visitDate}
                onChange={handleChange}
                required
              />

              {/* Departure time */}

              <FormField
                label="Departure time (EAT)"
                name="departureTime"
                type="time"
                value={form.departureTime}
                onChange={handleChange}
                required
              />

              {/* Meeting point */}

              <FormField
                label="Meeting point"
                name="meetingPoint"
                value={form.meetingPoint}
                onChange={handleChange}
                onBlur={handleTextBlur}
                placeholder="e.g. Mbagala Rangi Tatu"
                maxLength={150}
                wrapperClassName="col-span-2 md:col-span-1"
                required
              />

              {/* Contact number */}

              <FormField
                label="Contact number"
                name="contactPhone"
                type="tel"
                inputMode="tel"
                value={form.contactPhone}
                onChange={handleChange}
                onBlur={handlePhoneBlur}
                placeholder="0785907440"
                helperText="10 digits, starting with 06 or 07."
                maxLength={20}
                required
              />

              {/* Go & Return Fee */}

              <FormField
                label="Go & Return Fee (TZS)"
                name="fee"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.fee}
                onChange={handleChange}
                helperText="Per person. Enter 0 if free."
                required
              />

              {/* ==================================
                  VISIBILITY
              ================================== */}

              <fieldset className="col-span-2 min-w-0 space-y-1 md:col-span-1">

                <legend className="text-xs font-medium sm:text-sm">
                  Visibility
                </legend>

                <div className="grid grid-cols-2 gap-2">

                  {[
                    {
                      value: "PRIVATE",
                      label: "Private",
                      icon: LockKeyhole,
                    },
                    {
                      value: "PUBLIC",
                      label: "Public",
                      icon: Globe,
                    },
                  ].map((option) => {
                    const Icon = option.icon;

                    const selected =
                      form.visibility === option.value;

                    return (
                      <label
                        key={option.value}
                        className={`flex h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 transition-colors focus-within:ring-2 focus-within:ring-zinc-500 ${
                          selected
                            ? "border-zinc-900 bg-zinc-100"
                            : "hover:bg-muted/30"
                        }`}
                      >

                        <input
                          type="radio"
                          name="visibility"
                          value={option.value}
                          checked={selected}
                          onChange={handleChange}
                          className="sr-only"
                        />

                        <Icon className="h-3.5 w-3.5 shrink-0" />

                        <span className="text-xs font-medium sm:text-sm">
                          {option.label}
                        </span>

                      </label>
                    );
                  })}

                </div>

                <p className="text-[11px] text-muted-foreground">

                  {form.visibility === "PRIVATE"
                    ? "Unlisted visit."
                    : "Public discovery unavailable in demo."}

                </p>

              </fieldset>

            </div>

            {/* ======================================
                VALIDATION ERROR
            ====================================== */}

            {error && (

              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>

            )}

            {/* ======================================
                FORM ACTIONS
            ====================================== */}

            <div className="flex justify-end gap-2 border-t pt-3">

              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-9 flex-1 sm:flex-none"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="h-9 flex-1 gap-2 sm:flex-none"
              >
                <CalendarPlus className="h-4 w-4" />

                Create visit

              </Button>

            </div>

          </form>

        </CardContent>

      </Card>

    </section>
  );
};

export default CreateVisit;