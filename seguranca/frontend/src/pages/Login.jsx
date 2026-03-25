import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(form);
      login(data.token, data.user);
      navigate('/sign');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card card-center">
        <h1>Entrar</h1>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              className="form-input"
              name="username" 
              value={form.username} 
              onChange={onChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              className="form-input"
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center mt-1">
          Nao tem conta? <Link to="/register">Cadastrar</Link>
        </p>
      </div>
    </div>
  );
}
