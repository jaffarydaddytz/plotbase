import React, { useState } from 'react'
import { verifyEmailStyles as s } from '../../assets/dummyStyles'
import Navbar from '../../components/common/Navbar'
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config';

const VerifyEmail = () => {
    const [code, setCode] = useState("");
    const [error, setError] = useState("")
    const [success, setSuccess]=useState("");
    const [isLoading, setIsLoading]=useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // to get email passed from register page
    const emailFromState = location.state?.email || "";
    const [email, setsmail] = useState(emailFromState);

    //to submit the code
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            console.log("Sending:", { email, code });
            const res = await axios.post(`${API_URL}/api/auth/verify-email`, {
                email,
                code
            });

            console.log("verify email response", res)
            
            if(res.data.success){
                setSuccess("email verified successfuly!");
                setTimeout(() => navigate("/login"), 2000);
            }
        } catch (err) {
            console.log("failed", err)
            setError(
                err.response?.data?.message || " verification failed try again"
            )
            
        } finally {
            setIsLoading(false);
        }
    }


  return (
    <div className={s.pageContainer}>

        <Navbar />
        <div className={s.containerCenter}>
            <div className={s.card}>
                <h2 className={s.title}>Verify Your Email</h2>
                <p className={s.subtitle}>
                    Enter the 6-Digit Code sent to your email 
                </p>

                {error && <div className={s.errorAlert}>{error}</div> }
                {success && <div className={s.successAlert}> {success} </div>}

                <form onSubmit={handleSubmit} className={s.form} >
                    {!emailFromState && (
                        <div>
                            <label className={s.label}>Email Address</label>
                            <input type="email" value={email}  onChange={(e)=> setsmail(e.target.value)}
                            placeholder="name@company.com"  
                            required
                            className={s.input} />
                        </div>
                    )}

                    <div>
                        <label className={s.label}>Verification Code</label>
                        <input type="text" maxLength="6" placeholder='********' value={code} onChange={(e)=> setCode(e.target.value)}  required className={s.codeInput}/>
                    </div>

                    <button type='submit' disabled={isLoading} className={s.submitButton}>
                        {isLoading ? "Verifying..." : "Verify Email"}
                    </button>

                </form>

            </div>

        </div>


    </div>
  )
}

export default VerifyEmail