import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type DecorativeBlobProps = {
  style?: StyleProp<ViewStyle>;
};

export function DecorativeBlob({ style }: DecorativeBlobProps) {
  return <View pointerEvents="none" style={[styles.blob, style]} />;
}

const styles = StyleSheet.create({
  blob: {
    borderRadius: 999,
    position: 'absolute',
  },
});
