import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function WorkerProfileScreen({ navigation, route }) {
  const worker = route.params?.worker;
  const hourlyRate = worker.hourlyRate ?? worker.price ?? 0;

  if (!worker) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Worker not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTopRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium profile</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>★ {worker.rating}</Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{worker.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.title}>{worker.name}</Text>
            <Text style={styles.subtitle}>{worker.about}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, styles.statSpacing]}>
            <Text style={styles.statValue}>{worker.experience} yrs</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
          <View style={[styles.statBox, styles.statSpacing]}>
            <Text style={styles.statValue}>₹{hourlyRate}/hr</Text>
            <Text style={styles.statLabel}>Fixed rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>24/7</Text>
            <Text style={styles.statLabel}>Support</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Images</Text>
          <Text style={styles.sectionHint}>Recent work and on-site snapshots</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(worker.images || []).map((imageUrl) => (
            <View key={imageUrl} style={styles.imageCard}>
              <Image source={{ uri: imageUrl }} style={styles.image} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Previous work</Text>
          <Text style={styles.sectionHint}>What this worker handles best</Text>
        </View>
        <View style={styles.chipRow}>
          {(worker.previousWork || []).map((item) => (
            <View key={item} style={styles.chip}>
              <Text style={styles.chipText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Text style={styles.sectionHint}>What customers are saying</Text>
        </View>
        {(worker.reviews || []).map((item) => (
          <View key={item} style={styles.reviewCard}>
            <Text style={styles.reviewText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.ctaCard}>
        <View>
          <Text style={styles.ctaLabel}>Ready to book?</Text>
          <Text style={styles.ctaValue}>Fixed rate ₹{hourlyRate}/hr</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Booking", { worker })} style={styles.button}>
          <Text style={styles.buttonText}>Book Now</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1e8",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: "#12352d",
    borderRadius: 30,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  bgOrbA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    top: -50,
    right: -50,
  },
  bgOrbB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(14, 165, 233, 0.06)",
    top: 220,
    left: -50,
  },
  heroGlow: {
    position: "absolute",
    right: -18,
    top: -18,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    color: "#dcfce7",
    fontWeight: "800",
    fontSize: 12,
  },
  ratingBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ratingBadgeText: {
    color: "#14532d",
    fontWeight: "900",
    fontSize: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 72,
    height: 72,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#12352d",
    fontSize: 22,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statSpacing: {
    marginRight: 10,
  },
  statValue: {
    fontWeight: "900",
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionHead: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  sectionHint: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
  },
  imageCard: {
    width: 190,
    height: 132,
    borderRadius: 20,
    marginRight: 12,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#cbd5e1",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 12,
  },
  listItem: {
    color: "#334155",
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  reviewText: {
    color: "#334155",
  },
  ctaCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  ctaValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginLeft: 14,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
});
