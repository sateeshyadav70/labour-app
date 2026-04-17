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
import { apiPost, getApiErrorMessage, unwrapApiResponse } from "../../utils/api";

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
      const response = await apiPost("/auth/login", {
        email: email.trim(),
        password,
      });

      const session = buildSession(response);

      if (!session.token) {
        throw new Error("Login response did not include a token.");
      }

      signIn(session);
    } catch (error) {
      Alert.alert("Login failed", getApiErrorMessage(error, "Unable to open session right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.badge}>Fixora</Text>
        <Text style={styles.title}>Sign in to your account</Text>
        <Text style={styles.subtitle}>User login ke liye request `/api/auth/login` par jayegi aur session save hoga.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>User login</Text>
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

        <Pressable onPress={login} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </Pressable>

        <Text style={styles.helperText}>User login request `/api/auth/login` par jayegi aur session save hoga.</Text>

        <Pressable onPress={() => navigation.navigate("Register")} style={styles.registerLink}>
          <Text style={styles.registerLinkText}>Don't have an account? Register</Text>
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
