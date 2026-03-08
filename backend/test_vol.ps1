$wshell = New-Object -ComObject wscript.shell
for ($i=0; $i -lt 50; $i++) { $wshell.SendKeys([char]174) }
Start-Sleep -Milliseconds 100
$upCount = [math]::Round(30 / 2)
for ($i=0; $i -lt $upCount; $i++) { $wshell.SendKeys([char]175) }
Write-Output "Volume set to approx 30%"
