/* ========================================
   RAMANI AUTOMATIC PLOT DETECTION ENGINE
======================================== */

const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) -
  (b[1] - a[1]) * (c[0] - a[0]);


/* ========================================
   GENERATE POLYGON BOUNDARY
======================================== */

function convexHull(points) {
  const sorted = points.sort(
    (a, b) => a[0] - b[0] || a[1] - b[1]
  );

  const lower = [];
  const upper = [];

  for (const point of sorted) {
    while (
      lower.length > 1 &&
      cross(
        lower.at(-2),
        lower.at(-1),
        point
      ) <= 0
    ) {
      lower.pop();
    }

    lower.push(point);
  }

  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];

    while (
      upper.length > 1 &&
      cross(
        upper.at(-2),
        upper.at(-1),
        point
      ) <= 0
    ) {
      upper.pop();
    }

    upper.push(point);
  }

  return [
    ...lower.slice(0, -1),
    ...upper.slice(0, -1),
  ];
}


/* ========================================
   CALCULATE POLYGON AREA
======================================== */

function polygonArea(points) {
  return (
    Math.abs(
      points.reduce((sum, point, index) => {
        const next =
          points[(index + 1) % points.length];

        return (
          sum +
          point[0] * next[1] -
          next[0] * point[1]
        );
      }, 0)
    ) / 2
  );
}


/* ========================================
   SIMPLIFY POLYGON CORNERS
======================================== */

function simplifyHull(points, tolerance = 2) {
  const result = [...points];

  while (result.length > 3) {
    let bestDistance = Infinity;
    let bestIndex = -1;

    for (let i = 0; i < result.length; i++) {
      const a =
        result[(i + result.length - 1) % result.length];

      const b = result[i];

      const c =
        result[(i + 1) % result.length];

      const distance =
        Math.abs(cross(a, c, b)) /
        (Math.hypot(
          c[0] - a[0],
          c[1] - a[1]
        ) || 1);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    if (bestDistance > tolerance) {
      break;
    }

    result.splice(bestIndex, 1);
  }

  return result;
}


/* ========================================
   DETECT ENCLOSED PLOT REGIONS
======================================== */

export function detectPlotsFromPixels({
  data,
  width,
  height,
}) {
  const size = width * height;

  const visited = new Uint8Array(size);
  const queue = new Int32Array(size);

  const minArea = size * 0.0005;
  const maxArea = size * 0.035;

  const candidates = [];


/* Identify boundaries while preserving coloured plot interiors */

for (let i = 0; i < size; i++) {
  const index = i * 4;

  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const alpha = data[index + 3];

  const luminance =
    0.299 * red +
    0.587 * green +
    0.114 * blue;

  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);

  const colorDifference = maxChannel - minChannel;

  const saturation =
    maxChannel === 0
      ? 0
      : colorDifference / maxChannel;

  const isColoredFill =
    maxChannel > 75 &&
    colorDifference > 45 &&
    saturation > 0.45;

  const isBoundary =
    alpha > 128 &&
    luminance < 185 &&
    !isColoredFill;

  visited[i] = isBoundary ? 1 : 0;
}


  /* Search for enclosed regions */

  for (let start = 0; start < size; start++) {
    if (visited[start]) continue;

    let head = 0;
    let tail = 1;

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    queue[0] = start;
    visited[start] = 1;


    /* Flood fill */

    while (head < tail) {
      const pixel = queue[head++];

      const x = pixel % width;
      const y = Math.floor(pixel / width);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);

      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);


      // Left
      if (x > 0 && !visited[pixel - 1]) {
        visited[pixel - 1] = 1;
        queue[tail++] = pixel - 1;
      }

      // Right
      if (
        x < width - 1 &&
        !visited[pixel + 1]
      ) {
        visited[pixel + 1] = 1;
        queue[tail++] = pixel + 1;
      }

      // Top
      if (
        y > 0 &&
        !visited[pixel - width]
      ) {
        visited[pixel - width] = 1;
        queue[tail++] = pixel - width;
      }

      // Bottom
      if (
        y < height - 1 &&
        !visited[pixel + width]
      ) {
        visited[pixel + width] = 1;
        queue[tail++] = pixel + width;
      }
    }


    /* Ignore regions touching the image border */

    if (
      minX === 0 ||
      minY === 0 ||
      maxX === width - 1 ||
      maxY === height - 1
    ) {
      continue;
    }


    /* Filter regions by size */

    if (
      tail < minArea ||
      tail > maxArea
    ) {
      continue;
    }

    const regionWidth = maxX - minX + 1;
    const regionHeight = maxY - minY + 1;

    const aspectRatio =
      regionWidth / regionHeight;

    if (
      regionWidth < 12 ||
      regionHeight < 12 ||
      aspectRatio < 0.2 ||
      aspectRatio > 5
    ) {
      continue;
    }


    /* Find boundary pixels */

    const left = new Int32Array(
      regionHeight
    ).fill(width);

    const right = new Int32Array(
      regionHeight
    ).fill(-1);

    for (let i = 0; i < tail; i++) {
      const pixel = queue[i];

      const x = pixel % width;

      const row =
        Math.floor(pixel / width) - minY;

      left[row] = Math.min(left[row], x);

      right[row] = Math.max(right[row], x);
    }

    const edges = [];

    for (
      let row = 0;
      row < regionHeight;
      row++
    ) {
      if (right[row] < 0) continue;

      edges.push(
        [left[row], row + minY],
        [right[row], row + minY]
      );
    }


    /* Generate polygon */

    const hull = convexHull(edges);

    if (hull.length < 3) continue;

    const hullArea = polygonArea(hull);

    const solidity =
      tail / Math.max(1, hullArea);

    if (solidity < 0.65) {
      continue;
    }

    const polygon = simplifyHull(hull, 2);


    /* Normalize coordinates */

    candidates.push({
      points: polygon.map(([x, y]) => [
        x / width,
        y / height,
      ]),

      status: "UNASSIGNED",

      source: "AUTO_DETECTED",

      confirmed: false,
    });
  }

  return candidates;
}

/* ========================================
   FILTER DETACHED DOCUMENT REGIONS
======================================== */

function filterDetachedRegions(plots, width, height) {
  if (plots.length < 8 || plots.length > 1500) {
    return plots;
  }

  const boxes = plots.map((plot) => {
    const xs = plot.points.map(([x]) => x * width);
    const ys = plot.points.map(([, y]) => y * height);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });

  // Estimate typical plot dimensions.
  const sizes = boxes
    .map((box) =>
      Math.min(
        box.maxX - box.minX,
        box.maxY - box.minY
      )
    )
    .sort((a, b) => a - b);

  const medianSize =
    sizes[Math.floor(sizes.length / 2)];

  const maxGap = medianSize * 0.6;

  const distance = (a, b) => {
    const dx = Math.max(
      0,
      a.minX - b.maxX,
      b.minX - a.maxX
    );

    const dy = Math.max(
      0,
      a.minY - b.maxY,
      b.minY - a.maxY
    );

    return Math.hypot(dx, dy);
  };

  const visited = new Set();
  const groups = [];

  // Group neighbouring polygons.
  for (let i = 0; i < boxes.length; i++) {
    if (visited.has(i)) continue;

    const group = [];
    const queue = [i];

    visited.add(i);

    while (queue.length) {
      const current = queue.pop();

      group.push(current);

      for (let j = 0; j < boxes.length; j++) {
        if (visited.has(j)) continue;

        if (
          distance(boxes[current], boxes[j]) <= maxGap
        ) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    groups.push(group);
  }

  groups.sort((a, b) => b.length - a.length);

  const mainGroup = groups[0];

  // Only filter when a clearly dominant plot group exists.
  if (
    mainGroup.length < 8 ||
    mainGroup.length / plots.length < 0.75
  ) {
    return plots;
  }

  return mainGroup.map((index) => plots[index]);
}


/* ========================================
   MAIN DETECTION FUNCTION
======================================== */

export function detectPlots(canvas) {
const scale = Math.min(
  1,
  2800 / Math.max(
    canvas.width,
    canvas.height
  )
);

  const detectionCanvas =
    document.createElement("canvas");

  detectionCanvas.width = Math.max(
    1,
    Math.round(canvas.width * scale)
  );

  detectionCanvas.height = Math.max(
    1,
    Math.round(canvas.height * scale)
  );

  const context =
    detectionCanvas.getContext("2d", {
      willReadFrequently: true,
    });

  if (!context) {
    throw new Error(
      "Unable to read map pixels."
    );
  }

  context.fillStyle = "#ffffff";

  context.fillRect(
    0,
    0,
    detectionCanvas.width,
    detectionCanvas.height
  );

  context.drawImage(
    canvas,
    0,
    0,
    detectionCanvas.width,
    detectionCanvas.height
  );

  const imageData = context.getImageData(
    0,
    0,
    detectionCanvas.width,
    detectionCanvas.height
  );

 const candidates = detectPlotsFromPixels(imageData);

const filteredPlots = filterDetachedRegions(
  candidates,
  detectionCanvas.width,
  detectionCanvas.height
);

console.info("Ramani detection:", {
  detected: candidates.length,
  excluded: candidates.length - filteredPlots.length,
  remaining: filteredPlots.length,
});

return filteredPlots;
}