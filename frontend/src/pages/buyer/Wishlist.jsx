import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import Navbar from "../../components/common/Navbar";
import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

import {
  HiHeart,
  HiOutlineHeart,
  HiTrash,
  HiArrowRight,
  HiLocationMarker,
  HiOutlineClock,
  HiRefresh,
  HiX,
} from "react-icons/hi";

/* =====================================================
   HELPERS
===================================================== */

const getImage = (property) => {
  const first = property?.images?.[0];

  if (typeof first === "string") return first;

  return first?.url || first?.secure_url || "";
};

const getCompanyName = (property) => {
  if (typeof property?.company?.name === "string") {
    return property.company.name;
  }

  if (typeof property?.seller?.name === "string") {
    return property.seller.name;
  }

  return "";
};

const getLocationName = (property) => {
  const parts = [
    property?.district,
    property?.city,
    property?.region,
  ].filter(Boolean);

  return [...new Set(parts)].join(", ") || "Location unavailable";
};

const getLandUse = (type) => {
  const value = String(type || "").toLowerCase();

  const labels = {
    residential: "Residential",
    commercial: "Commercial",
    agricultural: "Agricultural",
    farm: "Agricultural",
    plot: "Land",
    industrial: "Industrial",
    mixed: "Mixed-use",
  };

  return labels[value] || type || "Land";
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Price on Request";
  }

  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    return "Price on Request";
  }

  if (price >= 1_000_000_000) {
    return `TZS ${(price / 1_000_000_000)
      .toFixed(1)
      .replace(/\.0$/, "")}B`;
  }

  if (price >= 1_000_000) {
    return `TZS ${(price / 1_000_000)
      .toFixed(1)
      .replace(/\.0$/, "")}M`;
  }

  if (price >= 1_000) {
    return `TZS ${(price / 1_000)
      .toFixed(1)
      .replace(/\.0$/, "")}K`;
  }

  return `TZS ${price.toLocaleString("en-TZ")}`;
};

const formatPostedDate = (dateValue) => {
  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  const difference = Math.max(0, Date.now() - date.getTime());

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   WISHLIST PROJECT CARD
===================================================== */

const WishlistProjectCard = ({
  property,
  onRemove,
  removing,
}) => {
  const [imageError, setImageError] = useState(false);

  const image = getImage(property);
  const companyName = getCompanyName(property);

  const postedDateValue =
    property?.publishedAt || property?.createdAt;

  const postedDate = formatPostedDate(postedDateValue);

  const handleRemove = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!removing) {
      onRemove(property._id);
    }
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-200 hover:border-zinc-300 hover:shadow-md">

      {/* PROJECT IMAGE */}

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
        <Link
          to={`/property/${property._id}`}
          aria-label={`Explore ${property.title || "project"}`}
          className="absolute inset-0 block"
        >
          {image && !imageError ? (
            <img
              src={image}
              alt={property.title || "Project image"}
              loading="lazy"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-100">
              <HiLocationMarker className="h-7 w-7 text-zinc-300" />
              <span className="text-[11px] text-zinc-400">
                No project image
              </span>
            </div>
          )}
        </Link>

        {/* LAND USE */}

        <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-zinc-800 shadow-sm">
          {getLandUse(property.propertyType)}
        </span>

        {/* PRICE */}

        <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-zinc-900 shadow-sm">
          {formatPrice(property.price) === "Price on Request"
            ? "Price on Request"
            : `From ${formatPrice(property.price)}`}
        </span>

        {/* REMOVE FROM WISHLIST */}

        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          aria-label={`Remove ${property.title || "project"} from wishlist`}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-zinc-950 shadow-sm transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
          title="Remove from wishlist"
        >
          <HiHeart className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* PROJECT INFORMATION */}

      <div className="flex min-w-0 flex-1 flex-col p-3.5">

        {/* PROJECT NAME */}

        <Link to={`/property/${property._id}`}>
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-5 text-zinc-900 transition hover:text-zinc-600">
            {property.title || "Untitled Project"}
          </h3>
        </Link>

        {/* LOCATION */}

        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
          <HiLocationMarker className="h-3.5 w-3.5 shrink-0" />

          <span className="truncate">
            {getLocationName(property)}
          </span>
        </div>

        {/* DESCRIPTION */}

        <p className="mt-2 line-clamp-3 min-h-[48px] text-[11px] leading-4 text-zinc-500">
          {property.description ||
            "Explore this land investment opportunity and discover more details about the project."}
        </p>

        {/* COMPANY AND POSTED DATE */}

        {(companyName || postedDate) && (
          <div className="mt-auto flex min-w-0 items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">

            {companyName ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-700">
                  {companyName.charAt(0).toUpperCase()}
                </div>

                <span
                  title={companyName}
                  className="min-w-0 truncate text-[10px] font-medium text-zinc-700"
                >
                  {companyName}
                </span>
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}

            {postedDate && (
              <div className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-400">
                <HiOutlineClock className="h-3 w-3" />

                <span>{postedDate}</span>
              </div>
            )}
          </div>
        )}

        {/* ACTIONS */}

        <div className="mt-3 flex gap-2">
          <Link
            to={`/property/${property._id}`}
            className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[11px] font-medium text-white transition hover:bg-zinc-800"
          >
            Explore Project
            <HiArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            aria-label="Remove from wishlist"
            title="Remove from wishlist"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-60"
          >
            <HiTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

/* =====================================================
   LOADING SKELETON
===================================================== */

const WishlistSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
      >
        <div className="aspect-[16/9] animate-pulse bg-zinc-200" />

        <div className="space-y-2.5 p-3.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
          <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-100" />
          <div className="h-8 w-full animate-pulse rounded bg-zinc-200" />
        </div>
      </div>
    ))}
  </div>
);

/* =====================================================
   MAIN WISHLIST PAGE
===================================================== */

const Wishlist = () => {
  const { token } = useAuth();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingIds, setRemovingIds] = useState([]);

  /* =====================================================
     FETCH WISHLIST
  ===================================================== */

  const fetchWishlist = useCallback(async (signal) => {
    if (!token) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/api/wishlist`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        }
      );

      const items = Array.isArray(response.data)
        ? response.data
        : [];

      setWishlistItems(items.filter((item) => item?.property));
    } catch (err) {
      if (axios.isCancel(err)) return;

      console.error("Failed to fetch wishlist:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load your wishlist. Please try again."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();

    fetchWishlist(controller.signal);

    return () => controller.abort();
  }, [fetchWishlist]);

  /* =====================================================
     REMOVE FROM WISHLIST
  ===================================================== */

  const removeFromWishlist = async (propertyId) => {
    if (!propertyId || !token) return;

    const id = String(propertyId);

    if (removingIds.includes(id)) return;

    setRemovingIds((previous) => [...previous, id]);
    setError("");

    try {
      await axios.delete(
        `${API_URL}/api/wishlist/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setWishlistItems((previous) =>
        previous.filter(
          (item) => String(item.property?._id) !== id
        )
      );
    } catch (err) {
      console.error("Failed to remove wishlist item:", err);

      setError(
        err.response?.data?.message ||
          "Unable to remove this project from your wishlist."
      );
    } finally {
      setRemovingIds((previous) =>
        previous.filter((item) => item !== id)
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">

        {/* PAGE HEADER */}

        <div className="mb-5">
          <div className="flex items-center gap-2">
            <HiOutlineHeart className="h-5 w-5 text-zinc-900" />

            <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950 sm:text-2xl">
              Your Wishlist
            </h1>
          </div>

          <p className="mt-1 text-xs text-zinc-500">
            Projects you've saved for later.
          </p>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          >
            <p className="text-xs leading-5 text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="text-red-600 hover:text-red-800"
            >
              <HiX className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* LOADING STATE */}

        {loading && <WishlistSkeleton />}

        {/* LOGIN STATE */}

        {!loading && !token && (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <HiOutlineHeart className="h-6 w-6 text-zinc-600" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-zinc-900">
              Sign in to view your wishlist
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              Save your favorite land projects and access them whenever you want.
            </p>

            <Link
              to="/login"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Sign In
              <HiArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        )}

        {/* FETCH ERROR / RETRY */}

        {!loading && token && error && wishlistItems.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-zinc-900">
              Unable to load your wishlist
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Please try again.
            </p>

            <button
              type="button"
              onClick={() => fetchWishlist()}
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              <HiRefresh className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY STATE */}

        {!loading &&
          token &&
          !error &&
          wishlistItems.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
                <HiOutlineHeart className="h-7 w-7 text-zinc-700" />
              </div>

              <h2 className="mt-4 text-base font-semibold text-zinc-900">
                Your wishlist is empty
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Explore land projects across Tanzania and save the ones that interest you.
              </p>

              <Link
                to="/properties"
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-5 text-xs font-medium text-white transition hover:bg-zinc-800"
              >
                Explore Projects
                <HiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

        {/* WISHLIST PROJECT GRID */}

        {!loading && token && wishlistItems.length > 0 && (
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {wishlistItems.map((item) => (
              <WishlistProjectCard
                key={item._id || item.property._id}
                property={item.property}
                removing={removingIds.includes(String(item.property._id))}
                onRemove={removeFromWishlist}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Wishlist;