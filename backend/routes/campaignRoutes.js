const router = require("express").Router();
const Campaign = require("../models/Campaign");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

router.use(ensureAuthenticated);

router.get("/", async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    console.error("Error fetching campaigns:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
