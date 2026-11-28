import { useEffect, useRef, useState } from "react";

import {
  Upload,
  Map,
  FolderOpen,
  X,
  ShieldCheck,
  Pencil,
} from "lucide-react";

import RamaniMapViewer from "./RamaniMapViewer";

import PublicPlatformNavbar from "../../components/common/PublicPlatformNavbar";

import { Button } from "../../components/ui/button";

import {
  Card,
  CardContent,
} from "../../components/ui/card";

/* ========================================
   FILE CONFIGURATION
======================================== */

const SUPPORTED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "geojson",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

/* ========================================
   CUSTOM CLOSE MAP DIALOG
======================================== */

const CloseMapDialog = ({
  onCancel,
  onDiscard,
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
      aria-labelledby="ramani-close-title"
      aria-describedby="ramani-close-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-xl border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/40"
    >
      {/* DIALOG HEADER */}

      <div className="flex items-center justify-between gap-2">

        <h2
          id="ramani-close-title"
          className="text-base font-semibold"
        >
          Close map?
        </h2>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Cancel"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>

      </div>

      {/* DIALOG DESCRIPTION */}

      <p
        id="ramani-close-description"
        className="mt-2 text-sm leading-relaxed text-muted-foreground"
      >
        Closing this map will discard your current
        workspace. Exported maps will remain on your device.
      </p>

      {/* DIALOG ACTIONS */}

      <div className="mt-5 grid grid-cols-2 gap-2">

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10"
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={onDiscard}
          className="h-10"
        >
          Discard
        </Button>

      </div>

    </dialog>
  );
};

/* ========================================
   RAMANI PAGE
======================================== */

const Ramani = () => {
  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [mapTitle, setMapTitle] =
    useState("");

  const [error, setError] =
    useState("");

  const [showCloseDialog, setShowCloseDialog] =
    useState(false);

  /* ========================================
     FILE SELECTION
  ======================================== */

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    const extension = file.name
      .split(".")
      .pop()
      .toLowerCase();

    /* VALIDATE FILE TYPE */

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      setError(
        "Please select a PDF, PNG, JPG or GeoJSON file."
      );

      event.target.value = "";
      return;
    }

    /* VALIDATE FILE SIZE */

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "The file must not exceed 20 MB."
      );

      event.target.value = "";
      return;
    }

    /* PREVENT EMPTY FILES */

    if (file.size === 0) {
      setError(
        "The selected file is empty."
      );

      event.target.value = "";
      return;
    }

    /* CURRENTLY ONLY PDF IS IMPLEMENTED */

    if (extension !== "pdf") {
      setError(
        "PDF maps are currently supported. Image and GeoJSON support is coming soon."
      );

      event.target.value = "";
      return;
    }

    /* OPEN MAP WORKSPACE */

    setSelectedFile(file);

    setMapTitle(
      file.name
        .replace(/\.[^.]+$/, "")
        .trim() || "Untitled map"
    );
  };

  /* ========================================
     REQUEST TO CLOSE MAP
  ======================================== */

  const requestCloseMap = () => {
    if (!selectedFile) return;

    setShowCloseDialog(true);
  };

  /* ========================================
     CANCEL CLOSE MAP
  ======================================== */

  const cancelCloseMap = () => {
    setShowCloseDialog(false);
  };

  /* ========================================
     DISCARD WORKSPACE AND CLOSE MAP
  ======================================== */

  const discardMap = () => {
    setShowCloseDialog(false);

    setSelectedFile(null);
    setMapTitle("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* ========================================
     EDIT MAP TITLE
  ======================================== */

  const editMapTitle = () => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  };

  const finishEditingTitle = () => {
    setMapTitle(
      (current) =>
        current.trim() || "Untitled map"
    );
  };

  /* ========================================
     PAGE INTERFACE
  ======================================== */

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">

      <PublicPlatformNavbar />

      {/* HIDDEN FILE INPUT */}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.geojson"
        onChange={handleFileSelection}
        className="hidden"
      />

      <main
        className={
          selectedFile
            ? "mx-auto w-full max-w-[1600px] px-3 py-3 sm:px-5"
            : "mx-auto max-w-5xl px-4 py-5 sm:px-6"
        }
      >

        {/* ========================================
            MAP WORKSPACE
        ======================================== */}

        {selectedFile ? (

          <>

            {/* COMPACT MAP TITLE BAR */}

            <div className="mb-3 flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">

              <div className="flex min-w-0 flex-1 items-center gap-2">

                <Map className="h-5 w-5 shrink-0 text-muted-foreground" />

                {/* EDITABLE MAP TITLE */}

                <input
                  ref={titleInputRef}
                  type="text"
                  aria-label="Map title"
                  value={mapTitle}
                  maxLength={120}
                  placeholder="Untitled map"
                  onChange={(event) =>
                    setMapTitle(event.target.value)
                  }
                  onBlur={finishEditingTitle}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className="h-8 min-w-0 w-full max-w-lg rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold outline-none transition-colors hover:border-border focus:border-border focus:bg-muted/30"
                />

                {/* EDIT TITLE BUTTON */}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={editMapTitle}
                  aria-label="Edit map title"
                  title="Edit map title"
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

              </div>

              {/* CLOSE MAP BUTTON */}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={requestCloseMap}
                aria-label="Close map"
                title="Close map"
                className="shrink-0 text-muted-foreground"
              >

                <span className="hidden sm:inline">
                  Close map
                </span>

                <X className="h-4 w-4" />

              </Button>

            </div>

            {/* ========================================
                INTERACTIVE MAP VIEWER
            ======================================== */}

            <RamaniMapViewer
              key={`${selectedFile.name}-${selectedFile.lastModified}-${selectedFile.size}`}
              file={selectedFile}
              mapTitle={mapTitle}
            />

          </>

        ) : (

          <>

            {/* ========================================
                RAMANI LANDING PAGE
            ======================================== */}

            {/* PAGE HEADER */}

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">

                <Map className="h-5 w-5" />

              </div>

              <div>

                <h1 className="text-2xl font-semibold tracking-tight">
                  Ramani
                </h1>

                <p className="text-sm text-muted-foreground">
                  Create, manage and share interactive land maps.
                </p>

              </div>

            </div>

            {/* ========================================
                UPLOAD AREA
            ======================================== */}

            <Card className="gap-0 rounded-xl py-0 shadow-none">

              <CardContent className="p-4">

                <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-5 text-center">

                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border bg-background">

                    <Upload className="h-5 w-5" />

                  </div>

                  <h2 className="text-lg font-semibold">
                    Upload your survey map
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    PDF survey drawings
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Maximum file size: 20 MB
                  </p>

                  <Button
                    type="button"
                    size="lg"
                    className="mt-3"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >

                    <Upload className="h-4 w-4" />

                    Select file

                  </Button>

                </div>

                {/* FILE VALIDATION ERROR */}

                {error && (
                  <p
                    role="alert"
                    className="mt-3 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}

                {/* GUEST ACCESS MESSAGE */}

                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">

                  <ShieldCheck className="h-4 w-4" />

                  No account required to get started.

                </div>

              </CardContent>

            </Card>

            {/* ========================================
                ADDITIONAL ACTIONS
            ======================================== */}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">

              {/* OPEN EXISTING MAP */}

              <Card className="gap-0 rounded-xl py-0 shadow-none">

                <CardContent className="p-4">

                  <div className="mb-2 flex items-center gap-2">

                    <FolderOpen className="h-5 w-5" />

                    <h2 className="text-sm font-semibold">
                      Open existing map
                    </h2>

                  </div>

                  <p className="text-sm text-muted-foreground">
                    Recover a previously created map using your
                    Map ID and private access key.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled
                  >
                    Open map
                  </Button>

                </CardContent>

              </Card>

              {/* MY MAPS */}

              <Card className="gap-0 rounded-xl py-0 shadow-none">

                <CardContent className="p-4">

                  <div className="mb-2 flex items-center gap-2">

                    <Map className="h-5 w-5" />

                    <h2 className="text-sm font-semibold">
                      My Maps
                    </h2>

                  </div>

                  <p className="text-sm text-muted-foreground">
                    Manage saved maps, plots, customers,
                    sales and instalments.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled
                  >
                    View my maps
                  </Button>

                </CardContent>

              </Card>

            </div>

          </>

        )}

      </main>

      {/* ========================================
          CUSTOM CLOSE MAP CONFIRMATION
      ======================================== */}

      {showCloseDialog && (
        <CloseMapDialog
          onCancel={cancelCloseMap}
          onDiscard={discardMap}
        />
      )}

    </div>
  );
};

export default Ramani;