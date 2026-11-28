import { useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  Wallet,
  Users,
  CheckCircle2,
  Info,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";

import { registerParticipant } from "./utils/visitStorage";

import {
  formatText,
  normalizePhone,
  formatLocalPhone,
  formatDate,
  formatTime,
  formatReturnFee,
} from "./utils/visitFormatting";

// ==========================================
// INITIAL FORM
// ==========================================

const initialForm = {
  fullName: "",
  phone: "",
  comingFrom: "",
  numberOfPeople: "1",
};

// ==========================================
// VISIT DETAIL COMPONENT
// ==========================================

const VisitDetail = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-0.5 break-words text-sm font-medium">
        {value}
      </p>
    </div>
  </div>
);

// ==========================================
// REGISTRATION CONFIRMATION
// ==========================================

const RegistrationConfirmation = ({
  visit,
  registration,
  onBack,
}) => {
  const {
    participant,
    connectedToWorkspace,
  } = registration;

  const participantDetails = [
    {
      label: "Full name",
      value: participant.fullName,
    },
    {
      label: "Phone number",
      value: formatLocalPhone(participant.phone),
    },
    {
      label: "Coming from",
      value: participant.comingFrom,
    },
    {
      label: "Registered people",
      value: participant.numberOfPeople,
    },
  ];

  const visitDetails = [
    {
      label: "Date",
      value: formatDate(visit.visitDate),
    },
    {
      label: "Departure",
      value: formatTime(visit.departureTime),
    },
    {
      label: "Destination",
      value: visit.destination,
    },
    {
      label: "Meeting point",
      value: visit.meetingPoint,
    },
  ];

  const renderDetails = (details) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">

      {details.map(({ label, value }) => (
        <div key={label} className="min-w-0">

          <p className="text-xs text-muted-foreground">
            {label}
          </p>

          <p className="mt-0.5 break-words text-sm font-medium">
            {value}
          </p>

        </div>
      ))}

    </div>
  );

  return (
    <section className="mx-auto w-full max-w-xl space-y-3">

      <Card className="gap-0 rounded-xl py-0 shadow-none">

        <CardContent className="p-3 sm:p-4">

          {/* SUCCESS HEADER */}

          <div className="flex flex-wrap items-start justify-between gap-2">

            <div className="flex min-w-0 items-center gap-2.5">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">

                <CheckCircle2 className="h-5 w-5" />

              </div>

              <div className="min-w-0">

                <h1 className="text-base font-semibold tracking-tight">

                  {connectedToWorkspace
                    ? "Registration successful"
                    : "Registration saved locally"}

                </h1>

                <p className="mt-0.5 break-words text-xs text-muted-foreground">
                  {visit.title}
                </p>

              </div>

            </div>

            <span className="shrink-0 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">

              {connectedToWorkspace
                ? "Registered"
                : "Demo registration"}

            </span>

          </div>

          {/* PARTICIPANT DETAILS */}

          <div className="mt-3 border-t py-3">

            {renderDetails(participantDetails)}

          </div>

          {/* VISIT DETAILS */}

          <div className="border-t py-3">

            {renderDetails(visitDetails)}

          </div>

          {/* GO & RETURN FEE */}

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">

            <span className="text-xs text-muted-foreground">
              Go & Return Fee
            </span>

            <span className="break-all text-right text-sm font-semibold">

              {Number(visit.fee) === 0
                ? "Free"
                : `TZS ${(
                    BigInt(visit.fee) *
                    BigInt(participant.numberOfPeople)
                  ).toLocaleString("en-GB")}`}

            </span>

          </div>

          {/* DEMONSTRATION NOTICE */}

          {!connectedToWorkspace && (

            <div className="mt-2 flex items-start gap-2 rounded-lg border bg-muted/30 p-2.5">

              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <p className="text-xs leading-relaxed text-muted-foreground">

                This demonstration registration is saved
                on your device. It has not been sent
                to the organizer.

              </p>

            </div>

          )}

          {/* DONE BUTTON */}

          <Button
            type="button"
            onClick={onBack}
            className="mt-3 h-9 w-full"
          >
            Done
          </Button>

        </CardContent>

      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Powered by Plotbase FikaSite
      </p>

    </section>
  );
};

// ==========================================
// PUBLIC REGISTRATION PAGE
// ==========================================

const PublicVisit = ({ visit, onBack }) => {
  const [form, setForm] = useState(initialForm);

  const [error, setError] = useState("");

  const [registration, setRegistration] =
    useState(null);

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
    const phone = normalizePhone(form.phone);

    if (!phone) return;

    setForm((previous) => ({
      ...previous,
      phone: formatLocalPhone(phone),
    }));
  };

  // ========================================
  // DIRECT FIKASITE REGISTRATION
  // ========================================

  const handleRegister = (event) => {
    event.preventDefault();

    if (registration) return;

    setError("");

    try {
      const result = registerParticipant(
        visit.publicId,
        {
          fullName: form.fullName,
          phone: form.phone,
          comingFrom: form.comingFrom,
          numberOfPeople: form.numberOfPeople,
        }
      );

      setRegistration(result);

    } catch (registrationError) {

      if (
        registrationError.name === "QuotaExceededError" ||
        registrationError.name === "SecurityError"
      ) {
        setError(
          "Unable to save registration. Please check your browser storage."
        );

        return;
      }

      setError(
        registrationError.message ||
          "Unable to complete registration."
      );
    }
  };

  // ========================================
  // SHOW REGISTRATION CONFIRMATION
  // ========================================

  if (registration) {
    return (
      <RegistrationConfirmation
        visit={visit}
        registration={registration}
        onBack={onBack}
      />
    );
  }

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <section className="mx-auto w-full max-w-4xl space-y-3">

      {/* PAGE HEADING */}

      <div className="flex items-start gap-2">

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back to FikaSite"
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-0">

          <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
            {visit.title}
          </h1>

          <p className="mt-0.5 break-words text-sm text-muted-foreground">
            Organized by {visit.organizer}
          </p>

        </div>

      </div>

      {/* MAIN CONTENT */}

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">

        {/* VISIT DETAILS */}

        <Card className="gap-0 rounded-xl py-0 shadow-none">

          <CardContent className="p-3 sm:p-4">

            <h2 className="mb-3 text-sm font-semibold">
              Visit details
            </h2>

            <div className="grid grid-cols-2 gap-x-3 gap-y-4">

              <VisitDetail
                icon={CalendarDays}
                label="Date"
                value={formatDate(visit.visitDate)}
              />

              <VisitDetail
                icon={Clock3}
                label="Departure time"
                value={formatTime(visit.departureTime)}
              />

              <VisitDetail
                icon={MapPin}
                label="Destination"
                value={visit.destination}
              />

              <VisitDetail
                icon={Navigation}
                label="Meeting point"
                value={visit.meetingPoint}
              />

              <VisitDetail
                icon={Wallet}
                label="Go & Return Fee"
                value={
                  Number(visit.fee) === 0
                    ? "Free"
                    : `${formatReturnFee(visit.fee)} / person`
                }
              />

              <VisitDetail
                icon={Phone}
                label="Contact number"
                value={formatLocalPhone(
                  visit.contactPhone
                )}
              />

            </div>

          </CardContent>

        </Card>

        {/* REGISTRATION FORM */}

        <Card className="gap-0 rounded-xl py-0 shadow-none">

          <CardContent className="p-3 sm:p-4">

            <div className="mb-3 flex items-center gap-2">

              <Users className="h-4 w-4" />

              <h2 className="text-sm font-semibold">
                Register for this visit
              </h2>

            </div>

            <form
              onSubmit={handleRegister}
              className="space-y-3"
            >

              {/* FULL NAME */}

              <div className="space-y-1">

                <label
                  htmlFor="public-full-name"
                  className="block text-xs font-medium sm:text-sm"
                >
                  Full name
                </label>

                <Input
                  id="public-full-name"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  onBlur={handleTextBlur}
                  placeholder="e.g. Juma Hamisi"
                  autoComplete="name"
                  maxLength={100}
                  className="h-9"
                  required
                />

              </div>

              {/* PHONE AND PEOPLE */}

              <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-3">

                <div className="min-w-0 space-y-1">

                  <label
                    htmlFor="public-phone"
                    className="block text-xs font-medium sm:text-sm"
                  >
                    Phone number
                  </label>

                  <Input
                    id="public-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handlePhoneBlur}
                    placeholder="0785907440"
                    autoComplete="tel"
                    aria-describedby="public-phone-hint"
                    maxLength={20}
                    className="h-9"
                    required
                  />

                  <p
                    id="public-phone-hint"
                    className="text-[11px] text-muted-foreground"
                  >
                    10 digits, starting with 06 or 07.
                  </p>

                </div>

                {/* PEOPLE */}

                <div className="min-w-0 space-y-1">

                  <label
                    htmlFor="public-people"
                    className="block text-xs font-medium sm:text-sm"
                  >
                    People
                  </label>

                  <Input
                    id="public-people"
                    name="numberOfPeople"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={form.numberOfPeople}
                    onChange={handleChange}
                    className="h-9"
                    required
                  />

                </div>

              </div>

              {/* COMING FROM */}

              <div className="space-y-1">

                <label
                  htmlFor="public-location"
                  className="block text-xs font-medium sm:text-sm"
                >
                  Coming from
                </label>

                <Input
                  id="public-location"
                  name="comingFrom"
                  value={form.comingFrom}
                  onChange={handleChange}
                  onBlur={handleTextBlur}
                  placeholder="e.g. Mbagala"
                  maxLength={100}
                  className="h-9"
                  required
                />

              </div>

              {/* ERROR */}

              {error && (

                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {error}
                </div>

              )}

              {/* REGISTER BUTTON */}

              <Button
                type="submit"
                className="h-10 w-full gap-2"
              >

                Register

              </Button>

              <p className="text-xs text-muted-foreground">
                Demo mode — registrations are saved in
                this browser.
              </p>

            </form>

          </CardContent>

        </Card>

      </div>

      <p className="text-center text-xs text-muted-foreground">
        Powered by Plotbase FikaSite
      </p>

    </section>
  );
};

export default PublicVisit;