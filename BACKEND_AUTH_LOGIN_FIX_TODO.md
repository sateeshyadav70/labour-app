# Backend Auth Login Fix TODO

This checklist applies to the Express server snippet you shared in chat.
The backend source is not present in this workspace, so treat this as the implementation guide for the server repo.

## P0: Login Must Work

- Fix `/api/auth/login` so it only authenticates an existing user and never creates a new record during login.
- Verify the login query checks the `users` collection/table, compares the password hash correctly, and returns `401` for invalid credentials.
- Return a stable auth payload on success:
  - `success: true`
  - `message`
  - `data.token`
  - `data.user`
  - `data.accountType`
  - the same fields at the top level for backward compatibility
- Make sure the JWT is signed and verified with the same secret.
- Ensure `POST /api/auth/register` hashes passwords before saving.

## P0: Stop Network Errors

- Replace `cors({ origin: "*", credentials: true })` with an explicit allowlist or remove `credentials: true` if cookies are not needed.
- Confirm the server binds to `0.0.0.0` and the selected port is actually free.
- Keep the backend port consistent with the mobile app environment variable.
- If the app runs on a physical device, use the machine LAN IP in `EXPO_PUBLIC_API_URL` instead of `10.0.2.2`.

## P1: Better Error Contract

- Return `400` for missing email/password.
- Return `401 Invalid credentials` when the email or password is wrong.
- Return `500` only for server-side failures.
- Keep the `/health` and `/api/health` endpoints working so the client can verify reachability.
- Add request logging on auth routes so login attempts can be debugged quickly.

## P1: Session And Middleware

- If session cookies are still used anywhere, make sure `sameSite`, `secure`, and `credentials` settings match the actual frontend origin.
- Keep `express.json()` before the route mounts.
- Add `express.urlencoded({ extended: true })` if any form-encoded payloads are expected.

## P2: Verify After Fix

- Test login from the Expo app on Android emulator.
- Test login from a physical Android/iPhone device.
- Confirm the client sees `401` for bad passwords and a successful JWT for valid credentials.
- Confirm the frontend receives `token` and `user` in the response envelope.

