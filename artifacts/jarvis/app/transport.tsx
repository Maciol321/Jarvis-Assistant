import React, { useCallback, useState } from "react";
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
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");
const baseUrl = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

type TransportMessage = { role: "user" | "jarvis"; content: string };

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

const QUICK_QUESTIONS = [
  "Następny pociąg z Warszawy do Krakowa",
  "Autobusy PKS Wrocław → Warszawa jutro",
  "Połączenia PKP Gdańsk - Poznań",
  "Kiedy jest nocny autobus w Warszawie?",
];

export default function TransportScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<TransportMessage[]>([
    {
      role: "jarvis",
      content: "Witaj! Mogę pomóc Ci znaleźć informacje o połączeniach kolejowych i autobusowych w Polsce. Zapytaj mnie o rozkłady jazdy PKP, PKS lub komunikacji miejskiej.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const askJarvis = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: TransportMessage = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const systemContext = {
      role: "user" as const,
      content: `[Kontekst: użytkownik pyta o transport publiczny w Polsce. Podaj konkretne informacje o rozkładach PKP, PKS, komunikacji miejskiej. Jeśli nie masz aktualnych danych, zasugeruj sprawdzenie na portalpasazera.pl lub rozklad-pkp.pl. Podaj typowe godziny odjazdów jeśli je znasz.]\n\n${question}`,
    };

    let fullResponse = "";
    try {
      const res = await fetch(`${baseUrl}/api/jarvis/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.filter((m) => m.role !== "jarvis").map((m) => ({
              role: "user" as const,
              content: m.content,
            })),
            systemContext,
          ],
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("no reader");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { content?: string; done?: boolean };
            if (data.content) fullResponse += data.content;
          } catch { /* skip */ }
        }
      }

      setMessages((prev) => [...prev, { role: "jarvis", content: fullResponse || "Przepraszam, nie mogłem przetworzyć zapytania." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "jarvis", content: "Błąd połączenia z systemem JARVIS." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBg />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          TRANSPORT
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        {QUICK_QUESTIONS.map((q) => (
          <Pressable
            key={q}
            style={[styles.quickChip, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => askJarvis(q)}
          >
            <Ionicons name="train-outline" size={12} color={colors.primary} />
            <Text style={[styles.quickText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.msgList}
        contentContainerStyle={styles.msgContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.msgBubble,
              msg.role === "user" ? styles.userBubble : styles.jarvisBubble,
              {
                backgroundColor: msg.role === "user" ? colors.secondary : colors.card,
                borderColor: msg.role === "user" ? colors.secondary : colors.border,
              },
            ]}
          >
            {msg.role === "jarvis" ? (
              <Text style={[styles.bubbleLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                JARVIS
              </Text>
            ) : null}
            <Text style={[styles.bubbleText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>
              {msg.content}
            </Text>
          </View>
        ))}
        {loading ? (
          <View style={[styles.msgBubble, styles.jarvisBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bubbleLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>JARVIS</Text>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <View style={[styles.inputRow, { paddingBottom: bottomPad + 8, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
            placeholder="Zapytaj o połączenie..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => askJarvis(input)}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => askJarvis(input)}
            disabled={!input.trim() || loading}
            style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.primary, opacity: pressed || !input.trim() ? 0.5 : 1 }]}
          >
            <Ionicons name="arrow-up" size={20} color="#000913" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  quickRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  quickText: { fontSize: 12, maxWidth: 180 },
  msgList: { flex: 1 },
  msgContent: { padding: 16, paddingBottom: 8, gap: 10 },
  msgBubble: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    maxWidth: "90%",
  },
  userBubble: { alignSelf: "flex-end" },
  jarvisBubble: { alignSelf: "flex-start" },
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
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
