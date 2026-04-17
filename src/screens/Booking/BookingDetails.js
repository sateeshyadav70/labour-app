import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPost, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";

const getBookingId = (item) => item?._id || item?.bookingId || item?.id || null;

const statusLabel = (booking) => String(booking?.status || booking?.bookingStatus || "pending").toLowerCase();

export default function BookingDetailsScreen({ navigation, route }) {
  const { authToken } = useAuth();
  const bookingId = route.params?.bookingId || getBookingId(route.params?.booking);
  const [booking, setBooking] = useState(route.params?.booking || null);
  const [loading, setLoading] = useState(!route.params?.booking);
  const [actionBusy, setActionBusy] = useState(false);

  const canAccept = useMemo(() => ["pending", "searching", "broadcasted"].includes(statusLabel(booking)), [booking]);
  const canReject = useMemo(() => ["pending", "searching", "broadcasted", "accepted"].includes(statusLabel(booking)), [booking]);
  const canStartWork = useMemo(() => ["accepted", "confirmed", "on-the-way"].includes(statusLabel(booking)), [booking]);
  const canComplete = useMemo(() => ["on-the-way", "accepted"].includes(statusLabel(booking)), [booking]);

  useEffect(() => {
    let mounted = true;

    const loadBooking = async () => {
      if (!bookingId || booking) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiGet(`/booking/${bookingId}`, { token: authToken });
        const payload = unwrapApiResponse(response) || response;
        if (mounted) {
          setBooking(payload?.booking || payload || null);
        }
      } catch (error) {
        if (mounted) {
          Alert.alert("Booking load failed", getApiErrorMessage(error, "Unable to load booking details."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBooking();

    return () => {
      mounted = false;
    };
  }, [authToken, bookingId, booking]);

  const mutateBooking = async (path, successMessage) => {
    if (!bookingId) {
      return;
    }

    setActionBusy(true);
    try {
      const response = await apiPost(path, { bookingId }, { token: authToken });
      const payload = unwrapApiResponse(response) || response;
      setBooking(payload?.booking || payload || booking);
      if (successMessage) {
        Alert.alert("Success", successMessage);
      }
    } catch (error) {
      Alert.alert("Action failed", getApiErrorMessage(error, "Unable to update booking right now."));
    } finally {
      setActionBusy(false);
    }
  };

  const goToTracking = () => {
    navigation.navigate("LiveTracking", {
      bookingId,
      booking,
      worker: booking?.worker || route.params?.worker || null,
      mode: "worker",
      trackingSnapshot: booking?.trackingSnapshot || route.params?.trackingSnapshot || null,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#0f172a" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyTitle}>Booking not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.brand}>Fixora Worker</Text>
          <Text style={styles.title}>{booking.serviceType || booking.serviceId || "Booking details"}</Text>
          <Text style={styles.subtitle}>{booking.address || "No address provided"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Booking info</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Booking ID</Text>
            <Text style={styles.value}>{bookingId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{booking.status || booking.bookingStatus || "pending"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment</Text>
            <Text style={styles.value}>{booking.paymentStatus || "pending"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{booking.date ? new Date(booking.date).toLocaleString() : "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>₹{booking.estimatedAmount || booking.worker?.hourlyRate || "—"}</Text>
          </View>
        </View>

        {booking.trackingSnapshot ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Tracking snapshot</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Label</Text>
              <Text style={styles.value}>{booking.trackingSnapshot.label || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ETA</Text>
              <Text style={styles.value}>{booking.trackingSnapshot.etaMinutes || "—"} mins</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Updated</Text>
              <Text style={styles.value}>{booking.trackingSnapshot.updatedAt ? new Date(booking.trackingSnapshot.updatedAt).toLocaleTimeString() : "—"}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          {canAccept ? (
            <Pressable
              onPress={() => mutateBooking("/worker/accept-booking", "Booking accepted")}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              disabled={actionBusy}
            >
              {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Accept</Text>}
            </Pressable>
          ) : null}

          {canReject ? (
            <Pressable
              onPress={() => mutateBooking("/worker/reject-booking", "Booking rejected")}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              disabled={actionBusy}
            >
              <Text style={styles.secondaryText}>Reject</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.buttonRow}>
          {canStartWork ? (
            <Pressable
              onPress={() => mutateBooking(`/booking/${bookingId}/on-the-way`, "Marked on the way")}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              disabled={actionBusy}
            >
              <Text style={styles.secondaryText}>On the way</Text>
            </Pressable>
          ) : null}

          {canComplete ? (
            <Pressable
              onPress={async () => {
                await mutateBooking(`/booking/${bookingId}/complete`, "Job completed");
              }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              disabled={actionBusy}
            >
              <Text style={styles.primaryText}>Complete</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable onPress={goToTracking} style={({ pressed }) => [styles.fullButton, pressed && styles.pressed]}>
          <Text style={styles.fullButtonText}>Open tracking</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#dcfce7",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  secondaryText: {
    color: "#14532d",
    fontWeight: "900",
    fontSize: 16,
  },
  fullButton: {
    backgroundColor: "#12352d",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 16,
  },
  fullButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  pressed: {
    opacity: 0.92,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    padding: 20,
  },
});
