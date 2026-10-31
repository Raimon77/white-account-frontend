#!/usr/bin/env bash
set -eu
: "${ANDROID_HOME:?ANDROID_HOME must point to the Android SDK directory}"
mkdir -p "$ANDROID_HOME/cmdline-tools"
tools_archive="$(mktemp --suffix=.zip)"
curl --fail --location --retry 3 \
  https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip \
  --output "$tools_archive"
# Checksum from Google's HTTPS repository2-1.xml, cmdline-tools;latest / Linux.
echo "e025545c62a8e64c7559119566a569fb1dec5f60  $tools_archive" | sha1sum --check --status
tools_directory="$(mktemp -d)"
unzip -q "$tools_archive" -d "$tools_directory"
mv "$tools_directory/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
rm -rf "$tools_directory"
rm -f "$tools_archive"
sdkmanager="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
yes | "$sdkmanager" --sdk_root="$ANDROID_HOME" --licenses >/dev/null
"$sdkmanager" --sdk_root="$ANDROID_HOME" \
  "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.2.12479018"
