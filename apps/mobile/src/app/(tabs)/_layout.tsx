import { NativeTabs } from "expo-router/native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs backgroundColor="#f6f3ec" indicatorColor="#e6eef0" labelStyle={{ selected: { color: "#142029" } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/images/tabIcons/home.png")} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="list">
        <NativeTabs.Trigger.Label>List</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/images/tabIcons/explore.png")} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
