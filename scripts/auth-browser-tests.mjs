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
const updateRequests = [];
let updateStatus = 200;
const deleteRequests = [];
let deleteStatus = 204;
let medications = [{ id: 7301, name: 'Synthetic medication A', dosage: 'Prescription A', frequency: 'Instructions A' },
  { id: 8402, name: 'Synthetic medication B', dosage: 'Prescription B', frequency: 'Instructions B' }];
const medicationDeletes = [];
let medicationDeleteStatus = 204;
const medicationUpdates = [];
let medicationUpdateStatus = 200;
let deleteMessage = 'Synthetic deletion denied';
let readingStatus = 200;
let historyStatus = 200;
let historyRequests = 0;
let historyReadings = [
  { id: 91001, patientId: 92001, timestamp: '2026-10-30T22:23:09.9182648', bloodPressure: { systolic: 120, diastolic: 80 }, glucoseReading: null },
  { id: 91002, patientId: 92001, timestamp: '2026-10-30T21:00:00', bloodPressure: null, glucoseReading: { glucoseLevel: 0 } },
  { id: 91003, patientId: 92001, timestamp: '2026-10-30T20:00:00', bloodPressure: { systolic: 128, diastolic: 84 }, glucoseReading: { glucoseLevel: 105.5 } },
];
const failures = [];
let chatRestRequests = [];
let chatHistoryDelay = 300;
const chatHistory = {
  701: [
    { id: 101, chatId: 701, senderId: 'A1234567-1234-5678-ABCD-123456789ABC', content: 'Earlier own message', createdAt: '2026-11-13T10:00:00Z', isRead: false },
    { id: 102, chatId: 701, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Earlier received message', createdAt: '2026-11-13T11:00:00Z', isRead: false },
  ],
  902: [],
};
const doctorHistory = {
  301: [
    { id: 201, chatId: 301, senderId: 'D1234567-1234-5678-ABCD-123456789ABC', content: 'Doctor historical reply', createdAt: '2026-11-14T18:15:12.1610241', isRead: true },
    { id: 202, chatId: 301, senderId: 'a1234567-1234-5678-abcd-123456789abc', content: 'Patient historical message', createdAt: '2026-11-14T18:16:00Z', isRead: true },
  ],
  808: [],
};
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
      if (url.origin === origin && url.pathname.endsWith('/@microsoft_signalr.js')) {
        await send('Fetch.fulfillRequest', { requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }],
          body: readFileSync('tests/fixtures/signalr-browser.js').toString('base64') });
        return;
      }
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) { await send('Fetch.continueRequest', {requestId}); return; }
      const headers = [
        {name:'Access-Control-Allow-Origin',value:'*'},
        {name:'Access-Control-Allow-Headers',value:'*'},
        {name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,DELETE,OPTIONS'},
        {name:'Content-Type',value:'application/json'},
      ];
      if (request.method === 'OPTIONS') { await send('Fetch.fulfillRequest',{requestId,responseCode:204,responseHeaders:headers}); return; }
      if (/^\/api\/(Patient|Doctor)\/Chat(?:\/\d+\/Messages)?$/.test(url.pathname)) {
        assert.equal(request.method, 'GET', 'chat REST APIs are read-only');
        assert.ok(request.headers.Authorization);
        chatRestRequests.push(url.pathname);
        const isDoctor = url.pathname.startsWith('/api/Doctor/');
        const conversations = isDoctor
          ? [{ id: 301, doctorId: 37, patientId: 42, createdAt: '2026-11-14T10:00:00' }, { id: 808, doctorId: 37, patientId: 91, createdAt: '2026-11-14T11:00:00' }]
          : [{ id: 701, doctorId: 37, patientId: 27, createdAt: '2026-11-14T10:00:00' }, { id: 902, doctorId: 88, patientId: 27, createdAt: '2026-11-14T11:00:00' }];
        let data = url.pathname.endsWith('/Chat') ? conversations
          : (isDoctor ? doctorHistory : chatHistory)[Number(url.pathname.split('/').at(-2))];
        if (url.pathname.endsWith('/Messages')) {
          const serverMessages = await evaluate('window.__chatTest?.serverMessages || []');
          data = [...data, ...serverMessages.filter(message => message.chatId === Number(url.pathname.split('/').at(-2)))];
        }
        const body = JSON.stringify({ success: true, data, errors: null, message: 'Synthetic chat response' });
        if (url.pathname.endsWith('/Messages')) await delay(chatHistoryDelay);
        await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: headers, body: Buffer.from(body).toString('base64') });
        return;
      }
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
      if (/^\/api\/Medications\/my(?:\/\d+)?$/.test(url.pathname)) {
        assert.ok(request.headers.Authorization?.startsWith('Bearer '));
        let status = 200;
        let body;
        if (request.method === 'DELETE') {
          medicationDeletes.push({ path: url.pathname, hasBody: !!request.postData });
          await delay(250);
          status = medicationDeleteStatus;
          if (status === 204) medications = medications.filter(item => item.id !== Number(url.pathname.split('/').at(-1)));
          else body = { message: 'Synthetic medication deletion denied' };
        } else if (request.method === 'PATCH') {
          const values = JSON.parse(request.postData);
          medicationUpdates.push({ path: url.pathname, values });
          await delay(250);
          status = medicationUpdateStatus;
          if (status === 200) medications = medications.map(item => item.id === Number(url.pathname.split('/').at(-1)) ? { ...item, ...values } : item);
          body = { success: status === 200, message: status === 200 ? 'Synthetic update saved' : 'Synthetic medication update denied' };
        } else if (request.method === 'POST') {
          medications.push({ id: 9503, ...JSON.parse(request.postData) });
          status = 204;
        } else {
          body = { success: true, data: medications };
        }
        await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: headers,
          ...(body ? { body: Buffer.from(JSON.stringify(body)).toString('base64') } : {}) });
        return;
      }
      if (url.pathname.endsWith('/Readings/my')) {
        historyRequests++;
        assert.equal(request.method, 'GET');
        assert.equal(url.pathname, '/api/Readings/my');
        assert.equal(url.search, '');
        assert.ok(request.headers.Authorization);
        const body = JSON.stringify({ success: historyStatus === 200, data: historyReadings, errors: [], message: 'Synthetic backend metadata' });
        await delay(300);
        await send('Fetch.fulfillRequest', { requestId, responseCode: historyStatus, responseHeaders: headers, body: Buffer.from(body).toString('base64') });
        return;
      }
      if (request.method === 'DELETE' && /\/Readings\/my\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').at(-1));
        deleteRequests.push({ method: request.method, path: url.pathname, hasBody: !!request.postData, authenticated: !!request.headers.Authorization });
        await delay(250);
        if (deleteStatus === 204) {
          historyReadings = historyReadings.filter(reading => reading.id !== id);
          await send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: headers });
        } else {
          await send('Fetch.fulfillRequest', { requestId, responseCode: deleteStatus, responseHeaders: headers,
            body: Buffer.from(JSON.stringify(deleteMessage ? { message: deleteMessage } : {})).toString('base64') });
        }
        return;
      }
      if (/\/Readings\/my\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').at(-1));
        const data = JSON.parse(request.postData);
        updateRequests.push({ method: request.method, path: url.pathname, data, authenticated: !!request.headers.Authorization });
        await delay(250);
        if (updateStatus === 200) {
          historyReadings = historyReadings.map(reading => reading.id !== id ? reading : {
            ...reading,
            bloodPressure: data.systolic == null ? reading.bloodPressure : { systolic: data.systolic, diastolic: data.diastolic },
            glucoseReading: data.glucoseLevel == null ? reading.glucoseReading : { glucoseLevel: data.glucoseLevel },
          });
        }
        await send('Fetch.fulfillRequest', { requestId, responseCode: updateStatus, responseHeaders: headers,
          body: Buffer.from(JSON.stringify({ success: updateStatus === 200 })).toString('base64') });
        return;
      }
      if (url.pathname.endsWith('/Readings')) {
        const data = JSON.parse(request.postData);
        readingRequests.push({ method: request.method, data, authenticated: !!request.headers.Authorization });
        await delay(250);
        if (readingStatus === 200) {
          historyReadings = [...historyReadings, {
            id: 91004 + readingRequests.length, patientId: 92001, timestamp: '2026-10-31T09:00:00',
            bloodPressure: data.systolic == null ? null : { systolic: data.systolic, diastolic: data.diastolic },
            glucoseReading: data.glucoseLevel == null ? null : { glucoseLevel: data.glucoseLevel },
          }];
        }
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
    } catch (error) {
      // React Query aborts reads when their page unmounts. Chrome may discard
      // the paused request before the delayed synthetic response is fulfilled.
      if ((new URL(request.url).pathname.endsWith('/Readings/my') || /\/(Patient|Doctor)\/Chat(?:\/\d+\/Messages)?$/.test(new URL(request.url).pathname)) && /Invalid InterceptionId/.test(error.message)) return;
      failures.push('Request interception failed');
    }
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
  await spa('/patient/medications');
  await check(`document.querySelectorAll('main button[aria-label^="Delete Synthetic medication"]').length === 2`, 'each medication has a delete button');
  const medicationEditDialog = `document.querySelector('[role="dialog"][aria-labelledby="edit-medication-title"]')`;
  for (const [name, id, dosage, frequency] of [['A', 7301, 'Prescription A', 'Instructions A'], ['B', 8402, 'Prescription B', 'Instructions B']]) {
    await evaluate(`document.querySelector('button[aria-label="Edit Synthetic medication ${name}"]').click()`);
    await check(`${medicationEditDialog}?.querySelector('input[name="name"]').value === 'Synthetic medication ${name}' && ${medicationEditDialog}.querySelector('input[name="dosage"]').value === '${dosage}' && ${medicationEditDialog}.querySelector('input[name="frequency"]').value === '${frequency}'`, 'medication edit prepopulates selected record');
    await evaluate(`${medicationEditDialog}.querySelector('input[name="name"]').focus()`);
    await evaluate(`${medicationEditDialog}.querySelector('input[name="name"]').select()`);
    await send('Input.insertText', { text: '   ' });
    await evaluate(`${medicationEditDialog}.querySelector('button[type="submit"]').click()`);
    await check(`${medicationEditDialog}.textContent.includes('Medication name is required.')`, 'medication edit uses shared required validation');
    const beforeUpdate = medicationUpdates.length;
    await evaluate(`${medicationEditDialog}.querySelector('input[name="name"]').focus()`);
    await evaluate(`${medicationEditDialog}.querySelector('input[name="name"]').select()`);
    await send('Input.insertText', { text: ` Synthetic medication ${name} ` });
    await evaluate(`${medicationEditDialog}.querySelector('input[name="dosage"]').focus()`);
    await evaluate(`${medicationEditDialog}.querySelector('input[name="dosage"]').select()`);
    await send('Input.insertText', { text: ` ${dosage} updated ` });
    medicationUpdateStatus = 500;
    await evaluate(`${medicationEditDialog}.querySelector('button[type="submit"]').click()`);
    await check(`${medicationEditDialog}.querySelector('button[type="submit"]').disabled`, 'medication save disabled during PATCH');
    await check(`${medicationEditDialog}.textContent.includes('Synthetic medication update denied') && ${medicationEditDialog}.querySelector('input[name="name"]').value.trim() === 'Synthetic medication ${name}'`, 'failed medication update preserves form for retry');
    medicationUpdateStatus = 200;
    await evaluate(`{ const button = ${medicationEditDialog}.querySelector('button[type="submit"]'); button.click(); button.click(); }`);
    await check(`!${medicationEditDialog} && document.querySelector('main').textContent.includes('updated successfully') && document.querySelector('main').textContent.includes('${dosage} updated')`, 'successful medication update closes dialog and refreshes values');
    assert.equal(medicationUpdates.length, beforeUpdate + 2);
    assert.deepEqual(medicationUpdates.at(-1), { path: `/api/Medications/my/${id}`, values: { name: `Synthetic medication ${name}`, dosage: `${dosage} updated`, frequency } });
  }
  const medicationDialog = `document.querySelector('[role="dialog"][aria-labelledby="delete-medication-title"]')`;
  await evaluate(`document.querySelector('button[aria-label="Delete Synthetic medication A"]').click()`);
  await check(`${medicationDialog}?.textContent.includes('Are you sure you want to delete this medication?')`, 'medication confirmation opens');
  await evaluate(`[...${medicationDialog}.querySelectorAll('button')].find(button => button.textContent === 'Cancel').click()`);
  await check(`!${medicationDialog}`, 'medication cancellation closes dialog');
  assert.equal(medicationDeletes.length, 0);
  medicationDeleteStatus = 500;
  await evaluate(`document.querySelector('button[aria-label="Delete Synthetic medication B"]').click()`);
  await evaluate(`[...${medicationDialog}.querySelectorAll('button')].find(button => button.textContent === 'Delete').click()`);
  await check(`${medicationDialog}?.textContent.includes('Synthetic medication deletion denied') && !!document.querySelector('button[aria-label="Delete Synthetic medication B"]')`, 'failed medication deletion keeps dialog and item');
  medicationDeleteStatus = 204;
  await evaluate(`{ const button = [...${medicationDialog}.querySelectorAll('button')].find(button => button.textContent === 'Delete'); button.click(); button.click(); }`);
  await check(`${medicationDialog}?.querySelector('button:last-child')?.disabled`, 'medication confirmation disables while pending');
  await check(`!${medicationDialog} && !document.querySelector('button[aria-label="Delete Synthetic medication B"]') && document.querySelector('main').textContent.includes('deleted successfully')`, 'empty DELETE success refreshes medications automatically');
  assert.deepEqual(medicationDeletes, [{ path: '/api/Medications/my/8402', hasBody: false }, { path: '/api/Medications/my/8402', hasBody: false }]);
  await fillField('name', 'Synthetic medication C');
  await fillField('dosage', 'Prescription C');
  await fillField('frequency', 'Instructions C');
  await evaluate(`document.querySelector('main button[type="submit"]').click()`);
  await check(`!!document.querySelector('button[aria-label="Delete Synthetic medication C"]') && document.querySelector('input[name="name"]').value === ''`, 'existing add medication still resets and refreshes GET');
  await evaluate(`document.querySelector('button[aria-label="Delete Synthetic medication A"]').click()`);
  await evaluate(`[...${medicationDialog}.querySelectorAll('button')].find(button => button.textContent === 'Delete').click()`);
  await check(`!${medicationDialog} && !document.querySelector('button[aria-label="Delete Synthetic medication A"]')`, 'another medication deletes using its own ID');
  assert.equal(medicationDeletes.at(-1).path, '/api/Medications/my/7301');
  await spa('/patient/readings');
  await check(`document.querySelector('main h2')?.textContent==='Health Readings'`, 'patient nested Outlet remains functional');
  const historySection = `document.querySelector('[aria-labelledby="reading-history-title"]')`;
  await check(`${historySection}?.textContent.includes('105.5 mg/dL')`, 'confirmed nested glucose measurement renders');
  await check(`${historySection}.textContent.includes('0 mg/dL') && ${historySection}.textContent.includes('128 / 84 mmHg')`, 'history preserves numeric zero and combined measurements');
  await check(`${historySection}.querySelectorAll('ul > li:not([role="presentation"])').length === 3`, 'one history entry per reading');
  const rows = await evaluate(`[...${historySection}.querySelectorAll('ul > li:not([role="presentation"])')].map(row => row.textContent)`);
  assert.ok(rows[0].includes('Blood Pressure') && !rows[0].includes('mg/dL'));
  assert.ok(rows[1].includes('Blood Glucose') && !rows[1].includes('mmHg'));
  assert.ok(rows[2].includes('Blood Pressure and Blood Glucose'));
  assert.ok(rows.every(row => !/9100|92001|9182648|Synthetic backend/.test(row)));
  assert.ok(rows[0].includes(await evaluate(`new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2026-10-30T22:23:09.9182648'))`)));
  passed++;
  console.log('PASS history shows only readable dates, types, and present measurements');
  const editDialog = `document.querySelector('[role="dialog"][aria-labelledby="edit-reading-title"]')`;
  for (const [rowIndex, id, original, updated] of [
    [0, 91001, { systolic: 120, diastolic: 80 }, { systolic: 122, diastolic: 82 }],
    [1, 91002, { glucoseLevel: 0 }, { glucoseLevel: 102 }],
    [2, 91003, { systolic: 128, diastolic: 84, glucoseLevel: 105.5 }, { systolic: 129, diastolic: 85, glucoseLevel: 106 }],
  ]) {
    await evaluate(`${historySection}.querySelectorAll('ul > li:not([role="presentation"])')[${rowIndex}].querySelector('button').click()`);
    await check(`!!${editDialog}`, 'Edit opens a dialog');
    await delay(250);
    const populated = await evaluate(`Object.fromEntries([...${editDialog}.querySelectorAll('input[type="number"]')].map(input => [input.name, Number(input.value)]))`);
    assert.deepEqual(populated, original, 'edit fields prepopulate the selected measurements, including zero');
    if (rowIndex > 0) {
      const beforeInvalidEdit = updateRequests.length;
      await evaluate(`${editDialog}.querySelector('button[type="submit"]').click()`);
      const expectedError = rowIndex === 1
        ? 'Blood glucose must be between 20 and 600 mg/dL.'
        : 'Blood glucose must be a whole number';
      await check(`${editDialog}.textContent.includes(${JSON.stringify(expectedError)}) && ${editDialog}.querySelector('input[name="glucoseLevel"]').value === '${original.glucoseLevel}'`, 'existing invalid reading is retained for correction');
      assert.equal(updateRequests.length, beforeInvalidEdit, 'invalid edit does not send PATCH');
    }
    for (const [name, value] of Object.entries(updated)) {
      const selector = `[role="dialog"] input[name="${name}"]`;
      await evaluate(`(() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
      })()`);
      if (rowIndex === 0 && name === 'systolic') {
        await evaluate(`${editDialog}.querySelector('button[type="submit"]').click()`);
        await check(`${editDialog}.textContent.includes('Systolic is required')`, 'edit validates required measurements');
        assert.equal(updateRequests.length, 0);
      }
      await send('Input.insertText', { text: String(value) });
    }
    const before = updateRequests.length;
    const beforeHistory = historyRequests;
    if (rowIndex === 0) updateStatus = 500;
    await evaluate(`${editDialog}.querySelector('button[type="submit"]').click()`);
    await check(`${editDialog}.querySelector('button[type="submit"]').disabled`, 'edit submission disabled while saving');
    if (rowIndex === 0) {
      await check(`${editDialog}.textContent.includes('Unable to update your reading.') && ${editDialog}.querySelector('input[name="systolic"]').value === '122' && !${editDialog}.querySelector('button[type="submit"]').disabled`, 'failed PATCH retains dialog and entered values');
      assert.equal(historyRequests, beforeHistory, 'failed PATCH does not invalidate history');
      updateStatus = 200;
      await evaluate(`${editDialog}.querySelector('button[type="submit"]').click()`);
    }
    await check(`!${editDialog} && document.body.textContent.includes('Your reading has been updated successfully.')`, 'successful PATCH closes dialog and shows confirmation');
    assert.equal(updateRequests.length, before + (rowIndex === 0 ? 2 : 1), 'no duplicate PATCH requests');
    assert.deepEqual(updateRequests.at(-1), { method: 'PATCH', path: `/api/Readings/my/${id}`, data: updated, authenticated: true });
    assert.equal(historyRequests, beforeHistory + 1, 'PATCH refreshes the existing history query once');
    const rowText = await evaluate(`${historySection}.querySelectorAll('ul > li:not([role="presentation"])')[${rowIndex}].textContent`);
    if (updated.systolic != null) assert.ok(rowText.includes(`${updated.systolic} / ${updated.diastolic} mmHg`));
    if (updated.glucoseLevel != null) assert.ok(rowText.includes(`${updated.glucoseLevel} mg/dL`));
    passed++;
    console.log('PASS selected reading ID, exact PATCH payload, and refreshed values');
  }
  const requestsBeforeRerender = historyRequests;
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await check(`document.body.textContent.includes('Systolic is required') && document.body.textContent.includes('Diastolic is required')`, 'empty pressure values are rejected');
  assert.equal(readingRequests.length, 0);
  assert.equal(historyRequests, requestsBeforeRerender, 'form validation does not refetch history');
  for (const [values, message] of [
    [{ systolic: '301', diastolic: '80' }, 'Systolic pressure must be between 50 and 300 mmHg.'],
    [{ systolic: '120.5', diastolic: '80' }, 'Systolic must be a whole number'],
    [{ systolic: '80', diastolic: '80' }, 'Systolic pressure must be greater than diastolic pressure.'],
  ]) {
    for (const [name, value] of Object.entries(values)) {
      await evaluate(`(() => {
        const input = document.querySelector('main form input[name="${name}"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
    }
    await evaluate(`document.querySelector('main form button[type="submit"]').click()`);
    await check(`document.querySelector('main form').textContent.includes(${JSON.stringify(message)})`, 'Add Reading displays the shared input validation');
    assert.equal(readingRequests.length, 0, 'invalid Add Reading does not send POST');
  }
  await evaluate(`(() => {
    for (const input of document.querySelectorAll('main form input[type="number"]')) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  for (const [type, values] of [
    ['pressure', { systolic: '120', diastolic: '80' }],
    ['glucose', { glucoseLevel: '100' }],
    ['both', { systolic: '120', diastolic: '80', glucoseLevel: '100' }],
  ]) {
    await selectOption('readingType', type);
    await check(`!!document.querySelector('input[name="systolic"]') === ${type !== 'glucose'} && !!document.querySelector('input[name="glucoseLevel"]') === ${type !== 'pressure'}`, `${type}: only relevant fields appear`);
    for (const [name, value] of Object.entries(values)) await fillField(name, value);
    const before = readingRequests.length;
    const beforeHistory = historyRequests;
    const beforeRows = historyReadings.length;
    await evaluate(`document.querySelector('button[type="submit"]').click()`);
    await check(`document.querySelector('button[type="submit"]').disabled`, `${type}: submission disabled while saving`);
    await check(`document.body.textContent.includes('Your reading has been saved successfully.')`, `${type}: success feedback`);
    assert.equal(readingRequests.length, before + 1);
    assert.deepEqual(readingRequests.at(-1).data, Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Number(value)])));
    assert.equal(readingRequests.at(-1).method, 'POST');
    assert.equal(readingRequests.at(-1).authenticated, true);
    assert.equal(historyRequests, beforeHistory + 1, 'successful POST refreshes history once');
    await check(`${historySection}.querySelectorAll('ul > li:not([role="presentation"])').length === ${beforeRows + 1}`, `${type}: new reading appears without a page reload`);
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
  const deleteDialog = `document.querySelector('[role="dialog"][aria-labelledby="delete-reading-title"]')`;
  for (const id of [91001, 91002, 91003]) {
    const before = deleteRequests.length;
    const beforeHistory = historyRequests;
    const beforeRows = historyReadings.length;
    const selectedRow = historyReadings.find(reading => reading.id === id);
    await evaluate(`${historySection}.querySelectorAll('ul > li:not([role="presentation"])')[0].querySelector('button[aria-label^="Delete "]').click()`);
    await check(`${deleteDialog}?.textContent.includes('Are you sure you want to delete this reading? This action cannot be undone.')`, 'Delete opens confirmation before sending a request');
    assert.equal(deleteRequests.length, before);
    await evaluate(`[...${deleteDialog}.querySelectorAll('button')].find(button => button.textContent === 'Cancel').click()`);
    await check(`!${deleteDialog}`, 'Cancel closes delete confirmation');
    assert.equal(deleteRequests.length, before, 'Cancel sends no DELETE');
    await evaluate(`${historySection}.querySelectorAll('ul > li:not([role="presentation"])')[0].querySelector('button[aria-label^="Delete "]').click()`);
    await check(`!!${deleteDialog}`, 'delete confirmation can be reopened');
    if (id === 91001) {
      deleteStatus = 409;
      await evaluate(`[...${deleteDialog}.querySelectorAll('button')].find(button => button.textContent === 'Delete Reading').click()`);
      await check(`${deleteDialog}.textContent.includes('Synthetic deletion denied')`, 'delete failure displays backend message');
      assert.equal(historyRequests, beforeHistory);
      assert.deepEqual(historyReadings.find(reading => reading.id === id), selectedRow, 'failed deletion keeps the reading');
      deleteMessage = '';
      await evaluate(`[...${deleteDialog}.querySelectorAll('button')].find(button => button.textContent === 'Delete Reading').click()`);
      await check(`${deleteDialog}.textContent.includes('Unable to delete your reading. Please try again.')`, 'delete failure without a backend message uses the fallback');
      assert.equal(historyRequests, beforeHistory);
      deleteStatus = 204;
    }
    const beforeConfirm = deleteRequests.length;
    await evaluate(`(() => {
      const button = [...${deleteDialog}.querySelectorAll('button')].find(button => button.textContent === 'Delete Reading');
      button.click(); button.click(); button.click();
    })()`);
    await check(`${deleteDialog}?.querySelectorAll('button:disabled').length === 2 && ${deleteDialog}.textContent.includes('Deleting...')`, 'pending deletion disables both buttons');
    await check(`!${deleteDialog} && document.body.textContent.includes('Your reading has been deleted successfully.')`, 'empty successful DELETE closes the dialog and confirms success');
    assert.equal(deleteRequests.length, beforeConfirm + 1, 'rapid clicks send only one DELETE');
    assert.deepEqual(deleteRequests.at(-1), { method: 'DELETE', path: `/api/Readings/my/${id}`, hasBody: false, authenticated: true });
    assert.equal(historyRequests, beforeHistory + 1, 'successful deletion refreshes the existing query once');
    assert.equal(historyReadings.some(reading => reading.id === id), false);
    await check(`${historySection}.querySelectorAll('ul > li:not([role="presentation"])').length === ${beforeRows - 1}`, 'deleted reading disappears from history');
    passed++;
    console.log('PASS DELETE targets its own reading ID and sends no body');
  }
  await evaluate(`document.querySelector('[aria-label="Log out"]').click()`);
  await check(`location.pathname === '/login'`, 'logout before readings account switch');
  historyReadings = [];
  await login('Patient', { sub: 'synthetic-second-account' });
  await spa('/patient/readings');
  await check(`${historySection}?.textContent.includes('Loading your readings...') && !${historySection}.textContent.includes('105.5 mg/dL')`, 'new account loads without displaying the previous account cache');
  await check(`${historySection}.textContent.includes('No readings yet.')`, 'new account empty history displays correctly');
  historyStatus = 500;
  await evaluate(`import('/src/api/queryClient.js').then(({ queryClient }) => queryClient.invalidateQueries({ queryKey: ['myReadings'] }))`);
  await check(`${historySection}.textContent.includes('Unable to load your readings.')`, 'GET error displays safe feedback');
  historyStatus = 200;
  historyReadings = [{ id: 93001, patientId: 94001, timestamp: '2026-10-31T10:00:00', bloodPressure: null, glucoseReading: { glucoseLevel: 99 } }];
  await evaluate(`[...${historySection}.querySelectorAll('button')].find(button => button.textContent.includes('Try again')).click()`);
  await check(`${historySection}.textContent.includes('99 mg/dL') && !${historySection}.textContent.includes('105.5 mg/dL')`, 'retry loads only the current account readings');
  for (const width of [320, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await delay(300);
    await check(`${historySection}.getBoundingClientRect().right <= window.innerWidth && ${historySection}.scrollWidth <= ${historySection}.clientWidth && ${historySection}.textContent.includes('99 mg/dL')`, `${width}px: history fits the dashboard`);
  }
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
  await login('Patient', { 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'a1234567-1234-5678-abcd-123456789abc' });
  chatRestRequests = [];
  await spa('/patient/messages');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await check(`!!window.__chatTest && document.querySelector('main').textContent.includes('Connected') && document.querySelector('main').textContent.includes('Doctor #37')`, 'chat connects and loads real conversation IDs');
  assert.equal(await evaluate('window.__chatTest.hubUrl'), 'https://chatsystem.runasp.net/hubs/chat');
  assert.equal(await evaluate('window.__chatTest.tokenPresent && window.__chatTest.automaticReconnect'), true);
  assert.equal(await evaluate('window.__chatTest.starts'), 1, 'StrictMode starts one connection');
  assert.deepEqual(chatRestRequests, ['/api/Patient/Chat'], 'history waits for a selected conversation');
  chatHistoryDelay = 600;
  await evaluate(`[...document.querySelectorAll('main [role="button"]')].find(button => button.textContent === 'Doctor #37').click()`);
  await until(() => chatRestRequests.includes('/api/Patient/Chat/701/Messages'), 'dynamic message history endpoint');
  await evaluate(`window.__chatTest.emit({ id: 103, chatId: 701, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Arrived during history', createdAt: '2026-11-14T11:00:00Z', isRead: false })`);
  await evaluate(`window.__chatTest.receipt({ chatId: 701, readAt: '2026-11-14T18:00:00Z' })`);
  await check(`document.querySelector('[role="log"]').textContent.includes('Earlier own message') && document.querySelector('[role="log"]').textContent.includes('Arrived during history')`, 'REST completion preserves in-flight real-time messages');
  const ownAlignment = await evaluate(`getComputedStyle([...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Earlier own message').parentElement).alignSelf`);
  assert.equal(ownAlignment, 'flex-end', 'confirmed GUID claim aligns historical own messages');
  const receivedAlignment = await evaluate(`getComputedStyle([...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Earlier received message').parentElement).alignSelf`);
  assert.equal(receivedAlignment, 'flex-start');
  await check(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Earlier own message').parentElement.querySelector('[aria-label="Read"]') != null`, 'receipt during history fetch updates sent history');
  assert.equal(await evaluate(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Earlier received message').parentElement.querySelector('[role="img"]') === null`), true, 'received messages have no read indicator');
  await delay(400);
  assert.ok(await evaluate(`window.__chatTest.readCalls.some(call => call.method === 'MarkMessagesAsRead' && call.chatId === 701)`), 'opening Patient chat marks its dynamic ID');
  const marksBeforeOwnSend = await evaluate('window.__chatTest.readCalls.length');
  await evaluate(`document.querySelector('main textarea').focus()`);
  await send('Input.insertText', { text: '  Synthetic new message  ' });
  await evaluate(`document.querySelector('main form button[type="submit"]').click()`);
  await check(`document.querySelector('main form button[type="submit"]').disabled`, 'send disables duplicate submissions');
  await check(`document.querySelector('main textarea').value === '' && document.querySelector('[role="log"]').textContent.includes('Synthetic new message')`, 'successful SignalR send displays and clears draft');
  assert.deepEqual(await evaluate('window.__chatTest.calls'), [{ method: 'SendMessage', chatId: 701, content: 'Synthetic new message' }]);
  assert.equal(await evaluate(`[...document.querySelectorAll('[role="log"] p')].filter(element => element.textContent === 'Synthetic new message').length`), 1, 'echoes and invocation return deduplicate');
  await check(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Synthetic new message').parentElement.querySelector('[aria-label="Saved, not marked as read"]') != null`, 'saved outgoing message starts with a single check');
  await delay(250);
  assert.equal(await evaluate('window.__chatTest.readCalls.length'), marksBeforeOwnSend, 'own send and echoes do not mark incoming messages read');
  const fetchesBeforeReceipt = chatRestRequests.length;
  await evaluate(`window.__chatTest.receipt({ chatId: 701, readAt: '2026-11-14T18:01:00Z' }); window.__chatTest.receipt({ chatId: 701, readAt: '2026-11-14T18:01:00Z' })`);
  await check(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Synthetic new message').parentElement.querySelector('[aria-label="Read"]') != null`, 'MessagesRead replaces the single check with a double check');
  assert.equal(chatRestRequests.length, fetchesBeforeReceipt, 'receipt updates cache without a GET');
  const beforeRaceFetch = chatRestRequests.filter(path => path === '/api/Patient/Chat/701/Messages').length;
  await evaluate(`window.__chatTest.receiptBeforeAck = true; document.querySelector('main textarea').focus()`);
  await send('Input.insertText', { text: 'Receipt before acknowledgement' });
  await evaluate(`document.querySelector('main form button[type="submit"]').click()`);
  await check(`document.querySelector('main textarea').value === '' && [...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Receipt before acknowledgement')?.parentElement.querySelector('[aria-label="Read"]') != null`, 'Patient receipt before send acknowledgement updates without a refresh');
  assert.equal(chatRestRequests.filter(path => path === '/api/Patient/Chat/701/Messages').length, beforeRaceFetch + 1, 'only the raced conversation resynchronizes once');
  await evaluate('window.__chatTest.receiptBeforeAck = false');
  const marksBeforeBurst = await evaluate('window.__chatTest.readCalls.length');
  await evaluate(`for (const id of [110, 111, 112]) window.__chatTest.emit({ id, chatId: 701, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Synthetic burst ' + id, createdAt: '2026-11-14T12:01:00Z', isRead: false })`);
  await delay(450);
  assert.equal(await evaluate('window.__chatTest.readCalls.length'), marksBeforeBurst + 1, 'incoming burst is marked once');
  const marksBeforeHidden = await evaluate('window.__chatTest.readCalls.length');
  await evaluate(`Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); window.__chatTest.emit({ id: 113, chatId: 701, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Synthetic hidden event', createdAt: '2026-11-14T12:02:00Z', isRead: false })`);
  await delay(350);
  assert.equal(await evaluate('window.__chatTest.readCalls.length'), marksBeforeHidden, 'hidden conversation does not mark messages read');
  await evaluate(`delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange'))`);
  await delay(400);
  assert.equal(await evaluate('window.__chatTest.readCalls.length'), marksBeforeHidden + 1, 'visible active chat resynchronizes read status');
  await evaluate(`window.__chatTest.failSend = true; document.querySelector('main textarea').focus()`);
  await send('Input.insertText', { text: 'Keep failed draft' });
  await evaluate(`document.querySelector('main form button[type="submit"]').click()`);
  await check(`document.querySelector('main').textContent.includes('Unable to send your message') && document.querySelector('main textarea').value === 'Keep failed draft'`, 'failed send preserves draft');
  await evaluate(`window.__chatTest.failRead = true; window.__chatTest.emit({ id: 114, chatId: 701, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Synthetic read failure event', createdAt: '2026-11-14T12:03:00Z', isRead: false })`);
  await check(`document.querySelector('main').textContent.includes('Read status could not be updated') && !document.querySelector('main form button[type="submit"]').disabled`, 'failed read status keeps conversation and sending available');
  await evaluate('window.__chatTest.failRead = false');
  await evaluate('window.__chatTest.failSend = false; window.__chatTest.disconnect()');
  await check(`document.querySelector('main').textContent.includes('Reconnecting') && document.querySelector('main form button[type="submit"]').disabled`, 'reconnection disables sending');
  const historyBeforeReconnect = chatRestRequests.filter(path => path.endsWith('/701/Messages')).length;
  chatHistory[701].push({ id: 104, chatId: 701, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Recovered after reconnect', createdAt: '2026-11-14T12:10:00Z', isRead: false });
  await evaluate('window.__chatTest.reconnect()');
  await check(`document.querySelector('[role="log"]').textContent.includes('Recovered after reconnect')`, 'reconnect recovers missed history');
  await check(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Synthetic new message').parentElement.querySelector('[aria-label="Read"]') != null`, 'history refetch cannot downgrade read messages');
  assert.equal(chatRestRequests.filter(path => path.endsWith('/701/Messages')).length, historyBeforeReconnect + 1);
  await evaluate(`[...document.querySelectorAll('main [role="button"]')].find(button => button.textContent === 'Doctor #88').click()`);
  await check(`document.querySelector('[role="log"]').textContent.includes('No messages yet.') && !document.querySelector('[role="log"]').textContent.includes('Earlier own message')`, 'switching conversations isolates messages and supports empty history');
  await delay(400);
  const marksBeforeInactive = await evaluate('window.__chatTest.readCalls.length');
  await evaluate(`window.__chatTest.emit({ id: 105, chatId: 701, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Other conversation event', createdAt: '2026-11-14T12:20:00Z', isRead: false })`);
  await check(`!document.querySelector('[role="log"]').textContent.includes('Other conversation event')`, 'events never spill into a different selected conversation');
  await delay(350);
  assert.equal(await evaluate('window.__chatTest.readCalls.length'), marksBeforeInactive, 'inactive conversation event does not invoke MarkMessagesAsRead');
  for (const width of [320, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await delay(150);
    await check(`document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth`, `${width}px: chat content remains responsive`);
  }
  await evaluate(`import('/src/auth/session.js').then(({ authSession }) => authSession.logout())`);
  await check(`location.pathname === '/login' && window.__chatTest.stops >= 1 && !document.querySelector('[role="log"]')`, 'logout stops SignalR and removes patient messages');
  await login('Doctor', { 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'd1234567-1234-5678-abcd-123456789abc' });
  chatRestRequests = [];
  await evaluate(`document.querySelector('nav a[href="/doctor/messages"]').click()`);
  await check(`location.pathname === '/doctor/messages' && document.querySelector('h1').textContent === 'Messages' && document.querySelector('main').textContent.includes('Connected') && document.querySelector('main').textContent.includes('Patient #42')`, 'Doctor navigation loads shared chat with patient fallbacks');
  assert.deepEqual(chatRestRequests, ['/api/Doctor/Chat'], 'Doctor fetches only its conversation endpoint before selection');
  assert.equal(await evaluate('window.__chatTest.tokenPresent'), true, 'Doctor hub uses authenticated session token');
  await evaluate(`window.__chatTest.senderId = 'd1234567-1234-5678-abcd-123456789abc'`);
  for (const [chatId, patientId] of [[301, 42], [808, 91]]) {
    await evaluate(`[...document.querySelectorAll('main [role="button"]')].find(button => button.textContent === 'Patient #${patientId}').click()`);
    await until(() => chatRestRequests.includes(`/api/Doctor/Chat/${chatId}/Messages`), 'Doctor fetches the selected dynamic chat ID');
    if (chatId === 301) {
      await check(`document.querySelector('[role="log"]').textContent.includes('Doctor historical reply') && !document.querySelector('[role="log"]').textContent.includes('Earlier own message')`, 'Doctor history remains isolated from Patient cache');
      assert.equal(await evaluate(`getComputedStyle([...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Doctor historical reply').parentElement).alignSelf`), 'flex-end');
      assert.equal(await evaluate(`getComputedStyle([...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Patient historical message').parentElement).alignSelf`), 'flex-start');
      await check(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Doctor historical reply').parentElement.querySelector('[aria-label="Read"]') != null`, 'Doctor historical isRead state renders a double check');
    } else {
      await check(`document.querySelector('[role="log"]').textContent.includes('No messages yet.') && !document.querySelector('[role="log"]').textContent.includes('Doctor historical reply')`, 'Doctor switches to a separate empty conversation');
    }
    const callsBefore = await evaluate('window.__chatTest.calls.length');
    await evaluate(`document.querySelector('main textarea').focus()`);
    await send('Input.insertText', { text: `  Doctor dynamic reply ${chatId}  ` });
    await evaluate(`document.querySelector('main form button[type="submit"]').click()`);
    await check(`document.querySelector('main textarea').value === '' && document.querySelector('[role="log"]').textContent.includes('Doctor dynamic reply ${chatId}')`, 'Doctor SendMessage result appears in selected conversation');
    assert.equal(await evaluate('window.__chatTest.calls.length'), callsBefore + 1);
    assert.deepEqual(await evaluate('window.__chatTest.calls.at(-1)'), { method: 'SendMessage', chatId, content: `Doctor dynamic reply ${chatId}` });
    assert.equal(await evaluate(`[...document.querySelectorAll('[role="log"] p')].filter(element => element.textContent === 'Doctor dynamic reply ${chatId}').length`), 1, 'Doctor echo and invocation result deduplicate');
    assert.equal(await evaluate(`getComputedStyle([...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Doctor dynamic reply ${chatId}').parentElement).alignSelf`), 'flex-end');
    await delay(400);
    assert.ok(await evaluate(`window.__chatTest.readCalls.some(call => call.chatId === ${chatId})`), 'Doctor opening marks the selected dynamic ID');
    await check(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Doctor dynamic reply ${chatId}').parentElement.querySelector('[aria-label="Saved, not marked as read"]') != null`, 'Doctor outgoing message is initially saved and unread');
    if (chatId === 808) {
      await evaluate(`window.__chatTest.receipt({ chatId: 301, readAt: '2026-11-14T19:00:00Z' })`);
      assert.equal(await evaluate(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Doctor dynamic reply 808').parentElement.querySelector('[aria-label="Saved, not marked as read"]') != null`), true, 'inactive receipt does not change selected conversation');
    }
    await evaluate(`window.__chatTest.receipt({ chatId: ${chatId}, readAt: '2026-11-14T19:01:00Z' })`);
    await check(`[...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Doctor dynamic reply ${chatId}').parentElement.querySelector('[aria-label="Read"]') != null`, 'Doctor MessagesRead updates only its sent messages');
    const doctorRaceFetches = chatRestRequests.filter(path => path === `/api/Doctor/Chat/${chatId}/Messages`).length;
    await evaluate(`window.__chatTest.receiptBeforeAck = true; document.querySelector('main textarea').focus()`);
    await send('Input.insertText', { text: `Doctor receipt race ${chatId}` });
    await evaluate(`document.querySelector('main form button[type="submit"]').click()`);
    await check(`document.querySelector('main textarea').value === '' && [...document.querySelectorAll('[role="log"] p')].find(element => element.textContent === 'Doctor receipt race ${chatId}')?.parentElement.querySelector('[aria-label="Read"]') != null`, 'Doctor receipt before send acknowledgement updates without a refresh');
    assert.equal(chatRestRequests.filter(path => path === `/api/Doctor/Chat/${chatId}/Messages`).length, doctorRaceFetches + 1);
    await evaluate('window.__chatTest.receiptBeforeAck = false');
  }
  await evaluate(`window.__chatTest.emit({ id: 203, chatId: 301, senderId: 'a1234567-1234-5678-abcd-123456789abc', content: 'Unselected patient event', createdAt: '2026-11-14T19:00:00Z', isRead: false })`);
  await check(`!document.querySelector('[role="log"]').textContent.includes('Unselected patient event')`, 'Doctor events do not mix patient conversations');
  await evaluate(`window.__chatTest.emit({ id: 204, chatId: 808, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Selected patient event', createdAt: '2026-11-14T19:01:00Z', isRead: false })`);
  await check(`document.querySelector('[role="log"]').textContent.includes('Selected patient event')`, 'Doctor receives selected patient messages in real time');
  const doctorFetches = chatRestRequests.filter(path => path === '/api/Doctor/Chat/808/Messages').length;
  doctorHistory[808].push({ id: 205, chatId: 808, senderId: 'b1234567-1234-5678-abcd-123456789abc', content: 'Doctor reconnect recovery', createdAt: '2026-11-14T19:02:00Z', isRead: false });
  await evaluate('window.__chatTest.disconnect()');
  await check(`document.querySelector('main').textContent.includes('Reconnecting') && document.querySelector('main form button[type="submit"]').disabled`, 'Doctor reconnecting state disables sending');
  await evaluate('window.__chatTest.reconnect()');
  await check(`document.querySelector('[role="log"]').textContent.includes('Doctor reconnect recovery')`, 'Doctor reconnect refetches the selected Doctor history');
  assert.equal(chatRestRequests.filter(path => path === '/api/Doctor/Chat/808/Messages').length, doctorFetches + 1);
  assert.ok(chatRestRequests.every(path => path.startsWith('/api/Doctor/Chat')), 'Doctor never uses Patient REST endpoints');
  await evaluate(`import('/src/auth/session.js').then(({ authSession }) => authSession.logout())`);
  await check(`location.pathname === '/login' && !document.querySelector('[role="log"]') && window.__chatTest.stops >= 1`, 'Doctor logout cleans up the shared hub and messages');
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
