import React, { useEffect, useState } from 'react'
import { adminInquiriesStyles as s} from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios';
import API_URL from '../../config';
import { HiOutlineHome } from 'react-icons/hi';

const AdminInquiries = () => {
    const [inquiries, setInquiries] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading]= useState(true);
    const {token} = useAuth();

    //to fetch inquiries by buyer to seller
    useEffect(() => {
        const fetchInquiries = async () => {
            if(!token) return;
            setLoading(true);

            try {
                console.log("fetching inquiries...");
                const res = await axios.get(`${API_URL}/api/admin/inquiries`, {
                    headers: {Authorization: `Bearer ${token}`}
                })
                console.log("inquiries respponse:", res.data)

                if(res.data.success){
                    setInquiries(res.data.inquiries)
                }

                setLoading(false);

            } catch (error) {
                console.error("failed to load inquiries", error);
                setError(error.response?.data?.message || error.message);
                setLoading(false);
                
            }
            
        }; fetchInquiries();

    }, [token])

    if(loading)
        return (
    <div >
        ...Loading


    </div>
    )

    if(error)
        return (
    <div className=" error-container p-8 text-center text-[#dc2626]">
        <h3> Error inquiries</h3>
        <p>{error}</p>
        <button className='btn ' onClick={() => window.location.reload()}>
            Retry
        </button>

    </div>)




  return (
    <>

    <div className={s.headerContainer}>
        <h4 className={s.headerTitle}>Platform Inquiries</h4>
        <p className={s.headerSubtitle}>Review communication between buyer and seller</p>

    </div>

    <div className={s.listContainer}>
        {inquiries.map((inq) => (
            <div key={inq._id} className={s.inquiryCard}>
                <div className={s.cardTopSection}>
                    <div className={s.propertyIconWrapper}>
                        <div className={s.propertyIconWrapper}>
                            <HiOutlineHome size={24} /> 

                        </div>

                    </div>

                </div>
            </div>
        ))}
    </div>

    </>
    
  )
}

export default AdminInquiries