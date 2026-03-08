/**
 * Email Skill for Kyrax (Node.js Puppeteer)
 * 
 * Interacts with Gmail (mail.google.com) natively via Chrome:
 * - Read recent emails
 * - Send emails
 * - Reuses persistent Chrome session
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DATA_DIR = path.join(__dirname, '.email_profile');

let browser = null;
let page = null;

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  return candidates.find(p => fs.existsSync(p));
}

// ── Clean Zombie Chrome for this Profile ──
function cleanZombies() {
  const { execFileSync } = require('child_process');
  try {
    execFileSync('powershell', [
      '-NoProfile', '-Command',
      "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -match '\\.email_profile' } | Invoke-CimMethod -MethodName Terminate"
    ], { stdio: 'ignore' });
  } catch {}
  try {
    const lockFile = path.join(DATA_DIR, 'SingletonLock');
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  } catch {}
}

async function ensureBrowser() {
  if (browser) {
    try { await browser.version(); } catch { browser = null; }
  }

  if (!browser) {
    const chromePath = findChrome();
    cleanZombies();

    const launchOptions = {
      headless: false,
      executablePath: chromePath,
      userDataDir: DATA_DIR,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized', '--disable-blink-features=AutomationControlled'],
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation']
    };

    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (launchErr) {
      console.log('[Email Skill] Initial launch failed, retrying...', launchErr.message);
      cleanZombies();
      await new Promise(r => setTimeout(r, 2000));
      browser = await puppeteer.launch(launchOptions);
    }
  }

  const pages = await browser.pages();
  let targetPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!targetPage) {
    let emptyPage = pages.find(p => p.url() === 'about:blank' || p.url() === 'chrome://newtab/');
    targetPage = emptyPage || await browser.newPage();
    await targetPage.goto('https://mail.google.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    try { await targetPage.bringToFront(); } catch {}
  }

  await new Promise(r => setTimeout(r, 2000));

  try {
    const loginBtn = await targetPage.$('input[type="email"]');
    if (loginBtn) {
      throw new Error('Gmail requires login. Please log in first, then try again.');
    }
  } catch (err) {
    if (err.message.includes('login')) throw err;
  }

  return targetPage;
}

// ══════════════════════════════════════════════
// ACTION: Read Recent Emails
// ══════════════════════════════════════════════
async function readEmails() {
  try {
    const pg = await ensureBrowser();

    // Go to inbox explicitly if we're inside an email
    if (!pg.url().endsWith('#inbox')) {
      await pg.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Gmail email rows are generally inside a table with role="grid"
    const rows = await pg.$$('tr.zA'); // zA is the standard class for Gmail rows
    const emails = [];

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
       try {
         const fromTxt = await rows[i].$eval('span.yP, span.zF', el => el.innerText || el.getAttribute('email'));
         const subjTxt = await rows[i].$eval('span.bog', el => el.innerText);
         const snipTxt = await rows[i].$eval('span.y2', el => el.innerText);
         
         const isUnread = await rows[i].evaluate(el => el.classList.contains('zE')); // zE = unread, yO = read

         emails.push({
           from: fromTxt,
           subject: subjTxt,
           snippet: snipTxt.replace(/[\n\r]/g, '').trim(),
           status: isUnread ? 'Unread' : 'Read'
         });
       } catch (e) {
         // skip row if parsing fails
       }
    }

    if (emails.length === 0) return 'No visible emails found in inbox.';

    return `Recent 5 Emails:\n` + emails.map((e, idx) => 
      `${idx + 1}. [${e.status}] From: ${e.from}\n   Subject: ${e.subject}\n   Summary: ${e.snippet}`
    ).join('\n\n');

  } catch (err) {
    return `Email error: ${err.message}`;
  }
}

// ══════════════════════════════════════════════
// ACTION: Send Email
// ══════════════════════════════════════════════
async function sendEmail(toAddress, subject, body) {
  try {
    const pg = await ensureBrowser();

    // Go to inbox explicitly
    if (!pg.url().endsWith('#inbox')) {
      await pg.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
    }

    // 1. Click Compose button (div with role="button" containing "Compose")
    const composeBtn = await pg.waitForSelector('.T-I.T-I-KE.L3', { timeout: 10000 });
    if (!composeBtn) throw new Error('Could not find Compose button');
    await composeBtn.click();
    await new Promise(r => setTimeout(r, 1500)); // wait for popup

    // 2. To Address
    const toInput = await pg.waitForSelector('input[peoplekit-id]', { timeout: 5000 });
    if (!toInput) throw new Error('Could not find To input');
    
    // Type address and press Enter to lock the chip
    await toInput.click();
    await pg.keyboard.type(toAddress, { delay: 30 });
    await new Promise(r => setTimeout(r, 500));
    await pg.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 400));

    // 3. Subject
    const subjectBox = await pg.$('input[name="subjectbox"]');
    if (!subjectBox) throw new Error('Could not find Subject input');
    await subjectBox.click();
    await pg.keyboard.type(subject, { delay: 20 });
    await new Promise(r => setTimeout(r, 300));

    // 4. Body
    const bodyBox = await pg.$('div[role="textbox"][aria-label="Message Body"]');
    if (!bodyBox) throw new Error('Could not find Body textbox');
    await bodyBox.click();
    // Simulate multiline body
    const lines = body.split('\n');
    for (const line of lines) {
      await pg.keyboard.type(line, { delay: 15 });
      await pg.keyboard.press('Shift');
      await pg.keyboard.press('Enter'); // Next line
    }
    
    await new Promise(r => setTimeout(r, 500));

    // 5. Send (Ctrl + Enter)
    await pg.keyboard.down('Control');
    await pg.keyboard.press('Enter');
    await pg.keyboard.up('Control');
    
    await new Promise(r => setTimeout(r, 2000)); // wait for sending toast

    return `Successfully sent email to ${toAddress} with subject "${subject}".`;

  } catch (err) {
    return `Email error: ${err.message}`;
  }
}

module.exports = {
  readEmails,
  sendEmail
};
