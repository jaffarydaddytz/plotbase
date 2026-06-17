import  {  useState } from 'react'
import { pendingApprovalStyles as s } from '../../assets/dummyStyles'
import { useAuth } from '../../context/AuthContext'
import { HiOutlineClock, HiOutlineRefresh, HiOutlineSupport } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const PendingApproval = () => {
    const {user, refreshUser} = useAuth();
    const [refreshing, setRefreshing]  = useState(false);

    // auto refresh
    // useEffect(()=> {
    //     const interval = setInterval(()=>{
    //         refreshUser();

    //     }, 1000);

    //     return () => clearInterval(interval);
    // }, [refreshUser]);

    // handle manua refresh

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await refreshUser();
        setTimeout(() => setRefreshing(false), 1000);
        
    }

    console.log("USER", user)

  return (
    <div className={s.container}>
        <div className={s.iconCircle}>
            <HiOutlineClock size={48} /> 

        </div>

        <h1 className={s.heading}>
            Approval Pending
        </h1>
        <p className={s.description}>
            Hello {user?.name}, your seller account is currently under review by our admin team. Approval usually takes less than 24 hrs. 

        </p>

        <div className={s.buttonGroup}>
            <a href="/properties" className={s.browseButton}>Browse Properties</a>

            <button onClick={handleManualRefresh} disabled={refreshing} className={`${s.refreshButtonBase} ${refreshing} ? s.refreshButtonDisabled : s.refreshButtonEnabled`}>
                <HiOutlineRefresh size={20} className={refreshing ? "animate-spin" : ""} />

                {refreshing ? "Checking...": "Check Status Now"}

            </button>


        </div>

        <div className={s.supportContainer}>
            <HiOutlineSupport size={18} />
            Need help?{" "}
            <Link to="/contact" className={s.supportLink}>
            Contact Support
            </Link>

        </div>
        
    </div>
  )
}

export default PendingApproval