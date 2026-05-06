import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGateway, type ActiveCall, type ConnectionStatus } from "@/context/GatewayContext";

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colors = useColors();
  const color =
    status === "connected"
      ? colors.primary
      : status === "connecting"
      ? colors.warning
      : status === "error"
      ? colors.destructive
      : colors.mutedForeground;
  const label =
    status === "connected"
      ? "Connected"
      : status === "connecting"
      ? "Connecting…"
      : status === "error"
      ? "Error"
      : "Disconnected";

  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.statusLabel, { color }]}>{label}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={20} color={accent ?? colors.mutedForeground} />
      <Text style={[styles.statValue, { color: accent ?? colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function CallRow({ call, onHangup }: { call: ActiveCall; onHangup: () => void }) {
  const colors = useColors();
  const stateColor =
    call.state === "Up"
      ? colors.primary
      : call.state === "Ring"
      ? colors.warning
      : colors.mutedForeground;

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View
      style={[
        styles.callRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.callIcon,
          {
            backgroundColor:
              call.direction === "inbound"
                ? `${colors.accent}22`
                : `${colors.primary}22`,
          },
        ]}
      >
        <Feather
          name={call.direction === "inbound" ? "phone-incoming" : "phone-outgoing"}
          size={16}
          color={call.direction === "inbound" ? colors.accent : colors.primary}
        />
      </View>
      <View style={styles.callInfo}>
        <Text style={[styles.callNumber, { color: colors.foreground }]}>
          {call.direction === "inbound" ? call.caller : call.callee || call.caller}
        </Text>
        <View style={styles.callMeta}>
          <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
          <Text style={[styles.callState, { color: stateColor }]}>
            {call.state}
          </Text>
          <Text style={[styles.callDuration, { color: colors.mutedForeground }]}>
            {" · "}{formatDuration(call.duration)}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onHangup}
        style={[styles.hangupBtn, { backgroundColor: `${colors.destructive}22` }]}
      >
        <Feather name="phone-off" size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { status, activeCalls, connect, disconnect, hangupCall, totalCalls, successCalls, config } =
    useGateway();

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (status === "disconnected" || status === "error") {
      connect();
    } else {
      disconnect();
    }
  };

  const isConnected = status === "connected";
  const btnColor = isConnected ? colors.destructive : colors.primary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.appTitle, { color: colors.foreground }]}>
            GSM SIP Gateway
          </Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>
            {config.host}:{config.ariPort}
          </Text>
        </View>
        <StatusDot status={status} />
      </View>

      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.connectBtn,
          {
            backgroundColor: pressed ? `${btnColor}CC` : btnColor,
            opacity: status === "connecting" ? 0.6 : 1,
          },
        ]}
        disabled={status === "connecting"}
      >
        <Feather
          name={isConnected ? "wifi-off" : "wifi"}
          size={18}
          color={isConnected ? colors.destructiveForeground : colors.primaryForeground}
        />
        <Text
          style={[
            styles.connectBtnText,
            {
              color: isConnected
                ? colors.destructiveForeground
                : colors.primaryForeground,
            },
          ]}
        >
          {status === "connecting"
            ? "Connecting…"
            : isConnected
            ? "Disconnect"
            : "Connect to Asterisk"}
        </Text>
      </Pressable>

      <View style={styles.statsGrid}>
        <StatCard
          label="Active Calls"
          value={activeCalls.length}
          icon="phone-call"
          accent={activeCalls.length > 0 ? colors.primary : undefined}
        />
        <StatCard label="Total" value={totalCalls} icon="bar-chart-2" />
        <StatCard
          label="Answered"
          value={successCalls}
          icon="check-circle"
          accent={successCalls > 0 ? colors.primary : undefined}
        />
        <StatCard
          label="Extension"
          value={config.sipExtension || "—"}
          icon="user"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        ACTIVE CALLS
      </Text>

      {activeCalls.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="phone-off" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No active calls
          </Text>
        </View>
      ) : (
        activeCalls.map((call) => (
          <CallRow
            key={call.id}
            call={call}
            onHangup={() => hangupCall(call.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  appTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  appSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  connectBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    alignItems: "center",
  },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginTop: 4,
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  callIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  callInfo: { flex: 1, gap: 4 },
  callNumber: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  callMeta: { flexDirection: "row", alignItems: "center" },
  stateDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  callState: { fontSize: 12, fontFamily: "Inter_500Medium" },
  callDuration: { fontSize: 12, fontFamily: "Inter_400Regular" },
  hangupBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
