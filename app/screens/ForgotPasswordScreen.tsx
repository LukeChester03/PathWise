import React from "react";
import { View, Text } from "react-native";
import { Colors } from "../constants/colours";
import { Button } from "@react-navigation/elements";

export default function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  return (
    <View>
      <Button onPress={() => navigation.navigate("Login")}>ForgotPasswordScreen</Button>
    </View>
  );
}
