import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Navbar from "../../components/common/Navbar";
import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

import {
  HiSearch,
  HiLocationMarker,
  HiOutlineHeart,
  HiHeart,
  HiAdjustments,
  HiX,
  HiArrowRight,
  HiRefresh,
  HiChevronDown,
  HiCheck,
  HiOutlineClock,
} from "react-icons/hi";

/* =====================================================
   CONFIGURATION
===================================================== */

const INITIAL_VISIBLE = 12;
const LOAD_MORE_COUNT = 12;

const LAND_USE_OPTIONS = [
  { label: "All Land Uses", value: "all" },
  { label: "Residential", value: "residential" },
  { label: "Commercial", value: "commercial" },
  { label: "Agricultural", value: "farm" },
];

const SORT_OPTIONS = [
  { label: "Newest First", value: "latest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Price: Low to High", value: "priceLow" },
  { label: "Price: High to Low", value: "priceHigh" },
  { label: "Name: A to Z", value: "nameAsc" },
  { label: "Name: Z to A", value: "nameDesc" },
];

const INITIAL_FILTERS = {
  search: "",
  category: "all",
  city: "",
  minPrice: "",
  maxPrice: "",
  minSize: "",
  maxSize: "",
  sort: "latest",
  availableOnly: false,
};

/* =====================================================
   HELPERS
===================================================== */

const getValidNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
};

const getImage = (property) => {
  const images = property?.images;

  if (Array.isArray(images)) {
    const first = images[0];

    if (typeof first === "string") {
      return first;
    }

    return first?.url || first?.secure_url || "";
  }

  return typeof images === "string" ? images : "";
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
  const values = [
    property?.district,
    property?.city,
    property?.region,
  ].filter(Boolean);

  return [...new Set(values)].join(", ") || "Location unavailable";
};

const getLandUse = (value) => {
  const normalized = String(value || "").toLowerCase();

  const labels = {
    residential: "Residential",
    commercial: "Commercial",
    agricultural: "Agricultural",
    farm: "Agricultural",
    industrial: "Industrial",
    plot: "Land",
  };

  return labels[normalized] || value || "Land";
};

const formatCompactPrice = (value) => {
  const price = getValidNumber(value);

  if (price === null) return "Price on Request";

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

const formatFullPrice = (value) =>
  `TZS ${Number(value).toLocaleString("en-TZ", {
    maximumFractionDigits: 0,
  })}`;

const formatSize = (value) =>
  `${Number(value).toLocaleString("en-TZ")} m²`;

// Temporary support for legacy property-area fields.
// These are not guaranteed to represent individual available plots.
const getProjectSize = (property) =>
  getValidNumber(
    property?.areaSqm ??
      property?.plotSizeSqm ??
      property?.plotSize ??
      property?.area ??
      property?.size
  );

const getAvailablePlots = (property) => {
  const value =
    property?.availablePlots ??
    property?.availablePlotsCount ??
    property?.inventory?.available;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number) && number >= 0
    ? number
    : null;
};

const getPostedDate = (property) => {
  const value = property?.publishedAt || property?.createdAt;

  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatPostedDate = (date, now) => {
  if (!date) return null;

  const difference = Math.max(0, now - date.getTime());

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
   OUTSIDE CLICK HOOK
===================================================== */

const useDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, setOpen, ref };
};

/* =====================================================
   CUSTOM PLOTBASE DROPDOWN

   Replaces native blue-highlighted select menus.
===================================================== */

const PlotbaseDropdown = ({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  width = "min-w-[140px]",
  align = "left",
}) => {
  const { open, setOpen, ref } = useDropdown();

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={label}
        className={`
          flex h-9 items-center justify-between gap-2
          rounded-md border border-zinc-200
          bg-white px-3 text-xs font-medium text-zinc-700
          transition-colors hover:border-zinc-300
          hover:bg-zinc-50
          focus:outline-none focus:ring-2 focus:ring-zinc-900/10
          ${width}
          ${open ? "border-zinc-900" : ""}
        `}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon && (
            <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          )}

          <span className="truncate">
            {selected?.label || label}
          </span>
        </span>

        <HiChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`
            absolute top-full z-[60] mt-2 min-w-full
            overflow-hidden rounded-lg border border-zinc-200
            bg-white p-1.5 shadow-lg
            ${align === "right" ? "right-0" : "left-0"}
          `}
        >
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`
                    flex w-full items-center justify-between
                    gap-4 whitespace-nowrap rounded-md
                    px-3 py-2 text-left text-xs transition-colors
                    focus:outline-none focus:bg-zinc-100
                    ${
                      active
                        ? "bg-zinc-100 font-semibold text-zinc-950"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }
                  `}
                >
                  {option.label}

                  {active && (
                    <HiCheck className="h-3.5 w-3.5 shrink-0 text-zinc-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* =====================================================
   BUDGET / SIZE DROPDOWN
===================================================== */

const RangeDropdown = ({
  title,
  label,
  values,
  minValue,
  maxValue,
  onApply,
  formatValue,
}) => {
  const { open, setOpen, ref } = useDropdown();

  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");

  const active = minValue !== "" || maxValue !== "";
  const disabled = values.length === 0;

  const invalid =
    draftMin !== "" &&
    draftMax !== "" &&
    Number(draftMin) > Number(draftMax);

  const toggle = () => {
    if (disabled) return;

    if (!open) {
      setDraftMin(minValue);
      setDraftMax(maxValue);
    }

    setOpen(!open);
  };

  const apply = () => {
    if (invalid) return;

    onApply(draftMin, draftMax);
    setOpen(false);
  };

  const reset = () => {
    setDraftMin("");
    setDraftMax("");
    onApply("", "");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
        aria-label={label}
        className={`
          flex h-9 items-center gap-2 rounded-md border
          px-3 text-xs font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-zinc-900/10
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            active || open
              ? "border-zinc-900 bg-zinc-100 text-zinc-950"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }
        `}
      >
        {label}

        {active && (
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
        )}

        <HiChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="
            absolute left-0 top-full z-[60] mt-2
            w-[290px] max-w-[calc(100vw-2rem)]
            rounded-xl border border-zinc-200
            bg-white p-4 shadow-xl
          "
        >
          <h3 className="text-sm font-semibold text-zinc-950">
            {title}
          </h3>

          <p className="mt-1 text-[11px] text-zinc-500">
            Choose your preferred range.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-zinc-600">
                Minimum
              </label>

              <select
                value={draftMin}
                onChange={(event) => setDraftMin(event.target.value)}
                className="
                  h-9 w-full rounded-md border border-zinc-200
                  bg-white px-2 text-[11px] text-zinc-800
                  outline-none focus:border-zinc-900
                  focus:ring-2 focus:ring-zinc-900/10
                "
              >
                <option value="">
                  {values.length
                    ? `From ${formatValue(values[0])}`
                    : "Any"}
                </option>

                {values.map((value) => (
                  <option key={value} value={value}>
                    {formatValue(value)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-zinc-600">
                Maximum
              </label>

              <select
                value={draftMax}
                onChange={(event) => setDraftMax(event.target.value)}
                className="
                  h-9 w-full rounded-md border border-zinc-200
                  bg-white px-2 text-[11px] text-zinc-800
                  outline-none focus:border-zinc-900
                  focus:ring-2 focus:ring-zinc-900/10
                "
              >
                <option value="">Any</option>

                {values.map((value) => (
                  <option key={value} value={value}>
                    {formatValue(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {invalid && (
            <p className="mt-2 text-[11px] text-red-600">
              Minimum cannot exceed maximum.
            </p>
          )}

          <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={reset}
              className="
                h-9 flex-1 rounded-md border border-zinc-200
                text-xs font-medium text-zinc-700 hover:bg-zinc-50
              "
            >
              Reset
            </button>

            <button
              type="button"
              onClick={apply}
              disabled={invalid}
              className="
                h-9 flex-1 rounded-md bg-zinc-950
                text-xs font-medium text-white
                hover:bg-zinc-800 disabled:opacity-50
              "
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* =====================================================
   PROJECT CARD
===================================================== */

const ProjectCard = ({
  property,
  isWishlisted,
  onToggleWishlist,
  token,
  now,
  insideAdmin = false,
}) => {
  const navigate = useNavigate();
  const projectDetailsPath = insideAdmin
  ? `/admin/marketplace/${property._id}`
  : `/property/${property._id}`;

  const [imageError, setImageError] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const image = getImage(property);
  const companyName = getCompanyName(property);

  const availablePlots = getAvailablePlots(property);
  const postedDate = getPostedDate(property);

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!token) {
      navigate("/login");
      return;
    }

    if (wishlistLoading) return;

    setWishlistLoading(true);

    try {
      await onToggleWishlist(property._id);
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <article
      className="
        group flex h-full min-w-0 flex-col overflow-hidden
        rounded-xl border border-zinc-200 bg-white
        transition-all duration-200
        hover:border-zinc-300 hover:shadow-md
      "
    >
      {/* IMAGE */}

      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-100">
        <Link
          to={projectDetailsPath}
          className="absolute inset-0"
          aria-label={`Explore ${property.title || "project"}`}
        >
          {image && !imageError ? (
            <img
              src={image}
              alt={property.title || "Project image"}
              loading="lazy"
              onError={() => setImageError(true)}
              className="
                h-full w-full object-cover
                transition-transform duration-300
                group-hover:scale-[1.04]
              "
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-zinc-400">
                <HiLocationMarker className="mx-auto h-7 w-7" />

                <p className="mt-2 text-[11px]">
                  No project image
                </p>
              </div>
            </div>
          )}
        </Link>

        {/* LAND USE BADGE */}

        <span
          className="
            pointer-events-none absolute bottom-2.5 left-2.5
            rounded-md bg-white/95 px-2 py-1
            text-[10px] font-semibold text-zinc-800 shadow-sm
          "
        >
          {getLandUse(property.propertyType)}
        </span>

        {/* PRICE BADGE */}

        <span
          className="
            pointer-events-none absolute bottom-2.5 right-2.5
            rounded-md bg-white px-2 py-1
            text-[11px] font-semibold text-zinc-950 shadow-sm
          "
        >
          {getValidNumber(property.price) !== null
            ? `From ${formatCompactPrice(property.price)}`
            : "Price on Request"}
        </span>

        {/* BLACK WISHLIST HEART */}

        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={
            isWishlisted
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
          aria-pressed={isWishlisted}
          className="
            absolute right-2.5 top-2.5 z-10
            flex h-8 w-8 items-center justify-center
            rounded-full bg-white/95 shadow-sm
            transition-colors hover:bg-white
            focus:outline-none focus:ring-2 focus:ring-zinc-900/20
            disabled:cursor-wait disabled:opacity-60
          "
        >
          {isWishlisted ? (
            <HiHeart className="h-[18px] w-[18px] text-zinc-950" />
          ) : (
            <HiOutlineHeart className="h-[18px] w-[18px] text-zinc-700" />
          )}
        </button>
      </div>

      {/* CONTENT */}

      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <Link to={projectDetailsPath}>
          <h3
            className="
              line-clamp-2 text-[14px] font-semibold
              leading-5 text-zinc-950
              transition-colors hover:text-zinc-600
            "
          >
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

        <p
          className="
            mt-2 min-h-[48px] line-clamp-3
            text-[11px] leading-4 text-zinc-500
          "
        >
          {property.description ||
            "Explore this land investment opportunity and discover more about the project."}
        </p>

        {/* AVAILABILITY */}

        {availablePlots !== null && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                availablePlots > 0
                  ? "bg-emerald-500"
                  : "bg-zinc-400"
              }`}
            />

            <span className="text-[10px] font-medium text-zinc-600">
              {availablePlots > 0
                ? `${availablePlots} plots available`
                : "Sold Out"}
            </span>
          </div>
        )}

        {/* COMPANY AND DATE — SAME LINE */}

        {(companyName || postedDate) && (
          <div
            className="
              mt-auto flex min-w-0 items-center justify-between
              gap-2 border-t border-zinc-100 pt-2.5
            "
          >
            {companyName ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div
                  className="
                    flex h-6 w-6 shrink-0 items-center
                    justify-center rounded-full bg-zinc-100
                    text-[10px] font-semibold text-zinc-700
                  "
                >
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

                <time dateTime={postedDate.toISOString()}>
                  {formatPostedDate(postedDate, now)}
                </time>
              </div>
            )}
          </div>
        )}

        {/* EXPLORE BUTTON */}

        <Link
          to={projectDetailsPath}
          className="
            mt-3 flex h-8 items-center justify-center gap-1.5
            rounded-md bg-zinc-950 px-3
            text-[11px] font-medium text-white
            transition-colors hover:bg-zinc-800
          "
        >
          Explore Project

          <HiArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
};

/* =====================================================
   LOADING SKELETON
===================================================== */

const ProjectSkeleton = () => (
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
   MAIN PROPERTIES PAGE
===================================================== */

const Properties = ({ insideAdmin = false }) => {
  const { token } = useAuth();
  const location = useLocation();

  const [properties, setProperties] = useState([]);
  const [wishlistedIds, setWishlistedIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [now, setNow] = useState(() => Date.now());

  const [filters, setFilters] = useState({
    ...INITIAL_FILTERS,
  });

  /* =====================================================
     DATE TIMER
  ===================================================== */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  /* =====================================================
     FETCH PROPERTIES
  ===================================================== */

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/api/property`
      );

      const items = response.data?.properties;

      setProperties(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to fetch properties:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load projects. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  /* =====================================================
     FETCH WISHLIST
  ===================================================== */

  useEffect(() => {
    if (!token) {
      setWishlistedIds([]);
      return;
    }

    let active = true;

    const fetchWishlist = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/wishlist`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!active) return;

        const items = Array.isArray(response.data)
          ? response.data
          : [];

        setWishlistedIds(
          items
            .map((item) => item?.property?._id)
            .filter(Boolean)
            .map(String)
        );
      } catch (err) {
        console.error("Failed to fetch wishlist:", err);
      }
    };

    fetchWishlist();

    return () => {
      active = false;
    };
  }, [token]);

  /* =====================================================
     URL FILTERS
  ===================================================== */

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");

    setFilters((previous) => ({
      ...previous,
      city: params.get("city") || "",
      category: LAND_USE_OPTIONS.some(
        (option) => option.value === type
      )
        ? type
        : "all",
    }));

    setVisibleCount(INITIAL_VISIBLE);
  }, [location.search]);

  /* =====================================================
     FILTER HANDLERS
  ===================================================== */

  const updateFilter = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setVisibleCount(INITIAL_VISIBLE);
  };

  const applyRange = (minField, maxField, minimum, maximum) => {
    setFilters((previous) => ({
      ...previous,
      [minField]: minimum,
      [maxField]: maximum,
    }));

    setVisibleCount(INITIAL_VISIBLE);
  };

  const resetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    setVisibleCount(INITIAL_VISIBLE);
    setShowFilters(false);
  };

  /* =====================================================
     WISHLIST
  ===================================================== */

  const handleToggleWishlist = async (propertyId) => {
    if (!token || !propertyId) return;

    const id = String(propertyId);
    const saved = wishlistedIds.includes(id);

    try {
      if (saved) {
        await axios.delete(
          `${API_URL}/api/wishlist/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setWishlistedIds((previous) =>
          previous.filter((item) => item !== id)
        );
      } else {
        await axios.post(
          `${API_URL}/api/wishlist/${id}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setWishlistedIds((previous) =>
          [...new Set([...previous, id])]
        );
      }
    } catch (err) {
      console.error("Wishlist update failed:", err);

      window.alert(
        err.response?.data?.message ||
          "Unable to update wishlist."
      );
    }
  };

  /* =====================================================
     DYNAMIC FILTER OPTIONS
  ===================================================== */

  const priceOptions = useMemo(
    () =>
      [
        ...new Set(
          properties
            .map((property) => getValidNumber(property.price))
            .filter((value) => value !== null)
        ),
      ].sort((a, b) => a - b),
    [properties]
  );

  const sizeOptions = useMemo(
    () =>
      [
        ...new Set(
          properties
            .map(getProjectSize)
            .filter((value) => value !== null)
        ),
      ].sort((a, b) => a - b),
    [properties]
  );

  const locationOptions = useMemo(() => {
    const cities = [
      ...new Set(
        properties
          .map((property) => property.city)
          .filter(
            (city) =>
              typeof city === "string" && city.trim()
          )
      ),
    ].sort((a, b) => a.localeCompare(b));

    return [
      { label: "All Locations", value: "" },
      ...cities.map((city) => ({
        label: city,
        value: city,
      })),
    ];
  }, [properties]);

  /* =====================================================
     FILTERING AND SORTING
  ===================================================== */

  const filteredProperties = useMemo(() => {
    let results = [...properties];

    const search = filters.search.trim().toLowerCase();
    const city = filters.city.trim().toLowerCase();

    // SEARCH

    if (search) {
      results = results.filter((property) =>
        [
          property.title,
          property.description,
          property.city,
          property.district,
          property.region,
          getCompanyName(property),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    // LAND USE

    if (filters.category !== "all") {
      results = results.filter((property) => {
        const type = String(
          property.propertyType || ""
        ).toLowerCase();

        if (filters.category === "farm") {
          return type === "farm" || type === "agricultural";
        }

        return type === filters.category;
      });
    }

    // LOCATION

    if (city) {
      results = results.filter((property) =>
        [
          property.city,
          property.district,
          property.region,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(city)
      );
    }

    // BUDGET

    if (filters.minPrice !== "" || filters.maxPrice !== "") {
      results = results.filter((property) => {
        const price = getValidNumber(property.price);

        if (price === null) return false;

        if (
          filters.minPrice !== "" &&
          price < Number(filters.minPrice)
        ) {
          return false;
        }

        if (
          filters.maxPrice !== "" &&
          price > Number(filters.maxPrice)
        ) {
          return false;
        }

        return true;
      });
    }

    // SIZE

    if (filters.minSize !== "" || filters.maxSize !== "") {
      results = results.filter((property) => {
        const size = getProjectSize(property);

        if (size === null) return false;

        if (
          filters.minSize !== "" &&
          size < Number(filters.minSize)
        ) {
          return false;
        }

        if (
          filters.maxSize !== "" &&
          size > Number(filters.maxSize)
        ) {
          return false;
        }

        return true;
      });
    }

    // AVAILABILITY

    if (filters.availableOnly) {
      results = results.filter((property) => {
        const count = getAvailablePlots(property);

        return count === null || count > 0;
      });
    }

    // SORTING

    const timestamp = (property) =>
      getPostedDate(property)?.getTime() || 0;

    results.sort((a, b) => {
      switch (filters.sort) {
        case "oldest":
          return timestamp(a) - timestamp(b);

        case "priceLow":
        case "priceHigh": {
          const priceA = getValidNumber(a.price);
          const priceB = getValidNumber(b.price);

          if (priceA === null && priceB === null) return 0;
          if (priceA === null) return 1;
          if (priceB === null) return -1;

          return filters.sort === "priceLow"
            ? priceA - priceB
            : priceB - priceA;
        }

        case "nameAsc":
          return String(a.title || "").localeCompare(
            String(b.title || "")
          );

        case "nameDesc":
          return String(b.title || "").localeCompare(
            String(a.title || "")
          );

        default:
          return timestamp(b) - timestamp(a);
      }
    });

    return results;
  }, [properties, filters]);

  const visibleProperties = filteredProperties.slice(
    0,
    visibleCount
  );

  const hasMore = visibleCount < filteredProperties.length;

  const activeFilterCount = [
    filters.category !== "all",
    Boolean(filters.city),
    filters.minPrice !== "" || filters.maxPrice !== "",
    filters.minSize !== "" || filters.maxSize !== "",
    filters.availableOnly,
  ].filter(Boolean).length;

  /* =====================================================
     RENDER
  ===================================================== */

return (
  <div className={insideAdmin ? "min-h-0 bg-zinc-50" : "min-h-screen bg-zinc-50"}>
    {!insideAdmin && <Navbar />}

     <main
  className={
    insideAdmin
      ? "mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8"
      : "mx-auto w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8"
  }
>
        {/* HEADER */}

        <div className="mb-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            Find Your Next Land Investment
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Explore real estate projects across Tanzania.
          </p>
        </div>

        {/* =================================================
            TOOLBAR

            Desktop: one line
            Search: far right
            Mobile: responsive wrapping
        ================================================= */}

        <div
          className="
            relative z-20 mb-4 flex w-full flex-wrap
            items-center gap-2 border-b border-zinc-200 pb-3
            xl:flex-nowrap
          "
        >
          {/* LAND USE */}

          <PlotbaseDropdown
            label="Land Use"
            value={filters.category}
            options={LAND_USE_OPTIONS}
            onChange={(value) => updateFilter("category", value)}
            width="min-w-[136px]"
          />

          {/* LOCATION */}

          <PlotbaseDropdown
            label="Location"
            value={filters.city}
            options={locationOptions}
            onChange={(value) => updateFilter("city", value)}
            icon={HiLocationMarker}
            width="min-w-[145px] max-w-[165px]"
          />

          {/* BUDGET */}

          <RangeDropdown
            title="Budget Range (TZS)"
            label="Budget"
            values={priceOptions}
            minValue={filters.minPrice}
            maxValue={filters.maxPrice}
            formatValue={formatFullPrice}
            onApply={(min, max) =>
              applyRange("minPrice", "maxPrice", min, max)
            }
          />

          {/* SIZE */}

          <RangeDropdown
            title="Size Range (m²)"
            label="Size (m²)"
            values={sizeOptions}
            minValue={filters.minSize}
            maxValue={filters.maxSize}
            formatValue={formatSize}
            onApply={(min, max) =>
              applyRange("minSize", "maxSize", min, max)
            }
          />

          {/* FILTERS */}

          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="
              flex h-9 shrink-0 items-center gap-1.5
              rounded-md border border-zinc-200 bg-white
              px-3 text-xs font-medium text-zinc-700
              transition-colors hover:bg-zinc-50
              focus:outline-none focus:ring-2 focus:ring-zinc-900/10
            "
          >
            <HiAdjustments className="h-4 w-4" />

            Filters

            {activeFilterCount > 0 && (
              <span className="rounded-full bg-zinc-950 px-1.5 py-0.5 text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* SORT */}

          <PlotbaseDropdown
            label="Sort projects"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(value) => updateFilter("sort", value)}
            width="min-w-[135px]"
            align="right"
          />

          {/* SEARCH — ALWAYS LAST */}

          <div
            className="
              relative order-last w-full min-w-0
              sm:ml-auto sm:w-[280px]
              xl:order-none xl:ml-auto xl:w-auto xl:flex-1
            "
          >
            <HiSearch
              className="
                pointer-events-none absolute left-3 top-1/2
                h-4 w-4 -translate-y-1/2 text-zinc-400
              "
            />

            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                updateFilter("search", event.target.value)
              }
              placeholder="Search projects..."
              aria-label="Search projects"
              className="
                h-9 w-full rounded-md border border-zinc-200
                bg-white pl-9 pr-9 text-xs text-zinc-950
                outline-none placeholder:text-zinc-400
                transition-colors hover:border-zinc-300
                focus:border-zinc-900 focus:ring-2
                focus:ring-zinc-900/10
              "
            />

            {filters.search && (
              <button
                type="button"
                onClick={() => updateFilter("search", "")}
                aria-label="Clear search"
                className="
                  absolute right-2 top-1/2 flex h-6 w-6
                  -translate-y-1/2 items-center justify-center
                  rounded text-zinc-400 hover:text-zinc-950
                "
              >
                <HiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE FILTERS */}

        {activeFilterCount > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] text-zinc-500">
              Filters applied
            </span>

            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-medium text-zinc-950 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading && <ProjectSkeleton />}

        {/* ERROR */}

        {!loading && error && (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
            <HiX className="mx-auto h-8 w-8 text-zinc-400" />

            <h2 className="mt-4 text-base font-semibold text-zinc-950">
              Unable to load projects
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchProperties}
              className="
                mt-5 inline-flex h-9 items-center gap-2
                rounded-md bg-zinc-950 px-4 text-xs
                font-medium text-white hover:bg-zinc-800
              "
            >
              <HiRefresh className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY STATE */}

        {!loading &&
          !error &&
          filteredProperties.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
              <HiSearch className="mx-auto h-8 w-8 text-zinc-400" />

              <h2 className="mt-4 text-base font-semibold text-zinc-950">
                No projects found
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Try adjusting your search or filters.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="
                  mt-5 h-9 rounded-md bg-zinc-950 px-4
                  text-xs font-medium text-white hover:bg-zinc-800
                "
              >
                Clear Filters
              </button>
            </div>
          )}

        {/* PROJECT GRID */}

        {!loading &&
          !error &&
          filteredProperties.length > 0 && (
            <>
              <div
                className="
                  grid grid-cols-1 items-stretch gap-4
                  sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
                "
              >
                {visibleProperties.map((property) => (
<ProjectCard
  key={property._id}
  property={property}
  insideAdmin={insideAdmin}
  token={token}
  now={now}
                    isWishlisted={wishlistedIds.includes(
                      String(property._id)
                    )}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount(
                        (previous) => previous + LOAD_MORE_COUNT
                      )
                    }
                    className="
                      inline-flex h-9 items-center gap-2
                      rounded-md border border-zinc-200
                      bg-white px-5 text-xs font-semibold
                      text-zinc-700 hover:bg-zinc-100
                    "
                  >
                    Load More Projects

                    <HiArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
      </main>

      {/* =================================================
          ADVANCED FILTERS DRAWER
      ================================================= */}

      {showFilters && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setShowFilters(false)}
            className="absolute inset-0 bg-black/40"
          />

          {/* DRAWER */}

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Advanced filters"
            className="
              relative flex h-full w-full max-w-sm
              flex-col bg-white shadow-2xl
            "
          >
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  Advanced Filters
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Refine your project search
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="
                  flex h-8 w-8 items-center justify-center
                  rounded-md text-zinc-500 hover:bg-zinc-100
                "
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            {/* CONTENT */}

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
              {/* LAND USE */}

              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-800">
                  Land Use
                </label>

                <div className="space-y-1.5">
                  {LAND_USE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateFilter("category", option.value)
                      }
                      className={`
                        flex w-full items-center justify-between
                        rounded-md border px-3 py-2.5
                        text-left text-xs transition-colors
                        ${
                          filters.category === option.value
                            ? "border-zinc-900 bg-zinc-100 font-semibold text-zinc-950"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }
                      `}
                    >
                      {option.label}

                      {filters.category === option.value && (
                        <HiCheck className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* LOCATION */}

              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-800">
                  Location
                </label>

                <select
                  value={filters.city}
                  onChange={(event) =>
                    updateFilter("city", event.target.value)
                  }
                  className="
                    h-9 w-full rounded-md border border-zinc-200
                    bg-white px-3 text-xs text-zinc-800
                    outline-none focus:border-zinc-900
                    focus:ring-2 focus:ring-zinc-900/10
                  "
                >
                  {locationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* AVAILABILITY */}

              <div>
                <h3 className="mb-3 text-xs font-semibold text-zinc-800">
                  Availability
                </h3>

                <label
                  className="
                    flex cursor-pointer items-center gap-3
                    rounded-md border border-zinc-200 p-3
                  "
                >
                  <input
                    type="checkbox"
                    checked={filters.availableOnly}
                    onChange={(event) =>
                      updateFilter(
                        "availableOnly",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-zinc-950"
                  />

                  <div>
                    <p className="text-xs font-medium text-zinc-800">
                      Available Projects Only
                    </p>

                    <p className="mt-1 text-[11px] text-zinc-500">
                      Exclude projects known to have no available plots.
                    </p>
                  </div>
                </label>
              </div>

              {/* INFORMATION */}

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs leading-5 text-zinc-500">
                  You can adjust your budget and preferred plot size
                  directly from the main toolbar.
                </p>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex gap-3 border-t border-zinc-200 p-5">
              <button
                type="button"
                onClick={resetFilters}
                className="
                  h-10 flex-1 rounded-md border border-zinc-200
                  text-xs font-medium text-zinc-700 hover:bg-zinc-50
                "
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="
                  h-10 flex-1 rounded-md bg-zinc-950
                  text-xs font-medium text-white hover:bg-zinc-800
                "
              >
                Show Projects
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;