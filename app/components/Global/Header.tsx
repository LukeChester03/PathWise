import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../constants/colours";

interface HeaderProps {
  title?: string;
  showLogo: boolean;
  subtitle: string;
  customStyles?: any;
  logoSource?: any;
  showIcon: boolean;
  iconName: string;
  iconColor: string;
  rightComponent?: any;
  showBackButton: boolean;
  onBackPress: () => void;
  onHelpPress: () => void;
  showHelp: boolean;
}
const Header = ({
  title,
  showLogo = false,
  subtitle = "",
  customStyles = {},
  logoSource = require("../../assets/logo.png"),
  showIcon = false,
  iconName = "",
  iconColor = Colors.primary,
  rightComponent = null,
  showBackButton = false,
  onBackPress = () => {},
  onHelpPress = () => {},
  showHelp = true,
}: HeaderProps) => {
  const insets = useSafeAreaInsets();

  // Ensure the header is positioned correctly
  const headerPaddingTop = insets.top + 10; // Add safe area inset + some extra padding
  const headerPaddingBottom = 16;

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom },
        customStyles,
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            {showBackButton && (
              <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
                <View style={styles.iconCircle}>
                  <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.titleGroup}>
              <View style={styles.titleRow}>
                {showIcon && (
                  <View style={styles.titleIconContainer}>
                    <Ionicons
                      name={iconName}
                      size={22}
                      color={iconColor}
                      style={styles.headerIcon}
                    />
                  </View>
                )}
                <Text style={styles.title}>{title}</Text>
              </View>

              {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.rightSection}>
            {rightComponent && <View style={styles.rightComponentContainer}>{rightComponent}</View>}

            {/* {showLogo && (
              <View style={styles.logoContainer}>
                <Image source={logoSource} style={styles.logo} />
              </View>
            )} */}

            {showHelp && (
              <TouchableOpacity style={styles.helpButton} onPress={onHelpPress} activeOpacity={0.7}>
                <View style={styles.helpIconCircle}>
                  <Ionicons name="help" size={16} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  safeArea: {
    width: "100%",
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    marginRight: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleGroup: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIconContainer: {
    marginRight: 8,
    paddingTop: 2,
  },
  headerIcon: {
    marginRight: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    letterSpacing: -0.3,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightComponentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  helpButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  helpIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Header;
