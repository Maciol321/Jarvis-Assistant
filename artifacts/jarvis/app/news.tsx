import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
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

type NewsItem = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  author?: string;
};

type RssResponse = {
  status: string;
  items?: NewsItem[];
};

const RSS_FEEDS = [
  { label: "Świat", url: "https://tvn24.pl/wiadomosci-ze-swiata/rss.xml" },
  { label: "Polska", url: "https://tvn24.pl/polska/rss.xml" },
  { label: "Gospodarka", url: "https://tvn24.pl/biznes-i-tech/rss.xml" },
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

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function NewsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fetchNews = async (feedIndex = activeTab) => {
    setLoading(true);
    setError(null);
    try {
      const feedUrl = encodeURIComponent(RSS_FEEDS[feedIndex]?.url ?? RSS_FEEDS[0]!.url);
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}&count=25`,
      );
      const data = (await res.json()) as RssResponse;
      if (data.status === "ok" && data.items) {
        setNews(data.items);
      } else {
        setError("Nie udało się pobrać wiadomości.");
      }
    } catch {
      setError("Błąd połączenia z serwisem newsów.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(activeTab);
  }, [activeTab]);

  const stripHtml = (html: string) =>
    html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBg />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          WIADOMOŚCI
        </Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); fetchNews(); }}>
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {RSS_FEEDS.map((feed, i) => (
          <Pressable
            key={feed.label}
            style={[
              styles.tab,
              activeTab === i && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(i);
            }}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === i ? colors.primary : colors.textMuted,
                  fontFamily: activeTab === i ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {feed.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Pobieranie wiadomości...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color={colors.hudOrange} />
          <Text style={[styles.errorText, { color: colors.hudOrange, fontFamily: "Inter_500Medium" }]}>
            {error}
          </Text>
          <Pressable onPress={() => fetchNews()} style={[styles.retryBtn, { borderColor: colors.primary }]}>
            <Text style={[{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2 }]}>
              ODŚWIEŻ
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {news.map((item, idx) => {
            const isExpanded = expanded === item.link;
            return (
              <Pressable
                key={`${item.link}-${idx}`}
                style={({ pressed }) => [
                  styles.newsCard,
                  {
                    backgroundColor: pressed || isExpanded ? colors.card : colors.surface,
                    borderColor: isExpanded ? colors.primary : colors.border,
                    borderWidth: isExpanded ? 1 : 0.5,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpanded(isExpanded ? null : item.link);
                }}
              >
                <View style={styles.newsHeader}>
                  <Text style={[styles.newsTime, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {formatTime(item.pubDate)}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={colors.textMuted}
                  />
                </View>
                <Text
                  style={[styles.newsTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}
                  numberOfLines={isExpanded ? 0 : 2}
                >
                  {item.title}
                </Text>
                {isExpanded && item.description ? (
                  <Text
                    style={[styles.newsDesc, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}
                  >
                    {stripHtml(item.description).slice(0, 400)}
                  </Text>
                ) : null}
                {isExpanded ? (
                  <Pressable
                    style={styles.linkRow}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(item.link); }}
                  >
                    <Text style={[styles.linkText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                      CZYTAJ WIĘCEJ
                    </Text>
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                  </Pressable>
                ) : null}
              </Pressable>
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
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabText: { fontSize: 11, letterSpacing: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  loadText: { fontSize: 14, letterSpacing: 1 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  newsCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  newsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  newsTime: { fontSize: 10, letterSpacing: 1 },
  newsTitle: { fontSize: 14, lineHeight: 20 },
  newsDesc: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  linkText: { fontSize: 11, letterSpacing: 2 },
});
