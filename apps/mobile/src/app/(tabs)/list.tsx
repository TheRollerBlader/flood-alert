import { compareBySeverity, formatDepth, STATUS_STYLES } from "@flood/engine";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DemoBanner } from "@/components/demo-banner";
import { ModeBar } from "@/components/mode-bar";
import { useCrossings } from "@/lib/crossings-context";

export default function ListScreen() {
  const { crossings, mode, error, loading, locationNote } = useCrossings();
  const ordered = [...crossings].sort(compareBySeverity);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={styles.kicker}>Low water</Text>
      <Text style={styles.title}>Crossings</Text>
      <ModeBar />
      {mode === "demo" ? <DemoBanner /> : null}
      {error ? <Text style={styles.note}>{error}</Text> : null}
      {locationNote ? <Text style={styles.note}>{locationNote}</Text> : null}
      <FlatList
        data={ordered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={ordered.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          <Text style={styles.note}>{loading ? "Loading crossings…" : "No crossings loaded."}</Text>
        }
        renderItem={({ item }) => {
          const style = STATUS_STYLES[item.status];
          const depth = formatDepth(item.depthFt);
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/crossing/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={[styles.bar, { backgroundColor: style.fill }]} />
              <View style={styles.copy}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.city} · {item.creek}
                </Text>
              </View>
              <View>
                <Text style={[styles.depth, { color: style.ink }]}>{depth.feet}</Text>
                <Text style={[styles.status, { color: style.ink }]}>{style.label}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f3ec",
  },
  kicker: {
    color: "#0f5f66",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  title: {
    color: "#142029",
    fontSize: 34,
    fontWeight: "700",
    paddingHorizontal: 14,
  },
  note: {
    color: "#5c6b73",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  emptyWrap: {
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#d5ddd8",
  },
  bar: {
    width: 6,
    alignSelf: "stretch",
    borderRadius: 999,
  },
  copy: {
    flex: 1,
  },
  name: {
    color: "#142029",
    fontWeight: "700",
    fontSize: 16,
  },
  meta: {
    color: "#5c6b73",
    marginTop: 2,
  },
  depth: {
    fontWeight: "700",
    fontSize: 16,
    textAlign: "right",
  },
  status: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "right",
    marginTop: 2,
  },
});
