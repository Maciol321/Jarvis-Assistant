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

const { width: W } = Dimensions.get("window");

const baseUrl = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

const haptic = (type: "light" | "medium" | "success") => {
  if (Platform.OS === "web") return;
  if (type === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else {
    Haptics.impactAsync(
      type === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }
};

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
  listening: "SŁUCHAM...",
  processing: "PRZETWARZAM...",
  speaking: "ODPOWIADAM...",
};

const STATUS_COLORS: Record<string, string> = {
  standby: "#3a7a9c",
  listening: "#00ff88",
  processing: "#ff8c00",
  speaking: "#00d4ff",
};

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never;
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

function GridBackground() {
  const { width: W2 } = Dimensions.get("window");
  const H2 = 900;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W2} height={H2}>
        <Defs>
          <Pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <Path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0a2040" strokeWidth="0.4" />
          </Pattern>
        </Defs>
        <Rect width={W2} height={H2} fill="url(#grid)" />
        <Line x1="0" y1={H2 * 0.5} x2={W2} y2={H2 * 0.5} stroke="#00d4ff" strokeWidth="0.2" strokeOpacity="0.15" />
        <Line x1={W2 * 0.5} y1="0" x2={W2 * 0.5} y2={H2} stroke="#00d4ff" strokeWidth="0.2" strokeOpacity="0.15" />
      </Svg>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    status,
    currentResponse,
    sendMessage,
    messages,
    ttsAudioBase64,
    ttsReady,
    clearTts,
    stopSpeaking,
    setListening,
  } = useJarvis();

  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const micPulse = useRef(new Animated.Value(1)).current;
  const wakePulse = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const wakeRecRef = useRef<SpeechRecognition | null>(null);
  const cmdRecRef = useRef<SpeechRecognition | null>(null);
  const wakeRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCommandActiveRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Wake pulse animation
  useEffect(() => {
    if (wakeActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(wakePulse, { toValue: 1.15, duration: 1800, useNativeDriver: false }),
          Animated.timing(wakePulse, { toValue: 1, duration: 1800, useNativeDriver: false }),
        ]),
      ).start();
    } else {
      wakePulse.setValue(1);
    }
  }, [wakeActive, wakePulse]);

  // Mic pulse animation when listening
  useEffect(() => {
    if (status === "listening" || voiceListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.4, duration: 400, useNativeDriver: false }),
          Animated.timing(micPulse, { toValue: 1, duration: 400, useNativeDriver: false }),
        ]),
      ).start();
    } else {
      micPulse.setValue(1);
    }
  }, [status, voiceListening, micPulse]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, currentResponse]);

  useEffect(() => {
    if (ttsReady && ttsAudioBase64) {
      playTts(ttsAudioBase64);
    }
  }, [ttsReady, ttsAudioBase64]);

  // Start wake word listening on web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    let mounted = true;

    const startWake = () => {
      if (!mounted || isCommandActiveRef.current) return;
      try {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "pl-PL";
        rec.maxAlternatives = 1;

        rec.onresult = (e: SpeechRecognitionEvent) => {
          if (isCommandActiveRef.current) return;
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript.toLowerCase().replace(/\s+/g, "");
            if (t.includes("jarvis") || t.includes("hejjarvis") || t.includes("okjarvis")) {
              wakeRecRef.current?.stop();
              wakeRecRef.current = null;
              startCommand(startWake);
              return;
            }
          }
        };

        rec.onstart = () => { if (mounted) setWakeActive(true); };
        rec.onend = () => {
          if (!mounted || isCommandActiveRef.current) return;
          setWakeActive(false);
          wakeRestartTimerRef.current = setTimeout(() => {
            if (mounted && !isCommandActiveRef.current) startWake();
          }, 600);
        };
        rec.onerror = (e: SpeechRecognitionErrorEvent) => {
          if (e.error === "not-allowed") { setWakeActive(false); return; }
          setWakeActive(false);
          if (!isCommandActiveRef.current) {
            wakeRestartTimerRef.current = setTimeout(() => {
              if (mounted) startWake();
            }, 1500);
          }
        };

        wakeRecRef.current = rec;
        rec.start();
      } catch { /* browser unsupported */ }
    };

    startWake();

    return () => {
      mounted = false;
      if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current);
      wakeRecRef.current?.stop();
      wakeRecRef.current = null;
      cmdRecRef.current?.stop();
      cmdRecRef.current = null;
    };
  }, []);

  const startCommand = (onDone: () => void) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onDone(); return; }

    isCommandActiveRef.current = true;
    setVoiceListening(true);
    setListening(true);
    setLiveTranscript("");
    haptic("medium");

    try {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "pl-PL";
      rec.maxAlternatives = 1;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        setLiveTranscript(final || interim);
        if (final) {
          rec.stop();
          setLiveTranscript("");
          setVoiceListening(false);
          setListening(false);
          isCommandActiveRef.current = false;
          sendMessage(final);
          setTimeout(() => onDone(), 1200);
        }
      };

      rec.onerror = () => {
        setVoiceListening(false);
        setListening(false);
        setLiveTranscript("");
        isCommandActiveRef.current = false;
        setTimeout(() => onDone(), 500);
      };

      rec.onend = () => {
        setVoiceListening(false);
        setListening(false);
        isCommandActiveRef.current = false;
        setLiveTranscript("");
        setTimeout(() => onDone(), 500);
      };

      cmdRecRef.current = rec;
      rec.start();
    } catch {
      setVoiceListening(false);
      setListening(false);
      isCommandActiveRef.current = false;
      onDone();
    }
  };

  const playTts = async (b64: string) => {
    if (Platform.OS === "web") { clearTts(); return; }
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
    haptic("medium");
    const text = inputText;
    setInputText("");
    await sendMessage(text);
  }, [inputText, status, sendMessage]);

  // Mic button — on web triggers command immediately, on native records audio
  const handleMic = useCallback(async () => {
    if (Platform.OS === "web") {
      if (voiceListening) {
        cmdRecRef.current?.stop();
        return;
      }
      startCommand(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR && !isCommandActiveRef.current) {
          try {
            const rec = new SR();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = "pl-PL";
            rec.onresult = (e: SpeechRecognitionEvent) => {
              if (isCommandActiveRef.current) return;
              for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript.toLowerCase().replace(/\s+/g, "");
                if (t.includes("jarvis")) {
                  wakeRecRef.current?.stop();
                  wakeRecRef.current = null;
                  startCommand(() => {});
                  return;
                }
              }
            };
            rec.onend = () => setWakeActive(false);
            rec.onerror = () => setWakeActive(false);
            rec.onstart = () => setWakeActive(true);
            wakeRecRef.current = rec;
            rec.start();
            setWakeActive(true);
          } catch { /* */ }
        }
      });
      return;
    }

    // Native recording
    if (isRecording) {
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        setIsRecording(false);
        recordingRef.current = null;
        if (uri) {
          haptic("success");
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const res = await fetch(`${baseUrl}/api/jarvis/stt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: b64 }),
          });
          const data = (await res.json()) as { text?: string };
          if (data.text) await sendMessage(data.text);
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
        haptic("light");
      } catch { /* */ }
    }
  }, [isRecording, voiceListening, sendMessage]);

  const timeStr = currentTime.toLocaleTimeString("pl-PL", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const dateStr = currentTime.toLocaleDateString("pl-PL", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  }).toUpperCase();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 8 : insets.bottom;
  const isListeningActive = voiceListening || isRecording;
  const orbSize = W * 0.54;

  const lastMessages = messages.slice(-10);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GridBackground />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4 }]}>
        <View>
          <Text style={[styles.jarvisTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            JARVIS
          </Text>
          <Text style={[styles.subtitle, { color: "#7ab8d4", fontFamily: "Inter_400Regular" }]}>
            AI ASSISTANT · SYSTEM ONLINE
          </Text>
        </View>
        <View style={styles.clockContainer}>
          <Text style={[styles.clock, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            {timeStr}
          </Text>
          <Text style={[styles.date, { color: "#a0d0e8", fontFamily: "Inter_400Regular" }]}>
            {dateStr}
          </Text>
        </View>
      </View>

      {/* Status row */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
        <Text style={[styles.statusText, { color: STATUS_COLORS[status], fontFamily: "Inter_600SemiBold" }]}>
          {STATUS_LABELS[status] ?? "GOTOWY"}
        </Text>
        {wakeActive && status === "standby" && (
          <View style={styles.wakeIndicator}>
            <Animated.View style={[styles.wakeDot, { transform: [{ scale: wakePulse }] }]} />
            <Text style={[styles.wakeLabel, { fontFamily: "Inter_400Regular" }]}>HEJ JARVIS</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {messages.length > 0 && (
          <Pressable onPress={() => router.push("/history")} hitSlop={10} style={styles.historyBtn}>
            <Ionicons name="time-outline" size={14} color="#3a7a9c" />
            <Text style={[styles.historyLabel, { fontFamily: "Inter_400Regular" }]}>
              ({messages.length})
            </Text>
          </Pressable>
        )}
      </View>

      {/* Orb */}
      <Pressable
        style={styles.orbContainer}
        onPress={status === "speaking" ? stopSpeaking : undefined}
      >
        <HUDRing size={orbSize} active={status !== "standby"} showOrb />
        <View style={styles.orbCenter} pointerEvents="none">
          <Text style={[styles.orbText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            JARVIS
          </Text>
          <Text style={[styles.orbSub, { color: "#7ab8d4", fontFamily: "Inter_400Regular" }]}>
            {status === "speaking" ? "■ STOP" : isListeningActive ? "SŁUCHAM" : "v2.0"}
          </Text>
        </View>
      </Pressable>

      {/* Live transcript bubble */}
      {liveTranscript ? (
        <View style={styles.transcriptBubble}>
          <Text style={[styles.transcriptText, { fontFamily: "Inter_400Regular" }]}>
            🎤 {liveTranscript}
          </Text>
        </View>
      ) : null}

      {/* Conversation area */}
      <View style={styles.responseContainer}>
        <ScrollView
          ref={scrollRef}
          style={styles.responseScroll}
          contentContainerStyle={{ paddingVertical: 6 }}
          showsVerticalScrollIndicator={false}
        >
          {lastMessages.length === 0 && !currentResponse ? (
            <Text style={[styles.responseEmpty, { color: "#4a7a8a", fontFamily: "Inter_400Regular" }]}>
              {wakeActive ? 'Powiedz "Hej Jarvis" lub napisz poniżej...' : "Napisz pytanie lub użyj mikrofonu..."}
            </Text>
          ) : (
            lastMessages.map((msg) => (
              <View key={msg.id} style={[
                styles.msgRow,
                msg.role === "user" ? styles.msgUser : styles.msgAssistant,
              ]}>
                <Text style={[
                  styles.msgLabel,
                  { color: msg.role === "user" ? "#5a8aa0" : "#006a8a", fontFamily: "Inter_400Regular" },
                ]}>
                  {msg.role === "user" ? "TY" : "JARVIS"}
                </Text>
                <Text style={[
                  styles.msgText,
                  {
                    color: msg.role === "user" ? "#c8e8f5" : colors.primary,
                    fontFamily: msg.role === "user" ? "Inter_400Regular" : "Inter_500Medium",
                  },
                ]}>
                  {msg.content}
                </Text>
              </View>
            ))
          )}
          {currentResponse ? (
            <View style={styles.msgAssistant}>
              <Text style={[styles.msgLabel, { color: "#006a8a", fontFamily: "Inter_400Regular" }]}>
                JARVIS
              </Text>
              <Text style={[styles.msgText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                {currentResponse}
                {status === "processing" && <Text style={{ opacity: 0.6 }}>▌</Text>}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Quick actions */}
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
              haptic("light");
              router.push(action.route);
            }}
          >
            <Ionicons name={action.icon} size={18} color={action.color} />
            <Text style={[styles.actionLabel, { color: action.color, fontFamily: "Inter_500Medium" }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Input row */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <View style={[styles.inputRow, { paddingBottom: bottomPad + 6, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: status === "processing" ? colors.primary : colors.border,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="Zapytaj Jarvisa..."
            placeholderTextColor="#5a8aa0"
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
                backgroundColor: inputText.trim() ? colors.primary : "#0a2535",
                borderWidth: 1,
                borderColor: inputText.trim() ? colors.primary : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            disabled={!inputText.trim() || status === "processing"}
          >
            <Ionicons name="arrow-up" size={20} color={inputText.trim() ? "#000913" : "#3a7a9c"} />
          </Pressable>
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
            <Pressable
              onPress={handleMic}
              style={({ pressed }) => [
                styles.micBtn,
                {
                  backgroundColor: isListeningActive ? "#003a20" : colors.card,
                  borderColor: isListeningActive ? "#00ff88" : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name={isListeningActive ? "stop-circle" : "mic"}
                size={22}
                color={isListeningActive ? "#00ff88" : colors.primary}
              />
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  jarvisTitle: { fontSize: 20, letterSpacing: 6 },
  subtitle: { fontSize: 9, letterSpacing: 2, marginTop: 2 },
  clockContainer: { alignItems: "flex-end" },
  clock: { fontSize: 20, letterSpacing: 2 },
  date: { fontSize: 9, letterSpacing: 1, marginTop: 2 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 2,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, letterSpacing: 2 },
  wakeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
    backgroundColor: "#001a0a",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#00ff8844",
  },
  wakeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#00ff88",
  },
  wakeLabel: { fontSize: 8, color: "#00ff88", letterSpacing: 1.5 },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 2,
  },
  orbCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  orbText: { fontSize: 14, letterSpacing: 6 },
  orbSub: { fontSize: 9, letterSpacing: 2, marginTop: 2 },
  transcriptBubble: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: "#001a0a",
    borderWidth: 1,
    borderColor: "#00ff8833",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  transcriptText: { color: "#00ff88", fontSize: 12 },
  responseContainer: {
    flex: 1,
    marginHorizontal: 14,
    marginBottom: 4,
  },
  responseScroll: { flex: 1 },
  responseEmpty: {
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.3,
    paddingVertical: 10,
    lineHeight: 18,
  },
  msgRow: { marginBottom: 6 },
  msgLabel: { fontSize: 9, letterSpacing: 2, marginBottom: 2 },
  msgUser: { paddingLeft: 4, borderLeftWidth: 1, borderLeftColor: "#1a4060", paddingBottom: 2 },
  msgAssistant: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#00d4ff",
    paddingBottom: 2,
    marginBottom: 6,
  },
  msgText: { fontSize: 13, lineHeight: 19 },
  quickActions: {
    flexDirection: "row",
    flexWrap: "nowrap",
    paddingHorizontal: 8,
    marginBottom: 4,
    gap: 5,
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 0.5,
    gap: 2,
  },
  actionLabel: { fontSize: 8, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 6,
    borderTopWidth: 0.5,
    gap: 7,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#1a4060",
  },
  historyLabel: { fontSize: 10, color: "#3a7a9c" },
});
