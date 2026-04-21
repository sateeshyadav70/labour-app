(async () => {
  await require("./authController.test");
  await require("./authMiddleware.test");
  await require("./adminController.test");
  await require("./paymentController.test");
  await require("./bookingRealtime.test");
  await require("./workerController.test");
  await require("./applicationController.test");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
