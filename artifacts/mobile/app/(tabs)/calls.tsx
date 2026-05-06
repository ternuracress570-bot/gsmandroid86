import { Feather } from "@expo/vector-icons";
import React from "react";
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
import { useGateway, type ActiveCall } from "@/context/GatewayContext";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CallItem({
  call,
  onHangup,
}: {
  call: ActiveCall;
  onHangup: () => void;
}) {
  const colors = useColors();
  const isUp = call.state === "Up";
  const stateColor = isUp
    ? colors.primary
    : call.state === "Ring" || call.state === "Ringing"
    ? colors.warning
    : colors.mutedForeground;

  return (
    <View
      style={[
        styles.item,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.dirIcon,
          {
            backgroundColor:
              call.direction === "inbound"
                ? `${colors.accent}22`
                : `${colors.primary}22`,
          },
        ]}
      >
        <Feather
          name={
            call.direction === "inbound" ? "phone-incoming" : "phone-outgoing"
          }
          size={18}
          color={call.direction === "inbound" ? colors.accent : colors.primary}
        />
      </View>

      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={[styles.number, { color: colors.foreground }]}>
            {call.direction === "inbound"
              ? call.caller
              : call.callee || call.caller}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTime(call.startTime)}
          </Text>
        </View>

        <View style={styles.itemBottom}>
          <View style={[styles.stateTag, { backgroundColor: `${stateColor}22` }]}>
            <Text style={[styles.stateText, { color: stateColor }]}>
              {call.state}
            </Text>
          </View>
          <Text style={[styles.duration, { color: colors.mutedForeground }]}>
            {formatDuration(call.duration)}
          </Text>
          <Text style={[styles.chanId, { color: colors.mutedForeground }]}>
            · {call.id.slice(0, 10)}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onHangup}
        style={[
          styles.hangup,
          { backgroundColor: `${colors.destructive}22` },
        ]}
      >
        <Feather name="phone-off" size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

export default function CallsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeCalls, hangupCall, status } = useGateway();

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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Active Calls
        </Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                activeCalls.length > 0
                  ? `${colors.primary}22`
                  : colors.secondary,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color:
                  activeCalls.length > 0 ? colors.primary : colors.mutedForeground,
              },
            ]}
          >
            {activeCalls.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={activeCalls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CallItem call={item} onHangup={() => hangupCall(item.id)} />
        )}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
          },
        ]}
        scrollEnabled={!!activeCalls.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="phone" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Active Calls
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {status === "connected"
                ? "Calls will appear here when channels are active"
                : "Connect to Asterisk first"}
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
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", flex: 1 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16, gap: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  dirIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: { flex: 1, gap: 6 },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  number: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  stateTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  stateText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  duration: { fontSize: 12, fontFamily: "Inter_400Regular" },
  chanId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hangup: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
