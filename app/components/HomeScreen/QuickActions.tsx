import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");

interface QuickActionsProps {
  navigateToScreen: (screenName: string, params?: any) => void;
}

interface ActionItem {
  id: string;
  name: string;
  icon: string;
  iconType: "ionicons" | "material";
  color: string;
  screen: string;
  params?: any;
}

const QuickActions: React.FC<QuickActionsProps> = ({ navigateToScreen }) => {
  const containerAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(
    Array(6)
      .fill(0)
      .map(() => new Animated.Value(0))
  ).current;

  const quickActionItems: ActionItem[] = [
    {
      id: "profile",
      name: "Profile",
      icon: "person-outline",
      iconType: "ionicons",
      color: "#FF9500",
      screen: "Profile",
    },
    {
      id: "achievements",
      name: "Achievements",
      icon: "trophy-outline",
      iconType: "ionicons",
      color: "#4CAF50",
      screen: "Profile", 
      params: { tab: "achievements" }, 
    },
    {
      id: "phrasebook",
      name: "Phrasebook",
      icon: "book-alphabet",
      iconType: "material",
      color: "#2196F3",
      screen: "Phrasebook", 
      params: { visitedPlaces: [] }, 
    {
      id: "nearbyPlaces",
      name: "Nearby Places",
      icon: "location-outline",
      iconType: "ionicons",
      color: "#9C27B0",
      screen: "ViewAll",
      params: { viewType: "nearbyPlaces" }, 
    },
    {
      id: "culturalContext",
      name: "Discover",
      icon: "earth",
      iconType: "ionicons",
      color: "#FF5722",
      screen: "Discover",
    },
    {
      id: "quizScreen",
      name: "Knowledge Quest",
      icon: "school-outline",
      iconType: "ionicons",
      color: "#607D8B",
      screen: "KnowledgeQuestScreen",
    },
  ];

  useEffect(() => {
    Animated.timing(containerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    Animated.stagger(
      50,
      itemAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  // render each quick action item
  const renderQuickActionItem = (item: ActionItem, index: number) => {
    const renderIcon = () => {
      if (item.iconType === "ionicons") {
        return <Ionicons name={item.icon} size={24} color="#fff" />;
      } else {
        return <MaterialCommunityIcons name={item.icon} size={24} color="#fff" />;
      }
    };

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.itemContainer,
          {
            opacity: itemAnims[index],
            transform: [
              {
                scale: itemAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
              {
                translateY: itemAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={() => navigateToScreen(item.screen, item.params)}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
            {renderIcon()}
          </View>
          <Text style={styles.actionText}>{item.name}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerAnim,
          transform: [
            {
              translateY: containerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="grid-outline" size={22} color={Colors.primary} />
        <Text style={styles.headerTitle}>Quick Actions</Text>
      </View>

      <View style={styles.actionsGrid}>
        {quickActionItems.map((item, index) => renderQuickActionItem(item, index))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8, 
    marginTop: 4, 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12, 
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -4,
  },
  itemContainer: {
    width: "33%",
    paddingHorizontal: 4,
    marginBottom: 14, 
  },
  actionButton: {
    alignItems: "center",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6, 
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555",
    textAlign: "center",
  },
});

export default QuickActions;
