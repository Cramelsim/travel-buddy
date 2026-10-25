import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          🧭 Travel Buddy
        </Link>
        <nav>
          <NavLink to="/" end>
            Destinations
          </NavLink>
          {user ? (
            <>
              <NavLink to="/bookings">My bookings</NavLink>
              <NavLink to="/account">{user.username}</NavLink>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/register" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
