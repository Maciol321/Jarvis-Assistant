import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
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
import { InfoCard } from "@/components/InfoCard";

const { width: W } = Dimensions.get("window");

const WMO_CODES: Record<number, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  0: { label: "Bezchmurnie", icon: "sunny-outline" },
  1: { label: "Głównie pogodnie", icon: "partly-sunny-outline" },
  2: { label: "Częściowe zachmurzenie", icon: "partly-sunny-outline" },
  3: { label: "Pochmurno", icon: "cloud-outline" },
  45: { label: "Mgła", icon: "cloudy-outline" },
  48: { label: "Szron", icon: "cloudy-outline" },
  51: { label: "Lekka mżawka", icon: "rainy-outline" },
  61: { label: "Lekki deszcz", icon: "rainy-outline" },
  63: { label: "Umiarkowany deszcz", icon: "rainy-outline" },
  65: { label: "Silny deszcz", icon: "rainy-outline" },
  71: { label: "Lekki śnieg", icon: "snow-outline" },
  73: { label: "Umiarkowany śnieg", icon: "snow-outline" },
  80: { label: "Przelotne opady", icon: "rainy-outline" },
  95: { label: "Burza", icon: "thunderstorm-outline" },
  99: { label: "Burza z gradem", icon: "thunderstorm-outline" },
};

function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { label: "Nieznane", icon: "cloud-outline" };
}

type WeatherData = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weathercode: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
};

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

export default function WeatherScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cityName, setCityName] = useState("Lokalizowanie...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      let lat = 52.2297;
      let lon = 21.0122;

      if (granted) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pl`,
          );
          const geoData = (await geo.json()) as { address?: { city?: string; town?: string; village?: string } };
          const city = geoData.address?.city ?? geoData.address?.town ?? geoData.address?.village ?? "Twoja lokalizacja";
          setCityName(city);
        } catch {
          setCityName("Twoja lokalizacja");
        }
      } else {
        setCityName("Warszawa (domyślnie)");
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weathercode,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FWarsaw&forecast_days=7`,
      );
      const data = (await res.json()) as WeatherData;
      setWeather(data);
    } catch {
      setError("Nie udało się pobrać danych pogodowych.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBg />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          POGODA
        </Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fetchWeather(); }}>
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              Pobieranie danych...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="warning-outline" size={48} color={colors.hudOrange} />
            <Text style={[styles.errorText, { color: colors.hudOrange, fontFamily: "Inter_500Medium" }]}>
              {error}
            </Text>
            <Pressable onPress={fetchWeather} style={[styles.retryBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.retryText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                SPRÓBUJ PONOWNIE
              </Text>
            </Pressable>
          </View>
        ) : weather ? (
          <>
            <InfoCard style={styles.mainCard} accent>
              <Text style={[styles.cityName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {cityName.toUpperCase()}
              </Text>
              <View style={styles.currentRow}>
                <Ionicons
                  name={getWeatherInfo(weather.current.weathercode).icon}
                  size={64}
                  color={colors.primary}
                />
                <View style={styles.tempBlock}>
                  <Text style={[styles.tempLarge, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                    {Math.round(weather.current.temperature_2m)}°C
                  </Text>
                  <Text style={[styles.weatherLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                    {getWeatherInfo(weather.current.weathercode).label}
                  </Text>
                  <Text style={[styles.feelsLike, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Odczuwalna: {Math.round(weather.current.apparent_temperature)}°C
                  </Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="water-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                    {weather.current.relative_humidity_2m}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Wilgotność
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Ionicons name="speedometer-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                    {Math.round(weather.current.wind_speed_10m)} km/h
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Wiatr
                  </Text>
                </View>
              </View>
            </InfoCard>

            <InfoCard title="Prognoza 7-dniowa" style={styles.forecastCard}>
              {weather.daily.time.map((day, i) => {
                const d = new Date(day);
                const dayName = i === 0 ? "Dziś" : i === 1 ? "Jutro" : DAYS_PL[d.getDay()];
                const info = getWeatherInfo(weather.daily.weathercode[i] ?? 0);
                return (
                  <View key={day} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.dayName, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                      {dayName}
                    </Text>
                    <Ionicons name={info.icon} size={18} color={colors.primary} />
                    <Text style={[styles.dayLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {info.label}
                    </Text>
                    <Text style={[styles.dayTemp, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                      {Math.round(weather.daily.temperature_2m_min[i] ?? 0)}° / {Math.round(weather.daily.temperature_2m_max[i] ?? 0)}°
                    </Text>
                  </View>
                );
              })}
            </InfoCard>
          </>
        ) : null}
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  loadText: { fontSize: 14, letterSpacing: 1 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  retryText: { fontSize: 12, letterSpacing: 2 },
  mainCard: { marginBottom: 12 },
  cityName: { fontSize: 14, letterSpacing: 3, marginBottom: 16 },
  currentRow: { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 16 },
  tempBlock: { flex: 1 },
  tempLarge: { fontSize: 56, lineHeight: 60 },
  weatherLabel: { fontSize: 14, marginTop: 4 },
  feelsLike: { fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 40 },
  statValue: { fontSize: 16 },
  statLabel: { fontSize: 11 },
  forecastCard: { marginBottom: 12 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  dayName: { width: 48, fontSize: 13 },
  dayLabel: { flex: 1, fontSize: 12 },
  dayTemp: { fontSize: 13 },
});
