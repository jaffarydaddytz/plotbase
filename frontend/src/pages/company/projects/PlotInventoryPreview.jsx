const PlotInventoryPreview = ({ data }) => {
  if (!data?.features?.length) return null;

  const plots = data.features;
  const previewLimit = 20;

  const previewPlots = plots.slice(0, previewLimit);

  // Extract original plot numbers
  const getPlotNumber = (feature, index) => {
    const properties = feature.properties || {};

    const plotNumber =
      properties.plotNumber ??
      properties.plot_number ??
      properties.lotNumber;

    if (
      plotNumber === null ||
      plotNumber === undefined ||
      String(plotNumber).trim() === ""
    ) {
      return `Unnumbered #${index + 1}`;
    }

    return String(plotNumber);
  };

  // Extract plot area without calculating prices
  const getPlotArea = (feature) => {
    const properties = feature.properties || {};

    const rawArea =
      properties.areaSqm ??
      properties.legalArea;

    if (rawArea == null || String(rawArea).trim() === "") {
      return "Not provided";
    }

    const area = Number(
      String(rawArea).replace(/,/g, "")
    );

    if (!Number.isFinite(area) || area <= 0) {
      return "Invalid area";
    }

    return new Intl.NumberFormat("en-TZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(area);
  };

  return (
    <section className="w-full min-w-0 space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Plot Inventory Preview
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Review the plots detected in your uploaded GeoJSON.
          </p>
        </div>

        <span className="w-fit rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          {plots.length} Plots Detected
        </span>

      </div>

      {/* Responsive Table */}
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-gray-200">

        <table className="w-full min-w-[540px] border-collapse text-left text-sm">

          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold">
                #
              </th>

              <th className="px-4 py-3 font-semibold">
                Plot Number
              </th>

              <th className="px-4 py-3 font-semibold">
                Area (sqm)
              </th>

              <th className="px-4 py-3 font-semibold">
                Geometry
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">

            {previewPlots.map((feature, index) => (
              <tr
                key={index}
                className="transition hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-gray-500">
                  {index + 1}
                </td>

                <td className="px-4 py-3 font-medium text-gray-800">
                  {getPlotNumber(feature, index)}
                </td>

                <td className="px-4 py-3 text-gray-700">
                  {getPlotArea(feature)}
                </td>

                <td className="px-4 py-3 text-gray-600">
                  {feature.geometry?.type || "Unknown"}
                </td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {/* Preview Limit Information */}
      {plots.length > previewLimit && (
        <p className="text-xs text-gray-500">
          Showing the first {previewLimit} of {plots.length} plots.
          All validated features remain available for the map preview.
        </p>
      )}

      <p className="text-xs text-gray-500">
        Plot numbers and areas shown here come from the uploaded
        GeoJSON. Final plot prices will be calculated by the backend.
      </p>

    </section>
  );
};

export default PlotInventoryPreview;