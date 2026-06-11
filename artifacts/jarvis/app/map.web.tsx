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
  const [locationName, setLocationName] = useState("Pobieranie...");
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    (async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (granted) {
          const loc = await Location.getCurrentPositionAsync({});
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLocation(coords);
          try {
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=pl`,
            );
            const d = (await geo.json()) as { address?: { city?: string; town?: string } };
            setLocationName(d.address?.city ?? d.address?.town ?? "Twoja lokalizacja");
          } catch {
            setLocationName("Twoja lokalizacja");
          }
        } else {
          setLocation({ latitude: 52.2297, longitude: 21.0122 });
          setLocationName("Warszawa (domyślnie)");
        }
      } catch {
        setLocation({ latitude: 52.2297, longitude: 21.0122 });
        setLocationName("Warszawa (domyślnie)");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBg />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          MAPA
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            <View style={[styles.orbContainer, { borderColor: colors.primary }]}>
              <Ionicons name="map-outline" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.infoTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              LOKALIZACJA AKTYWNA
            </Text>
            <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Text style={[styles.locationName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {locationName}
              </Text>
            </View>
            {location ? (
              <View style={[styles.coordsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.coordRow}>
                  <Text style={[styles.coordLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                    SZEROKOŚĆ
                  </Text>
                  <Text style={[styles.coordValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                    {location.latitude.toFixed(6)}°N
                  </Text>
                </View>
                <View style={[styles.coordDivider, { backgroundColor: colors.border }]} />
                <View style={styles.coordRow}>
                  <Text style={[styles.coordLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                    DŁUGOŚĆ
                  </Text>
                  <Text style={[styles.coordValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                    {location.longitude.toFixed(6)}°E
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={[styles.mobileNote, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              Interaktywna mapa dostępna na urządzeniu mobilnym
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 16, letterSpacing: 4 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 32 },
  orbContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontSize: 14, letterSpacing: 4 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    minWidth: 240,
  },
  locationName: { fontSize: 16 },
  coordsCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: "hidden",
    minWidth: 240,
  },
  coordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  coordDivider: { height: 0.5 },
  coordLabel: { fontSize: 10, letterSpacing: 2 },
  coordValue: { fontSize: 16, letterSpacing: 1 },
  mobileNote: { fontSize: 12, textAlign: "center", marginTop: 8 },
});
