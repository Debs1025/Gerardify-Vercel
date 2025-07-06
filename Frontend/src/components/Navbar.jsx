import { Link, useLocation } from 'react-router-dom'
import '../styles/components/Navbar.css'

function Navbar({ user, onLogout }) {
  const location = useLocation()

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Gerardify</Link>
      </div>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/search">Search</Link>
        <Link to="/library">Library</Link>
      </div>
      <div className="navbar-user">
        <span>Welcome, {user?.username}!</span>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar;