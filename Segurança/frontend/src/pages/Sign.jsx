import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sign() {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getSignatures(token).then((d) => setHistory(d.signatures)).catch(() => {});
  }, [token]);

  async function onSign(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await api.sign({ text }, token);
      setResult(data);
      setHistory((h) => [
        {
          id: data.id,
          text_content: text,
          text_hash: data.textHash,
          signature: data.signature,
          algorithm: data.algorithm,
          created_at: data.createdAt,
        },
        ...h,
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(value) {
    navigator.clipboard.writeText(value);
  }

  return (
    <div>
      <h1>Assinar Texto</h1>
      <p className="subtitle">
        Digite um texto abaixo. O sistema calculará o hash SHA-256, assinará com sua chave privada
        RSA-2048 e armazenará a assinatura.
      </p>

      <form onSubmit={onSign} className="card">
        <label>
          Texto a assinar
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite aqui o texto que deseja assinar…"
            required
          />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading || !text.trim()}>
          {loading ? 'Assinando…' : '🔏 Assinar'}
        </button>
      </form>

      {result && (
        <div className="card result-card success">
          <h2>✅ Assinatura gerada!</h2>
          <div className="result-row">
            <span className="label">ID da Assinatura</span>
            <span className="value mono">{result.id}</span>
            <button className="btn btn-sm btn-outline" onClick={() => copyToClipboard(result.id)}>
              Copiar
            </button>
          </div>
          <div className="result-row">
            <span className="label">Algoritmo</span>
            <span className="value">{result.algorithm}</span>
          </div>
          <div className="result-row">
            <span className="label">Hash SHA-256</span>
            <span className="value mono break-all">{result.textHash}</span>
          </div>
          <div className="result-row">
            <span className="label">Assinatura (base64)</span>
            <span className="value mono break-all small">{result.signature.slice(0, 80)}…</span>
          </div>
          <Link to={`/verify/${result.id}`} className="btn btn-outline mt-1">
            🔍 Verificar esta assinatura
          </Link>
        </div>
      )}

      {history.length > 0 && (
        <div className="card mt-2">
          <h2>Histórico de Assinaturas</h2>
          <table className="sig-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Texto</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id}>
                  <td className="nowrap">{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                  <td className="truncate">{s.text_content}</td>
                  <td className="mono small">{s.id.slice(0, 8)}…</td>
                  <td>
                    <Link to={`/verify/${s.id}`} className="btn btn-sm btn-outline">
                      Verificar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
