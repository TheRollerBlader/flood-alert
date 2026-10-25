import { StyleSheet, Text, View } from "react-native";

export function DemoBanner() {
  return (
    <View style={styles.banner} accessibilityRole="summary">
      <Text style={styles.pill}>DEMO</Text>
      <Text style={styles.copy}>
        Demo storm — not a live warning. Depths are scripted so every hazard level is visible.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#16324f",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pill: {
    backgroundColor: "#f4f1ea",
    color: "#16324f",
    fontWeight: "700",
    letterSpacing: 1.4,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  copy: {
    flex: 1,
    color: "#f4f1ea",
    fontSize: 13,
    lineHeight: 18,
  },
});
