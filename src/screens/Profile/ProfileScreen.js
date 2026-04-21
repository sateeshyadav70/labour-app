import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import { resolveProfileImage } from "../../utils/profileImage";

function ProfileItem({ icon, title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <View style={styles.itemIcon}>
        <Text style={styles.itemIconText}>{icon}</Text>
      </View>
      <View style={styles.itemTextWrap}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen({ navigation, onLogout }) {
  const { currentUser } = useAuth();
  const accountName = currentUser?.name || "Fixora User";
  const accountEmail = currentUser?.email || "Member of Fixora home services";
  const accountImage = resolveProfileImage(currentUser, accountName);
  const supportText = "Call us at +91-98765-43210 or email help@fixora.in";

  const navigateTo = (routeName, params) => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate(routeName, params);
      return;
    }
    navigation.navigate(routeName, params);
  };

  const showInfo = (title, message) => {
    Alert.alert(title, message);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>
          <ProfileAvatar
            name={accountName}
            imageUri={accountImage}
            size={60}
            borderRadius={20}
            backgroundColor="#ffffff"
            fallbackColor="#12352d"
            showRing={false}
          />
        </View>
        <Text style={styles.brand}>Fixora</Text>
        <Text style={styles.title}>Account & Support</Text>
        <Text style={styles.subtitle}>
          Manage bookings, saved addresses, policies, and help from one calm, premium screen.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.profileRow}>
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileName}>{accountName}</Text>
            <Text style={styles.profileMeta}>{accountEmail}</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>Active</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ProfileItem
          icon="♥"
          title="Wishlist"
          subtitle="Saved workers and services"
          onPress={() => navigateTo("Wishlist")}
        />
        <ProfileItem
          icon="🛒"
          title="Cart"
          subtitle="Multiple services before checkout"
          onPress={() => navigateTo("Cart")}
        />
        <ProfileItem
          icon="💳"
          title="Payment History"
          subtitle="View Razorpay payments and booking links"
          onPress={() => navigateTo("Payment")}
        />
        <ProfileItem
          icon="📦"
          title="Your Booking"
          subtitle="View recent and ongoing service bookings"
          onPress={() => showInfo("Your Booking", "Booking history screen is coming soon.")}
        />
        <ProfileItem
          icon="📍"
          title="Address Book"
          subtitle="Save home, office, and other addresses"
          onPress={() => showInfo("Address Book", "Address book screen is coming soon.")}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company</Text>
        <ProfileItem
          icon="ℹ️"
          title="About Us"
          subtitle="Know more about Fixora and our service promise"
          onPress={() =>
            showInfo(
              "About Us",
              "Fixora connects households with trusted local service workers for fast, reliable home help."
            )
          }
        />
        <ProfileItem
          icon="🛡️"
          title="Policy"
          subtitle="Privacy, safety, and service policy"
          onPress={() =>
            showInfo(
              "Policy",
              "We keep your basic booking data, use location only to find nearby workers, and follow service-safety rules."
            )
          }
        />
        <ProfileItem
          icon="📄"
          title="Terms and Conditions"
          subtitle="Usage rules and service terms"
          onPress={() =>
            showInfo(
              "Terms and Conditions",
              "By using Fixora, you agree to service availability, fair usage, and payment terms defined by the platform."
            )
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help</Text>
        <ProfileItem
          icon="💬"
          title="Help and Support"
          subtitle="Chat, call, or email our support team"
          onPress={() => showInfo("Help and Support", supportText)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session</Text>
        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
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
    top: 260,
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
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  brand: {
    color: "#dcfce7",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    lineHeight: 21,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#14532d",
    fontSize: 16,
    fontWeight: "900",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 22,
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
    marginBottom: 8,
  },
  profileName: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  profileMeta: {
    color: "#64748b",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  profileTextWrap: {
    flex: 1,
  },
  profileBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileBadgeText: {
    color: "#14532d",
    fontWeight: "900",
    fontSize: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  itemPressed: {
    opacity: 0.92,
  },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemIconText: {
    fontSize: 20,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 4,
  },
  itemSubtitle: {
    color: "#64748b",
    lineHeight: 18,
  },
  chevron: {
    color: "#16a34a",
    fontSize: 28,
    lineHeight: 28,
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
  },
  logoutPressed: {
    opacity: 0.92,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});
