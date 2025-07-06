import { Link, useLocation } from 'react-router-dom'
import '../styles/components/Navbar.css'

function Navbar({ user, onLogout }) {
  const location = useLocation()

  return (
    <nav className="sidebar">
      <Link to="/" className="logo">
        <div className="logo-icon">
          <div className="logo-triangle"></div>
        </div>
        <h1>Gerardify</h1>
      </Link>
      
      <ul className="nav-links">
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link to="/">
            <i className="bi bi-house"></i>
            Home
          </Link>
        </li>
        <li className={location.pathname === '/search' ? 'active' : ''}>
          <Link to="/search">
            <i className="bi bi-search"></i>
            Search
          </Link>
        </li>
        <li className={location.pathname === '/library' ? 'active' : ''}>
          <Link to="/library">
            <i className="bi bi-collection"></i>
            Your Library
          </Link>
        </li>
      </ul>
      
      <div className="navbar-user">
        <div className="user-info">
          <span>Welcome back,</span>
          <strong>{user?.username}!</strong>
        </div>
        <button onClick={onLogout} className="logout-button">
          <i className="bi bi-box-arrow-right"></i>
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar;