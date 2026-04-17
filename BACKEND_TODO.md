# Backend Todo

## Auth

- [x] Keep `POST /api/auth/login` and `POST /api/auth/register` returning `message`, `token`, and `user`
- [x] Add a predictable auth failure contract for invalid credentials vs. server/network failure
- [ ] Preserve seeded demo credentials for local development
- [x] Add `GET /api/user/me`

## Services And Workers

- [x] Serve `GET /api/services` with a stable shape: `id`, `title`, `description`, `color`, `ratePerHour`, `badgeText`, `sortOrder`, and `illustrationKey`
- [x] Add `GET /api/services/:id`
- [x] Standardize the worker query contract for `GET /api/worker`
- [x] Return worker distance, ETA, and price fields consistently

## Booking

- [x] Keep `POST /api/booking` lightweight and stable
- [x] Return `POST /api/booking` as `{ booking, trackingSnapshot }`
- [x] Add `GET /api/booking/:id`
- [x] Add `GET /api/bookings`
- [x] Add a booking status flow: `pending -> accepted -> completed`

## Payment

- [x] Keep `POST /api/payment` lightweight and stable
- [x] Return `POST /api/payment` as `{ payment, booking, trackingSnapshot }`
- [x] Add `POST /api/payment/create-order`
- [x] Add `POST /api/payment/verify`
- [x] Add `GET /api/payment/history`
- [x] Add `GET /api/payment/booking/:bookingId`

## Tracking And Socket.IO

- [x] Add `GET /api/tracking/:bookingId`
- [x] Keep the tracking snapshot contract identical across REST and Socket.IO
- [x] Emit an initial tracking snapshot immediately after `joinRoom`
- [x] Update the in-memory booking record whenever socket `sendLocation` arrives
- [ ] Add worker-side live location events and acknowledgements

## Profile And Support

- [x] Add `GET /api/profile`
- [x] Add `POST /api/address-book`
- [x] Add `GET /api/address-book`
- [x] Add `GET /api/support`
- [x] Add `GET /api/policy`
- [x] Add `GET /api/terms`

## Worker Panel

- [x] Add `PUT /api/worker/status`
- [x] Emit `newBooking` to the assigned worker room on booking create
- [x] Add `POST /api/worker/accept-booking`
- [x] Add `POST /api/worker/reject-booking`
- [x] Add `GET /api/worker/bookings`
- [x] Add `GET /api/worker/earnings`
- [x] Include `isOnline` in serialized worker payloads

## Platform Cleanup

- [x] Add real database persistence for users, workers, bookings, and payments
- [ ] Add request validation
- [x] Add centralized error handling
- [x] Add rate limiting for auth
- [x] Add request logging
- [x] Add tests for auth
- [ ] Add tests for booking
- [x] Add tests for payment
- [ ] Add tests for sockets

## Notes

- Demo auth credentials are not currently hardcoded in this repo.
- If local demo users are seeded later, document the exact credentials in the frontend auth guide or environment docs.
