import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import {
  Building2,
  ArrowRight,
  Plus,
  ClipboardList,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import { useAuth } from "../../context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import API_URL from "../../config";

const STATUS_STYLES = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  SUSPENDED: "bg-orange-50 text-orange-700",
};

const CompanyCenter = () => {
  const { token } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Please sign in to access your Company Center.");
      return;
    }

    const controller = new AbortController();

    const fetchApplications = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(
          `${API_URL}/api/companies/my-applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (
          !response.data?.success ||
          !Array.isArray(response.data.applications)
        ) {
          throw new Error("Unable to retrieve company applications.");
        }

        if (!controller.signal.aborted) {
          setApplications(response.data.applications);
        }
      } catch (err) {
        if (controller.signal.aborted || axios.isCancel(err)) {
          return;
        }

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load company information."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchApplications();

    return () => controller.abort();
  }, [token]);

  return (
    <div className="min-h-dvh bg-zinc-50 pt-[60px]">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* PAGE HEADER */}

        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Company Center
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage your real estate company applications and
            business activities on Plotbase.
          </p>
        </div>

        {/* LOADING */}

        {loading ? (
          <div
            role="status"
            aria-label="Loading Company Center"
            className="space-y-4"
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-4 w-64 max-w-full" />
              <Skeleton className="mt-3 h-4 w-48" />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-4 h-10 w-full" />
            </div>
          </div>
        ) : (
          <>
            {/* ERROR MESSAGE */}

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* COMPANY APPLICATIONS */}

            {!error && applications.length > 0 && (
              <section className="mb-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950">
                      My Companies
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      Track your company registration and verification.
                    </p>
                  </div>

                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                    {applications.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {applications.map((company) => {
                    const status =
                      company.verificationStatus || "DRAFT";

                    return (
                      <Link
                        key={company.id || company._id}
                        to="/company/applications"
                        className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                            <Building2
                              size={19}
                              className="text-zinc-600"
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-950">
                              {company.name}
                            </p>

                            <span
                              className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                STATUS_STYLES[status] ||
                                STATUS_STYLES.DRAFT
                              }`}
                            >
                              {status === "PENDING"
                                ? "Pending Verification"
                                : status}
                            </span>
                          </div>
                        </div>

                        <ArrowRight
                          size={17}
                          className="shrink-0 text-zinc-400"
                        />
                      </Link>
                    );
                  })}
                </div>

                <Link
                  to="/company/applications"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:underline"
                >
                  <ClipboardList size={16} />
                  View All Applications
                  <ArrowRight size={15} />
                </Link>
              </section>
            )}

            {/* NO APPLICATIONS */}

            {!error && applications.length === 0 && (
              <section className="mb-5 rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                  <Building2 size={22} className="text-zinc-600" />
                </div>

                <h2 className="mt-4 text-base font-semibold text-zinc-950">
                  No Companies Yet
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  If you represent a registered real estate company,
                  you can apply to join Plotbase and list projects
                  after verification.
                </p>

                <Link
                  to="/company/register"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Register a Company
                </Link>
              </section>
            )}

            {/* REGISTER ANOTHER COMPANY */}

            {!error && applications.length > 0 && (
              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-950">
                      Register Another Company
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      Submit an application for another real estate company.
                    </p>
                  </div>

                  <Link
                    to="/company/register"
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
                  >
                    <Plus size={15} />
                    Register Company
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CompanyCenter;