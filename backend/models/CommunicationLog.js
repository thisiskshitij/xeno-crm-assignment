const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const communicationLogSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "PENDING",
    },
    vendorMessageId: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const CommunicationLog = mongoose.model(
  "CommunicationLog",
  communicationLogSchema
);

module.exports = CommunicationLog;
