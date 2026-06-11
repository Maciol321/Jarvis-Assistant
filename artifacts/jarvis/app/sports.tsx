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
import * as Haptics from "expo-haptics";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");

type Competitor = {
  team: { displayName: string; abbreviation: string };
  score?: string;
  homeAway: "home" | "away";
};

type Event = {
  id: string;
  name: string;
  shortName: string;
  status: {
    type: { completed: boolean; description: string; detail: string };
    displayClock?: string;
  };
  competitions: Array<{
    competitors: Competitor[];
    status: { type: { completed: boolean; description: string } };
  }>;
};

type EspnResponse = {
  events?: Event[];
  leagues?: Array<{ name: string }>;
};

const LEAGUES = [
  { label: "Ekstraklasa", slug: "pol.1", emoji: "PL" },
  { label: "Premier League", slug: "eng.1", emoji: "EN" },
  { label: "La Liga", slug: "esp.1", emoji: "ES" },
  { label: "Bundesliga", slug: "ger.1", emoji: "DE" },
  { label: "Champions League", slug: "UEFA.CHAMPIONS", emoji: "CL" },
];

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

export default function SportsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [leagueName, setLeagueName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fetchSports = async (leagueIndex = activeLeague) => {
    setLoading(true);
    setError(null);
    try {
      const slug = LEAGUES[leagueIndex]?.slug ?? "pol.1";
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`,
      );
      const data = (await res.json()) as EspnResponse;
      setEvents(data.events ?? []);
      setLeagueName(data.leagues?.[0]?.name ?? LEAGUES[leagueIndex]?.label ?? "");
    } catch {
      setError("Nie udało się pobrać wyników sportowych.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSports(activeLeague);
  }, [activeLeague]);

  const getMatchScore = (event: Event) => {
    const comp = event.competitions[0];
    if (!comp) return { home: "-", away: "-", homeTeam: "", awayTeam: "" };
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    return {
      home: home?.score ?? "-",
      away: away?.score ?? "-",
      homeTeam: home?.team.displayName ?? "",
      awayTeam: away?.team.displayName ?? "",
      homeAbbr: home?.team.abbreviation ?? "",
      awayAbbr: away?.team.abbreviation ?? "",
    };
  };

  const getStatusColor = (event: Event) => {
    const desc = event.status.type.description.toLowerCase();
    if (event.status.type.completed) return colors.textMuted;
    if (desc.includes("in progress") || desc.includes("live") || event.status.displayClock) return colors.hudGreen;
    return colors.primary;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBg />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          SPORT
        </Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fetchSports(); }}>
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.leagueTabs}
      >
        {LEAGUES.map((league, i) => (
          <Pressable
            key={league.slug}
            style={[
              styles.leagueTab,
              {
                backgroundColor: activeLeague === i ? colors.primary : colors.card,
                borderColor: activeLeague === i ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveLeague(i);
            }}
          >
            <Text style={[styles.leagueFlag, { color: activeLeague === i ? "#000913" : colors.primary, fontFamily: "Inter_700Bold" }]}>
              {league.emoji}
            </Text>
            <Text style={[styles.leagueText, { color: activeLeague === i ? "#000913" : colors.text, fontFamily: "Inter_500Medium" }]}>
              {league.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Pobieranie wyników...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color={colors.hudOrange} />
          <Text style={[styles.errorText, { color: colors.hudOrange, fontFamily: "Inter_500Medium" }]}>
            {error}
          </Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="football-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Brak zaplanowanych meczów
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {leagueName ? (
            <Text style={[styles.leagueHeader, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              {leagueName.toUpperCase()}
            </Text>
          ) : null}
          {events.map((event) => {
            const score = getMatchScore(event);
            const isLive = !event.status.type.completed && event.status.displayClock;
            const isCompleted = event.status.type.completed;
            return (
              <View
                key={event.id}
                style={[
                  styles.matchCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isLive ? colors.hudGreen : colors.border,
                    borderWidth: isLive ? 1 : 0.5,
                  },
                ]}
              >
                <View style={styles.statusBadge}>
                  {isLive ? (
                    <>
                      <View style={[styles.liveDot, { backgroundColor: colors.hudGreen }]} />
                      <Text style={[styles.liveText, { color: colors.hudGreen, fontFamily: "Inter_600SemiBold" }]}>
                        {event.status.displayClock ?? "LIVE"}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.statusDesc, { color: getStatusColor(event), fontFamily: "Inter_400Regular" }]}>
                      {event.status.type.detail}
                    </Text>
                  )}
                </View>
                <View style={styles.matchRow}>
                  <Text style={[styles.teamName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {score.homeTeam}
                  </Text>
                  <View style={styles.scoreBox}>
                    <Text style={[
                      styles.scoreText,
                      {
                        color: isCompleted ? colors.text : isLive ? colors.hudGreen : colors.primary,
                        fontFamily: "Inter_700Bold",
                      },
                    ]}>
                      {isCompleted || isLive ? `${score.home} - ${score.away}` : "vs"}
                    </Text>
                  </View>
                  <Text style={[styles.teamNameRight, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {score.awayTeam}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  leagueTabs: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  leagueTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  leagueFlag: { fontSize: 10, letterSpacing: 1 },
  leagueText: { fontSize: 12 },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 40 },
  loadText: { fontSize: 14, letterSpacing: 1 },
  errorText: { fontSize: 14, textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center" },
  leagueHeader: { fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  matchCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: { fontSize: 10, letterSpacing: 1 },
  statusDesc: { fontSize: 10, letterSpacing: 1 },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamName: { flex: 1, fontSize: 13 },
  teamNameRight: { flex: 1, fontSize: 13, textAlign: "right" },
  scoreBox: {
    minWidth: 70,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 18 },
});
