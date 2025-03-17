import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";

interface MapErrorFallbackProps {
  error?: Error | null;
  onRetry: () => void;
}

const MapErrorFallback: React.FC<MapErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={80} color={Colors.primary} style={styles.icon} />
      <Text style={styles.title}>Oh no! We ran into a problem</Text>
      <Text style={styles.subtitle}>
        {error?.message || "We couldn't load the map right now. Please try again."}
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f8f8",
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MapErrorFallback;
