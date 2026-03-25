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
  const [copied, setCopied] = useState('');

  useEffect(() => {
    api.getSignatures(token).then((d) => setHistory(d.signatures)).catch(() => { });
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
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(value, key) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="container">
      <h1>Assinar Texto</h1>
      <p className="subtitle">
        Digite um texto abaixo. O sistema calculara o hash SHA-256, assinara com sua chave privada
        RSA-2048 e armazenara a assinatura.
      </p>

      <div className="card">
        <h2>Novo documento</h2>
        <form onSubmit={onSign}>
          <div className="form-group">
            <label className="form-label">Texto a assinar</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite aqui o texto que deseja assinar..."
              required
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading || !text.trim()}>
            {loading ? 'Assinando...' : 'Assinar Documento'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <div className="result-header valid">
            Assinatura gerada com sucesso
          </div>
          <div className="result-body">
            <div className="result-row">
              <span className="result-label">ID da Assinatura</span>
              <span className="result-value mono">{result.id}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Algoritmo</span>
              <span className="result-value">{result.algorithm}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Hash SHA-256</span>
              <span className="result-value mono">{result.textHash}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Assinatura</span>
              <span className="result-value mono small">{result.signature.slice(0, 60)}...</span>
            </div>
          </div>
          <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className="btn btn-sm btn-secondary" 
              onClick={() => copyToClipboard(result.id, 'id')}
            >
              {copied === 'id' ? 'Copiado!' : 'Copiar ID'}
            </button>
            <Link to={`/verify/${result.id}`} className="btn btn-sm btn-primary">
              Verificar Assinatura
            </Link>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h2>Historico de Assinaturas</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Texto</th>
                  <th>ID</th>
                  <th>Acao</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(s.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="truncate">{s.text_content}</td>
                    <td className="mono small">{s.id.slice(0, 8)}...</td>
                    <td>
                      <Link to={`/verify/${s.id}`} className="btn btn-sm btn-secondary">
                        Verificar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
