/**
 * WhatsApp Skill for Kyrax (Node.js Puppeteer)
 * 
 * Mirrors the proven approach of whatsapp_skill.py:
 * - Uses Puppeteer to control WhatsApp Web via real DOM selectors
 * - Persistent browser session (no QR scan every time)
 * - contacts.json based contact resolution with fuzzy matching
 * - Reliable message sending via contenteditable + send button
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DATA_DIR = path.join(__dirname, '.wa_profile');
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

let browser = null;
let page = null;

// ── Find Chrome on the user's system ──
function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) throw new Error('Chrome not found on this system.');
  return found;
}

// ── Clean Zombie Chrome for this Profile ──
function cleanZombies() {
  const { execFileSync } = require('child_process');
  try {
    execFileSync('powershell', [
      '-NoProfile', '-Command',
      "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -match '\\.wa_profile' } | Invoke-CimMethod -MethodName Terminate"
    ], { stdio: 'ignore' });
  } catch {}
  try {
    const lockFile = path.join(DATA_DIR, 'SingletonLock');
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  } catch {}
}

// ── Launch or reuse browser + page ──
async function ensureBrowser() {
  if (browser) {
    try {
      await browser.version();
    } catch {
      browser = null;
    }
  }

  if (!browser) {
    const chromePath = findChrome();
    cleanZombies();

    try {
      browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        userDataDir: DATA_DIR,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        defaultViewport: null,
      });
    } catch (launchErr) {
      console.log('[WhatsApp Skill] Initial launch failed, retrying after cleanup...', launchErr.message);
      cleanZombies();
      await new Promise(r => setTimeout(r, 2000));
      browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        userDataDir: DATA_DIR,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        defaultViewport: null,
      });
    }
  }

  const pages = await browser.pages();
  let targetPage = pages.find(p => p.url().includes('web.whatsapp.com'));

  if (!targetPage) {
    let emptyPage = pages.find(p => p.url() === 'about:blank' || p.url() === 'chrome://newtab/');
    targetPage = emptyPage || await browser.newPage();
    await targetPage.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    try { await targetPage.bringToFront(); } catch {}
  }

  console.log('[WhatsApp Skill] Waiting for WhatsApp Web to load...');
  await targetPage.waitForSelector(
    'div[aria-label="Search input textbox"], canvas[aria-label="Scan me!"]',
    { timeout: 60000 }
  );

  const qr = await targetPage.$('canvas[aria-label="Scan me!"]');
  if (qr) {
    throw new Error('WhatsApp requires QR login. Please scan the QR code in the browser window, then try again.');
  }

  return targetPage;
}

// ── Contact Resolution with fuzzy matching ──
function resolveContact(rawName) {
  let contacts = {};
  if (fs.existsSync(CONTACTS_FILE)) {
    try { contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); } catch (e) { }
  }

  const query = rawName.toLowerCase().trim();
  const queryWords = query.split(/\s+/);

  // Helper to extract searchable name from a contact entry
  const getName = (key, val) => {
    if (typeof val === 'string') return val;
    return val.whatsapp_name || val.name || key;
  };

  // Pass 1: Exact key match
  for (const [key, val] of Object.entries(contacts)) {
    if (key.toLowerCase() === query) {
      return getName(key, val);
    }
  }

  // Pass 2: Substring match (query contains key or key contains query)
  const substringMatches = [];
  for (const [key, val] of Object.entries(contacts)) {
    const kLow = key.toLowerCase();
    const wName = getName(key, val).toLowerCase();
    if (kLow.includes(query) || query.includes(kLow) || wName.includes(query) || query.includes(wName)) {
      substringMatches.push({ key, val, score: 100 });
    }
  }
  if (substringMatches.length === 1) {
    return getName(substringMatches[0].key, substringMatches[0].val);
  }

  // Pass 3: Word-overlap scoring (handles "Royal Robi" → "Royal Ravish")
  const wordMatches = [];
  for (const [key, val] of Object.entries(contacts)) {
    const contactWords = key.toLowerCase().split(/\s+/);
    const wName = getName(key, val).toLowerCase();
    const wNameWords = wName.split(/\s+/);
    const allContactWords = [...new Set([...contactWords, ...wNameWords])];

    let score = 0;
    for (const qw of queryWords) {
      for (const cw of allContactWords) {
        if (cw === qw) { score += 10; break; }        // exact word match
        if (cw.startsWith(qw) || qw.startsWith(cw)) { score += 5; break; } // prefix match
      }
    }
    if (score > 0) wordMatches.push({ key, val, score });
  }

  if (wordMatches.length > 0) {
    // Pick the highest scoring match
    wordMatches.sort((a, b) => b.score - a.score);
    return getName(wordMatches[0].key, wordMatches[0].val);
  }

  // No match at all — auto-save and use raw name (the WhatsApp search will handle it)
  contacts[rawName] = {
    name: rawName,
    whatsapp_name: rawName,
    source: 'ui_auto_saved',
  };
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
  return rawName;
}

function resolveContactData(rawName) {
  let contacts = {};
  if (fs.existsSync(CONTACTS_FILE)) {
    try { contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); } catch (e) { }
  }

  const query = rawName.toLowerCase().trim();
  const queryWords = query.split(/\s+/);

  for (const [key, val] of Object.entries(contacts)) {
    if (key.toLowerCase() === query) return val;
  }

  const substringMatches = [];
  for (const [key, val] of Object.entries(contacts)) {
    const kLow = key.toLowerCase();
    const wName = (typeof val === 'string' ? val : (val.whatsapp_name || val.name || key)).toLowerCase();
    if (kLow.includes(query) || query.includes(kLow) || wName.includes(query) || query.includes(wName)) {
      substringMatches.push({ key, val, score: 100 });
    }
  }
  if (substringMatches.length === 1) return substringMatches[0].val;

  const wordMatches = [];
  for (const [key, val] of Object.entries(contacts)) {
    const contactWords = key.toLowerCase().split(/\s+/);
    const wName = (typeof val === 'string' ? val : (val.whatsapp_name || val.name || key)).toLowerCase();
    const wNameWords = wName.split(/\s+/);
    const allContactWords = [...new Set([...contactWords, ...wNameWords])];

    let score = 0;
    for (const qw of queryWords) {
      for (const cw of allContactWords) {
        if (cw === qw) { score += 10; break; }
        if (cw.startsWith(qw) || qw.startsWith(cw)) { score += 5; break; }
      }
    }
    if (score > 0) wordMatches.push({ key, val, score });
  }

  if (wordMatches.length > 0) {
    wordMatches.sort((a, b) => b.score - a.score);
    return wordMatches[0].val;
  }

  return null;
}

// ── Clear search box (mirroring Python's _clear_search) ──
async function clearSearch(pg) {
  try {
    // Try clicking x-alt icon first
    const closeBtn = await pg.$('span[data-icon="x-alt"]');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise(r => setTimeout(r, 300));
      return;
    }
  } catch { }

  // Fallback: select all and delete in search box
  try {
    const searchBox = await pg.$('div[aria-label="Search input textbox"]');
    if (searchBox) {
      await searchBox.click();
      await pg.keyboard.down('Control');
      await pg.keyboard.press('a');
      await pg.keyboard.up('Control');
      await pg.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 200));
    }
  } catch { }
}

// ── Find and open a chat (mirroring Python's _find_and_open_chat) ──
async function findAndOpenChat(pg, contactName) {
  // 1. Focus and clear search box
  const searchBox = await pg.$('div[aria-label="Search input textbox"]');
  if (!searchBox) {
    throw new Error('Could not find WhatsApp search box. Is WhatsApp Web loaded?');
  }

  await searchBox.click();
  await pg.keyboard.down('Control');
  await pg.keyboard.press('a');
  await pg.keyboard.up('Control');
  await pg.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 200));

  // 2. Type contact name slowly so WA shows suggestions
  await pg.keyboard.type(contactName, { delay: 80 });
  await new Promise(r => setTimeout(r, 2000)); // wait for results to populate

  // 3. Try exact title match first (like Python's span[title="..."])
  try {
    const exact = await pg.waitForSelector(`span[title="${contactName}"]`, { timeout: 3000 });
    if (exact) {
      await exact.click();
      await pg.waitForSelector("footer div[contenteditable='true']", { timeout: 8000 });
      return true;
    }
  } catch { }

  // 4. Try case-insensitive contains match via XPath
  try {
    const low = contactName.toLowerCase();
    const [match] = await pg.$x(
      `//span[contains(translate(@title,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "${low}")]`
    );
    if (match) {
      await match.click();
      await pg.waitForSelector("footer div[contenteditable='true']", { timeout: 8000 });
      return true;
    }
  } catch { }

  // 5. Fallback: click top search result if exactly one option
  try {
    const results = await pg.$$('div[role="listitem"]');
    if (results.length >= 1) {
      await results[0].click();
      await pg.waitForSelector("footer div[contenteditable='true']", { timeout: 8000 });
      return true;
    }
  } catch { }

  // Nothing found — clear search
  await clearSearch(pg);
  return false;
}

// ── Send message text (mirroring Python's _send_text) ──
async function sendText(pg, message) {
  // Wait for the message input box in footer
  const box = await pg.waitForSelector("footer div[contenteditable='true']", { timeout: 10000 });

  // Focus and clear any draft
  await box.click();
  await pg.keyboard.down('Control');
  await pg.keyboard.press('a');
  await pg.keyboard.up('Control');
  await pg.keyboard.press('Backspace');

  // Type message
  await pg.keyboard.type(message, { delay: 25 });
  await new Promise(r => setTimeout(r, 300));

  // Try clicking the send button (safer than Enter)
  try {
    const sendBtn = await pg.waitForSelector(
      'button span[data-icon="send"], button span[data-icon="wds-ic-send-filled"]',
      { timeout: 3000 }
    );
    if (sendBtn) {
      // Click the parent button
      const btn = await sendBtn.evaluateHandle(el => el.closest('button'));
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      return true;
    }
  } catch { }

  // Fallback: press Enter
  await pg.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 500));
  return true;
}

// ══════════════════════════════════════════════
// PUBLIC: Main send function
// ══════════════════════════════════════════════
async function sendWhatsAppMessage(contactQuery, messageText) {
  // 1. Resolve contact name from contacts.json
  const contactName = resolveContact(contactQuery);
  console.log(`[WhatsApp Skill] Resolved "${contactQuery}" → "${contactName}"`);

  try {
    // 2. Ensure browser is running and WhatsApp Web is loaded
    const pg = await ensureBrowser();

    // 3. Find and open the chat
    console.log(`[WhatsApp Skill] Searching for contact: ${contactName}`);
    const opened = await findAndOpenChat(pg, contactName);

    if (!opened) {
      return `Contact "${contactName}" was not found on WhatsApp. Please check the name and try again.`;
    }

    // 4. Send the message
    console.log(`[WhatsApp Skill] Sending message...`);
    await sendText(pg, messageText);

    console.log(`[WhatsApp Skill] ✅ Message sent to ${contactName}`);
    return `Message successfully sent to ${contactName} via WhatsApp Web.`;

  } catch (err) {
    console.error('[WhatsApp Skill] Error:', err.message);
    return `WhatsApp error: ${err.message}`;
  }
}

// ══════════════════════════════════════════════
// ACTION: Make Audio Call
// ══════════════════════════════════════════════
async function callWhatsAppContact(contactQuery) {
  const contactName = resolveContact(contactQuery);
  console.log(`[WhatsApp Skill] Resolved "${contactQuery}" → "${contactName}" for calling`);

  try {
    const pg = await ensureBrowser();
    const opened = await findAndOpenChat(pg, contactName);

    if (!opened) {
      return `Contact "${contactName}" was not found on WhatsApp to call.`;
    }

    // Try finding the Voice Call button
    try {
      const callBtn = await pg.waitForSelector(
        'button span[data-icon="ic-audio-call"], button span[data-icon="wds-ic-audio-call"], div[title="Voice call"], button[aria-label="Voice call"], div[title="Audio call"], button[aria-label="Audio call"]',
        { timeout: 7000 }
      );
      if (callBtn) {
        // Try finding the closest button element to click, otherwise click the element itself
        const btn = await callBtn.evaluateHandle(el => el.closest('button') || el.closest('div[role="button"]') || el);
        await btn.click();
        await new Promise(r => setTimeout(r, 2000));
        return `Successfully initiated a voice call to ${contactName} on WhatsApp. (Note: Audio stream injection for TTS speaking is not supported by Google Chrome automatically, so you will need to speak into your microphone once they pick up).`;
      }
    } catch {
      return `Opened chat for ${contactName}, but could not find the Audio Call button. (Note: WhatsApp Web may not have calling enabled for this particular contact/browser right now).`;
    }

    return `Failed to start call.`;
  } catch (err) {
    return `WhatsApp error: ${err.message}`;
  }
}

async function closeWhatsApp() {
  if (browser) {
    try { await browser.close(); } catch {}
    browser = null;
  }
}

module.exports = {
  sendWhatsAppMessage,
  callWhatsAppContact,
  closeWhatsApp,
  resolveContact, // exported for testing
  resolveContactData
};
