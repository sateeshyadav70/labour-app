import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  confirmLocalPayment,
  createLocalPaymentOrder,
  getLocalBookingPaymentDetails,
  getLocalPaymentHistory,
} from "../../utils/bookingFallback";

const isBookingConfirmed = (status) => ["confirmed", "accepted"].includes(String(status || "").toLowerCase());

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

const formatCurrency = (amount) => `₹${Number(amount || 0).toFixed(0)}`;

export default function PaymentScreen({ navigation, route }) {
  const { currentUser } = useAuth();
  const { bookingId, booking, worker, date, address } = route.params || {};
  const hourlyRate = booking?.estimatedAmount ?? worker?.hourlyRate ?? worker?.price ?? 0;

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [bookingPaymentDetails, setBookingPaymentDetails] = useState(route.params?.paymentDetails || null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [retryState, setRetryState] = useState(null);
  const [statusText, setStatusText] = useState("Ready to create your Razorpay order.");

  const bookingSource = bookingPaymentDetails?.booking || booking || null;
  const currentPayment = bookingPaymentDetails?.payment || null;

  const loadPaymentHistory = async (isMounted = () => true) => {
    if (isMounted()) {
      setHistoryLoading(true);
      setHistoryError("");
    }
    try {
      if (isMounted()) {
        const payments = getLocalPaymentHistory(currentUser?.email || null);
        setHistory(payments);
      }
    } catch (error) {
      if (isMounted()) {
        setHistoryError(error?.message || "Unable to load payment history.");
      }
    } finally {
      if (isMounted()) {
        setHistoryLoading(false);
      }
    }
  };

  const loadBookingPaymentDetails = async (isMounted = () => true) => {
    if (!bookingId) {
      return;
    }
    const details = getLocalBookingPaymentDetails(bookingId, currentUser?.email || null);

    if (isMounted()) {
      setBookingPaymentDetails(details);
    }
  };

  useEffect(() => {
    let mounted = true;

    loadPaymentHistory(() => mounted);

    return () => {
      mounted = false;
    };
  }, [currentUser?.email]);

  useEffect(() => {
    let mounted = true;

    loadBookingPaymentDetails(() => mounted);

    return () => {
      mounted = false;
    };
  }, [bookingId, currentUser?.email]);

  const paymentSnapshot = useMemo(
    () => bookingPaymentDetails?.payment || currentPayment || null,
    [bookingPaymentDetails, currentPayment]
  );

  const bookingStatus = bookingPaymentDetails?.booking?.status || booking?.status || "pending";
  const canStartPayment = Boolean(bookingId);

  const createRazorpayOrder = async () => {
    if (!bookingId) {
      Alert.alert("Booking missing", "Pehle booking create karo.");
      return null;
    }

    setLoadingOrder(true);
    setRetryState(null);
    setStatusText("Creating Razorpay order...");

    try {
      const order = createLocalPaymentOrder({
        bookingId,
        amount: hourlyRate,
        method: "razorpay",
        userId: currentUser?.id || null,
        userEmail: currentUser?.email || null,
        booking: bookingPaymentDetails?.booking || booking || null,
      });

      setCheckoutOrder(order);
      setCheckoutVisible(true);
      setStatusText("Razorpay checkout opened.");
      return order;
    } catch (error) {
      setRetryState({
        stage: "create-order",
        message: error?.message || "Could not create the payment order.",
      });
      setStatusText("Payment order failed. Please retry.");
      Alert.alert("Payment retry", error?.message || "Could not create the payment order.");
      return null;
    } finally {
      setLoadingOrder(false);
    }
  };

  const verifyRazorpayPayment = async () => {
    if (!checkoutOrder) {
      setRetryState({
        stage: "checkout",
        message: "Checkout order is missing. Please try again.",
      });
      return;
    }

    setVerifyingPayment(true);
    setStatusText("Verifying payment...");
    try {
      const razorpayPaymentId = `pay_${Date.now()}`;
      const razorpaySignature = `sig_${Date.now()}`;
      const confirmed = confirmLocalPayment({
        bookingId,
        amount: hourlyRate,
        booking: bookingPaymentDetails?.booking || booking || null,
        worker,
        orderId: checkoutOrder.id,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
        userId: currentUser?.id || null,
        userEmail: currentUser?.email || null,
      });

      const verifiedPayment = confirmed.payment;
      const resolvedBooking = confirmed.booking;

      if (!isBookingConfirmed(resolvedBooking?.status)) {
        throw new Error(`Booking is still ${resolvedBooking?.status || "pending"}. Please retry.`);
      }

      setCheckoutVisible(false);
      setStatusText("Payment verified successfully.");
      setRetryState(null);
      setBookingPaymentDetails((prev) => ({
        ...(prev || {}),
        booking: resolvedBooking,
        payment: verifiedPayment || prev?.payment || null,
        trackingSnapshot: confirmed?.trackingSnapshot || prev?.trackingSnapshot || null,
      }));

      navigation.replace("LiveTracking", {
        bookingId: resolvedBooking?.bookingId || resolvedBooking?.id || bookingId,
        booking: resolvedBooking,
        worker: confirmed?.trackingSnapshot?.worker || resolvedBooking?.worker || worker,
        trackingSnapshot: confirmed?.trackingSnapshot || bookingPaymentDetails?.trackingSnapshot || null,
        payment: verifiedPayment || paymentSnapshot || null,
        order: checkoutOrder,
      });
    } catch (error) {
      setCheckoutVisible(false);
      setRetryState({
        stage: "verify",
        message: error?.message || "Verification failed. Please retry.",
      });
      setStatusText("Verification failed. Retry is available.");
      Alert.alert("Verification failed", error?.message || "Please retry verification.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const retryPayment = async () => {
    setCheckoutVisible(false);
    setCheckoutOrder(null);
    await createRazorpayOrder();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Secure payment</Text>
            </View>
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>{formatCurrency(hourlyRate)}/hr</Text>
            </View>
          </View>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.subtitle}>Open Razorpay checkout, verify the payment, then move to live tracking.</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Booking details</Text>
          {canStartPayment || bookingSource ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Worker</Text>
                <Text style={styles.value}>{worker?.name || bookingSource?.worker?.name || "Worker"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{date || bookingSource?.date || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.value}>{address || bookingSource?.address || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>{formatCurrency(hourlyRate)}/hr</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Booking status</Text>
                <Text style={styles.value}>{bookingStatus}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.paymentText}>
              Open this screen from a booking to pay, or use the history below to review earlier payments.
            </Text>
          )}
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.paymentLabel}>Payment status</Text>
          <Text style={styles.paymentText}>{statusText}</Text>
          <Text style={styles.metaText}>
            {retryState ? `${retryState.stage}: ${retryState.message}` : "We only navigate after verify succeeds."}
          </Text>

          <Pressable
            onPress={createRazorpayOrder}
            disabled={!canStartPayment}
            style={({ pressed }) => [
              styles.button,
              !canStartPayment && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {loadingOrder ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pay with Razorpay</Text>}
          </Pressable>

          {retryState ? (
            <Pressable onPress={retryPayment} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryButtonText}>Retry verification</Text>
            </Pressable>
          ) : null}
        </View>

        {paymentSnapshot ? (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionLabel}>Booking payment details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{paymentSnapshot.status}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{formatCurrency(paymentSnapshot.amount || hourlyRate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Razorpay Order</Text>
              <Text style={styles.detailValue}>{paymentSnapshot.razorpay_order_id || paymentSnapshot.orderId || "—"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created at</Text>
              <Text style={styles.detailValue}>{formatDateTime(paymentSnapshot.createdAt)}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.detailsCard}>
          <Text style={styles.sectionLabel}>Payment history</Text>
          <Text style={styles.historySubtitle}>
            {currentUser?.email ? "Recent payments for the signed-in user." : "Login to view payment history."}
          </Text>

          {historyLoading ? <ActivityIndicator color="#14532d" style={styles.historySpinner} /> : null}
          {!historyLoading && historyError ? <Text style={styles.errorText}>{historyError}</Text> : null}
          {!historyLoading && !historyError && history.length === 0 ? (
            <Text style={styles.emptyText}>No payments found yet.</Text>
          ) : null}

          {history.map((payment) => (
            <View key={payment.id} style={styles.historyItem}>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>status</Text>
                <Text style={styles.historyValue}>{payment.status}</Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>amount</Text>
                <Text style={styles.historyValue}>{formatCurrency(payment.amount)}</Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>razorpay_order_id</Text>
                <Text style={styles.historyValue}>{payment.razorpay_order_id || payment.orderId || "—"}</Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>createdAt</Text>
                <Text style={styles.historyValue}>{formatDateTime(payment.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={checkoutVisible} animationType="slide" transparent onRequestClose={() => setCheckoutVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Razorpay checkout</Text>
            <Text style={styles.modalSubtitle}>
              Review the order, then complete payment to continue to live tracking.
            </Text>

            <View style={styles.modalInfoCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.detailValue}>{checkoutOrder?.id || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking ID</Text>
                <Text style={styles.detailValue}>{bookingId || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>{formatCurrency(checkoutOrder?.amount || hourlyRate)}</Text>
              </View>
            </View>

            <Pressable
              onPress={verifyRazorpayPayment}
              disabled={verifyingPayment}
              style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.buttonPressed]}
            >
              {verifyingPayment ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Pay now</Text>}
            </Pressable>

            <Pressable onPress={() => setCheckoutVisible(false)} style={styles.modalSecondaryButton}>
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    bottom: 130,
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
  amountBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  amountBadgeText: {
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
    borderRadius: 24,
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
    marginBottom: 12,
  },
  label: {
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 5,
  },
  value: {
    color: "#0f172a",
    fontWeight: "800",
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
    marginBottom: 14,
  },
  paymentLabel: {
    color: "#0f172a",
    fontWeight: "900",
    marginBottom: 6,
  },
  paymentText: {
    color: "#64748b",
    lineHeight: 19,
  },
  metaText: {
    color: "#0f172a",
    marginTop: 8,
    marginBottom: 14,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#dcfce7",
  },
  secondaryButtonText: {
    color: "#14532d",
    fontSize: 16,
    fontWeight: "900",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  detailsCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 12,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    flex: 1,
  },
  detailValue: {
    color: "#0f172a",
    fontWeight: "800",
    flex: 1.2,
    textAlign: "right",
  },
  historySubtitle: {
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 19,
  },
  historySpinner: {
    marginVertical: 10,
  },
  emptyText: {
    color: "#64748b",
    marginTop: 4,
  },
  errorText: {
    color: "#b91c1c",
    marginTop: 6,
    marginBottom: 8,
    fontWeight: "700",
  },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.08)",
    paddingTop: 12,
    marginTop: 12,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  historyLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    flex: 1,
  },
  historyValue: {
    color: "#0f172a",
    fontWeight: "800",
    flex: 1.2,
    textAlign: "right",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },
  modalSubtitle: {
    color: "#64748b",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 16,
  },
  modalPrimaryButton: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  modalPrimaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  modalSecondaryButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  modalSecondaryText: {
    color: "#14532d",
    fontWeight: "900",
    fontSize: 15,
  },
});
