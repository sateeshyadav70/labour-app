import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
} from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";
import ServiceCard from "../../components/ServiceCard";
import ProfileAvatar from "../../components/ProfileAvatar";
import { getFallbackServices, loadServices } from "../../data/serviceCatalog";
import { resolveProfileImage } from "../../utils/profileImage";

const getLocationLabel = async (coords) => {
  try {
    const places = await Location.reverseGeocodeAsync(coords);
    const place = places?.[0];

    if (!place) {
      return `Lat ${coords.latitude.toFixed(3)}, Lng ${coords.longitude.toFixed(3)}`;
    }

    const parts = [place.city, place.region].filter(Boolean);
    return parts.length ? parts.join(", ") : `Lat ${coords.latitude.toFixed(3)}, Lng ${coords.longitude.toFixed(3)}`;
  } catch (_error) {
    return `Lat ${coords.latitude.toFixed(3)}, Lng ${coords.longitude.toFixed(3)}`;
  }
};

export default function HomeScreen({ navigation, onLogout }) {
  const { currentUser } = useAuth();
  const [locationLabel, setLocationLabel] = useState("Fetching your location...");
  const [locationState, setLocationState] = useState("loading");
  const [services, setServices] = useState(() => getFallbackServices());
  const userName = currentUser?.name || "Fixora User";
  const userImage = resolveProfileImage(currentUser || {}, userName);

  useEffect(() => {
    let mounted = true;

    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) {
            setLocationLabel("Location permission denied");
            setLocationState("denied");
          }
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const label = await getLocationLabel(current.coords);
        if (mounted) {
          setLocationLabel(label);
          setLocationState("ready");
        }
      } catch (_error) {
        if (mounted) {
          setLocationLabel("Location unavailable");
          setLocationState("error");
        }
      }
    };

    fetchLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchServices = async () => {
      const list = await loadServices();
      if (!mounted) {
        return;
      }

      setServices(list);
    };

    fetchServices();

    return () => {
      mounted = false;
    };
  }, []);

  const renderService = ({ item }) => (
      <ServiceCard
        title={item.title}
        color={item.color}
        ratePerHour={item.ratePerHour}
        badgeText={item.badgeText}
        serviceId={item.illustrationKey || item.id}
        imageUri={item.image}
        onPress={() =>
          navigation.navigate("ServiceDetail", {
            service: item,
            serviceId: item.id,
            serviceTitle: item.title,
          })
        }
      />
  );

  const ServiceHeader = () => (
    <View>
      <View style={styles.heroPanel}>
        <View style={styles.heroAccent} />
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Premium home help</Text>
          </View>
          <View style={styles.heroMiniPill}>
            <Text style={styles.heroMiniPillText}>Fast booking</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>A cleaner way to book trusted workers</Text>
        <Text style={styles.heroSubtitle}>
          Soft, modern service cards inspired by your reference with a calm, premium home theme.
        </Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Verified pros</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Same day slots</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>From ₹129/hr</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>Popular now</Text>
        </View>
        <Text style={styles.sectionTitle}>Choose a service</Text>
        <Text style={styles.sectionSubtitle}>
          Each card uses a mini illustration, soft shadow, and quick add action.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />
      <View style={styles.bgOrbC} />

      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>Fixora</Text>
            <Text style={styles.brandSub}>Home services with a softer premium feel</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.profileButton}>
            <ProfileAvatar
              name={userName}
              imageUri={userImage}
              size={34}
              borderRadius={12}
              backgroundColor="#fff"
              fallbackColor="#12352d"
              showRing={false}
              style={styles.profileAvatar}
            />
            <Text style={styles.profileButtonText}>Profile</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.locationSticky}>
        <View style={styles.locationBar}>
          <View style={styles.locationIcon}>
            <View style={styles.locationDot} />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>Your location</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {locationLabel}
            </Text>
          </View>
          {locationState === "loading" ? <ActivityIndicator color="#ea580c" /> : null}
        </View>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={renderService}
        numColumns={2}
        style={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ServiceHeader}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1e8",
    position: "relative",
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
    top: 180,
    left: -80,
  },
  bgOrbC: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(251, 191, 36, 0.10)",
    bottom: 200,
    right: -50,
  },
  fixedHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 12) + 8 : 12,
    paddingBottom: 10,
    backgroundColor: "transparent",
    zIndex: 20,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandBlock: {
    flex: 1,
    paddingRight: 12,
    paddingTop: 6,
  },
  brand: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  brandSub: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
  },
  locationSticky: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: Platform.OS === "android" ? 4 : 0,
    zIndex: 15,
    elevation: 3,
  },
  profileButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
  },
  profileButtonText: {
    color: "#fff",
    fontWeight: "800",
    marginLeft: 8,
  },
  profileAvatar: {
    marginLeft: -2,
  },
  locationBar: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16a34a",
    shadowColor: "#16a34a",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  locationTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  locationLabel: {
    color: "#ea580c",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  locationValue: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  heroPanel: {
    borderRadius: 30,
    backgroundColor: "#12352d",
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  heroAccent: {
    position: "absolute",
    right: -20,
    top: -25,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: "#dcfce7",
    fontSize: 12,
    fontWeight: "800",
  },
  heroMiniPill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 8,
  },
  heroMiniPillText: {
    color: "#14532d",
    fontSize: 12,
    fontWeight: "800",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginBottom: 8,
    maxWidth: 320,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    lineHeight: 21,
    marginBottom: 14,
    maxWidth: 320,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    marginBottom: 14,
    paddingTop: 2,
  },
  sectionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 10,
  },
  sectionBadgeText: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: "#64748b",
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
});
