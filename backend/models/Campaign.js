const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const campaignSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    segmentId: {
      type: Schema.Types.ObjectId,
      ref: "Segment",
      required: true,
    },
    messageTemplate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "CREATED",
    },

    audienceSize: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Campaign = mongoose.model("Campaign", campaignSchema);

module.exports = Campaign;
