const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const segmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    rules: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Segment = mongoose.model("Segment", segmentSchema);

module.exports = Segment;
