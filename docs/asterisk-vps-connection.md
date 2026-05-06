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
- ARI is enabled and bound on TCP `0.0.0.0:5060`.
- ARI user is configured: `androidgsm` / `abc123123`.

## Applied ARI configuration (completed)

`/etc/asterisk/http.conf`
```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=5060
```

`/etc/asterisk/ari.conf`
```ini
[general]
enabled = yes
pretty = yes

[androidgsm]
type = user
read_only = no
password = abc123123
password_format = plain
```

### Verification
- `asterisk -rx 'http show status'` => `Server Enabled and Bound to 0.0.0.0:5060`
- `asterisk -rx 'ari show users'` => user `androidgsm` exists.
- External HTTP test: `GET http://103.82.193.58:5060/ari/asterisk/info` with Basic Auth returns `200`.
- Backup files saved at `/root/asterisk-backup-20260506-104045`.

## Important compatibility note
This mobile app currently uses ARI WebSocket/HTTP APIs (`/ari/events` and `/ari/...`), not SIP signaling directly.
- ARI is now enabled for this VPS and ready for app connection.
- If you want SIP-only over 5060, the app architecture must be rewritten to use a SIP stack.
