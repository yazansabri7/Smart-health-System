import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Uses a real headless browser with intercepted synthetic API responses only.
const browserPath = [process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean).find(path => existsSync(path));
assert.ok(browserPath, 'Chrome/Edge is required; set CHROME_PATH to the browser executable.');
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function until(check, message, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { if (await check()) return; } catch { /* The browser/server may still be starting. */ }
    await delay(80);
  }
  throw new Error(`Timed out: ${message}`);
}
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const promise = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) promise?.reject(new Error(message.error.message)); else promise?.resolve(message.result);
    } else events.get(message.method)?.(message.params);
  });
  return {
    send(method, params = {}) { return new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); }); },
    on(method, callback) { events.set(method, callback); },
    close() { socket.close(); },
  };
}
const appPort = await freePort();
const debugPort = await freePort();
const origin = `http://127.0.0.1:${appPort}`;
const profile = mkdtempSync(join(tmpdir(), 'smartdhp-auth-test-'));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], { windowsHide: true, stdio: 'ignore' });
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let page;
let controller;
let passed = 0;
let synthetic = { status: 200, body: {} };
let loginRequests = 0;
let submittedHistory;
const accountRequests = [];
const readingRequests = [];
let readingStatus = 200;
const failures = [];
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = claims => `${encode({alg:'HS256',typ:'JWT'})}.${encode({exp:Math.floor(Date.now()/1000)+600,...claims})}.c2ln`;
const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
try {
  await until(async () => (await fetch(origin)).ok, 'Vite startup', 20000);
  await until(async () => (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok, 'headless Chrome startup', 20000);
  controller = await connect((await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json()).webSocketDebuggerUrl);
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  page = await connect(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  const send = page.send;
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function check(expression, label) {
    await until(() => evaluate(expression), label);
    passed++;
    console.log(`PASS ${label}`);
  }
  async function navigate(path) {
    await send('Page.navigate', { url: `${origin}${path}` });
    await check(`!!document.querySelector('#root')?.children.length`, `render ${path}`);
  }
  async function spa(path) {
    await evaluate(`history.pushState({}, '', ${JSON.stringify(path)}); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await delay(100);
  }
  async function submit(response) {
    synthetic = response;
    await navigate('/login');
    await check(`!!document.querySelector('input[type="email"]')`, 'login form available');
    await evaluate(`document.querySelector('input[type="email"]').focus()`);
    await send('Input.insertText', { text: 'synthetic@example.invalid' });
    await evaluate(`document.querySelector('input[name="password"]').focus()`);
    await send('Input.insertText', { text: 'Synthetic1!' });
    const count = loginRequests;
    submittedHistory = await send('Page.getNavigationHistory');
    await evaluate(`document.querySelector('button[type="submit"]').click()`);
    await until(() => loginRequests === count + 1, 'single login request');
    return count;
  }
  async function login(role, claims = {}) {
    await submit({status:200,body:{success:true,token:token({[roleClaim]:role,...claims})}});
    await check(`location.pathname === '/${role.toLowerCase()}' && !!document.querySelector('nav')`, `${role} login redirect and protected dashboard`);
  }
  async function fillField(name, value) {
    const selector = `input[name="${name}"]`;
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await send('Input.insertText', { text: String(value) });
  }
  async function selectOption(name, value) {
    await evaluate(`document.querySelector('input[name="${name}"]').closest('.MuiInputBase-root').querySelector('[role="combobox"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))`);
    await check(`!!document.querySelector('[role="option"][data-value="${value}"]')`, `${name} options available`);
    await evaluate(`document.querySelector('[role="option"][data-value="${value}"]').click()`);
  }
  async function captureAppearance(name) {
    if (!process.env.REFACTOR_SNAPSHOTS) return;
    await evaluate('document.activeElement?.blur()');
    await evaluate('document.fonts.ready');
    await delay(250);
    const folder = process.env.REFACTOR_SNAPSHOTS;
    mkdirSync(folder, { recursive: true });
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const picture = Buffer.from(screenshot.data, 'base64');
    const file = join(folder, `${name}.png`);
    if (process.env.REFACTOR_COMPARE === '1') {
      assert.ok(picture.equals(readFileSync(file)), `${name}: screenshot matches the pre-refactor baseline`);
      passed++;
      console.log(`PASS ${name}: identical screenshot`);
    } else {
      writeFileSync(file, picture);
    }
  }
  page.on('Runtime.exceptionThrown', () => failures.push('Uncaught browser exception'));
  page.on('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const url = new URL(request.url);
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) { await send('Fetch.continueRequest', {requestId}); return; }
      const headers = [
        {name:'Access-Control-Allow-Origin',value:'*'},
        {name:'Access-Control-Allow-Headers',value:'*'},
        {name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,OPTIONS'},
        {name:'Content-Type',value:'application/json'},
      ];
      if (request.method === 'OPTIONS') { await send('Fetch.fulfillRequest',{requestId,responseCode:204,responseHeaders:headers}); return; }
      if (url.pathname.endsWith('/Account/Login')) {
        loginRequests++;
        if(synthetic.network) { await send('Fetch.failRequest',{requestId,errorReason:'ConnectionFailed'}); return; }
        await send('Fetch.fulfillRequest',{requestId,responseCode:synthetic.status,responseHeaders:headers,body:Buffer.from(JSON.stringify(synthetic.body)).toString('base64')});
        return;
      }
      if (url.pathname.endsWith('/Synthetic401') || url.pathname.endsWith('/Synthetic403')) {
        const status = url.pathname.endsWith('/Synthetic401') ? 401 : 403;
        await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:headers,body:Buffer.from('{}').toString('base64')});
        return;
      }
      if (url.pathname.endsWith('/Readings')) {
        readingRequests.push({ method: request.method, data: JSON.parse(request.postData), authenticated: !!request.headers.Authorization });
        await delay(250);
        await send('Fetch.fulfillRequest', { requestId, responseCode: readingStatus, responseHeaders: headers, body: Buffer.from('{}').toString('base64') });
        return;
      }
      if (['/Account/RegisterPatient', '/Account/RegisterDoctor', '/Account/SendCode', '/Account/ResetPassword'].some(path => url.pathname.endsWith(path))) {
        accountRequests.push({ path: url.pathname, method: request.method, data: JSON.parse(request.postData) });
        await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: headers, body: Buffer.from(JSON.stringify({ success: true, message: 'Synthetic success' })).toString('base64') });
        return;
      }
      // Block all other external requests, including fonts: no live backend access.
      await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:headers,body:''});
    } catch { failures.push('Request interception failed'); }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Fetch.enable', {patterns:[{urlPattern:'*',requestStage:'Request'}]});
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  for(const path of ['/patient','/patient/readings','/doctor','/admin','/admin/private']) {
    await navigate(path);
    await check(`location.pathname === '/login' && !document.querySelector('nav')`, `${path}: direct unauthenticated URL rejected`);
  }
  for (const path of ['/anything123', '/unknown-page']) {
    await navigate(path);
    await check(`location.pathname === '${path}' && document.querySelector('h1')?.textContent.includes('Page Not Found') && !document.querySelector('nav')`, `${path}: public NotFound`);
    await evaluate(`document.querySelector('a[href="/login"]').click()`);
    await check(`location.pathname === '/login'`, '404 Go to Login works');
  }
  for (const badToken of ['malformed', token({ role: 'Patient', exp: 1 }), token({ role: 'Patient,Admin' })]) {
    await evaluate(`localStorage.setItem('authToken', ${JSON.stringify(badToken)})`);
    await spa('/patient/readings');
    await check(`location.pathname === '/login' && localStorage.getItem('authToken') === null && !document.querySelector('nav')`, 'invalid saved JWT rejected before protected content');
  }
  for(const role of ['Patient','Doctor','Admin']) {
    await login(role);
    const home=`/${role.toLowerCase()}`;
    const history=await send('Page.getNavigationHistory');
    assert.equal(new URL(history.entries[history.currentIndex].url).pathname,home);
    assert.equal(history.currentIndex,submittedHistory.currentIndex,'successful login replaces its login history entry');
    assert.equal(history.entries.length,submittedHistory.entries.length,'successful login does not add a history entry');
    passed++; console.log(`PASS ${role}: login uses history replacement`);
    for(const other of ['patient','doctor','admin'].filter(value=>`/${value}`!==home)) {
      await spa(`/${other}`);
      await check(`location.pathname === '/unauthorized' && document.querySelector('h1')?.textContent.includes('Access Denied') && !document.querySelector('nav')`, `${role} cannot open /${other}`);
      await evaluate(`document.querySelector('a[href="/login"]').click()`);
      await check(`location.pathname === '/login'`, `${role}: 403 Go to Login works`);
      await spa(home);
      await check(`location.pathname === '${home}' && !!document.querySelector('nav')`, `${role} returns only to own dashboard`);
      await spa(`/${other}/not-existing-page`);
      await check(`location.pathname === '/unauthorized' && !document.querySelector('nav')`, `${role}: wrong-role wildcard is protected before NotFound`);
      await evaluate(`document.querySelector('a[href="/login"]').click()`);
      await check(`location.pathname === '/login'`, 'wrong-role wildcard Go to Login');
      await spa(home);
      await check(`location.pathname === '${home}' && !!document.querySelector('nav')`, 'return to own role after wildcard denial');
    }
    await check(`[...document.querySelectorAll('nav a')].every(a=>a.pathname==='${home}'||a.pathname.startsWith('${home}/'))`, `${role} navigation contains only its own routes`);
    await spa(home + '/not-existing-page');
    await check(`location.pathname === '${home}/not-existing-page' && document.querySelector('h1')?.textContent.includes('Page Not Found') && !document.querySelector('nav')`, `${role}: authorized unknown child shows NotFound`);
    await evaluate(`document.querySelector('a[href="/login"]').click()`);
    await check(`location.pathname === '/login'`, `${role}: protected 404 Go to Login works`);
    await spa(home);
    await check(`location.pathname === '${home}' && !!document.querySelector('nav')`, `${role}: existing dashboard remains available`);
  }
  await login('Patient');
  const savedToken=synthetic.body.token;
  await check(`localStorage.getItem('authToken')===${JSON.stringify(savedToken)}`, 'validated JWT is saved as authToken');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await delay(200);
    await check(`!!document.querySelector('main h2')`, `${width}px: dashboard content remains available`);
    await captureAppearance(`patient-light-${width}`);
    await evaluate(`document.querySelector('[aria-label="Switch to dark mode"]').click()`);
    await check(`localStorage.getItem('dashboard-color-mode') === 'dark'`, `${width}px: dark mode persists`);
    await captureAppearance(`patient-dark-${width}`);
    await evaluate(`document.querySelector('[aria-label="Switch to light mode"]').click()`);
    if (width < 768) {
      await evaluate(`document.querySelector('[aria-label="Toggle sidebar"]').click()`);
      await check(`!!document.querySelector('nav a[href="/patient/readings"]')`, `${width}px: mobile drawer opens`);
      await evaluate(`document.querySelector('nav a[href="/patient/readings"]').click()`);
      await check(`location.pathname === '/patient/readings' && !document.querySelector('nav')`, `${width}px: drawer closes after navigation`);
      await spa('/patient');
    }
  }
  await evaluate(`document.querySelector('[aria-label="Toggle sidebar"]').click()`);
  await check(`document.querySelector('[aria-label="Toggle sidebar"]').getAttribute('aria-expanded') === 'false'`, 'desktop sidebar collapses');
  await evaluate(`document.querySelector('[aria-label="Toggle sidebar"]').click()`);
  await check(`document.querySelector('[aria-label="Toggle sidebar"]').getAttribute('aria-expanded') === 'true'`, 'desktop sidebar expands');
  for (const [route, title] of [['/patient', 'Dashboard'], ['/patient/readings', 'Health Readings'], ['/patient/medications', 'Medications'], ['/patient/doctors', 'My Doctors'], ['/patient/messages', 'Messages'], ['/patient/alerts', 'Alerts'], ['/patient/predictions', 'AI Predictions'], ['/patient/profile', 'Profile']]) {
    await evaluate(`document.querySelector('nav a[href="${route}"]').click()`);
    await check(`document.querySelector('h1').textContent === ${JSON.stringify(title)} && document.querySelectorAll('nav a.active').length === 1 && document.querySelector('nav a.active').getAttribute('href') === '${route}'`, `${route}: title and active navigation`);
  }
  await spa('/patient/readings');
  await check(`document.querySelector('main h2')?.textContent==='Health Readings'`, 'patient nested Outlet remains functional');
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await check(`document.body.textContent.includes('Systolic is required') && document.body.textContent.includes('Diastolic is required')`, 'empty pressure values are rejected');
  assert.equal(readingRequests.length, 0);
  for (const [type, values] of [
    ['pressure', { systolic: '120', diastolic: '80' }],
    ['glucose', { glucoseLevel: '100.5' }],
    ['both', { systolic: '120', diastolic: '80', glucoseLevel: '100' }],
  ]) {
    await selectOption('readingType', type);
    await check(`!!document.querySelector('input[name="systolic"]') === ${type !== 'glucose'} && !!document.querySelector('input[name="glucoseLevel"]') === ${type !== 'pressure'}`, `${type}: only relevant fields appear`);
    for (const [name, value] of Object.entries(values)) await fillField(name, value);
    const before = readingRequests.length;
    await evaluate(`document.querySelector('button[type="submit"]').click()`);
    await check(`document.querySelector('button[type="submit"]').disabled`, `${type}: submission disabled while saving`);
    await check(`document.body.textContent.includes('Your reading has been saved successfully.')`, `${type}: success feedback`);
    assert.equal(readingRequests.length, before + 1);
    assert.deepEqual(readingRequests.at(-1).data, Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Number(value)])));
    assert.equal(readingRequests.at(-1).method, 'POST');
    assert.equal(readingRequests.at(-1).authenticated, true);
    await check(`document.querySelector('input[name="readingType"]').value === 'pressure' && document.querySelector('input[name="systolic"]').value === '' && document.querySelector('input[name="diastolic"]').value === ''`, `${type}: form resets after saving`);
  }
  readingStatus = 500;
  await fillField('systolic', '121');
  await fillField('diastolic', '81');
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await check(`document.body.textContent.includes('Unable to save your reading.') && !document.querySelector('button[type="submit"]').disabled && document.querySelector('input[name="systolic"]').value === '121'`, 'failed reading retains values and allows retry');
  readingStatus = 200;
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await check(`document.body.textContent.includes('Your reading has been saved successfully.')`, 'failed reading can be retried');
  await spa('/doctor');
  await check(`location.pathname==='/unauthorized' && document.querySelector('h1')?.textContent.includes('Access Denied')`, 'manual cross-role navigation rejected');
  await evaluate('history.back()');
  await check(`location.pathname==='/patient/readings' && !!document.querySelector('nav')`, 'Back returns to allowed content');
  await evaluate('history.forward()');
  await check(`location.pathname==='/unauthorized' && document.querySelector('h1')?.textContent.includes('Access Denied') && !document.querySelector('nav')`, 'Forward cannot bypass wrong-role guard');
  await evaluate(`document.querySelector('a[href="/login"]').click()`);
  await check(`location.pathname==='/login'`, '403 Go to Login works');
  await spa('/patient');
  await check(`!!document.querySelector('nav')`, 'return to valid Patient session');
  await evaluate(`document.querySelector('[aria-label="Log out"]').click()`);
  await check(`location.pathname==='/login' && !document.querySelector('nav')`, 'logout clears session and returns to login');
  await evaluate('history.back()');
  await check(`location.pathname==='/login' && !document.querySelector('nav')`, 'Back after logout cannot restore protected content');
  await login('Patient');
  const beforeReload = await evaluate('performance.timeOrigin');
  await send('Page.reload');
  await until(() => evaluate(`performance.timeOrigin !== ${beforeReload} && !!document.querySelector('nav')`), 'refresh finishes rendering');
  await check(`location.pathname==='/patient' && !!document.querySelector('nav')`, 'refresh restores the valid JWT session');
  await evaluate(`document.querySelector('[aria-label="Log out"]').click()`);
  await check(`location.pathname==='/login'`, 'logout before URL spoof test');
  await evaluate(`localStorage.setItem('role','Admin');sessionStorage.setItem('token',${JSON.stringify(savedToken)});`);
  await spa('/admin?role=Admin&returnUrl=/admin');
  await check(`location.pathname==='/login' && !document.querySelector('nav')`, 'storage, URL roles and return URLs cannot authenticate');
  await evaluate(`localStorage.removeItem('role');sessionStorage.removeItem('token');`);
  await login('Patient');
  const {targetId}=await controller.send('Target.createTarget',{url:'about:blank'});
  let second;
  await until(async()=>{const list=await(await fetch(`http://127.0.0.1:${debugPort}/json`)).json();second=list.find(t=>t.id===targetId);return !!second;},'new tab');
  const tab=await connect(second.webSocketDebuggerUrl);
  tab.on('Fetch.requestPaused', async ({requestId,request}) => {
    if (new URL(request.url).origin === origin) await tab.send('Fetch.continueRequest',{requestId});
    else await tab.send('Fetch.fulfillRequest',{requestId,responseCode:200,body:''});
  });
  await tab.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
  await tab.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await tab.send('Page.navigate',{url:`${origin}/patient`});
  await until(async()=>{const result=await tab.send('Runtime.evaluate',{expression:`location.pathname==='/patient' && !!document.querySelector('main h2')`,returnByValue:true});return result.result.value;},'new tab restores the saved session');
  passed++;console.log('PASS new tab restores valid authentication');
  tab.close();await controller.send('Target.closeTarget',{targetId});
  for(const [label,response,expected] of [
    ['missing role',{status:200,body:{success:true,token:token({})}},'no supported role'],
    ['unknown role',{status:200,body:{success:true,token:token({role:'Superuser'})}},'not supported'],
    ['conflicting comma roles',{status:200,body:{success:true,token:token({role:'Patient,Doctor'})}},'conflicting roles'],
    ['conflicting claim keys',{status:200,body:{success:true,token:token({role:'Patient',[roleClaim]:'Admin'})}},'conflicting roles'],
    ['expired token',{status:200,body:{success:true,token:token({role:'Patient',exp:1})}},'expired'],
    ['malformed token',{status:200,body:{success:true,token:'invalid'}},'Invalid authentication token'],
    ['invalid expiration',{status:200,body:{success:true,token:token({role:'Patient',exp:'future'})}},'Invalid authentication token'],
    ['invalid credentials',{status:400,body:{success:false,message:'Invalid email or password'}},'Invalid email or password.'],
    ['general login failure',{status:400,body:{success:false,message:'Login failed'}},'Login failed. Please try again.'],
    ['network failure',{network:true},'Unable to connect to the server.'],
    ['locked account',{status:400,body:{success:false,message:'Account is locked out , please try again later'}},'Your account is temporarily locked. Please try again later.'],
    ['new lockout',{status:400,body:{success:false,message:'Account is locked duo to multiple failed login attempts'}},'Your account is temporarily locked. Please try again later.'],
    ['unconfirmed email',{status:400,body:{success:false,message:'Email is not confirmed , please confirm your email'}},'Please confirm your email before logging in.'],
    ['HTTP 200 failed login',{status:200,body:{success:false,message:'Invalid email or password',token:token({role:'Admin'})}},'Invalid email or password.'],
  ]) {
    const count=await submit(response);
    await check(`location.pathname==='/login' && !document.querySelector('nav') && document.querySelector('[role="alert"]')?.textContent.includes(${JSON.stringify(expected)})`, `${label}: safe error and no protected content`);
    await check(`localStorage.getItem('authToken')===null`, `${label}: no token saved`);
    if(label==='unconfirmed email') await check(`document.querySelector('[role="alert"]').classList.contains('MuiAlert-colorWarning')`, 'unconfirmed email uses a warning Alert');
    await delay(200);
    assert.equal(loginRequests,count+1,`${label}: exactly one request`);
    passed++;console.log(`PASS ${label}: no automatic retry or fallback`);
  }
  await login('Patient');
  await evaluate(`(async()=>{const {api}=await import('/src/api/client.js');try{await api.get('/Synthetic403');}catch{}})()`);
  await check(`location.pathname==='/unauthorized' && document.querySelector('h1')?.textContent.includes('Access Denied') && !document.querySelector('nav')`, 'HTTP 403 shows forbidden access without another role');
  await evaluate(`document.querySelector('a[href="/login"]').click()`);
  await check(`location.pathname==='/login'`, 'HTTP 403 Go to Login works');
  await spa('/patient');
  await check(`location.pathname==='/patient' && !!document.querySelector('nav')`, 'HTTP 403 retains the same Patient session');
  await evaluate(`(async()=>{const {api}=await import('/src/api/client.js');try{await api.get('/Synthetic401');}catch{}})()`);
  await check(`location.pathname==='/login' && !document.querySelector('nav') && document.querySelector('[role="alert"]')?.textContent.includes('expired')`, 'HTTP 401 invalidates the session');
  await login('Patient',{exp:(Date.now()+3000)/1000});
  await check(`location.pathname==='/login' && !document.querySelector('nav')`, 'idle JWT expiration ends the session');
  await login('Admin');
  await evaluate(`document.querySelector('[aria-label="Notifications"]').click()`);
  await check(`document.querySelector('#notification-menu')?.textContent.includes('Notifications are not connected yet')`, 'navbar notifications menu opens');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await check(`!document.querySelector('#notification-menu')`, 'navbar notifications menu closes');
  await evaluate(`document.querySelector('[aria-label="Account menu"]').click()`);
  await check(`!!document.querySelector('#account-menu')`, 'navbar account menu opens');
  await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent==='Log out').click()`);
  await check(`location.pathname==='/login' && !document.querySelector('nav')`, 'navbar logout clears session');
  await login('Patient');
  await evaluate(`document.querySelector('[aria-label="Log out"]').click()`);
  await check(`location.pathname==='/login' && !document.querySelector('nav')`, 'sidebar logout clears session');
  for (const path of ['/login', '/register', '/docregister', '/sendcode', '/resetpassword']) {
    await navigate(path);
    await check(`!!document.querySelector('form')`, `${path}: auth form renders`);
    for (const width of [375, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureAppearance(`${path.slice(1)}-${width}`);
    }
  }
  await evaluate(`document.querySelector('[aria-label="Verification digit 1"]').focus()`);
  await send('Input.insertText', { text: '1' });
  await check(`document.activeElement.getAttribute('aria-label') === 'Verification digit 2'`, 'OTP advances focus after a digit');
  await send('Input.insertText', { text: '2' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace' });
  await check(`document.activeElement.getAttribute('aria-label') === 'Verification digit 2'`, 'OTP Backspace returns to the previous digit');
  await evaluate(`(() => { const input = document.querySelector('[aria-label="Verification digit 1"]'); const data = new DataTransfer(); data.setData('text', '98a7654'); input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); })()`);
  await check(`[...document.querySelectorAll('input[aria-label^="Verification digit"]')].map(input => input.value).join('') === '98765'`, 'OTP paste filters and limits the code to five digits');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft' });
  await check(`document.activeElement.getAttribute('aria-label') === 'Verification digit 4'`, 'OTP left arrow moves to the previous digit');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  await check(`document.activeElement.getAttribute('aria-label') === 'Verification digit 5'`, 'OTP right arrow moves to the next digit');
  for (const path of ['/register', '/docregister']) {
    await navigate(path);
    await check(`!!document.querySelector('input[name="password"]')`, `${path}: password field available`);
    await evaluate(`document.querySelector('input[name="password"]').focus()`);
    await send('Input.insertText', { text: 'a' });
    await check(`[...document.querySelectorAll('p')].some(element => element.textContent === 'Weak')`, `${path}: weak password indicator`);
    await send('Input.insertText', { text: 'Abc123!xyz' });
    await check(`[...document.querySelectorAll('p')].some(element => element.textContent === 'Strong')`, `${path}: strong password indicator`);
  }
  for (const path of ['/register', '/docregister']) {
    await navigate(path);
    const fields = { fullName: 'Synthetic User', userName: 'synthetic.user', email: 'synthetic@example.invalid', password: 'Synthetic1!', confirmPassword: 'Synthetic1!' };
    if (path === '/register') {
      Object.assign(fields, { phoneNumber: '0512345678', city: 'Nablus', age: '26', height: '170', weight: '70' });
    } else {
      fields.certificate = 'Synthetic certificate';
    }
    for (const [name, value] of Object.entries(fields)) {
      await fillField(name, value);
    }
    await evaluate(`(() => { const input = document.querySelector('input[name="dateOfBirth"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, '2000-01-01'); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await selectOption('gender', 'Male');
    if (path === '/docregister') await selectOption('specialization', 'Cardiology');
    const before = accountRequests.length;
    await evaluate(`document.querySelector('button[type="submit"]').click()`);
    await check(`document.querySelector('[role="dialog"]')?.textContent.includes('successfully')`, `${path}: mutation shows the existing success dialog`);
    assert.equal(accountRequests.length, before + 1, 'one registration request');
    const request = accountRequests.at(-1);
    assert.equal(request.method, 'POST');
    assert.ok(request.path.endsWith(path === '/register' ? '/Account/RegisterPatient' : '/Account/RegisterDoctor'));
    assert.equal(request.data.email, 'synthetic@example.invalid');
    assert.equal(request.data.dateOfBirth, '2000-01-01');
    assert.equal(request.data.gender, 'Male');
    if (path === '/register') assert.equal(request.data.height, 170);
    else assert.equal(request.data.specialization, 'Cardiology');
    passed++;
    console.log(`PASS ${path}: correct endpoint, method, Yup-transformed body, and single request`);
  }
  await navigate('/sendcode');
  await fillField('email', 'synthetic@example.invalid');
  let before = accountRequests.length;
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await check(`[...document.querySelectorAll('button')].some(button => button.textContent.includes('Resend Email'))`, 'send-code mutation shows the existing success state');
  assert.equal(accountRequests.length, before + 1);
  assert.ok(accountRequests.at(-1).path.endsWith('/Account/SendCode'));
  assert.equal(accountRequests.at(-1).method, 'POST');
  assert.deepEqual(accountRequests.at(-1).data, { email: 'synthetic@example.invalid' });
  before = accountRequests.length;
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Resend Email')).click()`);
  await until(() => accountRequests.length === before + 1, 'single resend request');
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('Continue to Reset Password')).click()`);
  await check(`location.pathname === '/resetpassword' && document.querySelector('input[name="email"]')?.value === 'synthetic@example.invalid'`, 'send-code flow keeps the email for password reset');
  await fillField('newPassword', 'Synthetic1!');
  await evaluate(`(() => { const input = document.querySelector('[aria-label="Verification digit 1"]'); const data = new DataTransfer(); data.setData('text', '12345'); input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); })()`);
  before = accountRequests.length;
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await check(`document.body.textContent.includes('Password Reset Successful!')`, 'reset-password mutation shows the existing success state');
  assert.equal(accountRequests.length, before + 1);
  assert.ok(accountRequests.at(-1).path.endsWith('/Account/ResetPassword'));
  assert.equal(accountRequests.at(-1).method, 'PATCH');
  assert.deepEqual(accountRequests.at(-1).data, { email: 'synthetic@example.invalid', code: '12345', newPassword: 'Synthetic1!' });
  passed++;
  console.log('PASS send-code, resend, and password reset use the original request contracts');
  assert.deepEqual(failures,[],'no uncaught browser exceptions or interception errors');
  console.log(`\n${passed} browser checks passed. All API responses were synthetic; no live login requests were sent.`);
} finally {
  if(controller) { try{await controller.send('Browser.close');}catch{ /* Browser may already be closed. */ } }
  page?.close();controller?.close();
  browser.kill();vite.kill();
  await delay(400);
  // Only remove the unique profile this script created under the system temp dir.
  if(resolve(profile).startsWith(resolve(tmpdir()) + (process.platform==='win32'?'\\':'/')) && basename(profile).startsWith('smartdhp-auth-test-')) {
    try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});}catch{ /* A browser subprocess may still hold a temporary file. */ }
  }
}
