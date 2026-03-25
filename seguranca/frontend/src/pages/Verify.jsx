import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api.js';

export default function Verify() {
  const { id } = useParams();

  const [sigId, setSigId] = useState(id || '');
  const [idResult, setIdResult] = useState(null);
  const [idError, setIdError] = useState('');
  const [idLoading, setIdLoading] = useState(false);

  const [manual, setManual] = useState({ text: '', signature: '', publicKey: '' });
  const [manualResult, setManualResult] = useState(null);
  const [manualError, setManualError] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    if (id) verifyById(id);
  }, [id]);

  async function verifyById(targetId) {
    setIdError('');
    setIdResult(null);
    setIdLoading(true);
    try {
      const data = await api.verifyById(targetId || sigId);
      setIdResult(data);
    } catch (err) {
      setIdError(err.message);
    } finally {
      setIdLoading(false);
    }
  }

  async function onIdSubmit(e) {
    e.preventDefault();
    verifyById(sigId);
  }

  async function onManualSubmit(e) {
    e.preventDefault();
    setManualError('');
    setManualResult(null);
    setManualLoading(true);
    try {
      const data = await api.verifyManual(manual);
      setManualResult(data);
    } catch (err) {
      setManualError(err.message);
    } finally {
      setManualLoading(false);
    }
  }

  function onManualChange(e) {
    setManual((m) => ({ ...m, [e.target.name]: e.target.value }));
  }

  return (
    <div className="container">
      <h1>Verificar Assinatura</h1>
      <p className="subtitle">Verifique a autenticidade de uma assinatura digital.</p>

      <div className="card">
        <h2>Verificar por ID</h2>
        <form onSubmit={onIdSubmit}>
          <div className="form-group">
            <label className="form-label">ID da Assinatura</label>
            <input
              type="text"
              className="form-input"
              value={sigId}
              onChange={(e) => setSigId(e.target.value)}
              placeholder="Ex: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              required
            />
          </div>
          {idError && <div className="alert alert-error">{idError}</div>}
          <button type="submit" className="btn btn-primary" disabled={idLoading}>
            {idLoading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        {idResult && <VerifyResult result={idResult} />}
      </div>

      <div className="card">
        <h2>Verificacao Manual</h2>
        <p className="text-muted small mb-1">
          Importante: O texto deve ser identico ao original, incluindo espacos e quebras de linha.
        </p>
        <form onSubmit={onManualSubmit}>
          <div className="form-group">
            <label className="form-label">Texto original</label>
            <textarea
              className="form-textarea"
              name="text"
              rows={3}
              value={manual.text}
              onChange={onManualChange}
              placeholder="Cole o texto original aqui..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assinatura (base64)</label>
            <textarea
              className="form-textarea"
              name="signature"
              rows={3}
              value={manual.signature}
              onChange={onManualChange}
              placeholder="Cole a assinatura em base64..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Chave Publica (PEM)</label>
            <textarea
              className="form-textarea"
              name="publicKey"
              rows={6}
              value={manual.publicKey}
              onChange={onManualChange}
              placeholder={"-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"}
              required
            />
          </div>
          {manualError && <div className="alert alert-error">{manualError}</div>}
          <button type="submit" className="btn btn-primary" disabled={manualLoading}>
            {manualLoading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        {manualResult && (
          <div className="result-container">
            <div className={`result-header ${manualResult.result === 'VALID' ? 'valid' : 'invalid'}`}>
              {manualResult.result === 'VALID' ? 'ASSINATURA VALIDA' : 'ASSINATURA INVALIDA'}
            </div>
            <div className="result-body">
              <div className="result-row">
                <span className="result-label">Algoritmo</span>
                <span className="result-value">{manualResult.algorithm}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Verificado em</span>
                <span className="result-value">
                  {new Date(manualResult.verifiedAt).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyResult({ result }) {
  const isValid = result.result === 'VALID';
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);

  function copyToClipboard(text, setCopied) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadAsFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="result-container">
      <div className={`result-header ${isValid ? 'valid' : 'invalid'}`}>
        {isValid ? 'ASSINATURA VALIDA' : 'ASSINATURA INVALIDA'}
      </div>
      
      <div className="result-body">
        {isValid && (
          <>
            <div className="result-row">
              <span className="result-label">Signatario</span>
              <span className="result-value">
                {result.signer?.username} ({result.signer?.email})
              </span>
            </div>
            <div className="result-row">
              <span className="result-label">Algoritmo</span>
              <span className="result-value">{result.algorithm}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Data / Hora</span>
              <span className="result-value">
                {new Date(result.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="result-row">
              <span className="result-label">Hash SHA-256</span>
              <span className="result-value mono">{result.textHash}</span>
            </div>
            {result.textContent && (
              <div className="result-row">
                <span className="result-label">Texto assinado</span>
                <span className="result-value">{result.textContent}</span>
              </div>
            )}

            {/* Assinatura Base64 */}
            {result.signatureBase64 && (
              <div className="expandable-section">
                <div 
                  className="expandable-header"
                  onClick={() => setShowSignature(!showSignature)}
                >
                  <span className="expandable-title">Assinatura (base64)</span>
                  <span className="expandable-toggle">
                    {showSignature ? 'Ocultar' : 'Mostrar'}
                  </span>
                </div>
                {showSignature && (
                  <div className="expandable-content">
                    <div className="code-block">{result.signatureBase64}</div>
                    <div className="code-actions">
                      <button 
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => downloadAsFile(
                          result.signatureBase64, 
                          `assinatura_${result.signatureId}.txt`
                        )}
                      >
                        Download (.txt)
                      </button>
                      <button 
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => copyToClipboard(result.signatureBase64, setCopiedSig)}
                      >
                        {copiedSig ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chave Publica */}
            {result.publicKey && (
              <div className="expandable-section">
                <div 
                  className="expandable-header"
                  onClick={() => setShowPublicKey(!showPublicKey)}
                >
                  <span className="expandable-title">Chave Publica</span>
                  <span className="expandable-toggle">
                    {showPublicKey ? 'Ocultar' : 'Mostrar'}
                  </span>
                </div>
                {showPublicKey && (
                  <div className="expandable-content">
                    <div className="code-block">{result.publicKey}</div>
                    <div className="code-actions">
                      <button 
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => downloadAsFile(
                          result.publicKey, 
                          `chave_publica_${result.signer?.username || 'signer'}.txt`
                        )}
                      >
                        Download (.txt)
                      </button>
                      <button 
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => copyToClipboard(result.publicKey, setCopiedKey)}
                      >
                        {copiedKey ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
