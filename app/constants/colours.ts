export const Colors = {
  primary: "#d03f74",
  secondary: "#3185fc",
  background: "#fff",
  text: "#04030f",
  success: "#28a745",
  danger: "#dc3545",
  warning: "#ffc107",
  info: "#17a2b8",
  light: "#f8f9fa",
  dark: "#343a40",
};

export const NeutralColors = {
  white: "#ffffff",
  black: "#000000",
  gray100: "#f8f9fa",
  gray200: "#e9ecef",
  gray300: "#dee2e6",
  gray400: "#ced4da",
  gray500: "#adb5bd",
  gray600: "#6c757d",
  gray700: "#495057",
  gray800: "#343a40",
  gray900: "#212529",
};

export const AccentColors = {
  accent1: "#ff6f61",
  accent2: "#6b5b95",
  accent3: "#88d8b0",
  accent4: "#ffcc5c",
};

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

export const DefaultTheme = Themes.lightTheme;

export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? Themes.darkTheme : Themes.lightTheme;
};
