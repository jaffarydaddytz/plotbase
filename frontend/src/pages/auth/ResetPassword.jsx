import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import API_URL from "../../config";
import Navbar from "../../components/common/Navbar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const ResetPassword = () => {
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validToken =
    typeof token === "string" &&
    /^[a-f0-9]{64}$/i.test(token);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading || success) return;

    setError("");

    if (!validToken) {
      setError(
        "This password reset link is invalid. Please request a new one."
      );
      return;
    }

    // Match backend password validation
    if (
      password.length < 8 ||
      new TextEncoder().encode(password).length > 72
    ) {
      setError(
        "Password must be at least 8 characters and at most 72 bytes."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(
        `${API_URL}/api/auth/reset-password/${encodeURIComponent(token)}`,
        {
          password,
        }
      );

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset your password. Please try again."
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

          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/50">
              {success ? (
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              ) : (
                <LockKeyhole className="h-7 w-7" />
              )}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              {success
                ? "Password reset successful"
                : "Reset your password"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {success
                ? "Your Plotbase password has been updated successfully."
                : "Enter your new password below to regain access to your account."}
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
                        Password updated
                      </p>

                      <p className="mt-1 leading-6">
                        You can now sign in to Plotbase
                        using your new password.
                      </p>
                    </div>
                  </div>
                </div>

                <Button asChild className="h-11 w-full">
                  <Link to="/login">
                    Continue to login
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* Invalid Link */}
                {!validToken && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                  >
                    This reset link is invalid.
                    Please request a new password reset link.

                    <Link
                      to="/forgot-password"
                      className="mt-2 block font-medium underline"
                    >
                      Request new link
                    </Link>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="new-password"
                    className="text-sm font-medium"
                  >
                    New password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                      }}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={isLoading || !validToken}
                      className="h-11 pl-10 pr-10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      disabled={isLoading}
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters, maximum 72 bytes.
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirm-password"
                    className="text-sm font-medium"
                  >
                    Confirm new password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="confirm-password"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError("");
                      }}
                      autoComplete="new-password"
                      required
                      disabled={isLoading || !validToken}
                      className="h-11 pl-10 pr-10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) => !previous
                        )
                      }
                      disabled={isLoading}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      aria-pressed={showConfirmPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading || !validToken}
                  className="h-11 w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      Reset password
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
              Your password reset link is valid for 15 minutes
              and can only be used once.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ResetPassword;