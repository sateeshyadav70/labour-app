# Fixora

Expo + React Native UI for a labour/service booking app.

## What is included

- Auth flow: Login and Register
- Home services list
- Worker list and profile
- Booking flow
- Local tracking preview
- Local chat preview
- Local payment preview

## Correct setup steps

1. Create the app

```bash
npx create-expo-app labour-app
cd labour-app
```

2. Install dependencies

```bash
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
```

3. Replace the default files with the `src/` structure in this repo.

4. Start the app

```bash
npm run start
```

If tunnel is failing, use LAN instead:

```bash
npm run start:lan
```

## Backend endpoints expected

Backend integration is intentionally removed from the UI layer for now. See the migration todo file for what should be added back later.

## Notes

- Use your machine IP instead of `localhost` when testing on a phone.
- `--tunnel` depends on ngrok and can fail on some networks. Prefer LAN when your phone and laptop are on the same Wi-Fi.
- The app now uses local mock data and local UI flows only.
# labour-app
# labour-app
