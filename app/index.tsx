// app/index.tsx
import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import Layout from "./_layout";
import { NavigationContainer } from "@react-navigation/native";

export default function Index() {
  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <Layout />
      </SafeAreaView>
    </NavigationContainer>
  );
}
