const admin = require('firebase-admin');
const Notification = require('../models/Notification');

// Initialize Firebase Admin (if not already done)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Send FCM notification
exports.sendFCMNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Send notification to multiple users
exports.sendBulkNotification = async (fcmTokens, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('Successfully sent bulk message:', response);
    return response;
  } catch (error) {
    console.error('Error sending bulk message:', error);
    throw error;
  }
};

// Create and send notification
exports.createAndSendNotification = async (userId, title, body, type, data = {}) => {
  try {
    // Create notification in database
    const notification = new Notification({
      userId,
      title,
      body,
      type,
      data,
    });
    await notification.save();

    // Get user's FCM token
    const User = require('../models/User');
    const user = await User.findById(userId).select('fcmToken');
    
    if (user && user.fcmToken) {
      await this.sendFCMNotification(user.fcmToken, title, body, data);
    }

    return notification;
  } catch (error) {
    console.error('Error creating and sending notification:', error);
    throw error;
  }
};
const User = require('../models/User');

// Send notification to user
exports.sendNotification = async (userId, notificationData) => {
  try {
    // Save notification to database
    const notification = new Notification({
      userId,
      ...notificationData
    });
    
    await notification.save();
    
    // Get user's FCM token
    const user = await User.findById(userId).select('fcmToken');
    
    if (user && user.fcmToken) {
      // Send FCM notification
      const message = {
        token: user.fcmToken,
        notification: {
          title: notificationData.title,
          body: notificationData.body
        },
        data: {
          type: notificationData.type,
          notificationId: notification._id.toString(),
          ...Object.fromEntries(
            Object.entries(notificationData.data || {}).map(([k, v]) => [k, String(v)])
          )
        }
      };
      
      try {
        await admin.messaging().send(message);
        console.log('FCM notification sent successfully');
      } catch (fcmError) {
        console.error('FCM error:', fcmError);
        // If token is invalid, remove it
        if (fcmError.code === 'messaging/registration-token-not-registered') {
          await User.findByIdAndUpdate(userId, { $unset: { fcmToken: 1 } });
        }
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Notification error:', error);
    throw error;
  }
};

// Send bulk notifications
exports.sendBulkNotification = async (userIds, notificationData) => {
  try {
    const notifications = userIds.map(userId => ({
      userId,
      ...notificationData
    }));
    
    await Notification.insertMany(notifications);
    
    // Get FCM tokens
    const users = await User.find({
      _id: { $in: userIds },
      fcmToken: { $exists: true, $ne: null }
    }).select('fcmToken');
    
    if (users.length > 0) {
      const tokens = users.map(user => user.fcmToken);
      
      const message = {
        tokens,
        notification: {
          title: notificationData.title,
          body: notificationData.body
        },
        data: {
          type: notificationData.type,
          ...Object.fromEntries(
            Object.entries(notificationData.data || {}).map(([k, v]) => [k, String(v)])
          )
        }
      };
      
      try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(`Bulk notification sent: ${response.successCount}/${tokens.length}`);
      } catch (fcmError) {
        console.error('Bulk FCM error:', fcmError);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Bulk notification error:', error);
    throw error;
  }
};