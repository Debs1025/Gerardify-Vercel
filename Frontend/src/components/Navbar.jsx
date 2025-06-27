import { Link, useLocation } from 'react-router-dom'
import '../styles/components/Navbar.css'

function Navbar() {
  const location = useLocation()

  return (
    <nav className="sidebar">
      <Link to="/" className="logo">
        <img src="/src/assets/logo.png" alt="Gerardify" />
        <h1>Gerardify</h1>
      </Link>
      
      <ul className="nav-links">
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link to="/">
            <i className="bi bi-house-door"></i>
            Home
          </Link>
        </li>
        <li className={location.pathname === '/library' ? 'active' : ''}>
          <Link to="/library">
            <i className="bi bi-music-note-list"></i>
            Your Library
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar