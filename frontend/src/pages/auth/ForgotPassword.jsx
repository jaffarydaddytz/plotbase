import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import Navbar from "../../components/common/Navbar";
import API_URL from "../../config";
import { forgotPasswordStyles as s } from "../../assets/dummyStyles";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const response = await axios.post(
        `${API_URL}/api/auth/forgot-password`,
        {
          email: normalizedEmail,
        }
      );

      setSuccess(
        response.data.message ||
          "If an account exists, a password reset link will be sent."
      );

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
    <div className={s.container}>
      <Navbar />

      <div className={s.centerWrapper}>
        <div className={s.formCard}>

          <h2 className={s.title}>
            Forgot Password?
          </h2>

          <p className={s.subtitle}>
            Enter your registered email address.
            We'll send you a link to reset your password.
          </p>

          {error && (
            <div className={s.errorMessage} role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className={s.successMessage} role="status">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className={s.form}>

            <div>
              <label htmlFor="email" className={s.label}>
                Email Address
              </label>

              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
                disabled={isLoading}
                className={s.input}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={s.submitButton}
            >
              {isLoading
                ? "Sending Reset Link..."
                : "Send Reset Link"}
            </button>

          </form>

          <p className={s.footerText}>
            Remember your password?{" "}

            <Link to="/login" className={s.link}>
              Back to Login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;