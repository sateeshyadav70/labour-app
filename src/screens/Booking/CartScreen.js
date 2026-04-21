import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import ProfileAvatar from "../../components/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { apiPost, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";
import { clearCart, loadCart, removeCartItem, updateCartItem } from "../../utils/savedItemsApi";

const buildBookingRequest = ({ item, date, address, notes, userLocation }) => ({
  workerId: item?.workerId || null,
  serviceId: item?.serviceId || null,
  serviceType: item?.serviceTitle || item?.serviceType || item?.serviceId || null,
  date,
  address,
  notes: notes || "",
  userLocation,
  estimatedAmount: (Number(item?.hourlyRate || item?.price || 0) * Number(item?.quantity || 1)) || null,
  workerName: item?.workerName || null,
});

const buildDraft = (item = {}, highlighted = false) => ({
  date: item.date ? String(item.date).slice(0, 10) : "",
  address: item.address || "",
  notes: item.notes || "",
  quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Number(item.quantity)) : 1,
  expanded: highlighted,
});

export default function CartScreen({ navigation, route }) {
  const { authToken } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Fetching location...");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const highlightItemId = route.params?.highlightItemId || null;

  const mergeDraftsFromItems = (items) => {
    setDrafts((prev) => {
      const next = {};

      for (const item of items || []) {
        const existing = prev[item.id] || {};
        next[item.id] = {
          ...buildDraft(item, String(item.id) === String(highlightItemId)),
          ...existing,
          quantity: Number.isFinite(Number(existing.quantity))
            ? Math.max(1, Number(existing.quantity))
            : Number.isFinite(Number(item.quantity))
            ? Math.max(1, Number(item.quantity))
            : 1,
          expanded:
            existing.expanded ??
            buildDraft(item, String(item.id) === String(highlightItemId)).expanded,
        };
      }

      return next;
    });
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialState = async () => {
      try {
        const items = await loadCart(authToken);
        if (!mounted) {
          return;
        }
        setCartItems(items);
        mergeDraftsFromItems(items);
      } catch (_error) {
        if (mounted) {
          setCartItems([]);
          setDrafts({});
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) {
            setLocationStatus("Location permission denied");
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
        }
      } catch (_error) {
        if (mounted) {
          setLocationStatus("Unable to fetch location");
        }
      }
    };

    if (authToken) {
      loadInitialState();
      loadLocation();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [authToken, highlightItemId]);

  useEffect(() => {
    if (cartItems.length) {
      mergeDraftsFromItems(cartItems);
    }
  }, [cartItems]);

  const totalAmount = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const quantity = Number(drafts[item.id]?.quantity || item.quantity || 1);
        return sum + Number(item?.hourlyRate || item?.price || 0) * Math.max(1, quantity);
      }, 0),
    [cartItems, drafts]
  );

  const updateDraft = (itemId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || buildDraft(cartItems.find((item) => String(item.id) === String(itemId)) || {})),
        ...patch,
      },
    }));
  };

  const toggleItemEditor = (itemId) => {
    updateDraft(itemId, { expanded: !drafts[itemId]?.expanded });
  };

  const handleQuantityChange = (itemId, delta) => {
    const current = Number(drafts[itemId]?.quantity || 1);
    updateDraft(itemId, { quantity: Math.max(1, current + delta) });
  };

  const removeItem = async (itemId) => {
    try {
      const nextItems = await removeCartItem(itemId, authToken);
      setCartItems(nextItems);
      mergeDraftsFromItems(nextItems);
    } catch (error) {
      Alert.alert("Remove failed", getApiErrorMessage(error, "Item remove nahi ho paya."));
    }
  };

  const saveItemDraft = async (item) => {
    const draft = drafts[item.id] || buildDraft(item);

    try {
      const response = await updateCartItem(
        item.id,
        {
          date: draft.date || null,
          address: draft.address || "",
          notes: draft.notes || "",
          quantity: Number.isFinite(Number(draft.quantity)) ? Math.max(1, Number(draft.quantity)) : 1,
        },
        authToken
      );
      const nextItems = response.cartItems || [];
      setCartItems(nextItems);
      mergeDraftsFromItems(nextItems);
      Alert.alert("Saved", "Item details update ho gaye.");
    } catch (error) {
      Alert.alert("Save failed", getApiErrorMessage(error, "Item update nahi ho paya."));
    }
  };

  const checkoutAll = async () => {
    if (!cartItems.length) {
      Alert.alert("Cart empty", "Pehle cart me items add karo.");
      return;
    }

    if (!userLocation) {
      Alert.alert("Location needed", "Checkout ke liye current location allow karo.");
      return;
    }

    const unresolvedItem = cartItems.find((item) => {
      const draft = drafts[item.id] || buildDraft(item);
      const effectiveDate = draft.date || date;
      const effectiveAddress = draft.address || address;
      return !effectiveDate || !effectiveAddress;
    });

    if (unresolvedItem) {
      Alert.alert(
        "Missing item details",
        `${unresolvedItem.serviceTitle || unresolvedItem.workerName || "Ek item"} ke liye date ya address missing hai.`
      );
      return;
    }

    setCheckoutLoading(true);
    try {
      const createdBookings = [];

      for (const item of cartItems) {
        const draft = drafts[item.id] || buildDraft(item);
        const effectiveDate = draft.date || date;
        const effectiveAddress = draft.address || address;
        const effectiveNotes = draft.notes || notes;

        const response = await apiPost(
          "/booking",
          buildBookingRequest({
            item: {
              ...item,
              quantity: draft.quantity || item.quantity || 1,
            },
            date: effectiveDate,
            address: effectiveAddress,
            notes: effectiveNotes,
            userLocation,
          }),
          { token: authToken }
        );

        const payload = unwrapApiResponse(response) || response;
        const booking = payload?.booking || payload;
        if (!booking?._id && !booking?.bookingId && !booking?.id) {
          throw new Error("Booking create nahi ho paya.");
        }
        createdBookings.push(booking);
      }

      await clearCart(authToken);
      setCartItems([]);
      setDrafts({});

      Alert.alert("Bookings created", `${createdBookings.length} booking requests create ho gayi hain.`);
      navigation.navigate("Home");
    } catch (error) {
      Alert.alert("Checkout failed", getApiErrorMessage(error, "Cart checkout nahi ho paya."));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderItem = (item) => {
    const isHighlighted = highlightItemId && String(highlightItemId) === String(item.id);
    const draft = drafts[item.id] || buildDraft(item);
    const itemTotal = Number(item?.hourlyRate || item?.price || 0) * Math.max(1, Number(draft.quantity || 1));

    return (
      <View key={String(item.id)} style={[styles.itemCard, isHighlighted && styles.itemCardHighlight]}>
        <View style={styles.itemRow}>
          <ProfileAvatar
            name={item.workerName || item.serviceTitle}
            imageUri={item.image || null}
            size={56}
            borderRadius={18}
            backgroundColor="#fff"
            fallbackColor="#0f172a"
            showRing={false}
          />
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{item.serviceTitle || "Service"}</Text>
            <Text style={styles.itemName}>{item.workerName || "Worker"}</Text>
            <Text style={styles.itemMeta}>₹{item.hourlyRate || item.price || 0}/hr</Text>
          </View>
          <View style={styles.itemTotal}>
            <Text style={styles.itemTotalLabel}>Total</Text>
            <Text style={styles.itemTotalValue}>₹{itemTotal}</Text>
          </View>
        </View>

        <View style={styles.controlRow}>
          <Pressable style={styles.editorButton} onPress={() => toggleItemEditor(item.id)}>
            <Text style={styles.editorButtonText}>{draft.expanded ? "Hide Edit" : "Edit"}</Text>
          </Pressable>
          <Pressable style={styles.removeButton} onPress={() => removeItem(item.id)}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </Pressable>
        </View>

        {draft.expanded ? (
          <View style={styles.editorCard}>
            <Text style={styles.editorLabel}>Item date</Text>
            <TextInput
              value={String(draft.date || "")}
              onChangeText={(value) => updateDraft(item.id, { date: value })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.editorLabel}>Item address</Text>
            <TextInput
              value={String(draft.address || "")}
              onChangeText={(value) => updateDraft(item.id, { address: value })}
              placeholder="Full address"
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textArea]}
              multiline
            />

            <Text style={styles.editorLabel}>Item notes</Text>
            <TextInput
              value={String(draft.notes || "")}
              onChangeText={(value) => updateDraft(item.id, { notes: value })}
              placeholder="Special instructions"
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textAreaSmall]}
              multiline
            />

            <View style={styles.qtyHeader}>
              <Text style={styles.editorLabel}>Quantity</Text>
              <Text style={styles.qtyHint}>Useful for duplicate visits or extra rooms</Text>
            </View>
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyButton} onPress={() => handleQuantityChange(item.id, -1)}>
                <Text style={styles.qtyButtonText}>−</Text>
              </Pressable>
              <View style={styles.qtyValueBox}>
                <Text style={styles.qtyValue}>{Number(draft.quantity || 1)}</Text>
              </View>
              <Pressable style={styles.qtyButton} onPress={() => handleQuantityChange(item.id, 1)}>
                <Text style={styles.qtyButtonText}>+</Text>
              </Pressable>
            </View>

            <Pressable style={styles.saveButton} onPress={() => saveItemDraft(item)}>
              <Text style={styles.saveButtonText}>Save Item</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.itemSummaryRow}>
            <Text style={styles.itemSummaryText}>
              {draft.date ? `Date: ${draft.date}` : "No item date"} •{" "}
              {draft.address ? "Custom address" : "Uses shared address"} •{" "}
              {draft.notes ? "Notes added" : "No notes"} • Qty {Number(draft.quantity || 1)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.topButton}>
              <Text style={styles.topButtonText}>‹</Text>
            </Pressable>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{cartItems.length} items</Text>
            </View>
          </View>
          <Text style={styles.title}>Your Cart</Text>
          <Text style={styles.subtitle}>
            Multiple services ko ek saath book karo. Har item ka date aur edit alag rakh sakte ho.
          </Text>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Shared checkout details</Text>
          <Text style={styles.sectionHint}>Ye details sirf fallback hain, item-level edits override kar sakte hain.</Text>

          <Text style={styles.formLabel}>Default service date</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Default address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Full address"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Text style={styles.formLabel}>Default notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.textAreaSmall]}
            multiline
          />

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Location</Text>
            <Text style={styles.tipText}>{locationStatus}</Text>
          </View>
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Saved services</Text>
            <Text style={styles.sectionHint}>Tap edit to open per-item controls.</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#0f172a" />
            </View>
          ) : cartItems.length > 0 ? (
            cartItems.map((item) => renderItem(item))
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Cart is empty</Text>
              <Text style={styles.emptyText}>Worker profile se services add karo.</Text>
            </View>
          )}
        </View>

        <View style={styles.footerCard}>
          <View>
            <Text style={styles.footerLabel}>Total services</Text>
            <Text style={styles.footerValue}>{cartItems.length}</Text>
          </View>
          <Pressable
            onPress={checkoutAll}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Book All</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 24,
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
    bottom: 120,
    left: -50,
  },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 28,
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
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  topButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  countBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  countBadgeText: {
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
    marginBottom: 14,
  },
  totalCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  totalLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
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
    minHeight: 96,
    textAlignVertical: "top",
  },
  textAreaSmall: {
    minHeight: 72,
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
  listSection: {
    marginBottom: 14,
  },
  listHeader: {
    marginBottom: 8,
  },
  loadingWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 12,
  },
  itemCardHighlight: {
    borderColor: "rgba(15, 118, 110, 0.2)",
    backgroundColor: "#f0fdfa",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 3,
  },
  itemName: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  itemTotal: {
    alignItems: "flex-end",
  },
  itemTotalLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  itemTotalValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  controlRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  editorButton: {
    flex: 1,
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  editorButtonText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 13,
  },
  removeButton: {
    flex: 1,
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  removeButtonText: {
    color: "#b91c1c",
    fontWeight: "800",
    fontSize: 13,
  },
  editorCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  editorLabel: {
    color: "#0f172a",
    fontWeight: "800",
    marginBottom: 8,
  },
  qtyHeader: {
    marginTop: 2,
  },
  qtyHint: {
    color: "#64748b",
    fontSize: 11,
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  qtyButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  qtyButtonText: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  qtyValueBox: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  qtyValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  saveButton: {
    backgroundColor: "#0f766e",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  itemSummaryRow: {
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
    padding: 12,
  },
  itemSummaryText: {
    color: "#64748b",
    lineHeight: 18,
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: {
    color: "#64748b",
  },
  footerCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  footerValue: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
  },
  button: {
    backgroundColor: "#0f766e",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 120,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
