---
name: Expo react-native-maps web split
description: How to use react-native-maps without breaking web bundling in Expo Router
---

react-native-maps imports native-only RN internals that crash Metro web bundler.

**Rule:** Never import react-native-maps directly in any file that Metro might bundle for web (i.e., any file in app/ or components/).

**How to apply:**
1. Create `components/NativeMapView.native.tsx` — imports MapView from react-native-maps
2. Create `components/NativeMapView.web.tsx` — returns null (no react-native-maps import)
3. In `app/map.tsx`: `import NativeMapView from "@/components/NativeMapView"` (NO extension — Metro resolves per platform)
4. Also create `app/map.web.tsx` as a full web fallback screen (shows coords, no map)
5. DO NOT use `require("react-native-maps")` inside try/catch — Metro still bundles it

**Why:** Metro bundles ALL app/ files for ALL platforms via expo-router's require.context, even files that have platform counterparts. The `.native.tsx`/`.web.tsx` extension split at the component level is the only reliable way to keep react-native-maps out of the web bundle.
