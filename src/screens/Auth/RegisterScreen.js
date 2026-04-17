import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput } from "react-native";
import { useAuth } from "../../context/AuthContext";
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
      const response = await apiPost("/auth/register", {
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
      <Text style={styles.title}>Join Fixora</Text>
      <Text style={styles.subtitle}>Kaam book karne ke liye pehle backend account banao.</Text>

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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </Pressable>

      <Text style={styles.helperText}>This uses /api/auth/register and stores the JWT in AsyncStorage.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 18,
    lineHeight: 20,
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
