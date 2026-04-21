import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ProfileAvatar from "../../components/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import {
  addCartItem,
  loadCart,
  loadWishlist,
  toggleWishlistItem,
} from "../../utils/savedItemsApi";

const makeSavedPayload = (worker, serviceTitle, serviceImage) => ({
  workerId: worker?._id || worker?.id || worker?.workerId || null,
  workerName: worker?.name || null,
  serviceId: worker?.serviceId || worker?.serviceType || null,
  serviceTitle,
  image: serviceImage || worker?.images?.[0] || worker?.profileImage || null,
  rating: worker?.rating ?? null,
  hourlyRate: worker?.hourlyRate ?? worker?.price ?? 0,
});

const matchSavedItem = (item, workerId, serviceId) => {
  const savedWorkerId = String(item?.workerId || "");
  const savedServiceId = String(item?.serviceId || "");

  return (
    (workerId && savedWorkerId === String(workerId)) ||
    (serviceId && savedServiceId === String(serviceId))
  );
};

export default function WorkerProfileScreen({ navigation, route }) {
  const { authToken } = useAuth();
  const worker = route.params?.worker;
  const serviceTitle =
    route.params?.serviceTitle || worker?.serviceTitle || worker?.serviceType || worker?.serviceId || "Service";
  const serviceImage =
    route.params?.serviceImage ||
    route.params?.service?.image ||
    worker?.images?.[0] ||
    worker?.profileImage ||
    null;
  const hourlyRate = worker?.hourlyRate ?? worker?.price ?? 0;
  const heroSubtitle =
    worker?.about ||
    `${serviceTitle} handled by ${worker?.name || "this worker"} with attention to detail and premium finish.`;
  const secondaryHeroImage = worker?.images?.[1] || worker?.images?.[0] || null;
  const reviewItems = worker?.reviews?.length
    ? worker.reviews
    : ["Trusted local worker", "Quick response", "Quality work"];
  const packageOptions = [
    {
      name: "Classic",
      amount: hourlyRate,
      accent: "#0f172a",
      note: "Best for quick fixes",
    },
    {
      name: "Premium",
      amount: hourlyRate + 200,
      accent: "#0f766e",
      note: "Includes deeper attention",
      featured: true,
    },
    {
      name: "Platinum",
      amount: hourlyRate + 500,
      accent: "#7c3aed",
      note: "Top-tier finish",
    },
  ];
  const highlights = [
    `${worker?.experience || 0}+ years experience`,
    `★ ${worker?.rating || "4.8"} rating`,
    "Verified profile",
  ];
  const savedPayload = useMemo(() => makeSavedPayload(worker, serviceTitle, serviceImage), [worker, serviceTitle, serviceImage]);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [savingCart, setSavingCart] = useState(false);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [cartActive, setCartActive] = useState(false);

  const navigateTo = (routeName, params) => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate(routeName, params);
      return;
    }
    navigation.navigate(routeName, params);
  };

  useEffect(() => {
    let active = true;

    const loadSavedItems = async () => {
      if (!authToken || !worker) {
        return;
      }

      try {
        const [wishlistItems, cartItems] = await Promise.all([
          loadWishlist(authToken),
          loadCart(authToken),
        ]);

        if (!active) {
          return;
        }

        setWishlistActive(
          wishlistItems.some((item) => matchSavedItem(item, savedPayload.workerId, savedPayload.serviceId))
        );
        setCartActive(
          cartItems.some((item) => matchSavedItem(item, savedPayload.workerId, savedPayload.serviceId))
        );
      } catch (_error) {
        if (active) {
          setWishlistActive(false);
          setCartActive(false);
        }
      }
    };

    loadSavedItems();

    return () => {
      active = false;
    };
  }, [authToken, worker, savedPayload.workerId, savedPayload.serviceId]);

  if (!worker) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Worker not found</Text>
      </View>
    );
  }

  const handleWishlistToggle = async () => {
    if (!authToken) {
      Alert.alert("Login needed", "Wishlist ke liye pehle login karo.");
      return;
    }

    setSavingWishlist(true);
    try {
      const result = await toggleWishlistItem(savedPayload, authToken);
      setWishlistActive(Boolean(result.saved));
      Alert.alert(result.saved ? "Saved" : "Removed", result.saved ? "Wishlist me add ho gaya." : "Wishlist se remove ho gaya.");
    } catch (error) {
      Alert.alert("Wishlist failed", error.message || "Wishlist update nahi ho paya.");
    } finally {
      setSavingWishlist(false);
    }
  };

  const handleAddToCart = async () => {
    if (!authToken) {
      Alert.alert("Login needed", "Cart ke liye pehle login karo.");
      return;
    }

    setSavingCart(true);
    try {
      const result = await addCartItem(savedPayload, authToken);
      setCartActive(true);
      if (result.item?.id) {
        navigateTo("Cart", { highlightItemId: result.item.id });
      } else {
        navigateTo("Cart");
      }
    } catch (error) {
      Alert.alert("Cart failed", error.message || "Cart me add nahi ho paya.");
    } finally {
      setSavingCart(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topButton}>
          <Text style={styles.topButtonText}>‹</Text>
        </Pressable>
        <View style={styles.topBarRight}>
          <Pressable onPress={() => navigateTo("Cart")} style={styles.topButton}>
            <Text style={[styles.topButtonText, cartActive && styles.topButtonTextActive]}>🛒</Text>
          </Pressable>
          <Pressable onPress={handleWishlistToggle} style={styles.topButton} disabled={savingWishlist}>
            {savingWishlist ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Text style={[styles.topButtonText, wishlistActive && styles.topButtonTextActive]}>♥</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.heroBlock}>
        <View style={styles.heroImageFrame}>
          {serviceImage || secondaryHeroImage ? (
            <>
              <Image
                source={{ uri: serviceImage || secondaryHeroImage }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroImageShade} />
            </>
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroFallbackIcon}>🧰</Text>
              <Text style={styles.heroFallbackText}>{serviceTitle}</Text>
            </View>
          )}
          <View style={styles.heroTopLabel}>
            <Text style={styles.heroTopLabelText}>Premium service partner</Text>
          </View>
          <View style={styles.heroPriceBadge}>
            <Text style={styles.heroPriceValue}>₹{hourlyRate}</Text>
            <Text style={styles.heroPriceMeta}>per hour</Text>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <ProfileAvatar
              name={worker.name}
              imageUri={worker.profileImage || worker.avatar || worker.images?.[0] || null}
              size={64}
              borderRadius={20}
              backgroundColor="#fff"
              fallbackColor="#0f172a"
              ringColor="rgba(15, 118, 110, 0.14)"
              showRing
            />
            <View style={styles.profileHeaderText}>
              <Text style={styles.serviceTitle}>{serviceTitle}</Text>
              <Text style={styles.workerName}>{worker.name}</Text>
              <Text style={styles.subTitleLine}>
                {worker.about || "Careful work, honest pricing, and clean finishing."}
              </Text>
            </View>
          </View>

          <View style={styles.highlightRow}>
            {highlights.map((item) => (
              <View key={item} style={styles.highlightChip}>
                <Text style={styles.highlightChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.packageSection}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Choose a package</Text>
            <Text style={styles.sectionHint}>Simple pricing with a premium finish</Text>
          </View>
          <View style={styles.packageRow}>
            {packageOptions.map((item) => (
              <View
                key={item.name}
                style={[
                  styles.packageCard,
                  item.featured && styles.packageCardFeatured,
                  { borderColor: `${item.accent}22` },
                ]}
              >
                <Text style={[styles.packageName, { color: item.accent }]}>{item.name}</Text>
                <Text style={styles.packageAmount}>₹{item.amount}</Text>
                <Text style={styles.packageMeta}>/ hr</Text>
                <Text style={styles.packageNote}>{item.note}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.workerStrip}>
        <ProfileAvatar
          name={worker.name}
          imageUri={worker.profileImage || worker.avatar || worker.images?.[0] || null}
          size={56}
          borderRadius={18}
          backgroundColor="#ffffff"
          fallbackColor="#12352d"
          showRing={false}
        />
        <View style={styles.workerStripText}>
          <Text style={styles.workerStripName}>{worker.name}</Text>
          <Text style={styles.workerStripMeta}>
            {worker.experience ? `${worker.experience} years experience` : "Trusted local worker"}
          </Text>
        </View>
        <View style={styles.stripActions}>
          <Pressable style={styles.stripAction}>
            <Text style={styles.stripActionText}>📞</Text>
          </Pressable>
          <Pressable style={styles.stripAction}>
            <Text style={styles.stripActionText}>💬</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.sectionHint}>What this worker handles best</Text>
        </View>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>{heroSubtitle}</Text>
          <Text style={styles.aboutMeta}>
            {worker.previousWork?.length
              ? `Specialties: ${worker.previousWork.join(" • ")}`
              : "Specialized in premium service delivery and quick response."}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent Work</Text>
          <Text style={styles.sectionHint}>Recent work and on-site snapshots</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(worker.images || []).slice(0, 3).map((imageUrl) => (
            <View key={imageUrl} style={styles.imageCard}>
              <Image source={{ uri: imageUrl }} style={styles.image} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Text style={styles.sectionHint}>What customers are saying</Text>
        </View>
        {reviewItems.map((item) => (
          <View key={item} style={styles.reviewCard}>
            <Text style={styles.reviewText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.ctaCard}>
        <View style={styles.ctaTextWrap}>
          <Text style={styles.ctaLabel}>Build your cart</Text>
          <Text style={styles.ctaValue}>Add this service and book several workers together.</Text>
          <Text style={styles.ctaSubtext}>
            Book Now will stay visible, but cart checkout is the new primary flow.
          </Text>
          <View style={styles.ctaPillRow}>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaPillText}>Book Now</Text>
            </View>
            <View style={[styles.ctaPill, styles.ctaPillMuted]}>
              <Text style={styles.ctaPillText}>Multi-booking</Text>
            </View>
          </View>
        </View>
        <View style={styles.ctaActions}>
          <Pressable
            onPress={handleAddToCart}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            disabled={savingCart}
          >
            {savingCart ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{cartActive ? "Added to Cart" : "Add to Cart"}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => navigateTo("Cart")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View Cart</Text>
          </Pressable>
          <Pressable onPress={handleWishlistToggle} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>{wishlistActive ? "Remove Wishlist" : "Save to Wishlist"}</Text>
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
    padding: 16,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topBarRight: {
    flexDirection: "row",
    gap: 10,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  topButtonText: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 20,
  },
  topButtonTextActive: {
    color: "#dc2626",
  },
  heroBlock: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroImageFrame: {
    height: 260,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
    marginBottom: 14,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  heroFallbackIcon: {
    fontSize: 54,
    marginBottom: 8,
  },
  heroFallbackText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  heroImageShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.12)",
  },
  heroTopLabel: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroTopLabelText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "900",
  },
  heroPriceBadge: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#0f172a",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroPriceValue: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
  },
  heroPriceMeta: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "700",
  },
  profileCard: {
    marginBottom: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    padding: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  profileHeaderText: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 6,
  },
  workerName: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  subTitleLine: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },
  highlightChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  highlightChipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  packageSection: {
    marginTop: 2,
  },
  sectionHead: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  sectionHint: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
  },
  packageRow: {
    flexDirection: "row",
    gap: 10,
  },
  packageCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  packageCardFeatured: {
    backgroundColor: "#f0fdf4",
  },
  packageName: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  packageAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
  },
  packageMeta: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 8,
  },
  packageNote: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 18,
  },
  workerStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  workerStripText: {
    flex: 1,
    marginLeft: 12,
  },
  workerStripName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  workerStripMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  stripActions: {
    flexDirection: "row",
    gap: 8,
  },
  stripAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  stripActionText: {
    fontSize: 18,
  },
  section: {
    marginBottom: 18,
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  aboutText: {
    color: "#0f172a",
    lineHeight: 21,
    fontWeight: "600",
    marginBottom: 10,
  },
  aboutMeta: {
    color: "#64748b",
    lineHeight: 20,
    fontSize: 12,
  },
  imageCard: {
    width: 180,
    height: 128,
    borderRadius: 20,
    marginRight: 12,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#cbd5e1",
  },
  reviewCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  reviewText: {
    color: "#334155",
  },
  ctaCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  ctaTextWrap: {
    marginBottom: 14,
  },
  ctaLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  ctaValue: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 24,
    marginBottom: 6,
  },
  ctaSubtext: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
  },
  ctaPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  ctaPill: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  ctaPillMuted: {
    backgroundColor: "#e2e8f0",
  },
  ctaPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  ctaActions: {
    gap: 10,
  },
  button: {
    backgroundColor: "#0f766e",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#eef2ff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  linkButtonText: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
});
