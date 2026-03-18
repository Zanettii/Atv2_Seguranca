import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
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
      const data = await api.register(form);
      login(data.token, data.user);
      navigate('/sign');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card center-card">
      <h1>Criar conta</h1>
      <p className="subtitle">
        Um par de chaves RSA-2048 será gerado e armazenado para você.
      </p>
      <form onSubmit={onSubmit}>
        <label>
          Username
          <input name="username" value={form.username} onChange={onChange} required />
        </label>
        <label>
          E-mail
          <input type="email" name="email" value={form.email} onChange={onChange} required />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            minLength={6}
          />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Gerando chaves…' : 'Cadastrar'}
        </button>
      </form>
      <p className="text-center mt-1">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
