import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGateway, type GatewayConfig } from "@/context/GatewayContext";

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad" | "url";
  hint?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            borderColor: colors.border,
            color: colors.foreground,
            fontFamily: "Inter_400Regular",
          },
        ]}
      />
      {hint && (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  hint,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  hint?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.toggleWrap}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        {hint && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {hint}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, updateConfig, connect, disconnect, status } = useGateway();

  const [local, setLocal] = useState<GatewayConfig>(config);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocal(config);
  }, [config]);

  const update = (key: keyof GatewayConfig, value: string | boolean) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateConfig(local);
    setDirty(false);
    if (status === "connected") {
      disconnect();
      setTimeout(() => connect(), 500);
    }
    Alert.alert("Saved", "Configuration saved successfully");
  };

  const testConn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (status === "connected") disconnect();
    setTimeout(() => connect(), 300);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>
        Configuration
      </Text>
      <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
        Asterisk ARI Gateway Settings
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SectionHeader title="ASTERISK SERVER" />
        <Field
          label="Host / IP"
          value={local.host}
          onChangeText={(t) => update("host", t)}
          placeholder="103.82.193.58"
          hint="VPS IP or hostname"
        />
        <Field
          label="ARI Port"
          value={local.ariPort}
          onChangeText={(t) => update("ariPort", t)}
          placeholder="8088"
          keyboardType="numeric"
          hint="Default: 8088 (HTTP) or 8089 (HTTPS)"
        />
        <Field
          label="ARI Username"
          value={local.ariUser}
          onChangeText={(t) => update("ariUser", t)}
          placeholder="asterisk"
        />
        <Field
          label="ARI Password"
          value={local.ariPassword}
          onChangeText={(t) => update("ariPassword", t)}
          placeholder="password"
          secureTextEntry
        />
        <Field
          label="Application Name"
          value={local.appName}
          onChangeText={(t) => update("appName", t)}
          placeholder="gsm-gateway"
          hint="Stasis app name defined in Asterisk dialplan"
        />
        <ToggleRow
          label="Use WSS / HTTPS"
          value={local.useWss}
          onToggle={(v) => update("useWss", v)}
          hint="Enable for TLS encrypted connections"
        />
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SectionHeader title="SIP EXTENSION" />
        <Field
          label="Extension"
          value={local.sipExtension}
          onChangeText={(t) => update("sipExtension", t)}
          placeholder="100"
          keyboardType="phone-pad"
          hint="Your SIP extension registered on Asterisk"
        />
        <Field
          label="SIP Password"
          value={local.sipPassword}
          onChangeText={(t) => update("sipPassword", t)}
          placeholder="secret"
          secureTextEntry
        />
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SectionHeader title="ASTERISK SETUP GUIDE" />
        {[
          "1. Enable ARI in /etc/asterisk/ari.conf",
          "2. Add app: gsm-gateway in ari.conf",
          "3. Configure PJSIP endpoint for this device",
          "4. Create Stasis() dialplan entry",
          "5. Open port 8088 on VPS firewall",
        ].map((step, i) => (
          <View key={i} style={styles.guideRow}>
            <Feather name="check" size={13} color={colors.primary} />
            <Text style={[styles.guideText, { color: colors.mutedForeground }]}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={testConn}
          style={[
            styles.btn,
            styles.btnSecondary,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Feather name="wifi" size={16} color={colors.foreground} />
          <Text style={[styles.btnText, { color: colors.foreground }]}>
            Test Connection
          </Text>
        </Pressable>

        <Pressable
          onPress={save}
          style={[
            styles.btn,
            styles.btnPrimary,
            {
              backgroundColor: dirty ? colors.primary : colors.muted,
              opacity: dirty ? 1 : 0.6,
            },
          ]}
          disabled={!dirty}
        >
          <Feather name="save" size={16} color={dirty ? colors.primaryForeground : colors.mutedForeground} />
          <Text
            style={[
              styles.btnText,
              {
                color: dirty ? colors.primaryForeground : colors.mutedForeground,
              },
            ]}
          >
            Save Changes
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  pageSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guideRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  guideText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnPrimary: {},
  btnSecondary: { borderWidth: 1 },
  btnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
