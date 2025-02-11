// app/components/CurvedDivider.tsx
import React from "react";
import { Svg, Path } from "react-native-svg";

export default function CurvedDivider({ color }: { color: string }) {
  return (
    <Svg
      height="100" // Height of the curve
      width="100%" // Full width of the screen
      viewBox="0 0 1440 320" // Viewbox for scaling
      style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
    >
      <Path
        fill={color}
        d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,192C672,203,768,181,864,170.7C960,160,1056,160,1152,165.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
      />
    </Svg>
  );
}
