import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import { apiPost, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";

const buildSession = (payload) => {
  const normalized = unwrapApiResponse(payload) || payload || {};
  const token = normalized.token || normalized?.data?.token || null;
  const user = normalized.user || normalized.data?.user || null;

  return {
    token,
    accountType: normalized.accountType || "user",
    user: user || normalized,
    worker: null,
  };
};

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing fields", "Name, email aur password sab bharo.");
      return;
    }

    setLoading(true);
    try {
      console.log("REGISTER URL via apiPost: auth/register");
      const response = await apiPost("auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      const session = buildSession(response);

      if (!session.token) {
        throw new Error("Register response did not include a token.");
      }

      signIn(session);
    } catch (error) {
      Alert.alert("Registration failed", getApiErrorMessage(error, "Unable to create your account right now."));
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
            <Text style={styles.title}>Join Fixora</Text>
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
        <Text style={styles.subtitle}>Create your account and keep all bookings, addresses, and support in one place.</Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Quick signup</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Saved addresses</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Trusted workers</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Pressable onPress={register} style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
        </Pressable>
      </View>

      <Text style={styles.helperText}>This uses /api/auth/register and stores the JWT in AsyncStorage.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1e8",
    padding: 20,
    justifyContent: "center",
  },
  bgOrbA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    top: -40,
    right: -60,
  },
  bgOrbB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(14, 165, 233, 0.08)",
    bottom: 100,
    left: -50,
  },
  hero: {
    backgroundColor: "#12352d",
    borderRadius: 30,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
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
    color: "#dcfce7",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    marginBottom: 14,
    lineHeight: 21,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  helperText: {
    marginTop: 14,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
