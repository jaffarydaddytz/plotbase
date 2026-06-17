import React, { useState } from "react";
import { registerStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/common/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { HiEye, HiEyeOff } from "react-icons/hi";

const register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer",
  });

  const [success, setSuccess] = useState(" ");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  //to submit the data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = await register(formData);
    if (result.success) {
      setSuccess("Registration successful");
      setTimeout(
        () => navigate("/verify-email", { state: { email: formData.email } }),
        1500,
      );
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const [error, setError] = useState("");

  return (
    <div className={s.pageWrapper}>
      <Navbar />
      <div className={s.container}>
        <div className={s.formCard}>
          <h2 className={s.heading}>Create Account</h2>
          <p className={s.subheading}>Join our Community to find Plots</p>

          {error && <div className={s.errorMessage}>{error} </div>}
          {success && <div className={s.successMessage}> {success} </div>}

          <form onSubmit={handleSubmit} className={s.form}>
            <div>
              <label className={s.label}>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className={s.input}
              />
            </div>

            <div>
              <label className={s.label}>Email</label>
              <input
                type="email"
                name="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                className={s.input}
              />
            </div>

            <div>
              <label className={s.label}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="*********"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={s.input}
                  style={{ paddingRight: "40px" }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                >
                  {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-3 font-medium">Select Role</label>
              <div className={s.roleContainer}>
                <label
                  className={`${s.roleLabelBase} ${formData.role === "buyer" ? s.roleLabelActive : s.roleLabelInactive}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="buyer"
                    checked={formData.role === "buyer"}
                    onChange={handleChange}
                    className={s.hiddenRadio}
                  />
                  Buyer
                </label>

                <label
                  className={`${s.roleLabelBase} ${formData.role === "seller" ? s.roleLabelActive : s.roleLabelInactive}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="seller"
                    checked={formData.role === "seller"}
                    onChange={handleChange}
                    className={s.hiddenRadio}
                  />
                  Seller
                </label>
              </div>
            </div>

            <button className={s.submitButton} type="submit" disabled={isLoading}>
                {isLoading ? "Creating Account": "Create Acccount"}
            </button>


          </form>

          <p className={s.footerText}>
            Already have an Account{" "} 
            <Link to='/login' className={s.loginLink}> Sign in here </Link>

          </p>
        </div>
      </div>
    </div>
  );
};

export default register;
