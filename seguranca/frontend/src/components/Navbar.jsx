import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function isActive(path) {
    return location.pathname === path ? 'navbar-link active' : 'navbar-link';
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">DS</span>
          <span>Digital Sign</span>
        </Link>

        <div className="navbar-nav">
          {user ? (
            <>
              <Link to="/sign" className={isActive('/sign')}>Assinar</Link>
              <Link to="/verify" className={isActive('/verify')}>Verificar</Link>
              <Link to="/keys" className={isActive('/keys')}>Chaves</Link>
              <div className="navbar-divider"></div>
              <div className="navbar-user">
                <span className="navbar-username">{user.username}</span>
                <button type="button" className="navbar-btn" onClick={handleLogout}>
                  Sair
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/verify" className={isActive('/verify')}>Verificar</Link>
              <div className="navbar-divider"></div>
              <Link to="/login" className="navbar-btn">Entrar</Link>
              <Link to="/register" className="navbar-btn navbar-btn-primary">Cadastrar</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
