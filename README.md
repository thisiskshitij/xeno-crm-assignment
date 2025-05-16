#  Mini CRM Platform – Assignment

##  Assignment Goal (as understood):

Build a mini CRM platform that:

- Allows marketers to create and send campaigns to specific customer segments.
- Tracks delivery receipts from vendors (simulated or real).
- Supports Google OAuth for login.
- Uses Pub/Sub to asynchronously consume delivery updates.
- Maintains a communication log for analytics.

---

##  My Approach

### 1. Understanding the Requirements
Broke the assignment into key functional blocks:
- Authentication
- Campaign creation and audience segmentation
- Simulated message delivery
- Delivery tracking via Pub/Sub
- Logging and analytics

---

### 2. Designing the Architecture
- Used **Node.js (Express)** for the backend – fast and flexible.
- Chose **MongoDB with Mongoose** – ideal for dynamic data (users, campaigns, segments).
- Followed **MVC pattern**:
  - `models/`, `controllers/`, `routes/`, `middleware/`

---

### 3. Implemented Authentication
- Used `passport.js` with Google OAuth in `passportSetup.js`
- Only authenticated users can create campaigns.
- Added `authMiddleware.js` to secure routes.

---

### 4. Campaign Creation with Dynamic Segments
- Campaign creation logic:
  - `campaignRoutes.js` → `campaignController.js`
- Segments based on filters like age/purchase count:
  - Implemented using `Segment.js` + `Customer.js`

---

### 5. Simulated Campaign Delivery
- Simulated sending using:
  - `dummyVendorRoutes.js`
- Simulated vendor callback by sending POST to `/receipts`.

---

### 6. Delivery Tracking with Pub/Sub
- Created:
  - `pubsubConsumer.js` (main consumer)
  - `consumer/receiptConsumer.js` (handles receipt logic)
- Subscribed to a mock Pub/Sub topic.
- On message received:
  - Updates delivery status in `CommunicationLog.js`
  - Links it back to relevant campaign.

---

### 7. Logging and Communication Tracking
- Every delivery (real or simulated) is logged using:
  - `CommunicationLog.js`
- Can later be extended to:
  - Analytics
  - Retry mechanisms
  - Performance dashboards

---

##  Tech Stack

| Layer             | Tool / Library                          |
|------------------|------------------------------------------|
| Backend           | Node.js, Express                         |
| Authentication    | Passport.js with Google OAuth            |
| Database          | MongoDB with Mongoose                    |
| Queue/Consumer    | Google Cloud Pub/Sub (or mocked locally) |
| Middleware        | Auth middleware (`authMiddleware.js`)    |
| Testing Vendors   | Dummy vendor routes for message sim      |

---

##  Key Strengths of the Solution

- **Modular structure** – Easy to scale and extend.
- **Async delivery tracking** – Pub/Sub enables loose coupling.
- **Segment-based targeting** – Mimics real CRM systems.
- **OAuth security** – Prevents unauthorized access.


##  File Responsibilities (Mapped)


| Component               | Key File(s)                                                     |
|-------------------------|-----------------------------------------------------------------|
| Google OAuth            | `config/passportSetup.js`                                       |
| Auth Middleware         | `middleware/authMiddleware.js`                                  |
| Campaign Logic          | `routes/campaignRoutes.js`, `controllers/campaignController.js` |
| Segmentation Logic      | `models/Segment.js`, `models/Customer.js`                       |
| Simulated Message Send  | `routes/dummyVendorRoutes.js`                                   |
| Receipt Ingestion       | `consumer/receiptConsumer.js`                                   |
| Pub/Sub Main Consumer   | `pubsubConsumer.js`                                             |
| Communication Logging   | `models/CommunicationLog.js`                                    |

