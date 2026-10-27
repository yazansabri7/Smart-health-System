import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import { ROLE_HOME, tokenFromResponse, validateToken } from '../src/auth/jwt.js';
import { createSessionStore } from '../src/auth/session.js';
import { signIn } from '../src/auth/login.js';
import { createApiClient } from '../src/api/client.js';

const uri = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const future = () => Math.floor(Date.now() / 1000) + 600;
const encode = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const jwt = (claims, header = { alg: 'HS256', typ: 'JWT' }) => `${encode(header)}.${encode({ exp: future(), ...claims })}.c2ln`;
const rejectCode = (fn, code) => assert.throws(fn, error => error.code === code);

for (const role of Object.keys(ROLE_HOME)) {
  test(`${role}: URI role, short role, roles array, repeated equivalent claims and commas`, () => {
    for (const claims of [{ [uri]: role }, { role }, { roles: [role] }, { role: ` ${role.toLowerCase()} , ${role} `, [uri]: role, roles: [role, role] }]) {
      assert.equal(validateToken(jwt(claims)).role, role);
    }
  });
  test(`${role}: login makes one request and returns the correct dashboard`, async () => {
    const store = createSessionStore();
    let count = 0;
    const client = { async post(path, credentials, config) {
      count++;
      assert.equal(path, '/Account/Login');
      assert.equal(credentials.email, 'test@example.invalid');
      assert.equal(config.publicAuth, true);
      return { data: { success: true, token: jwt({ [uri]: role }), role: 'UntrustedRole' } };
    } };
    try {
      assert.equal(await signIn({ email: 'test@example.invalid', password: 'Synthetic1!' }, client, store), ROLE_HOME[role]);
      assert.equal(store.getSnapshot().session.role, role);
      assert.equal(count, 1);
    } finally { store.logout(); }
  });
}

const invalidClaims = [
  ['missing role', {}, 'missing_role'],
  ['unknown role', { role: 'Superuser' }, 'unsupported_role'],
  ['unknown alongside recognized role', { role: 'Patient,Superuser' }, 'unsupported_role'],
  ['conflicting commas', { role: 'Patient,Doctor' }, 'ambiguous_role'],
  ['conflicting array', { roles: ['Patient', 'Admin'] }, 'ambiguous_role'],
  ['conflicting claim keys', { role: 'Patient', [uri]: 'Doctor' }, 'ambiguous_role'],
  ['object role', { role: { name: 'Patient' } }, 'invalid_role'],
  ['null role', { role: null }, 'invalid_role'],
  ['number role', { role: 1 }, 'invalid_role'],
  ['empty array', { roles: [] }, 'invalid_role'],
  ['nested array', { roles: [['Patient']] }, 'invalid_role'],
  ['trailing comma', { role: 'Patient,' }, 'invalid_role'],
  ['empty role', { role: '' }, 'invalid_role'],
  ['expired token', { role: 'Patient', exp: 1 }, 'expired'],
  ['expiry boundary', { role: 'Patient', exp: 100 }, 'expired', 100000],
  ['string expiration', { role: 'Patient', exp: '9999999999' }, 'invalid_token'],
  ['missing expiration', { role: 'Patient', exp: undefined }, 'invalid_token'],
  ['null expiration', { role: 'Patient', exp: null }, 'invalid_token'],
  ['negative expiration', { role: 'Patient', exp: -1 }, 'invalid_token'],
  ['extreme expiration', { role: 'Patient', exp: 1e99 }, 'invalid_token'],
  ['not yet valid', { role: 'Patient', nbf: future() }, 'invalid_token'],
  ['invalid not-before', { role: 'Patient', nbf: '0' }, 'invalid_token'],
  ['invalid issued-at', { role: 'Patient', iat: {} }, 'invalid_token'],
];
for (const [name, claims, code, now] of invalidClaims) {
  test(`reject ${name}`, () => rejectCode(() => validateToken(jwt(claims), now), code));
}

for (const [name, token] of [
  ['non-string', null], ['empty', ''], ['not JWT', 'bad-token'],
  ['bad base64', '!!!.!!!.c2ln'], ['empty signature', `${encode({alg:'HS256'})}.${encode({role:'Patient', exp:future()})}.`],
  ['unsigned JWT', jwt({role:'Patient'}, {alg:'none'})],
  ['invalid JSON', `${encode({alg:'HS256'})}.${encode('{broken')}.c2ln`],
  ['array payload', `${encode({alg:'HS256'})}.${encode([])}.c2ln`],
  ['duplicate role', `${encode({alg:'HS256'})}.${encode(`{"role":"Doctor","role":"Patient","exp":${future()}}`)}.c2ln`],
  ['escaped duplicate role', `${encode({alg:'HS256'})}.${encode(`{"role":"Doctor","r\\u006fle":"Patient","exp":${future()}}`)}.c2ln`],
  ['duplicate expiry', `${encode({alg:'HS256'})}.${encode(`{"role":"Patient","exp":1,"exp":${future()}}`)}.c2ln`],
  ['duplicate algorithm', `${encode('{"alg":"none","alg":"HS256"}')}.${encode({role:'Patient',exp:future()})}.c2ln`],
]) test(`reject malformed token: ${name}`, () => rejectCode(() => validateToken(token), 'invalid_token'));

test('accept only the confirmed token response field', () => {
  assert.equal(tokenFromResponse({ token:'jwt' }), 'jwt');
  for (const data of [null, [], {}, {accessToken:'jwt'}, {data:{success:true,token:'jwt'}}, {token:null}, {token:''}, {token:[]}, {role:'Patient'}]) {
    rejectCode(() => tokenFromResponse(data), 'invalid_token');
  }
});

test('each invalid login clears an existing session; no fallback or retry', async () => {
  for (const [, claims, code] of invalidClaims.filter(item=>item[3]===undefined)) {
    const store = createSessionStore();
    store.establish(jwt({role:'Admin'}),store.beginLogin());
    let count = 0;
    await assert.rejects(signIn({}, { async post() { count++; return {data:{success:true,token:jwt(claims)}}; } }, store), error=>error.code===code);
    assert.equal(store.getSnapshot().session,null);
    assert.equal(count,1);
    store.logout();
  }
});

for (const [name, error, code] of [
  ['invalid credentials',{response:{status:400,data:{message:'Invalid email or password'}}},'credentials'],
  ['unknown backend failure',{response:{status:403}},'failed'],
  ['network failure',new Error('offline'),'network'],
  ['server failure',{response:{status:500}},'failed'],
]) test(`login ${name}: one request, safe error, no fallback`, async () => {
  const store = createSessionStore();
  let requests=0;
  await assert.rejects(signIn({}, {async post(){requests++;throw error;}},store), result=>result.code===code);
  assert.equal(requests,1);
  assert.equal(store.getSnapshot().session,null);
});

test('session changes and logout clear the provided query client; logout cancels late login', () => {
  let clears=0;
  const store = createSessionStore({queryClient:{clear(){clears++;}}});
  let updates=0;
  const unsubscribe=store.subscribe(()=>updates++);
  const version=store.beginLogin();
  store.establish(jwt({role:'Patient'}),version);
  store.logout();
  assert.equal(store.getSnapshot().session,null);
  assert.equal(clears,3);
  assert.equal(updates,3);
  rejectCode(()=>store.establish(jwt({role:'Admin'}),version),'cancelled');
  unsubscribe();
});

test('sessions without browser storage are revalidated on access', () => {
  let now=100000;
  const store=createSessionStore({now:()=>now});
  store.establish(jwt({role:'Patient',exp:101}),store.beginLogin());
  assert.equal(createSessionStore().getSnapshot().session,null);
  now=101000;
  assert.equal(store.getValidSession(),null);
  assert.equal(store.getSnapshot().reason,'expired');
});

test('expiry timer invalidates an idle session', async () => {
  const store=createSessionStore();
  store.establish(jwt({role:'Patient',exp:(Date.now()+80)/1000}),store.beginLogin());
  await new Promise(resolve=>setTimeout(resolve,120));
  assert.equal(store.getSnapshot().session,null);
  assert.equal(store.getSnapshot().reason,'expired');
});

test('late login and stale API errors cannot replace or invalidate a new session', async () => {
  const store=createSessionStore();
  let resolve;
  const oldLogin=signIn({}, {post:()=>new Promise(r=>{resolve=r;})},store);
  const oldVersion=store.getSnapshot().version;
  const version=store.beginLogin();
  store.establish(jwt({role:'Admin'}),version);
  resolve({data:{success:true,token:jwt({role:'Patient'})}});
  await assert.rejects(oldLogin,error=>error.code==='cancelled');
  store.handleHttpError(401,oldVersion);
  assert.equal(store.getSnapshot().session.role,'Admin');
  store.logout();
});

for (const status of [401,403]) test(`API ${status}: intercepted response and correct session handling`, async () => {
  const store=createSessionStore();
  const session=store.establish(jwt({role:'Patient'}),store.beginLogin());
  const api=createApiClient('https://example.invalid/api',store);
  let count=0;
  api.defaults.adapter=async config=>{
    count++;
    assert.equal(config.headers.get('Authorization'),`Bearer ${session.token}`);
    throw new AxiosError('Synthetic rejection','ERR_BAD_REQUEST',config,null,{status,data:{},config});
  };
  await assert.rejects(api.get('/Readings'));
  assert.equal(count,1);
  assert.equal(Boolean(store.getSnapshot().session),status===403);
  assert.equal(store.getSnapshot().forbidden,status===403);
  if(status===403) {store.dismissForbidden();assert.equal(store.getSnapshot().forbidden,false);}
  store.logout();
});

test('public login requests never receive a bearer token; credentials are not retried', async () => {
  const store=createSessionStore();
  store.establish(jwt({role:'Admin'}),store.beginLogin());
  const api=createApiClient('https://example.invalid/api',store);
  let count=0;
  api.defaults.adapter=async config=>{
    count++;
    assert.equal(config.headers.has('Authorization'),false);
    throw new AxiosError('Synthetic rejection','ERR_BAD_REQUEST',config,null,{status:401,data:{message:'Invalid email or password'},config});
  };
  await assert.rejects(signIn({},api,store),error=>error.code==='credentials');
  assert.equal(count,1);
  assert.equal(store.getSnapshot().session,null);
});

test('API never dispatches bearer tokens to an untrusted origin or path',async()=>{
  const store=createSessionStore();
  store.establish(jwt({role:'Patient'}),store.beginLogin());
  const api=createApiClient('https://example.invalid/api',store);
  let count=0;
  api.defaults.adapter=async config=>{count++;return {status:200,data:{},config};};
  await assert.rejects(api.get('https://other.invalid/api/Readings'));
  await assert.rejects(api.get('https://example.invalid/other'));
  assert.equal(count,0);
  store.logout();
});

function testStorage() {
  const items = new Map();
  return {
    getItem(key) { return items.get(key) ?? null; },
    setItem(key, value) { items.set(key, value); },
    removeItem(key) { items.delete(key); },
  };
}

for (const [message, code] of [
  ['Invalid email or password', 'credentials'],
  ['Account is locked out , please try again later', 'locked'],
  ['Account is locked duo to multiple failed login attempts', 'locked'],
  ['Email is not confirmed , please confirm your email', 'unconfirmed'],
  ['Login failed', 'failed'],
  ['Internal database exception: secret details', 'failed'],
]) {
  for (const status of [200, 400]) {
    test(`${status}: backend message maps to ${code} without saving a token`, async () => {
      const storage = testStorage();
      const store = createSessionStore({ storage });
      let requests = 0;
      const client = { async post() {
        requests++;
        const data = { success: false, message, token: jwt({ role: 'Admin' }) };
        if (status === 400) throw { response: { status, data } };
        return { data };
      } };
      await assert.rejects(signIn({}, client, store), error => error.code === code && !error.message.includes('secret details'));
      assert.equal(storage.getItem('authToken'), null);
      assert.equal(store.getSnapshot().session, null);
      assert.equal(requests, 1);
    });
  }
}

test('successful login saves the validated token, restores it on refresh, and removes it on logout', async () => {
  const storage = testStorage();
  const store = createSessionStore({ storage });
  const token = jwt({ role: 'Doctor' });
  const client = { async post() { return { data: { success: true, token } }; } };
  assert.equal(await signIn({}, client, store), '/doctor');
  assert.equal(storage.getItem('authToken'), token);
  const refreshed = createSessionStore({ storage });
  assert.equal(refreshed.getSnapshot().session.role, 'Doctor');
  refreshed.logout();
  assert.equal(storage.getItem('authToken'), null);
  store.logout();
});

for (const token of ['broken', jwt({role:'Patient', exp:1}), jwt({role:'Patient,Admin'})]) {
  test('invalid saved token is rejected and removed before rendering', () => {
    const storage = testStorage();
    storage.setItem('authToken', token);
    const store = createSessionStore({ storage });
    assert.equal(store.getSnapshot().session, null);
    assert.equal(storage.getItem('authToken'), null);
  });
}

test('a token without explicit success true cannot establish authentication', async () => {
  const storage = testStorage();
  const store = createSessionStore({ storage });
  await assert.rejects(signIn({}, { async post() { return { data: { token: jwt({role:'Patient'}) } }; } }, store), error => error.code === 'failed');
  assert.equal(storage.getItem('authToken'), null);
});
