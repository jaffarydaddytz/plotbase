import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import PropertyCard from "../../components/common/PropertyCard";
import API_URL from "../../config";

import { Skeleton } from "@/components/ui/skeleton";

import {
  ExternalLink,
  Trash2,
  Building2,
} from "lucide-react";

// =====================================================
// PROPERTY SKELETON CARD
// =====================================================

const PropertySkeletonCard = () => {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      {/* PROPERTY IMAGE */}
      <Skeleton className="h-[200px] w-full rounded-none" />

      {/* PROPERTY INFORMATION */}
      <div className="space-y-4 p-5">

        {/* TITLE */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>

        {/* PROPERTY DETAILS */}
        <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex flex-col items-center gap-2"
            >
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          ))}
        </div>

        {/* SELLER INFORMATION */}
        <div className="space-y-2 border-t border-zinc-100 pt-4">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-48 max-w-full rounded" />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>

      </div>
    </div>
  );
};

// =====================================================
// PROPERTIES SKELETON GRID
// =====================================================

const PropertiesSkeleton = () => {
  return (
    <div
      role="status"
      aria-label="Loading properties"
      aria-busy="true"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <PropertySkeletonCard key={index} />
      ))}
    </div>
  );
};

// =====================================================
// ADMIN PROPERTIES PAGE
// =====================================================

const AdminProperties = () => {
  const { token } = useAuth();

  // ===================================================
  // STATE
  // ===================================================

  const [properties, setProperties] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  // ===================================================
  // FETCH PROPERTIES
  // ===================================================

  useEffect(() => {
    if (!token) {
      setProperties([]);
      setLoading(false);
      setError("Authentication is required.");
      return;
    }

    const controller = new AbortController();

    const fetchProperties = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(
          `${API_URL}/api/admin/properties`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        // Support the existing backend response formats.
        const propertyData = Array.isArray(response.data)
          ? response.data
          : response.data?.properties;

        if (!Array.isArray(propertyData)) {
          throw new Error("Invalid properties response.");
        }

        if (!controller.signal.aborted) {
          setProperties(propertyData);
        }
      } catch (err) {
        if (controller.signal.aborted || axios.isCancel(err)) {
          return;
        }

        setProperties([]);

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load properties."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProperties();

    return () => {
      controller.abort();
    };
  }, [token]);

  // ===================================================
  // DELETE PROPERTY
  // ===================================================

  const handleDelete = async (propertyId) => {
    if (!propertyId || deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this property?"
    );

    if (!confirmed) return;

    setDeletingId(propertyId);
    setError("");

    try {
      await axios.delete(
        `${API_URL}/api/admin/properties/${propertyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Remove the deleted property without reloading.
      setProperties((previous) =>
        previous.filter(
          (property) => property._id !== propertyId
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete property. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section className="space-y-6">

      {/* ============================================= */}
      {/* PAGE HEADER — ALWAYS VISIBLE */}
      {/* ============================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            Property Moderation
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Review and manage all property listings.
          </p>
        </div>

        {/* PROPERTY COUNT */}

        {!loading && !error && (
          <div className="inline-flex self-start items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 sm:self-auto">

            <Building2
              size={16}
              strokeWidth={1.8}
              className="text-zinc-500"
            />

            <span className="text-xs font-semibold text-zinc-700">
              {properties.length} Properties
            </span>

          </div>
        )}

      </div>

      {/* ============================================= */}
      {/* ERROR MESSAGE */}
      {/* ============================================= */}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* ============================================= */}
      {/* PROPERTIES CONTENT */}
      {/* ============================================= */}

      {loading ? (

        // ---------------------------------------------
        // SKELETON LOADING
        // ---------------------------------------------

        <PropertiesSkeleton />

      ) : error && properties.length === 0 ? (

        // ---------------------------------------------
        // FETCH ERROR
        // ---------------------------------------------

        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">

          <h2 className="text-sm font-semibold text-zinc-950">
            Properties unavailable
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Unable to retrieve property listings.
          </p>

        </div>

      ) : properties.length === 0 ? (

        // ---------------------------------------------
        // EMPTY STATE
        // ---------------------------------------------

        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">

            <Building2
              size={22}
              strokeWidth={1.6}
              className="text-zinc-500"
            />

          </div>

          <h2 className="mt-4 text-base font-semibold text-zinc-950">
            No Properties Found
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            There are currently no property listings to display.
          </p>

        </div>

      ) : (

        // ---------------------------------------------
        // PROPERTIES GRID
        // ---------------------------------------------

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

          {properties.map((property) => (
            <PropertyCard
              key={property._id}
              property={property}
              renderActions={() => (

                <div className="w-full border-t border-zinc-100 bg-white px-4 py-4">

                  {/* SELLER INFORMATION */}

                  <div className="mb-3 min-w-0">

                    <p className="text-xs font-semibold text-zinc-800">
                      Seller: {property.seller?.name || "Unknown"}
                    </p>

                    {property.seller?.email && (
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {property.seller.email}
                      </p>
                    )}

                  </div>

                  {/* PROPERTY ACTIONS */}

                  <div className="flex items-center justify-end gap-2">

                    {/* VIEW PROPERTY */}

                    <Link
                      to={`/property/${property._id}`}
                      title="View property"
                      aria-label="View property"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                    >
                      <ExternalLink
                        size={16}
                        strokeWidth={1.8}
                      />
                    </Link>

                    {/* DELETE PROPERTY */}

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(property._id)
                      }
                      disabled={deletingId !== null}
                      title="Delete property"
                      aria-label="Delete property"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2
                        size={16}
                        strokeWidth={1.8}
                      />
                    </button>

                  </div>

                </div>

              )}
            />
          ))}

        </div>

      )}

    </section>
  );
};

export default AdminProperties;