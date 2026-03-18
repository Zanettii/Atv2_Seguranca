import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api.js';

export default function Verify() {
  const { id } = useParams();

  // Mode 1: verify by ID
  const [sigId, setSigId] = useState(id || '');
  const [idResult, setIdResult] = useState(null);
  const [idError, setIdError] = useState('');
  const [idLoading, setIdLoading] = useState(false);

  // Mode 2: verify by pasting text + signature + publicKey
  const [manual, setManual] = useState({ text: '', signature: '', publicKey: '' });
  const [manualResult, setManualResult] = useState(null);
  const [manualError, setManualError] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Auto-verify if ID provided via URL
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
    <div>
      <h1>Verificar Assinatura</h1>
      <p className="subtitle">Rota pública — qualquer pessoa pode verificar uma assinatura.</p>

      {/* --- Verify by ID --- */}
      <div className="card">
        <h2>Verificar por ID</h2>
        <form onSubmit={onIdSubmit}>
          <label>
            ID da Assinatura
            <input
              value={sigId}
              onChange={(e) => setSigId(e.target.value)}
              placeholder="Ex: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              required
            />
          </label>
          {idError && <div className="alert alert-error">{idError}</div>}
          <button type="submit" className="btn btn-primary" disabled={idLoading}>
            {idLoading ? 'Verificando…' : '🔍 Verificar'}
          </button>
        </form>

        {idResult && <VerifyResult result={idResult} />}
      </div>

      {/* --- Manual verify --- */}
      <div className="card mt-2">
        <h2>Verificação Manual (colar texto + assinatura)</h2>
        <form onSubmit={onManualSubmit}>
          <label>
            Texto original
            <textarea
              name="text"
              rows={4}
              value={manual.text}
              onChange={onManualChange}
              placeholder="Cole o texto original aqui…"
              required
            />
          </label>
          <label>
            Assinatura (base64)
            <textarea
              name="signature"
              rows={3}
              value={manual.signature}
              onChange={onManualChange}
              placeholder="Cole a assinatura em base64…"
              required
            />
          </label>
          <label>
            Chave Pública (PEM)
            <textarea
              name="publicKey"
              rows={6}
              value={manual.publicKey}
              onChange={onManualChange}
              placeholder="-----BEGIN PUBLIC KEY-----&#10;…&#10;-----END PUBLIC KEY-----"
              required
            />
          </label>
          {manualError && <div className="alert alert-error">{manualError}</div>}
          <button type="submit" className="btn btn-primary" disabled={manualLoading}>
            {manualLoading ? 'Verificando…' : '🔍 Verificar'}
          </button>
        </form>

        {manualResult && (
          <div className={`result-badge ${manualResult.result === 'VALID' ? 'valid' : 'invalid'}`}>
            {manualResult.result === 'VALID' ? '✅ ASSINATURA VÁLIDA' : '❌ ASSINATURA INVÁLIDA'}
            <div className="result-meta">Algoritmo: {manualResult.algorithm}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyResult({ result }) {
  const isValid = result.result === 'VALID';
  return (
    <div className={`result-badge ${isValid ? 'valid' : 'invalid'} mt-1`}>
      <div className="result-status">
        {isValid ? '✅ ASSINATURA VÁLIDA' : '❌ ASSINATURA INVÁLIDA'}
      </div>
      {isValid && (
        <div className="result-details">
          <div className="result-row">
            <span className="label">Signatário</span>
            <span className="value">{result.signer?.username} ({result.signer?.email})</span>
          </div>
          <div className="result-row">
            <span className="label">Algoritmo</span>
            <span className="value">{result.algorithm}</span>
          </div>
          <div className="result-row">
            <span className="label">Data / Hora</span>
            <span className="value">
              {new Date(result.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="result-row">
            <span className="label">Hash SHA-256</span>
            <span className="value mono small break-all">{result.textHash}</span>
          </div>
          {result.textContent && (
            <div className="result-row">
              <span className="label">Texto assinado</span>
              <span className="value">{result.textContent}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
