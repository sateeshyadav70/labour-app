import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ProfileAvatar from "../../components/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { addCartItem, loadWishlist, toggleWishlistItem } from "../../utils/savedItemsApi";

export default function WishlistScreen({ navigation }) {
  const { authToken } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);

  const navigateTo = (routeName, params) => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate(routeName, params);
      return;
    }
    navigation.navigate(routeName, params);
  };

  useEffect(() => {
    let mounted = true;

    const loadItems = async () => {
      try {
        const items = await loadWishlist(authToken);
        if (mounted) {
          setWishlistItems(items);
        }
      } catch (_error) {
        if (mounted) {
          setWishlistItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (authToken) {
      loadItems();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [authToken]);

  const removeItem = async (item) => {
    setWorkingId(item.id);
    try {
      const result = await toggleWishlistItem(item, authToken);
      setWishlistItems(result.wishlistItems || []);
    } catch (error) {
      Alert.alert("Remove failed", error.message || "Wishlist remove nahi ho paya.");
    } finally {
      setWorkingId(null);
    }
  };

  const moveToCart = async (item) => {
    setWorkingId(item.id);
    try {
      const result = await addCartItem(item, authToken);
      await toggleWishlistItem(item, authToken);
      setWishlistItems((prev) => prev.filter((entry) => String(entry.id) !== String(item.id)));
      navigateTo("Cart", { highlightItemId: result.item?.id || null });
    } catch (error) {
      Alert.alert("Cart failed", error.message || "Cart me move nahi ho paya.");
    } finally {
      setWorkingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <ProfileAvatar
          name={item.workerName || item.serviceTitle}
          imageUri={item.image || null}
          size={56}
          borderRadius={18}
          backgroundColor="#fff"
          fallbackColor="#0f172a"
          showRing={false}
        />
        <View style={styles.textWrap}>
          <Text style={styles.title}>{item.serviceTitle || "Service"}</Text>
          <Text style={styles.meta}>{item.workerName || "Worker"}</Text>
          <Text style={styles.price}>₹{item.hourlyRate || 0}/hr</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => moveToCart(item)} disabled={workingId === item.id}>
          <Text style={styles.primaryButtonText}>
            {workingId === item.id ? "..." : "Add to Cart"}
          </Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => removeItem(item)} disabled={workingId === item.id}>
          <Text style={styles.secondaryButtonText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.titleMain}>Wishlist</Text>
        <Text style={styles.subtitle}>Saved services ko yahan rakho aur cart me bhejo jab book karna ho.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#0f172a" />
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No saved items yet</Text>
              <Text style={styles.emptyText}>Worker profile pe heart icon dabao.</Text>
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
    backgroundColor: "#f5f7fb",
  },
  hero: {
    backgroundColor: "#0f172a",
    padding: 18,
    paddingTop: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  backText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  titleMain: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#cbd5e1",
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  meta: {
    color: "#334155",
    fontWeight: "700",
    marginBottom: 2,
  },
  price: {
    color: "#64748b",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#0f766e",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "800",
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
});
