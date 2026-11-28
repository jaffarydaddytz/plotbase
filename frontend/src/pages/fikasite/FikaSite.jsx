import { useState } from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  CalendarPlus,
  Link2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  LockKeyhole,
} from "lucide-react";

import PublicPlatformNavbar from "../../components/common/PublicPlatformNavbar";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";

import CreateVisit from "./CreateVisit";
import VisitWorkspace from "./VisitWorkspace";
import PublicVisit from "./PublicVisit";

import { getVisit } from "./utils/visitStorage";

import {
  getManagementPath,
  generateManagementLink,
  getManagementVisitId,
  parseManagementLink,
  generatePublicVisitLink,
  getPublicVisitFromHash,
} from "./utils/visitLinks";

import {
  formatDate,
  formatTime,
  formatReturnFee,
} from "./utils/visitFormatting";

// ==========================================
// REUSABLE COPY LINK COMPONENT
// ==========================================

const CopyLink = ({ link, label }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const handleCopy = async () => {
    setCopyError("");

    try {
      await navigator.clipboard.writeText(link);

      setCopied(true);
    } catch {
      setCopied(false);

      setCopyError(
        "Select and copy the link manually."
      );
    }
  };

  return (
    <div className="min-w-0 space-y-1">

      <div className="flex min-w-0 items-center gap-2">

        <Input
          value={link}
          readOnly
          aria-label={label}
          onFocus={(event) =>
            event.target.select()
          }
          className="h-9 min-w-0 flex-1 text-xs"
        />

        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="h-9 shrink-0 gap-1.5"
        >

          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}

          {copied ? "Copied" : "Copy"}

        </Button>

      </div>

      {copyError && (

        <p
          role="alert"
          className="text-xs text-red-700"
        >
          {copyError}
        </p>

      )}

    </div>
  );
};

// ==========================================
// GENERATE SHAREABLE VISIT MESSAGE
// ==========================================

const generateShareMessage = (visit, link) => {
  const fee =
    Number(visit.fee) === 0
      ? "Free"
      : `${formatReturnFee(visit.fee)} per person`;

  return [
    `*${visit.title}*`,

    "",

    `Organizer: ${visit.organizer}`,

    `Date: ${formatDate(visit.visitDate)}`,

    `Departure: ${formatTime(visit.departureTime)}`,

    `Destination: ${visit.destination}`,

    `Meeting point: ${visit.meetingPoint}`,

    `Go & Return Fee: ${fee}`,

    "",

    "Register for this site visit:",

    link,

    "",

    "Powered by Plotbase FikaSite",
  ].join("\n");
};

// ==========================================
// VISIT LINKS COMPONENT
// ==========================================

const VisitLinks = ({ visit }) => {
  let registrationLink;

  try {
    registrationLink =
      generatePublicVisitLink(visit);
  } catch {
    registrationLink = null;
  }

  const managementLink =
    generateManagementLink(visit.id);

  const whatsappShareLink = registrationLink
    ? `https://wa.me/?text=${encodeURIComponent(
        generateShareMessage(
          visit,
          registrationLink
        )
      )}`
    : null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">

      {/* ======================================
          REGISTRATION LINK
      ====================================== */}

      <div className="min-w-0 rounded-xl border p-3">

        <div className="mb-2 flex items-center gap-2">

          <Link2 className="h-4 w-4 shrink-0" />

          <h2 className="text-sm font-semibold">
            Registration link
          </h2>

        </div>

        {registrationLink ? (

          <>

            <CopyLink
              key={registrationLink}
              link={registrationLink}
              label="Registration link"
            />

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Share this link with participants.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">

              {/* Preview registration page */}

              <Button
                asChild
                variant="outline"
                className="h-8 gap-1.5 text-xs"
              >

                <a
                  href={registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >

                  <ExternalLink className="h-3.5 w-3.5" />

                  Preview

                </a>

              </Button>

              {/* Share via WhatsApp */}

              <Button
                asChild
                variant="outline"
                className="h-8 gap-1.5 text-xs"
              >

                <a
                  href={whatsappShareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >

                  <MessageCircle className="h-3.5 w-3.5" />

                  Share via WhatsApp

                </a>

              </Button>

            </div>

          </>

        ) : (

          <p
            role="alert"
            className="text-xs text-red-700"
          >
            Unable to generate the registration link.
            Check your visit details.
          </p>

        )}

      </div>

      {/* ======================================
          MANAGEMENT LINK
      ====================================== */}

      <div className="min-w-0 rounded-xl border p-3">

        <div className="mb-2 flex items-center gap-2">

          <LockKeyhole className="h-4 w-4 shrink-0" />

          <h2 className="text-sm font-semibold">
            Management link
          </h2>

        </div>

        <CopyLink
          key={managementLink}
          link={managementLink}
          label="Management link"
        />

        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">

          Save this link to reopen your visit on this
          browser. Do not share it with participants.

        </p>

      </div>

    </div>
  );
};

// ==========================================
// LOAD SAVED VISIT
// ==========================================

const loadSavedVisit = (visitId) => {
  try {
    const visit = getVisit(visitId);

    if (!visit) {
      return {
        visit: null,

        error:
          "This visit was not found in this browser.",
      };
    }

    return {
      visit,
      error: "",
    };
  } catch {
    return {
      visit: null,

      error:
        "Unable to access your saved visit. Please check your browser storage.",
    };
  }
};

// ==========================================
// VISIT NOT FOUND
// ==========================================

const VisitNotFound = ({
  message,
  onBack,
  management = false,
}) => (
  <section className="mx-auto w-full max-w-md">

    <Card className="gap-0 rounded-xl py-0 shadow-none">

      <CardContent className="p-4">

        <div className="flex items-start gap-3">

          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

          <div className="min-w-0">

            <h1 className="text-base font-semibold">
              Unable to open visit
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {message}
            </p>

            {management && (

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">

                Management links work in the browser
                where the visit was originally created.

              </p>

            )}

          </div>

        </div>

        <div className="mt-4 flex justify-end">

          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-9 gap-2"
          >

            <ArrowLeft className="h-4 w-4" />

            Back to FikaSite

          </Button>

        </div>

      </CardContent>

    </Card>

  </section>
);

// ==========================================
// SAVED VISIT WORKSPACE
// ==========================================

const SavedVisitWorkspace = ({
  visitId,
  onBack,
}) => {
  const [savedVisit, setSavedVisit] = useState(
    () => loadSavedVisit(visitId)
  );

  const handleUpdate = (updatedVisit) => {
    setSavedVisit({
      visit: updatedVisit,
      error: "",
    });
  };

  if (!savedVisit.visit) {
    return (
      <VisitNotFound
        message={savedVisit.error}
        onBack={onBack}
        management
      />
    );
  }

  return (
    <>

      <VisitWorkspace
        key={savedVisit.visit.id}
        visit={savedVisit.visit}
        onUpdate={handleUpdate}
        onBack={onBack}
      />

      <VisitLinks
        visit={savedVisit.visit}
      />

    </>
  );
};

// ==========================================
// MAIN FIKASITE PAGE
// ==========================================

const FikaSite = () => {
  const location = useLocation();

  const navigate = useNavigate();

  const [showCreateVisit, setShowCreateVisit] =
    useState(false);

  const [managementLink, setManagementLink] =
    useState("");

  const [linkError, setLinkError] =
    useState("");

  // ========================================
  // IDENTIFY CURRENT VIEW
  // ========================================

  const isManagementView =
    location.hash.startsWith("#manage");

  const isPublicVisitView =
    location.hash.startsWith("#visit");

  const visitId = getManagementVisitId(
    location.hash
  );

  const publicVisit = isPublicVisitView
    ? getPublicVisitFromHash(location.hash)
    : null;

  const isLandingView =
    !isManagementView &&
    !isPublicVisitView &&
    !showCreateVisit;

  // ========================================
  // CREATE VISIT
  // ========================================

  const handleVisitCreated = (visit) => {
    setShowCreateVisit(false);

    setManagementLink("");

    setLinkError("");

    navigate(
      getManagementPath(visit.id)
    );
  };

  // ========================================
  // BACK TO FIKASITE
  // ========================================

  const handleBack = () => {
    setShowCreateVisit(false);

    setManagementLink("");

    setLinkError("");

    navigate("/fikasite", {
      replace: true,
    });
  };

  // ========================================
  // OPEN EXISTING VISIT
  // ========================================

  const handleOpenVisit = (event) => {
    event.preventDefault();

    setLinkError("");

    try {
      const existingVisitId =
        parseManagementLink(
          managementLink
        );

      setShowCreateVisit(false);

      navigate(
        getManagementPath(
          existingVisitId
        )
      );

    } catch (error) {

      setLinkError(
        error.message ||
          "Unable to open this visit."
      );

    }
  };

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <div className="min-h-screen bg-background text-foreground">

      <PublicPlatformNavbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-5 sm:px-6 sm:pt-6">

        {/* ==================================
            PUBLIC REGISTRATION PAGE
        ================================== */}

        {isPublicVisitView && (

          publicVisit ? (

            <PublicVisit
              key={location.hash}
              visit={publicVisit}
              onBack={handleBack}
            />

          ) : (

            <VisitNotFound
              message="This registration link is invalid or incomplete. Request a new link from the organizer."
              onBack={handleBack}
            />

          )

        )}

        {/* ==================================
            MANAGEMENT WORKSPACE
        ================================== */}

        {isManagementView && (

          visitId ? (

            <SavedVisitWorkspace
              key={visitId}
              visitId={visitId}
              onBack={handleBack}
            />

          ) : (

            <VisitNotFound
              message="This management link is invalid."
              onBack={handleBack}
              management
            />

          )

        )}

        {/* ==================================
            CREATE VISIT
        ================================== */}

        {!isManagementView &&
          !isPublicVisitView &&
          showCreateVisit && (

            <CreateVisit
              onCancel={handleBack}
              onCreated={handleVisitCreated}
            />

          )}

        {/* ==================================
            LANDING PAGE
        ================================== */}

        {isLandingView && (

          <div className="mx-auto max-w-5xl">

            {/* PAGE HEADING */}

            <div className="mb-4">

              <h1 className="text-2xl font-semibold tracking-tight">
                FikaSite
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Create and manage property site visits.
              </p>

            </div>

            {/* PRIMARY ACTIONS */}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* CREATE VISIT */}

              <Card className="gap-0 rounded-xl py-0 shadow-none">

                <CardContent className="flex h-full flex-col p-4">

                  <div className="flex items-center gap-2">

                    <CalendarPlus className="h-5 w-5 shrink-0" />

                    <h2 className="text-sm font-semibold">
                      Create a site visit
                    </h2>

                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Organize visits and manage participants.
                  </p>

                  <div className="mt-auto pt-3">

                    <Button
                      type="button"
                      onClick={() => {
                        setLinkError("");

                        setShowCreateVisit(true);
                      }}
                      className="h-9 w-full gap-2"
                    >

                      <CalendarPlus className="h-4 w-4" />

                      Create visit

                    </Button>

                  </div>

                </CardContent>

              </Card>

              {/* OPEN EXISTING VISIT */}

              <Card className="gap-0 rounded-xl py-0 shadow-none">

                <CardContent className="p-4">

                  <div className="flex items-center gap-2">

                    <Link2 className="h-5 w-5 shrink-0" />

                    <h2 className="text-sm font-semibold">
                      Open existing visit
                    </h2>

                  </div>

                  <form
                    onSubmit={handleOpenVisit}
                    className="mt-3 space-y-2"
                  >

                    <Input
                      type="text"
                      value={managementLink}
                      onChange={(event) => {
                        setManagementLink(
                          event.target.value
                        );

                        setLinkError("");
                      }}
                      aria-label="Management link"
                      placeholder="Paste management link"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-9"
                      required
                    />

                    {linkError && (

                      <p
                        role="alert"
                        className="text-xs text-red-700"
                      >

                        {linkError}

                      </p>

                    )}

                    <Button
                      type="submit"
                      variant="outline"
                      disabled={
                        !managementLink.trim()
                      }
                      className="h-9 w-full gap-2"
                    >

                      Open visit

                      <ArrowRight className="h-4 w-4" />

                    </Button>

                  </form>

                </CardContent>

              </Card>

            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              No account required.
            </p>

          </div>

        )}

      </main>

    </div>
  );
};

export default FikaSite;