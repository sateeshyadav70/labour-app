# Frontend Payment TODO

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
