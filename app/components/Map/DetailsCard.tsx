import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
} from "react-native";
import { Colors } from "../../constants/colours";

interface DetailsCardProps {
  placeName: string;
  travelTime: string;
  distance: string;
  onSwipeOff: () => void;
  onArrowPress: () => void;
}

const DetailsCard: React.FC<DetailsCardProps> = ({
  placeName,
  travelTime,
  distance,
  onSwipeOff,
  onArrowPress,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx < -100) {
          // Swipe left to dismiss
          Animated.timing(pan, {
            toValue: { x: -500, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onSwipeOff();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.cardContainer, { transform: [{ translateX: pan.x }] }]}
      {...panResponder.panHandlers}
    >
      <Image source={require("../../assets/walking.gif")} style={styles.gif} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Travelling to {placeName}</Text>
        <Text style={styles.info}>Time left: {travelTime}</Text>
        <Text style={styles.info}>Distance: {distance}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    width: "60%",
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 6,
    alignItems: "center",
  },
  gif: {
    width: 50,
    height: 50,
    marginRight: 16,
    alignContent: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: Colors.primary,
  },
  info: {
    fontSize: 14,
    marginBottom: 6,
    color: Colors.text,
  },
});

export default DetailsCard;
