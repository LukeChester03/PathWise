import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { globalStyles } from "../../constants/globalStyles";

interface ButtonProps {
  onPress: () => void;
  title: string;
  style?: object;
}

export const Button = ({ onPress, title, style }: ButtonProps) => (
  <TouchableOpacity onPress={onPress} style={[globalStyles.button, style]}>
    <Text style={globalStyles.buttonText}>{title}</Text>
  </TouchableOpacity>
);
