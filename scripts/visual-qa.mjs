import fs from 'node:fs';
import path from 'node:path';

const endpoint = 'http://127.0.0.1:9223';
const appUrl = process.env.QA_APP_URL || 'http://127.0.0.1:3000/register';
const statusUrl = new URL('/application-status', appUrl).toString();
const outputDirectory = path.resolve('qa-screenshots');
fs.mkdirSync(outputDirectory, { recursive: true });

const tabs = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = tabs.find((tab) => tab.type === 'page');
if (!target) throw new Error('No Chrome DevTools page target was found.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++commandId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function waitFor(expression, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await delay(200);
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result.value) return true;
  }
  return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');

const hours = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({ day, isOpen: true, is24Hours: false, open: '08:00', close: '20:00' }));
hours.push({ day: 'Saturday', isOpen: true, is24Hours: false, open: '09:00', close: '18:00' }, { day: 'Sunday', isOpen: false, is24Hours: false, open: '09:00', close: '17:00' });
const data = {
  email: 'owner@example.test', password: '', confirmPassword: '', pharmacyName: 'St. Martha Community Pharmacy', contact: '+63 917 555 0148', contactEmail: '',
  businessName: 'St. Martha Drug Corporation', businessType: 'Corporation', registrationNo: 'DEMO-REG-1042', permitNo: 'DEMO-PERMIT-2026', tin: '000-000-000',
  registeredAddress: 'Poblacion, San Pablo City, Laguna', contactPerson: 'Demo Account Owner', latitude: '14.068612', longitude: '121.325134',
  conciseAddress: 'Near the public market', locationSource: 'manual', locationAccuracy: null, locationConfirmedAt: new Date().toISOString(),
};
const documents = Object.fromEntries(['fda', 'permit', 'prc'].map((key) => [key, { name: `${key}-sample.pdf`, size: '1.2 MB', sizeBytes: 1200000, type: 'application/pdf', url: '', progress: 0, status: 'reselection-required', extractionStatus: 'not-configured' }]));

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 768 });
}

async function loadStep(step) {
  const draft = { version: 3, step, data, hours, holidays: [], documents, photo: null, savedAt: new Date().toISOString() };
  await send('Page.navigate', { url: 'about:blank' });
  await delay(120);
  await send('Page.navigate', { url: appUrl });
  const originReady = await waitFor(`location.href.startsWith(${JSON.stringify(new URL(appUrl).origin)}) && document.readyState === 'complete'`);
  if (!originReady) throw new Error(`The app origin did not finish loading for step ${step + 1}.`);
  const expectedHeading = ['Account', 'Pharmacy', 'Location', 'Operating Hours', 'Documents', 'Business & Review'][step];
  let stepReady = false;
  for (let attempt = 0; attempt < 2 && !stepReady; attempt += 1) {
    await send('Runtime.evaluate', { expression: `sessionStorage.setItem('ooc-brand-reveal', 'seen'); localStorage.setItem('ooc-pharmacy-registration-v3', ${JSON.stringify(JSON.stringify(draft))}); location.reload();` });
    stepReady = await waitFor(`document.querySelector('.register-heading h2')?.textContent?.trim() === ${JSON.stringify(expectedHeading)}`);
  }
  if (!stepReady) throw new Error(`Step ${step + 1} did not render the expected heading.`);
  if (step === 2) await delay(700);
}

async function capture(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path.join(outputDirectory, `${name}.png`), Buffer.from(result.data, 'base64'));
  const metrics = await send('Runtime.evaluate', {
    expression: `(() => {
      const story = document.querySelector('.auth-story');
      const faro = document.querySelector('.auth-faro');
      const copy = document.querySelector('.auth-story-copy');
      const intersects = (a,b) => a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      return {
        url: location.href,
        readyState: document.readyState,
        bodyText: document.body?.innerText?.slice(0, 160),
        viewport: [innerWidth, innerHeight],
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        backButtons: [...document.querySelectorAll('button')].filter((button) => button.textContent.trim() === 'Back').length,
        stepCount: document.querySelectorAll('.stepper li').length,
        faroCopyOverlap: story && getComputedStyle(story).display !== 'none' ? intersects(faro?.getBoundingClientRect(), copy?.getBoundingClientRect()) : false,
        heading: document.querySelector('.register-heading h2')?.textContent,
      };
    })()`, returnByValue: true,
  });
  return metrics.result.value;
}

const report = [];
const viewports = [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [390, 844]];
for (const [width, height] of viewports) {
  await setViewport(width, height);
  await loadStep(0);
  report.push({ screenshot: `step-1-${width}x${height}.png`, ...(await capture(`step-1-${width}x${height}`)) });
}
await setViewport(1440, 900);
for (let step = 1; step < 6; step += 1) {
  await loadStep(step);
  report.push({ screenshot: `step-${step + 1}-1440x900.png`, ...(await capture(`step-${step + 1}-1440x900`)) });
  if (step === 2) {
    await send('Runtime.evaluate', { expression: `Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(_success, error) { error({ code: 1, PERMISSION_DENIED: 1 }); } } })` });
    await send('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Use My Current Location'))?.click()` });
    await waitFor(`document.querySelector('.location-alert')?.textContent?.includes('permission was denied')`);
    report.push({ screenshot: 'step-3-gps-denied-1440x900.png', ...(await capture('step-3-gps-denied-1440x900')) });
  }
  if (step === 4) {
    const root = await send('DOM.getDocument');
    const inputs = await send('DOM.querySelectorAll', { nodeId: root.root.nodeId, selector: '.document-upload-list input[type="file"]' });
    if (inputs.nodeIds[0]) {
      await send('DOM.setFileInputFiles', { nodeId: inputs.nodeIds[0], files: [path.join(outputDirectory, 'step-1-390x844.png')] });
      await waitFor(`document.querySelector('.document-state.warning')?.textContent?.includes('Needs a clearer image')`);
      report.push({ screenshot: 'step-5-quality-warning-1440x900.png', ...(await capture('step-5-quality-warning-1440x900')) });
    }
  }
}

await send('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Review application'))?.click()` });
await delay(350);
report.push({ screenshot: 'step-6-final-review-1440x900.png', ...(await capture('step-6-final-review-1440x900')) });

async function loadStatus(status) {
  const application = {
    id: 'APP-DEMO-2026-0418', status, submittedAt: 'October 23, 2026',
    requestedChanges: status === 'NEEDS_CHANGES' ? ['Business Permit image: upload a clearer copy with every corner and the expiry date visible.'] : [],
  };
  await send('Runtime.evaluate', { expression: `localStorage.setItem('ooc-demo-application-state', ${JSON.stringify(JSON.stringify(application))})` });
  await send('Page.navigate', { url: `${statusUrl}?qa=${Date.now()}` });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await delay(200);
    const ready = await send('Runtime.evaluate', { expression: `document.querySelector('.status-badge')?.textContent?.trim().toUpperCase().replace(' ', '_') === ${JSON.stringify(status)}`, returnByValue: true });
    if (ready.result.value) break;
  }
}

for (const status of ['PENDING', 'NEEDS_CHANGES', 'APPROVED']) {
  await loadStatus(status);
  const slug = status.toLowerCase().replace('_', '-');
  report.push({ screenshot: `status-${slug}-1440x900.png`, ...(await capture(`status-${slug}-1440x900`)) });
}

fs.writeFileSync(path.join(outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
socket.close();
