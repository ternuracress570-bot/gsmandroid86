import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGateway, type LogEntry } from "@/context/GatewayContext";

const LEVEL_COLOR = (
  level: LogEntry["level"],
  colors: ReturnType<typeof useColors>
) => {
  switch (level) {
    case "success":
      return colors.primary;
    case "error":
      return colors.destructive;
    case "warn":
      return colors.warning;
    default:
      return colors.mutedForeground;
  }
};

const LEVEL_ICON: Record<LogEntry["level"], keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "x-circle",
  warn: "alert-triangle",
  info: "info",
};

function LogRow({ entry }: { entry: LogEntry }) {
  const colors = useColors();
  const color = LEVEL_COLOR(entry.level, colors);

  const time = entry.time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <View style={[styles.row, { borderLeftColor: color }]}>
      <Feather name={LEVEL_ICON[entry.level]} size={13} color={color} style={styles.icon} />
      <Text style={[styles.time, { color: colors.mutedForeground }]}>{time}</Text>
      <Text style={[styles.msg, { color: colors.foreground }]} numberOfLines={3}>
        {entry.message}
      </Text>
    </View>
  );
}

export default function LogsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logs } = useGateway();
  const listRef = useRef<FlatList>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
          },
        ]}
      >
        <Feather name="terminal" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          System Logs
        </Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {logs.length} entries
        </Text>
        <Pressable
          onPress={() => listRef.current?.scrollToOffset({ offset: 0 })}
          style={[styles.scrollBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="arrow-up" size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LogRow entry={item} />}
        style={[styles.list, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
          },
        ]}
        scrollEnabled={!!logs.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="terminal" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No logs yet. Connect to start.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scrollBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1 },
  listContent: { paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderLeftWidth: 2,
    marginHorizontal: 12,
    marginVertical: 2,
    gap: 8,
    borderRadius: 4,
  },
  icon: { marginTop: 1 },
  time: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    width: 72,
    flexShrink: 0,
  },
  msg: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  empty: { paddingTop: 80, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
