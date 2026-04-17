import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiGet, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";
import { connectAppSocket, disconnectAppSocket } from "../../utils/socket";

const getBookingId = (item) => item?._id || item?.bookingId || item?.id || null;

const normalizeBooking = (item) => {
  if (!item) {
    return null;
  }

  if (item.booking) {
    return { ...item.booking, trackingSnapshot: item.trackingSnapshot || item.booking.trackingSnapshot || null };
  }

  return item;
};

export default function BookingRequestsScreen({ navigation }) {
  const { authToken } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const pendingBookings = useMemo(
    () => bookings.filter(Boolean),
    [bookings]
  );

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

    const loadBookings = async () => {
      setLoading(true);
      try {
        const response = await apiGet("/worker/bookings", { token: authToken });
        const payload = unwrapApiResponse(response) || response;
        if (mounted) {
          setBookings((prev) => {
            const merged = [...(payload?.bookings || []), ...prev];
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
        }
      } catch (_error) {
        if (mounted) {
          setBookings([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBookings();

    return () => {
      mounted = false;
    };
  }, [authToken]);

  const renderBooking = ({ item }) => {
    const booking = normalizeBooking(item);
    const bookingId = getBookingId(booking);

    return (
      <Pressable
        onPress={() => navigation.navigate("BookingDetails", { bookingId, booking })}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.title}>{booking?.serviceType || booking?.serviceId || "Booking"}</Text>
          <Text style={styles.status}>{booking?.status || "pending"}</Text>
        </View>
        <Text style={styles.address}>{booking?.address || "No address"}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>ID: {bookingId || "—"}</Text>
          <Text style={styles.meta}>{booking?.date ? new Date(booking.date).toLocaleDateString() : "—"}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Fixora Worker</Text>
        <Text style={styles.pageTitle}>Booking requests</Text>
        <Text style={styles.subtitle}>All assigned jobs and incoming broadcasts live here.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#0f172a" />
      ) : (
        <FlatList
          data={pendingBookings}
          keyExtractor={(item) => String(getBookingId(item))}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No bookings found</Text>
              <Text style={styles.emptyText}>Stay online to receive the next booking instantly.</Text>
            </View>
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
  header: {
    marginTop: 12,
    marginBottom: 14,
  },
  brand: {
    color: "#16a34a",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 6,
  },
  pageTitle: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#64748b",
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  pressed: {
    opacity: 0.92,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
  status: {
    color: "#14532d",
    fontWeight: "800",
    fontSize: 12,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  address: {
    color: "#475569",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    color: "#64748b",
    fontSize: 12,
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
