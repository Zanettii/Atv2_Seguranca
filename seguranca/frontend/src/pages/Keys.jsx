import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Keys() {
  const { token } = useAuth();
  const [keyData, setKeyData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .me(token)
      .then((d) => setKeyData(d.keyPair))
      .catch(() => setError('Erro ao carregar as chaves.'))
      .finally(() => setLoading(false));
  }, [token]);

  function copyToClipboard(value) {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadPublicKey() {
    const blob = new Blob([keyData.public_key], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'public_key.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <h1>Minhas Chaves</h1>
      <p className="subtitle">
        Gerencie seu par de chaves RSA-2048 para assinaturas digitais.
      </p>

      {loading && <p>Carregando...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {keyData && (
        <>
          <div className="card key-card">
            <h2>Chave Publica</h2>
            <p className="key-description">
              Compartilhe esta chave para que outros possam verificar suas assinaturas.
            </p>
            <div className="key-box">{keyData.public_key}</div>
            <div className="key-actions">
              <button className="btn btn-primary btn-sm" onClick={downloadPublicKey}>
                Download (.txt)
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyToClipboard(keyData.public_key)}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="card key-card">
            <h2>Chave Privada</h2>
            <p className="key-description">
              Sua chave privada esta armazenada de forma segura e criptografada no servidor.
              Por seguranca, ela nao pode ser visualizada ou exportada.
            </p>
            <div className="key-box" style={{ color: 'var(--text-muted)' }}>
              [Chave privada protegida - nao disponivel para visualizacao]
            </div>
          </div>

          <div className="card">
            <h2>Informacoes do Par de Chaves</h2>
            <div style={{ marginTop: '0.75rem' }}>
              <div className="result-row">
                <span className="result-label">Algoritmo</span>
                <span className="result-value">RSA-SHA256</span>
              </div>
              <div className="result-row">
                <span className="result-label">Tamanho</span>
                <span className="result-value">2048 bits</span>
              </div>
              <div className="result-row">
                <span className="result-label">Criado em</span>
                <span className="result-value">
                  {keyData.created_at ? new Date(keyData.created_at).toLocaleString('pt-BR') : '-'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
