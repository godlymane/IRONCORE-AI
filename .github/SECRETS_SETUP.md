# GitHub Actions — Required Secrets

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

---

## Firebase Hosting (all pipelines need these)

| Secret | Value |
|--------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON content of Firebase service account key. Get it from: Firebase Console → Project Settings → Service accounts → Generate new private key |
| `VITE_FIREBASE_API_KEY` | From .env file |
| `VITE_FIREBASE_AUTH_DOMAIN` | From .env file |
| `VITE_FIREBASE_PROJECT_ID` | `ironcore-f68c2` |
| `VITE_FIREBASE_STORAGE_BUCKET` | From .env file |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From .env file |
| `VITE_FIREBASE_APP_ID` | From .env file |

---

## Android Build

| Secret | Value |
|--------|-------|
| `GOOGLE_SERVICES_JSON` | Full content of `android/app/google-services.json` |
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore: `base64 -w 0 ironcore.keystore` |
| `ANDROID_KEY_ALIAS` | Key alias used when creating the keystore |
| `ANDROID_KEY_PASSWORD` | Key password |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |

### Generate a release keystore (one-time):
```bash
keytool -genkey -v -keystore ironcore.keystore -alias ironcore -keyalg RSA -keysize 2048 -validity 10000
```

---

## iOS Build (device/TestFlight only)

| Secret | Value |
|--------|-------|
| `IOS_CERTIFICATE_P12_BASE64` | Base64-encoded .p12 distribution certificate from Apple Developer portal |
| `IOS_CERTIFICATE_PASSWORD` | Password for the .p12 file |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded .mobileprovision file |
| `APPLE_ID` | Your Apple ID email (for TestFlight uploads) |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from appleid.apple.com |

### Also update ios-export-options.plist:
- Replace `YOUR_APPLE_TEAM_ID` with your actual Apple Developer Team ID

---

## Triggering builds

- **Firebase deploy**: auto-triggers on push to `main`
- **Android APK**: auto-triggers on push to `main` (debug), or manual via Actions tab
- **iOS build**: manual only via Actions tab (select build type)
