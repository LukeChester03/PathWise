import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../../constants/colours";
import { AnalysisRequestLimitInfo } from "../../../types/LearnScreen/TravelAnalysisTypes";

type RequestLimitsBadgeProps = {
  requestLimits: AnalysisRequestLimitInfo;
};

const RequestLimitsBadge: React.FC<RequestLimitsBadgeProps> = ({ requestLimits }) => {
  return (
    <View
      style={[
        styles.requestLimitBadge,
        requestLimits.requestsRemaining === 0 && styles.requestLimitBadgeWarning,
      ]}
    >
      <Ionicons
        name={requestLimits.requestsRemaining > 0 ? "refresh" : "time-outline"}
        size={14}
        color="#FFFFFF"
      />
      <Text style={styles.requestLimitText}>{requestLimits.requestsRemaining} left today</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  requestLimitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${NeutralColors.white}33`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  requestLimitBadgeWarning: {
    backgroundColor: `${Colors.warning}4D`,
  },
  requestLimitText: {
    fontSize: 12,
    fontWeight: "600",
    color: NeutralColors.white,
    marginLeft: 4,
  },
});

export default RequestLimitsBadge;
