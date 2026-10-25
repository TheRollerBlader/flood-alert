import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NearAlertHost } from "@/components/near-alert";
import { CrossingsProvider } from "@/lib/crossings-context";

export default function RootLayout() {
  return (
    <CrossingsProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: "#0f5f66",
          headerStyle: { backgroundColor: "#f6f3ec" },
          headerTitleStyle: { color: "#142029" },
          contentStyle: { backgroundColor: "#e6eef0" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="crossing/[id]" options={{ title: "Crossing" }} />
      </Stack>
      <NearAlertHost />
    </CrossingsProvider>
  );
}
