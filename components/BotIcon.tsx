import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  size?: number;
  color?: string;
};

/**
 * Pixel-perfect Lucide Bot Icon recreated with React Native Views.
 * Matches:
 * <path d="M12 8V4H8"/>
 * <rect width="16" height="12" x="4" y="8" rx="2"/>
 * <path d="M2 14h2"/>
 * <path d="M20 14h2"/>
 * <path d="M15 13v2"/>
 * <path d="M9 13v2"/>
 */
export default function BotIcon({ size = 22, color = "#34D399" }: Props) {
  const scale = size / 24;
  const strokeWidth = Math.max(1.6, 2 * scale);

  return (
    <View style={[styles.canvas, { width: size, height: size }]}>
      {/* Antenna */}
      <View
        style={[
          styles.antennaHook,
          {
            left: 8 * scale,
            top: 4 * scale,
            width: 4 * scale,
            height: strokeWidth,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.antennaStem,
          {
            left: 11 * scale,
            top: 4 * scale,
            width: strokeWidth,
            height: 4.5 * scale,
            backgroundColor: color,
          },
        ]}
      />

      {/* Ear Pins */}
      <View
        style={[
          styles.earPin,
          {
            left: 1.5 * scale,
            top: 13.5 * scale,
            width: 2.8 * scale,
            height: strokeWidth,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.earPin,
          {
            right: 1.5 * scale,
            top: 13.5 * scale,
            width: 2.8 * scale,
            height: strokeWidth,
            backgroundColor: color,
          },
        ]}
      />

      {/* Head Box */}
      <View
        style={[
          styles.headBox,
          {
            left: 4 * scale,
            top: 8 * scale,
            width: 16 * scale,
            height: 12 * scale,
            borderRadius: 3.5 * scale,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      >
        {/* Left Eye */}
        <View
          style={[
            styles.eye,
            {
              left: 3.2 * scale,
              top: 2.8 * scale,
              width: strokeWidth,
              height: 3.2 * scale,
              backgroundColor: color,
              borderRadius: strokeWidth / 2,
            },
          ]}
        />
        {/* Right Eye */}
        <View
          style={[
            styles.eye,
            {
              right: 3.2 * scale,
              top: 2.8 * scale,
              width: strokeWidth,
              height: 3.2 * scale,
              backgroundColor: color,
              borderRadius: strokeWidth / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: "relative",
  },
  antennaHook: {
    position: "absolute",
    borderTopLeftRadius: 1,
    borderBottomLeftRadius: 1,
  },
  antennaStem: {
    position: "absolute",
  },
  earPin: {
    position: "absolute",
    borderRadius: 1,
  },
  headBox: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  eye: {
    position: "absolute",
  },
});
