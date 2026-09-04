import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { FEATURE_ICON_BOX, FeatureIconToken } from "../../constants/featureIcons";

type Props = {
  token: FeatureIconToken;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export default function FeatureIconBox({ token, size = FEATURE_ICON_BOX.iconSize, style, accessibilityLabel }: Props) {
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[style, styles.box, { backgroundColor: token.bg }]}
    >
      <Ionicons name={token.icon} size={size} color={token.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: FEATURE_ICON_BOX.width,
    height: FEATURE_ICON_BOX.height,
    borderRadius: FEATURE_ICON_BOX.borderRadius,
    alignItems: "center",
    justifyContent: "center",
  },
});
