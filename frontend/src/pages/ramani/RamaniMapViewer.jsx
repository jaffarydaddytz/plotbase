import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LoaderCircle,
  AlertCircle,
  Map,
  RotateCw,
  Maximize,
  ScanLine,
  Pencil,
  Undo2,
  Check,
  X,
  Trash2,
  MousePointer2,
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
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { Button } from "../../components/ui/button";
import { detectPlots } from "./utils/detectPlots";

GlobalWorkerOptions.workerSrc = pdfWorker;


/* ========================================
   PLOT STATUS CONFIGURATION
======================================== */

const PLOT_STATUSES = {
  UNASSIGNED: {
    label: "Unassigned",
    color: "#71717a",
    fillColor: "#a1a1aa",
    badge: "bg-zinc-100 text-zinc-700",
  },

  AVAILABLE: {
    label: "Available",
    color: "#15803d",
    fillColor: "#22c55e",
    badge: "bg-green-100 text-green-800",
  },

  BOOKED: {
    label: "Booked",
    color: "#b45309",
    fillColor: "#f59e0b",
    badge: "bg-amber-100 text-amber-800",
  },

  SOLD: {
    label: "Sold",
    color: "#b91c1c",
    fillColor: "#ef4444",
    badge: "bg-red-100 text-red-800",
  },
};

const EMPTY_FORM = {
  plotNumber: "",
  area: "",
  status: "UNASSIGNED",
};


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
   MAP RESIZE HANDLER
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
   INTERACTIVE PLOT LAYER
======================================== */

const PlotDrawingLayer = ({
  width,
  height,
  rotation,
  drawing,
  draft,
  plots,
  selectedPlotId,
  selectedPlotIds,
  onSelectPlot,
  onAddPoint,
}) => {
  const addPointFromEvent = (event) => {
    const x = event.latlng.lng / width;
    const y = -event.latlng.lat / height;

    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return;
    }

    onAddPoint(
      rotatePoint([x, y], -rotation)
    );
  };

  const map = useMapEvents({
    click(event) {
      if (drawing) {
        addPointFromEvent(event);
      }
    },
  });

  useEffect(() => {
    if (!drawing) return;

    const wasEnabled =
      map.doubleClickZoom.enabled();

    map.doubleClickZoom.disable();

    return () => {
      if (wasEnabled) {
        map.doubleClickZoom.enable();
      }
    };
  }, [drawing, map]);

  const selectedIds = new Set(selectedPlotIds);

  const draftPositions = draft.map((point) =>
    toMapCoordinates(
      point,
      width,
      height,
      rotation
    )
  );

  return (
    <>
      {/* COMPLETED POLYGONS */}

      {plots.map((plot) => {
        const selected =
          selectedPlotId === plot.id ||
          selectedIds.has(plot.id);

        const status =
          PLOT_STATUSES[plot.status] ||
          PLOT_STATUSES.UNASSIGNED;

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
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click(event) {
                if (drawing) {
                  addPointFromEvent(event);
                  return;
                }

                onSelectPlot(plot.id);
              },
            }}
            pathOptions={{
              color: selected
                ? "#09090b"
                : status.color,

              fillColor: status.fillColor,

              fillOpacity: selected
                ? 0.65
                : plot.status === "UNASSIGNED"
                  ? 0.15
                  : 0.5,

              weight: selected ? 3 : 1.5,

              dashArray:
                !plot.confirmed && !selected
                  ? "5 4"
                  : undefined,
            }}
          />
        );
      })}

      {/* DRAFT POLYLINE */}

      {draftPositions.length >= 2 && (
        <Polyline
          positions={draftPositions}
          interactive={false}
          pathOptions={{
            color: "#18181b",
            weight: 2,
            dashArray: "5 5",
          }}
        />
      )}

      {/* DRAFT POLYGON */}

      {draftPositions.length >= 3 && (
        <Polygon
          positions={draftPositions}
          interactive={false}
          pathOptions={{
            color: "#18181b",
            fillColor: "#71717a",
            fillOpacity: 0.2,
            weight: 2,
            dashArray: "5 5",
          }}
        />
      )}

      {/* DRAWING CORNERS */}

      {draftPositions.map((position, index) => (
        <CircleMarker
          key={index}
          center={position}
          radius={4}
          interactive={false}
          pathOptions={{
            color: "#18181b",
            fillColor: "#ffffff",
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}
    </>
  );
};


/* ========================================
   FLOATING BULK STATUS TOOLBAR
======================================== */

const BulkStatusToolbar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  onClose,
  onApplyStatus,
}) => {
  return (
    <div className="absolute inset-x-2 bottom-3 z-20 mx-auto max-w-xl sm:inset-x-4">

      <div className="overflow-hidden rounded-xl border bg-background/95 shadow-lg backdrop-blur-md">

        {/* SELECTION HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">

          <div className="flex items-center gap-2">

            <ListChecks className="h-4 w-4" />

            <span
              aria-live="polite"
              className="text-xs font-semibold"
            >
              {selectedCount} selected
            </span>

          </div>

          <div className="flex items-center gap-1">

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              disabled={selectedCount === totalCount}
            >
              Select all
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={!selectedCount}
            >
              Clear
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Exit multiple selection"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>

          </div>

        </div>

        {/* BULK STATUS ACTIONS */}

        <div className="p-2">

          {selectedCount === 0 ? (

            <p className="px-2 py-2 text-center text-xs text-muted-foreground">
              Click plots on the map to select them.
            </p>

          ) : (

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

              {Object.entries(PLOT_STATUSES).map(
                ([value, config]) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onApplyStatus(value)
                    }
                    className="h-10 justify-start px-2 text-xs sm:justify-center"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          config.fillColor,
                      }}
                    />

                    {config.label}
                  </Button>
                )
              )}

            </div>

          )}

        </div>

      </div>

    </div>
  );
};


/* ========================================
   INDIVIDUAL PLOT DETAILS EDITOR
======================================== */

const PlotDetailsEditor = ({
  plot,
  form,
  error,
  onChange,
  onSave,
  onRemove,
  onClose,
}) => {
  const status =
    PLOT_STATUSES[plot.status] ||
    PLOT_STATUSES.UNASSIGNED;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[1100] max-h-[70dvh] overflow-y-auto rounded-xl border bg-background shadow-xl lg:static lg:self-start lg:max-h-none lg:shadow-none">

      {/* HEADER */}

      <div className="flex items-center justify-between border-b px-3 py-2">

        <div>
          <h3 className="text-sm font-semibold">
            Plot details
          </h3>

          <p className="text-xs text-muted-foreground">
            {plot.confirmed
              ? "Reviewed plot"
              : "Unconfirmed plot"}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close plot details"
        >
          <X className="h-4 w-4" />
        </Button>

      </div>

      <form
        onSubmit={onSave}
        className="space-y-3 p-3"
      >

        {/* CURRENT STATUS */}

        <div className="flex items-center justify-between gap-2">

          <span className="text-xs text-muted-foreground">
            Current status
          </span>

          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${status.badge}`}
          >
            {status.label}
          </span>

        </div>

        {/* PLOT NUMBER */}

        <div>

          <label
            htmlFor="ramani-plot-number"
            className="mb-1 block text-xs font-medium"
          >
            Plot number
          </label>

          <input
            id="ramani-plot-number"
            type="text"
            maxLength={80}
            value={form.plotNumber}
            placeholder="e.g. 15"
            onChange={(event) =>
              onChange(
                "plotNumber",
                event.target.value
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

        </div>

        {/* AREA */}

        <div>

          <label
            htmlFor="ramani-plot-area"
            className="mb-1 block text-xs font-medium"
          >
            Area (m²)
          </label>

          <input
            id="ramani-plot-area"
            type="number"
            min="0"
            step="any"
            value={form.area}
            placeholder="e.g. 500"
            onChange={(event) =>
              onChange(
                "area",
                event.target.value
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

        </div>

        {/* STATUS OPTIONS */}

        <fieldset>

          <legend className="mb-2 text-xs font-medium">
            Plot status
          </legend>

          <div className="grid grid-cols-2 gap-2">

            {Object.entries(PLOT_STATUSES).map(
              ([value, config]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={
                    form.status === value
                  }
                  onClick={() =>
                    onChange("status", value)
                  }
                  className={`flex min-h-9 items-center gap-2 rounded-md border px-2 py-2 text-xs font-medium ${
                    form.status === value
                      ? "border-zinc-950 bg-muted ring-1 ring-zinc-950"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        config.fillColor,
                    }}
                  />

                  {config.label}
                </button>
              )
            )}

          </div>

        </fieldset>

        {error && (
          <p
            role="alert"
            className="text-xs text-destructive"
          >
            {error}
          </p>
        )}

        {/* CONFIRM PLOT */}

        <Button
          type="submit"
          className="w-full"
        >
          <Check className="h-4 w-4" />

          {plot.confirmed
            ? "Save changes"
            : "Confirm plot"}
        </Button>

        {/* REMOVE PLOT */}

        <Button
          type="button"
          variant="outline"
          onClick={onRemove}
          className="w-full text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Remove plot
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          Changes are stored temporarily in this workspace.
        </p>

      </form>

    </aside>
  );
};


/* ========================================
   PDF MAP WORKSPACE
======================================== */

const PDFMapCanvas = ({
  file,
  mapTitle,
  hasUnsavedChanges,
  rotation,
  onRotate,
  drawing,
  draft,
  plots,
  selectedPlotId,
  selectedPlotIds,
  multiSelect,
  onSelectPlot,
  onToggleMultiSelect,
  onSelectAll,
  onClearSelection,
  onBulkStatus,
  onStartDrawing,
  onAddPoint,
  onUndo,
  onFinish,
  onCancel,
  drawingError,
  onDetect,
  detectionMessage,
  reviewLocked,
}) => {
  const mapRef = useRef(null);
  const canvasRef = useRef(null);

  const [preview, setPreview] =
    useState(null);

  const [error, setError] =
    useState("");

  const [exporting, setExporting] =
    useState(false);

  const [exportError, setExportError] =
    useState("");


  /* ========================================
     RENDER PDF
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

        const originalViewport =
          page.getViewport({
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

        setPreview({
          url: imageUrl,
          width: canvas.width,
          height: canvas.height,
          pageCount: pdf.numPages,
        });

        onDetect(canvas, rotation);

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
     DOWNLOAD MAP AS PNG
  ======================================== */

  const downloadMap = async () => {
    const sourceCanvas = canvasRef.current;

    if (
      !preview ||
      !sourceCanvas ||
      drawing ||
      hasUnsavedChanges ||
      exporting
    ) {
      return;
    }

    setExporting(true);
    setExportError("");

    try {
      const width = sourceCanvas.width;
      const height = sourceCanvas.height;

      const headerHeight = Math.max(
        80,
        Math.round(width * 0.065)
      );

      const padding = width * 0.02;

      const exportCanvas =
        document.createElement("canvas");

      exportCanvas.width = width;

      exportCanvas.height =
        height + headerHeight;

      const ctx =
        exportCanvas.getContext("2d");

      if (!ctx) {
        throw new Error(
          "Unable to prepare map export."
        );
      }

      const title =
        mapTitle?.trim() || "Untitled map";


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


      /* STATUS COUNTERS */

      const counts = Object.fromEntries(
        Object.keys(PLOT_STATUSES).map(
          (status) => [status, 0]
        )
      );


      /* DRAW PLOT POLYGONS */

      for (const plot of plots) {
        if (
          !Array.isArray(plot.points) ||
          plot.points.length < 3
        ) {
          continue;
        }

        const statusKey =
          Object.hasOwn(
            PLOT_STATUSES,
            plot.status
          )
            ? plot.status
            : "UNASSIGNED";

        const status =
          PLOT_STATUSES[statusKey];

        counts[statusKey] += 1;

        ctx.save();
        ctx.beginPath();

        plot.points.forEach(
          (point, index) => {
            const [x, y] = rotatePoint(
              point,
              rotation
            );

            const canvasX = x * width;

            const canvasY =
              y * height + headerHeight;

            if (index === 0) {
              ctx.moveTo(
                canvasX,
                canvasY
              );
            } else {
              ctx.lineTo(
                canvasX,
                canvasY
              );
            }
          }
        );

        ctx.closePath();


        /* STATUS FILL COLOUR */

        ctx.fillStyle =
          status.fillColor;

        ctx.globalAlpha =
          statusKey === "UNASSIGNED"
            ? 0.15
            : 0.5;

        ctx.fill();


        /* PLOT BOUNDARY */

        ctx.globalAlpha = 1;

        ctx.strokeStyle =
          status.color;

        ctx.lineWidth = Math.max(
          1.5,
          width / 1200
        );

        ctx.lineJoin = "round";

        ctx.setLineDash(
          plot.confirmed
            ? []
            : [6, 4]
        );

        ctx.stroke();

        ctx.restore();
      }


      /* MAP TITLE */

      ctx.textBaseline = "middle";

      ctx.fillStyle = "#18181b";

      ctx.font = `600 ${Math.max(
        16,
        width * 0.018
      )}px sans-serif`;

      ctx.fillText(
        title,
        padding,
        headerHeight * 0.3,
        width - padding * 2
      );


      /* STATUS LEGEND */

      const legendItems =
        Object.entries(PLOT_STATUSES);

      const legendWidth =
        (width - padding * 2) /
        legendItems.length;

      const legendY =
        headerHeight * 0.75;

      const dotRadius = Math.min(
        Math.max(
          3,
          width * 0.003
        ),
        legendWidth / 8
      );

      ctx.font = `${Math.max(
        10,
        width * 0.011
      )}px sans-serif`;

      legendItems.forEach(
        ([value, config], index) => {
          const x =
            padding +
            index * legendWidth;

          ctx.beginPath();

          ctx.arc(
            x + dotRadius,
            legendY,
            dotRadius,
            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            config.fillColor;

          ctx.fill();

          ctx.fillStyle =
            "#52525b";

          ctx.fillText(
            `${config.label}: ${counts[value]}`,
            x + dotRadius * 3,
            legendY,
            legendWidth - dotRadius * 4
          );
        }
      );


      /* GENERATE PNG */

      const blob = await new Promise(
        (resolve) => {
          exportCanvas.toBlob(
            resolve,
            "image/png"
          );
        }
      );

      if (!blob) {
        throw new Error(
          "Unable to generate map image."
        );
      }


      /* GENERATE SAFE FILE NAME */

      const filename =
        Array.from(title)
          .filter(
            (char) =>
              char.charCodeAt(0) >= 32
          )
          .join("")
          .replace(/[<>:"/\\|?*]/g, "-")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^[.-]+|[. -]+$/g, "")
          .slice(0, 120)
          .toLowerCase() ||
        "untitled-map";


      /* DOWNLOAD FILE */

      const url =
        URL.createObjectURL(blob);

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
        "Ramani map download failed:",
        err
      );

      setExportError(
        "Unable to download the map. Please try again."
      );

    } finally {
      setExporting(false);
    }
  };


  /* ========================================
     PROTECT EDITED PLOTS
  ======================================== */

  const hasProtectedPlots =
    reviewLocked ||
    plots.some(
      (plot) =>
        plot.source !== "AUTO_DETECTED" ||
        plot.confirmed
    );


  /* ========================================
     REPEAT DETECTION
  ======================================== */

  const repeatDetection = () => {
    if (
      !canvasRef.current ||
      drawing ||
      multiSelect ||
      selectedPlotId ||
      hasProtectedPlots
    ) {
      return;
    }

    onDetect(
      canvasRef.current,
      rotation,
      true
    );
  };


  /* ========================================
     PLOT STATISTICS
  ======================================== */

  const confirmedCount = plots.filter(
    (plot) => plot.confirmed
  ).length;

  const statusCounts = plots.reduce(
    (counts, plot) => ({
      ...counts,
      [plot.status]:
        (counts[plot.status] || 0) + 1,
    }),
    {}
  );


  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-background">

      {/* MAP TOOLBAR */}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">

        <div className="flex flex-wrap items-center gap-2">

          <Map className="h-4 w-4" />

          <span className="text-sm font-semibold">
            Map workspace
          </span>

          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
            {plots.length} plots
          </span>

          <span className="text-xs text-muted-foreground">
            {confirmedCount} confirmed
          </span>

          {preview && (
            <span className="text-xs text-muted-foreground">
              Page 1 of {preview.pageCount}
            </span>
          )}

        </div>

        {/* TOOLBAR ACTIONS */}

        <div className="flex flex-wrap items-center gap-2">

          {/* AUTO DETECT */}

          <Button
            variant="outline"
            size="sm"
            onClick={repeatDetection}
            disabled={
              !preview ||
              drawing ||
              multiSelect ||
              Boolean(selectedPlotId) ||
              hasProtectedPlots
            }
            title={
              hasProtectedPlots
                ? "Edited plots are protected from redetection"
                : "Detect plot boundaries"
            }
          >
            <ScanLine className="h-4 w-4" />
            Auto Detect
          </Button>


          {/* DRAW PLOT */}

          {!drawing ? (

            <Button
              variant="outline"
              size="sm"
              onClick={onStartDrawing}
              disabled={!preview || multiSelect}
            >
              <Pencil className="h-4 w-4" />
              Draw plot
            </Button>

          ) : (

            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={!draft.length}
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>

              <Button
                size="sm"
                onClick={onFinish}
                disabled={draft.length < 3}
              >
                <Check className="h-4 w-4" />
                Finish
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>

          )}


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
            disabled={
              !preview ||
              drawing ||
              !plots.length
            }
          >
            <ListChecks className="h-4 w-4" />

            {multiSelect
              ? "Exit selection"
              : "Multi-select"}
          </Button>


          {/* ROTATE MAP */}

          <Button
            variant="outline"
            size="sm"
            onClick={onRotate}
            disabled={!preview || drawing}
          >
            <RotateCw className="h-4 w-4" />
            Rotate
          </Button>


          {/* FIT MAP */}

          <Button
            variant="outline"
            size="sm"
            onClick={fitMap}
            disabled={!preview}
          >
            <Maximize className="h-4 w-4" />
            Fit map
          </Button>


          {/* SAVE MAP */}

          <Button
            type="button"
            size="sm"
            onClick={downloadMap}
            disabled={
              !preview ||
              drawing ||
              hasUnsavedChanges ||
              exporting
            }
            title="Download the full map as a PNG image"
          >
            {exporting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}

            {exporting
              ? "Preparing..."
              : "Save map"}
          </Button>

        </div>

      </div>


      {/* UNSAVED PLOT EDITS */}

      {hasUnsavedChanges && (
        <p className="border-b px-3 py-2 text-xs text-muted-foreground">
          Confirm or discard plot edits before downloading.
        </p>
      )}


      {/* DOWNLOAD ERROR */}

      {exportError && (
        <p
          role="alert"
          className="border-b px-3 py-2 text-xs text-destructive"
        >
          {exportError}
        </p>
      )}


      {/* DETECTION MESSAGE */}

      {detectionMessage && !drawing && (
        <div
          role="status"
          className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          <ScanLine className="h-4 w-4 shrink-0" />

          <span>{detectionMessage}</span>
        </div>
      )}


      {/* STATUS SUMMARY */}

      {!!plots.length && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">

          {!drawing && !multiSelect && (

            <select
              aria-label="Select a plot"
              value={selectedPlotId || ""}
              onChange={(event) =>
                onSelectPlot(
                  event.target.value || null
                )
              }
              className="h-8 max-w-full rounded-md border bg-background px-2 text-xs"
            >

              <option value="">
                Select plot
              </option>

              {plots.map((plot, index) => (
                <option
                  key={plot.id}
                  value={plot.id}
                >
                  {plot.plotNumber
                    ? `Plot ${plot.plotNumber}`
                    : `Candidate ${index + 1}`}
                </option>
              ))}

            </select>

          )}

          <div className="flex flex-wrap items-center gap-3">

            {Object.entries(PLOT_STATUSES).map(
              ([value, config]) => (
                <div
                  key={value}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        config.fillColor,
                    }}
                  />

                  <span className="text-muted-foreground">
                    {config.label}
                  </span>

                  <span className="font-semibold">
                    {statusCounts[value] || 0}
                  </span>
                </div>
              )
            )}

          </div>

        </div>
      )}


      {/* DRAWING INSTRUCTIONS */}

      {drawing && (
        <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs">

          <span>
            Click each corner, then select Finish.
          </span>

          <span className="font-medium">
            {draft.length} points
          </span>

        </div>
      )}


      {/* DRAWING ERROR */}

      {drawingError && (
        <div
          role="alert"
          className="border-b px-3 py-2 text-xs text-destructive"
        >
          {drawingError}
        </div>
      )}


      {/* LOADING STATE */}

      {!preview && !error && (
        <div
          role="status"
          className="flex min-h-[350px] flex-col items-center justify-center gap-3 bg-muted/30"
        >
          <LoaderCircle className="h-6 w-6 animate-spin" />

          <p className="text-sm text-muted-foreground">
            Preparing your interactive map...
          </p>
        </div>
      )}


      {/* ERROR STATE */}

      {error && (
        <div
          role="alert"
          className="flex min-h-[300px] flex-col items-center justify-center gap-3 bg-muted/30 p-4 text-center"
        >
          <AlertCircle className="h-6 w-6 text-destructive" />

          <p className="text-sm text-muted-foreground">
            {error}
          </p>
        </div>
      )}


      {/* INTERACTIVE MAP */}

      {preview && (
        <div className="relative isolate">

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
            zoomControl={true}
            attributionControl={false}
            scrollWheelZoom={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            className="z-0 h-[60dvh] min-h-[340px] w-full bg-zinc-100 sm:h-[65dvh]"
            style={{
              cursor: drawing
                ? "crosshair"
                : multiSelect
                  ? "pointer"
                  : "grab",
            }}
          >

            <MapResizeHandler />

            <ImageOverlay
              url={preview.url}
              bounds={bounds}
              interactive={false}
            />

            <PlotDrawingLayer
              width={preview.width}
              height={preview.height}
              rotation={rotation}
              drawing={drawing}
              draft={draft}
              plots={plots}
              selectedPlotId={selectedPlotId}
              selectedPlotIds={selectedPlotIds}
              onSelectPlot={onSelectPlot}
              onAddPoint={onAddPoint}
            />

          </MapContainer>


          {/* FLOATING BULK ACTIONS */}

          {multiSelect && (
            <BulkStatusToolbar
              selectedCount={selectedPlotIds.length}
              totalCount={plots.length}
              onSelectAll={onSelectAll}
              onClear={onClearSelection}
              onClose={onToggleMultiSelect}
              onApplyStatus={onBulkStatus}
            />
          )}

        </div>
      )}


      {/* STATUS BAR */}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">

        <span className="flex items-center gap-1.5">

          <MousePointer2 className="h-3.5 w-3.5" />

          {drawing
            ? "Drawing mode"
            : multiSelect
              ? "Click plots to select or deselect"
              : "Click a plot to edit"}

        </span>

        <span>
          Local workspace · PNG export only
        </span>

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
  const [rotation, setRotation] =
    useState(0);

  const [drawing, setDrawing] =
    useState(false);

  const [draft, setDraft] =
    useState([]);

  const [plots, setPlots] =
    useState([]);

  const [selectedPlotId, setSelectedPlotId] =
    useState(null);

  const [selectedPlotIds, setSelectedPlotIds] =
    useState([]);

  const [multiSelect, setMultiSelect] =
    useState(false);

  const [drawingError, setDrawingError] =
    useState("");

  const [detectionMessage, setDetectionMessage] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [reviewLocked, setReviewLocked] =
    useState(false);

  const [form, setForm] =
    useState({
      ...EMPTY_FORM,
    });

  const detectionAttempted =
    useRef(false);

  const manualPlotCounter =
    useRef(0);


  /* ========================================
     SELECTED INDIVIDUAL PLOT
  ======================================== */

  const selectedPlot = plots.find(
    (plot) => plot.id === selectedPlotId
  );

  const hasUnsavedChanges = Boolean(
    selectedPlot &&
    (
      form.plotNumber !==
        (selectedPlot.plotNumber || "") ||

      form.area !==
        (
          selectedPlot.area == null
            ? ""
            : String(selectedPlot.area)
        ) ||

      form.status !== selectedPlot.status
    )
  );

  const canLeaveEditor = () =>
    !hasUnsavedChanges ||
    window.confirm(
      "Discard unsaved plot changes?"
    );


  /* ========================================
     AUTOMATIC DETECTION
  ======================================== */

  const runDetection = useCallback(
    (canvas, currentRotation, retry = false) => {

      if (
        detectionAttempted.current &&
        !retry
      ) {
        return;
      }

      detectionAttempted.current = true;

      try {
        const candidates =
          detectPlots(canvas);

        const detectedPlots = candidates.map(
          (plot, index) => ({
            ...plot,

            id: `auto-${index + 1}`,

            plotNumber: "",
            area: null,
            status: "UNASSIGNED",
            source: "AUTO_DETECTED",
            confirmed: false,

            points: plot.points.map((point) =>
              rotatePoint(
                point,
                -currentRotation
              )
            ),
          })
        );

        setPlots(detectedPlots);
        setSelectedPlotId(null);
        setSelectedPlotIds([]);

        setDetectionMessage(
          detectedPlots.length
            ? `${detectedPlots.length} potential plots detected. Review their boundaries.`
            : "No plots detected. Draw boundaries manually."
        );

      } catch (err) {
        console.error(
          "Automatic detection failed:",
          err
        );

        setDetectionMessage(
          "Automatic detection failed. Manual drawing is available."
        );
      }
    },
    []
  );


  /* ========================================
     ENABLE / DISABLE MULTI-SELECT
  ======================================== */

  const toggleMultiSelect = () => {
    if (drawing) return;

    if (!canLeaveEditor()) return;

    setSelectedPlotId(null);
    setSelectedPlotIds([]);
    setFormError("");

    setMultiSelect(
      (current) => !current
    );
  };


  /* ========================================
     SELECT PLOT
  ======================================== */

  const selectPlot = (plotId) => {
    if (drawing) return;


    /* MULTIPLE SELECTION */

    if (multiSelect) {
      if (
        !plotId ||
        !plots.some(
          (plot) => plot.id === plotId
        )
      ) {
        return;
      }

      setSelectedPlotIds((current) =>
        current.includes(plotId)
          ? current.filter(
              (id) => id !== plotId
            )
          : [...current, plotId]
      );

      return;
    }


    /* INDIVIDUAL SELECTION */

    if (plotId === selectedPlotId) {
      return;
    }

    if (!canLeaveEditor()) return;

    if (!plotId) {
      setSelectedPlotId(null);
      setFormError("");
      return;
    }

    const plot = plots.find(
      (item) => item.id === plotId
    );

    if (!plot) return;

    setSelectedPlotId(plotId);
    setFormError("");

    setForm({
      plotNumber:
        plot.plotNumber || "",

      area:
        plot.area == null
          ? ""
          : String(plot.area),

      status:
        plot.status || "UNASSIGNED",
    });
  };


  /* ========================================
     SELECT ALL
  ======================================== */

  const selectAllPlots = () => {
    setSelectedPlotIds(
      plots.map((plot) => plot.id)
    );
  };


  /* ========================================
     CLEAR MULTIPLE SELECTION
  ======================================== */

  const clearSelection = () => {
    setSelectedPlotIds([]);
  };


  /* ========================================
     APPLY BULK STATUS
  ======================================== */

  const applyBulkStatus = (status) => {
    if (
      !multiSelect ||
      !selectedPlotIds.length
    ) {
      return;
    }

    if (
      !Object.hasOwn(
        PLOT_STATUSES,
        status
      )
    ) {
      return;
    }

    const selectedIds = new Set(
      selectedPlotIds
    );

    setPlots((current) =>
      current.map((plot) =>
        selectedIds.has(plot.id)
          ? {
              ...plot,
              status,
            }
          : plot
      )
    );

    setReviewLocked(true);

    setDetectionMessage(
      `${selectedPlotIds.length} plots marked as ${PLOT_STATUSES[status].label}.`
    );
  };


  /* ========================================
     CLOSE INDIVIDUAL EDITOR
  ======================================== */

  const closeEditor = () => {
    if (!canLeaveEditor()) return;

    setSelectedPlotId(null);
    setFormError("");
  };


  /* ========================================
     UPDATE PLOT FORM
  ======================================== */

  const updateForm = (field, value) => {
    setFormError("");

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };


  /* ========================================
     SAVE INDIVIDUAL PLOT
  ======================================== */

  const savePlot = (event) => {
    event.preventDefault();

    if (!selectedPlot) return;

    const plotNumber =
      form.plotNumber.trim();

    const area =
      form.area.trim() === ""
        ? null
        : Number(form.area);


    /* VALIDATE AREA */

    if (
      area !== null &&
      (
        !Number.isFinite(area) ||
        area <= 0
      )
    ) {
      setFormError(
        "Enter a valid plot area greater than zero."
      );

      return;
    }


    /* PREVENT DUPLICATE PLOT NUMBERS */

    const duplicate = plots.some(
      (plot) =>
        plot.id !== selectedPlotId &&
        plotNumber !== "" &&
        plot.plotNumber?.trim().toLowerCase() ===
          plotNumber.toLowerCase()
    );

    if (duplicate) {
      setFormError(
        "This plot number is already in use."
      );

      return;
    }


    /* VALIDATE STATUS */

    if (
      !Object.hasOwn(
        PLOT_STATUSES,
        form.status
      )
    ) {
      setFormError("Invalid plot status.");
      return;
    }


    /* UPDATE PLOT */

    setPlots((current) =>
      current.map((plot) =>
        plot.id === selectedPlotId
          ? {
              ...plot,
              plotNumber,
              area,
              status: form.status,
              confirmed: true,
            }
          : plot
      )
    );

    setForm({
      plotNumber,

      area:
        area === null
          ? ""
          : String(area),

      status: form.status,
    });

    setReviewLocked(true);
    setFormError("");
  };


  /* ========================================
     REMOVE INDIVIDUAL PLOT
  ======================================== */

  const removePlot = () => {
    if (!selectedPlot) return;

    if (
      !window.confirm(
        "Remove this plot boundary from the map?"
      )
    ) {
      return;
    }

    setPlots((current) =>
      current.filter(
        (plot) => plot.id !== selectedPlotId
      )
    );

    setSelectedPlotIds((current) =>
      current.filter(
        (id) => id !== selectedPlotId
      )
    );

    setSelectedPlotId(null);
    setReviewLocked(true);
    setFormError("");
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
     START MANUAL DRAWING
  ======================================== */

  const startDrawing = () => {
    if (!canLeaveEditor()) return;

    setSelectedPlotId(null);
    setSelectedPlotIds([]);
    setMultiSelect(false);
    setDraft([]);
    setDrawingError("");
    setFormError("");
    setDrawing(true);
  };


  /* ========================================
     ADD DRAWING POINT
  ======================================== */

  const addPoint = (point) => {
    setDrawingError("");

    setDraft((current) => {
      const duplicate = current.some(
        ([x, y]) =>
          Math.hypot(
            x - point[0],
            y - point[1]
          ) < 0.0005
      );

      return duplicate
        ? current
        : [...current, point];
    });
  };


  /* ========================================
     UNDO LAST POINT
  ======================================== */

  const undoPoint = () => {
    setDrawingError("");

    setDraft(
      (current) => current.slice(0, -1)
    );
  };


  /* ========================================
     CANCEL DRAWING
  ======================================== */

  const cancelDrawing = () => {
    setDraft([]);
    setDrawingError("");
    setDrawing(false);
  };


  /* ========================================
     FINISH MANUAL POLYGON
  ======================================== */

  const finishDrawing = () => {
    if (draft.length < 3) return;

    const normalizedArea =
      Math.abs(
        draft.reduce(
          (total, point, index) => {
            const next =
              draft[(index + 1) % draft.length];

            return (
              total +
              point[0] * next[1] -
              next[0] * point[1]
            );
          },
          0
        )
      ) / 2;

    if (normalizedArea < 0.0000000001) {
      setDrawingError(
        "Select at least three non-collinear corners."
      );

      return;
    }

    manualPlotCounter.current += 1;

    const newPlot = {
      id: `manual-${manualPlotCounter.current}`,

      plotNumber: "",
      area: null,
      status: "UNASSIGNED",
      source: "MANUAL",
      confirmed: false,
      points: [...draft],
    };

    setPlots((current) => [
      ...current,
      newPlot,
    ]);

    setSelectedPlotId(newPlot.id);

    setForm({
      ...EMPTY_FORM,
    });

    setReviewLocked(true);
    setDraft([]);
    setDrawingError("");
    setFormError("");
    setDrawing(false);
  };


  /* ========================================
     RENDER WORKSPACE
  ======================================== */

  return (
    <div
      className={`grid items-start gap-3 ${
        selectedPlot && !multiSelect
          ? "lg:grid-cols-[minmax(0,1fr)_280px]"
          : "grid-cols-1"
      }`}
    >

      <PDFMapCanvas
        key={rotation}
        file={file}
        mapTitle={mapTitle}
        hasUnsavedChanges={hasUnsavedChanges}
        rotation={rotation}
        onRotate={rotateMap}
        drawing={drawing}
        draft={draft}
        plots={plots}
        selectedPlotId={selectedPlotId}
        selectedPlotIds={selectedPlotIds}
        multiSelect={multiSelect}
        onSelectPlot={selectPlot}
        onToggleMultiSelect={toggleMultiSelect}
        onSelectAll={selectAllPlots}
        onClearSelection={clearSelection}
        onBulkStatus={applyBulkStatus}
        onStartDrawing={startDrawing}
        onAddPoint={addPoint}
        onUndo={undoPoint}
        onFinish={finishDrawing}
        onCancel={cancelDrawing}
        drawingError={drawingError}
        onDetect={runDetection}
        detectionMessage={detectionMessage}
        reviewLocked={reviewLocked}
      />


      {/* INDIVIDUAL PLOT EDITOR */}

      {selectedPlot && !multiSelect && (
        <PlotDetailsEditor
          plot={selectedPlot}
          form={form}
          error={formError}
          onChange={updateForm}
          onSave={savePlot}
          onRemove={removePlot}
          onClose={closeEditor}
        />
      )}

    </div>
  );
};

export default RamaniMapViewer;