import { forwardRef } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import { fontFamilyForWeight } from "@/constants/theme";

function interStyle(style: TextStyle | TextStyle[] | undefined) {
  const flattened = StyleSheet.flatten(style) || {};
  const { fontFamily: _fontFamily, fontWeight, ...rest } = flattened;
  return [rest, { fontFamily: fontFamilyForWeight(fontWeight) }];
}

export const AppText = forwardRef<NativeText, TextProps>(function AppText(
  { style, ...props },
  ref
) {
  return <NativeText ref={ref} {...props} style={interStyle(style as TextStyle | TextStyle[] | undefined)} />;
});

export const AppTextInput = forwardRef<NativeTextInput, TextInputProps>(function AppTextInput(
  { style, ...props },
  ref
) {
  return <NativeTextInput ref={ref} {...props} style={interStyle(style as TextStyle | TextStyle[] | undefined)} />;
});
