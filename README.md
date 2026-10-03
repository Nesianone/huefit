# HueFit

Pick your bottoms, get the right tops. Offline-capable web app + Android wrapper (Capacitor).

## Run in a browser
    npm run serve      # http://localhost:8080

## Install on your phone right now (no APK needed)
Host the `www/` folder on any HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages),
open it in Chrome on Android, then menu > "Install app" / "Add to Home screen".

## Build the APK
**Option A – GitHub (no Android Studio):**
1. Push this folder to a new GitHub repo.
2. Actions tab > "Build HueFit APK" > Run workflow.
3. Download `HueFit-debug-apk` from the run, unzip, copy `app-debug.apk` to your phone, open it
   (allow "install unknown apps" for your file manager/browser when prompted).

**Option B – Local:** install Node 20, JDK 21 and Android Studio, then:
    npm install
    npx cap add android
    npx cap sync android
    cd android && ./gradlew assembleDebug
APK: `android/app/build/outputs/apk/debug/app-debug.apk`

Debug APKs are fine for personal use. For the Play Store you'd need a signed release build.

## Editing colours
All colour rules live in the `BOTTOMS` table in `www/engine.js`; screens are in `www/ui.js`.

## Features
- Find tops for a bottom colour, or match bottoms to a top you own
- Optional skin tone / undertone / hair profile, season and climate
- Pick a colour from a photo (tap the garment)
- My wardrobe: add tops and bottoms, see your best pairings
- Saved looks. Everything stays on the device.
