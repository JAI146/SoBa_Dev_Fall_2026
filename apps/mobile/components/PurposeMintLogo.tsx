import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

type PurposeMintLogoProps = {
  size?: number;
  showName?: boolean;
  inverted?: boolean;
};

export function PurposeMintLogo({
  size = 52,
  showName: _showName = true,
  inverted = false,
}: PurposeMintLogoProps) {
  const logoWidth = size * 3.72;

  return (
    <View
      accessibilityLabel="PurposeMint"
      accessibilityRole="image"
      style={styles.lockup}
    >
      <Image
        contentFit="contain"
        source={require("../assets/images/purposemint-logo.png")}
        style={[
          styles.image,
          { height: size, opacity: inverted ? 0.96 : 1, width: logoWidth },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: "center",
    flexDirection: "row",
  },
  image: {
    maxWidth: "100%",
  },
});
