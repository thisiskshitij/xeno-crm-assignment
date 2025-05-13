const express = require("express");
const router = express.Router();
const Segment = require("../models/Segment");
const Customer = require("../models/Customer");
const Campaign = require("../models/Campaign");
const CommunicationLog = require("../models/CommunicationLog");
const processCampaign = require("../controllers/campaignController");

const { ensureAuthenticated } = require("../middleware/authMiddleware");
router.use(ensureAuthenticated);

const buildMongoQueryFromRules = (rules) => {
  if (!rules || !rules.conditions || !Array.isArray(rules.conditions)) {
    return {};
  }

  const processCondition = (condition) => {
    const { field, operator, value } = condition;
    if (!field || !operator || value === undefined) {
      console.warn("Invalid condition:", condition);
      return null;
    }

    let mongoOperator;
    switch (operator) {
      case ">":
        mongoOperator = "$gt";
        break;
      case "<":
        mongoOperator = "$lt";
        break;
      case "=":
        mongoOperator = "$eq";
        break;
      case "!=":
        mongoOperator = "$ne";
        break;
      case ">=":
        mongoOperator = "$gte";
        break;
      case "<=":
        mongoOperator = "$lte";
        break;

      default:
        console.warn("Unknown operator:", operator);
        return null;
    }

    let processedValue = value;

    if (
      ["totalSpend", "totalVisits"].includes(field) &&
      typeof value !== "number"
    ) {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) {
        console.warn(
          `Value for numeric field "${field}" is not a number:`,
          value
        );
        return null;
      }
    }

    if (
      ["lastActive", "createdAt", "updatedAt"].includes(field) &&
      !(value instanceof Date)
    ) {
      processedValue = new Date(value);
      if (isNaN(processedValue.getTime())) {
        console.warn(
          `Value for date field "${field}" is not a valid date:`,
          value
        );
        return null;
      }
    }

    return { [field]: { [mongoOperator]: processedValue } };
  };

  const processRuleGroup = (ruleGroup) => {
    if (
      !ruleGroup ||
      !ruleGroup.conditions ||
      !Array.isArray(ruleGroup.conditions)
    ) {
      console.warn("Invalid rule group structure:", ruleGroup);
      return null;
    }

    const conditions = ruleGroup.conditions
      .map((item) => {
        if (item.operator && Array.isArray(item.conditions)) {
          return processRuleGroup(item);
        } else {
          return processCondition(item);
        }
      })
      .filter((item) => item !== null);

    if (conditions.length === 0) {
      return null;
    }

    const mongoOperator = ruleGroup.operator === "OR" ? "$or" : "$and";

    return { [mongoOperator]: conditions };
  };

  const mongoQuery = processRuleGroup(rules);

  if (!mongoQuery || Object.keys(mongoQuery).length === 0) {
    return {};
  }

  return mongoQuery;
};

router.get("/preview", async (req, res) => {
  try {
    const rules = req.query.rules ? JSON.parse(req.query.rules) : null;

    if (!rules) {
      console.warn(
        "Backend: Preview request missing or invalid rules in query."
      );
      return res
        .status(400)
        .json({
          message:
            'Segment rules are required and must be valid JSON in the "rules" query parameter',
        });
    }

    const mongoQuery = buildMongoQueryFromRules(rules);
    console.log(
      "Backend: Translated MongoDB Query:",
      JSON.stringify(mongoQuery)
    );

    const audienceSize = await Customer.countDocuments(mongoQuery);
    console.log("Backend: Audience size calculated:", audienceSize);

    res.status(200).json({ audienceSize: audienceSize });
    console.log("Backend: Sent 200 JSON response for preview.");
  } catch (err) {
    console.error("Backend: Error in GET /api/segments/preview handler:", err);
    res
      .status(500)
      .json({ message: "Failed to get audience preview", error: err.message });
    console.log("Backend: Sent 500 JSON response for preview error.");
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, rules, messageTemplate } = req.body;

    if (!name || !rules || !messageTemplate) {
      return res
        .status(400)
        .json({
          message: "Segment name, rules, and messageTemplate are required",
        });
    }

    const newSegment = new Segment({ name, rules });
    const savedSegment = await newSegment.save();
    console.log(`Segment "${savedSegment.name}" saved.`);

    const mongoQuery = buildMongoQueryFromRules(savedSegment.rules);
    const audienceCustomers = await Customer.find(mongoQuery).select(
      "_id name"
    );
    const audienceSize = audienceCustomers.length;
    console.log(`Found ${audienceSize} customers for campaign.`);

    if (audienceSize === 0) {
      console.log(
        "No customers found for this segment. Campaign not initiated."
      );

      const newCampaign = new Campaign({
        name: `Campaign for ${savedSegment.name}`,
        segmentId: savedSegment._id,
        messageTemplate: messageTemplate,
        status: "COMPLETED_NO_AUDIENCE",
        audienceSize: 0,
        sentCount: 0,
        failedCount: 0,
      });
      await newCampaign.save();
      console.log(`Campaign record created with 0 audience.`);

      return res.status(201).json({
        segment: savedSegment,
        campaignStatus: "CREATED_NO_AUDIENCE",
        message: "Segment saved. No audience found for campaign.",
      });
    }

    const newCampaign = new Campaign({
      name: `Campaign for ${savedSegment.name}`,
      segmentId: savedSegment._id,
      messageTemplate: messageTemplate,
      status: "INITIATED",
      audienceSize: audienceSize,
    });
    const savedCampaign = await newCampaign.save();
    console.log(
      `Campaign "${savedCampaign.name}" initiated (ID: ${savedCampaign._id}).`
    );

    const logEntries = audienceCustomers.map((customer) => ({
      campaignId: savedCampaign._id,
      customerId: customer._id,
      messageContent: "Placeholder message",
    }));

    const savedLogs = await CommunicationLog.insertMany(logEntries);
    console.log(`Created ${savedLogs.length} communication log entries.`);

    processCampaign(savedCampaign._id)
      .then(() =>
        console.log(`Triggered processCampaign for ID: ${savedCampaign._id}`)
      )
      .catch((err) =>
        console.error(
          `Failed to trigger processCampaign for ID ${savedCampaign._id}:`,
          err
        )
      );

    res.status(201).json({
      segment: savedSegment,
      campaign: {
        _id: savedCampaign._id,
        name: savedCampaign.name,
        audienceSize: savedCampaign.audienceSize,
        status: savedCampaign.status,
        createdAt: savedCampaign.createdAt,
      },
      message: "Segment saved and campaign initiated.",
    });
  } catch (err) {
    console.error("Error saving segment or initiating campaign:", err);
    res
      .status(500)
      .json({
        message: "Failed to save segment or initiate campaign",
        error: err.message,
      });
  }
});

module.exports = router;
