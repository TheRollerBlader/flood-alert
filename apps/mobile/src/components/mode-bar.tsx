import type { Mode } from "@flood/engine";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCrossings } from "@/lib/crossings-context";

export function ModeBar() {
  const { mode, setMode, locate, locating } = useCrossings();
  return (
    <View style={styles.row}>
      <View style={styles.toggle} accessibilityRole="tablist">
        <ModeButton label="Live" active={mode === "live"} onPress={() => setMode("live")} />
        <ModeButton label="Demo storm" active={mode === "demo"} onPress={() => setMode("demo")} />
      </View>
      <Pressable style={styles.locate} onPress={() => void locate()} accessibilityRole="button">
        <Text style={styles.locateText}>{locating ? "Finding you…" : "Use my location"}</Text>
      </Pressable>
    </View>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.mode, active && styles.modeActive]}
    >
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d5ddd8",
    padding: 3,
  },
  mode: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  modeActive: {
    backgroundColor: "#142029",
  },
  modeText: {
    color: "#142029",
    fontWeight: "600",
    fontSize: 14,
  },
  modeTextActive: {
    color: "#ffffff",
  },
  locate: {
    backgroundColor: "#0f5f66",
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 10,
  },
  locateText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
