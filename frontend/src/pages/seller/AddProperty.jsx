import { useState } from "react";
import { addPropertyStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config";
import { HiUpload } from "react-icons/hi";

const AddProperty = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    area: "",
    pincode: "",
    propertyType: "farm",
    bhk: "",
    bathrooms: "",
    areaSize: "",
    furnishing: "unfurnished",
    status: "sale",
    amenities: [],
    securityDeposit: "",
    maintenance: "",
  });



  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

 

  // image handling
  // const handleImageChange = (e) => {
  //   const files = Array.from(e.target.files);
  //   if (images.length + files.length > 10) {
  //     setError("You can onyl upload up to 1 images");
  //     return;
  //   }

  //   setImages((prev) => [...prev, ...files]);
  //   const previews = files.map((file) => URL.createObjectURL(file));
  //   setImagePreviews((prev) => [...prev, ...previews]);
  // };




  const handleImageChange = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  setImages([file]);

  const preview = URL.createObjectURL(file);
  setImagePreviews([preview]);
};

  // to remove image
  const removeImage = (index) => {
    setImages((prev) => prev.filter((__, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // to submit and create a new llisting

  const handleSubmit = async (e) => {
    if (formData.description.trim().length < 300) {
      alert("Description must be at least 300 characters.");
      return; // stop submission
    }
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "amenities") {
        formData[key].forEach((a) => data.append("amenities", a));
      } else {
        data.append(key, formData[key]);
      }
    });

    images.forEach((img) => data.append("images", img));

    console.log("submitted data", formData);

    try {
      await axios.post(`${API_URL}/api/property`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      navigate("/seller/my-properties");
    } catch (error) {
      setError(error.response?.data?.message || "failed to add property");
      setLoading(false);
    }
  };

  return (
    <div className={s.outerContainer}>
      <div className={s.innerContainer}>
        <div className={s.header}>
          <h1 className={s.heading}>List Your Property</h1>
          <p className={s.subheading}>
            Fill in the details below to reach thousands of potential buyers
          </p>
        </div>

        <form onSubmit={handleSubmit} className={s.form}>
          {error && <div className={s.error}> {error} </div>}

          <div className={s.section}>
            <div className={`${s.sectionHeader} ${s.sectionHeaderLargeMargin}`}>
              <div className={s.sectionBar}></div>
              <h3 className={s.sectionTitle}>Content & Description</h3>
            </div>

            <div className={s.contentGroupLarge}>
              <div>
                <label className={s.label}>Property Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g Mkuranga Residential Plots"
                  className={s.input}
                  required
                />
              </div>

              <div>
                <label className={s.label}>Detailed Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the property highlights"
                  className={`${s.input} ${s.textarea}`}
                  required
                ></textarea>
              </div>
            </div>
          </div>

          <div className={s.gridTwoCol}>
            <div>


              <div className={s.contentGroupMedium}>
                <div>
                  <label className={s.labelSmallMargin}>Property Type</label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    className={`${s.input} ${s.select}`}
                  >
                    <option value="residential">Residential Plot</option>
                    <option value="farm">Farm Plot</option>
                  </select>
                </div>

                <div className={s.twoColumnGrid}>
                  <div>
                    <label className={s.labelSmallMargin}>Area (SQM)</label>
                    <input
                      type="number"
                      name="area"
                      value={formData.area}
                      onChange={handleInputChange}
                      placeholder="e.g 400 SQM"
                      className={s.input}
                      required
                    />
                  </div>


                </div>
              </div>
            </div>

     
   

              <div className={s.contentGroupSmall}>
                <div>
                  <label className={s.labelSmallMargin}>Price (TZS)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g 50000"
                    className={s.input}
                    required
                  />
                </div>

            
                  <div>
                    <label className={s.labelSmallMargin}>Location</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g Mwanza"
                      className={s.input}
                      required
                    />
                  </div>
               
              </div>



              
      

            
          </div>

          
          <div className={s.section}>
      

            <div className={s.uploadArea}>
              <input
                type="file"
              
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
              />

              <div className={s.uploadIconWrapper}>
                <HiUpload size={20} color="#64748b" />
              </div>
              <h4 className={s.uploadTitle}>
                Click to upload or drag and drop up to 10 images
              </h4>
          
            </div>

            {imagePreviews.length > 0 && (
              <div className={s.previewsGrid}>
                {imagePreviews.map((src, i) => (
                  <div key={i} className={s.previewItem}>
                    <img
                      src={src}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className={s.removeButton}
                      style={{ transform: "rotate(45deg)" }}
                    >
                      <HiUpload size={12} />
                    </button>
                  </div>
                ))}

                {images.length < 10 && (
                  <div className={s.addMoreBox}>
                    <input
                      type="file"
                      
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                    <HiUpload size={20} color="#64748b" />
                    <span className={s.addMoreText}>Add More</span>
                  </div>
                )}
              </div>
            )}
          </div>

    


          <div className={s.footerButtons}>
            <button
              type="button"
              onClick={() => navigate("/seller/dashboard")}
              className={s.cancelButton}
            >
              {" "}
              Cancel
            </button>

            <button type="submit" className={s.submitButton} disabled={loading}>
              {loading ? "Publishing..." : "Publish List"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProperty;
