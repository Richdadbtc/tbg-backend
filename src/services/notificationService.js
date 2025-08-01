const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Initialize Firebase Admin (add this to your main server file)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
}

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