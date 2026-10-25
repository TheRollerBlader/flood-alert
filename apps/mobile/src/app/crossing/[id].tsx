import { formatDepth, formatNumber, STATUS_STYLES } from "@flood/engine";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DemoBanner } from "@/components/demo-banner";
import { useCrossings } from "@/lib/crossings-context";

export default function CrossingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { crossings, mode, loading } = useCrossings();
  const crossing = crossings.find((item) => item.id === id);

  return (
    <>
      <Stack.Screen options={{ title: crossing?.name ?? "Crossing" }} />
      {mode === "demo" ? <DemoBanner /> : null}
      {!crossing ? (
        <View style={styles.empty}>
          <Text style={styles.body}>{loading ? "Loading this crossing…" : "That crossing is not in the catalog."}</Text>
        </View>
      ) : (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text style={styles.city}>{crossing.city}</Text>
          <Text style={styles.name}>{crossing.name}</Text>
          <Text style={styles.meta}>
            {crossing.road}
            {crossing.placeDetail ? ` · ${crossing.placeDetail}` : ""} · {crossing.lwxType}
          </Text>
          <View style={[styles.depthBlock, { backgroundColor: STATUS_STYLES[crossing.status].fill }]}>
            <Text style={styles.depthLabel}>{STATUS_STYLES[crossing.status].label}</Text>
            <Text style={styles.depth}>{formatDepth(crossing.depthFt).feet}</Text>
            <Text style={styles.inches}>{formatDepth(crossing.depthFt).inches}</Text>
          </View>
          <Text style={styles.body}>{crossing.vehicleNote}</Text>
          <Text style={styles.body}>Discharge {formatNumber(crossing.dischargeCfs, 1)} cfs</Text>
          <Text style={styles.body}>
            {crossing.rainfallLabel}: {formatNumber(crossing.rainfallInches, 2)} in
          </Text>
          <Text style={styles.body}>{crossing.gaugeNote}</Text>
          {crossing.rainfallNote ? <Text style={styles.muted}>{crossing.rainfallNote}</Text> : null}
          <Text style={styles.muted}>{crossing.disclaimer}</Text>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f3ec",
  },
  content: {
    paddingBottom: 32,
  },
  empty: {
    flex: 1,
    backgroundColor: "#f6f3ec",
    padding: 16,
  },
  city: {
    color: "#5c6b73",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  name: {
    color: "#142029",
    fontSize: 32,
    fontWeight: "700",
    paddingHorizontal: 16,
  },
  meta: {
    color: "#5c6b73",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  depthBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  depthLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  depth: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: "700",
  },
  inches: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
  },
  body: {
    color: "#142029",
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  muted: {
    color: "#5c6b73",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
