import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import NativeMapView from "@/components/NativeMapView";

const { width: W } = Dimensions.get("window");

function GridBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height="100%">
        <Defs>
          <Pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <Path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0a2040" strokeWidth="0.4" />
          </Pattern>
        </Defs>
        <Rect width={W} height="100%" fill="url(#grid)" />
      </Svg>
    </View>
  );
}

export default function MapScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setPermissionDenied(true);
        setLocation({ latitude: 52.2297, longitude: 21.0122 });
        setLocationName("Warszawa (domyślnie)");
        setLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setLocation(coords);
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=pl`,
        );
        const geoData = (await geo.json()) as { address?: { city?: string; town?: string } };
        const city = geoData.address?.city ?? geoData.address?.town ?? "Twoja lokalizacja";
        setLocationName(city);
      } catch {
        setLocation({ latitude: 52.2297, longitude: 21.0122 });
        setLocationName("Warszawa");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <GridBg />
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Pobieranie lokalizacji...
          </Text>
        </View>
      ) : location ? (
        <NativeMapView latitude={location.latitude} longitude={location.longitude} />
      ) : null}

      <View style={[styles.hudOverlay, { paddingTop: topPad + 8 }]} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.locationChip, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              {locationName || "LOKALIZOWANIE..."}
            </Text>
          </View>
        </View>

        {location ? (
          <View style={[styles.coordsChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.coordsSmall, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              {location.latitude.toFixed(4)}°N  {location.longitude.toFixed(4)}°E
            </Text>
          </View>
        ) : null}

        {permissionDenied ? (
          <View style={[styles.permBanner, { backgroundColor: colors.card, borderColor: colors.hudOrange }]}>
            <Ionicons name="warning-outline" size={16} color={colors.hudOrange} />
            <Text style={[styles.permText, { color: colors.hudOrange, fontFamily: "Inter_400Regular" }]}>
              Brak uprawnień lokalizacji — wyświetlam Warszawę
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadText: { fontSize: 14, letterSpacing: 1 },
  hudOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  infoChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  locationChip: { fontSize: 12, letterSpacing: 1 },
  coordsChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    marginLeft: 52,
  },
  coordsSmall: { fontSize: 11, letterSpacing: 1 },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  permText: { fontSize: 12, flex: 1 },
});
