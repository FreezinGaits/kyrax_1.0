// backend/tools.js — Kyrax OS Tool Engine
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
      description: 'Opens a Windows desktop app by searching Start Menu. Works for apps like CapCut, Chrome, WhatsApp, Notepad, VS Code, etc.',
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
      description: 'Opens WhatsApp Desktop, searches for a contact by name, and sends them a text message. IMPORTANT: You MUST have both the contact_name AND the message before calling this tool. If the user did not provide either the contact name or the message, DO NOT call this tool — instead ask the user to provide the missing information.',
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
  }
];

// ── Tool Executor ──
const executeTool = (name, args) => {
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
$wshell = New-Object -ComObject wscript.shell
# Spam volume down to guarantee we start at 0%
for($i=0; $i -lt 50; $i++) { $wshell.SendKeys([char]174) }
Start-Sleep -Milliseconds 100
# Volume up increments by 2 each press
$upCount = [math]::Round(${targetLevel} / 2)
for($i=0; $i -lt $upCount; $i++) { $wshell.SendKeys([char]175) }
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
        const contact = args.contact_name;
        const msg = args.message;
        const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

# 1. Open WhatsApp if not running
$waProcess = Get-Process -Name 'WhatsApp' -ErrorAction SilentlyContinue
if (-not $waProcess) {
    $app = Get-StartApps | Where-Object { $_.Name -match 'WhatsApp' } | Select-Object -First 1
    if (-not $app) { Write-Output "ERROR: WhatsApp not found on this PC."; exit 1 }
    Start-Process "explorer.exe" "shell:AppsFolder\\$($app.AppID)"
    Start-Sleep -Seconds 5
    $waProcess = Get-Process -Name 'WhatsApp' -ErrorAction SilentlyContinue
    if (-not $waProcess) { Write-Output "ERROR: WhatsApp failed to start."; exit 1 }
}

# 2. Bring WhatsApp window to front using Win32 API
$hwnd = $waProcess[0].MainWindowHandle
if ($hwnd -eq [IntPtr]::Zero) {
    Start-Sleep -Seconds 2
    $waProcess = Get-Process -Name 'WhatsApp' -ErrorAction SilentlyContinue
    $hwnd = $waProcess[0].MainWindowHandle
}
[Win32]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 300
[Win32]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Seconds 1

# 3. Open search / new chat with Ctrl+F
[System.Windows.Forms.SendKeys]::SendWait("^f")
Start-Sleep -Milliseconds 1500

# 4. Type the contact name
[System.Windows.Forms.SendKeys]::SendWait("${contact}")
Start-Sleep -Seconds 2

# 5. Press Enter to select top result
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Seconds 1.5

# 6. Type the message
[System.Windows.Forms.SendKeys]::SendWait("${msg}")
Start-Sleep -Milliseconds 800

# 7. Press Enter to send
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Milliseconds 500

Write-Output "Message sent to ${contact} on WhatsApp."
`;
        return runPS(script);
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
