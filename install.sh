#!/bin/zsh
set -e
DIR="${0:A:h}"
PLIST="$HOME/Library/LaunchAgents/com.cdsd.autologin.plist"
sed "s|__DIR__|$DIR|g" "$DIR/com.cdsd.autologin.plist" > "$PLIST"
launchctl bootout "gui/$(id -u)/com.cdsd.autologin" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed from $DIR — log: $DIR/login.log"
