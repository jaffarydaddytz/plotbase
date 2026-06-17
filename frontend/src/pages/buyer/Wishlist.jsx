// import React, { useEffect, useState } from 'react'
// import { wishlistStyles as s } from '../../assets/dummyStyles'
// import { useAuth } from '../../context/AuthContext'
// import Navbar from '../../components/common/Navbar'
// import API_URL from '../../config'


// const Wishlist = () => {

//     const {token} = useAuth();
//     const [wishlistItems, setWishlistItems] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);


//     const fetchWishlist = async () => {

//         try {
//             const res = await axios.get(`${API_URL}/api/wishlist`, {
//                 headers: {Authorization: `Bearer ${token}`}
//             })

//             setWishlistItems(res.data);
//             setLoading(false)
//         } catch (error) {
//             setError("Failed to load wishlist");
//             setLoading(false);

            
//         }
        
//     }


//     // to remove property from wishlist

//     const removeFromWishlist = async (propertyId) => {
//         if(!propertyId){
//             alert("invalid property id")
//             return;
//         }

//         try {
//             await axios.delete(`${API_URL}/api/wishlist/${propertyId}`,{
//                 headers: { Authorization: `Bearer ${token}`},
//             })
//         } catch (error) {
            
//         }
        
//     }


//     useEffect(()=>{
//         fetchWishlist();
//     }, [])



//   return (
//     <div className={s.pageContainer}>
//         <Navbar />

//         <main className={s.mainContainer}>
//             <div className={s.headingWrapper}>
//                 <h1 className={s.heading}>
//                     Your Wishlist

//                 </h1>

//                 <p className={s.subheading}>
//                     Properties you've saved for later 

//                 </p>

//             </div>

//         </main>

//     </div>
//   )
// }

// export default Wishlist