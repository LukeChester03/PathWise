import { useWindowDimensions } from "react-native";

export const useDynamicStyles = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenWidth < 375;

  return {
    heroHeight: screenHeight < 700 ? 220 : 260,
    contentMarginTop: screenHeight < 700 ? 180 : 220,
    fontSize: {
      title: isSmallScreen ? 22 : 24,
      body: isSmallScreen ? 14 : 15,
      small: isSmallScreen ? 12 : 13,
      smaller: isSmallScreen ? 11 : 12,
    },
    iconSize: {
      header: isSmallScreen ? 20 : 22,
      normal: isSmallScreen ? 16 : 18,
      small: isSmallScreen ? 14 : 16,
      smaller: isSmallScreen ? 12 : 14,
    },
    spacing: {
      cardMargin: isSmallScreen ? 10 : 18,
      cardPadding: isSmallScreen ? 12 : 14,
      contentPadding: isSmallScreen ? 14 : 16,
    },
    isSmallScreen,
  };
};
