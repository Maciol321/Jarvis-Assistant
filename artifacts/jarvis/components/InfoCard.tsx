import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface InfoCardProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}

export function InfoCard({ title, children, style, accent = false }: InfoCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: accent ? colors.primary : colors.border,
          borderWidth: accent ? 1 : 0.5,
          shadowColor: accent ? colors.primary : "transparent",
        },
        style,
      ]}
    >
      {title ? (
        <Text
          style={[
            styles.title,
            { color: colors.primary, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          {title.toUpperCase()}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },
});
