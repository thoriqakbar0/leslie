#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.leslie-runtime"
PID_FILE="$RUNTIME_DIR/electron.pid"
ELECTRON_TEMPLATE="$ROOT_DIR/node_modules/electron/dist/Electron.app"
APP_BUNDLE="$RUNTIME_DIR/Leslie.app"
APP_BINARY="$APP_BUNDLE/Contents/MacOS/Leslie"
APP_RESOURCES="$APP_BUNDLE/Contents/Resources"
APP_ICON="$ROOT_DIR/assets/brand/Leslie.icns"
VP_BINARY="$ROOT_DIR/node_modules/.bin/vp"

stop_previous() {
  if [[ ! -f "$PID_FILE" ]]; then
    return
  fi

  local previous_pid previous_command
  previous_pid="$(<"$PID_FILE")"
  previous_command="$(ps -p "$previous_pid" -o command= 2>/dev/null || true)"

  if [[ "$previous_command" == *"$APP_BINARY"* || "$previous_command" == *"$ROOT_DIR"* ]]; then
    kill "$previous_pid" 2>/dev/null || true
    for _ in {1..20}; do
      if ! kill -0 "$previous_pid" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done
  fi

  rm -f "$PID_FILE"
}

build_app() {
  cd "$ROOT_DIR"

  if [[ ! -x "$VP_BINARY" ]]; then
    echo "Vite+ is not installed. Run vp install first." >&2
    exit 1
  fi

  if [[ ! -d "$ELECTRON_TEMPLATE" ]]; then
    echo "Electron is not installed. Run npm install first." >&2
    exit 1
  fi

  if [[ ! -f "$APP_ICON" ]]; then
    echo "Leslie.icns is missing from assets/brand." >&2
    exit 1
  fi

  "$VP_BINARY" run build

  mkdir -p "$RUNTIME_DIR"
  rm -rf "$APP_BUNDLE"
  cp -R "$ELECTRON_TEMPLATE" "$APP_BUNDLE"
  mv "$APP_BUNDLE/Contents/MacOS/Electron" "$APP_BINARY"

  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Leslie" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Set :CFBundleExecutable Leslie" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.thoriq.leslie" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile Leslie.icns" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Set :CFBundleName Leslie" "$APP_BUNDLE/Contents/Info.plist"
  cp "$APP_ICON" "$APP_RESOURCES/Leslie.icns"

  mkdir -p "$APP_RESOURCES/app"
  cp -R "$ROOT_DIR/assets" "$APP_RESOURCES/app/assets"
  cp "$ROOT_DIR/package.json" "$APP_RESOURCES/app/package.json"
  cp -R "$ROOT_DIR/electron" "$APP_RESOURCES/app/electron"
  cp -R "$ROOT_DIR/dist" "$APP_RESOURCES/app/dist"
  codesign --force --deep --sign - "$APP_BUNDLE" >/dev/null
}

launch_app() {
  /usr/bin/open -n "$APP_BUNDLE"
  APP_PID=""
  for _ in {1..20}; do
    APP_PID="$(pgrep -f "$APP_BINARY" | tail -n 1 || true)"
    if [[ -n "$APP_PID" ]]; then
      break
    fi
    sleep 0.25
  done

  if [[ -z "$APP_PID" ]]; then
    echo "Leslie did not launch." >&2
    exit 1
  fi

  printf '%s\n' "$APP_PID" >"$PID_FILE"
}

verify_app() {
  for _ in {1..20}; do
    if kill -0 "$APP_PID" 2>/dev/null; then
      echo "Leslie is running with PID $APP_PID."
      return
    fi
    sleep 0.25
  done

  echo "Leslie did not stay open." >&2
  exit 1
}

stop_previous
build_app

case "$MODE" in
  run)
    launch_app
    ;;
  --debug|debug)
    lldb -- "$APP_BINARY"
    ;;
  --logs|logs|--telemetry|telemetry)
    launch_app
    verify_app
    /usr/bin/log stream --info --style compact --predicate 'process == "Leslie"'
    ;;
  --verify|verify)
    launch_app
    verify_app
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
