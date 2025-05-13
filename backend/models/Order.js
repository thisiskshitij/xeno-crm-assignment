const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
    },
    customerId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: [
      {
        productId: { type: String },
        quantity: { type: Number },
        price: { type: Number },
      },
    ],
    ingestionSource: {
      type: String,
      default: "api_ingestion",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
