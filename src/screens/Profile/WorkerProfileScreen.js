import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiGet, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";

const listSkills = (skills = []) => (Array.isArray(skills) ? skills.filter(Boolean) : []);

export default function WorkerProfileScreen({ onLogout }) {
  const { authToken, currentUser } = useAuth();
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await apiGet("/worker/profile", { token: authToken });
        const payload = unwrapApiResponse(response) || response;
        if (mounted) {
          setWorker(payload?.worker || payload || null);
        }
      } catch (error) {
        if (mounted) {
          Alert.alert("Profile error", getApiErrorMessage(error, "Unable to load worker profile."));
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [authToken]);

  const profile = worker || currentUser || {};
  const skills = listSkills(profile.skills);
  const ratingText =
    profile.rating || profile.numReviews
      ? `${profile.rating || "—"} (${profile.numReviews || 0})`
      : "—";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Fixora Worker</Text>
        <Text style={styles.title}>{profile.name || "Worker profile"}</Text>
        <Text style={styles.subtitle}>{profile.email || "Your worker account details"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{profile.phone || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Rating</Text>
          <Text style={styles.value}>{ratingText}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{profile.isOnline ? "Online" : "Offline"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Availability</Text>
          <Text style={styles.value}>{profile.isAvailable ? "Available" : "Busy"}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Skills</Text>
        <View style={styles.chipRow}>
          {skills.length ? (
            skills.map((skill) => (
              <View key={skill} style={styles.chip}>
                <Text style={styles.chipText}>{skill}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No skills listed yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Work details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Experience</Text>
          <Text style={styles.value}>{profile.experience || "—"} years</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Hourly rate</Text>
          <Text style={styles.value}>₹{profile.hourlyRate || "—"}</Text>
        </View>
      </View>

      <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
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
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: "#12352d",
    borderRadius: 28,
    padding: 18,
    marginTop: 12,
    marginBottom: 14,
  },
  brand: {
    color: "#dcfce7",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#cbd5e1",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 14,
  },
  sectionLabel: {
    color: "#16a34a",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    flex: 1,
  },
  value: {
    color: "#0f172a",
    fontWeight: "800",
    flex: 1.2,
    textAlign: "right",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 12,
  },
  emptyText: {
    color: "#64748b",
  },
  logoutButton: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  pressed: {
    opacity: 0.92,
  },
});
