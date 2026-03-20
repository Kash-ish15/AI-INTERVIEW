# Render setup for Puppeteer (PDF generation)

So that "Download Resume" works on Render, Chrome must be installed **during the build** and the cache path must be available at runtime.

## 1. Build Command

In Render → your Backend service → **Settings** → **Build Command**, use:

```bash
npm install && PUPPETEER_CACHE_DIR=./.puppeteer-cache npx puppeteer browsers install chrome
```

This installs Chrome into `./.puppeteer-cache` inside your Backend directory so it is included in the deployed app.

## 2. Environment variable

In Render → your Backend service → **Environment** → add:

| Key | Value |
|-----|--------|
| `PUPPETEER_CACHE_DIR` | `./.puppeteer-cache` |

So at runtime Puppeteer looks for Chrome in the same folder that was filled during the build.

## 3. Root directory

If your Render service **Root Directory** is the repo root (not `Backend`), then:

- **Build Command:**  
  `cd Backend && npm install && PUPPETEER_CACHE_DIR=./.puppeteer-cache npx puppeteer browsers install chrome`

- **Environment:**  
  `PUPPETEER_CACHE_DIR=Backend/.puppeteer-cache`  
  (or keep `./.puppeteer-cache` if the **start command** runs from the `Backend` directory and Render’s working directory is `Backend`)

Save, redeploy, and try "Download Resume" again.
