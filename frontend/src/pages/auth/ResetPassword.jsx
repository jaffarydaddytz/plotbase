import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import Navbar from "../../components/common/Navbar";
import API_URL from "../../config";
import { resetPasswordStyles as s } from "../../assets/dummyStyles";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login after successful password reset
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading || success) return;

    setError("");

    const { password, confirmPassword } = formData;

    // Validate password length
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    // Match the backend's 72-byte password limit
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must not exceed 72 bytes.");
      return;
    }

    // Confirm passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Validate reset token presence
    if (!token) {
      setError("Invalid password reset link.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/reset-password/${encodeURIComponent(token)}`,
        {
          password,
        }
      );

      if (response.data.success) {
        setSuccess(
          "Password reset successful! Redirecting to login..."
        );

        setFormData({
          password: "",
          confirmPassword: "",
        });
      } else {
        setError(
          response.data.message || "Password reset failed."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please try again."
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
            Reset Password
          </h2>

          <p className={s.subtitle}>
            Enter your new password below.
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

          {!success && (
            <form onSubmit={handleSubmit} className={s.form}>
              <div>
                <label
                  htmlFor="password"
                  className={s.label}
                >
                  New Password
                </label>

                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isLoading}
                  className={s.input}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className={s.label}
                >
                  Confirm Password
                </label>

                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
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
                  ? "Resetting Password..."
                  : "Reset Password"}
              </button>
            </form>
          )}

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

export default ResetPassword;