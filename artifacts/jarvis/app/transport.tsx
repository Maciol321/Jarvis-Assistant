import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");
const baseUrl = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

type Station = { id: number; name: string; slug: string };

type Section = {
  train_full_name: string;
  brand?: string;
  departure: string;
  arrival: string;
  from: { name: string; platform?: string };
  to: { name: string; platform?: string };
};

type Connection = {
  departure_time: string;
  arrival_time: string;
  duration: string;
  changes: number;
  price?: number;
  sections: Section[];
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

function StationPicker({
  label,
  value,
  onSelect,
  colors,
}: {
  label: string;
  value: Station | null;
  onSelect: (s: Station) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`${baseUrl}/api/transport/stations?q=${encodeURIComponent(q)}`);
        const data = (await r.json()) as Station[];
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const pick = (s: Station) => {
    setQuery(s.name);
    setResults([]);
    onSelect(s);
  };

  return (
    <View style={pickerStyles.wrap}>
      <Text style={[pickerStyles.label, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
      <View style={[pickerStyles.inputWrap, { borderColor: value ? colors.primary : colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="train-outline" size={14} color={value ? colors.primary : colors.textMuted} />
        <TextInput
          style={[pickerStyles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Wpisz stację..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={search}
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
        {value && !loading && (
          <Pressable onPress={() => { setQuery(""); setResults([]); onSelect(null as unknown as Station); }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {results.length > 0 && (
        <View style={[pickerStyles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {results.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [pickerStyles.dropItem, { backgroundColor: pressed ? colors.surface : "transparent" }]}
              onPress={() => pick(s)}
            >
              <Ionicons name="location-outline" size={12} color={colors.primary} />
              <Text style={[pickerStyles.dropText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap: { flex: 1, position: "relative", zIndex: 10 },
  label: { fontSize: 9, letterSpacing: 2, marginBottom: 4, paddingLeft: 2 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  input: { flex: 1, fontSize: 13 },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 0.5,
    borderRadius: 10,
    zIndex: 100,
    elevation: 10,
    overflow: "hidden",
    marginTop: 2,
  },
  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropText: { fontSize: 13 },
});

function DepartureCard({ conn, colors }: { conn: Connection; colors: ReturnType<typeof useColors> }) {
  const [open, setOpen] = useState(false);
  const firstSection = conn.sections[0];
  const trainName = firstSection?.train_full_name ?? "—";
  const brand = firstSection?.brand;
  const fromPlatform = firstSection?.from?.platform;

  const changesColor = conn.changes === 0 ? "#00ff88" : conn.changes === 1 ? "#ff8c00" : "#ff4444";

  return (
    <Pressable
      style={[card.wrap, { backgroundColor: colors.card, borderColor: open ? colors.primary : colors.border }]}
      onPress={() => setOpen(!open)}
    >
      {/* Main row */}
      <View style={card.row}>
        {/* Departure time */}
        <View style={card.timeCol}>
          <Text style={[card.time, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            {conn.departure_time}
          </Text>
          <Text style={[card.timeSmall, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            {conn.arrival_time}
          </Text>
        </View>

        {/* Train info */}
        <View style={card.infoCol}>
          <View style={card.trainRow}>
            <View style={[card.trainBadge, { backgroundColor: brand === "IC" || brand === "EIC" || brand === "EIP" ? "#c00000" : "#004080" }]}>
              <Text style={[card.trainBadgeText, { fontFamily: "Inter_700Bold" }]}>
                {brand ?? "PKP"}
              </Text>
            </View>
            <Text style={[card.trainName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {trainName}
            </Text>
          </View>
          <Text style={[card.duration, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            ⏱ {conn.duration?.replace(":", "h ")}min
          </Text>
        </View>

        {/* Right side */}
        <View style={card.rightCol}>
          {fromPlatform ? (
            <View style={[card.platform, { borderColor: colors.primary }]}>
              <Text style={[card.platformLabel, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>TOR</Text>
              <Text style={[card.platformNum, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {fromPlatform}
              </Text>
            </View>
          ) : null}
          <View style={[card.changesBadge, { backgroundColor: changesColor + "22", borderColor: changesColor }]}>
            <Text style={[card.changesText, { color: changesColor, fontFamily: "Inter_600SemiBold" }]}>
              {conn.changes === 0 ? "BEZP." : `${conn.changes}×`}
            </Text>
          </View>
          {conn.price != null && (
            <Text style={[card.price, { color: "#ffcc00", fontFamily: "Inter_600SemiBold" }]}>
              {conn.price.toFixed(0)} zł
            </Text>
          )}
        </View>
      </View>

      {/* Expanded sections */}
      {open && conn.sections.map((sec, i) => (
        <View key={i} style={[card.section, { borderTopColor: colors.border }]}>
          <View style={card.sectionRow}>
            <Text style={[card.sectionTime, { color: "#00ff88", fontFamily: "Inter_700Bold" }]}>{sec.departure}</Text>
            <Text style={[card.sectionStation, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{sec.from.name}</Text>
            {sec.from.platform && (
              <Text style={[card.sectionPlatform, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
                tor {sec.from.platform}
              </Text>
            )}
          </View>
          <View style={[card.sectionLine, { backgroundColor: colors.border }]} />
          <Text style={[card.sectionTrain, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            🚂 {sec.train_full_name}
          </Text>
          <View style={[card.sectionLine, { backgroundColor: colors.border }]} />
          <View style={card.sectionRow}>
            <Text style={[card.sectionTime, { color: "#ff8c00", fontFamily: "Inter_700Bold" }]}>{sec.arrival}</Text>
            <Text style={[card.sectionStation, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{sec.to.name}</Text>
            {sec.to.platform && (
              <Text style={[card.sectionPlatform, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
                tor {sec.to.platform}
              </Text>
            )}
          </View>
        </View>
      ))}
    </Pressable>
  );
}

const card = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeCol: { width: 56, alignItems: "center" },
  time: { fontSize: 20, letterSpacing: 1 },
  timeSmall: { fontSize: 12, marginTop: 2 },
  infoCol: { flex: 1, gap: 4 },
  trainRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trainBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trainBadgeText: { color: "#fff", fontSize: 9, letterSpacing: 1 },
  trainName: { fontSize: 12, flex: 1 },
  duration: { fontSize: 11 },
  rightCol: { alignItems: "center", gap: 5, minWidth: 52 },
  platform: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  platformLabel: { fontSize: 8, letterSpacing: 1 },
  platformNum: { fontSize: 14 },
  changesBadge: {
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  changesText: { fontSize: 9, letterSpacing: 0.5 },
  price: { fontSize: 11 },
  section: { borderTopWidth: 0.5, marginTop: 10, paddingTop: 10, gap: 4 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTime: { fontSize: 14, width: 42 },
  sectionStation: { flex: 1, fontSize: 13 },
  sectionPlatform: { fontSize: 11 },
  sectionLine: { height: 1, marginVertical: 2, opacity: 0.3 },
  sectionTrain: { fontSize: 11, paddingLeft: 8 },
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TransportScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 16 : insets.bottom;

  const [tab, setTab] = useState<"trains" | "chat">("trains");
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [date, setDate] = useState(todayStr());
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat tab state
  const [chatMessages, setChatMessages] = useState([
    { role: "jarvis" as const, content: "Zapytaj mnie o połączenia tramwajowe, autobusowe lub inne informacje transportowe. Podaj miasto i numer linii lub przystanek." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const search = useCallback(async () => {
    if (!fromStation || !toStation) return;
    setLoading(true);
    setError(null);
    setConnections([]);
    setSearched(true);
    try {
      const url = `${baseUrl}/api/transport/connections?from=${encodeURIComponent(fromStation.slug)}&to=${encodeURIComponent(toStation.slug)}&date=${date}`;
      const r = await fetch(url);
      const data = await r.json() as { train_suggestions?: Connection[]; connections?: Connection[] } | Connection[];
      const list = Array.isArray(data)
        ? data
        : (data as { train_suggestions?: Connection[]; connections?: Connection[] }).train_suggestions
          ?? (data as { connections?: Connection[] }).connections
          ?? [];
      setConnections(list as Connection[]);
      if ((list as Connection[]).length === 0) setError("Brak połączeń na wybrany dzień.");
    } catch {
      setError("Błąd pobierania rozkładu. Sprawdź połączenie.");
    } finally {
      setLoading(false);
    }
  }, [fromStation, toStation, date]);

  const askJarvis = useCallback(async (q: string) => {
    if (!q.trim() || chatLoading) return;
    const userMsg = { role: "user" as const, content: q.trim() };
    setChatMessages((p) => [...p, userMsg]);
    setChatInput("");
    setChatLoading(true);
    let fullResponse = "";
    try {
      const res = await fetch(`${baseUrl}/api/jarvis/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user" as const,
            content: `[Pytanie o transport publiczny w Polsce. Podaj konkretne informacje o rozkładach komunikacji miejskiej, tramwajach, autobusach. Jeśli nie masz dokładnych danych, podaj szacunkowe godziny i zasugeruj sprawdzenie oficjalnych źródeł dla danego miasta.]\n${q}`,
          }],
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6)) as { content?: string };
            if (d.content) fullResponse += d.content;
          } catch { /* */ }
        }
      }
      setChatMessages((p) => [...p, { role: "jarvis" as const, content: fullResponse || "Przepraszam, spróbuj ponownie." }]);
    } catch {
      setChatMessages((p) => [...p, { role: "jarvis" as const, content: "Błąd połączenia." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBg />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          TRANSPORT
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(["trains", "chat"] as const).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              style={[styles.tabBtn, active && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
              onPress={() => setTab(t)}
            >
              <Ionicons
                name={t === "trains" ? "train" : "chatbubble-outline"}
                size={14}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textMuted, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                {t === "trains" ? "POCIĄGI (PKP)" : "KOMUNIKACJA"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "trains" ? (
        <>
          {/* Search panel */}
          <View style={[styles.searchPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.stationRow}>
              <StationPicker label="Z STACJI" value={fromStation} onSelect={setFromStation} colors={colors} />
              <Pressable
                style={styles.swapBtn}
                onPress={() => {
                  const tmp = fromStation;
                  setFromStation(toStation);
                  setToStation(tmp);
                }}
              >
                <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
              </Pressable>
              <StationPicker label="DO STACJI" value={toStation} onSelect={setToStation} colors={colors} />
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <TextInput
                style={[styles.dateInput, { color: colors.text, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                value={date}
                onChangeText={setDate}
                placeholder="RRRR-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                style={[styles.searchBtn, { backgroundColor: fromStation && toStation ? colors.primary : colors.border }]}
                onPress={search}
                disabled={!fromStation || !toStation || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[styles.searchBtnText, { color: fromStation && toStation ? "#000913" : colors.textMuted, fontFamily: "Inter_700Bold" }]}>
                    SZUKAJ
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Results */}
          <ScrollView style={styles.results} contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {!searched && (
              <View style={styles.emptyState}>
                <Ionicons name="train-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Wpisz stację początkową i docelową{"\n"}aby zobaczyć rozkład PKP
                </Text>
                <View style={[styles.aiNote, { borderColor: "#ff8c0044", backgroundColor: "#ff8c0011" }]}>
                  <Ionicons name="sparkles-outline" size={12} color="#ff8c00" />
                  <Text style={[styles.aiNoteText, { color: "#ff8c00", fontFamily: "Inter_400Regular" }]}>
                    Rozkład generowany przez AI na podstawie danych PKP
                  </Text>
                </View>
              </View>
            )}
            {searched && connections.length > 0 && (
              <View style={[styles.aiNote, { borderColor: "#ff8c0044", backgroundColor: "#ff8c0011", marginBottom: 8 }]}>
                <Ionicons name="sparkles-outline" size={12} color="#ff8c00" />
                <Text style={[styles.aiNoteText, { color: "#ff8c00", fontFamily: "Inter_400Regular" }]}>
                  Rozkład AI (szacunkowy) · potwierdź na portalpasazera.pl
                </Text>
              </View>
            )}
            {error && (
              <View style={styles.emptyState}>
                <Ionicons name="warning-outline" size={36} color="#ff8c00" />
                <Text style={[styles.emptyText, { color: "#ff8c00", fontFamily: "Inter_400Regular" }]}>{error}</Text>
              </View>
            )}
            {connections.map((conn, i) => (
              <DepartureCard key={i} conn={conn} colors={colors} />
            ))}
          </ScrollView>
        </>
      ) : (
        <>
          <View style={[styles.infoBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={14} color="#00d4ff" />
            <Text style={[styles.infoText, { color: "#7ab8d4", fontFamily: "Inter_400Regular" }]}>
              Zapytaj o tramwaje, autobusy, metro — podaj miasto i linię lub przystanek
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  msg.role === "user"
                    ? [styles.bubbleUser, { backgroundColor: colors.secondary + "33", borderColor: colors.secondary }]
                    : [styles.bubbleJarvis, { backgroundColor: colors.card, borderColor: colors.border }],
                ]}
              >
                {msg.role === "jarvis" && (
                  <Text style={[styles.bubbleLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>JARVIS</Text>
                )}
                <Text style={[styles.bubbleText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>
                  {msg.content}
                </Text>
              </View>
            ))}
            {chatLoading && (
              <View style={[styles.bubble, styles.bubbleJarvis, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.bubbleLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>JARVIS</Text>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
            <View style={[styles.inputRow, { paddingBottom: bottomPad + 8, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                placeholder="Np. Tramwaj 10 Warszawa, kiedy następny?"
                placeholderTextColor={colors.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => askJarvis(chatInput)}
                returnKeyType="send"
              />
              <Pressable
                onPress={() => askJarvis(chatInput)}
                disabled={!chatInput.trim() || chatLoading}
                style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.primary, opacity: pressed || !chatInput.trim() ? 0.5 : 1 }]}
              >
                <Ionicons name="arrow-up" size={20} color="#000913" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </>
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  tabLabel: { fontSize: 10, letterSpacing: 1.5 },
  searchPanel: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
    gap: 10,
    zIndex: 20,
  },
  stationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    zIndex: 20,
  },
  swapBtn: {
    marginTop: 22,
    padding: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    borderBottomWidth: 0.5,
    paddingVertical: 4,
  },
  searchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  searchBtnText: { fontSize: 12, letterSpacing: 1 },
  results: { flex: 1 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  aiNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  aiNoteText: { fontSize: 11, flex: 1, lineHeight: 16 },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  infoText: { flex: 1, fontSize: 11, lineHeight: 16 },
  chatList: { flex: 1 },
  chatContent: { padding: 14, paddingBottom: 10, gap: 10 },
  bubble: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    maxWidth: "92%",
  },
  bubbleUser: { alignSelf: "flex-end" },
  bubbleJarvis: { alignSelf: "flex-start" },
  bubbleLabel: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  bubbleText: { fontSize: 13, lineHeight: 20 },
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
