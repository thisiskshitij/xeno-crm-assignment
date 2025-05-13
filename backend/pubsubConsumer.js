require('dotenv').config();

const { PubSub } = require('@google-cloud/pubsub');
const mongoose = require('mongoose'); 
const CommunicationLog = require('./models/CommunicationLog'); 
const Campaign = require('./models/Campaign'); 

require('dotenv').config({ path: './backend/.env' }); 

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Consumer: MongoDB Connected Successfully!'))
  .catch(err => console.error('Consumer: MongoDB connection error:', err));


const GOOGLE_CLOUD_PROJECT_ID = 'crm-project-459422';


const PUBSUB_TOPIC_NAME = 'delivery-receipts-topic'; 
const PUBSUB_SUBSCRIPTION_NAME = 'delivery-receipts-topic-sub';


try {
    const pubSubClient = new PubSub({ projectId: GOOGLE_CLOUD_PROJECT_ID });
    console.log('[Consumer] Pub/Sub Client initialized with Project ID.');

    const subscription = pubSubClient.subscription(PUBSUB_SUBSCRIPTION_NAME);
    console.log(`[Consumer] Pub/Sub Subscription reference obtained for ${PUBSUB_SUBSCRIPTION_NAME}.`);


    const messageHandler = async message => {
      console.log(`[Consumer] Received message ${message.id} for log ${message.attributes.logId || 'N/A'}:`); // Log received message ID
      console.log('[Consumer] Message data:', message.data.toString()); // Log message data

      try {
     
          const receiptData = JSON.parse(message.data.toString());
          const { logId, status, vendorMessageId, errorReason } = receiptData;

          console.log(`[Consumer] Processing receipt for log ID: ${logId}, Status: ${status}`); 

          const log = await CommunicationLog.findById(logId);
          if (!log) {
              console.warn(`[Consumer] Communication log with ID ${logId} not found. Skipping update.`);
              message.ack(); 
              return;
          }

          let newStatus;
          if (status === 'success') {
              newStatus = 'SENT';
          } else if (status === 'failure') {
              newStatus = 'FAILED';
          } else {
              console.warn(`[Consumer] Unknown status '${status}' for log ${logId}. Keeping as PENDING.`); // Handle unknown status
              message.ack(); 
              return; 
          }

           if (log.status === newStatus) {
                console.log(`[Consumer] Log ${logId} already has status ${newStatus}. Skipping update.`);
                message.ack(); 
                return;
           }


          log.status = newStatus;
          log.vendorMessageId = vendorMessageId; 
          log.failureReason = errorReason; 
          log.processedAt = new Date();
          await log.save();
          console.log(`[Consumer] Communication log ${logId} status updated to ${newStatus}.`); // Log successful log update

          const campaign = await Campaign.findById(log.campaignId);
          if (!campaign) {
              console.error(`[Consumer] Campaign with ID ${log.campaignId} not found for log ${logId}. Cannot update campaign counts.`); // Log if campaign not found
              message.ack(); 
              return;
          }

          const allLogsForCampaign = await CommunicationLog.find({ campaignId: log.campaignId });
          const currentSentCount = allLogsForCampaign.filter(l => l.status === 'SENT').length;
          const currentFailedCount = allLogsForCampaign.filter(l => l.status === 'FAILED').length;
          const currentPendingCount = allLogsForCampaign.filter(l => l.status === 'PENDING').length;

          console.log(`[Consumer] Campaign ${campaign._id} - Current Counts: Sent: ${currentSentCount}, Failed: ${currentFailedCount}, Pending: ${currentPendingCount}`);

    
          campaign.sentCount = currentSentCount;
          campaign.failedCount = currentFailedCount;

          if (currentPendingCount === 0) {
              campaign.status = 'COMPLETED'; 
              campaign.completedAt = new Date(); 
              console.log(`[Consumer] Campaign ${campaign._id} - All logs processed. Marking as COMPLETED.`);
          } else {
              campaign.status = 'PROCESSING_MESSAGES'; 
               console.log(`[Consumer] Campaign ${campaign._id} - Still ${currentPendingCount} pending logs.`);
          }

          await campaign.save(); 
          console.log(`[Consumer] Campaign ${campaign._id} counts and status updated.`);


          
          message.ack(); 
          console.log(`[Consumer] Acknowledged message ${message.id} for log ${logId}.`); // Log acknowledgment


      } catch (error) {
          console.error(`[Consumer] Error processing message ${message.id} for log ${message.attributes.logId || 'N/A'}:`, error);
         
      }
    };

    subscription.on('message', messageHandler);

    subscription.on('error', error => {
      console.error('[Consumer] Subscription error:', error);
      
    });

    console.log(`[Consumer] Started Pub/Sub consumer. Subscribing to ${PUBSUB_SUBSCRIPTION_NAME} on topic ${PUBSUB_TOPIC_NAME}...`);


} catch (initializationError) {
   
    console.error('[Consumer] FATAL ERROR: Failed to initialize Pub/Sub consumer:', initializationError);
    
}


