// components/AdvancedAnalysis/TabContainer.tsx
import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

type TabContainerProps = {
  children: ReactNode;
};

const TabContainer: React.FC<TabContainerProps> = ({ children }) => {
  return <View style={styles.tabContent}>{children}</View>;
};

const styles = StyleSheet.create({
  tabContent: {
    padding: 16,
  },
});

export default TabContainer;
