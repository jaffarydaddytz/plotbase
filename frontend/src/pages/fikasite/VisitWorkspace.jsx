import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  LockKeyhole,
  Globe,
  MapPin,
  CalendarDays,
  Clock3,
  CheckCircle2,
  X,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

import {
  saveVisit,
  generateId,
  getParticipantStatus,
  PARTICIPANT_STATUS,
} from "./utils/visitStorage";

import {
  formatText,
  normalizePhone,
  formatLocalPhone,
  formatDate,
  formatTime,
  formatReturnFee,
} from "./utils/visitFormatting";

// ==========================================
// INITIAL PARTICIPANT FORM
// ==========================================

const initialParticipant = {
  fullName: "",
  phone: "",
  comingFrom: "",
  numberOfPeople: "1",
};

// ==========================================
// STATUS CONFIGURATION
// ==========================================

const STATUS_CONFIG = {
  REGISTERED: {
    label: "Registered",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },

  ATTENDED: {
    label: "Attended",
    className: "border-green-200 bg-green-50 text-green-700",
  },

  NOT_ATTENDED: {
    label: "Not attended",
    className: "border-red-200 bg-red-50 text-red-700",
  },

  CANCELLED: {
    label: "Cancelled",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

// ==========================================
// STATISTIC COMPONENT
// ==========================================

const Statistic = ({
  label,
  value,
  className = "",
  valueClassName = "",
}) => (
  <div className={`min-w-0 px-2 py-2.5 sm:px-4 ${className}`}>
    <p className="text-[10px] text-muted-foreground sm:text-xs">
      {label}
    </p>

    <p
      className={`mt-0.5 break-words text-base font-semibold tabular-nums sm:text-lg ${valueClassName}`}
    >
      {value}
    </p>
  </div>
);

// ==========================================
// STATUS SELECT
// ==========================================

const StatusSelect = ({ participant, onChange }) => {
  const status = getParticipantStatus(participant);

  return (
    <select
      value={status}
      onChange={(event) =>
        onChange(participant.id, event.target.value)
      }
      aria-label={`Status for ${participant.fullName}`}
      className={`h-8 w-full cursor-pointer rounded-md border px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-400 ${STATUS_CONFIG[status].className}`}
    >
      {Object.entries(STATUS_CONFIG).map(([value, option]) => (
        <option
          key={value}
          value={value}
          className="bg-background text-foreground"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

// ==========================================
// PARTICIPANT ACTIONS
// ==========================================

const ParticipantActions = ({
  participant,
  onEdit,
  onRemove,
}) => (
  <div className="flex items-center justify-end gap-1">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Edit participant"
      aria-label={`Edit ${participant.fullName}`}
      onClick={() => onEdit(participant)}
      className="h-8 w-8"
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Remove participant"
      aria-label={`Remove ${participant.fullName}`}
      onClick={() => onRemove(participant)}
      className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </div>
);

// ==========================================
// REUSABLE CONFIRMATION DIALOG
// ==========================================

const ConfirmationDialog = ({
  title,
  children,
  confirmLabel,
  onCancel,
  onConfirm,
  error,
  destructive = false,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="fikasite-dialog-title"
      aria-describedby="fikasite-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-xl border bg-background p-4 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="fikasite-dialog-title"
          className="text-base font-semibold"
        >
          {title}
        </h2>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Close confirmation"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div
        id="fikasite-dialog-description"
        className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground"
      >
        {children}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-9 flex-1"
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          className={`h-9 ${
            destructive
              ? "bg-red-600 text-white hover:bg-red-700"
              : ""
          }`}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
};

// ==========================================
// VISIT WORKSPACE
// ==========================================

const VisitWorkspace = ({ visit, onUpdate, onBack }) => {
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [showParticipantForm, setShowParticipantForm] =
    useState(false);

  const [editingId, setEditingId] = useState(null);

  const [participantForm, setParticipantForm] =
    useState(initialParticipant);

  const [participantToRemove, setParticipantToRemove] =
    useState(null);

  const [showFinalizeAttendance, setShowFinalizeAttendance] =
    useState(false);

  const [error, setError] = useState("");

  const participants = visit.participants || [];

  // ========================================
  // STATISTICS
  // ========================================

  const countByStatus = (status) =>
    participants.reduce(
      (total, participant) =>
        total +
        (getParticipantStatus(participant) === status
          ? Number(participant.numberOfPeople)
          : 0),
      0
    );

  const registered = participants.reduce(
    (total, participant) =>
      total + Number(participant.numberOfPeople),
    0
  );

  const attended = countByStatus(
    PARTICIPANT_STATUS.ATTENDED
  );

  const notAttended = countByStatus(
    PARTICIPANT_STATUS.NOT_ATTENDED
  );

  const cancelled = countByStatus(
    PARTICIPANT_STATUS.CANCELLED
  );

  const unconfirmedAttendance = countByStatus(
    PARTICIPANT_STATUS.REGISTERED
  );

  // Calculate fees based on attended people only.

  const totalFeePayable =
    BigInt(attended) * BigInt(Number(visit.fee));

  // ========================================
  // SEARCH AND FILTER
  // ========================================

  const filteredParticipants = participants.filter(
    (participant) => {
      const query = search
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

      const phoneQuery = query.replace(/[\s-]/g, "");

      const localPhone = formatLocalPhone(
        participant.phone
      );

      const matchesSearch =
        query === "" ||
        participant.fullName.toLowerCase().includes(query) ||
        (participant.comingFrom || "")
          .toLowerCase()
          .includes(query) ||
        (
          phoneQuery !== "" &&
          (
            localPhone.includes(phoneQuery) ||
            String(participant.phone).includes(
              phoneQuery.replace(/^\+/, "")
            )
          )
        );

      const matchesStatus =
        statusFilter === "ALL" ||
        getParticipantStatus(participant) === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  // ========================================
  // PERSIST CHANGES
  // ========================================

  const persistParticipants = (updatedParticipants) => {
    try {
      const updatedVisit = saveVisit({
        ...visit,

        participants: updatedParticipants,
      });

      onUpdate(updatedVisit);

      setError("");

      return true;
    } catch {
      setError(
        "Unable to save changes. Please check your browser storage."
      );

      return false;
    }
  };

  // ========================================
  // INPUT FORMATTING
  // ========================================

  const handleParticipantChange = (event) => {
    const { name, value } = event.target;

    setParticipantForm((previous) => ({
      ...previous,

      [name]: value,
    }));

    setError("");
  };

  const handleTextBlur = (event) => {
    const { name, value } = event.target;

    setParticipantForm((previous) => ({
      ...previous,

      [name]: formatText(value),
    }));
  };

  const handlePhoneBlur = () => {
    const normalized = normalizePhone(
      participantForm.phone
    );

    if (!normalized) return;

    setParticipantForm((previous) => ({
      ...previous,

      phone: formatLocalPhone(normalized),
    }));
  };

  // ========================================
  // OPEN ADD FORM
  // ========================================

  const openAddForm = () => {
    setEditingId(null);

    setParticipantForm(initialParticipant);

    setError("");

    setShowParticipantForm(true);
  };

  // ========================================
  // OPEN EDIT FORM
  // ========================================

  const openEditForm = (participant) => {
    setEditingId(participant.id);

    setParticipantForm({
      fullName: participant.fullName,

      phone: formatLocalPhone(participant.phone),

      comingFrom: participant.comingFrom || "",

      numberOfPeople: String(
        participant.numberOfPeople
      ),
    });

    setError("");

    setShowParticipantForm(true);
  };

  // ========================================
  // CLOSE FORM
  // ========================================

  const closeParticipantForm = () => {
    setShowParticipantForm(false);

    setEditingId(null);

    setParticipantForm(initialParticipant);

    setError("");
  };

  // ========================================
  // ADD OR UPDATE PARTICIPANT
  // ========================================

  const handleSaveParticipant = (event) => {
    event.preventDefault();

    setError("");

    const fullName = formatText(
      participantForm.fullName
    );

    const comingFrom = formatText(
      participantForm.comingFrom
    );

    const phone = normalizePhone(
      participantForm.phone
    );

    const numberOfPeople = Number(
      participantForm.numberOfPeople
    );

    // Validate participant name.

    if (!fullName) {
      setError("Enter the participant's full name.");
      return;
    }

    // Validate phone number.

    if (!phone) {
      setError(
        "Enter a valid 10-digit mobile number starting with 06 or 07."
      );

      return;
    }

    // Validate location.

    if (!comingFrom) {
      setError(
        "Enter where the participant is coming from."
      );

      return;
    }

    // Validate number of people.

    if (
      !Number.isSafeInteger(numberOfPeople) ||
      numberOfPeople < 1
    ) {
      setError("Enter a valid number of people.");

      return;
    }

    const existingParticipant = participants.find(
      (participant) => participant.id === editingId
    );

    const previousPeople = existingParticipant
      ? Number(existingParticipant.numberOfPeople)
      : 0;

    if (
      !Number.isSafeInteger(
        registered - previousPeople + numberOfPeople
      )
    ) {
      setError("Enter a valid number of people.");

      return;
    }

    // Prevent duplicate phone numbers.

    const duplicatePhone = participants.some(
      (participant) =>
        participant.id !== editingId &&
        normalizePhone(participant.phone) === phone
    );

    if (duplicatePhone) {
      setError(
        "Another participant with this phone number already exists."
      );

      return;
    }

    const timestamp = new Date().toISOString();

    let updatedParticipants;

    if (editingId) {

      // Preserve existing participant status.

      updatedParticipants = participants.map(
        (participant) =>
          participant.id === editingId
            ? {
                ...participant,

                fullName,

                phone,

                comingFrom,

                numberOfPeople,

                updatedAt: timestamp,
              }
            : participant
      );

    } else {

      const newParticipant = {
        id: generateId(),

        fullName,

        phone,

        comingFrom,

        numberOfPeople,

        status: PARTICIPANT_STATUS.REGISTERED,

        createdAt: timestamp,
      };

      updatedParticipants = [
        ...participants,

        newParticipant,
      ];
    }

    if (persistParticipants(updatedParticipants)) {
      closeParticipantForm();

      setSearch("");

      setStatusFilter("ALL");
    }
  };

  // ========================================
  // UPDATE PARTICIPANT STATUS
  // ========================================

  const updateParticipantStatus = (
    participantId,
    status
  ) => {
    if (
      !Object.values(PARTICIPANT_STATUS).includes(status)
    ) {
      return;
    }

    const updatedParticipants = participants.map(
      (participant) =>
        participant.id === participantId
          ? {
              ...participant,

              status,

              updatedAt: new Date().toISOString(),
            }
          : participant
    );

    persistParticipants(updatedParticipants);
  };

  // ========================================
  // REMOVE PARTICIPANT
  // ========================================

  const requestRemoveParticipant = (participant) => {
    setError("");

    setParticipantToRemove(participant);
  };

  const cancelRemoveParticipant = () => {
    setParticipantToRemove(null);

    setError("");
  };

  const confirmRemoveParticipant = () => {
    if (!participantToRemove) return;

    const updatedParticipants = participants.filter(
      (participant) =>
        participant.id !== participantToRemove.id
    );

    if (persistParticipants(updatedParticipants)) {
      if (editingId === participantToRemove.id) {
        closeParticipantForm();
      }

      setParticipantToRemove(null);
    }
  };

  // ========================================
  // FINALIZE ATTENDANCE
  // ========================================

  const requestFinalizeAttendance = () => {
    if (unconfirmedAttendance === 0) return;

    setError("");

    setShowFinalizeAttendance(true);
  };

  const cancelFinalizeAttendance = () => {
    setShowFinalizeAttendance(false);

    setError("");
  };

  const confirmFinalizeAttendance = () => {
    const timestamp = new Date().toISOString();

    const updatedParticipants = participants.map(
      (participant) =>
        getParticipantStatus(participant) ===
        PARTICIPANT_STATUS.REGISTERED
          ? {
              ...participant,

              status: PARTICIPANT_STATUS.NOT_ATTENDED,

              updatedAt: timestamp,
            }
          : participant
    );

    if (persistParticipants(updatedParticipants)) {
      setShowFinalizeAttendance(false);

      setStatusFilter("ALL");

      setSearch("");
    }
  };

  // ========================================
  // WORKSPACE UI
  // ========================================

  return (
    <section className="mx-auto w-full max-w-6xl space-y-3">

      {/* ======================================
          WORKSPACE HEADING
      ====================================== */}

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-start gap-2">

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
              {visit.organizer}
            </p>

          </div>

        </div>

        {/* VISIBILITY */}

        <div className="flex shrink-0 items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">

          {visit.visibility === "PRIVATE" ? (
            <LockKeyhole className="h-3.5 w-3.5" />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}

          {visit.visibility === "PRIVATE"
            ? "Private"
            : "Public"}

        </div>

      </div>

      {/* ======================================
          VISIT INFORMATION
      ====================================== */}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">

        {/* DATE */}

        <div className="flex items-center gap-1.5">

          <CalendarDays className="h-4 w-4 shrink-0" />

          {formatDate(visit.visitDate)}

        </div>

        {/* DEPARTURE TIME */}

        <div className="flex items-center gap-1.5">

          <Clock3 className="h-4 w-4 shrink-0" />

          {formatTime(visit.departureTime)}

        </div>

        {/* DESTINATION */}

        <div className="flex min-w-0 items-center gap-1.5">

          <MapPin className="h-4 w-4 shrink-0" />

          <span className="break-words">
            {visit.destination}
          </span>

        </div>

        {/* G & RETURN FEE */}

        <div className="font-medium text-foreground">

          Go & Return Fee: {formatReturnFee(visit.fee)}

        </div>

      </div>

      {/* ======================================
          STATISTICS
      ====================================== */}

      <div className="grid grid-cols-4 overflow-hidden rounded-xl border bg-background md:grid-cols-[1fr_1fr_1fr_1fr_1.5fr]">

        <Statistic
          label="Registered"
          value={registered}
          className="border-r"
        />

        <Statistic
          label="Attended"
          value={attended}
          className="border-r"
          valueClassName="text-green-700"
        />

        <Statistic
          label="Not attended"
          value={notAttended}
          className="border-r"
          valueClassName="text-red-700"
        />

        <Statistic
          label="Cancelled"
          value={cancelled}
          className="md:border-r"
          valueClassName="text-amber-700"
        />

        {/* TOTAL FEE PAYABLE */}

        <div className="col-span-4 flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2.5 md:col-span-1 md:block md:border-t-0 md:px-4">

          <p className="text-xs text-muted-foreground">
            Total fee payable
          </p>

          <p className="min-w-0 break-words text-right text-base font-semibold tabular-nums sm:text-lg md:mt-0.5 md:text-left">

            TZS {totalFeePayable.toLocaleString("en-GB")}

          </p>

        </div>

      </div>

      {/* ======================================
          PARTICIPANTS TOOLBAR
      ====================================== */}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">

        <div className="flex shrink-0 items-center gap-2">

          <Users className="h-4 w-4" />

          <h2 className="text-sm font-semibold">
            Participants
          </h2>

          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {registered}
          </span>

        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">

          {/* STATUS FILTER */}

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter participants by status"
            className="h-9 min-w-0 rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400 sm:w-36"
          >

            <option value="ALL">
              All statuses
            </option>

            {Object.entries(STATUS_CONFIG).map(
              ([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              )
            )}

          </select>

          {/* SEARCH */}

          <div className="relative col-span-2 row-start-2 min-w-0 sm:max-w-64 sm:flex-1">

            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              aria-label="Search participants"
              placeholder="Search participants..."
              className="h-9 pl-9"
            />

          </div>

          {/* ADD PARTICIPANT */}

          <Button
            type="button"
            disabled={showParticipantForm}
            onClick={openAddForm}
            className="h-9 shrink-0 gap-1.5"
          >

            <Plus className="h-4 w-4" />

            Add participant

          </Button>

        </div>

      </div>

      {/* ======================================
          ADD / EDIT PARTICIPANT FORM
      ====================================== */}

      {showParticipantForm && (

        <div className="rounded-xl border bg-muted/20 p-3">

          <div className="mb-2 flex items-center justify-between">

            <h3 className="text-sm font-semibold">

              {editingId
                ? "Edit participant"
                : "Add participant"}

            </h3>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeParticipantForm}
              aria-label="Close participant form"
              className="h-7 w-7"
            >

              <X className="h-4 w-4" />

            </Button>

          </div>

          <form
            onSubmit={handleSaveParticipant}
            className="grid grid-cols-2 items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_80px_auto]"
          >

            {/* FULL NAME */}

            <div className="col-span-2 min-w-0 space-y-1 lg:col-span-1">

              <label
                htmlFor="participant-name"
                className="block text-xs font-medium"
              >
                Full name
              </label>

              <Input
                id="participant-name"
                name="fullName"
                value={participantForm.fullName}
                onChange={handleParticipantChange}
                onBlur={handleTextBlur}
                placeholder="e.g. Juma Hamisi"
                maxLength={100}
                className="h-9"
                required
              />

            </div>

            {/* PHONE NUMBER */}

            <div className="min-w-0 space-y-1">

              <label
                htmlFor="participant-phone"
                className="block text-xs font-medium"
              >
                Phone number
              </label>

              <Input
                id="participant-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                value={participantForm.phone}
                onChange={handleParticipantChange}
                onBlur={handlePhoneBlur}
                placeholder="0785907440"
                aria-describedby="participant-phone-hint"
                maxLength={20}
                className="h-9"
                required
              />

              <p
                id="participant-phone-hint"
                className="text-[10px] text-muted-foreground"
              >
                10 digits, starting with 06 or 07.
              </p>

            </div>

            {/* COMING FROM */}

            <div className="col-span-2 min-w-0 space-y-1 lg:col-span-1">

              <label
                htmlFor="participant-location"
                className="block text-xs font-medium"
              >
                Coming from
              </label>

              <Input
                id="participant-location"
                name="comingFrom"
                value={participantForm.comingFrom}
                onChange={handleParticipantChange}
                onBlur={handleTextBlur}
                placeholder="e.g. Mbagala"
                maxLength={100}
                className="h-9"
                required
              />

            </div>

            {/* NUMBER OF PEOPLE */}

            <div className="col-start-2 row-start-2 min-w-0 space-y-1 lg:col-start-auto lg:row-start-auto">

              <label
                htmlFor="participant-people"
                className="block text-xs font-medium"
              >
                People
              </label>

              <Input
                id="participant-people"
                name="numberOfPeople"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={participantForm.numberOfPeople}
                onChange={handleParticipantChange}
                className="h-9"
                required
              />

            </div>

            {/* SAVE / ADD */}

            <div className="col-span-2 flex justify-end lg:col-span-1 lg:pt-5">

              <Button
                type="submit"
                className="h-9 w-full gap-1.5 lg:w-auto"
              >

                {editingId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}

                {editingId ? "Save" : "Add"}

              </Button>

            </div>

          </form>

        </div>

      )}

      {/* ======================================
          VALIDATION ERROR
      ====================================== */}

      {error &&
        !participantToRemove &&
        !showFinalizeAttendance && (

          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>

        )}

      {/* ======================================
          PARTICIPANT RECORDS
      ====================================== */}

      <div className="overflow-hidden rounded-xl border">

        {filteredParticipants.length === 0 ? (

          <div className="flex flex-col items-center justify-center px-4 py-6 text-center">

            <Users className="mb-2 h-5 w-5 text-muted-foreground" />

            <h3 className="text-sm font-medium">

              {participants.length === 0
                ? "No participants yet"
                : "No matching participants"}

            </h3>

            <p className="mt-1 text-xs text-muted-foreground">

              {participants.length === 0
                ? "Add participants to start managing your visit."
                : "Try another search or status filter."}

            </p>

          </div>

        ) : (

          <>

            {/* ==================================
                DESKTOP TABLE
            ================================== */}

            <table className="hidden w-full table-fixed text-left text-sm lg:table">

              <thead className="border-b bg-muted/50">

                <tr>

                  <th
                    scope="col"
                    className="w-10 px-3 py-2 text-xs font-medium"
                  >
                    #
                  </th>

                  <th
                    scope="col"
                    className="px-3 py-2 text-xs font-medium"
                  >
                    Full name
                  </th>

                  <th
                    scope="col"
                    className="w-32 px-3 py-2 text-xs font-medium"
                  >
                    Phone
                  </th>

                  <th
                    scope="col"
                    className="px-3 py-2 text-xs font-medium"
                  >
                    Coming from
                  </th>

                  <th
                    scope="col"
                    className="w-16 px-3 py-2 text-center text-xs font-medium"
                  >
                    People
                  </th>

                  <th
                    scope="col"
                    className="w-36 px-3 py-2 text-xs font-medium"
                  >
                    Status
                  </th>

                  <th
                    scope="col"
                    className="w-24 px-3 py-2 text-right text-xs font-medium"
                  >
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y">

                {filteredParticipants.map(
                  (participant, index) => (

                    <tr
                      key={participant.id}
                      className={
                        editingId === participant.id
                          ? "bg-muted/60"
                          : "hover:bg-muted/30"
                      }
                    >

                      {/* NUMBER */}

                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {index + 1}
                      </td>

                      {/* FULL NAME */}

                      <td className="break-words px-3 py-2 font-medium">

                        {formatText(participant.fullName)}

                      </td>

                      {/* PHONE */}

                      <td className="px-3 py-2 text-muted-foreground">

                        {formatLocalPhone(participant.phone)}

                      </td>

                      {/* COMING FROM */}

                      <td className="break-words px-3 py-2 text-muted-foreground">

                        {participant.comingFrom
                          ? formatText(participant.comingFrom)
                          : "—"}

                      </td>

                      {/* PEOPLE */}

                      <td className="px-3 py-2 text-center tabular-nums">

                        {participant.numberOfPeople}

                      </td>

                      {/* STATUS */}

                      <td className="px-3 py-2">

                        <StatusSelect
                          participant={participant}
                          onChange={updateParticipantStatus}
                        />

                      </td>

                      {/* ACTIONS */}

                      <td className="px-2 py-2">

                        <ParticipantActions
                          participant={participant}
                          onEdit={openEditForm}
                          onRemove={requestRemoveParticipant}
                        />

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

            {/* ==================================
                MOBILE AND TABLET LIST
            ================================== */}

            <div className="divide-y lg:hidden">

              {filteredParticipants.map((participant) => (

                <div
                  key={participant.id}
                  className={`flex items-start justify-between gap-2 px-3 py-2.5 ${
                    editingId === participant.id
                      ? "bg-muted/60"
                      : ""
                  }`}
                >

                  <div className="min-w-0 flex-1">

                    <p className="break-words text-sm font-medium">

                      {formatText(participant.fullName)}

                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">

                      {formatLocalPhone(participant.phone)}

                    </p>

                    <p className="mt-0.5 break-words text-xs text-muted-foreground">

                      {participant.comingFrom
                        ? formatText(participant.comingFrom)
                        : "—"}

                      {" · "}

                      {participant.numberOfPeople}

                      {Number(participant.numberOfPeople) === 1
                        ? " person"
                        : " people"}

                    </p>

                  </div>

                  <div className="w-32 shrink-0 space-y-1">

                    <StatusSelect
                      participant={participant}
                      onChange={updateParticipantStatus}
                    />

                    <ParticipantActions
                      participant={participant}
                      onEdit={openEditForm}
                      onRemove={requestRemoveParticipant}
                    />

                  </div>

                </div>

              ))}

            </div>

          </>

        )}

      </div>

      {/* ======================================
          WORKSPACE FOOTER
      ====================================== */}

      <div className="flex flex-wrap items-center justify-between gap-2">

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">

          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />

          Changes are saved on this device.

        </div>

        <Button
          type="button"
          variant="outline"
          disabled={unconfirmedAttendance === 0}
          onClick={requestFinalizeAttendance}
          className="h-9 gap-1.5"
        >

          <Check className="h-4 w-4" />

          Finalize attendance

        </Button>

      </div>

      {/* ======================================
          REMOVE PARTICIPANT CONFIRMATION
      ====================================== */}

      {participantToRemove && (

        <ConfirmationDialog
          title="Remove participant?"
          confirmLabel="Remove"
          onCancel={cancelRemoveParticipant}
          onConfirm={confirmRemoveParticipant}
          error={error}
          destructive
        >

          <p>

            Remove{" "}

            <span className="font-medium text-foreground">

              {formatText(participantToRemove.fullName)}

            </span>{" "}

            from this site visit?

          </p>

          <p>
            Their registration, attendance record and associated
            fee payable will be removed. This action cannot be undone.
          </p>

        </ConfirmationDialog>

      )}

      {/* ======================================
          FINALIZE ATTENDANCE CONFIRMATION
      ====================================== */}

      {showFinalizeAttendance && (

        <ConfirmationDialog
          title="Finalize attendance?"
          confirmLabel="Finalize attendance"
          onCancel={cancelFinalizeAttendance}
          onConfirm={confirmFinalizeAttendance}
          error={error}
        >

          <p>

            {unconfirmedAttendance} registered{" "}

            {unconfirmedAttendance === 1
              ? "person has"
              : "people have"}{" "}

            no confirmed attendance outcome.

            They will be marked as{" "}

            <span className="font-medium text-red-700">
              Not attended
            </span>.

          </p>

          <p>
            Attended and cancelled records will remain unchanged.
          </p>

        </ConfirmationDialog>

      )}

    </section>
  );
};

export default VisitWorkspace;