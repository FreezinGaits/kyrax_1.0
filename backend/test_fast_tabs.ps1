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

$target = "NotExistingTab"
$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue
if (-not $chrome) { Write-Output "Chrome not running." ; exit 1 }

$hwnd = $chrome[0].MainWindowHandle
[Win]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 100
[Win]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 100

$start = Get-Date

# Record the initial title to know when we've looped through all tabs
$initialTitle = [Win]::GetActiveTitle()
$found = $false
$maxTabs = 30

for ($i=0; $i -lt $maxTabs; $i++) {
    $title = [Win]::GetActiveTitle()
    if ($title -match $target) {
        $found = $true
        [System.Windows.Forms.SendKeys]::SendWait("^w")
        Write-Output "Found and closed '$target'."
        break
    }
    
    [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")
    Start-Sleep -Milliseconds 50  # Super fast!
    
    # Check if we looped back to the start! (requires at least 1 shift)
    if ($i -gt 0 -and [Win]::GetActiveTitle() -eq $initialTitle) {
        Write-Output "Looped through all tabs, target not found."
        break
    }
}

$end = Get-Date
Write-Output "Elapsed: $(($end - $start).TotalSeconds) seconds"
if (-not $found) { Write-Output "Not found." }
