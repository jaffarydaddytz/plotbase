import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiEye, HiEyeOff } from "react-icons/hi";

import { loginStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/common/Navbar";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // Determine destination based on the user's global role
  const getLoginDestination = (role) => {
    switch (role) {
      case "admin":
        return "/admin-dashboard";

      case "seller":
        // Legacy seller dashboard
        return "/seller/dashboard";

      case "investor":
        // Investor dashboard will be introduced later
        return "/";

      case "buyer":
        // Preserve legacy buyer experience
        return "/";

      default:
        return "/";
    }
  };

  // Handle login
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await login(
        formData.email.trim(),
        formData.password
      );

      if (result.success) {
        // AuthContext stores the authenticated user after login
        const storedUser = JSON.parse(
          localStorage.getItem("user") ||
            sessionStorage.getItem("user") ||
            "null"
        );

        if (!storedUser) {
          setError(
            "Login succeeded, but your account details could not be loaded."
          );
          return;
        }

        const destination = getLoginDestination(
          storedUser.role
        );

        navigate(destination, {
          replace: true,
        });

        return;
      }

      // User must verify their email
      if (result.code === "EMAIL_VERIFY") {
        sessionStorage.setItem(
          "verifyEmail",
          formData.email.trim().toLowerCase()
        );

        navigate("/verify-email", {
          replace: true,
        });

        return;
      }

      // Other authentication errors
      setError(
        result.message ||
          "Login failed. Please check your credentials."
      );
    } catch (err) {
      setError(
        "Unable to sign in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={s.pageContainer}>
      <Navbar />

      <div className={s.containerCenter}>
        <div className={s.card}>
          {/* Header */}
          <h2 className={s.title}>
            Welcome Back
          </h2>

          <p className={s.subtitle}>
            Please enter your details to sign in
          </p>

          {/* Login error */}
          {error && (
            <div
              role="alert"
              className={s.errorAlert}
            >
              {error}
            </div>
          )}

          {/* Login form */}
          <form
            onSubmit={handleSubmit}
            className={s.form}
          >
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className={s.label}
              >
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
                disabled={isLoading}
                className={s.input}
              />
            </div>

            {/* Password */}
            <div>
              <div className={s.passwordHeader}>
                <label
                  htmlFor="login-password"
                  className={s.label}
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className={s.forgotLink}
                >
                  Forgot Password
                </Link>
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className={s.input}
                  style={{
                    paddingRight: "44px",
                  }}
                />

                {/* Show / Hide password */}
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={showPassword}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <HiEyeOff size={20} />
                  ) : (
                    <HiEye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              className={s.submitButton}
              type="submit"
              disabled={isLoading}
            >
              {isLoading
                ? "Signing In..."
                : "Sign In"}
            </button>
          </form>

          {/* Registration */}
          <p className={s.footerText}>
            Don't have an account?{" "}

            <Link
              to="/register"
              className={s.registerLink}
            >
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;