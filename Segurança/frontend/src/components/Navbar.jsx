import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🔐 Assinatura Digital</Link>
      </div>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/sign">Assinar</Link>
            <Link to="/verify">Verificar</Link>
            <span className="navbar-user">Olá, {user.username}</span>
            <button className="btn btn-sm btn-outline" onClick={handleLogout}>
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/verify">Verificar</Link>
            <Link to="/login">Entrar</Link>
            <Link to="/register" className="btn btn-sm btn-primary">
              Cadastrar
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
