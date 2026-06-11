---
name: Expo SDK 54 package versions
description: Correct expo-* package versions for SDK 54.0.35 (the installed version in this project)
---

The installed expo version is 54.0.35. Metro warns about "expected versions" but these are for SDK 55+. The following versions work with SDK 54:

- expo-av: ~14.0.7
- expo-blur: ~14.0.1
- expo-camera: ~15.0.16
- expo-constants: ~17.0.8
- expo-file-system: ~18.0.7 (sdk-54 tag = 19.0.23 but 18.x works)
- expo-font: ~14.0.3
- expo-haptics: ~14.0.1
- expo-image: ~2.0.7
- expo-image-picker: ~16.0.6
- expo-linear-gradient: ~14.0.2
- expo-linking: ~7.0.5
- expo-location: ~18.0.8
- expo-router: ~5.0.2
- expo-splash-screen: ~0.30.9
- expo-status-bar: ~2.2.3
- react-native-maps: 1.18.0 (FIXED — do not bump without testing Expo Go compatibility)

**Why:** The expo CLI's "expected version" warnings show SDK 55 versions. Ignore them; the app works fine with these 14.x/15.x versions. Bumping to expected versions would require upgrading expo itself to SDK 55.
