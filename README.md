# 26.2 Miles to November — Marathon Training PWA (Firebase Edition)

Mobile-first PWA with Google sign-in and Firestore-synced run tracking.

## Features
- Google sign-in — runs sync across all your devices instantly
- Full 24-week training plan (June–November)
- Run tracker: logs miles, pace, type, notes — stored in Firestore
- Weekly mileage bar chart
- Strength & stretch routines
- Installable as a PWA on iPhone/Android

---

## One-time Firebase Setup (do this before deploying)

### 1. Set Firestore Security Rules
In the Firebase Console → Firestore Database → Rules tab, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/runs/{runId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Click Publish.

### 2. Add your Netlify domain to Firebase Auth
In Firebase Console → Authentication → Settings → Authorized domains
Add your Netlify URL (e.g. sam-marathon.netlify.app) once you have it.

---

## Deploy to Netlify

### Option A: Drag & Drop
```bash
npm install
npm run build
```
Then drag the `dist/` folder to https://app.netlify.com/drop

### Option B: GitHub + Netlify (recommended)
1. Push this folder to a GitHub repo
2. Go to app.netlify.com → Add new site → Import from Git
3. Select your repo — build settings auto-detected from netlify.toml
4. Deploy

### Option C: Netlify CLI
```bash
npm install -g netlify-cli
npm install && npm run build
netlify deploy --prod --dir=dist
```

---

## Install as PWA on iPhone
1. Open your Netlify URL in Safari
2. Share → Add to Home Screen
