import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function WorkerCard({ worker, onPress }) {
  const hourlyRate = worker.hourlyRate ?? worker.price ?? 0;
  const secondaryText =
    worker.distance != null && worker.time != null
      ? `${worker.distance.toFixed(1)} km away • ${Math.round(worker.time)} mins`
      : `${worker.experience} years experience`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topGlow} />
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{worker.name.slice(0, 1).toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{worker.name}</Text>
            <View style={styles.rating}>
              <Text style={styles.ratingText}>★ {worker.rating}</Text>
            </View>
          </View>
          <Text style={styles.meta}>{secondaryText}</Text>
          <Text style={styles.meta}>Fixed price: ₹{hourlyRate}/hr</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.92,
  },
  topGlow: {
    position: "absolute",
    top: -24,
    right: -20,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(22, 163, 74, 0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 62,
    height: 62,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "rgba(22, 163, 74, 0.12)",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#12352d",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginRight: 10,
  },
  meta: {
    color: "#64748b",
    marginBottom: 3,
    fontSize: 13,
  },
  rating: {
    backgroundColor: "#ecfeff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ratingText: {
    fontWeight: "800",
    color: "#0f766e",
    fontSize: 12,
  },
});
