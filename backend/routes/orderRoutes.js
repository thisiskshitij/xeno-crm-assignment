const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

router.use(ensureAuthenticated);

router.post("/", async (req, res) => {
  try {
    const { customerId, orderId, orderDate, amount, items } = req.body;

    if (!customerId || amount === undefined || amount === null) {
      return res
        .status(400)
        .json({ message: "customerId and amount are required" });
    }

    let parsedOrderDate = orderDate ? new Date(orderDate) : new Date();

    if (isNaN(parsedOrderDate.getTime())) {
      return res.status(400).json({ message: "Invalid orderDate format" });
    }

    const newOrder = new Order({
      orderId,
      customerId,
      orderDate: parsedOrderDate,
      amount,
      items,
    });

    const savedOrder = await newOrder.save();

    const customer = await Customer.findOne({ customerId: customerId });

    if (customer) {
      customer.totalSpend = (customer.totalSpend || 0) + amount;

      customer.totalVisits = (customer.totalVisits || 0) + 1;
      customer.lastActive = parsedOrderDate;

      await customer.save();
      console.log(`Updated customer ${customerId} stats.`);
    } else {
      console.warn(`Order received for unknown customerId: ${customerId}`);
    }

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("Error processing order:", err);
    res
      .status(500)
      .json({ message: "Failed to ingest order data", error: err.message });
  }
});

module.exports = router;
