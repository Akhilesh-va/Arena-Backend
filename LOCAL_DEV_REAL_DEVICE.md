# Backend on real device: "Failed to connect to 192.168.x.x:3000"

The app can't reach your PC. Check these in order:

## 1. Use your PC's actual IP

**192.168.1.100** might not be your machine. Get the real IP:

- **Windows:** Open CMD → `ipconfig` → find **IPv4 Address** under your WiFi adapter (e.g. `192.168.1.5`).
- **Mac:** System Settings → Wi‑Fi → your network → IP, or Terminal: `ipconfig getifaddr en0` (or `en1`).

Put that IP in the app's `build.gradle.kts` (debug `API_BASE_URL`), e.g. `http://192.168.1.5:3000/api/v1/`.

## 2. Backend must listen on all interfaces

The backend is set to listen on **0.0.0.0** so it accepts LAN connections. Restart it after pulling:

```bash
cd backend && npm run dev
```

You should see: `Arena backend listening on http://0.0.0.0:3000`.

## 3. Same Wi‑Fi

Phone and PC must be on the **same network** (same Wi‑Fi). Mobile data or a different Wi‑Fi will not reach your PC.

## 4. Firewall

Allow inbound connections on port **3000**:

- **Windows:** Windows Defender Firewall → Advanced → Inbound rules → New rule → Port → TCP 3000 → Allow.
- **Mac:** System Settings → Network → Firewall → Options → allow your Node process or add a rule for port 3000.

## 5. Quick test from the phone’s network

On another device on the same Wi‑Fi (or from the phone’s browser), open:

`http://YOUR_PC_IP:3000/api/v1/health`

If this fails, the problem is network/firewall/PC IP, not the app.
