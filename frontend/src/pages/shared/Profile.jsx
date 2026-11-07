import { useEffect, useRef, useState } from "react";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/common/Navbar";
import API_URL from "../../config";

import {
  HiOutlineCamera,
  HiOutlinePencil,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiCheck,
  HiX,
} from "react-icons/hi";

const getInitialFormData = (user) => ({
  name: user?.name || "",
  phone: user?.phone || "",
  address: user?.address || "",
});

const getRoleLabel = (role) => {
  const roles = {
    investor: "Investor",
    buyer: "Investor",
    seller: "Company Account",
    admin: "Administrator",
  };

  return roles[role] || "Plotbase Member";
};

const Profile = () => {
  const { user, setUser, token } = useAuth();

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeProfilePic, setRemoveProfilePic] = useState(false);

  const [formData, setFormData] = useState(() =>
    getInitialFormData(user)
  );

  useEffect(() => {
    if (!isEditing) {
      setFormData(getInitialFormData(user));
    }
  }, [user, isEditing]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const clearImagePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setImagePreview(null);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));

    setError("");
    setSuccess("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    clearImagePreview();

    const preview = URL.createObjectURL(file);

    previewUrlRef.current = preview;

    setImageFile(file);
    setImagePreview(preview);
    setRemoveProfilePic(false);
    setError("");
  };

  const handleRemoveImage = () => {
    clearImagePreview();
    setImageFile(null);
    setRemoveProfilePic(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startEditing = () => {
    setFormData(getInitialFormData(user));
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData(getInitialFormData(user));
    clearImagePreview();
    setImageFile(null);
    setRemoveProfilePic(false);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();

    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();

      data.append("name", name);
      data.append("phone", phone);
      data.append("address", address);

      if (imageFile) {
        data.append("profilePic", imageFile);
      }

      if (removeProfilePic) {
        data.append("removeProfilePic", "true");
      }

      const response = await axios.put(
        `${API_URL}/api/user/profile`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success && response.data?.user) {
        const updatedUser = response.data.user;

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        clearImagePreview();
        setImageFile(null);
        setRemoveProfilePic(false);
        setIsEditing(false);

        setSuccess("Profile updated successfully.");
      } else {
        setError(
          response.data?.message ||
            "Unable to update your profile."
        );
      }
    } catch (err) {
      console.error("Profile update failed:", err);

      setError(
        err.response?.data?.message ||
          "Failed to update profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const avatarSource = imagePreview
    ? imagePreview
    : !removeProfilePic
      ? user?.profilePic
      : null;

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "U";

  const inputClass =
    "h-9 w-full rounded-md border border-zinc-200 bg-white " +
    "px-3 text-xs text-zinc-900 outline-none " +
    "focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

  const labelClass =
    "mb-1.5 block text-[11px] font-medium text-zinc-500";

  return (
    <div className="min-h-screen bg-zinc-50">
      {user?.role !== "seller" && <Navbar />}

      <main
        className={`mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6 ${
          user?.role === "seller" ? "pt-8" : "pt-24"
        }`}
      >
        {/* PAGE HEADER */}

        <header className="mb-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950">
            Personal Profile
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Manage your personal information and account settings.
          </p>
        </header>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            <HiOutlineExclamationCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            role="status"
            className="mb-3 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
          >
            <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* PROFILE CARD */}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">

          {/* PROFILE HEADER */}

          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-4 sm:px-5">

            {/* AVATAR */}

            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">

                {avatarSource ? (
                  <img
                    src={avatarSource}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-zinc-700">
                    {initials}
                  </span>
                )}
              </div>

              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    aria-label="Change profile picture"
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-950 text-white"
                  >
                    <HiOutlineCamera className="h-3.5 w-3.5" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {avatarSource && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={loading}
                      aria-label="Remove profile picture"
                      className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700"
                    >
                      <HiX className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* USER DETAILS */}

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-zinc-950">
                {user?.name || "Plotbase Member"}
              </h2>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {user?.email || "No email available"}
              </p>

              <span className="mt-1.5 inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                {getRoleLabel(user?.role)}
              </span>
            </div>

            {/* EDIT BUTTON */}

            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-[11px] font-medium text-white hover:bg-zinc-800"
              >
                <HiOutlinePencil className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            )}
          </div>

          {/* PROFILE BODY */}

          <div className="p-4 sm:p-5">

            <h3 className="mb-3 text-xs font-semibold text-zinc-900">
              Personal Information
            </h3>

            {isEditing ? (
              <form
                onSubmit={handleUpdate}
                className="space-y-3"
              >
                {/* NAME AND PHONE */}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-name" className={labelClass}>
                      Full Name
                    </label>

                    <input
                      id="profile-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      maxLength={120}
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-phone" className={labelClass}>
                      Phone Number
                    </label>

                    <input
                      id="profile-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="0712345678"
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* ADDRESS */}

                <div>
                  <label htmlFor="profile-address" className={labelClass}>
                    Address
                  </label>

                  <textarea
                    id="profile-address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={2}
                    maxLength={500}
                    disabled={loading}
                    placeholder="Enter your address"
                    className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                {/* ACTIONS */}

                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={loading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <HiX className="h-3.5 w-3.5" />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-[11px] font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <HiCheck className="h-3.5 w-3.5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">

                {/* FULL NAME */}

                <div>
                  <p className={labelClass}>
                    Full Name
                  </p>

                  <p className="text-xs font-medium text-zinc-900">
                    {user?.name || "Not provided"}
                  </p>
                </div>

                {/* EMAIL */}

                <div>
                  <p className={labelClass}>
                    Email Address
                  </p>

                  <p className="break-all text-xs font-medium text-zinc-900">
                    {user?.email || "Not provided"}
                  </p>
                </div>

                {/* PHONE */}

                <div>
                  <p className={labelClass}>
                    Phone Number
                  </p>

                  <p className="text-xs font-medium text-zinc-900">
                    {user?.phone || "Not provided"}
                  </p>
                </div>

                {/* ADDRESS */}

                <div>
                  <p className={labelClass}>
                    Address
                  </p>

                  <p className="break-words text-xs font-medium text-zinc-900">
                    {user?.address || "Not provided"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;