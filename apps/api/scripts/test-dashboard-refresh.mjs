import assert from 'node:assert/strict';

if (process.env.NODE_ENV !== 'development')
  throw new Error('Local development only.');
const base = 'http://localhost:4000/api';
const login = await fetch(`${base}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@purposemint.local',
    password: 'PurposeMint123!',
    clientType: 'dashboard',
  }),
});
assert.equal(login.status, 200);
let auth = await login.json();
try {
  const cookie = login.headers
    .getSetCookie()
    .find((value) => value.startsWith('pm_refresh_token='));
  assert.ok(cookie?.includes('Path=/api/auth/refresh'));
  assert.ok(cookie.includes('HttpOnly'));
  const refreshed = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie.split(';')[0],
    },
    body: '{}',
  });
  assert.equal(refreshed.status, 200);
  auth = await refreshed.json();
  assert.ok(auth.accessToken);
  assert.equal(auth.refreshToken, undefined);
  const rotated = refreshed.headers
    .getSetCookie()
    .find((value) => value.startsWith('pm_refresh_token='));
  assert.ok(rotated?.includes('Path=/api/auth/refresh'));
  assert.notEqual(rotated.split(';')[0], cookie.split(';')[0]);
  const me = await fetch(`${base}/users/me`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  assert.equal(me.status, 200);
  console.log(
    'Dashboard cookie refresh passed: correct path, HttpOnly, rotation, and authenticated request.',
  );
} finally {
  await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
}
