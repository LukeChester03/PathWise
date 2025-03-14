// components/TruncatedText.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";

interface TruncatedTextProps {
  text: string;
  maxChars: number;
  style?: object;
  viewMoreLabel?: string;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxChars,
  style,
  viewMoreLabel = "View More",
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isTruncated = text.length > maxChars;
  const displayText = !expanded && isTruncated ? text.substring(0, maxChars) + "..." : text;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  return (
    <View>
      <Text style={style}>{displayText}</Text>
      {isTruncated && (
        <TouchableOpacity onPress={toggleExpanded} style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>{expanded ? "Show Less" : viewMoreLabel}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 4,
  },
  viewMoreText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    marginRight: 4,
  },
});

export default TruncatedText;
