const express = require("express");
const router = express.Router();
const axios = require("axios");

const DELIVERY_RECEIPT_API_URL = "http://localhost:3000/api/delivery-receipts";

router.post("/send", async (req, res) => {
  const { email, message, logId } = req.body;

  console.log(`--- Dummy Vendor API ---`);
  console.log(`Attempting to send to: ${email}`);
  console.log(`Message: "${message}"`);
  console.log(`Associated Log ID: ${logId}`);
  console.log(`------------------------`);

  const success = Math.random() < 0.9;
  const vendorMessageId = "dummy_" + Math.random().toString(36).substring(7);
  const vendorStatus = success ? "success" : "failure";
  const errorReason = success ? null : "Simulated failure";

  const receiptPayload = {
    logId: logId,
    status: vendorStatus,
    vendorMessageId: vendorMessageId,
    errorReason: errorReason,
  };

  try {
    console.log(
      `Dummy Vendor API: Calling Delivery Receipt API for log ${logId} with status ${vendorStatus}`
    );
    await axios.post(DELIVERY_RECEIPT_API_URL, receiptPayload);
    console.log(
      `Dummy Vendor API: Successfully called Delivery Receipt API for log ${logId}`
    );

    res.json({
      message: `Send attempt processed for log ${logId}`,
      status: "processed",
    });
  } catch (error) {
    console.error(
      `Dummy Vendor API: Failed to call Delivery Receipt API for log ${logId}:`,
      error.message
    );

    res
      .status(500)
      .json({
        message: `Send attempt processed, but failed to report status for log ${logId}`,
        error: error.message,
      });
  }
});

module.exports = router;
