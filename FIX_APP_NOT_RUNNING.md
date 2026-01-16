# Fix App Not Running

## Quick Fix Steps

### Step 1: Clear Cache and Reinstall
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
# On Windows:
# rmdir /s node_modules
# del package-lock.json

# Reinstall dependencies
npm install
```

### Step 2: Clear Vite Cache
```bash
# Delete .vite cache folder
rm -rf .vite
# On Windows:
# rmdir /s .vite
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

## Common Issues

### Issue 1: Port Already in Use
If you see "port 5173 already in use":
- Stop any running dev servers (Ctrl+C)
- Or change port in `vite.config.ts`:
  ```typescript
  export default defineConfig({
    plugins: [react()],
    server: {
      port: 3000  // Change to different port
    }
  });
  ```

### Issue 2: Missing Dependencies
If you see "Cannot find module" errors:
```bash
npm install
```

### Issue 3: TypeScript Errors
Check for type errors:
```bash
npm run typecheck
```

### Issue 4: Browser Console Errors
Open browser DevTools (F12) and check Console tab for errors.

## Still Not Working?

Please share:
1. The exact error message from terminal or browser console
2. What happens when you run `npm run dev`
3. Any error messages in the browser console (F12 → Console)

