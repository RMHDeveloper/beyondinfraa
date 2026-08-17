# Deploying storage.php to Hostinger

1. In Hostinger's **hPanel → File Manager** (or via FTP), go into `public_html` and create a folder named `property-management-app`.
2. Upload `storage.php` into `public_html/property-management-app/`.
3. Inside `property-management-app`, create a folder named `uploads`, and upload the `.htaccess` file (from `hostinger/uploads/.htaccess` in this repo) into it. This stops PHP files from ever being executed inside `uploads/` and blocks folder listing — required, since uploaded property images live there. (The script auto-creates `uploads/` on first request if you skip this, but the `.htaccess` won't exist unless you upload it yourself — do this step.)
4. Confirm PHP is enabled for the domain (it is by default on Hostinger shared hosting).
5. Your storage URL will be:
   ```
   https://<your-domain>/property-management-app/storage.php
   ```
   Send me that exact URL — I need it to finish wiring the app (it becomes the `HOSTINGER_STORAGE_URL` environment variable on Vercel).

## Access is locked down two ways

1. **Secret key** — every request must send the `API_KEY` constant baked into `storage.php` as an `X-Api-Key` header. Requests without it are rejected (401).
2. **Origin allowlist** — every request must also send `X-App-Origin` matching one of the two values hardcoded in `storage.php`'s `ALLOWED_ORIGINS`: `https://beyondinfraa-k9zk.vercel.app` (the live app) and `http://localhost:3000` (local dev). Anything else is rejected (403) — this is what keeps the *other* Vercel project (`beyondinfraa.vercel.app`, also connected to the same GitHub repo) from writing here even if it somehow had the key.

Don't put this file anywhere public users would browse to directly (it's fine directly under `public_html/property-management-app/`, just don't link to it from the website).

If you ever want to rotate the key: change the `API_KEY` constant in `storage.php`, re-upload it, and tell me the new value so I can update Vercel to match.
