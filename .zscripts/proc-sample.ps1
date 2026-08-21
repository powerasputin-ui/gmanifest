param([int]$TargetPid)
$p = Get-Process -Id $TargetPid
$c1 = $p.TotalProcessorTime.TotalMilliseconds
Start-Sleep -Seconds 3
$p.Refresh()
$c2 = $p.TotalProcessorTime.TotalMilliseconds
Write-Output ("CPU delta over 3s: " + ($c2 - $c1) + " ms")
Write-Output ("Threads: " + $p.Threads.Count)
Write-Output ("WS MB: " + [math]::Round($p.WorkingSet64/1MB))
$wcts = $p.Threads | Group-Object ThreadState | Select-Object Name, Count
$wcts | Format-Table -AutoSize
