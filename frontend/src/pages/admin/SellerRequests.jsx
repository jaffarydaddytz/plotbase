import React, { useEffect, useState } from 'react'
import { sellerRequestsStyles as s } from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios';
import API_URL from '../../config';
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';


const SellerRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const {token} = useAuth();


    //to fetch requests made by seller
    useEffect(()=>{
        const fetchRequests = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/pending-sellers`, {
                    headers: {Authorization: `Bearer ${token}`},
                });
                console.log("PENDING SELLER REQUESTS",res.data )

                if(res.data.success) {
                    setRequests(res.data.pendingSellers)
                }

                setLoading(false);

                
            } catch (error) {
                console.error("Failed to load error requests", error)
                setLoading(false)
                
            }
            
        }

        fetchRequests();
    }, [token])


    //to approve seller

    const handleApprove = async (id) => {
        try {
            const res = await axios.patch(
                `${API_URL}/api/admin/approve-seller/${id}`, 
                {},
                {headers: {Authorization: `Bearer ${token}`}}
            )

            if(res.data.success){
                setRequests(requests.filter((req) => req._id !== id));
                alert("seller approved successful")
            }
        } catch (error) {
            console.log("failed to approve", error)
            alert("failed to approve")
            
        };

        if(loading) 
            return (
        <div className={s.loader}>

        </div>
        )

        
    }



  return (
    <div className={s.container}>
        <div className={s.headerContainer}>
            <h1 className={s.pageTitle}>Seller Verifaction </h1>
            <p className={s.pageSubtitle}>
                Review and Approve new seller registration requests.

            </p>

        </div>

        <div className={s.card}>
            <div className={s.cardInner}>
                <h2 className={s.sectionTitle}>Pending Requests ({requests.length})</h2>
                {requests.length === 0 ? (
                    <div className={s.emptyState}>
                        <HiOutlineCheckCircle size={48} className={s.emptyStateIcon} />
                        <p>No Pending Seller requests at the moment</p>
                    </div>
                ): (
                    <div className={s.requestGrid}>
                        {requests.map((request) => (
                            <div key={request._id} className={s.requestCard}>
                                <div className={s.requestHeader}>
                                    <div className={s.avatar}>
                                         {request.name.charAt(0).toUpperCase()}

                                    </div>

                                    <div>
                                        <div className={s.requestName}>
                                            {request.name}
                                            
                                        </div>

                                       
                                        <div className={s.requestDate}> <HiOutlineClock /> Joined{" "}  {new Date(request.createdAt).toLocaleDateString()} </div>

                                    </div>
                                </div>



                                <div className={s.contactInfo}>
                                    <div className={s.contactItem}>
                                        <HiOutlineMail size={18} className='text-primary'/> {" "}
                                        {request.email}

                                    </div>

                                    {request.phone && (
                                        <div className={s.contactItem}>
                                            <HiOutlinePhone size={18} className='text-primary'/> {" "}
                                            {request.phone}
                                        </div>

                                    )}

                                </div>

                                <button onClick={() => handleApprove(request._id)} className={s.approveButton}>
                                    <HiOutlineCheckCircle size={20} />
                                    Approve Seller

                                </button>
    

                            </div>
                        ))}

                    </div>
                ) }


            </div>

        </div>


    </div>
  )
}

export default SellerRequests