import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import { apiGet, apiPut, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";
import { connectAppSocket, disconnectAppSocket } from "../../utils/socket";
import { resolveProfileImage } from "../../utils/profileImage";

const formatMoney = (value) => `₹${Number(value || 0).toFixed(0)}`;

const normalizeBooking = (item) => {
  if (!item) {
    return null;
  }

  if (item.booking) {
    return { ...item.booking, trackingSnapshot: item.trackingSnapshot || item.booking.trackingSnapshot || null };
  }

  return item;
};

const getBookingId = (item) => item?._id || item?.bookingId || item?.id || null;

export default function WorkerHomeScreen({ navigation, onLogout }) {
  const { authToken, currentUser } = useAuth();
  const [workerProfile, setWorkerProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, today: 0, count: 0, currency: "INR" });
  const [loading, setLoading] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);

  const isOnline = Boolean(workerProfile?.isOnline);
  const displayName = workerProfile?.name || currentUser?.name || "Worker";
  const displayImage = resolveProfileImage(workerProfile || currentUser || {}, displayName);
  const availableBookings = useMemo(
    () => bookings.filter(Boolean).slice(0, 6),
    [bookings]
  );
  const latestBooking = availableBookings[0] || null;

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    const socket = connectAppSocket(authToken);

    const handleNewBooking = (data) => {
      const nextBooking = normalizeBooking(data);
      if (!nextBooking) {
        return;
      }

      console.log("New Job:", nextBooking);
      setBookings((prev) => [nextBooking, ...prev.filter((item) => getBookingId(item) !== getBookingId(nextBooking))]);
    };

    socket.on("newBooking", handleNewBooking);

    return () => {
      socket.off("newBooking", handleNewBooking);
      disconnectAppSocket();
    };
  }, [authToken]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [profileResponse, bookingsResponse, earningsResponse] = await Promise.all([
          apiGet("/worker/profile", { token: authToken }),
          apiGet("/worker/bookings", { token: authToken }),
          apiGet("/worker/earnings", { token: authToken }),
        ]);

        if (!mounted) {
          return;
        }

        const profilePayload = unwrapApiResponse(profileResponse) || profileResponse;
        const bookingsPayload = unwrapApiResponse(bookingsResponse) || bookingsResponse;
        const earningsPayload = unwrapApiResponse(earningsResponse) || earningsResponse;

        setWorkerProfile(profilePayload?.worker || profilePayload || null);
        setBookings((prev) => {
          const merged = [...(bookingsPayload?.bookings || []), ...prev];
          const seen = new Set();

          return merged.filter((item) => {
            const id = getBookingId(item);
            if (!id || seen.has(String(id))) {
              return false;
            }

            seen.add(String(id));
            return true;
          });
        });
        setEarnings({
          total: earningsPayload?.total ?? 0,
          today: earningsPayload?.today ?? 0,
          count: earningsPayload?.count ?? 0,
          currency: earningsPayload?.currency || "INR",
        });
      } catch (error) {
        if (mounted) {
          Alert.alert("Dashboard error", getApiErrorMessage(error, "Unable to load worker dashboard."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [authToken]);

  const toggleStatus = async () => {
    setStatusBusy(true);
    try {
      const response = await apiPut(
        "/worker/status",
        {
          isOnline: !isOnline,
        },
        { token: authToken }
      );

      const payload = unwrapApiResponse(response) || response;
      setWorkerProfile(payload?.worker || payload || workerProfile);
    } catch (error) {
      Alert.alert("Status update failed", getApiErrorMessage(error, "Unable to update worker status."));
    } finally {
      setStatusBusy(false);
    }
  };

  const renderBooking = ({ item }) => {
    const booking = normalizeBooking(item);
    const bookingId = getBookingId(booking);
    const status = booking?.status || booking?.bookingStatus || "pending";

    return (
      <Pressable
        onPress={() => navigation.navigate("BookingDetails", { bookingId, booking })}
        style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}
      >
        <View style={styles.bookingTopRow}>
          <Text style={styles.bookingTitle}>{booking?.serviceType || booking?.serviceId || "Booking"}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{status}</Text>
          </View>
        </View>
        <Text style={styles.bookingMeta}>{booking?.address || "No address"}</Text>
        <View style={styles.bookingStats}>
          <Text style={styles.bookingStat}>Booking #{bookingId || "—"}</Text>
          <Text style={styles.bookingStat}>{booking?.date ? new Date(booking.date).toLocaleDateString() : "—"}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.brand}>Fixora Worker</Text>
            <Text style={styles.title}>{displayName}</Text>
            <Text style={styles.subtitle}>
              {isOnline ? "You are online and ready for new jobs." : "Go online to receive live bookings."}
            </Text>
          </View>
          <View style={styles.heroRight}>
            <ProfileAvatar
              name={displayName}
              imageUri={displayImage}
              size={60}
              borderRadius={20}
              backgroundColor="#ffffff"
              fallbackColor="#12352d"
              showRing={false}
            />
            <Pressable
              onPress={toggleStatus}
              style={({ pressed }) => [styles.statusButton, isOnline && styles.statusButtonOnline, pressed && styles.pressed]}
            >
              {statusBusy ? (
                <ActivityIndicator color={isOnline ? "#14532d" : "#0f172a"} />
              ) : (
                <Text style={[styles.statusButtonText, isOnline && styles.statusButtonTextOnline]}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.heroMetricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{earnings.count}</Text>
            <Text style={styles.metricLabel}>Paid jobs</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatMoney(earnings.today)}</Text>
            <Text style={styles.metricLabel}>Today</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatMoney(earnings.total)}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable onPress={() => navigation.navigate("BookingRequests")} style={styles.quickAction}>
            <Text style={styles.quickActionText}>Requests</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Earnings")} style={styles.quickAction}>
            <Text style={styles.quickActionText}>Earnings</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.quickAction}>
            <Text style={styles.quickActionText}>Profile</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Incoming jobs</Text>
        <Text style={styles.sectionHint}>Real-time jobs appear here first.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#0f172a" />
        </View>
      ) : (
        <FlatList
          data={availableBookings}
          keyExtractor={(item) => String(getBookingId(item))}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>Stay online so new requests can reach you instantly.</Text>
            </View>
          }
          ListHeaderComponent={
            latestBooking ? (
              <Pressable
                onPress={() => navigation.navigate("BookingDetails", { bookingId: getBookingId(latestBooking), booking: latestBooking })}
                style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}
              >
                <Text style={styles.featuredLabel}>Latest request</Text>
                <Text style={styles.featuredTitle}>{latestBooking.serviceType || latestBooking.serviceId || "Booking request"}</Text>
                <Text style={styles.featuredText}>{latestBooking.address || "No address"}</Text>
                <Text style={styles.featuredMeta}>Open to accept or reject</Text>
              </Pressable>
            ) : null
          }
        />
      )}
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
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    top: -70,
    right: -90,
  },
  bgOrbB: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(14, 165, 233, 0.08)",
    top: 170,
    left: -80,
  },
  hero: {
    backgroundColor: "#12352d",
    borderRadius: 30,
    padding: 18,
    marginTop: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroRight: {
    alignItems: "flex-end",
    gap: 10,
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
    maxWidth: 260,
  },
  statusButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: "center",
  },
  statusButtonOnline: {
    backgroundColor: "#dcfce7",
  },
  statusButtonText: {
    color: "#0f172a",
    fontWeight: "900",
  },
  statusButtonTextOnline: {
    color: "#14532d",
  },
  heroMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metricValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  metricLabel: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: "#dcfce7",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  quickActionText: {
    color: "#14532d",
    fontWeight: "900",
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  sectionHint: {
    color: "#64748b",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
  featuredCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  featuredLabel: {
    color: "#16a34a",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  featuredTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  featuredText: {
    color: "#475569",
    lineHeight: 19,
    marginBottom: 6,
  },
  featuredMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  bookingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bookingTitle: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 16,
    flex: 1,
    paddingRight: 10,
  },
  statusPill: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "800",
  },
  bookingMeta: {
    color: "#475569",
    marginBottom: 10,
  },
  bookingStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookingStat: {
    color: "#64748b",
    fontSize: 12,
  },
  pressed: {
    opacity: 0.92,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 6,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
});
