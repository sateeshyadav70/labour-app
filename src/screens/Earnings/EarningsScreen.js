import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiGet, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";

const formatMoney = (value) => `₹${Number(value || 0).toFixed(0)}`;

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
};

export default function EarningsScreen() {
  const { authToken } = useAuth();
  const [summary, setSummary] = useState({ total: 0, today: 0, count: 0, currency: "INR" });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadEarnings = async () => {
      setLoading(true);
      try {
        const response = await apiGet("/worker/earnings", { token: authToken });
        const payload = unwrapApiResponse(response) || response;
        if (!mounted) {
          return;
        }

        setSummary({
          total: payload?.total ?? 0,
          today: payload?.today ?? 0,
          count: payload?.count ?? 0,
          currency: payload?.currency || "INR",
        });
        setBookings(payload?.bookings || []);
      } catch (error) {
        if (mounted) {
          setBookings([]);
          setSummary({ total: 0, today: 0, count: 0, currency: "INR" });
          return;
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEarnings();

    return () => {
      mounted = false;
    };
  }, [authToken]);

  const headerCards = useMemo(
    () => [
      { label: "Total earnings", value: formatMoney(summary.total) },
      { label: "Today", value: formatMoney(summary.today) },
      { label: "Completed jobs", value: String(summary.count || 0) },
    ],
    [summary]
  );

  const renderBooking = ({ item }) => {
    const booking = item?.booking || item;

    return (
      <View style={styles.listItem}>
        <View style={styles.listTopRow}>
          <Text style={styles.listTitle}>{booking?.serviceType || booking?.serviceId || "Completed booking"}</Text>
          <Text style={styles.listAmount}>{formatMoney(item?.amount || booking?.estimatedAmount)}</Text>
        </View>
        <Text style={styles.listMeta}>{booking?.address || "No address"}</Text>
        <View style={styles.listBottomRow}>
          <Text style={styles.listMeta}>Paid at {formatDateTime(item?.paidAt || booking?.payment?.paidAt || booking?.updatedAt)}</Text>
          <Text style={styles.listMeta}>{booking?.status || "completed"}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Fixora Worker</Text>
        <Text style={styles.title}>Earnings</Text>
        <Text style={styles.subtitle}>Track your completed paid jobs and daily totals.</Text>
      </View>

      <View style={styles.summaryRow}>
        {headerCards.map((card) => (
          <View key={card.label} style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{card.value}</Text>
            <Text style={styles.summaryLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#0f172a" />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item, index) => String(item?.booking?._id || item?.booking?.bookingId || item?._id || index)}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No earnings yet</Text>
              <Text style={styles.emptyText}>Completed paid bookings will appear here after verification.</Text>
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
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#64748b",
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  summaryValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  listItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  listTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  listTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
    paddingRight: 10,
  },
  listAmount: {
    color: "#14532d",
    fontWeight: "900",
    fontSize: 16,
  },
  listMeta: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 4,
  },
  listBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
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
    maxWidth: 280,
  },
});
