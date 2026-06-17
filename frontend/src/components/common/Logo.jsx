
import { logoStyles as s } from "../../assets/dummyStyles";
import { Link } from "react-router-dom";
import "@fontsource/comfortaa"

const Logo = ({
  fontSize = "1.5rem",
  showText = true,
  ...props
}) => {
  return (
    <Link
      to="/"
      {...props}
      className={`${s.link} ${props.className || ""}`}
      style={{ fontSize, ...props.style }}
    >
   



      

       {showText && <span className={s.text}>plotbase</span>}
    </Link>



  );
};

export default Logo;
