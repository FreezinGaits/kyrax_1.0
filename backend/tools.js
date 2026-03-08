// backend/tools.js — Kyrax OS Tool Engine
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const whatsappSkill = require('./whatsapp_skill');
const spotifySkill = require('./spotify_skill');
const axios = require('axios');

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/f72139ba-74b2-4eae-a8ba-2312c4dc8d4f';

// ── PowerShell Runner (writes script to temp file to avoid escaping nightmares) ──
const runPS = (script) => {
  const tmpFile = path.join(os.tmpdir(), `kyrax_ps_${Date.now()}.ps1`);
  try {
    fs.writeFileSync(tmpFile, script, 'utf-8');
    const stdout = execSync(
      `powershell -ExecutionPolicy Bypass -File "${tmpFile}"`,
      { stdio: 'pipe', timeout: 30000 }
    );
    return stdout.toString().trim() || 'Done.';
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString().trim() : '';
    const stderr = err.stderr ? err.stderr.toString().trim() : '';
    if (stdout) return stdout;
    return `Error: ${stderr || err.message}`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
};

// ── Path helper ──
const getAbsolutePath = (reqPath) => {
  const low = (reqPath || '').toLowerCase().trim();
  if (low === 'desktop') {
    // Windows Desktop can be in different places — use shell folder
    const desktopPath = path.join(os.homedir(), 'Desktop');
    if (fs.existsSync(desktopPath)) return desktopPath;
    const oneDriveDesktop = path.join(os.homedir(), 'OneDrive', 'Desktop');
    if (fs.existsSync(oneDriveDesktop)) return oneDriveDesktop;
    return desktopPath; // fallback
  }
  if (low === 'current' || low === 'project') {
    return path.resolve(__dirname, '../');
  }
  if (path.isAbsolute(reqPath)) return reqPath;
  return path.resolve(__dirname, '../', reqPath);
};

// ── Tool Definitions (what the LLM sees) ──
const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'open_website',
      description: 'Opens ONE URL in the default browser. For YouTube searches: use https://www.youtube.com/results?search_query=QUERY. For Google searches: use https://www.google.com/search?q=QUERY. ONLY call this ONCE per user request with the single best URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Single full URL to open' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_application',
      description: 'Opens ANY Windows desktop or UWP app by searching Start Menu. Works for ALL apps including: Camera, Calculator, Instagram, CapCut, Chrome, WhatsApp, Notepad, VS Code, Paint, Settings, File Explorer, etc. Use this for ANY "open [app]" request that is not a website.',
      parameters: {
        type: 'object',
        properties: {
          app_name: { type: 'string', description: 'Name of the app to open, e.g. CapCut, Chrome' }
        },
        required: ['app_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'close_application',
      description: 'Closes an app by process name. Common names: chrome, msedge, CapCut, notepad, WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          process_name: { type: 'string', description: 'Process name to kill' }
        },
        required: ['process_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_volume',
      description: 'Changes the system volume level. Useful for "set volume to 30", "half volume", "mute", etc.',
      parameters: {
        type: 'object',
        properties: {
          level: { type: 'string', description: 'Volume level: 0-100 as number, or "mute", "unmute", "up", "down", "half", "full"' }
        },
        required: ['level']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: 'Retrieves the hardware configuration and specs of the current laptop/PC (CPU, GPU, RAM, OS version). Use this to answer questions about the laptop\'s graphics card, memory, processors, etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'close_specific_tab',
      description: 'Closes a specific tab in Chrome by finding its title. Example: to close YouTube, target_phrase should be "YouTube".',
      parameters: {
        type: 'object',
        properties: {
          target_phrase: { type: 'string', description: 'The word to search for in the browser tab title, e.g. "YouTube"' }
        },
        required: ['target_phrase']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_message',
      description: 'Opens WhatsApp Web in Chrome, searches for a contact by name, and sends them a text message. IMPORTANT: You MUST have both the contact_name AND the message before calling this tool. If the user did not provide either the contact name or the message, DO NOT call this tool — instead ask the user to provide the missing information.',
      parameters: {
        type: 'object',
        properties: {
          contact_name: { type: 'string', description: 'Contact name to search for' },
          message: { type: 'string', description: 'Message text to send' }
        },
        required: ['contact_name', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'phone_call',
      description: 'Finds a contact by name in contacts.json and dials their phone number using the laptop\'s native phone dialer. Optionally speaks a voice message through the laptop speaker after the call connects (useful for automated messages).',
      parameters: {
        type: 'object',
        properties: {
          contact_name: { type: 'string', description: 'Contact name to call' },
          message: { type: 'string', description: 'Optional voice message to speak out loud through the laptop speaker after the call connects. Leave empty for a normal call with no automated message.' }
        },
        required: ['contact_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Lists all files and folders in a directory and returns the count. Use "desktop" for Desktop, "current" for project root, or give absolute path.',
      parameters: {
        type: 'object',
        properties: {
          dir_path: { type: 'string', description: '"desktop", "current", or an absolute path' }
        },
        required: ['dir_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_files',
      description: 'File system operations: create_folder, delete_folder, create_file (overwrites), append_file (adds to end). Paths are relative to project root unless absolute.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create_folder', 'delete_folder', 'create_file', 'append_file'] },
          target_path: { type: 'string', description: 'File or folder path' },
          content: { type: 'string', description: 'Content for file (create_file or append_file)' }
        },
        required: ['action', 'target_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'spotify_control',
      description: 'Controls Spotify Web Player. Actions: "open" (just opens Spotify), "search" (searches for a song/artist/playlist and returns results), "play" (searches and plays the top result). Use this for ANY Spotify-related request.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['open', 'search', 'play'], description: 'What to do: open, search, or play' },
          query: { type: 'string', description: 'Song name, artist, or playlist to search/play. Required for search and play actions.' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'n8n_agent',
      description: 'Forwards requests to the n8n AI Agent workflow which has access to: Google Calendar (create/view/list events), Gmail (read/send/summarize emails), Google Tasks (create/list/get/delete tasks), Google Docs (create/update/read notes), Google Sheets (log/track expenses), SerpAPI (web search for current info), and Calculator. Use this for ANY request involving: calendar/scheduling, email, tasks/to-dos, notes, expenses/budgeting, web search for current info, or calculations.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The full natural language request to forward to the n8n agent. Be descriptive and include all details the user provided.' }
        },
        required: ['message']
      }
    }
  }
];

// ── Tool Executor ──
const executeTool = async (name, args) => {
  console.log(`  [Tool Executor] ${name}`, JSON.stringify(args));
  try {
    switch (name) {

      case 'open_website': {
        const url = args.url;
        // Use start command directly — most reliable on Windows
        execSync(`start "" "${url}"`, { shell: 'cmd.exe', stdio: 'ignore' });
        return `Opened ${url} in browser.`;
      }

      case 'open_application': {
        const appName = args.app_name;
        const script = `
$app = Get-StartApps | Where-Object { $_.Name -match '${appName}' } | Select-Object -First 1
if ($app) {
  Start-Process "explorer.exe" "shell:AppsFolder\\$($app.AppID)"
  Write-Output "Opened $($app.Name)"
} else {
  Write-Output "App '${appName}' not found in Start Menu."
}`;
        return runPS(script);
      }

      case 'close_application': {
        const proc = args.process_name;
        const script = `
$procs = Get-Process -Name '${proc}' -ErrorAction SilentlyContinue
if ($procs) {
  Stop-Process -Name '${proc}' -Force -ErrorAction SilentlyContinue
  Write-Output "Closed ${proc}."
} else {
  Write-Output "${proc} is not running."
}`;
        return runPS(script);
      }

      case 'set_volume': {
        const levelStr = String(args.level).toLowerCase();
        let targetLevel = 50; 
        
        if (levelStr.includes('half')) targetLevel = 50;
        else if (levelStr.includes('full') || levelStr.includes('high')) targetLevel = 100;
        else if (levelStr.includes('low')) targetLevel = 20;
        else if (levelStr.includes('mute')) targetLevel = 0;
        else targetLevel = parseInt(levelStr.replace(/\D/g, '')) || 50;

        // Force bounds
        targetLevel = Math.max(0, Math.min(100, targetLevel));

        const script = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class Audio {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
}
"@
# 174 is VolDown, 175 is VolUp
for($i=0; $i -lt 50; $i++) { [Audio]::keybd_event(174, 0, 0, 0) }
$upCount = [math]::Round(${targetLevel} / 2)
for($i=0; $i -lt $upCount; $i++) { [Audio]::keybd_event(175, 0, 0, 0) }
Write-Output "System volume set to ~${targetLevel}%"
`;
        return runPS(script);
      }

      case 'close_specific_tab': {
        const target = args.target_phrase;
        const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public static string GetActiveTitle() {
      StringBuilder b = new StringBuilder(256);
      GetWindowText(GetForegroundWindow(), b, 256);
      return b.ToString();
  }
}
"@

$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue
if (-not $chrome) { Write-Output "Chrome is not running. Therefore, ${target} is not open."; exit 1 }

$hwnd = $chrome[0].MainWindowHandle
[Win]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 100
[Win]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 100

$initialTitle = [Win]::GetActiveTitle()
$found = $false
# Max 40 tabs scan to prevent infinite looping
for ($i=0; $i -lt 40; $i++) {
    $title = [Win]::GetActiveTitle()
    if ($title -match '${target}') {
        $found = $true
        [System.Windows.Forms.SendKeys]::SendWait("^w")
        Write-Output "Successfully found and closed the '${target}' tab."
        break
    }
    
    [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")
    Start-Sleep -Milliseconds 60
    
    # Check if we cycled back completely to stop instantly
    if ($i -gt 0 -and [Win]::GetActiveTitle() -eq $initialTitle) {
        break
    }
}
if (-not $found) { Write-Output "Could not find any open Chrome tab matching '${target}'." }
`;
        return runPS(script);
      }

      case 'get_system_info': {
        const osModule = require('os');
        const cpus = osModule.cpus();
        const totalMemGB = (osModule.totalmem() / (1024 ** 3)).toFixed(2);
        const freeMemGB = (osModule.freemem() / (1024 ** 3)).toFixed(2);
        const platform = osModule.platform() === 'win32' ? 'Windows' : osModule.platform();
        const release = osModule.release();
        const arch = osModule.arch();

        let gpuInfo = "Unknown GPU";
        if (platform === 'Windows') {
            try {
                gpuInfo = execSync('powershell -Command "(Get-CimInstance Win32_VideoController).Name -join \', \'"', { encoding: 'utf-8', stdio: 'pipe' }).trim();
            } catch (err) {
                gpuInfo = "Could not fetch GPU info";
            }
        }
        
        return `System Configuration:
- OS: ${platform} ${release} (${arch})
- CPU: ${cpus[0].model} (${cpus.length} Cores)
- GPU: ${gpuInfo}
- RAM: ${totalMemGB} GB Total (${freeMemGB} GB Free)`;
      }

      case 'send_whatsapp_message': {
        const rawContact = args.contact_name;
        const msg = args.message;
        
        return await whatsappSkill.sendWhatsAppMessage(rawContact, msg);
      }

      case 'phone_call': {
        const contactData = whatsappSkill.resolveContactData(args.contact_name);
        if (!contactData || !contactData.phone) {
          return `Error: Could not find a saved phone number for "${args.contact_name}" in contacts.json. Please add their phone number first or provide the raw number.`;
        }
        try {
          // Launch the native Windows dialer via tel: protocol
          require('child_process').exec(`Start-Process "tel:${contactData.phone}"`, { shell: 'powershell.exe' });
          
          const voiceMessage = args.message;
          if (voiceMessage && voiceMessage.trim()) {
            // Wait for the call to connect, then speak the message via Windows TTS
            const sanitizedMsg = voiceMessage.replace(/'/g, "''").replace(/"/g, '`"');
            const ttsScript = `
Start-Sleep -Seconds 15
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0
$synth.Volume = 100
$synth.Speak('${sanitizedMsg}')
$synth.Dispose()
`;
            // Run TTS in background (non-blocking) so the tool returns immediately
            const tmpFile = path.join(os.tmpdir(), `kyrax_call_tts_${Date.now()}.ps1`);
            fs.writeFileSync(tmpFile, ttsScript, 'utf-8');
            require('child_process').exec(
              `powershell -ExecutionPolicy Bypass -File "${tmpFile}"`,
              { shell: 'powershell.exe', timeout: 60000 },
              () => { try { fs.unlinkSync(tmpFile); } catch {} }
            );
            return `Dialing ${contactData.name || args.contact_name} at ${contactData.phone}. After the call connects (~15 seconds), Kyrax will speak the following message through the laptop speaker: "${voiceMessage}". Please keep your phone on speaker near the laptop.`;
          }
          
          return `Dialing ${contactData.name || args.contact_name} at ${contactData.phone} using the laptop's native phone program.`;
        } catch (e) {
          return `Failed to initiate native call: ${e.message}`;
        }
      }

      case 'spotify_control': {
        const action = args.action;
        const query = args.query || '';
        
        switch (action) {
          case 'open':
            return await spotifySkill.openSpotify();
          case 'search':
            return await spotifySkill.searchSpotify(query);
          case 'play':
            return await spotifySkill.playOnSpotify(query);
          default:
            return 'Unknown Spotify action. Use: open, search, or play.';
        }
      }

      case 'n8n_agent': {
        try {
          console.log(`[n8n Agent] Forwarding to webhook: "${args.message.substring(0, 80)}..."`);
          const response = await axios.post(N8N_WEBHOOK_URL, { message: args.message }, { timeout: 120000 });
          // n8n returns array of results, grab the output
          const data = response.data;
          if (Array.isArray(data) && data.length > 0 && data[0].output) {
            console.log(`[n8n Agent] ✅ Response received (${data[0].output.length} chars)`);
            return data[0].output;
          }
          return typeof data === 'string' ? data : JSON.stringify(data);
        } catch (e) {
          console.error('[n8n Agent] Error:', e.message);
          return `n8n workflow error: ${e.message}. Make sure n8n is running on localhost:5678.`;
        }
      }

      case 'list_directory': {
        const dir = getAbsolutePath(args.dir_path);
        if (!fs.existsSync(dir)) return `Directory '${dir}' does not exist.`;
        const entries = fs.readdirSync(dir);
        let folders = 0, files = 0;
        const names = [];
        entries.forEach(e => {
          try {
            const stat = fs.statSync(path.join(dir, e));
            if (stat.isDirectory()) { folders++; names.push(`[DIR] ${e}`); }
            else { files++; names.push(`      ${e}`); }
          } catch (_) {}
        });
        const listing = names.slice(0, 40).join('\n'); // Cap at 40 entries
        return `${dir}\n${folders} folders, ${files} files.\n${listing}`;
      }

      case 'manage_files': {
        const target = getAbsolutePath(args.target_path);
        switch (args.action) {
          case 'create_folder':
            fs.mkdirSync(target, { recursive: true });
            return `Created folder: ${target}`;
          case 'delete_folder':
            fs.rmSync(target, { recursive: true, force: true });
            return `Deleted: ${target}`;
          case 'create_file':
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, args.content || '');
            return `Created file: ${target}`;
          case 'append_file':
            fs.appendFileSync(target, '\n' + (args.content || ''));
            return `Appended to: ${target}`;
          default:
            return 'Unknown action.';
        }
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    console.error(`  [Tool Error] ${name}:`, err.message);
    return `Tool failed: ${err.message}`;
  }
};

module.exports = { toolDefinitions, executeTool };
