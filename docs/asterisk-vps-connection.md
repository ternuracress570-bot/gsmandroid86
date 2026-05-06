# Asterisk VPS Connection Notes

## VPS target
- Host: `103.82.193.58`
- User: `root`
- Service: `Asterisk 18`

## SSH connection method (PowerShell + Posh-SSH)
Use secure credential input instead of hardcoding the password.

```powershell
Import-Module Posh-SSH
$cred = Get-Credential  # enter root + password
$s = New-SSHSession -ComputerName 103.82.193.58 -Credential $cred -AcceptKey
Invoke-SSHCommand -SessionId $s.SessionId -Command "asterisk -rx 'core show version'"
Remove-SSHSession -SessionId $s.SessionId
```

## Runtime checks executed

```bash
asterisk -rx 'http show status'
asterisk -rx 'ari show users'
asterisk -rx 'pjsip show endpoints'
sed -n '1,220p' /etc/asterisk/ari.conf
sed -n '1,220p' /etc/asterisk/http.conf
sed -n '1,260p' /etc/asterisk/pjsip.conf
sed -n '1,360p' /etc/asterisk/extensions.conf
```

## Findings on current VPS
- SIP transport is active on UDP `0.0.0.0:5060` (from `pjsip.conf`).
- Existing PJSIP endpoints: `1001`, `1002`, `3001`.
- HTTP/ARI server is currently disabled (`http show status` => `Server Disabled`).
- ARI users list is empty (`ari show users`).

## Important compatibility note
This mobile app currently uses ARI WebSocket/HTTP APIs (`/ari/events` and `/ari/...`), not SIP signaling directly.
- If ARI remains disabled, app connection status will fail even if SIP 5060 is reachable.
- To use this app as-is, ARI must be enabled and an ARI user must exist.
- If you want SIP-only over 5060, the app architecture must be rewritten to use a SIP stack.
