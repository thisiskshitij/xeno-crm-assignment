const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CommunicationLog = require("../models/CommunicationLog");
const Customer = require("../models/Customer");
const axios = require("axios");

const DUMMY_VENDOR_API_URL = "http://localhost:3000/api/dummyVendor/send";

const processCampaign = async (campaignId) => {
  try {
    console.log(
      `[CampaignController] Starting processing for campaign ID: ${campaignId}`
    );

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      console.error(
        `[CampaignController] CRITICAL ERROR: Campaign with ID ${campaignId} not found.`
      );

      try {
        await Campaign.findByIdAndUpdate(campaignId, {
          status: "FAILED",
          completedAt: new Date(),
          failureReason: "Campaign record not found during processing start",
        });
        console.error(
          `[CampaignController] Campaign ${campaignId} status updated to FAILED due to not found.`
        );
      } catch (updateError) {
        console.error(
          `[CampaignController] FATAL: Failed to update campaign ${campaignId} status to FAILED when not found:`,
          updateError
        );
      }
      return;
    }

    if (campaign.status !== "INITIATED") {
      console.warn(
        `[CampaignController] Process Campaign Skipped: Campaign ${campaignId} is not in INITIATED status (${campaign?.status}).`
      );

      return;
    }

    await Campaign.findByIdAndUpdate(campaignId, {
      status: "PROCESSING_MESSAGES",
    });
    console.log(
      `[CampaignController] Campaign ${campaignId} status updated to PROCESSING_MESSAGES.`
    );

    const pendingLogs = await CommunicationLog.find({
      campaignId: campaignId,
      status: "PENDING",
    }).populate("customerId");

    console.log(
      `[CampaignController] Found ${pendingLogs.length} pending log entries to process.`
    );

    if (pendingLogs.length === 0) {
      console.log(
        `[CampaignController] No pending logs found for campaign ${campaignId}. Marking as completed.`
      );

      await Campaign.findByIdAndUpdate(campaignId, {
        status: "COMPLETED",
        completedAt: new Date(),
        sentCount: 0,
        failedCount: 0,
      });
      return;
    }

    for (const log of pendingLogs) {
      try {
        const customer = log.customerId;

        if (!customer) {
          console.error(
            `[CampaignController] Customer not found for log entry ${log._id}. Cannot trigger send.`
          );

          await CommunicationLog.findByIdAndUpdate(log._id, {
            status: "FAILED",
            failureReason: "Customer data missing for sending",
            failedAt: new Date(),
          });
          continue;
        }

        if (!campaign.messageTemplate) {
          console.error(
            `[CampaignController] Message template missing for campaign ${campaignId} (log ${log._id}). Cannot personalize message.`
          );
          await CommunicationLog.findByIdAndUpdate(log._id, {
            status: "FAILED",
            failureReason: "Campaign message template missing",
            failedAt: new Date(),
          });
          continue;
        }
        const personalizedMessage = campaign.messageTemplate.replace(
          "{{name}}",
          customer.name || "Customer"
        );
        console.log(
          `[CampaignController] Personalized message for log ${log._id} (${customer.name}): "${personalizedMessage}"`
        );

        await CommunicationLog.findByIdAndUpdate(log._id, {
          messageContent: personalizedMessage,
        });
        console.log(
          `[CampaignController] Log ${log._id} updated with personalized message.`
        );

        console.log(
          `[CampaignController] Attempting axios.post to ${DUMMY_VENDOR_API_URL} for log ${log._id}`
        );

        const axiosResponse = await axios.post(DUMMY_VENDOR_API_URL, {
          email: customer.email,
          message: personalizedMessage,
          logId: log._id.toString(),
        });

        console.log(
          `[CampaignController] Axios post successful for log ${log._id}. Status: ${axiosResponse.status}`
        );

        console.log(
          `[CampaignController] Triggered dummy vendor for log ${log._id}. Waiting for asynchronous receipt.`
        );
      } catch (logProcessingError) {
        /*  */

        try {
          await CommunicationLog.findByIdAndUpdate(log._id, {
            status: "FAILED",
            failedAt: new Date(),
            failureReason: `Trigger error: ${
              logProcessingError.message || logProcessingError
            }`,
          });
          console.log(
            `[CampaignController] Log ${log._id} status updated to FAILED due to trigger error.`
          );
        } catch (updateError) {
          console.error(
            `[CampaignController] FATAL: Failed to update log ${log._id} after trigger error:`,
            updateError
          );
        }
      }
    }

    console.log(
      `[CampaignController] All dummy vendor send triggers sent for campaign ${campaignId}.`
    );

    console.log(
      `[CampaignController] Simulating waiting for asynchronous delivery receipts...`
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log(`[CampaignController] Simulation wait finished.`);

    console.log(
      `[CampaignController] Re-querying logs to check final statuses...`
    );
    const finalProcessedLogs = await CommunicationLog.find({
      campaignId: campaignId,
    });
    const finalSentCount = finalProcessedLogs.filter(
      (log) => log.status === "SENT"
    ).length;
    const finalFailedCount = finalProcessedLogs.filter(
      (log) => log.status === "FAILED"
    ).length;
    const finalPendingCount = finalProcessedLogs.filter(
      (log) => log.status === "PENDING"
    ).length;

    console.log(
      `[CampaignController] Final Log Counts: Sent: ${finalSentCount}, Failed: ${finalFailedCount}, Pending: ${finalPendingCount}`
    );

    await Campaign.findByIdAndUpdate(campaignId, {
      status: finalPendingCount === 0 ? "COMPLETED" : "COMPLETED_WITH_PENDING",
      sentCount: finalSentCount,
      failedCount: finalFailedCount,
      completedAt: new Date(),
    });

    console.log(
      `[CampaignController] Campaign ${campaignId} processing finished. Final Status: ${
        finalPendingCount === 0 ? "COMPLETED" : "COMPLETED_WITH_PENDING"
      }, Sent: ${finalSentCount}, Failed: ${finalFailedCount}`
    );
  } catch (error) {
    console.error(
      `[CampaignController] Top-level unexpected error in processCampaign ${campaignId}:`,
      error
    );

    try {
      await Campaign.findByIdAndUpdate(campaignId, {
        status: "FAILED",
        completedAt: new Date(),
        failureReason: `Unexpected error during processing: ${
          error.message || error
        }`,
      });
      console.error(
        `[CampaignController] Campaign ${campaignId} status updated to FAILED due to unexpected error.`
      );
    } catch (updateError) {
      console.error(
        `[CampaignController] FATAL: Failed to update campaign ${campaignId} status to FAILED:`,
        updateError
      );
    }
  }

  console.log(
    `[CampaignController] Exiting processCampaign for Campaign ID: ${campaignId}`
  );
};

module.exports = processCampaign;
