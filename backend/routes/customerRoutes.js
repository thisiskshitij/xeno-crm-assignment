const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

router.use(ensureAuthenticated);

router.post("/", async (req, res) => {
  try {
    const { name, email, customerId, phone, address } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const newCustomer = new Customer({
      customerId,
      name,
      email,
      phone,
      address,
    });

    const savedCustomer = await newCustomer.save();

    res.status(201).json(savedCustomer);
  } catch (err) {
    console.error("Error saving customer:", err);

    res
      .status(500)
      .json({ message: "Failed to ingest customer data", error: err.message });
  }
});
router.get("/", async (req, res) => {
  console.log("*** INSIDE GET /api/customers ROUTE HANDLER ***");
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    console.error("Error fetching customers:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch customer data", error: err.message });
  }
});

module.exports = router;
