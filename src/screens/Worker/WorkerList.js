import React, { useMemo } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import WorkerCard from "../../components/WorkerCard";
import { getWorkersByService } from "../../data/mockData";

export default function WorkerListScreen({ navigation, route }) {
  const { serviceId, serviceTitle, service } = route.params || {};

  const workers = useMemo(() => {
    const list = getWorkersByService(serviceId);
    return list.map((item) => ({
      ...item,
      price: item.hourlyRate ?? item.price ?? service?.ratePerHour ?? 0,
    }));
  }, [serviceId, service]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.header}>
        <View style={[styles.hero, { backgroundColor: service?.color ? `${service.color}12` : "#12352d" }]}>
          <View style={styles.heroAccent} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{serviceTitle || "Workers"}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Live availability</Text>
            </View>
          </View>

          <Text style={styles.title}>{serviceTitle || "Workers"}</Text>
          <Text style={styles.subtitle}>
            Trusted workers with fixed hourly pricing, clean profiles, and quick booking flow.
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>From ₹{service?.ratePerHour || 129}/hr</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Ratings included</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Fast response</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Available now</Text>
          <Text style={styles.sectionTitle}>Choose your worker</Text>
        </View>
      </View>

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            onPress={() => navigation.navigate("WorkerProfile", { worker: item })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No workers found</Text>
            <Text style={styles.emptyText}>Try another service or check your local mock data.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1e8",
    paddingHorizontal: 12,
  },
  header: {
    paddingTop: 12,
    marginBottom: 8,
  },
  bgOrbA: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  bgOrbB: {
    position: "absolute",
    top: 200,
    left: -70,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(14, 165, 233, 0.06)",
  },
  hero: {
    borderRadius: 28,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginBottom: 14,
  },
  heroAccent: {
    position: "absolute",
    right: -28,
    top: -28,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
  },
  heroPill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: {
    color: "#14532d",
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(15, 23, 42, 0.06)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  emptyText: {
    color: "#475569",
  },
});
