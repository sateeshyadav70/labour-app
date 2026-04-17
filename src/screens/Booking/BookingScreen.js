import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";
import { apiPost, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";

const buildBookingRequest = ({ worker, serviceId, serviceType, date, address, notes, userLocation }) => ({
  workerId: worker?._id || worker?.id || null,
  serviceId: serviceId || worker?.serviceId || null,
  serviceType: serviceType || worker?.serviceType || worker?.serviceTitle || worker?.name || null,
  date,
  address,
  notes: notes || "",
  userLocation,
});

export default function BookingScreen({ navigation, route }) {
  const { authToken } = useAuth();
  const worker = route.params?.worker;
  const hourlyRate = worker?.hourlyRate ?? worker?.price ?? 0;
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Fetching location...");

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) {
            setLocationStatus("Location permission denied");
            setLocationLoading(false);
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (mounted) {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationStatus("Location ready");
          setLocationLoading(false);
        }
      } catch (_error) {
        if (mounted) {
          setLocationStatus("Unable to fetch location");
          setLocationLoading(false);
        }
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  const createBooking = async () => {
    if (!worker) {
      Alert.alert("Worker missing", "Worker profile se booking open karo.");
      return;
    }

    if (!date || !address) {
      Alert.alert("Missing fields", "Date aur address bharo.");
      return;
    }

    if (!userLocation) {
      Alert.alert("Location needed", "Booking ke liye current location allow karo.");
      return;
    }

    setLoading(true);
    try {
      const bookingRequest = buildBookingRequest({
        worker,
        serviceId: worker.serviceId || route.params?.serviceId,
        serviceType: route.params?.serviceTitle || worker?.serviceType,
        date,
        address,
        notes: route.params?.notes || "",
        userLocation,
      });

      const response = await apiPost("/booking", bookingRequest, { token: authToken });
      const payload = unwrapApiResponse(response) || response;
      const booking = payload?.booking || payload;
      const trackingSnapshot = payload?.trackingSnapshot || booking?.trackingSnapshot || null;

      navigation.navigate("Payment", {
        bookingId: booking?._id || booking?.bookingId || booking?.id,
        booking,
        worker: booking?.worker || worker,
        date: booking?.date || date,
        address: booking?.address || address,
        trackingSnapshot,
      });
    } catch (error) {
      Alert.alert("Booking failed", getApiErrorMessage(error, "Unable to create booking right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Booking ready</Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateBadgeText}>₹{hourlyRate}/hr</Text>
          </View>
        </View>
        <Text style={styles.title}>Confirm booking</Text>
        <Text style={styles.subtitle}>{worker?.name || "Worker"} will receive this request instantly.</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionLabel}>Booking summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Worker</Text>
          <Text style={styles.summaryValue}>{worker?.name || "Worker"}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Fixed rate</Text>
          <Text style={styles.summaryValue}>₹{hourlyRate}/hr</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Location</Text>
          <Text style={styles.summaryValue}>{locationStatus}</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Service date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.formLabel}>Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Full address"
          placeholderTextColor="#94a3b8"
          style={[styles.input, styles.textArea]}
          multiline
        />

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipText}>Add a clear address and date to speed up acceptance.</Text>
        </View>
      </View>

      <Pressable onPress={createBooking} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        {loading || locationLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Proceed to payment</Text>}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1e8",
    padding: 16,
  },
  bgOrbA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    top: -50,
    right: -60,
  },
  bgOrbB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(14, 165, 233, 0.06)",
    bottom: 160,
    left: -50,
  },
  hero: {
    backgroundColor: "#12352d",
    borderRadius: 30,
    padding: 18,
    marginTop: 12,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroAccent: {
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
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#dcfce7",
    fontSize: 12,
    fontWeight: "800",
  },
  rateBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  rateBadgeText: {
    color: "#14532d",
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 6,
  },
  subtitle: {
    color: "#cbd5e1",
    lineHeight: 21,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
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
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    color: "#64748b",
    fontWeight: "700",
  },
  summaryValue: {
    color: "#0f172a",
    fontWeight: "900",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 14,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 14,
  },
  formLabel: {
    color: "#0f172a",
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  tipCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
  },
  tipTitle: {
    color: "#0f172a",
    fontWeight: "900",
    marginBottom: 4,
  },
  tipText: {
    color: "#64748b",
    lineHeight: 19,
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});
