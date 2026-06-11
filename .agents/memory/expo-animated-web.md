---
name: Expo Animated useNativeDriver web
description: useNativeDriver must be false on web in Expo/React Native Animated
---

**Rule:** `useNativeDriver: true` is not supported on web. Using it causes a console warning "Falling back to JS-based animation" and may break animations.

**How to apply:**
```tsx
const ND = Platform.OS !== "web";
Animated.timing(value, { toValue: 1, duration: 500, useNativeDriver: ND });
```

Apply this pattern to ALL Animated.timing/spring/decay calls that use useNativeDriver.

**Why:** The native animated module (RCTAnimation) is not available in the web runtime. React Native for Web falls back to JS animations, but only if useNativeDriver is false.
