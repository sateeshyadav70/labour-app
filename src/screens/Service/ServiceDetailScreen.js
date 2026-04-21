import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ProfileAvatar from "../../components/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { addCartItem, toggleWishlistItem } from "../../utils/savedItemsApi";

const { height } = Dimensions.get("window");

export default function ServiceDetailScreen({ navigation, route }) {
  const { authToken } = useAuth();
  const service = route.params?.service || null;
  const [savingCart, setSavingCart] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);

  const serviceTitle = service?.title || route.params?.serviceTitle || "Service";
  const servicePrice = Number(service?.ratePerHour || service?.price || 0);
  const serviceImage = service?.image || route.params?.image || null;

  const navigateTo = (routeName, params) => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate(routeName, params);
      return;
    }
    navigation.navigate(routeName, params);
  };

  const highlightCopy = useMemo(
    () => [
      "Verified workers",
      "Clean premium service",
      `From ₹${servicePrice}/hr`,
    ],
    [servicePrice]
  );

  const makePayload = () => ({
    serviceId: service?.id || service?.serviceId || null,
    serviceTitle,
    image: serviceImage,
    hourlyRate: servicePrice,
  });

  const handleAddToCart = async () => {
    if (!authToken) {
      Alert.alert("Login needed", "Cart ke liye pehle login karo.");
      return;
    }

    setSavingCart(true);
    try {
      await addCartItem(makePayload(), authToken);
      navigateTo("Cart");
    } catch (error) {
      Alert.alert("Cart failed", error.message || "Service cart me add nahi ho paya.");
    } finally {
      setSavingCart(false);
    }
  };

  const handleWishlist = async () => {
    if (!authToken) {
      Alert.alert("Login needed", "Wishlist ke liye pehle login karo.");
      return;
    }

    setSavingWishlist(true);
    try {
      await toggleWishlistItem(makePayload(), authToken);
      Alert.alert("Saved", "Service wishlist me add ho gayi.");
    } catch (error) {
      Alert.alert("Wishlist failed", error.message || "Wishlist update nahi ho paya.");
    } finally {
      setSavingWishlist(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.imageContainer}>
        {serviceImage ? (
          <Image source={{ uri: serviceImage }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.fallbackIcon}>🛠️</Text>
            <Text style={styles.fallbackTitle}>{serviceTitle}</Text>
          </View>
        )}

        <View style={styles.overlayTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>‹</Text>
          </Pressable>
          <Pressable onPress={handleWishlist} style={styles.iconButton}>
            {savingWishlist ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.iconButtonText}>♡</Text>}
          </Pressable>
        </View>

        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeLabel}>Starts from</Text>
          <Text style={styles.priceBadgeValue}>₹{servicePrice}/hr</Text>
        </View>
      </View>

      <View style={styles.contentCard}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{serviceTitle}</Text>
            <Text style={styles.subtitle}>{service?.description || "Trusted premium home service with clear pricing and quick booking."}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ 4.8</Text>
          </View>
        </View>

        <View style={styles.highlightRow}>
          {highlightCopy.map((item) => (
            <View key={item} style={styles.chip}>
              <Text style={styles.chipText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this service</Text>
          <Text style={styles.sectionText}>
            Book trusted workers for {serviceTitle.toLowerCase()}. Service details, clean visuals, and quick access to booking tools keep the flow easy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you get</Text>
          <View style={styles.bulletCard}>
            <Text style={styles.bullet}>• Transparent hourly pricing</Text>
            <Text style={styles.bullet}>• Verified worker options</Text>
            <Text style={styles.bullet}>• Add to cart or wishlist instantly</Text>
          </View>
        </View>

        <View style={styles.workerPreview}>
          <ProfileAvatar
            name={serviceTitle}
            imageUri={serviceImage}
            size={52}
            borderRadius={18}
            backgroundColor="#fff"
            fallbackColor="#0f172a"
            showRing={false}
          />
          <View style={styles.workerPreviewText}>
            <Text style={styles.workerPreviewTitle}>Need a worker right away?</Text>
            <Text style={styles.workerPreviewMeta}>Open the worker list for this service and pick your match.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              navigateTo("Workers", {
                service,
                serviceId: service?.id,
                serviceTitle,
              })
            }
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>View Workers</Text>
          </Pressable>

          <Pressable
            onPress={handleAddToCart}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            disabled={savingCart}
          >
            {savingCart ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Add to Cart</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    paddingBottom: 24,
  },
  imageContainer: {
    width: "100%",
    height: height * 0.42,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#dbe4ee",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  overlayTop: {
    position: "absolute",
    top: 44,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconButtonText: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  priceBadge: {
    position: "absolute",
    left: 20,
    bottom: 20,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  priceBadgeLabel: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  priceBadgeValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  contentCard: {
    backgroundColor: "#fff",
    marginTop: -18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.06)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748b",
  },
  ratingBadge: {
    backgroundColor: "#ecfeff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ratingText: {
    color: "#0f766e",
    fontWeight: "900",
    fontSize: 12,
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  chip: {
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  chipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  sectionText: {
    color: "#334155",
    lineHeight: 21,
  },
  bulletCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  bullet: {
    color: "#334155",
    lineHeight: 22,
    marginBottom: 4,
    fontWeight: "600",
  },
  workerPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  workerPreviewText: {
    flex: 1,
    marginLeft: 12,
  },
  workerPreviewTitle: {
    color: "#0f172a",
    fontWeight: "900",
    marginBottom: 4,
  },
  workerPreviewMeta: {
    color: "#64748b",
    lineHeight: 18,
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#0f766e",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#eef2ff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.92,
  },
});
