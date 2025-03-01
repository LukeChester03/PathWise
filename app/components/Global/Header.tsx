import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, NeutralColors } from "../../constants/colours";

const Header = ({
  title,
  showLogo = false,
  subtitle = "",
  customStyles = {},
  logoSource = require("../../assets/logo.png"),
}) => {
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
          <Text style={styles.title}>{title}</Text>
          {showLogo && (
            <View style={styles.subtitle}>
              <Image source={logoSource} style={styles.logo} />
              {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginLeft: 6,
  },
});

export default Header;
