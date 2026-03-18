const BASE_URL = '/api';

function getHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),
  me: (token) => request('GET', '/auth/me', null, token),

  sign: (body, token) => request('POST', '/sign', body, token),
  getSignatures: (token) => request('GET', '/sign', null, token),

  verifyById: (id) => request('GET', `/verify/${id}`, null),
  verifyManual: (body) => request('POST', '/verify', body),
};
