import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Rect, Line, Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

const { width: W, height: H } = Dimensions.get("window");

let CameraView: React.ComponentType<{
  style: object;
  facing?: "front" | "back";
  ref?: React.Ref<{ takePictureAsync: (opts?: object) => Promise<{ uri: string }> }>;
}> | null = null;
let useCameraPermissions: (() => [{ granted: boolean; canAskAgain: boolean } | null, () => Promise<void>]) | null = null;
try {
  const cam = require("expo-camera");
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {
  CameraView = null;
  useCameraPermissions = null;
}

function HUDOverlay() {
  const cornerSize = 32;
  const offset = 60;
  const cx = W / 2;
  const cy = H / 2;
  const boxW = W * 0.7;
  const boxH = H * 0.35;
  const x = cx - boxW / 2;
  const y = cy - boxH / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        <Rect
          x={x}
          y={y}
          width={boxW}
          height={boxH}
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        {[
          [x, y, x + cornerSize, y, x, y + cornerSize],
          [x + boxW - cornerSize, y, x + boxW, y, x + boxW, y + cornerSize],
          [x, y + boxH - cornerSize, x, y + boxH, x + cornerSize, y + boxH],
          [x + boxW - cornerSize, y + boxH, x + boxW, y + boxH, x + boxW, y + boxH - cornerSize],
        ].map(([x1, y1, mx, my, x2, y2], i) => (
          <React.Fragment key={i}>
            <Line x1={x1} y1={y1} x2={mx} y2={my} stroke="#00d4ff" strokeWidth="2" />
            <Line x1={mx} y1={my} x2={x2} y2={y2} stroke="#00d4ff" strokeWidth="2" />
          </React.Fragment>
        ))}
        <Line x1={cx} y1={cy - 16} x2={cx} y2={cy + 16} stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.6" />
        <Line x1={cx - 16} y1={cy} x2={cx + 16} y2={cy} stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.6" />
        <Circle cx={cx} cy={cy} r={4} fill="none" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.6" />
      </Svg>
    </View>
  );
}

export default function CameraScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const cameraRef = useRef<{ takePictureAsync: (opts?: object) => Promise<{ uri: string }> } | null>(null);
  const shutterAnim = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const permissions = useCameraPermissions ? useCameraPermissions() : [null, async () => {}];
  const [permission, requestPermission] = permissions;

  const takePicture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(shutterAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.timing(shutterAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (photo) setLastPhoto(photo.uri);
    } catch { /* silently fail */ }
  };

  const isWeb = Platform.OS === "web";

  if (isWeb || !CameraView) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            KAMERA
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color={colors.primary} />
          <Text style={[styles.webText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Kamera dostępna na urządzeniach mobilnych
          </Text>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Ionicons name="hourglass-outline" size={48} color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>KAMERA</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="camera-off-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.permText, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
            JARVIS potrzebuje dostępu do kamery
          </Text>
          {permission.canAskAgain ? (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); requestPermission(); }}
              style={[styles.permBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.permBtnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                PRZYZNAJ DOSTĘP
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.permDenied, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              Zezwól w Ustawieniach telefonu
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shutterAnim }]}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          ref={cameraRef as React.Ref<{ takePictureAsync: (opts?: object) => Promise<{ uri: string }> }>}
        />
      </Animated.View>

      <HUDOverlay />

      <View style={[styles.topControls, { paddingTop: topPad + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={[styles.controlBtn, { backgroundColor: "rgba(0,9,19,0.7)", borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={[styles.hudLabel, { backgroundColor: "rgba(0,9,19,0.7)", borderColor: colors.primary }]}>
          <View style={[styles.hudDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.hudLabelText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            JARVIS VISION
          </Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFacing((f) => f === "back" ? "front" : "back"); }}
          style={[styles.controlBtn, { backgroundColor: "rgba(0,9,19,0.7)", borderColor: colors.border }]}
        >
          <Ionicons name="camera-reverse-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.bottomControls, { paddingBottom: bottomPad + 16 }]}>
        {lastPhoto ? (
          <View style={[styles.thumbnail, { borderColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.hudGreen} />
          </View>
        ) : <View style={{ width: 52 }} />}
        <Pressable onPress={takePicture} style={styles.shutterBtn}>
          <View style={[styles.shutterOuter, { borderColor: colors.primary }]}>
            <View style={[styles.shutterInner, { backgroundColor: colors.primary }]} />
          </View>
        </Pressable>
        <View style={{ width: 52 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000913" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 16, letterSpacing: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  webText: { fontSize: 14, textAlign: "center" },
  permText: { fontSize: 16, textAlign: "center" },
  permDenied: { fontSize: 12, textAlign: "center" },
  permBtn: { borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  permBtnText: { fontSize: 12, letterSpacing: 2 },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  hudLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  hudDot: { width: 6, height: 6, borderRadius: 3 },
  hudLabelText: { fontSize: 11, letterSpacing: 2 },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 40,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,9,19,0.7)",
  },
  shutterBtn: { alignItems: "center", justifyContent: "center" },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});
