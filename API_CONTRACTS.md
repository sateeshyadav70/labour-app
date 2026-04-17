# API Contracts

## Common Response Envelope

Most endpoints now return:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

For backward compatibility, many responses also keep the main payload at the top level.

## Backend Contract

These routes are already implemented in the backend and are the current contract for the app.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/worker/register`
- `POST /api/worker/login`

Successful auth responses use the common envelope and also keep the payload at top level for backward compatibility.

User login/register success shape:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "userId",
    "name": "User Name",
    "email": "user@example.com",
    "user": {},
    "token": "jwt-token",
    "accountType": "user"
  },
  "_id": "userId",
  "name": "User Name",
  "email": "user@example.com",
  "user": {},
  "token": "jwt-token",
  "accountType": "user"
}
```

Worker login/register success shape is the same, except `user` is replaced with `worker` and `accountType` is `"worker"`.

Auth failure contract:

- `401 Invalid credentials` means the backend is reachable, but the email/password is wrong.
- `400 Email and password are required` or `400 Name, email, and password are required` means the request is incomplete.
- `500` means backend-side failure.
- Network failure or no response means the backend is unreachable from the client.

Frontend note:

- If `/api/auth/login` succeeds, store the JWT and use the backend session normally.
- If `/api/auth/login` returns `401 Invalid credentials`, show a login error and do not open a local session.
- If `/api/auth/login` fails because the backend is unreachable, the frontend may open a local-only session fallback.
- Local-only sessions do not have a JWT, so backend-only features like payment history should stay disabled until the user signs in against the backend.

Demo credentials are deployment-controlled. If you seed demo auth users, document the exact email/password values in the frontend auth guide or environment docs, not in the backend codebase.

### Services

- `GET /api/services`
- `GET /api/services/category/:category`
- `GET /api/services/:id`
- `GET /api/home-config`

`GET /api/services` returns a home-grid array with:

- `id`
- `title`
- `description`
- `color`
- `ratePerHour`
- `badgeText`
- `sortOrder`
- `illustrationKey`

`GET /api/services/:id` returns the same fields plus booking summary metadata:

- `serviceId`
- `category`
- `skillTags`
- `durationMins`
- `cancellationNote`
- `includedScope`
- `optionalAddons`
- `bookingSummary`

`GET /api/home-config` returns hero copy, chips, and branding values under `data.homeConfig`.

### Workers

- `GET /api/worker`
- `GET /api/worker/profile`
- `GET /api/worker/:id`

Accepted query aliases:

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

If coordinates are not supplied, workers are still returned without `distance` and `time`.
If the request is authenticated, the server can fall back to the user’s pinned location or default saved address.

`GET /api/worker` returns:

```json
{
  "success": true,
  "message": "Workers fetched successfully",
  "data": {
    "workers": []
  }
}
```

Each worker item includes:

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

`GET /api/worker/profile` returns the authenticated worker under `data.worker`.
`GET /api/worker/:id` returns a single worker under `data.worker`.

### Bookings

- `POST /api/booking`
- `GET /api/booking/:id`
- `GET /api/tracking/:bookingId`
- `POST /api/booking/broadcast`
- `GET /api/booking/my`
- `POST /api/booking/accept/:id`
- `POST /api/booking/reject/:id`
- `POST /api/booking/:id/on-the-way`
- `POST /api/booking/:id/complete`

Booking responses include `booking`, `bookings`, and `trackingSnapshot` under `data`.
`GET /api/booking/:id` is authorized for the booking owner or assigned worker.
`GET /api/tracking/:bookingId` returns the current live tracker snapshot with:

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

### Account

- `GET /api/profile`
- `GET /api/user/me`
- `GET /api/bookings`
- `POST /api/address-book`
- `GET /api/address-book`
- `POST /api/profile/pinned-location`

`/api/address-book` stores entries inside the user document and supports default address selection.
`/api/profile/pinned-location` stores the last selected top-bar location for restoration later.

### Payments

- `POST /api/payment`
- `POST /api/payment/create-order`
- `POST /api/payment/verify`
- `GET /api/payment/history`
- `GET /api/payment/booking/:bookingId`

`create-order` accepts optional `bookingId` and returns `payment`, `booking`, and `trackingSnapshot`.
`verify` persists payment confirmation on the booking document and returns the same payload shape.
`history` returns all payments for the authenticated user.
`booking/:bookingId` returns payment history for one booking after ownership checks.

### Payment Model

`Payment` is stored in MongoDB with:

- `bookingId`
- `amount`
- `status`
- `razorpay_order_id`
- `razorpay_payment_id`
- `createdAt`
- `updatedAt`

The booking document still keeps the live `payment` snapshot used by booking screens and tracking.

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

`receiveLocation` and `tracking:update` now use the same snapshot payload shape as `GET /api/tracking/:bookingId`.
The payload includes `latitude`, `longitude`, `etaMinutes`, `heading`, `speed`, `status`, and `updatedAt`.
Joining a booking room emits an immediate `tracking:snapshot` event so the live map can render without waiting for the first movement update.

### Public Pages

- `GET /api/support`
- `GET /api/policy`
- `GET /api/terms`

Live location and chat updates are now also persisted on the booking document when a `bookingId` is present.
