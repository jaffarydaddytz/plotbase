import { Mail, Phone, MessageSquare } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/common/Navbar";

const Contact = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pt-[60px]">
      {user?.role !== "seller" && <Navbar />}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-12">

        {/* PAGE HEADER */}
        <div className="mb-8 text-center">

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600">
            <MessageSquare className="h-3.5 w-3.5" />
            Contact Plotbase
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Get in touch
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
            Questions about land investment, company registration,
            or Plotbase? We're here to help.
          </p>

        </div>

        {/* CONTACT INFORMATION CARD */}
        <div className="mx-auto w-full max-w-md">

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">

            {/* Card Header */}
            <h2 className="text-base font-semibold text-zinc-900">
              Contact information
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Reach our team through the following channels.
            </p>

            <div className="mt-6 space-y-5">

              {/* EMAIL SUPPORT */}
              <div className="flex items-start gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Mail className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-medium text-zinc-500">
                    Email support
                  </p>

                  <a
                    href="mailto:Support@plotbase.co.tz"
                    className="mt-1 block break-all text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-600 hover:underline"
                  >
                    Support@plotbase.co.tz
                  </a>

                  <p className="mt-1 text-xs text-zinc-400">
                    General inquiries and assistance
                  </p>

                </div>

              </div>

              {/* DIVIDER */}
              <div className="border-t border-zinc-100" />

              {/* PHONE SUPPORT */}
              <div className="flex items-start gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Phone className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-medium text-zinc-500">
                    Phone support
                  </p>

                  <a
                    href="tel:+255785907500"
                    className="mt-1 block text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-600 hover:underline"
                  >
                    +255 785 907 500
                  </a>

                  <p className="mt-1 text-xs text-zinc-400">
                    Speak directly with our team
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
};

export default Contact;