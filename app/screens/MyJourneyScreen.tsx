// screens/MyJourneyScreen.tsx
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatItem } from "../types/StatTypes";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../constants/colours";

type MyJourneyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MyJourneyScreenRouteProp = RouteProp<RootStackParamList, "MyJourney">;

const { width } = Dimensions.get("window");
const GRID_SPACING = 12;
const GRID_ITEM_WIDTH = (width - 48) / 2; // 2 columns with margins

const MyJourneyScreen = () => {
  const navigation = useNavigation<MyJourneyScreenNavigationProp>();
  const route = useRoute<MyJourneyScreenRouteProp>();
  const stats: StatItem[] = route.params?.stats || [];

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gridAnims = useRef<Animated.Value[]>(
    Array(stats.length)
      .fill(0)
      .map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Start fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Animate grid items with staggered entrance
    const animations = gridAnims.map((anim, index) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 100 + index * 50,
        useNativeDriver: true,
      });
    });

    Animated.stagger(50, animations).start();
  }, []);

  // Navigate back to previous screen
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Function to render a stat card in the grid
  const renderStatCard = (item: StatItem, index: number) => {
    return (
      <Animated.View
        key={item.id}
        style={[
          styles.gridItem,
          {
            opacity: gridAnims[index],
            transform: [
              {
                scale: gridAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
              {
                translateY: gridAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[item.gradientColors[0], item.gradientColors[1]]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon} size={24} color="#fff" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render the journey summary stats
  const renderJourneySummary = () => {
    // Find the specific stats we want to highlight
    const totalPlaces = stats.find((s) => s.label === "Places Discovered")?.value || 0;
    const totalCountries = stats.find((s) => s.label === "Countries Visited")?.value || 0;
    const explorerLevel = stats.find((s) => s.label.includes("Level"))?.value || "Level 1";

    return (
      <Animated.View
        style={[
          styles.journeySummary,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.summaryLabel}>Journey Summary</Text>
        <Text style={styles.summaryText}>
          You've discovered <Text style={styles.highlightText}>{totalPlaces}</Text> places across{" "}
          <Text style={styles.highlightText}>{totalCountries}</Text> countries, earning you the rank
          of <Text style={styles.highlightText}>{explorerLevel}</Text>.
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Journey</Text>
        <View style={styles.headerRight} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Journey Summary */}
        {renderJourneySummary()}

        {/* Stats Grid */}
        <View style={styles.gridContainer}>
          {stats.map((item, index) => renderStatCard(item, index))}
        </View>

        {/* Future Journey */}
        <Animated.View
          style={[
            styles.futureJourney,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.futureTitle}>Future Explorations</Text>
          <Text style={styles.futureText}>
            Continue exploring to unlock more achievements and reach higher explorer levels.
          </Text>

          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate("Explore")}
          >
            <LinearGradient
              colors={["#4a6aff", "#2948ff"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Find New Places</Text>
              <Ionicons name="compass" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  journeySummary: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
  },
  highlightText: {
    color: Colors.primary,
    fontWeight: "bold",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    height: 130,
    marginBottom: GRID_SPACING,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    flex: 1,
    padding: 16,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statInfo: {
    flex: 1,
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    opacity: 0.9,
  },
  futureJourney: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  futureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  futureText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
    marginBottom: 16,
  },
  exploreButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});

export default MyJourneyScreen;
