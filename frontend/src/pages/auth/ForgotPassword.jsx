import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import API_URL from "../../config";
import Navbar from "../../components/common/Navbar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading) return;

    setError("");
    setSuccess(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email: normalizedEmail,
      });

      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process your request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/50">
              {success ? (
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              ) : (
                <Mail className="h-7 w-7" />
              )}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              {success ? "Check your email" : "Forgot password?"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {success
                ? "If an account exists with this email, we've sent instructions to reset your password."
                : "No worries. Enter your email address and we'll send you a password reset link."}
            </p>
          </div>

          {/* Main Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">

            {success ? (
              <div className="space-y-5">

                <div
                  role="status"
                  className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                      <p className="font-semibold">
                        Request received
                      </p>

                      <p className="mt-1 leading-6">
                        Please check your inbox and spam folder.
                        Reset links expire after 15 minutes.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSuccess(false);
                    setError("");
                  }}
                >
                  Try another email
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>

              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="forgot-email"
                    className="text-sm font-medium"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError("");
                      }}
                      autoComplete="email"
                      required
                      disabled={isLoading}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Back to Login */}
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>

              </form>
            )}

          </div>

          {/* Security Note */}
          <div className="mt-6 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" />

            <p>
              For your security, password reset links expire
              after 15 minutes.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;