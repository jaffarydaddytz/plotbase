import { Link, useLocation } from "react-router-dom";

import {
  ArrowLeft,
  Construction,
  Building2,
  MapPinned,
  CreditCard,
  Handshake,
  ScrollText,
  Settings,
} from "lucide-react";

// =====================================================
// PLANNED ADMIN MODULES
// =====================================================

const MODULES = {
  "/admin/companies": {
    title: "Company Management",
    description:
      "Manage registered real estate companies, their verification status, and organizational information.",
    icon: Building2,
  },

  "/admin/projects": {
    title: "Project Management",
    description:
      "Monitor and manage real estate projects submitted by approved companies.",
    icon: MapPinned,
  },

  "/admin/payments": {
    title: "Payment Management",
    description:
      "Monitor platform payment activities, transactions, and payment records.",
    icon: CreditCard,
  },

  "/admin/investment-partners": {
    title: "Investment Partners",
    description:
      "Manage investment partner records and platform partnerships.",
    icon: Handshake,
  },

  "/admin/audit-logs": {
    title: "Audit Logs",
    description:
      "Review administrative activities and important platform events.",
    icon: ScrollText,
  },

  "/admin/settings": {
    title: "Platform Settings",
    description:
      "Configure platform-level preferences and administrative settings.",
    icon: Settings,
  },
};

// =====================================================
// COMING SOON PAGE
// =====================================================

const AdminComingSoon = () => {
  const { pathname } = useLocation();

  const module = MODULES[pathname];

  if (!module) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-8">
        <h1 className="text-lg font-semibold text-zinc-950">
          Admin module unavailable
        </h1>

        <Link
          to="/admin-dashboard"
          className="mt-4 inline-flex text-sm font-medium text-zinc-700 underline"
        >
          Back to Overview
        </Link>
      </section>
    );
  }

  const Icon = module.icon;

  return (
    <section className="space-y-6">

      {/* PAGE HEADING */}

      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
          {module.title}
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Plotbase Platform Administration
        </p>
      </div>

      {/* COMING SOON CARD */}

      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-12">

        <div className="mx-auto w-full max-w-md text-center">

          {/* ICON */}

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
            <Icon
              size={25}
              strokeWidth={1.6}
              className="text-zinc-700"
            />
          </div>

          {/* STATUS */}

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">

            <Construction
              size={13}
              className="text-zinc-500"
            />

            <span className="text-xs font-medium text-zinc-600">
              In Development
            </span>

          </div>

          {/* TITLE */}

          <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">
            Coming Soon
          </h2>

          {/* DESCRIPTION */}

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {module.description}
          </p>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            This module is planned for a future phase
            of Plotbase development.
          </p>

          {/* RETURN BUTTON */}

          <Link
            to="/admin-dashboard"
            className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <ArrowLeft size={16} />
            Back to Overview
          </Link>

        </div>

      </div>

    </section>
  );
};

export default AdminComingSoon;