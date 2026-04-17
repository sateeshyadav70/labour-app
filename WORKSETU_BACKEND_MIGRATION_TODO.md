# WorkSetu API Contracts And Migration Notes

This document is the app-facing contract for the backend and mobile client.
Keep these payload shapes stable while the remaining routes are filled in.

## Common Response Envelope

Most success responses should look like this:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

For backward compatibility, keep the primary payload at the top level too.

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/worker/register`
- `POST /api/worker/login`
- `GET /api/user/me`

### User-Panel Only TODO

For this mobile app, only the user auth flow should be active in the UI.
The backend should treat `/api/auth/register` as the place where the user record is created, and `/api/auth/login` as a pure authentication step.

- Save new users in the `users` collection/table on register.
- Hash passwords before saving, never store plain text passwords.
- On login, verify the email and password against the `users` collection/table.
- Do not create a new user row/document on every login.
- If you need login history, store it separately in `login_events` or update a `lastLoginAt` field on the existing user record.
- Return the authenticated user and JWT in the standard envelope so the frontend can store the session.
- Keep worker auth endpoints only if the backend still serves worker-specific apps; this user panel should not call them.

Successful auth responses should keep:

- `success`
- `message`
- `data`
- the primary payload at the top level

User auth success shape:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "userId",
    "id": "userId",
    "name": "User Name",
    "email": "user@example.com",
    "user": {},
    "token": "jwt-token",
    "accountType": "user"
  },
  "_id": "userId",
  "id": "userId",
  "name": "User Name",
  "email": "user@example.com",
  "user": {},
  "token": "jwt-token",
  "accountType": "user"
}
```

Worker auth success shape is the same, except `user` is replaced with `worker` and `accountType` is `"worker"`.

Auth failure contract:

- `400` means the request is incomplete.
- `401 Invalid credentials` means the backend is reachable, but the email/password is wrong.
- `500` means backend-side failure.
- Network failure or no response means the backend is unreachable from the client.

Frontend auth note:

- If `/api/auth/login` succeeds, store the JWT and use the backend session normally.
- If `/api/auth/login` returns `401 Invalid credentials`, show a login error and do not open a local session.
- If the backend is unreachable, the current app keeps strict backend-only auth and shows an error instead of silently logging in.

Demo credentials, if seeded, should be documented in frontend auth docs or environment files, not in backend code.

## Services

- `GET /api/services`
- `GET /api/services/category/:category`
- `GET /api/services/:id`
- `GET /api/home-config`

`GET /api/services` should return a home-grid array with:

- `id`
- `title`
- `description`
- `color`
- `ratePerHour`
- `badgeText`
- `sortOrder`
- `illustrationKey`

`GET /api/services/:id` should return the same fields plus booking summary metadata:

- `serviceId`
- `category`
- `skillTags`
- `durationMins`
- `cancellationNote`
- `includedScope`
- `optionalAddons`
- `bookingSummary`

`GET /api/home-config` should return hero copy, chips, and branding values under `data.homeConfig`.

## Workers

- `GET /api/worker`
- `GET /api/worker/profile`
- `GET /api/worker/:id`

Accepted query aliases for `GET /api/worker`:

- `lat`, `lng`
- `latitude`, `longitude`
- `userLat`, `userLng`
- `locationLat`, `locationLng`
- `location.lat`, `location.lng`
- `location[lat]`, `location[lng]`
- `skill`
- `serviceType`
- `serviceId`
- `addressBookId`
- `selectedAddressId`

If coordinates are not supplied, workers should still be returned without `distance` and `time`.
If the request is authenticated, the server can fall back to the user’s pinned location or default saved address.

`GET /api/worker` should return:

```json
{
  "success": true,
  "message": "Workers fetched successfully",
  "data": {
    "workers": []
  }
}
```

Each worker item should include:

- `_id`
- `name`
- `email`
- `phone`
- `skills`
- `experience`
- `hourlyRate`
- `location`
- `profileImage`
- `workImages`
- `rating`
- `numReviews`
- `isAvailable`
- `isVerified`
- `distance`
- `time`

`GET /api/worker/profile` should return the authenticated worker under `data.worker`.
`GET /api/worker/:id` should return a single worker under `data.worker`.

## Bookings

- `POST /api/booking`
- `GET /api/booking/:id`
- `GET /api/tracking/:bookingId`
- `POST /api/booking/broadcast`
- `GET /api/booking/my`
- `POST /api/booking/accept/:id`
- `POST /api/booking/reject/:id`
- `POST /api/booking/:id/on-the-way`
- `POST /api/booking/:id/complete`

Booking responses should include `booking`, `bookings`, and `trackingSnapshot` under `data` where relevant.
`GET /api/booking/:id` should be authorized for the booking owner or assigned worker.
`GET /api/tracking/:bookingId` should return the live tracker snapshot with:

- `bookingId`
- `workerId`
- `serviceId`
- `status`
- `paymentStatus`
- `stepIndex`
- `progress`
- `label`
- `subtitle`
- `zone`
- `address`
- `etaMinutes`
- `latitude`
- `longitude`
- `heading`
- `speed`
- `updatedAt`

## Account

- `GET /api/profile`
- `GET /api/user/me`
- `GET /api/bookings`
- `POST /api/address-book`
- `GET /api/address-book`
- `POST /api/profile/pinned-location`

`/api/address-book` should store entries inside the user document and support default address selection.
`/api/profile/pinned-location` should store the last selected top-bar location for restoration later.

## Payments

- `POST /api/payment`
- `POST /api/payment/create-order`
- `POST /api/payment/verify`
- `GET /api/payment/history`
- `GET /api/payment/booking/:bookingId`

`create-order` should accept optional `bookingId` and return `order`, `payment`, `booking`, and `trackingSnapshot`.
`verify` should persist payment confirmation on the booking document and return the same booking/tracking payload.
`history` should return all payments for the authenticated user.
`booking/:bookingId` should return payment history for one booking after ownership checks.

### Payment Model

`Payment` should be stored in MongoDB with:

- `bookingId`
- `amount`
- `status`
- `razorpay_order_id`
- `razorpay_payment_id`
- `createdAt`
- `updatedAt`

The booking document should still keep the live `payment` snapshot used by booking screens and tracking.

## Socket Events

- `joinRoom`
- `joinBookingRoom`
- `joinWorkerRoom`
- `leaveRoom`
- `sendLocation`
- `receiveLocation`
- `tracking:update`
- `sendMessage`
- `receiveMessage`
- `chat:message`
- `booking:broadcast`
- `booking:updated`

`receiveLocation` and `tracking:update` should use the same snapshot payload shape as `GET /api/tracking/:bookingId`.
The payload should include `latitude`, `longitude`, `etaMinutes`, `heading`, `speed`, `status`, and `updatedAt`.
Joining a booking room should emit an immediate `tracking:snapshot` event so the live map can render without waiting for the first movement update.

Live location and chat updates should also be persisted on the booking document when a `bookingId` is present.

## Public Pages

- `GET /api/support`
- `GET /api/policy`
- `GET /api/terms`

## Frontend Payment TODO

- Add a Razorpay checkout flow that calls `POST /api/payment/create-order` before opening the payment modal.
- Save `bookingId` with the order request so the backend can link the payment to the booking.
- After Razorpay success, call `POST /api/payment/verify` with:
  - `bookingId`
  - `razorpay_order_id`
  - `razorpay_payment_id`
  - `razorpay_signature`
- Show booking confirmation only after the verify API returns success.
- Load payment history from `GET /api/payment/history` for the current user.
- Load booking-level payment details from `GET /api/payment/booking/:bookingId` when a booking details page opens.
- Render `payment.status`, `payment.amount`, `razorpay_order_id`, and `createdAt` in the history UI.
- Handle verification failures with a retry state instead of marking the booking paid locally.

## Implementation Notes

- Keep the current app in strict backend-only auth mode.
- Do not re-enable a local-login fallback unless that is explicitly requested later.
- Keep the common envelope and the legacy top-level payload fields in sync while the migration is in progress.
