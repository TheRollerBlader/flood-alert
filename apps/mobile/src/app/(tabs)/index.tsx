import { STATUS_STYLES } from "@flood/engine";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { DemoBanner } from "@/components/demo-banner";
import { ModeBar } from "@/components/mode-bar";
import { useCrossings } from "@/lib/crossings-context";

export default function MapScreen() {
  const { crossings, mode, error, loading, locationNote } = useCrossings();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={styles.kicker}>Low water</Text>
      <Text style={styles.title}>Flood Alert</Text>
      <Text style={styles.subtitle}>Predicted depth, not a drone measurement</Text>
      <ModeBar />
      {mode === "demo" ? <DemoBanner /> : null}
      {error ? <Text style={styles.note}>{error}</Text> : null}
      {locationNote ? <Text style={styles.note}>{locationNote}</Text> : null}
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 33.21,
            longitude: -96.74,
            latitudeDelta: 0.28,
            longitudeDelta: 0.36,
          }}
        >
          {crossings.map((crossing) => (
            <Marker
              key={crossing.id}
              coordinate={{ latitude: crossing.latitude, longitude: crossing.longitude }}
              title={crossing.name}
              description={`${STATUS_STYLES[crossing.status].label}`}
              tracksViewChanges={false}
              onPress={() => router.push(`/crossing/${crossing.id}`)}
            >
              <View style={[styles.dot, { backgroundColor: STATUS_STYLES[crossing.status].fill }]} />
            </Marker>
          ))}
        </MapView>
        {loading && crossings.length === 0 ? <Text style={styles.mapNote}>Loading crossings…</Text> : null}
      </View>
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
  subtitle: {
    color: "#5c6b73",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  note: {
    color: "#5c6b73",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapNote: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    color: "#142029",
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
