import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { buildAvatarUrl, getInitials } from "../utils/profileImage";

export default function ProfileAvatar({
  name,
  imageUri,
  size = 56,
  borderRadius = 18,
  backgroundColor = "#12352d",
  textColor = "#ffffff",
  fallbackColor = "#ffffff",
  showRing = true,
  ringColor = "rgba(255,255,255,0.14)",
  style,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedUri = useMemo(
    () => imageUri || buildAvatarUrl(name),
    [imageUri, name]
  );
  const initials = getInitials(name);
  const cornerRadius = borderRadius || Math.round(size * 0.3);

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: cornerRadius + 6,
          backgroundColor: ringColor,
        },
        showRing ? null : styles.noRing,
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: size - 8,
            height: size - 8,
            borderRadius: cornerRadius,
            backgroundColor,
          },
        ]}
      >
        {!imageFailed ? (
          <Image
            source={{ uri: resolvedUri }}
            style={[styles.image, { borderRadius: cornerRadius }]}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={[styles.fallback, { color: fallbackColor }]}>{initials}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
  },
  noRing: {
    backgroundColor: "transparent",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
