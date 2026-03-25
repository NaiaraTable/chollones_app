# 🚀 Setup PHP Server for Local Development

## Quick Setup (2 steps)

### Step 1: Start PHP Server

**Option A: Using the batch file (easiest)**
Double-click: `START_PHP_SERVER.bat`

This will start PHP server on `http://localhost:8000`

**Option B: Manual command**
Open PowerShell in the app directory and run:
```powershell
php -S localhost:8000
```

**Option C: Using XAMPP (if you have it)**
1. Open XAMPP Control Panel
2. Start Apache
3. Verify it's running on `http://localhost` or `http://localhost:80`

### Step 2: Restart the app dev server

Stop the current `ionic serve` and restart it:
```powershell
ionic serve
```

The dev server will now automatically proxy API calls from `:8100/api/` to the PHP server on `:8000`

---

## Verify Setup is Working

Check in browser console (F12 > Console):

**Should see:**
```
Creando Payment Intent...
```

**Should NOT see:**
```
Failed to load resource: the server responded with a status of 404
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

If you see those errors, the PHP server isn't running.

---

## How It Works

```
Your App (localhost:8100)
    ↓
ionic serve dev-server
    ↓
proxy.conf.json: /api/* → http://localhost:8000
    ↓
PHP Server (localhost:8000)
    ↓
/api/procesar-pago.php processes payment ✅
```

---

## Troubleshooting

### PHP command not found
If `php -S localhost:8000` doesn't work:

**Option 1: Add PHP to PATH**
```powershell
# If using XAMPP, add to PATH:
$env:PATH += ";C:\xampp\php"
php -S localhost:8000
```

**Option 2: Use full path**
```powershell
C:\xampp\php\php.exe -S localhost:8000
```

### Port 8000 already in use
Change the port (e.g., 8001):

Edit `proxy.conf.json`:
```json
{
  "/api/*": {
    "target": "http://localhost:8001",  // Changed to 8001
    ...
  }
}
```

Run server:
```powershell
php -S localhost:8001
```

### Still getting 404 errors
1. Check PHP server is running (should show "Listening on...")
2. Verify `proxy.conf.json` has correct port
3. Restart `ionic serve` after updating proxy config
4. Clear browser cache (Ctrl+Shift+Delete)
5. Clear localStorage: `localStorage.clear()` in dev console

---

## Next Steps

Once setup is complete:
1. ✅ Verify PHP server is running
2. ✅ Restart `ionic serve`
3. ✅ Add products to cart
4. ✅ Click "Pagar ahora"
5. ✅ Payment form should appear (no 404 errors)
6. ✅ Test with card: `4242 4242 4242 4242`

---

## Important Notes

- **proxy.conf.json** only works in development (`ionic serve`)
- **Do NOT commit** `proxy.conf.json` changes if using shared repo
- **Production** uses actual server URLs (no proxy needed)
- **Run both servers** in separate terminal windows:
  - Terminal 1: PHP server (port 8000)
  - Terminal 2: Angular dev server (port 8100)
