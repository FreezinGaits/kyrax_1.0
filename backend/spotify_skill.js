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
const puppeteer = require('puppeteer');

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

// ── Launch or reuse browser + page ──
async function ensureBrowser() {
  if (browser) {
    try {
      await browser.version();
    } catch {
      browser = null;
      page = null;
    }
  }

  if (!browser) {
    const chromePath = findChrome();

    // Clean up stale lock file if previous run crashed
    const lockFile = path.join(DATA_DIR, 'SingletonLock');
    try { if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile); } catch {}

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
      try {
        const { execSync } = require('child_process');
        // Only kill Chrome processes using our specific profile (not user's main Chrome)
        const lockPath = path.join(DATA_DIR, 'SingletonLock');
        try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch {}
        await new Promise(r => setTimeout(r, 2000));
      } catch {}

      browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        userDataDir: DATA_DIR,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized', '--autoplay-policy=no-user-gesture-required', '--disable-blink-features=AutomationControlled'],
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation']
      });
    }

    const pages = await browser.pages();
    page = pages[0];
  }

  return page;
}

// ── Ensure we're on Spotify Web Player ──
async function ensureSpotifyLoaded() {
  const pg = await ensureBrowser();

  if (!pg.url().includes('open.spotify.com')) {
    await pg.goto('https://open.spotify.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  // Wait for the page to be reasonably loaded
  await new Promise(r => setTimeout(r, 2000));

  // Check if login is needed
  const loginBtn = await pg.$('button[data-testid="login-button"]');
  if (loginBtn) {
    throw new Error('Spotify requires login. A browser window has opened at open.spotify.com. Please log in first, then try again.');
  }

  return pg;
}

// ══════════════════════════════════════════════
// ACTION: Open Spotify
// ══════════════════════════════════════════════
async function openSpotify() {
  try {
    const pg = await ensureSpotifyLoaded();
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
    const pg = await ensureSpotifyLoaded();

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
    const pg = await ensureSpotifyLoaded();

    // Navigate directly to search
    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    await pg.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000)); // wait for results

    // Strategy 1: Click the big green play button on top result card
    try {
      const topPlayBtn = await pg.$('[data-testid="top-result-card"] button[data-testid="play-button"]');
      if (topPlayBtn) {
        await topPlayBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        console.log('[Spotify Skill] ✅ Playing top result for:', query);
        return `Now playing "${query}" on Spotify.`;
      }
    } catch {}

    // Strategy 2: Hover over first track row and click its play button
    try {
      const firstRow = await pg.$('[data-testid="tracklist-row"], div[aria-rowindex="1"]');
      if (firstRow) {
        await firstRow.hover();
        await new Promise(r => setTimeout(r, 500));
        const playBtn = await firstRow.$('button[data-testid="play-button"], button[aria-label="Play"]');
        if (playBtn) {
          await playBtn.click();
          await new Promise(r => setTimeout(r, 1000));
          console.log('[Spotify Skill] ✅ Playing first track for:', query);
          return `Now playing "${query}" on Spotify.`;
        }
      }
    } catch {}

    // Strategy 3: Click any visible play button on the page
    try {
      const anyPlay = await pg.$('button[data-testid="play-button"]');
      if (anyPlay) {
        await anyPlay.click();
        await new Promise(r => setTimeout(r, 1000));
        console.log('[Spotify Skill] ✅ Playing via fallback button for:', query);
        return `Now playing "${query}" on Spotify.`;
      }
    } catch {}

    // Strategy 4: Double-click the first track-row (usually starts playing it)
    try {
      const firstTrack = await pg.$('[data-testid="tracklist-row"]');
      if (firstTrack) {
        await firstTrack.click({ clickCount: 2 });
        await new Promise(r => setTimeout(r, 1000));
        console.log('[Spotify Skill] ✅ Double-clicked first track for:', query);
        return `Now playing "${query}" on Spotify.`;
      }
    } catch {}

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
    await browser.close();
    browser = null;
    page = null;
  }
}

module.exports = {
  openSpotify,
  searchSpotify,
  playOnSpotify,
  closeSpotify,
};
