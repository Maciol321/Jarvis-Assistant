import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import Svg, { Defs, Pattern, Path, Rect, Line } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { useJarvis } from "@/contexts/JarvisContext";
import { HUDRing } from "@/components/HUDRing";

const { width: W, height: H } = Dimensions.get("window");

const baseUrl = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: "/weather" | "/news" | "/sports" | "/transport" | "/map" | "/camera";
  color: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { icon: "partly-sunny-outline", label: "Pogoda", route: "/weather", color: "#00d4ff" },
  { icon: "newspaper-outline", label: "Wiadomości", route: "/news", color: "#00d4ff" },
  { icon: "football-outline", label: "Sport", route: "/sports", color: "#00ff88" },
  { icon: "train-outline", label: "Transport", route: "/transport", color: "#ff8c00" },
  { icon: "map-outline", label: "Mapa", route: "/map", color: "#00d4ff" },
  { icon: "camera-outline", label: "Kamera", route: "/camera", color: "#0057d8" },
];

const STATUS_LABELS: Record<string, string> = {
  standby: "GOTOWY",
  listening: "NASŁUCHUJĘ...",
  processing: "PRZETWARZAM...",
  speaking: "ODPOWIADAM...",
};

const STATUS_COLORS: Record<string, string> = {
  standby: "#3a7a9c",
  listening: "#00ff88",
  processing: "#ff8c00",
  speaking: "#00d4ff",
};

function GridBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        <Defs>
          <Pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <Path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0a2040" strokeWidth="0.4" />
          </Pattern>
        </Defs>
        <Rect width={W} height={H} fill="url(#grid)" />
        <Line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5} stroke="#00d4ff" strokeWidth="0.2" strokeOpacity="0.15" />
        <Line x1={W * 0.5} y1="0" x2={W * 0.5} y2={H} stroke="#00d4ff" strokeWidth="0.2" strokeOpacity="0.15" />
      </Svg>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, currentResponse, sendMessage, messages, ttsAudioBase64, ttsReady, clearTts } = useJarvis();

  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const micPulse = useRef(new Animated.Value(1)).current;
  const statusFade = useRef(new Animated.Value(1)).current;

  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === "listening") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      micPulse.setValue(1);
    }
  }, [status, micPulse]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, currentResponse]);

  useEffect(() => {
    if (ttsReady && ttsAudioBase64) {
      playTts(ttsAudioBase64);
    }
  }, [ttsReady, ttsAudioBase64]);

  const playTts = async (b64: string) => {
    try {
      await soundRef.current?.unloadAsync();
      const path = `${FileSystem.documentDirectory}jarvis_tts.mp3`;
      await FileSystem.writeAsStringAsync(path, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { sound } = await Audio.Sound.createAsync({ uri: path });
      soundRef.current = sound;
      await sound.playAsync();
      clearTts();
    } catch {
      clearTts();
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || status === "processing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = inputText;
    setInputText("");
    await sendMessage(text);
  }, [inputText, status, sendMessage]);

  const handleMic = useCallback(async () => {
    if (isRecording) {
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        setIsRecording(false);
        recordingRef.current = null;

        if (uri) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const res = await fetch(`${baseUrl}/api/jarvis/stt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: b64 }),
          });
          const data = (await res.json()) as { text?: string };
          if (data.text) {
            await sendMessage(data.text);
          }
        }
      } catch {
        setIsRecording(false);
      }
    } else {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) return;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await rec.startAsync();
        recordingRef.current = rec;
        setIsRecording(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        /* permission denied */
      }
    }
  }, [isRecording, sendMessage]);

  const timeStr = currentTime.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateStr = currentTime.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const lastMessages = messages.slice(-6);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBackground />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={[styles.jarvisTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            JARVIS
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            AI ASSISTANT · SYSTEM ONLINE
          </Text>
        </View>
        <View style={styles.clockContainer}>
          <Text style={[styles.clock, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            {timeStr}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            {dateStr}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
        <Text style={[styles.statusText, { color: STATUS_COLORS[status], fontFamily: "Inter_600SemiBold" }]}>
          {STATUS_LABELS[status] ?? "GOTOWY"}
        </Text>
      </View>

      <View style={styles.orbContainer}>
        <HUDRing size={W * 0.72} active={status !== "standby"} showOrb />
        <View style={styles.orbCenter} pointerEvents="none">
          <Text style={[styles.orbText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            JARVIS
          </Text>
          <Text style={[styles.orbSub, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            v2.0
          </Text>
        </View>
      </View>

      <View style={styles.responseContainer}>
        <ScrollView
          ref={scrollRef}
          style={styles.responseScroll}
          contentContainerStyle={{ paddingVertical: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {lastMessages.length === 0 ? (
            <Text style={[styles.responseEmpty, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
              Powiedz coś lub napisz pytanie...
            </Text>
          ) : (
            lastMessages.map((msg) => (
              <View key={msg.id} style={[
                styles.msgRow,
                msg.role === "user" ? styles.msgUser : styles.msgAssistant,
              ]}>
                <Text style={[
                  styles.msgText,
                  {
                    color: msg.role === "user" ? colors.text : colors.primary,
                    fontFamily: msg.role === "user" ? "Inter_400Regular" : "Inter_500Medium",
                  },
                ]}>
                  {msg.role === "user" ? `> ${msg.content}` : msg.content}
                </Text>
              </View>
            ))
          )}
          {currentResponse && status === "processing" ? (
            <View style={styles.msgAssistant}>
              <Text style={[styles.msgText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                {currentResponse}
                <Text style={{ opacity: 0.6 }}>▌</Text>
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.route}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: pressed ? colors.card : colors.surface,
                borderColor: action.color,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(action.route);
            }}
          >
            <Ionicons name={action.icon} size={20} color={action.color} />
            <Text style={[styles.actionLabel, { color: action.color, fontFamily: "Inter_500Medium" }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputRow, { paddingBottom: bottomPad + 8, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="Zapytaj Jarvisa..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={status !== "processing"}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || !inputText.trim() ? 0.5 : 1,
              },
            ]}
            disabled={!inputText.trim() || status === "processing"}
          >
            <Ionicons name="arrow-up" size={20} color="#000913" />
          </Pressable>
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
            <Pressable
              onPress={handleMic}
              style={({ pressed }) => [
                styles.micBtn,
                {
                  backgroundColor: isRecording ? colors.hudRed : colors.card,
                  borderColor: isRecording ? colors.hudRed : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic-outline"}
                size={22}
                color={isRecording ? "#ffffff" : colors.primary}
              />
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  jarvisTitle: {
    fontSize: 22,
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 2,
  },
  clockContainer: {
    alignItems: "flex-end",
  },
  clock: {
    fontSize: 20,
    letterSpacing: 2,
  },
  date: {
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 2,
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  orbCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  orbText: {
    fontSize: 16,
    letterSpacing: 6,
  },
  orbSub: {
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 2,
  },
  responseContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 4,
    maxHeight: 120,
  },
  responseScroll: {
    flex: 1,
  },
  responseEmpty: {
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.5,
    paddingVertical: 8,
  },
  msgRow: {
    marginBottom: 4,
  },
  msgUser: {
    paddingLeft: 4,
  },
  msgAssistant: {
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#00d4ff",
    paddingBottom: 2,
    marginBottom: 6,
  },
  msgText: {
    fontSize: 12,
    lineHeight: 18,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "nowrap",
    paddingHorizontal: 10,
    marginBottom: 6,
    gap: 6,
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.5,
    gap: 3,
  },
  actionLabel: {
    fontSize: 8,
    letterSpacing: 0.5,
  },
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
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
