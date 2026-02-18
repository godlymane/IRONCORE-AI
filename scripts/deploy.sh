#!/usr/bin/env bash
# IronCore Fit — Deployment Script
# Usage: bash scripts/deploy.sh [web|android|functions|all] [--preview]
# Requires: firebase-tools, node 20+, Android SDK (for android builds)

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

MODE="${1:-web}"
PREVIEW_FLAG="${2:-}"
FIREBASE_PROJECT="ironcore-f68c2"
BUILD_DIR="dist"
APK_OUTPUT="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
DEPLOY_LOG="$PROJECT_DIR/deploy.log"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# Pre-flight checks
preflight() {
  log "Running pre-flight checks..."

  command -v node >/dev/null 2>&1 || fail "Node.js not found"
  command -v npm >/dev/null 2>&1 || fail "npm not found"

  NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VER" -lt 20 ]; then
    fail "Node 20+ required, found v$(node -v)"
  fi

  if [ ! -f ".env" ]; then
    fail ".env file missing — copy .env.example and fill in values"
  fi

  if [ ! -d "node_modules" ]; then
    warn "node_modules not found, running npm ci..."
    npm ci
  fi

  log "Pre-flight passed ✓"
}

# Build web assets
build_web() {
  log "Building web assets (Vite)..."
  npm run build 2>&1 | tee -a "$DEPLOY_LOG"

  if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
    fail "Build failed — dist/index.html not found"
  fi

  DIST_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
  log "Build complete — $DIST_SIZE"
}

# Deploy to Firebase Hosting
deploy_web() {
  command -v firebase >/dev/null 2>&1 || fail "firebase-tools not found. Run: npm install -g firebase-tools"

  if [ "$PREVIEW_FLAG" = "--preview" ]; then
    CHANNEL="preview-$TIMESTAMP"
    log "Deploying to preview channel: $CHANNEL"
    firebase hosting:channel:deploy "$CHANNEL" --project "$FIREBASE_PROJECT" 2>&1 | tee -a "$DEPLOY_LOG"
    log "Preview deploy complete — check Firebase console for URL"
  else
    log "Deploying to LIVE Firebase Hosting..."
    firebase deploy --only hosting --project "$FIREBASE_PROJECT" 2>&1 | tee -a "$DEPLOY_LOG"
    log "Live deploy complete → https://$FIREBASE_PROJECT.firebaseapp.com"
  fi
}

# Deploy Cloud Functions
deploy_functions() {
  command -v firebase >/dev/null 2>&1 || fail "firebase-tools not found"

  log "Installing function dependencies..."
  (cd functions && npm ci) 2>&1 | tee -a "$DEPLOY_LOG"

  log "Deploying Cloud Functions..."
  firebase deploy --only functions --project "$FIREBASE_PROJECT" 2>&1 | tee -a "$DEPLOY_LOG"
  log "Functions deployed ✓"
}

# Build Android debug APK via Capacitor
build_android() {
  command -v npx >/dev/null 2>&1 || fail "npx not found"

  log "Syncing Capacitor..."
  npx cap sync android 2>&1 | tee -a "$DEPLOY_LOG"

  if [ ! -d "android" ]; then
    fail "Android project not found — run: npx cap add android"
  fi

  log "Building debug APK..."
  cd android

  if [ -f "gradlew" ]; then
    chmod +x gradlew
    ./gradlew assembleDebug 2>&1 | tee -a "$DEPLOY_LOG"
  else
    fail "gradlew not found in android/"
  fi

  cd "$PROJECT_DIR"

  if [ -f "$APK_OUTPUT" ]; then
    APK_SIZE=$(du -sh "$APK_OUTPUT" | cut -f1)
    log "APK built — $APK_SIZE → $APK_OUTPUT"

    # Copy to outputs for tracking
    DEST="C:/outputs/ironcore/builds/ironcore-debug-$TIMESTAMP.apk"
    mkdir -p "$(dirname "$DEST")"
    cp "$APK_OUTPUT" "$DEST"
    log "APK copied → $DEST"
  else
    fail "APK not found at expected path: $APK_OUTPUT"
  fi
}

# Deploy Firestore rules
deploy_rules() {
  command -v firebase >/dev/null 2>&1 || fail "firebase-tools not found"
  log "Deploying Firestore rules..."
  firebase deploy --only firestore:rules --project "$FIREBASE_PROJECT" 2>&1 | tee -a "$DEPLOY_LOG"
  log "Firestore rules deployed ✓"
}

# Main
echo "" > "$DEPLOY_LOG"
log "=== IronCore Deploy — $TIMESTAMP ==="
log "Mode: $MODE"

preflight

case "$MODE" in
  web)
    build_web
    deploy_web
    ;;
  android)
    build_web
    build_android
    ;;
  functions)
    deploy_functions
    ;;
  rules)
    deploy_rules
    ;;
  all)
    build_web
    deploy_web
    deploy_functions
    deploy_rules
    log "Full deploy complete ✓"
    ;;
  build-only)
    build_web
    log "Build only — no deployment"
    ;;
  *)
    echo "Usage: bash scripts/deploy.sh [web|android|functions|rules|all|build-only] [--preview]"
    echo ""
    echo "  web        — Build + deploy to Firebase Hosting (add --preview for preview channel)"
    echo "  android    — Build + create debug APK via Capacitor"
    echo "  functions  — Deploy Firebase Cloud Functions"
    echo "  rules      — Deploy Firestore security rules"
    echo "  all        — Full deploy: web + functions + rules"
    echo "  build-only — Build web assets without deploying"
    exit 1
    ;;
esac

log "=== Deploy finished at $(date +"%H:%M:%S") ==="
log "Full log: $DEPLOY_LOG"
