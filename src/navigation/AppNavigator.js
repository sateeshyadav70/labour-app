import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import HomeScreen from "../screens/Home/HomeScreen";
import WorkerListScreen from "../screens/Worker/WorkerList";
import WorkerDetailsScreen from "../screens/Worker/WorkerProfile";
import ServiceDetailScreen from "../screens/Service/ServiceDetailScreen";
import BookingScreen from "../screens/Booking/BookingScreen";
import CartScreen from "../screens/Booking/CartScreen";
import WishlistScreen from "../screens/Booking/WishlistScreen";
import LiveTrackingScreen from "../screens/Tracking/LiveTracking";
import ChatScreen from "../screens/Chat/ChatScreen";
import PaymentScreen from "../screens/Payment/PaymentScreen.js";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import WorkerHomeScreen from "../screens/Home/WorkerHome";
import BookingRequestsScreen from "../screens/Booking/BookingRequests";
import BookingDetailsScreen from "../screens/Booking/BookingDetails";
import WorkerEarningsScreen from "../screens/Earnings/EarningsScreen";
import WorkerAccountScreen from "../screens/Profile/WorkerProfileScreen";
import { AuthProvider, useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

function NavigatorStack() {
  const { isAuthenticated, isReady, signOut, session, accountType } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  const resolvedAccountType = accountType || session?.accountType || "user";

  const commonScreenOptions = {
    headerStyle: { backgroundColor: "#0f172a" },
    headerTintColor: "#ffffff",
    headerTitleAlign: "center",
    headerTitle: "Fixora",
    contentStyle: { backgroundColor: "#f8fafc" },
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={isAuthenticated ? resolvedAccountType : "auth"}
        screenOptions={commonScreenOptions}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} />}
            </Stack.Screen>
            <Stack.Screen name="Register" options={{ headerShown: false }}>
              {(props) => <RegisterScreen {...props} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: "Service Details" }} />
            <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: "Wishlist" }} />
            <Stack.Screen name="Cart" component={CartScreen} options={{ title: "Cart" }} />

            {resolvedAccountType === "worker" ? (
              <>
                <Stack.Screen name="WorkerHome" options={{ headerShown: false }}>
                  {(props) => <WorkerHomeScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="BookingRequests" options={{ headerShown: false }}>
                  {(props) => <BookingRequestsScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="BookingDetails" options={{ headerShown: false }}>
                  {(props) => <BookingDetailsScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="LiveTracking" options={{ headerShown: false }}>
                  {(props) => <LiveTrackingScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="Earnings" options={{ headerShown: false }}>
                  {(props) => <WorkerEarningsScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="Profile" options={{ headerShown: false }}>
                  {(props) => <WorkerAccountScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
              </>
            ) : (
              <>
                <Stack.Screen name="Home" options={{ headerShown: false }}>
                  {(props) => <HomeScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="Profile" options={{ headerShown: false }}>
                  {(props) => <ProfileScreen {...props} onLogout={signOut} />}
                </Stack.Screen>
                <Stack.Screen name="Workers" component={WorkerListScreen} options={{ title: "Workers" }} />
                <Stack.Screen name="WorkerProfile" component={WorkerDetailsScreen} options={{ title: "Worker Details" }} />
                <Stack.Screen name="Booking" component={BookingScreen} options={{ title: "Booking" }} />
                <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payment" }} />
                <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} options={{ title: "Tracking" }} />
                <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigatorStack />
    </AuthProvider>
  );
}
