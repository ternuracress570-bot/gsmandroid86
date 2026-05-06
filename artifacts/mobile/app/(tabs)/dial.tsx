import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGateway } from "@/context/GatewayContext";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

const KEY_SUB: Record<string, string> = {
  "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL",
  "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ",
  "0": "+", "*": "", "#": "",
};

export default function DialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { makeCall, status } = useGateway();
  const [number, setNumber] = useState("");
  const [calling, setCalling] = useState(false);

  const press = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNumber((prev) => prev + key);
  };

  const backspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNumber((prev) => prev.slice(0, -1));
  };

  const dial = async () => {
    if (!number) return;
    if (status !== "connected") {
      Alert.alert("Not Connected", "Please connect to Asterisk first");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCalling(true);
    try {
      await makeCall(number);
      setNumber("");
    } catch (e) {
      Alert.alert("Call Failed", String(e));
    } finally {
      setCalling(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.mutedForeground }]}>
        DIAL
      </Text>

      <View style={styles.display}>
        <Text
          style={[
            styles.numberText,
            {
              color: number ? colors.foreground : colors.mutedForeground,
              fontSize: number.length > 12 ? 28 : 38,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {number || "Enter number"}
        </Text>
        {number.length > 0 && (
          <Pressable onPress={backspace} style={styles.backBtn}>
            <Feather name="delete" size={22} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.grid}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key) => (
              <Pressable
                key={key}
                onPress={() => press(key)}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: pressed
                      ? colors.secondary
                      : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.keyNum, { color: colors.foreground }]}>
                  {key}
                </Text>
                {KEY_SUB[key] ? (
                  <Text style={[styles.keySub, { color: colors.mutedForeground }]}>
                    {KEY_SUB[key]}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Pressable
        onPress={dial}
        disabled={!number || calling}
        style={({ pressed }) => [
          styles.callBtn,
          {
            backgroundColor:
              !number || calling ? colors.muted : pressed ? "#00A843" : colors.primary,
            opacity: !number || calling ? 0.5 : 1,
          },
        ]}
      >
        <Feather
          name={calling ? "loader" : "phone"}
          size={28}
          color={colors.primaryForeground}
        />
      </Pressable>

      {status !== "connected" && (
        <Text style={[styles.warn, { color: colors.warning }]}>
          ⚠ Not connected to Asterisk
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  title: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  display: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  numberText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
  },
  backBtn: {
    padding: 8,
    position: "absolute",
    right: 0,
  },
  grid: { width: "100%", gap: 12, marginBottom: 28 },
  row: { flexDirection: "row", gap: 12, justifyContent: "center" },
  key: {
    width: 82,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  keyNum: { fontSize: 24, fontFamily: "Inter_400Regular" },
  keySub: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  callBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00C851",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  warn: {
    marginTop: 16,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
