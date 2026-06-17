import React, { useState } from "react";
import { profileStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/common/Navbar";
import { HiCheck, HiOutlineLocationMarker, HiOutlineMail, HiOutlinePhone, HiOutlineUser, HiX } from "react-icons/hi";
import axios from "axios";
import API_URL from "../../config";

const Profile = () => {
  const { user, setUser, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeProfilePic, setRemoveProfilePic] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      //only 10 digits
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: numericValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveProfilePic(false);
    }
  };

  // to update your profile
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("phone", formData.phone);
      data.append("address", formData.address);
      if (imageFile) {
        data.append("profilePic", imageFile);
      }
      if (removeProfilePic) {
        data.append("removeProfilePic", "true");
      }

      const res = await axios.put(`${API_URL}/api/user/profile`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("profile result", res)

      if (res.data.success) {
        const updatedUser = res.data.user;
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setIsEditing(false);
        setImageFile(null);
        setImagePreview(null);
      }
    } catch (err) {
        console.log("update profile error", err)
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };


   if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
    </div>
  );
}

  return (
    <div className={s.containerWrapper(user?.role)}>
      {user?.role !== "seller" && <Navbar />}
      <div className={s.mainContainer(user?.role)}>
        <header className={s.header}>
          <h1 className={s.page}>Personal Profile</h1>
          <p className={s.pageSubtitle}>
            Manage your personal Information and account settings.
          </p>
        </header>

        <div className={s.card}>
          <div className={s.profileHeader}>
            <div className={s.avatarSection}>
              <div className={s.avatarWrapper}>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className={s.avatarImage}
                  />
                ) : !removeProfilePic && user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="pic"
                    className={s.avatarImage}
                  />
                ) : (
                  <span className={s.avatarPlaceholder}>
                    {" "}
                    {user?.name?.[0]?.toUpperCase() || "U"}{" "}
                  </span>
                )}
              </div>

              {isEditing && (
                <>
                  <label className={s.uploadButton}>
                    <input
                      type="file"
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/*"
                    />

                    <HiOutlineUser size={20} />
                  </label>

                  {(imagePreview ||
                    (!removeProfilePic && user?.profilePic)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setRemoveProfilePic(true);
                      }}
                      className={s.removeButton}
                      title="Remove Profile Picture"
                    >
                      <HiX size={20} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div>
              <h2 className={s.userName}>{user?.name}</h2>
              <span className={s.roleBadge}> {user?.role?.toUpperCase()} </span>
            </div>
          </div>

          {error && <div className={s.errorMessage}>{error}</div>}
          {isEditing ? (
            <form onSubmit={handleUpdate} className={s.editForm}>
              <div>
                <label className={s.label}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={s.input}
                  required
                />
              </div>

              <div>
                <label className={s.label}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength="10"
                  pattern="[0-9]*"
                  className={s.input}
                  placeholder="Enter your 10 digits phone number"
                />
              </div>

              <div>
                <label className={s.label}>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  id=""
                   onChange={handleInputChange}
                  className={s.textarea}
                  placeholder="Enter your full address"
                ></textarea>
              </div>

              <div className={s.formActions}>
                <button
                  type="submit"
                  disabled={loading}
                  className={s.saveButton}
                >
                  <HiCheck size={24} />
                  {loading ? "saving..." : "save changes"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setImagePreview(null);
                    setImageFile(null);
                    setRemoveProfilePic(false);
                  }}
                  className={s.cancelButton}
                >
                  <HiX size={20} />
                </button>
              </div>
            </form>
          ) : (
            <div className={s.infoSection}>
              <div className={s.infoItem}>
                <div className={s.infoIcon}>
                  <HiOutlineMail size={24} />
                </div>

                <div>
                  <div className={s.infoLabel}>Email Address</div>
                  <div className={s.infoValue}>{user?.email}</div>
                </div>
              </div>

              <div className={s.infoItem}>
                <div className={s.infoIcon}>
                  <HiOutlinePhone size={24} />
                </div>

                <div>
                  <div className={s.infoLabel}>Phone Number</div>
                  <div className={s.infoValue}>{user?.phone || "not provided"}</div>
                </div>
              </div>

                <div className={s.infoItem}>
                <div className={s.infoIcon}>
                  <HiOutlineLocationMarker size={24} />
                </div>

                <div>
                  <div className={s.infoLabel}>Location</div>
                  <div className={s.infoValue}>{user?.address || "not provided"}</div>
                </div>
              </div>


              <div className={s.editButtonWrapper}>
                <button onClick={()=> setIsEditing(true)} className={s.editProfileButton}>
                    Edit Profile Details

                </button>

              </div>
            </div>

            



          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
