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

$targetWord = "YouTube"

$chrome = Get-Process -Name chrome -ErrorAction SilentlyContinue
if (-not $chrome) { Write-Output "Chrome is not open."; exit 1 }

$hwnd = $chrome[0].MainWindowHandle
[Win]::ShowWindow($hwnd, 9) | Out-Null
[Win]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500

$found = $false
for ($i=0; $i -lt 30; $i++) {
    $title = [Win]::GetActiveTitle()
    if ($title -match $targetWord) {
        $found = $true
        [System.Windows.Forms.SendKeys]::SendWait("^w")
        Write-Output "Successfully closed tab: $title"
        break
    }
    # Send Ctrl+Tab
    [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")
    Start-Sleep -Milliseconds 400
}

if (-not $found) { Write-Output "Could not find any open tab matching '$targetWord'." }
