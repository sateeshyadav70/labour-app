import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import { apiPost, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";

// ✅ FIX 1: BASE URL ADD


const buildSession = (payload) => {
  const normalized = unwrapApiResponse(payload) || payload || {};
  const token = normalized.token || normalized?.data?.token || null;
  const user = normalized.user || normalized.data?.user || null;

  return {
    token,
    accountType: "user",
    user: user || normalized,
    worker: null,
  };
};

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Email aur password dono bharo.");
      return;
    }

    setLoading(true);

    try {
      console.log("LOGIN URL via apiPost: auth/login");
      const response = await apiPost("auth/login", {
        email: email.trim(),
        password,
      });

      const session = buildSession(response);

      if (!session.token) {
        throw new Error("Token missing from response");
      }

      signIn(session);
    } catch (error) {
      Alert.alert(
        "Login failed",
        getApiErrorMessage(error, "Server not reachable")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.brandBlock}>
            <Text style={styles.badge}>Fixora</Text>
            <Text style={styles.title}>Sign in to your account</Text>
          </View>
          <ProfileAvatar
            name="Fixora"
            size={58}
            borderRadius={20}
            backgroundColor="#ffffff"
            fallbackColor="#12352d"
            showRing={false}
            style={styles.heroAvatar}
          />
        </View>
        <Text style={styles.subtitle}>
          Access your bookings, saved addresses, and live support in one calm premium experience.
        </Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Secure login</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Fast booking</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>24/7 support</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          style={styles.input}
        />

        <Pressable onPress={login} style={styles.button}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation?.navigate("Register")}
          style={styles.registerLink}
        >
          <Text style={styles.registerLinkText}>Create a new account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 20,
    justifyContent: "center",
  },
  hero: {
    marginBottom: 24,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  brandBlock: {
    flex: 1,
    paddingRight: 10,
  },
  heroAvatar: {
    marginTop: 4,
  },
  badge: {
    color: "#38bdf8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 10,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  bgOrbA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    top: -50,
    right: -60,
  },
  bgOrbB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    bottom: 120,
    left: -60,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
  },
  sectionLabel: {
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "800",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  helperText: {
    marginTop: 12,
    color: "#64748b",
    lineHeight: 18,
    fontSize: 12,
  },
  registerLink: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 6,
  },
  registerLinkText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
});
