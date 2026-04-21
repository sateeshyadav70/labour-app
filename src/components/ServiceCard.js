import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import ServiceIllustration from "./ServiceIllustration";

export default function ServiceCard({
  title,
  description,
  color = "#1f2937",
  ratePerHour,
  badgeText,
  serviceId,
  imageUri,
  onPress,
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.tileShell}>
        {badgeText ? (
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : null}

        <View style={styles.tileArt}>
          <View style={[styles.artGlow, { backgroundColor: color }]} />
          <View style={styles.artPlate}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.serviceImage} resizeMode="cover" />
            ) : (
              <ServiceIllustration serviceId={serviceId} color={color} />
            )}
          </View>
          <View style={styles.baseLine} />
        </View>

      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.rateText}>From ₹{ratePerHour}/hr</Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 14,
    borderRadius: 26,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  tileShell: {
    height: 142,
    borderRadius: 26,
    backgroundColor: "#f7f5ef",
    borderWidth: 1,
    borderColor: "#ece7db",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  badgeWrap: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 3,
    backgroundColor: "#fb7185",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  tileArt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
  },
  artGlow: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 28,
    opacity: 0.12,
    top: 16,
    right: 16,
  },
  artPlate: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    overflow: "hidden",
  },
  serviceImage: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
  },
  baseLine: {
    position: "absolute",
    bottom: 9,
    width: 58,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  meta: {
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#0f172a",
    minHeight: 36,
  },
  rateText: {
    color: "#0f766e",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 3,
  },
  description: {
    marginTop: 6,
    color: "#64748b",
    lineHeight: 18,
    fontSize: 12,
  },
});
