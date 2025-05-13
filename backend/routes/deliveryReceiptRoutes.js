const express = require("express");
const router = express.Router();

const { PubSub } = require("@google-cloud/pubsub");

const GOOGLE_CLOUD_PROJECT_ID = "crm-project-459422";

try {
  const pubSubClient = new PubSub({ projectId: GOOGLE_CLOUD_PROJECT_ID });
  console.log("[DeliveryReceipts] Pub/Sub Client initialized with Project ID.");

  const PUBSUB_TOPIC_NAME = "delivery-receipts-topic";
  console.log(`[DeliveryReceipts] Using Pub/Sub Topic: ${PUBSUB_TOPIC_NAME}.`);

  const topic = pubSubClient.topic(PUBSUB_TOPIC_NAME);
  console.log(
    `[DeliveryReceipts] Pub/Sub Topic reference obtained for ${PUBSUB_TOPIC_NAME}.`
  );

  router.post("/", async (req, res) => {
    try {
      console.log(
        "[DeliveryReceipts] Received POST request to /api/delivery-receipts."
      );

      const receiptData = req.body;
      console.log("[DeliveryReceipts] Request body:", receiptData);

      if (!receiptData || !receiptData.logId || !receiptData.status) {
        console.warn(
          "[DeliveryReceipts] Received invalid delivery receipt data: logId and status are required.",
          receiptData
        );
        return res.status(400).json({
          message:
            "Invalid delivery receipt data: logId and status are required",
        });
      }

      console.log(
        `[DeliveryReceipts] Received valid delivery receipt for Log ID: ${receiptData.logId}, Status: ${receiptData.status}. Publishing to Pub/Sub.`
      );

      const dataBuffer = Buffer.from(JSON.stringify(receiptData));
      console.log("[DeliveryReceipts] Data buffered for publishing.");

      console.log(
        `[DeliveryReceipts] Attempting to publish message to topic ${PUBSUB_TOPIC_NAME}...`
      );
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(
        `[DeliveryReceipts] Successfully published message to topic ${PUBSUB_TOPIC_NAME}. Message ID: ${messageId}`
      );

      res.status(200).json({
        message: "Delivery receipt received and queued for processing",
        messageId: messageId,
      });
      console.log("[DeliveryReceipts] Sent 200 OK response to vendor.");
    } catch (err) {
      console.error(
        "[DeliveryReceipts] !!! ERROR !!! Error receiving or publishing delivery receipt:",
        err
      );
      res.status(500).json({
        message: "Failed to process delivery receipt",
        error: err.message,
      });
      console.error("[DeliveryReceipts] Sent 500 error response to vendor.");
    }
  });

  module.exports = router;
} catch (initializationError) {
  console.error(
    "[DeliveryReceipts] FATAL ERROR: Failed to initialize Pub/Sub client or topic:",
    initializationError
  );
}
