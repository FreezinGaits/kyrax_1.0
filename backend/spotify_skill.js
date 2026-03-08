/**
 * Spotify Skill for Kyrax (Node.js Puppeteer)
 * 
 * Controls Spotify Web Player (open.spotify.com) in Chrome:
 * - Open Spotify Web Player
 * - Search for songs/artists/playlists
 * - Play songs, playlists, albums
 * - Persistent browser session (reuses WhatsApp browser if available)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DATA_DIR = path.join(__dirname, '.spotify_profile');

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
      "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -match '\\.spotify_profile' } | Invoke-CimMethod -MethodName Terminate"
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized', '--autoplay-policy=no-user-gesture-required', '--disable-blink-features=AutomationControlled'],
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation']
      });
    } catch (launchErr) {
      console.log('[Spotify Skill] Initial launch failed, retrying...', launchErr.message);
      cleanZombies();
      await new Promise(r => setTimeout(r, 2000));
      browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        userDataDir: DATA_DIR,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized', '--autoplay-policy=no-user-gesture-required', '--disable-blink-features=AutomationControlled'],
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation']
      });
    }
  }

  const pages = await browser.pages();
  // Find an existing Spotify tab, or an empty tab to reuse
  let targetPage = pages.find(p => p.url().includes('open.spotify.com'));
  
  if (!targetPage) {
    let emptyPage = pages.find(p => p.url() === 'about:blank' || p.url() === 'chrome://newtab/');
    targetPage = emptyPage || await browser.newPage();
    await targetPage.goto('https://open.spotify.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  } else {
    try { await targetPage.bringToFront(); } catch {}
  }

  // Wait for the page to be reasonably loaded
  await new Promise(r => setTimeout(r, 2000));

  // Check if login is needed
  const loginBtn = await targetPage.$('button[data-testid="login-button"]');
  if (loginBtn) {
    throw new Error('Spotify requires login. A browser window has opened at open.spotify.com. Please log in first, then try again.');
  }

  return targetPage;
}

// ══════════════════════════════════════════════
// ACTION: Open Spotify
// ══════════════════════════════════════════════
async function openSpotify() {
  try {
    await ensureBrowser();
    console.log('[Spotify Skill] ✅ Spotify Web Player opened.');
    return 'Spotify Web Player is now open and ready.';
  } catch (err) {
    console.error('[Spotify Skill] Error:', err.message);
    return `Spotify error: ${err.message}`;
  }
}

// ══════════════════════════════════════════════
// ACTION: Search for a song/artist/playlist
// ══════════════════════════════════════════════
async function searchSpotify(query) {
  try {
    const pg = await ensureBrowser();

    // Navigate directly to search URL (most reliable)
    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    await pg.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000)); // let results load

    // Try to gather top results
    const results = [];
    try {
      // Get song/track cards or list items
      const items = await pg.$$('[data-testid="tracklist-row"], [data-testid="top-result-card"], div[aria-rowindex]');
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        try {
          const text = await items[i].evaluate(el => el.innerText.replace(/\n/g, ' - ').substring(0, 100));
          if (text.trim()) results.push(text.trim());
        } catch {}
      }
    } catch {}

    if (results.length > 0) {
      console.log(`[Spotify Skill] ✅ Found ${results.length} results for "${query}"`);
      return `Spotify search results for "${query}":\n${results.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    }

    return `Searched for "${query}" on Spotify. Results are displayed in the browser.`;
  } catch (err) {
    console.error('[Spotify Skill] Error:', err.message);
    return `Spotify error: ${err.message}`;
  }
}

// ══════════════════════════════════════════════
// ACTION: Play a song/artist/playlist
// ══════════════════════════════════════════════
async function playOnSpotify(query) {
  try {
    const pg = await ensureBrowser();

    // If no query is provided (e.g. "press play", "resume spotify")
    if (!query || query.trim() === '') {
      try {
        const played = await pg.evaluate(() => {
          const globalPlayBtn = document.querySelector('button[data-testid="control-button-playpause"]');
          if (globalPlayBtn) {
            globalPlayBtn.click();
            return true;
          }
          return false;
        });
        if (played) return 'Toggled playback on Spotify.';
      } catch (e) {}
      return 'Could not find the global play/pause button on Spotify.';
    }

    // Navigate directly to search
    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    await pg.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Wait specifically for the search results container instead of a hard sleep
    try {
      await pg.waitForSelector('main[aria-label="Spotify - Search"], div[data-testid="search-results"]', { timeout: 8000 });
    } catch (e) {
      await new Promise(r => setTimeout(r, 4000)); // fallback sleep
    }

    // Strategy 1: Click the big green play button on top result card
    try {
      const topPlayBtn = await pg.$('div[data-testid="top-result-card"] button[data-testid="play-button"]');
      if (topPlayBtn) {
        await topPlayBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        console.log('[Spotify Skill] ✅ Playing top result for:', query);
        return `Now playing "${query}" on Spotify.`;
      }
    } catch {}

    // Strategy 2: Click the first track's play button (can be hidden until hover, so we evaluate JS)
    try {
      const played = await pg.evaluate(() => {
        // EXCLUDE the global bottom player bar when searching!
        const mainArea = document.querySelector('main') || document.body;
        
        // try finding ANY play button in a tracklist row
        const playBtns = Array.from(mainArea.querySelectorAll('div[data-testid="tracklist-row"] button[aria-label*="Play"], div[data-testid="tracklist-row"] button[data-testid="play-button"]'));
        if (playBtns.length > 0) {
          playBtns[0].click();
          return true;
        }
        
        // try selecting the first row and double clicking it
        const firstRow = mainArea.querySelector('div[data-testid="tracklist-row"]');
        if (firstRow) {
          const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window });
          firstRow.dispatchEvent(event);
          return true;
        }

        // try the master Top Result play button again strictly inside main area
        const topResultBtn = mainArea.querySelector('div[data-testid="top-result-card"] button, button[data-testid="play-button"]');
        // Ensure it's not the global player play button
        if (topResultBtn && !topResultBtn.closest('[data-testid="now-playing-bar"]')) {
          topResultBtn.click();
          return true;
        }

        return false;
      });

      if (played) {
        await new Promise(r => setTimeout(r, 1000));
        console.log('[Spotify Skill] ✅ Playing via JS evaluation for:', query);
        return `Now playing "${query}" on Spotify.`;
      }
    } catch (e) {
      console.log('[Spotify Skill] JS eval failed:', e.message);
    }

    return `Searched for "${query}" on Spotify but could not auto-play. Results are shown in the browser — please click a song to play.`;
  } catch (err) {
    console.error('[Spotify Skill] Error:', err.message);
    return `Spotify error: ${err.message}`;
  }
}

// ══════════════════════════════════════════════
// CLOSE
// ══════════════════════════════════════════════
async function closeSpotify() {
  if (browser) {
    try { await browser.close(); } catch {}
    browser = null;
  }
}

module.exports = {
  openSpotify,
  searchSpotify,
  playOnSpotify,
  closeSpotify,
};
