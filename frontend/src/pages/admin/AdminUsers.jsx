import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";

import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineTrash,
  HiOutlineUsers,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlineShieldCheck,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
  HiCheck,
} from "react-icons/hi";

/* =====================================================
   CONFIGURATION
===================================================== */

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

/* =====================================================
   HELPERS
===================================================== */

const getUserId = (user) => String(user?._id || user?.id || "");

const getInitials = (name) => {
  if (!name) return "U";

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getRoleLabel = (role) => {
  const labels = {
    investor: "Investor",
    buyer: "Buyer (Legacy)",
    seller: "Seller (Legacy)",
    admin: "Administrator",
    COMPANY_ADMIN: "Company Admin",
    MANAGER: "Manager",
    SALES_OFFICER: "Sales Officer",
    ACCOUNTANT: "Accountant",
    FIELD_OFFICER: "Field Officer",
    TITLE_DEED_OFFICER: "Title Deed Officer",
  };

  return (
    labels[role] ||
    String(role || "Unknown")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const formatRegisteredDate = (dateValue) => {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getRegistrationTimestamp = (user) => {
  const timestamp = new Date(user?.createdAt || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

/* =====================================================
   CUSTOM PLOTBASE DROPDOWN

   White panel
   Black selected option
   White selected text
   No browser-blue option highlight
===================================================== */

const PlotbaseDropdown = ({
  value,
  onChange,
  options,
  ariaLabel,
  widthClass = "min-w-[145px]",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption =
    options.find((option) => option.value === value) ||
    options[0];

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`relative shrink-0 ${widthClass}`}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={`flex h-9 w-full items-center justify-between gap-3 rounded-md border px-3 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-900/10 ${
          open
            ? "border-zinc-950 bg-zinc-950 text-white"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
        }`}
      >
        <span className="truncate">{selectedOption?.label}</span>

        <HiChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-1.5 max-h-64 w-max min-w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
        >
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-5 rounded-md px-3 py-2 text-left text-xs transition ${
                  selected
                    ? "bg-zinc-950 font-medium text-white"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                <span className="whitespace-nowrap">
                  {option.label}
                </span>

                {selected && <HiCheck className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* =====================================================
   STATUS BADGE
===================================================== */

const StatusBadge = ({ blocked }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${
      blocked
        ? "border-zinc-300 bg-zinc-200 text-zinc-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-700"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        blocked ? "bg-zinc-600" : "bg-emerald-500"
      }`}
    />

    {blocked ? "Suspended" : "Active"}
  </span>
);

/* =====================================================
   ROLE BADGE
===================================================== */

const RoleBadge = ({ role }) => {
  const isAdmin = role === "admin";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium ${
        isAdmin
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-zinc-100 text-zinc-700"
      }`}
    >
      {isAdmin && (
        <HiOutlineShieldCheck className="mr-1 h-3.5 w-3.5" />
      )}

      {getRoleLabel(role)}
    </span>
  );
};

/* =====================================================
   LOADING SKELETON
===================================================== */

const TableSkeleton = () => (
  <div>
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-4 border-b border-zinc-100 px-4 py-4"
      >
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-zinc-200" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-36 animate-pulse rounded bg-zinc-200" />
          <div className="h-2.5 w-24 animate-pulse rounded bg-zinc-100" />
        </div>

        <div className="hidden h-6 w-20 animate-pulse rounded bg-zinc-100 sm:block" />
        <div className="hidden h-3 w-32 animate-pulse rounded bg-zinc-100 md:block" />
        <div className="hidden h-3 w-24 animate-pulse rounded bg-zinc-100 lg:block" />
        <div className="h-7 w-16 animate-pulse rounded bg-zinc-100" />
      </div>
    ))}
  </div>
);

/* =====================================================
   CONFIRMATION DIALOG
===================================================== */

const ConfirmDialog = ({
  user,
  action,
  loading,
  onCancel,
  onConfirm,
}) => {
  if (!user || !action) return null;

  const isDelete = action === "delete";

  const title = isDelete
    ? "Delete user?"
    : user.isBlocked
      ? "Unblock user?"
      : "Block user?";

  const description = isDelete
    ? `Are you sure you want to permanently delete ${
        user.name || "this user"
      }? This action cannot be undone.`
    : user.isBlocked
      ? `Restore account access for ${user.name || "this user"}?`
      : `Block ${user.name || "this user"} from accessing Plotbase?`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        aria-describedby="confirm-action-description"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
            {isDelete ? (
              <HiOutlineTrash className="h-5 w-5 text-zinc-900" />
            ) : (
              <HiOutlineLockClosed className="h-5 w-5 text-zinc-900" />
            )}
          </div>

          <div className="min-w-0">
            <h2
              id="confirm-action-title"
              className="text-base font-semibold text-zinc-950"
            >
              {title}
            </h2>

            <p
              id="confirm-action-description"
              className="mt-1 text-xs leading-5 text-zinc-500"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-9 rounded-md border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {loading
              ? "Processing..."
              : isDelete
                ? "Delete User"
                : user.isBlocked
                  ? "Unblock User"
                  : "Block User"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

const AdminUsers = () => {
  const { token, user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Registered date: newest first by default.
  const [registeredSort, setRegisteredSort] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedAction, setSelectedAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUserId = getUserId(currentUser);

  /* =====================================================
     FETCH USERS
  ===================================================== */

  const fetchUsers = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!token) {
        setUsers([]);
        setLoading(false);
        setError("Authentication is required.");
        return false;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await axios.get(
          `${API_URL}/api/admin/users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal,
          }
        );

        if (signal?.aborted) return false;

        const data = response.data;

        if (data?.success === false) {
          throw new Error(data.message || "Failed to load users.");
        }

        const received = Array.isArray(data)
          ? data
          : data?.users;

        if (!Array.isArray(received)) {
          throw new Error("Unexpected users API response.");
        }

        setUsers(received);
        return true;
      } catch (err) {
        if (axios.isCancel(err) || signal?.aborted) {
          return false;
        }

        console.error("Failed to fetch users:", err);

        setError(
          getErrorMessage(err, "Unable to load platform users.")
        );

        return false;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchUsers({ signal: controller.signal });

    return () => controller.abort();
  }, [fetchUsers]);

  /* =====================================================
     ROLE OPTIONS
  ===================================================== */

  const roleOptions = useMemo(() => {
    const roles = [
      ...new Set(
        users.map((user) => user.role).filter(Boolean)
      ),
    ].sort((a, b) =>
      getRoleLabel(a).localeCompare(getRoleLabel(b))
    );

    return [
      { value: "all", label: "All Roles" },
      ...roles.map((role) => ({
        value: role,
        label: getRoleLabel(role),
      })),
    ];
  }, [users]);

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "blocked", label: "Suspended" },
  ];

  const registeredSortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
  ];

  /* =====================================================
     FILTER AND SORT USERS
  ===================================================== */

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = users.filter((user) => {
      const matchesSearch =
        !query ||
        [user.name, user.email, user.phone, getUserId(user)]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );

      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !user.isBlocked) ||
        (statusFilter === "blocked" && user.isBlocked);

      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort a copy, never mutate the original fetched users.
    return [...filtered].sort((a, b) => {
      const aTime = getRegistrationTimestamp(a);
      const bTime = getRegistrationTimestamp(b);

      // Unknown dates always appear last.
      if (aTime === null && bTime === null) {
        return getUserId(a).localeCompare(getUserId(b));
      }

      if (aTime === null) return 1;
      if (bTime === null) return -1;

      const difference =
        registeredSort === "oldest"
          ? aTime - bTime
          : bTime - aTime;

      return (
        difference ||
        getUserId(a).localeCompare(getUserId(b))
      );
    });
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
    registeredSort,
  ]);

  /* =====================================================
     PAGINATION
  ===================================================== */

  const totalUsers = filteredUsers.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalUsers / pageSize)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalUsers);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(startIndex, endIndex),
    [filteredUsers, startIndex, endIndex]
  );

  const goToPage = (page) => {
    setCurrentPage(
      Math.max(1, Math.min(page, totalPages))
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    roleFilter,
    statusFilter,
    registeredSort,
    pageSize,
  ]);

  const visiblePageNumbers = useMemo(() => {
    const pages = [];

    for (let page = 1; page <= totalPages; page++) {
      if (
        totalPages <= 7 ||
        page === 1 ||
        page === totalPages ||
        Math.abs(page - safeCurrentPage) <= 1
      ) {
        pages.push(page);
      }
    }

    return pages;
  }, [totalPages, safeCurrentPage]);

  /* =====================================================
     FILTER ACTIONS
  ===================================================== */

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setRegisteredSort("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    registeredSort !== "newest";

  /* =====================================================
     USER ACTIONS
  ===================================================== */

  const requestAction = (targetUser, action) => {
    const targetId = getUserId(targetUser);

    if (!targetId) {
      setError("Invalid user account.");
      return;
    }

    if (currentUserId && targetId === currentUserId) {
      setError("You cannot modify your own account here.");
      return;
    }

    setError("");
    setSuccess("");

    setSelectedAction({
      user: targetUser,
      action,
    });
  };

  const confirmAction = async () => {
    if (!selectedAction || actionLoading || !token) return;

    const { user: targetUser, action } = selectedAction;
    const id = getUserId(targetUser);

    if (!id) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      if (action === "delete") {
        const response = await axios.delete(
          `${API_URL}/api/admin/users/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.success === false) {
          throw new Error(
            response.data?.message || "Unable to delete user."
          );
        }

        setUsers((previous) =>
          previous.filter((item) => getUserId(item) !== id)
        );

        setSuccess("User deleted successfully.");
      } else {
        const response = await axios.patch(
          `${API_URL}/api/admin/users/${id}/block`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.success === false) {
          throw new Error(
            response.data?.message ||
              "Unable to update account status."
          );
        }

        // Refresh to obtain authoritative account status.
        const refreshed = await fetchUsers({ silent: true });

        if (!refreshed) {
          setError(
            "Account status was changed, but the user list could not be refreshed."
          );
        } else {
          setSuccess(
            targetUser.isBlocked
              ? "User unblocked successfully."
              : "User blocked successfully."
          );
        }
      }

      setSelectedAction(null);
    } catch (err) {
      console.error("User management action failed:", err);

      setError(
        getErrorMessage(err, "Unable to complete this action.")
      );

      setSelectedAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            User Management
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Monitor platform users and manage account access.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2">
          <HiOutlineUsers className="h-4 w-4 text-zinc-500" />

          <span className="text-xs font-medium text-zinc-600">
            Total Users
          </span>

          <span className="text-sm font-semibold text-zinc-950">
            {users.length}
          </span>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <HiOutlineExclamationCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

            <p className="text-xs leading-5 text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="text-red-600 hover:text-red-800"
          >
            <HiOutlineX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <HiOutlineCheckCircle className="h-4 w-4 text-zinc-900" />

            <p className="text-xs font-medium text-zinc-700">
              {success}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss notification"
            className="text-zinc-500 hover:text-zinc-900"
          >
            <HiOutlineX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* USERS CARD */}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {/* CARD HEADER */}

        <div className="border-b border-zinc-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">
                Platform Users
              </h2>

              <p className="mt-1 text-[11px] text-zinc-500">
                Manage registered users and their account permissions.
              </p>
            </div>

            <span className="text-[11px] font-medium text-zinc-500">
              {loading
                ? "Loading users..."
                : `Showing ${filteredUsers.length} of ${users.length}`}
            </span>
          </div>

          {/* FILTER TOOLBAR */}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* ROLE FILTER */}

            <PlotbaseDropdown
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleOptions}
              ariaLabel="Filter by role"
              widthClass="min-w-[140px]"
            />

            {/* STATUS FILTER */}

            <PlotbaseDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              ariaLabel="Filter by account status"
              widthClass="min-w-[145px]"
            />

            {/* REGISTERED SORT */}

            <PlotbaseDropdown
              value={registeredSort}
              onChange={setRegisteredSort}
              options={registeredSortOptions}
              ariaLabel="Sort by registration date"
              widthClass="min-w-[140px]"
            />

            {/* REFRESH */}

            <button
              type="button"
              onClick={() => fetchUsers({ silent: true })}
              disabled={loading || refreshing}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              <HiOutlineRefresh
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              Refresh
            </button>

            {/* CLEAR FILTERS */}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 text-[11px] font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
              >
                Clear filters
              </button>
            )}

            {/* SEARCH — FAR RIGHT */}

            <div className="relative ml-auto w-full min-w-0 sm:w-[245px] xl:w-[280px]">
              <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search users..."
                aria-label="Search users"
                className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          </div>
        </div>

        {/* TABLE */}

        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-zinc-50">
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    User
                  </th>

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Role
                  </th>

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Contact
                  </th>

                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Registered
                  </th>

                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => {
                    const id = getUserId(user);

                    const isCurrentUser =
                      Boolean(currentUserId) &&
                      id === currentUserId;

                    return (
                      <tr
                        key={id}
                        className="transition-colors hover:bg-zinc-50/80"
                      >
                        {/* USER */}

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700">
                              {user.profilePic ? (
                                <img
                                  src={user.profilePic}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(user.name)
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="max-w-[220px] truncate text-xs font-semibold text-zinc-900">
                                  {user.name || "Unknown User"}
                                </span>

                                {isCurrentUser && (
                                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
                                    You
                                  </span>
                                )}
                              </div>

                              <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                                ID: {id.slice(-8).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* ROLE */}

                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* CONTACT */}

                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-700">
                              <HiOutlineMail className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                              <span className="max-w-[230px] truncate">
                                {user.email || "Not provided"}
                              </span>
                            </div>

                            {user.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <HiOutlinePhone className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">
                          <StatusBadge blocked={user.isBlocked} />
                        </td>

                        {/* REGISTERED DATE */}

                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="text-[11px] font-medium text-zinc-600">
                            {formatRegisteredDate(user.createdAt)}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* BLOCK / UNBLOCK */}

                            <button
                              type="button"
                              onClick={() =>
                                requestAction(user, "block")
                              }
                              disabled={isCurrentUser || actionLoading}
                              title={
                                isCurrentUser
                                  ? "You cannot modify your own account"
                                  : user.isBlocked
                                    ? "Unblock user"
                                    : "Block user"
                              }
                              aria-label={
                                user.isBlocked
                                  ? `Unblock ${user.name}`
                                  : `Block ${user.name}`
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {user.isBlocked ? (
                                <HiOutlineLockOpen className="h-4 w-4" />
                              ) : (
                                <HiOutlineLockClosed className="h-4 w-4" />
                              )}
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                requestAction(user, "delete")
                              }
                              disabled={isCurrentUser || actionLoading}
                              title={
                                isCurrentUser
                                  ? "You cannot delete your own account"
                                  : "Delete user"
                              }
                              aria-label={`Delete ${user.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                        <HiOutlineUsers className="h-6 w-6 text-zinc-400" />
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                        No users found
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        Try adjusting your search or filters.
                      </p>

                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-4 rounded-md bg-zinc-950 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}

        {!loading && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] text-zinc-500">
                {totalUsers === 0
                  ? "Showing 0 users"
                  : `Showing ${startIndex + 1}–${endIndex} of ${totalUsers} users`}
              </p>

              {/* ROWS PER PAGE — ALSO CUSTOM */}

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">
                  Rows
                </span>

                <PlotbaseDropdown
                  value={String(pageSize)}
                  onChange={(value) => setPageSize(Number(value))}
                  options={PAGE_SIZE_OPTIONS.map((size) => ({
                    value: String(size),
                    label: String(size),
                  }))}
                  ariaLabel="Rows per page"
                  widthClass="min-w-[72px]"
                />
              </div>
            </div>

            <nav
              aria-label="Users pagination"
              className="flex items-center gap-1"
            >
              {/* PREVIOUS */}

              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                aria-label="Previous page"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <HiChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              {/* PAGE NUMBERS */}

              {visiblePageNumbers.map((page, index) => (
                <div key={page} className="flex items-center gap-1">
                  {index > 0 &&
                    page - visiblePageNumbers[index - 1] > 1 && (
                      <span className="px-1 text-xs text-zinc-400">
                        ...
                      </span>
                    )}

                  <button
                    type="button"
                    onClick={() => goToPage(page)}
                    aria-current={
                      page === safeCurrentPage
                        ? "page"
                        : undefined
                    }
                    className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[11px] font-medium transition ${
                      page === safeCurrentPage
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {page}
                  </button>
                </div>
              ))}

              {/* NEXT */}

              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                aria-label="Next page"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <HiChevronRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* CONFIRM ACTION */}

      {selectedAction && (
        <ConfirmDialog
          user={selectedAction.user}
          action={selectedAction.action}
          loading={actionLoading}
          onCancel={() => {
            if (!actionLoading) {
              setSelectedAction(null);
            }
          }}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
};

export default AdminUsers;