import  { useEffect, useState } from "react";
import { editPropertyStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config";
import { HiUpload, HiX } from "react-icons/hi";

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    area: "",
    pincode: "",
    propertyType: "flat",
    bhk: "",
    bathrooms: "",
    furnishing: "unfurnished",
    status: "sale",
    amenities: [],
    securityDeposit: "",
    maintenance: "",
  });

 

  // to fetch property
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/property/${id}`);
        const p = res.data.property;

        setFormData({
          title: p.title || "",
          description: p.description || "",
          price: p.price || "",
          city: p.city || "",
          area: p.area || "",
          pincode: p.pincode || "",
          propertyType: p.propertyType || "flat",
          bhk: p.bhk || "",
          bathrooms: p.bathrooms || "",
          areaSize: p.areaSize || "",
          furnishing: p.furnishing || "unfurnished",
          status: p.status || "sale",
          amenities: p.amenities || [],
          securityDeposit: p.securityDeposit || "",
          maintenance: p.maintenance || "",
        });

        setExistingImages(p.images || []);
        setLoading(false);
      } catch (error) {
        setError("failed to load property details");
        setLoading(false);
        console.log("failed to edit property", error)
      }
    };
    fetchProperty();
  }, [id]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  // const handleNewImageChange = (e) => {
  //   const files = Array.from(e.target.files);
  //   if (existingImages.length + newImages.length + files.length > 10) {
  //     setError("Total images cannot exceed 10");
  //     return;
  //   }
  //   setNewImages((prev) => [...prev, ...files]);
  //   const previews = files.map((file) => URL.createObjectURL(file));
  //   setNewImagePreviews((prev) => [...prev, ...previews]);
  // };


  const handleNewImageChange = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  if (existingImages.length > 0) {
    setError("Please remove the existing image before uploading a new one.");
    e.target.value = "";
    return;
  }

  setNewImages([file]);

  const preview = URL.createObjectURL(file);
  setNewImagePreviews([preview]);

  setError(null);
};




  
//   const handleNewImageChange = (e) => {
//   const file = e.target.files[0];

//   if (!file) return;

//   setNewImages([file]);

//   const preview = URL.createObjectURL(file);
//   setNewImagePreviews([preview]);
// };

  const removeExistingImage = (url) => {
    setExistingImages((prev) => prev.filter((img) => img !== url));
  };

  const removeNewImage = (index) => {
    setNewImages(newImages.filter((_, i) => i !== index));
    setNewImagePreviews(newImagePreviews.filter((_, i) => i !== index));
  };

  // to submit updated listing
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "amenities") {
        data.append("amenities", JSON.stringify(formData[key]));
      } else if (key === "securityDeposit" || key === "maintenance") {
        data.append(key, formData[key] || 0);
      } else {
        data.append(key, formData[key]);
      }
    });
    data.append("existingImages", JSON.stringify(existingImages));
    newImages.forEach((img) => data.append("images", img));

    try {
      await axios.put(`${API_URL}/api/property/${id} `, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update property");
      setSubmitting(false);
    }
    if (loading) return <div className="loader">Loading...</div>;
  };

  return (
    <div className={s.pageContainer}>
      
      <div className={s.innerContainer}>
        <h4 className="justify-center flex mb-1">Edit Property</h4>


        <form onSubmit={handleSubmit} className={s.formContainer}>
          {error && (
            <div
              style={{
                padding: "1rem",
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: "0.75rem",
                marginBottom: "2rem",
              }}
            >
              {error}
            </div>
          )}

          <div className={s.section}>
     

            <div className={s.sectionContent}>
              <div>
                <label className={s.label}>Property Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Mkuranga Plots"
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
                  placeholder="Describe the property highlights...."
                  className={s.textarea}
                  required
                ></textarea>
              </div>
            </div>
          </div>

    

          <div className={s.twoColumnGrid}>
            {/* Section 2: Property Details */}
            <div>
          
              <div className={s.sectionContent}>
                <div>
                  <label className={s.label}>Property Type</label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    className={s.select}
                  >
                    <option value="residential">Residential Plot</option>
                    <option value="farm">Farm Plot</option>
               
                  </select>
                </div>
     
         
              
                  <div>
                   <label className={s.label}>Area (SQM)</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    placeholder="e.g. Worli"
                    className={s.input}
                    required
                  />
                  </div>
        
              </div>
            </div>

              {/* Section 3: Pricing & Location */}
            <div>
        
              <div className={s.sectionContent}>
                <div>
                  <label className={s.label}>Price (TZS)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 5000000"
                    className={s.input}
                    required
                  />
                </div>

               
                  <div>
                    <label className={s.label}>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Mumbai"
                      className={s.input}
                      required
                    />
                  </div>
           
                <div>
         
                </div>
              </div>
            </div>
          
          </div>

      


            {/* Section 5: Image Management */}
          <div className={s.section}>
   

            <div className={s.imageGrid}>
              {/* Existing Images */}
              {existingImages.map((src, i) => (
                <div key={`existing-${i}`} className={s.imageCard}>
                  <img src={src} alt="Existing" className={s.imageCardImg} />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(src)}
                    className={s.removeImageBtn}
                  >
                    <HiX size={12} />
                  </button>
                  <div className={s.imageBadgeExisting}>EXISTING</div>
                </div>
              ))}

              {/* New Image Previews */}
              {newImagePreviews.map((src, i) => (
                <div key={`new-${i}`} className={s.imageCardNew}>
                  <img src={src} alt="New Preview" className={s.imageCardImg} />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className={s.removeImageBtn}
                  >
                    <HiX size={12} />
                  </button>
                  <div className={s.imageBadgeNew}>NEW</div>
                </div>
              ))}

              {/* Upload Button overlay */}
              {existingImages.length + newImages.length < 10 && (
                <div className={s.uploadCard}>
                  <input
                    type="file"
                    
                    onChange={handleNewImageChange}
                    className={s.uploadInput}
                    accept="image/*"
                  />
                  <HiUpload size={22} color="#64748b" />
                  <span className={s.uploadText}>Add Image</span>
                </div>
              )}
            </div>
          </div>

          <div className={s.formActions}>
            
            <button type="button" onClick={() => navigate("/dashboard")}
            className={s.cancelButton}
                >
                    Cancel

            </button>


            <button type="submit" className={s.submitButton} disabled={loading}>
                {submitting ? "updating..." : "Save Changes"}

            </button>
        

          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProperty;
