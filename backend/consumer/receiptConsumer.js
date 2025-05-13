require("dotenv").config({ path: "./.env" });

const mongoose = require("mongoose");
const CommunicationLog = require("../models/CommunicationLog");
const Campaign = require("../models/Campaign");

const { PubSub } = require("@google-cloud/pubsub");

const GOOGLE_CLOUD_PROJECT_ID = "crm-project-459422";

try {
  const pubSubClient = new PubSub({ projectId: GOOGLE_CLOUD_PROJECT_ID });
  console.log("[Consumer] Pub/Sub Client initialized with Project ID.");

  const PUBSUB_SUBSCRIPTION_NAME = "delivery-receipts-topic-sub";
  console.log(
    `[Consumer] Using Pub/Sub Subscription: ${PUBSUB_SUBSCRIPTION_NAME}.`
  );

  const subscription = pubSubClient.subscription(PUBSUB_SUBSCRIPTION_NAME);
  console.log(
    `[Consumer] Pub/Sub Subscription reference obtained for ${PUBSUB_SUBSCRIPTION_NAME}.`
  );

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error(
      "Consumer: FATAL ERROR: MONGODB_URI environment variable is not defined."
    );
  } else {
    mongoose
      .connect(MONGODB_URI)
      .then(() => console.log("Consumer: Connected to MongoDB..."))
      .catch((err) =>
        console.error("Consumer: Could not connect to MongoDB...", err)
      );
  }

  const BATCH_SIZE = 10;
  const BATCH_TIMEOUT = 5000;

  let messageBatch = [];
  let batchTimer = null;

  const processBatch = async () => {
    if (messageBatch.length === 0) {
      return;
    }

    console.log(
      `[Consumer] Processing batch of ${messageBatch.length} delivery receipts...`
    );

    const currentBatch = [...messageBatch];
    messageBatch = [];

    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }

    const bulkOperations = currentBatch
      .map((message) => {
        const receipt = JSON.parse(message.data.toString());

        const internalStatus =
          receipt.status?.toUpperCase() === "SUCCESS" ? "SENT" : "FAILED";

        let updateFields = {
          status: internalStatus,
          updatedAt: new Date(),
        };

        if (internalStatus === "SENT") {
          updateFields.deliveredAt = new Date();
          if (receipt.vendorMessageId)
            updateFields.vendorMessageId = receipt.vendorMessageId;
        } else {
          updateFields.failedAt = new Date();
          if (receipt.errorReason)
            updateFields.failureReason = receipt.errorReason;
        }

        return {
          updateOne: {
            filter: { _id: receipt.logId },
            update: { $set: updateFields },

            filter: { _id: receipt.logId, status: "PENDING" },
            update: { $set: updateFields },
            upsert: false,
          },
        };
      })
      .filter((op) => op !== null);

    if (bulkOperations.length === 0) {
      console.log("[Consumer] No valid bulk operations in this batch.");

      currentBatch.forEach((message) => message.ack());
      console.log(
        `[Consumer] Acknowledged ${currentBatch.length} messages (no valid ops).`
      );
      return;
    }

    try {
      const result = await CommunicationLog.bulkWrite(bulkOperations);
      console.log(
        `[Consumer] CommunicationLog bulk write result - Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`
      );

      const affectedCampaignIds = [
        ...new Set(
          currentBatch
            .map((message) => JSON.parse(message.data.toString()).campaignId)
            .filter((id) => id)
        ),
      ];

      for (const campaignId of affectedCampaignIds) {
        try {
          const campaign = await Campaign.findById(campaignId);
          if (!campaign) {
            console.warn(
              `[Consumer] Campaign with ID ${campaignId} not found while processing batch. Skipping campaign update.`
            );
            continue;
          }

          const allLogsForCampaign = await CommunicationLog.find({
            campaignId: campaign._id,
          });
          const currentSentCount = allLogsForCampaign.filter(
            (l) => l.status === "SENT"
          ).length;
          const currentFailedCount = allLogsForCampaign.filter(
            (l) => l.status === "FAILED"
          ).length;
          const currentPendingCount = allLogsForCampaign.filter(
            (l) => l.status === "PENDING"
          ).length;

          console.log(
            `[Consumer] Campaign ${campaign._id} - Recalculated Counts: Sent: ${currentSentCount}, Failed: ${currentFailedCount}, Pending: ${currentPendingCount}`
          );

          campaign.sentCount = currentSentCount;
          campaign.failedCount = currentFailedCount;

          if (currentPendingCount === 0) {
            campaign.status = "COMPLETED";
            campaign.completedAt = new Date();
            console.log(
              `[Consumer] Campaign ${campaign._id} - All logs processed. Marking as COMPLETED.`
            );
          } else {
            if (campaign.status !== "FAILED") {
              campaign.status = "PROCESSING_MESSAGES";
            }
            console.log(
              `[Consumer] Campaign ${campaign._id} - Still ${currentPendingCount} pending logs.`
            );
          }

          await campaign.save();
          console.log(
            `[Consumer] Campaign ${campaign._id} counts and status updated.`
          );
        } catch (campaignUpdateError) {
          console.error(
            `[Consumer] Error updating Campaign ${campaignId} after processing batch:`,
            campaignUpdateError
          );
        }
      }

      currentBatch.forEach((message) => message.ack());
      console.log(`[Consumer] Acknowledged ${currentBatch.length} messages.`);
    } catch (dbError) {
      console.error(
        "[Consumer] Error performing bulk write for CommunicationLogs:",
        dbError
      );

      currentBatch.forEach((message) => message.ack());
      console.warn(
        `[Consumer] Acknowledged ${currentBatch.length} messages despite bulk write error.`
      );
    }
  };

  const triggerBatchProcess = () => {
    if (batchTimer) {
      clearTimeout(batchTimer);
    }

    batchTimer = setTimeout(processBatch, BATCH_TIMEOUT);
  };

  const listenForMessages = () => {
    console.log(
      `[Consumer] Listening for messages on subscription ${subscription.name}`
    );

    subscription.on("message", (message) => {
      console.log(
        `[Consumer] Received message ${
          message.id
        } for log ${message.data.toString()}`
      );

      messageBatch.push(message);

      if (messageBatch.length >= BATCH_SIZE) {
        console.log(
          `[Consumer] Batch size ${BATCH_SIZE} reached. Processing batch immediately.`
        );

        processBatch();
      } else {
        triggerBatchProcess();
      }
    });

    subscription.on("error", (error) => {
      console.error("[Consumer] Subscription error:", error);
    });
  };

  if (MONGODB_URI) {
    listenForMessages();
  }
} catch (initializationError) {
  console.error(
    "[Consumer] FATAL ERROR: Failed to initialize Pub/Sub consumer:",
    initializationError
  );
}

process.on("SIGINT", async () => {
  console.log("Consumer: Received SIGINT. Closing subscription...");

  if (messageBatch.length > 0) {
    console.log(
      `[Consumer] Processing final batch of ${messageBatch.length} messages before shutdown.`
    );
    await processBatch();
  }
  try {
    await subscription.close();
    console.log("Consumer: Pub/Sub subscription closed.");
  } catch (closeError) {
    console.error("Consumer: Error closing subscription:", closeError);
  }

  try {
    await mongoose.disconnect();
    console.log("Consumer: MongoDB connection closed.");
  } catch (disconnectError) {
    console.error(
      "Consumer: Error disconnecting from MongoDB:",
      disconnectError
    );
  }

  console.log("Consumer: Exiting.");
  process.exit(0);
});
