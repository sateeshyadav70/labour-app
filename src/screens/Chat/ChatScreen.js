import React, { useEffect, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { connectAppSocket, disconnectAppSocket } from "../../utils/socket";

export default function ChatScreen({ route }) {
  const { authToken, currentUser, accountType } = useAuth();
  const { bookingId, workerName } = route.params || {};
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "1", text: `Chat started with ${workerName || "worker"}`, mine: false },
  ]);

  useEffect(() => {
    if (!authToken || !bookingId) {
      return undefined;
    }

    const socket = connectAppSocket(authToken);

    const handleMessage = (payload) => {
      if (!payload || String(payload.bookingId || "") !== String(bookingId)) {
        return;
      }

      const mine = String(payload.senderId || payload.sender || "") === String(currentUser?._id || currentUser?.id || "");
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random()}`,
          text: payload.message,
          mine,
        },
      ]);
    };

    socket.emit("joinBookingRoom", bookingId);
    socket.on("receiveMessage", handleMessage);
    socket.on("chat:message", handleMessage);

    return () => {
      socket.off("receiveMessage", handleMessage);
      socket.off("chat:message", handleMessage);
      disconnectAppSocket();
    };
  }, [authToken, bookingId, currentUser]);

  const sendMessage = () => {
    if (!message.trim() || !bookingId) {
      return;
    }

    const outgoing = message.trim();
    const socket = connectAppSocket(authToken);

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}`, text: outgoing, mine: true },
    ]);

    socket.emit("sendMessage", {
      bookingId,
      message: outgoing,
      senderId: currentUser?._id || currentUser?.id || null,
      senderType: accountType === "worker" ? "worker" : "user",
      senderModel: accountType === "worker" ? "Worker" : "User",
      createdAt: new Date().toISOString(),
    });

    setMessage("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.mine ? styles.mine : styles.other]}>
            <Text style={[styles.text, item.mine && styles.mineText]}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <Pressable onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  list: {
    padding: 16,
    paddingBottom: 20,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 10,
    maxWidth: "80%",
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: "#0f172a",
  },
  other: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
  },
  text: {
    color: "#0f172a",
  },
  mineText: {
    color: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  sendButton: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  sendText: {
    color: "#fff",
    fontWeight: "700",
  },
});
