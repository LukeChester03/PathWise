// components/AdvancedAnalysis/ScrollableContainer.tsx
import React, { ReactNode } from "react";
import { Animated, RefreshControl, StyleSheet } from "react-native";
import { Colors } from "../../../constants/colours";

type ScrollableContainerProps = {
  children: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  scrollY: Animated.Value;
};

const ScrollableContainer: React.FC<ScrollableContainerProps> = ({
  children,
  refreshing,
  onRefresh,
  scrollY,
}) => {
  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
      })}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {children}
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 30,
  },
});

export default ScrollableContainer;
