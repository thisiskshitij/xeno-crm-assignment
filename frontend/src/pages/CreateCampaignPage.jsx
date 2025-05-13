import React, { useState, useEffect } from "react";
import RuleBuilder from "../components/RuleBuilder"; // Import RuleBuilder component
import "./CreateCampaignPage.css";

function CreateCampaignPage() {
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [conditions, setConditions] = useState([]);
  const [overallOperator, setOverallOperator] = useState("AND");
  const [audienceSize, setAudienceSize] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("http://localhost:3000/auth/check", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        const result = await response.json();

        if (!result.isAuthenticated) {
          window.location.href = "http://localhost:3000/auth/google";
        }
      } catch (error) {
        console.error("Error during authentication check:", error);
        window.location.href = "http://localhost:3000/auth/google";
      }
    };

    checkAuth();
  }, []);

  const handleNameChange = (event) => setCampaignName(event.target.value);
  const handleMessageChange = (event) => setMessageTemplate(event.target.value);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { id: Date.now(), field: "", operator: "", value: "" },
    ]);
    setAudienceSize(null);
  };

  const handleRemoveCondition = (id) => {
    setConditions(conditions.filter((condition) => condition.id !== id));
    setAudienceSize(null);
  };

  const handleUpdateCondition = (id, fieldName, newValue) => {
    const updatedConditions = conditions.map((condition) =>
      condition.id === id ? { ...condition, [fieldName]: newValue } : condition
    );
    setConditions(updatedConditions);
    setAudienceSize(null);
  };

  const handleOverallOperatorChange = (event) => {
    setOverallOperator(event.target.value);
    setAudienceSize(null);
  };

  const buildRulesJson = () => {
    const validConditions = conditions.filter((c) => c.field && c.operator);
    if (validConditions.length === 0) return null;
    return {
      operator: overallOperator,
      conditions: validConditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
    };
  };

  const handlePreviewAudience = async () => {
    const rules = buildRulesJson();
    if (!rules) {
      setAudienceSize("Please add valid conditions.");
      return;
    }

    setLoadingPreview(true);
    setAudienceSize(null);

    try {
      const response = await fetch(
        "http://localhost:3000/api/segments/preview?" +
          new URLSearchParams({ rules: JSON.stringify(rules) }).toString(),
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (response.status === 401) {
        window.location.href = "http://localhost:3000/auth/google";
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        setAudienceSize(`Error: ${error.message || response.statusText}`);
        return;
      }

      const result = await response.json();
      setAudienceSize(`Estimated Audience Size: ${result.audienceSize}`);
    } catch (error) {
      setAudienceSize(`An error occurred: ${error.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveCampaign = async () => {
    const name = campaignName.trim();
    const messageTemplateContent = messageTemplate.trim();
    const rules = buildRulesJson();

    if (!name || !messageTemplateContent) {
      alert("Please enter a Campaign Name and Message Template.");
      return;
    }
    if (!rules) {
      alert("Please define at least one valid segment condition.");
      return;
    }

    const campaignData = {
      name: name,
      messageTemplate: messageTemplateContent,
      rules: rules,
    };

    setLoadingSave(true);

    try {
      const response = await fetch("http://localhost:3000/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = "http://localhost:3000/auth/google";
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        alert(`Error saving campaign: ${error.message || response.statusText}`);
        return;
      }

      alert("Campaign saved and initiated successfully!");
      window.location.href = "/history";
    } catch (error) {
      alert(`An error occurred while saving the campaign: ${error.message}`);
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <div className="create-campaign-page">
      <h1 className="page-title">Create New Campaign</h1>

      <div className="form-section">
        <h2 className="section-title">Campaign Details</h2>
        <div className="form-group">
          <label htmlFor="campaign-name">Campaign Name:</label>
          <input
            type="text"
            id="campaign-name"
            value={campaignName}
            onChange={handleNameChange}
            required
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="message-template">Message Template:</label>
          <textarea
            id="message-template"
            rows="6"
            value={messageTemplate}
            onChange={handleMessageChange}
            required
            placeholder="e.g., Hi {{name}}, ..."
            className="textarea-field"
          ></textarea>
        </div>
      </div>

      <div className="form-section">
        <RuleBuilder
          conditions={conditions}
          overallOperator={overallOperator}
          onAddCondition={handleAddCondition}
          onRemoveCondition={handleRemoveCondition}
          onUpdateCondition={handleUpdateCondition}
          onOverallOperatorChange={handleOverallOperatorChange}
        />
      </div>

      <div className="form-section">
        <div className="form-group">
          <button
            onClick={handlePreviewAudience}
            disabled={loadingPreview}
            className="action-button preview-button"
          >
            {loadingPreview ? "Calculating..." : "Preview Audience Size"}
          </button>
          <span className="audience-size">
            {audienceSize !== null && audienceSize}
          </span>
        </div>

        <button
          onClick={handleSaveCampaign}
          disabled={loadingSave}
          className="action-button save-button"
        >
          {loadingSave ? "Saving..." : "Save Segment & Initiate Campaign"}
        </button>
      </div>
    </div>
  );
}

export default CreateCampaignPage;
