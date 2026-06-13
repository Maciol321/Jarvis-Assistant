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
- expo-speech: 14.0.8 (native iOS/Android TTS — use `Speech.speak()` with language/pitch/rate/onDone)

**Why:** The expo CLI's "expected version" warnings show SDK 55 versions. Ignore them; the app works fine with these 14.x/15.x versions. Bumping to expected versions would require upgrading expo itself to SDK 55.

**Metro + pnpm symlinks:** If a newly installed expo-* package can't be resolved by Metro ("could not be found"), add to metro.config.js:
```js
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules"), path.resolve(workspaceRoot, "node_modules")];
config.resolver.unstable_enableSymlinks = true;
```
This is required because pnpm installs packages as symlinks in `artifacts/jarvis/node_modules` pointing to the virtual store, and Metro doesn't follow them by default.
