import getPublicProjectThumbnailSvg from "../services/publicProjectThumbnailService.js";

// ==========================================
// PUBLIC PROJECT MAP THUMBNAIL
// ==========================================

// GET /api/project/:projectId/thumbnail.svg

export const getPublicProjectThumbnailController = async (
  req,
  res
) => {
  try {
    const { projectId } = req.params;

    // Generate SVG from the project's
    // saved plot geometries.
    //
    // The service enforces public visibility:
    // - ACTIVE project
    // - Valid project type
    // - APPROVED company

    const svg = await getPublicProjectThumbnailSvg(
      projectId
    );

    // Do not expose thumbnails for
    // unpublished or unauthorized projects.

    if (!svg) {
      return res.status(404).json({
        success: false,
        message: "Project thumbnail not found",
      });
    }

    // SVG is returned as an image.
    //
    // Disable caching so unpublished projects
    // do not remain accessible through stale
    // browser or intermediary caches.

    return res
      .status(200)
      .set({
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(svg);

  } catch (error) {
    console.error(
      "Public project thumbnail error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load project thumbnail",
    });
  }
};