import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LoaderCircle,
  AlertCircle,
  RotateCw,
  Maximize,
  ListChecks,
  Download,
} from "lucide-react";

import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { CRS } from "leaflet";

import {
  MapContainer,
  ImageOverlay,
  Polygon,
  ZoomControl,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { Button } from "../../components/ui/button";
import { detectPlots } from "./utils/detectPlots";

GlobalWorkerOptions.workerSrc = pdfWorker;

/* ========================================
   PLOT STATUS CONFIGURATION
======================================== */

const PLOT_STATUSES = {
  AVAILABLE: {
    label: "Available",
    color: "#15803d",
    fillColor: "#22c55e",
  },

  BOOKED: {
    label: "Booked",
    color: "#ca8a04",
    fillColor: "#facc15",
  },

  SOLD: {
    label: "Sold",
    color: "#b91c1c",
    fillColor: "#ef4444",
  },

  RESERVED: {
    label: "Reserved",
    color: "#71717a",
    fillColor: "#a1a1aa",
  },
};

const STATUS_ENTRIES = Object.entries(PLOT_STATUSES);

/* ========================================
   COORDINATE TRANSFORMATION
======================================== */

const rotatePoint = ([x, y], rotation) => {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return [1 - y, x];

    case 180:
      return [1 - x, 1 - y];

    case 270:
      return [y, 1 - x];

    default:
      return [x, y];
  }
};

const toMapCoordinates = (
  point,
  width,
  height,
  rotation
) => {
  const [x, y] = rotatePoint(point, rotation);

  return [-y * height, x * width];
};

/* ========================================
   RESPONSIVE MAP RESIZING
======================================== */

const MapResizeHandler = () => {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize({
        pan: false,
        animate: false,
      });
    });

    observer.observe(map.getContainer());

    return () => observer.disconnect();
  }, [map]);

  return null;
};

/* ========================================
   HORIZONTAL COLOUR KEY

   Available | Booked | Sold | Reserved

   Mobile: Compact horizontal row
   Desktop: Left-aligned horizontal row
======================================== */

const ColourKey = () => {
  return (
    <div
      aria-label="Map colour key"
      className="flex w-full flex-nowrap items-center justify-between gap-1 sm:w-fit sm:justify-start sm:gap-6"
    >
      {STATUS_ENTRIES.map(([value, config]) => (
        <div
          key={value}
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-medium sm:gap-1.5 sm:text-xs"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: config.fillColor,
            }}
          />

          <span>{config.label}</span>
        </div>
      ))}
    </div>
  );
};

/* ========================================
   CUSTOM DISCARD DIALOG
======================================== */

const DiscardDialog = ({
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
      aria-labelledby="ramani-discard-title"
      aria-describedby="ramani-discard-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-xl border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <h2
        id="ramani-discard-title"
        className="text-base font-semibold"
      >
        Discard changes?
      </h2>

      <p
        id="ramani-discard-description"
        className="mt-2 text-sm text-muted-foreground"
      >
        Your unsaved status changes will be lost.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={onDiscard}
        >
          Discard
        </Button>

      </div>
    </dialog>
  );
};

/* ========================================
   INTERACTIVE PLOT POLYGONS
======================================== */

const PlotLayer = ({
  width,
  height,
  rotation,
  plots,
  selectedIds,
  draftStatus,
  onSelectPlot,
}) => {
  const selection = new Set(selectedIds);

  return (
    <>
      {plots.map((plot) => {
        const selected = selection.has(plot.id);

        const statusKey =
          selected && draftStatus
            ? draftStatus
            : plot.status;

        const status =
          PLOT_STATUSES[statusKey] ||
          PLOT_STATUSES.RESERVED;

        return (
          <Polygon
            key={plot.id}
            positions={plot.points.map((point) =>
              toMapCoordinates(
                point,
                width,
                height,
                rotation
              )
            )}
            interactive
            bubblingMouseEvents={false}
            eventHandlers={{
              click() {
                onSelectPlot(plot.id);
              },
            }}
            pathOptions={{
              color: selected
                ? "#09090b"
                : status.color,

              fillColor: status.fillColor,

              fillOpacity: 0.5,

              weight: selected ? 3 : 1.3,

              dashArray: null,
            }}
          />
        );
      })}
    </>
  );
};

/* ========================================
   STATUS ASSIGNMENT PANEL
======================================== */

const StatusPanel = ({
  selectedPlots,
  totalPlots,
  draftStatus,
  hasUnsavedChanges,
  onChooseStatus,
  onSelectAll,
  onSave,
  onDiscard,
}) => {
  const selectedCount = selectedPlots.length;

  return (
    <aside className="min-w-0 rounded-xl border bg-background p-3 lg:p-4">

      {/* SELECTION HEADER */}

      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">

        <h2
          aria-live="polite"
          className="text-sm font-semibold"
        >
          {selectedCount === 0
            ? "Select a plot"
            : selectedCount === 1
              ? "1 plot selected"
              : `${selectedCount} plots selected`}
        </h2>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          disabled={
            totalPlots === 0 ||
            selectedCount === totalPlots
          }
          className="h-9 shrink-0 px-2 text-xs font-medium"
        >
          Select all
        </Button>

      </div>

      {/* STATUS OPTIONS */}

      <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-2 lg:gap-2">

        {STATUS_ENTRIES.map(([value, config]) => {
          const active =
            selectedCount > 0 &&
            (
              draftStatus
                ? draftStatus === value
                : selectedPlots.every(
                    (plot) => plot.status === value
                  )
            );

          return (
            <button
              key={value}
              type="button"
              disabled={!selectedCount}
              aria-pressed={active}
              onClick={() => onChooseStatus(value)}
              className={`
                flex min-h-14 min-w-0 flex-col
                items-center justify-center gap-1.5
                rounded-lg border px-1 py-2
                text-[10px] font-medium
                transition-colors
                sm:text-xs
                lg:min-h-16 lg:flex-row
                lg:justify-start lg:gap-2 lg:px-3
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                disabled:cursor-not-allowed
                disabled:opacity-40
                ${
                  active
                    ? "border-foreground bg-muted ring-1 ring-foreground"
                    : "border-border hover:bg-muted/50"
                }
              `}
            >
              <span
                className="h-5 w-7 shrink-0 rounded-sm lg:h-4 lg:w-4"
                style={{
                  backgroundColor: config.fillColor,
                }}
              />

              <span>{config.label}</span>
            </button>
          );
        })}

      </div>

      {/* SAVE AND DISCARD */}

      <div className="mt-3 grid grid-cols-2 gap-2">

        <Button
          type="button"
          variant="outline"
          onClick={onDiscard}
          disabled={!selectedCount}
          className="h-11"
        >
          Discard
        </Button>

        <Button
          type="button"
          onClick={onSave}
          disabled={!hasUnsavedChanges}
          className="h-11"
        >
          Save
        </Button>

      </div>

    </aside>
  );
};

/* ========================================
   PDF MAP WORKSPACE
======================================== */

const PDFMapCanvas = ({
  file,
  mapTitle,
  rotation,
  plots,
  selectedIds,
  draftStatus,
  multiSelect,
  hasUnsavedChanges,
  detectionError,
  onDetect,
  onSelectPlot,
  onToggleMultiSelect,
  onRotate,
  children,
}) => {
  const mapRef = useRef(null);
  const canvasRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  /* ========================================
     PDF RENDERING
  ======================================== */

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;
    let renderTask = null;
    let imageUrl = null;

    const renderPDF = async () => {
      try {
        const buffer = await file.arrayBuffer();

        if (cancelled) return;

        loadingTask = getDocument({
          data: new Uint8Array(buffer),
          isEvalSupported: false,
        });

        const pdf = await loadingTask.promise;

        if (cancelled) return;

        const page = await pdf.getPage(1);

        if (cancelled) return;

        const pageRotation =
          (page.rotate + rotation) % 360;

        const originalViewport = page.getViewport({
          scale: 1,
          rotation: pageRotation,
        });

        const scale = Math.min(
          3,
          3500 /
            Math.max(
              originalViewport.width,
              originalViewport.height
            )
        );

        const viewport = page.getViewport({
          scale,
          rotation: pageRotation,
        });

        const canvas =
          document.createElement("canvas");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        renderTask = page.render({
          canvas,
          viewport,
        });

        await renderTask.promise;

        if (cancelled) return;

        canvasRef.current = canvas;

        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, "image/png");
        });

        if (cancelled) return;

        if (!blob) {
          throw new Error(
            "Unable to create map image."
          );
        }

        imageUrl = URL.createObjectURL(blob);

        /* AUTOMATIC PLOT DETECTION */

        onDetect(canvas, rotation);

        setPreview({
          url: imageUrl,
          width: canvas.width,
          height: canvas.height,
          pageCount: pdf.numPages,
        });
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Ramani rendering failed:",
          err
        );

        setError(
          "Unable to render this survey map."
        );
      }
    };

    renderPDF();

    return () => {
      cancelled = true;

      renderTask?.cancel();

      loadingTask?.destroy().catch(() => {});

      canvasRef.current = null;

      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [file, rotation, onDetect]);

  /* ========================================
     MAP BOUNDS
  ======================================== */

  const bounds = preview
    ? [
        [-preview.height, 0],
        [0, preview.width],
      ]
    : null;

  /* ========================================
     FIT MAP
  ======================================== */

  const fitMap = () => {
    if (!mapRef.current || !bounds) return;

    mapRef.current.fitBounds(bounds, {
      padding: [15, 15],
      animate: false,
    });
  };

  /* ========================================
     EXPORT MAP AS PNG
  ======================================== */

  const downloadMap = async () => {
    const sourceCanvas = canvasRef.current;

    if (
      !preview ||
      !sourceCanvas ||
      hasUnsavedChanges ||
      exporting ||
      !plots.length
    ) {
      return;
    }

    setExporting(true);
    setExportError("");

    try {
      const width = sourceCanvas.width;
      const height = sourceCanvas.height;

      const padding = width * 0.025;

      const titleFontSize = Math.max(
        16,
        width * 0.022
      );

      const legendFontSize = Math.max(
        11,
        width * 0.016
      );

      const headerHeight = Math.max(
        44,
        titleFontSize + padding * 2
      );

      const swatchSize = legendFontSize * 0.9;

      const rowHeight = legendFontSize * 1.7;

      const legendHeight =
        padding * 2 + rowHeight * 2;

      const exportCanvas =
        document.createElement("canvas");

      exportCanvas.width = width;

      exportCanvas.height = Math.ceil(
        headerHeight +
        height +
        legendHeight
      );

      const ctx = exportCanvas.getContext("2d");

      if (!ctx) {
        throw new Error(
          "Unable to prepare map export."
        );
      }

      /* WHITE BACKGROUND */

      ctx.fillStyle = "#ffffff";

      ctx.fillRect(
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
      );

      /* ORIGINAL SURVEY MAP */

      ctx.drawImage(
        sourceCanvas,
        0,
        headerHeight
      );

      /* MAP TITLE */

      const title =
        mapTitle?.trim() || "Untitled map";

      ctx.fillStyle = "#18181b";
      ctx.textBaseline = "middle";

      ctx.font =
        `600 ${titleFontSize}px sans-serif`;

      ctx.fillText(
        title,
        padding,
        headerHeight / 2,
        width - padding * 2
      );

      /* SAVED PLOT STATUS COLOURS */

      for (const plot of plots) {
        if (
          !Array.isArray(plot.points) ||
          plot.points.length < 3
        ) {
          continue;
        }

        const status =
          PLOT_STATUSES[plot.status] ||
          PLOT_STATUSES.RESERVED;

        ctx.save();
        ctx.beginPath();

        plot.points.forEach((point, index) => {
          const [x, y] = rotatePoint(
            point,
            rotation
          );

          const canvasX = x * width;

          const canvasY =
            y * height + headerHeight;

          if (index === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        });

        ctx.closePath();

        ctx.fillStyle = status.fillColor;
        ctx.globalAlpha = 0.5;
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = status.color;

        ctx.lineWidth = Math.max(
          1.3,
          width / 1200
        );

        ctx.lineJoin = "round";

        ctx.stroke();

        ctx.restore();
      }

      /* ========================================
         EXPORTED MAP COLOUR KEY

         Available   Booked
         Sold        Reserved

         Retains the bottom-left 2 x 2 layout.
      ======================================== */

      const legendTop =
        headerHeight + height + padding;

      ctx.font =
        `${legendFontSize}px sans-serif`;

      const maxLabelWidth = Math.max(
        ...STATUS_ENTRIES.map(
          ([, config]) =>
            ctx.measureText(config.label).width
        )
      );

      const columnWidth =
        maxLabelWidth +
        swatchSize +
        legendFontSize * 2;

      STATUS_ENTRIES.forEach(
        ([, config], index) => {
          const column = index % 2;

          const row = Math.floor(index / 2);

          const x =
            padding + column * columnWidth;

          const y =
            legendTop + row * rowHeight;

          /* COLOUR SWATCH */

          ctx.fillStyle = config.fillColor;

          ctx.fillRect(
            x,
            y,
            swatchSize,
            swatchSize
          );

          /* STATUS LABEL */

          ctx.fillStyle = "#18181b";

          ctx.textBaseline = "middle";

          ctx.fillText(
            config.label,
            x + swatchSize + legendFontSize * 0.5,
            y + swatchSize / 2
          );
        }
      );

      /* GENERATE PNG IMAGE */

      const blob = await new Promise((resolve) => {
        exportCanvas.toBlob(
          resolve,
          "image/png"
        );
      });

      if (!blob) {
        throw new Error(
          "Unable to generate map image."
        );
      }

      /* SAFE FILE NAME */

      const filename =
        Array.from(title)
          .filter(
            (char) => char.charCodeAt(0) >= 32
          )
          .join("")
          .replace(/[<>:"/\\|?*]/g, "-")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^[.-]+|[. -]+$/g, "")
          .slice(0, 120)
          .toLowerCase() ||
        "untitled-map";

      const url = URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      try {
        link.href = url;

        link.download =
          `${filename}-ramani.png`;

        document.body.appendChild(link);

        link.click();
      } finally {
        link.remove();

        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 30000);
      }
    } catch (err) {
      console.error(
        "Ramani export failed:",
        err
      );

      setExportError(
        "Unable to export the map. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  /* ========================================
     WORKSPACE INTERFACE
  ======================================== */

  return (
    <div className="min-w-0 space-y-3">

      {/* COMPACT TOOLBAR */}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">

        <div className="flex flex-wrap items-center gap-1.5">

          {/* ROTATE MAP */}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRotate}
            disabled={!preview || exporting}
            className="h-10 px-2.5"
          >
            <RotateCw className="h-4 w-4" />

            Rotate
          </Button>

          {/* FIT MAP */}

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={fitMap}
            disabled={!preview}
            aria-label="Fit map"
            title="Fit map"
            className="h-10 w-10"
          >
            <Maximize className="h-4 w-4" />
          </Button>

          {/* MULTIPLE SELECTION */}

          <Button
            type="button"
            variant={
              multiSelect
                ? "default"
                : "outline"
            }
            size="sm"
            aria-pressed={multiSelect}
            onClick={onToggleMultiSelect}
            disabled={!preview || !plots.length}
            className="h-10 px-2.5"
          >
            <ListChecks className="h-4 w-4" />

            Multi-select
          </Button>

        </div>

        {/* EXPORT MAP */}

        <Button
          type="button"
          size="sm"
          onClick={downloadMap}
          disabled={
            !preview ||
            !plots.length ||
            hasUnsavedChanges ||
            exporting
          }
          title={
            hasUnsavedChanges
              ? "Save or discard changes before exporting"
              : "Export map as PNG"
          }
          className="ml-auto h-10 shrink-0"
        >
          {exporting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}

          {exporting
            ? "Exporting..."
            : "Export map"}
        </Button>

      </div>

      {/* ========================================
          RESPONSIVE WORKSPACE
      ======================================== */}

      <div className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">

        {/* MAP CONTAINER */}

        <div className="min-w-0 overflow-hidden rounded-xl border bg-background">

          {/* LOADING STATE */}

          {!preview && !error && (
            <div
              role="status"
              className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-muted/30"
            >
              <LoaderCircle className="h-6 w-6 animate-spin" />

              <p className="text-sm text-muted-foreground">
                Preparing your map...
              </p>
            </div>
          )}

          {/* ERROR STATE */}

          {error && (
            <div
              role="alert"
              className="flex min-h-[240px] flex-col items-center justify-center gap-3 bg-muted/30 p-4 text-center"
            >
              <AlertCircle className="h-6 w-6 text-destructive" />

              <p className="text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          )}

          {/* INTERACTIVE MAP */}

          {preview && (
            <>
              <MapContainer
                ref={mapRef}
                crs={CRS.Simple}
                bounds={bounds}
                boundsOptions={{
                  padding: [15, 15],
                }}
                minZoom={-5}
                maxZoom={3}
                zoomSnap={0.25}
                zoomDelta={0.5}
                zoomControl={false}
                attributionControl={false}
                scrollWheelZoom
                dragging
                touchZoom
                doubleClickZoom
                className="z-0 h-[42dvh] min-h-[240px] max-h-[380px] w-full bg-zinc-100 sm:h-[48dvh] sm:max-h-[450px] lg:h-[58dvh] lg:min-h-[340px] lg:max-h-[620px]"
              >

                <MapResizeHandler />

                {/* ZOOM CONTROLS */}

                <ZoomControl position="bottomright" />

                {/* ORIGINAL SURVEY */}

                <ImageOverlay
                  url={preview.url}
                  bounds={bounds}
                  interactive={false}
                />

                {/* DETECTED PLOT BOUNDARIES */}

                <PlotLayer
                  width={preview.width}
                  height={preview.height}
                  rotation={rotation}
                  plots={plots}
                  selectedIds={selectedIds}
                  draftStatus={draftStatus}
                  onSelectPlot={onSelectPlot}
                />

              </MapContainer>

              {/* ========================================
                  HORIZONTAL COLOUR KEY
                  MOBILE AND DESKTOP
              ======================================== */}

              <div className="border-t px-2 py-2 sm:px-4 sm:py-3">
                <ColourKey />
              </div>

              {/* MULTI-PAGE PDF NOTICE */}

              {preview.pageCount > 1 && (
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Showing page 1 of {preview.pageCount}.
                </p>
              )}

            </>
          )}

          {/* DETECTION ERROR */}

          {detectionError && (
            <p
              role="alert"
              className="border-t px-3 py-2 text-xs text-destructive"
            >
              {detectionError}
            </p>
          )}

          {/* EXPORT ERROR */}

          {exportError && (
            <p
              role="alert"
              className="border-t px-3 py-2 text-xs text-destructive"
            >
              {exportError}
            </p>
          )}

        </div>

        {/* ========================================
            STATUS ASSIGNMENT PANEL

            Desktop: Right sidebar
            Mobile: Below map
        ======================================== */}

        {children}

      </div>

    </div>
  );
};

/* ========================================
   MAIN RAMANI MAP VIEWER
======================================== */

const RamaniMapViewer = ({
  file,
  mapTitle,
}) => {
  const [rotation, setRotation] = useState(0);

  const [plots, setPlots] = useState([]);

  const [selectedIds, setSelectedIds] =
    useState([]);

  const [multiSelect, setMultiSelect] =
    useState(false);

  const [draftStatus, setDraftStatus] =
    useState(null);

  const [detectionError, setDetectionError] =
    useState("");

  const [pendingAction, setPendingAction] =
    useState(null);

  const detectionAttempted = useRef(false);

  /* ========================================
     AUTOMATIC PLOT DETECTION
  ======================================== */

  const runDetection = useCallback(
    (canvas, currentRotation) => {
      if (detectionAttempted.current) return;

      detectionAttempted.current = true;

      try {
        const detected = detectPlots(canvas);

        const detectedPlots = detected.map(
          (plot, index) => ({
            ...plot,

            id: `auto-${index + 1}`,

            status: "RESERVED",

            points: plot.points.map((point) =>
              rotatePoint(
                point,
                -currentRotation
              )
            ),
          })
        );

        setPlots(detectedPlots);

        if (!detectedPlots.length) {
          setDetectionError(
            "No plots could be detected in this survey map."
          );
        }
      } catch (err) {
        console.error(
          "Automatic detection failed:",
          err
        );

        setDetectionError(
          "Unable to detect plots in this survey map."
        );
      }
    },
    []
  );

  /* ========================================
     CURRENT SELECTION
  ======================================== */

  const selectedSet = new Set(selectedIds);

  const selectedPlots = plots.filter(
    (plot) => selectedSet.has(plot.id)
  );

  const hasUnsavedChanges =
    draftStatus !== null &&
    selectedPlots.some(
      (plot) => plot.status !== draftStatus
    );

  /* ========================================
     PROTECT UNSAVED CHANGES
  ======================================== */

  const guardChanges = (action) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => action);
      return;
    }

    setDraftStatus(null);

    action();
  };

  /* ========================================
     CONFIRM DISCARD
  ======================================== */

  const confirmDiscard = () => {
    const action = pendingAction;

    setPendingAction(null);
    setDraftStatus(null);

    action?.();
  };

  /* ========================================
     SELECT PLOT
  ======================================== */

  const selectPlot = (plotId) => {
    if (
      !plots.some((plot) => plot.id === plotId)
    ) {
      return;
    }

    /* MULTIPLE SELECTION */

    if (multiSelect) {
      const next = selectedIds.includes(plotId)
        ? selectedIds.filter(
            (id) => id !== plotId
          )
        : [...selectedIds, plotId];

      setSelectedIds(next);

      if (!next.length) {
        setDraftStatus(null);
      }

      return;
    }

    /* INDIVIDUAL SELECTION */

    if (selectedIds.includes(plotId)) return;

    guardChanges(() => {
      setSelectedIds([plotId]);
    });
  };

  /* ========================================
     TOGGLE MULTIPLE SELECTION
  ======================================== */

  const toggleMultiSelect = () => {
    guardChanges(() => {
      setSelectedIds([]);

      setMultiSelect(
        (current) => !current
      );
    });
  };

  /* ========================================
     SELECT ALL PLOTS
  ======================================== */

  const selectAllPlots = () => {
    if (!plots.length) return;

    guardChanges(() => {
      setMultiSelect(true);

      setSelectedIds(
        plots.map((plot) => plot.id)
      );
    });
  };

  /* ========================================
     PREVIEW SELECTED STATUS
  ======================================== */

  const chooseStatus = (status) => {
    if (!selectedIds.length) return;

    if (!Object.hasOwn(PLOT_STATUSES, status)) {
      return;
    }

    setDraftStatus(status);
  };

  /* ========================================
     SAVE STATUS CHANGES
  ======================================== */

  const saveChanges = () => {
    if (!hasUnsavedChanges) return;

    const ids = new Set(selectedIds);

    setPlots((current) =>
      current.map((plot) =>
        ids.has(plot.id)
          ? {
              ...plot,
              status: draftStatus,
            }
          : plot
      )
    );

    /* CLEAR CURRENT SELECTION */

    setDraftStatus(null);
    setSelectedIds([]);
  };

  /* ========================================
     DISCARD STATUS CHANGES
  ======================================== */

  const discardChanges = () => {
    setDraftStatus(null);
    setSelectedIds([]);
  };

  /* ========================================
     ROTATE MAP
  ======================================== */

  const rotateMap = () => {
    setRotation(
      (current) => (current + 90) % 360
    );
  };

  /* ========================================
     RENDER WORKSPACE
  ======================================== */

  return (
    <>
      <PDFMapCanvas
        key={rotation}
        file={file}
        mapTitle={mapTitle}
        rotation={rotation}
        plots={plots}
        selectedIds={selectedIds}
        draftStatus={draftStatus}
        multiSelect={multiSelect}
        hasUnsavedChanges={hasUnsavedChanges}
        detectionError={detectionError}
        onDetect={runDetection}
        onSelectPlot={selectPlot}
        onToggleMultiSelect={toggleMultiSelect}
        onRotate={rotateMap}
      >

        <StatusPanel
          selectedPlots={selectedPlots}
          totalPlots={plots.length}
          draftStatus={draftStatus}
          hasUnsavedChanges={hasUnsavedChanges}
          onChooseStatus={chooseStatus}
          onSelectAll={selectAllPlots}
          onSave={saveChanges}
          onDiscard={discardChanges}
        />

      </PDFMapCanvas>

      {/* CUSTOM DISCARD CONFIRMATION */}

      {pendingAction && (
        <DiscardDialog
          onCancel={() => setPendingAction(null)}
          onDiscard={confirmDiscard}
        />
      )}

    </>
  );
};

export default RamaniMapViewer;