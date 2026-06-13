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
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { fetchRss } from "@/lib/rssParser";

const { width: W } = Dimensions.get("window");

type NewsItem = {
  title: string;
  description: string;
  content?: string;
  link: string;
  pubDate: string;
  author?: string;
  thumbnail?: string;
  enclosure?: { link?: string; url?: string };
};

const RSS_FEEDS = [
  { label: "Polska", url: "https://www.polsatnews.pl/rss/polska.xml", color: "#00d4ff" },
  { label: "Świat", url: "https://www.polsatnews.pl/rss/swiat.xml", color: "#00ff88" },
  { label: "Biznes", url: "https://www.polsatnews.pl/rss/biznes.xml", color: "#ff8c00" },
  { label: "Sport", url: "https://www.polsatnews.pl/rss/sport.xml", color: "#ff4488" },
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
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "przed chwilą";
    if (diffMin < 60) return `${diffMin} min temu`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} godz. temu`;
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function NewsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const activeColor = RSS_FEEDS[activeTab]?.color ?? "#00d4ff";

  const fetchNews = async (feedIndex = activeTab) => {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    try {
      const feedUrl = RSS_FEEDS[feedIndex]?.url ?? RSS_FEEDS[0]!.url;
      const items = await fetchRss(feedUrl);
      if (items.length > 0) {
        setNews(items as NewsItem[]);
      } else {
        setError("Brak wiadomości w tym kanale.");
      }
    } catch {
      setError("Nie udało się pobrać wiadomości. Sprawdź połączenie.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(activeTab);
  }, [activeTab]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBg />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          WIADOMOŚCI
        </Text>
        <Pressable onPress={() => fetchNews()} hitSlop={10}>
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {RSS_FEEDS.map((feed, i) => (
          <Pressable
            key={feed.label}
            style={[
              styles.tabChip,
              { borderColor: activeTab === i ? feed.color : colors.border, backgroundColor: activeTab === i ? feed.color + "22" : colors.surface },
            ]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, { color: activeTab === i ? feed.color : colors.textMuted, fontFamily: activeTab === i ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
              {feed.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Pobieranie wiadomości...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color="#ff8c00" />
          <Text style={[styles.errorText, { color: "#ff8c00", fontFamily: "Inter_500Medium" }]}>
            {error}
          </Text>
          <Pressable onPress={() => fetchNews()} style={[styles.retryBtn, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2 }}>
              ODŚWIEŻ
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.countLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            {news.length} wiadomości · {RSS_FEEDS[activeTab]?.label}
          </Text>

          {news.map((item, idx) => {
            const id = item.link + idx;
            const isOpen = expandedId === id;
            const desc = stripHtml(item.description ?? "");
            const fullContent = stripHtml(item.content ?? item.description ?? "");

            return (
              <Pressable
                key={id}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isOpen ? colors.card : (pressed ? colors.surface : colors.background),
                    borderColor: isOpen ? activeColor : colors.border,
                    borderLeftColor: activeColor,
                    borderLeftWidth: 3,
                  },
                ]}
                onPress={() => setExpandedId(isOpen ? null : id)}
              >
                {/* Time + toggle */}
                <View style={styles.cardTop}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.timeText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {formatTime(item.pubDate)}
                    </Text>
                    {item.author ? (
                      <>
                        <Text style={[{ color: colors.border, fontSize: 10 }]}>·</Text>
                        <Text style={[styles.authorText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                          {item.author}
                        </Text>
                      </>
                    ) : null}
                  </View>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={isOpen ? activeColor : colors.textMuted}
                  />
                </View>

                {/* Title — always shown fully */}
                <Text style={[styles.title, { color: isOpen ? "#ffffff" : colors.text, fontFamily: "Inter_600SemiBold" }]}>
                  {item.title}
                </Text>

                {/* Description — show preview or full */}
                {!isOpen && desc.length > 0 ? (
                  <Text style={[styles.preview, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                    {desc}
                  </Text>
                ) : null}

                {/* Expanded content */}
                {isOpen ? (
                  <View style={styles.expandedWrap}>
                    <View style={[styles.divider, { backgroundColor: activeColor }]} />
                    <Text style={[styles.fullText, { color: "#c8e8f5", fontFamily: "Inter_400Regular" }]}>
                      {fullContent || desc}
                    </Text>
                    <Pressable
                      style={[styles.readMore, { borderColor: activeColor, backgroundColor: activeColor + "22" }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(item.link);
                      }}
                    >
                      <Ionicons name="open-outline" size={13} color={activeColor} />
                      <Text style={[styles.readMoreText, { color: activeColor, fontFamily: "Inter_600SemiBold" }]}>
                        CZYTAJ NA TVN24
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <View style={{ height: 40 }} />
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
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 16, letterSpacing: 4 },
  tabScroll: { flexGrow: 0, marginBottom: 6 },
  tabRow: { paddingHorizontal: 14, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  tabText: { fontSize: 11, letterSpacing: 1.5 },
  scroll: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 40 },
  countLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 10, paddingLeft: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingTop: 60 },
  loadText: { fontSize: 14, letterSpacing: 1 },
  errorText: { fontSize: 14, textAlign: "center", paddingHorizontal: 30, lineHeight: 22 },
  retryBtn: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  card: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  timeText: { fontSize: 10, letterSpacing: 0.5 },
  authorText: { fontSize: 10, flex: 1 },
  title: { fontSize: 14, lineHeight: 21 },
  preview: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  expandedWrap: { marginTop: 10 },
  divider: { height: 1, borderRadius: 1, marginBottom: 10, opacity: 0.5 },
  fullText: { fontSize: 13, lineHeight: 21 },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  readMoreText: { fontSize: 11, letterSpacing: 1.5 },
});
