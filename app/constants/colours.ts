// app/utils/colours.ts

// Define primary colors
export const Colors = {
  primary: "#d03f74",
  secondary: "#3185fc",
  background: "#fff", // Background color
  text: "#04030f", // Text color
  success: "#28a745", // Success color (green)
  danger: "#dc3545", // Danger color (red)
  warning: "#ffc107", // Warning color (yellow)
  info: "#17a2b8", // Info color (teal)
  light: "#f8f9fa", // Light background color
  dark: "#343a40", // Dark text or background color
};

// Define neutral shades for backgrounds, borders, and text
export const NeutralColors = {
  white: "#ffffff", // Pure white
  black: "#000000", // Pure black
  gray100: "#f8f9fa", // Very light gray
  gray200: "#e9ecef", // Light gray
  gray300: "#dee2e6", // Medium light gray
  gray400: "#ced4da", // Medium gray
  gray500: "#adb5bd", // Medium dark gray
  gray600: "#6c757d", // Dark gray
  gray700: "#495057", // Very dark gray
  gray800: "#343a40", // Almost black
  gray900: "#212529", // Pure dark
};

// Define accent colors for highlights and interactive elements
export const AccentColors = {
  accent1: "#ff6f61", // Warm accent (coral)
  accent2: "#6b5b95", // Cool accent (purple)
  accent3: "#88d8b0", // Soft accent (mint green)
  accent4: "#ffcc5c", // Bright accent (mustard yellow)
};

// Define theme-specific colors
export const Themes = {
  lightTheme: {
    background: Colors.light,
    text: Colors.dark,
    primary: Colors.primary,
    secondary: Colors.secondary,
    accent: AccentColors.accent1,
    border: NeutralColors.gray300,
  },
  darkTheme: {
    background: Colors.dark,
    text: Colors.light,
    primary: Colors.info,
    secondary: Colors.warning,
    accent: AccentColors.accent2,
    border: NeutralColors.gray700,
  },
};

// Default theme (can be overridden based on user preferences)
export const DefaultTheme = Themes.lightTheme;

// Helper function to dynamically switch themes
export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? Themes.darkTheme : Themes.lightTheme;
};
