import {
  compareBySeverity,
  formatDepth,
  haversineMiles,
  isAlertStatus,
  NEAR_MILES,
  STATUS_STYLES,
} from "@flood/engine";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DemoBanner } from "@/components/demo-banner";
import { useCrossings } from "@/lib/crossings-context";

export function NearAlertHost() {
  const { crossings, place, dismissedId, dismiss, mode } = useCrossings();
  const threat = useMemo(() => {
    if (!place) return null;
    const nearby = crossings
      .filter((crossing) => isAlertStatus(crossing.status))
      .map((crossing) => ({ crossing, miles: haversineMiles(place, crossing) }))
      .filter((item) => item.miles <= NEAR_MILES)
      .sort((a, b) => compareBySeverity(a.crossing, b.crossing) || a.miles - b.miles);
    return nearby[0] ?? null;
  }, [crossings, place]);

  if (!threat || threat.crossing.id === dismissedId) return null;
  const style = STATUS_STYLES[threat.crossing.status];
  const depth = formatDepth(threat.crossing.depthFt);

  return (
    <View style={styles.overlay} accessibilityViewIsModal accessibilityRole="alert">
      {mode === "demo" ? <DemoBanner /> : null}
      <View style={[styles.body, { backgroundColor: style.ink }]}>
        <Text style={styles.kicker}>Within 1 mile</Text>
        <View>
          <Text style={styles.title}>Do not enter</Text>
          <Text style={styles.name}>{threat.crossing.name}</Text>
          <Text style={styles.meta}>
            {style.label} · {depth.feet} ({depth.inches}) · {threat.miles.toFixed(2)} mi away
          </Text>
          <Text style={styles.note}>{threat.crossing.vehicleNote}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => dismiss(threat.crossing.id)} accessibilityRole="button">
          <Text style={styles.buttonText}>I am not crossing here</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  body: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingBottom: 36,
  },
  kicker: {
    color: "#ffffff",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 52,
    fontWeight: "700",
    letterSpacing: -1,
  },
  name: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
  },
  meta: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    marginTop: 6,
  },
  note: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    lineHeight: 22,
    marginTop: 14,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#142029",
    fontWeight: "700",
    fontSize: 16,
  },
});
