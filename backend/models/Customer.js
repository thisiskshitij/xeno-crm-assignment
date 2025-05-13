const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    totalSpend: {
      type: Number,
      default: 0,
    },
    totalVisits: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    ingestionSource: {
      type: String,
      default: "api_ingestion",
    },
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
