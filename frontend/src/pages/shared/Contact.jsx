import { useEffect, useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import API_URL from "../../config";
import Navbar from "../../components/common/Navbar";

import {
  HiOutlineAnnotation,
  HiOutlineCheckCircle,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineUser,
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineShieldCheck,
  HiCheckCircle,
} from "react-icons/hi";

/* =====================================================
   INITIAL FORM DATA
===================================================== */

const getInitialFormData = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  message: "",
  role: user?.role || "buyer",
});

/* =====================================================
   CONTACT PAGE
===================================================== */

const Contact = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState(() =>
    getInitialFormData(user)
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     PREFILL USER INFORMATION
  ===================================================== */

  useEffect(() => {
    if (!user) return;

    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.name || "",
      email: prev.email || user.email || "",
      phone: prev.phone || user.phone || "",
      role: user.role || "buyer",
    }));
  }, [user]);

  /* =====================================================
     HANDLE INPUT CHANGES
  ===================================================== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError("");
  };

  /* =====================================================
     SUBMIT CONTACT FORM
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      message: formData.message.trim(),
      role: user?.role || "buyer",
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.phone ||
      !payload.message
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${API_URL}/api/contact`,
        payload
      );

      if (res.data?.success) {
        setSuccess(true);

        setFormData((prev) => ({
          ...prev,
          message: "",
        }));
      } else {
        setError(
          res.data?.message ||
            "Unable to send your message. Please try again."
        );
      }
    } catch (err) {
      console.error("Contact form submission failed:", err);

      setError(
        err.response?.data?.message ||
          "Failed to send your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SHARED INPUT STYLES
  ===================================================== */

  const inputClass =
    "w-full h-9 rounded-md border border-zinc-200 bg-white px-3 " +
    "text-sm text-zinc-900 placeholder:text-zinc-400 outline-none " +
    "transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 " +
    "disabled:cursor-not-allowed disabled:bg-zinc-50";

  const labelClass =
    "mb-1.5 block text-xs font-medium text-zinc-700";

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pt-[60px]">
      {user?.role !== "seller" && <Navbar />}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-8">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600">
            <HiOutlineAnnotation className="h-3.5 w-3.5" />
            Contact Plotbase
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Get in touch
          </h1>

          <p className="mx-auto mt-1.5 max-w-lg text-sm leading-5 text-zinc-500">
            Questions about land investment, company registration,
            or Plotbase? We're here to help.
          </p>
        </div>

        {/* =====================================================
            MAIN TWO-COLUMN LAYOUT
        ===================================================== */}

        <div className="grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">

          {/* =====================================================
              LEFT COLUMN
          ===================================================== */}

          <div className="space-y-4">

            {/* CONTACT INFORMATION */}

            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">

              <h2 className="text-base font-semibold text-zinc-900">
                Contact information
              </h2>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Reach our team through the following channels.
              </p>

              <div className="mt-4 space-y-4">

                {/* EMAIL SUPPORT */}

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                    <HiOutlineMail className="h-[18px] w-[18px]" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-500">
                      Email support
                    </p>

                    <a
                      href="mailto:Support@plotbase.co.tz"
                      className="mt-0.5 block break-all text-sm font-medium text-zinc-900 hover:underline"
                    >
                      Support@plotbase.co.tz
                    </a>

                    <p className="mt-0.5 text-xs text-zinc-400">
                      General inquiries and assistance
                    </p>
                  </div>
                </div>

                {/* DIVIDER */}

                <div className="border-t border-zinc-100" />

                {/* PHONE SUPPORT */}

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                    <HiOutlinePhone className="h-[18px] w-[18px]" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-500">
                      Phone support
                    </p>

                    <a
                      href="tel:+255785907500"
                      className="mt-0.5 block text-sm font-medium text-zinc-900 hover:underline"
                    >
                      +255 785 907 500
                    </a>

                    <p className="mt-0.5 text-xs text-zinc-400">
                      Speak directly with our team
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* =====================================================
                HOW CAN WE HELP?
            ===================================================== */}

            <div className="rounded-xl border border-zinc-200 bg-white p-4">

              <div className="flex items-start gap-3">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
                  <HiOutlineInformationCircle className="h-[18px] w-[18px]" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    How can we help?
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Get assistance with property listings,
                    land investments, company registration,
                    account access, and technical support.
                  </p>
                </div>
              </div>
            </div>

            {/* =====================================================
                SUPPORT COMMITMENT — BLACK CARD
            ===================================================== */}


            <div className="rounded-xl border border-zinc-200 bg-white p-4">

              <div className="flex items-start gap-3">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
                  <HiOutlineShieldCheck className="h-[18px] w-[18px]" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Our Support Commitment
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
            At Plotbase, we are committed to making land investment more accessible, transparent, and convenient. 
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* =====================================================
              RIGHT COLUMN — CONTACT FORM
          ===================================================== */}

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">

            {success ? (

              /* SUCCESS STATE */

              <div
                role="status"
                aria-live="polite"
                className="flex min-h-[300px] flex-col items-center justify-center text-center"
              >

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <HiOutlineCheckCircle className="h-8 w-8 text-emerald-600" />
                </div>

                <h2 className="mt-4 text-lg font-semibold text-zinc-900">
                  Message sent successfully
                </h2>

                <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                  Thank you for contacting Plotbase.
                  We've received your message and will
                  get back to you soon.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setError("");
                  }}
                  className="mt-5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800"
                >
                  Send another message
                </button>

              </div>

            ) : (

              <>
                {/* FORM HEADER */}

                <div className="mb-5">
                  <h2 className="text-base font-semibold text-zinc-900">
                    Send us a message
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Fill in the details below and we'll get back to you.
                  </p>
                </div>

                {/* CONTACT FORM */}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-3.5"
                >

                  {/* NAME AND EMAIL */}

                  <div className="grid gap-3 sm:grid-cols-2">

                    {/* FULL NAME */}

                    <div>
                      <label
                        htmlFor="contact-name"
                        className={labelClass}
                      >
                        Full name{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <HiOutlineUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                        <input
                          id="contact-name"
                          type="text"
                          name="name"
                          required
                          maxLength={120}
                          autoComplete="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your full name"
                          disabled={loading}
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    {/* EMAIL */}

                    <div>
                      <label
                        htmlFor="contact-email"
                        className={labelClass}
                      >
                        Email address{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <HiOutlineMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                        <input
                          id="contact-email"
                          type="email"
                          name="email"
                          required
                          maxLength={254}
                          autoComplete="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          disabled={loading}
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                  </div>

                  {/* PHONE NUMBER */}

                  <div>
                    <label
                      htmlFor="contact-phone"
                      className={labelClass}
                    >
                      Phone number{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <HiOutlinePhone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                      <input
                        id="contact-phone"
                        type="tel"
                        name="phone"
                        required
                        maxLength={25}
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+255 700 000 000"
                        disabled={loading}
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>

                  {/* MESSAGE */}

                  <div>
                    <label
                      htmlFor="contact-message"
                      className={labelClass}
                    >
                      Message{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      maxLength={3000}
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help..."
                      disabled={loading}
                      className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-5 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50"
                    />

                    <p className="mt-1 text-right text-[11px] text-zinc-400">
                      {formData.message.length}/3000
                    </p>
                  </div>

                  {/* ERROR MESSAGE */}

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                    >
                      <HiOutlineExclamationCircle className="mt-0.5 h-4 w-4 shrink-0" />

                      <span>{error}</span>
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send message
                        <HiOutlineArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* PRIVACY NOTICE */}

                  <p className="text-center text-[11px] text-zinc-400">
                    Please don't share passwords or sensitive
                    financial information.
                  </p>

                </form>
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Contact;