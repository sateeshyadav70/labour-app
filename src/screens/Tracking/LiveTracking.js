import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";
import { apiGet, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";
import { connectAppSocket, disconnectAppSocket, getAppSocket } from "../../utils/socket";

const routePoints = [
  { label: "Store pickup", subtitle: "Worker accepted the job", eta: 18, x: 32, y: 120, address: "Service hub" },
  { label: "Main road", subtitle: "Moving towards your area", eta: 12, x: 120, y: 88, address: "Busy route" },
  { label: "Sector turn", subtitle: "Recalculating route live", eta: 7, x: 206, y: 128, address: "Near market lane" },
  { label: "Your home", subtitle: "Arriving at your address", eta: 2, x: 286, y: 72, address: "Drop-off point" },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatUpdateTime = (value) => {
  if (!value) {
    return "Updated just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Updated just now";
  }

  return `Updated at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};

const pickPointFromPayload = (payload = {}) => {
  if (typeof payload.stepIndex === "number" && routePoints[payload.stepIndex]) {
    return { ...routePoints[payload.stepIndex], ...payload };
  }

  if (typeof payload.progress === "number") {
    const index = clamp(Math.round(payload.progress * (routePoints.length - 1)), 0, routePoints.length - 1);
    return { ...routePoints[index], ...payload };
  }

  if (typeof payload.etaMinutes === "number") {
    const index =
      payload.etaMinutes <= 3 ? 3 : payload.etaMinutes <= 8 ? 2 : payload.etaMinutes <= 13 ? 1 : 0;
    return { ...routePoints[index], ...payload };
  }

  if (typeof payload.latitude === "number" && typeof payload.longitude === "number") {
    const x = clamp(160 + (payload.longitude - 78.02) * 1500, 32, 286);
    const y = clamp(108 - (payload.latitude - 30.31) * 1800, 56, 150);

    return {
      x,
      y,
      label: payload.label || "Worker on route",
      subtitle: payload.status || "Moving live",
      eta: payload.etaMinutes ?? 8,
      address: payload.address || payload.zone || "Live area",
      latitude: payload.latitude,
      longitude: payload.longitude,
    };
  }

  return routePoints[0];
};

const isWorkerMode = (mode) => String(mode || "").toLowerCase() === "worker";

export default function LiveTrackingScreen({ navigation, route }) {
  const { authToken, currentUser } = useAuth();
  const { bookingId, worker, trackingSnapshot: initialSnapshot, mode = "user", booking: initialBooking } = route.params || {};
  const workerTrackingMode = isWorkerMode(mode);
  const [booking, setBooking] = useState(initialBooking || null);
  const [stepIndex, setStepIndex] = useState(initialSnapshot?.stepIndex ?? 0);
  const [lastUpdate, setLastUpdate] = useState(
    formatUpdateTime(initialSnapshot?.updatedAt || initialSnapshot?.timestamp)
  );
  const [socketState, setSocketState] = useState(initialSnapshot ? "snapshot" : "connecting");
  const [trackingMode, setTrackingMode] = useState(initialSnapshot ? "live" : "demo");
  const [trackingSnapshot, setTrackingSnapshot] = useState(initialSnapshot || null);
  const [livePoint, setLivePoint] = useState(
    initialSnapshot ? pickPointFromPayload(initialSnapshot) : routePoints[0]
  );
  const [snapshotLoading, setSnapshotLoading] = useState(Boolean(bookingId && !initialSnapshot));
  const [trackingError, setTrackingError] = useState("");
  const [permissionStatus, setPermissionStatus] = useState(workerTrackingMode ? "loading" : "idle");
  const markerX = useRef(new Animated.Value(initialSnapshot ? pickPointFromPayload(initialSnapshot).x : routePoints[0].x)).current;
  const markerY = useRef(new Animated.Value(initialSnapshot ? pickPointFromPayload(initialSnapshot).y : routePoints[0].y)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const watchSubscription = useRef(null);
  const socketRef = useRef(null);

  const workerName = worker?.name || trackingSnapshot?.worker?.name || booking?.worker?.name || "Worker";
  const bookingLabel = trackingSnapshot?.bookingId || bookingId || "—";
  const liveLabel = useMemo(() => {
    if (trackingSnapshot?.latitude && trackingSnapshot?.longitude) {
      return `Lat ${trackingSnapshot.latitude.toFixed(3)}, Lng ${trackingSnapshot.longitude.toFixed(3)}`;
    }

    if (livePoint.latitude && livePoint.longitude) {
      return `Lat ${livePoint.latitude.toFixed(3)}, Lng ${livePoint.longitude.toFixed(3)}`;
    }

    return trackingSnapshot?.address || livePoint.address || "Live route";
  }, [livePoint, trackingSnapshot]);

  const animateMarkerTo = (point) => {
    Animated.parallel([
      Animated.timing(markerX, {
        toValue: point.x,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(markerY, {
        toValue: point.y,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const applyTrackingSnapshot = (snapshot, nextState = "live") => {
    if (!snapshot) {
      return;
    }

    const nextPoint = pickPointFromPayload(snapshot);
    setTrackingSnapshot(snapshot);
    setTrackingMode("live");
    setSocketState(nextState);
    setLivePoint(nextPoint);
    setLastUpdate(formatUpdateTime(snapshot.updatedAt || snapshot.timestamp));
    setTrackingError("");

    if (typeof snapshot.stepIndex === "number") {
      setStepIndex(clamp(snapshot.stepIndex, 0, routePoints.length - 1));
    }

    if (typeof nextPoint.x === "number" && typeof nextPoint.y === "number") {
      animateMarkerTo(nextPoint);
    }
  };

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    const socket = connectAppSocket(authToken);
    socketRef.current = socket;

    const handleBookingUpdated = (payload) => {
      if (!payload) {
        return;
      }

      if (payload.booking) {
        setBooking(payload.booking);
      }

      if (payload.trackingSnapshot) {
        applyTrackingSnapshot(payload.trackingSnapshot, "live");
      } else if (payload.trackingSnapshot === null && payload.status) {
        setTrackingError(`Booking status: ${payload.status}`);
      }
    };

    const handleTrackingUpdate = (payload) => {
      if (payload?.bookingId && bookingId && String(payload.bookingId) !== String(bookingId)) {
        return;
      }

      applyTrackingSnapshot(payload, "live");
    };

    socket.on("booking:updated", handleBookingUpdated);
    socket.on("tracking:snapshot", handleTrackingUpdate);
    socket.on("tracking:update", handleTrackingUpdate);
    socket.on("receiveLocation", handleTrackingUpdate);

    if (bookingId) {
      socket.emit("joinBookingRoom", bookingId);
      socket.emit("joinRoom", bookingId);
    }

    return () => {
      socket.off("booking:updated", handleBookingUpdated);
      socket.off("tracking:snapshot", handleTrackingUpdate);
      socket.off("tracking:update", handleTrackingUpdate);
      socket.off("receiveLocation", handleTrackingUpdate);
    };
  }, [authToken, bookingId]);

  useEffect(() => {
    let mounted = true;

    const loadSnapshot = async () => {
      if (!bookingId || initialSnapshot) {
        setSnapshotLoading(false);
        return;
      }

      try {
        const response = await apiGet(`/tracking/${bookingId}`, { token: authToken });
        const payload = unwrapApiResponse(response) || response;
        const snapshot = payload?.trackingSnapshot || null;

        if (mounted && snapshot) {
          applyTrackingSnapshot(snapshot, "snapshot");
        } else if (mounted) {
          setTrackingError("Tracking snapshot unavailable");
          setSocketState("demo");
        }
      } catch (error) {
        if (mounted) {
          setTrackingError(getApiErrorMessage(error, "Tracking snapshot unavailable"));
          setSocketState("demo");
        }
      } finally {
        if (mounted) {
          setSnapshotLoading(false);
        }
      }
    };

    loadSnapshot();

    return () => {
      mounted = false;
    };
  }, [authToken, bookingId, initialSnapshot]);

  useEffect(() => {
    if (!workerTrackingMode || !bookingId || !authToken) {
      return undefined;
    }

    let cancelled = false;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) {
          return;
        }

        if (status !== "granted") {
          setPermissionStatus("denied");
          setTrackingError("Location permission denied");
          return;
        }

        setPermissionStatus("granted");
        setTrackingError("");

        const socket = socketRef.current || getAppSocket() || connectAppSocket(authToken);
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (position) => {
            if (!socket || cancelled) {
              return;
            }

            const payload = {
              bookingId,
              workerId: worker?._id || currentUser?._id || currentUser?.id || null,
              serviceId: booking?.serviceId || route.params?.serviceId || worker?.serviceId || null,
              status: booking?.status || initialSnapshot?.status || "on-the-way",
              paymentStatus: booking?.paymentStatus || initialSnapshot?.paymentStatus || "paid",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading ?? null,
              speed: position.coords.speed ?? null,
              accuracy: position.coords.accuracy ?? null,
              updatedAt: new Date().toISOString(),
            };

            socket.emit("sendLocation", payload);
            applyTrackingSnapshot({ ...trackingSnapshot, ...payload }, "live");
          }
        );

        watchSubscription.current = subscription;
      } catch (error) {
        if (!cancelled) {
          setPermissionStatus("error");
          setTrackingError(getApiErrorMessage(error, "Unable to start location tracking."));
        }
      }
    };

    startWatching();

    return () => {
      cancelled = true;
      if (watchSubscription.current) {
        watchSubscription.current.remove();
        watchSubscription.current = null;
      }
    };
  }, [authToken, bookingId, workerTrackingMode, worker, booking, currentUser, initialSnapshot]);

  useEffect(() => {
    if (trackingMode !== "demo" || workerTrackingMode) {
      return undefined;
    }

    let cancelled = false;
    let timer = null;

    const loopDemo = (index) => {
      if (cancelled) {
        return;
      }

      const nextIndex = index % routePoints.length;
      const nextPoint = routePoints[nextIndex];
      setStepIndex(nextIndex);
      setLivePoint(nextPoint);
      setLastUpdate("Updated just now");
      setSocketState("demo");
      animateMarkerTo(nextPoint);

      timer = setTimeout(() => loopDemo(nextIndex + 1), 1600);
    };

    loopDemo(0);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [trackingMode, workerTrackingMode]);

  useEffect(() => {
    return () => {
      disconnectAppSocket();
    };
  }, []);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  const etaMinutes = trackingSnapshot?.etaMinutes ?? livePoint.eta ?? livePoint.etaMinutes ?? 0;
  const etaText = `${etaMinutes} mins`;
  const currentStatus = trackingSnapshot?.status || booking?.status || initialSnapshot?.status || (workerTrackingMode ? "tracking" : "live");
  const modeLabel = workerTrackingMode
    ? permissionStatus === "granted"
      ? "Worker live"
      : "Worker"
    : socketState === "live"
      ? "Socket live"
      : socketState === "snapshot"
      ? "Snapshot"
      : "Live";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{workerTrackingMode ? "Live location" : "Live tracking"}</Text>
            <Text style={styles.subtitle}>
              {workerTrackingMode
                ? "Send your live position while the job is active"
                : `${workerName} is moving in real time`}
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>{modeLabel}</Text>
          </View>
        </View>

        <View style={styles.bookingBadge}>
          <Text style={styles.bookingBadgeLabel}>Booking ID</Text>
          <Text style={styles.bookingBadgeValue}>{bookingLabel}</Text>
        </View>

        {workerTrackingMode ? (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Tracking status</Text>
            <Text style={styles.permissionText}>
              {permissionStatus === "granted"
                ? "Your live location is being sent to the backend."
                : permissionStatus === "denied"
                ? "Enable location access to keep sending updates."
                : "Preparing live location updates..."}
            </Text>
          </View>
        ) : null}

        {snapshotLoading ? <Text style={styles.snapshotHint}>Fetching live snapshot from backend...</Text> : null}
        {trackingError ? <Text style={styles.snapshotHint}>{trackingError}</Text> : null}

        <View style={styles.mapCard}>
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, styles.routeDotStart]} />
          <View style={[styles.routeDot, styles.routeDotMidA]} />
          <View style={[styles.routeDot, styles.routeDotMidB]} />
          <View style={[styles.routeDot, styles.routeDotEnd]} />

          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ translateX: markerX }, { translateY: markerY }, { scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.workerPin,
              {
                transform: [{ translateX: markerX }, { translateY: markerY }],
              },
            ]}
          >
            <Text style={styles.workerPinText}>{workerTrackingMode ? "📍" : "🛵"}</Text>
          </Animated.View>

          <View style={styles.mapLegend}>
            <Text style={styles.mapLegendLabel}>{trackingSnapshot?.label || livePoint.label}</Text>
            <Text style={styles.mapLegendValue}>{trackingSnapshot?.subtitle || livePoint.subtitle}</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ETA</Text>
            <Text style={styles.infoValue}>{etaText}</Text>
          </View>
          <View style={[styles.infoCard, styles.infoCardSpacing]}>
            <Text style={styles.infoLabel}>State</Text>
            <Text style={styles.infoValue}>{currentStatus}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Current zone</Text>
          <Text style={styles.detailValue}>{liveLabel}</Text>
          <Text style={styles.detailMeta}>{lastUpdate}</Text>
        </View>

        <View style={styles.stepRow}>
          {routePoints.map((point, index) => (
            <View key={point.label} style={styles.stepItem}>
              <View style={[styles.stepDot, index <= stepIndex && styles.stepDotActive]} />
              <Text style={[styles.stepText, index === stepIndex && styles.stepTextActive]}>{point.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => navigation.navigate("Chat", { bookingId, workerName: worker?.name || workerName })}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Open chat</Text>
          </Pressable>
          {workerTrackingMode ? (
            <Pressable
              onPress={() => navigation.navigate("BookingDetails", { bookingId, booking })}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>Job details</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1e8",
    padding: 16,
    justifyContent: "center",
  },
  topGlow: {
    position: "absolute",
    right: -60,
    top: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  card: {
    backgroundColor: "#12352d",
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 6,
  },
  subtitle: {
    color: "#cbd5e1",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
    marginRight: 6,
  },
  liveBadgeText: {
    color: "#14532d",
    fontWeight: "900",
    fontSize: 12,
  },
  bookingBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  bookingBadgeLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bookingBadgeValue: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },
  permissionCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  permissionTitle: {
    color: "#fff",
    fontWeight: "900",
    marginBottom: 4,
  },
  permissionText: {
    color: "#cbd5e1",
    lineHeight: 18,
  },
  mapCard: {
    height: 220,
    borderRadius: 24,
    backgroundColor: "#f8fafc",
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
  },
  routeLine: {
    position: "absolute",
    left: 34,
    right: 34,
    top: 114,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.22)",
  },
  routeDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#16a34a",
  },
  routeDotStart: {
    left: 28,
    top: 108,
  },
  routeDotMidA: {
    left: 114,
    top: 76,
  },
  routeDotMidB: {
    left: 200,
    top: 118,
  },
  routeDotEnd: {
    right: 28,
    top: 68,
  },
  pulseRing: {
    position: "absolute",
    left: -12,
    top: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#16a34a",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  workerPin: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  workerPinText: {
    fontSize: 18,
  },
  mapLegend: {
    position: "absolute",
    left: 16,
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
  },
  mapLegendLabel: {
    color: "#0f172a",
    fontWeight: "900",
    marginBottom: 4,
  },
  mapLegendValue: {
    color: "#64748b",
    fontSize: 12,
  },
  snapshotHint: {
    color: "#cbd5e1",
    fontSize: 12,
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  infoCardSpacing: {
    marginLeft: 10,
  },
  infoLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  detailCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  detailLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  detailValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  detailMeta: {
    color: "#94a3b8",
    fontSize: 12,
  },
  stepRow: {
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginRight: 10,
  },
  stepDotActive: {
    backgroundColor: "#dcfce7",
  },
  stepText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
  },
  stepTextActive: {
    color: "#fff",
  },
  actionRow: {
    gap: 10,
  },
  button: {
    backgroundColor: "#dcfce7",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    color: "#14532d",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});
