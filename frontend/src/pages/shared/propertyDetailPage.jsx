import { HiLocationMarker } from "react-icons/hi";
import Navbar from "../../components/common/Navbar";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import  { useEffect, useState } from "react";
import API_URL from "../../config";


const PropertyDetailPage = () => {
   const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);





   useEffect(() => {
    const fetchDetails = async () => {
      const id = "6a562943be54bdb6d384d7ca";
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/property/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        console.log("Property details response:", res.data);
        setProperty(res.data.property);
        setSimilarProperties(res.data.similarProperties || []);

        setLoading(false);
      } catch (err) {
        setError("Failed to load property details");
        console.log("error property", err);
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, user, token]);







  return (
    <>
      <Navbar />
      <div className="mt-20 p-2">
        <div className="flex items-center justify-between">
          <h4>Viwanja Mkuranga Mbezi - Phase 1</h4>
          <span>listed: June 25, 1999</span>
        </div>

        {/* left & right section */}

        <div className="grid grid-cols-1 md:grid-cols-12  bg-amber-100 gap-2">
          <div className="md:col-span-6">

            {/* top */}
            <div className="flex items-center justify-between bg-green-400">
              <h6>TZS 35,000/SQM</h6>
              <span className="flex items-center">
                {" "}
                <HiLocationMarker /> Pwani-Mkuranga
              </span>
            </div>

            {/* description */}

            <div>

              <h5>Description</h5>
              <p>  sqm1@25,000/= cash</p>
              <p>➡️ sqm1@30,000/= installment</p>
              <p>➡️ anza na 30%</p>
              <p>➡️ Iliyobaki Maliza ndani ya 𝗺𝗶𝗲zi 𝟏𝟐</p>
              <p>👉🏼Bei nzima ni mil 12(sqm 400)</p>

              <h5>𝗦𝗜𝗙𝗔 𝗭𝗔 𝗠𝗥𝗔𝗗𝗜</h5>
              <p>-km 2.5 kutoka Beach⛱️🏖️🏝️</p>
              <p>-mita 600 kutoka mkwajuni Centre</p>
              <p>-km 3 kutoka Lami</p>
              <p>-km 24 kutoka Ferry mpaka Site</p>
              <p>-Mradi wa kujenga na kuhamia,makazi ya watu Tayari</p>
              <p>-umeme upo site💥💥</p>
              <p>-maji Yapo 💦</p>
              <p>-shule ipo karibu kbsa🏫</p>
              <p>-mfumo wa malipo Ni Rafiki✅✅✅</p>
              <p>🔥 Hii ni nafasi ya kutoka kwenye kupanga kwenda kwenye umiliki!</p>
<h5>𝗖𝗛𝗘𝗖𝗞 𝗟𝗜𝗦𝗧</h5>
<p>✅𝗞𝗜𝗪𝗔𝗡𝗝𝗔 𝗞𝗜𝗟𝗜𝗖𝗛𝗢𝗣𝗜𝗠𝗪𝗔</p>
<p>✅𝗛𝗔𝗧𝗜 𝗠𝗜𝗟𝗜𝗞𝗜 Kutoka Wizara Ya Ardhi</p>
<p>✅𝗥𝗔𝗠𝗔𝗡𝗜 𝗬𝗔 𝗡𝗬𝗨𝗠𝗕𝗔 ya chaguzi lako</p>
<p>✅𝗞𝗜𝗕𝗔𝗟𝗜 cha ujenzi</p>


<h5>𝗦𝗜𝗧𝗘 𝗩𝗜𝗦𝗜𝗧 𝗥𝗔𝗧𝗜𝗕𝗔</h5>
<p> (mwanga Tower -𝗺𝗮𝗸𝘂𝘁𝗮𝗻𝗼 𝗠𝘄𝗮𝗻𝗴𝗮 𝗧𝗼𝘄𝗲𝗿</p>
<p>𝗺𝘂𝗱𝗮:𝟎𝟗:𝟎𝟎 𝗮𝗺 )Usafiri wa pamoja kwenda na kurudi</p>
<p>𝗦𝗜𝗞𝗨
📌Wednesdays
📌Saturdays
📌Sundays</p>




            </div>

          </div>

          <div className="col-span-6">
            <div className=" h-80 bg-amber-300 ">
              <div className=" px-2 h-50 bg-green-600">
                  media map

                  <img
    src={property.images[0]}
    alt="Property map"
    className="w-full h-full object-cover rounded-lg"
  />
                 
              </div>


              <div className="h-30 bg-amber-700 mt-1">
                seller profile
              </div>

              
              <div className="h-30 bg-blue-500 mt-1">
                more seller profile
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyDetailPage;
