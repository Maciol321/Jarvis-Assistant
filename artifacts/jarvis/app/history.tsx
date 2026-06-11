import React, { useState } from "react";
import {
  Clipboard,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useJarvis, type Message } from "@/contexts/JarvisContext";
import { useColors } from "@/hooks/useColors";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function groupByDate(msgs: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of msgs) {
    const d = formatDate(msg.timestamp);
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ date: d, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { messages, clearMessages } = useJarvis();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleCopy = (text: string, id: string) => {
    Clipboard.setString(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch {
      /* ignore */
    }
  };

  const handleClear = () => {
    clearMessages();
  };

  const groups = groupByDate(messages);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            HISTORIA
          </Text>
          <Text style={[styles.subtitle, { color: "#7ab8d4", fontFamily: "Inter_400Regular" }]}>
            {messages.length} wiadomości
          </Text>
        </View>
        {messages.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={12}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </Pressable>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color="#1a4060" />
          <Text style={[styles.emptyTitle, { color: "#3a7a9c", fontFamily: "Inter_600SemiBold" }]}>
            BRAK HISTORII
          </Text>
          <Text style={[styles.emptyText, { color: "#2a5878", fontFamily: "Inter_400Regular" }]}>
            Twoja rozmowa z Jarvisem pojawi się tutaj
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.date}>
              <View style={styles.dateGroup}>
                <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dateLabel, { color: "#3a7a9c", fontFamily: "Inter_500Medium" }]}>
                  {group.date.toUpperCase()}
                </Text>
                <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
              </View>

              {group.messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.msgCard,
                    {
                      backgroundColor: msg.role === "user" ? colors.card : "#041520",
                      borderColor: msg.role === "user" ? colors.border : "#00d4ff30",
                    },
                  ]}
                >
                  <View style={styles.msgHeader}>
                    <View style={styles.msgRole}>
                      <Ionicons
                        name={msg.role === "user" ? "person-outline" : "hardware-chip-outline"}
                        size={13}
                        color={msg.role === "user" ? "#7ab8d4" : colors.primary}
                      />
                      <Text
                        style={[
                          styles.roleLabel,
                          {
                            color: msg.role === "user" ? "#7ab8d4" : colors.primary,
                            fontFamily: "Inter_600SemiBold",
                          },
                        ]}
                      >
                        {msg.role === "user" ? "TY" : "JARVIS"}
                      </Text>
                    </View>
                    <Text style={[styles.timestamp, { color: "#2a5878", fontFamily: "Inter_400Regular" }]}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.msgText,
                      {
                        color: msg.role === "user" ? "#c8e8f5" : colors.primary,
                        fontFamily: msg.role === "user" ? "Inter_400Regular" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {msg.content}
                  </Text>

                  <View style={styles.msgActions}>
                    <Pressable
                      onPress={() => handleCopy(msg.content, msg.id)}
                      style={styles.actionBtn}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={copiedId === msg.id ? "checkmark-outline" : "copy-outline"}
                        size={14}
                        color={copiedId === msg.id ? "#00ff88" : "#2a5878"}
                      />
                      <Text
                        style={[
                          styles.actionLabel,
                          {
                            color: copiedId === msg.id ? "#00ff88" : "#2a5878",
                            fontFamily: "Inter_400Regular",
                          },
                        ]}
                      >
                        {copiedId === msg.id ? "Skopiowano" : "Kopiuj"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleShare(msg.content)}
                      style={styles.actionBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="share-outline" size={14} color="#2a5878" />
                      <Text style={[styles.actionLabel, { color: "#2a5878", fontFamily: "Inter_400Regular" }]}>
                        Udostępnij
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 2,
  },
  clearBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    letterSpacing: 4,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  dateGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
  },
  dateLine: {
    flex: 1,
    height: 0.5,
  },
  dateLabel: {
    fontSize: 10,
    letterSpacing: 2,
  },
  msgCard: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  msgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  msgRole: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  roleLabel: {
    fontSize: 10,
    letterSpacing: 2,
  },
  timestamp: {
    fontSize: 10,
    letterSpacing: 1,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 20,
  },
  msgActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#0a2535",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    fontSize: 11,
  },
});
