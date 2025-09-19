const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const NotificationTemplate = require('../models/NotificationTemplate');

const v_emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const v_serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(v_serviceAccount)
    });
  } catch (p_error) {
    console.log('Firebase not configured:', p_error.message);
  }
}

const f_sendRealTimeNotification = async (p_notification) => {
  try {
    const { f_getIO } = require('../config/socket');
    const io = f_getIO();
    io.to(`user_${p_notification.user_id}`).emit('notification', p_notification);
    
    await require('../models/Notification').findByIdAndUpdate(
      p_notification._id,
      { 'delivery_status.realtime': true }
    );
  } catch (p_error) {
    console.error('Error sending real-time notification:', p_error);
  }
};

const f_sendEmailNotification = async (p_notification) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email not configured, skipping email notification');
      return;
    }

    const v_user = await require('../models/User').findById(p_notification.user_id);
    if (!v_user) return;

    const v_mailOptions = {
      from: process.env.EMAIL_USER,
      to: v_user.email,
      subject: p_notification.title,
      html: `
        <h2>${p_notification.title}</h2>
        <p>${p_notification.message}</p>
        <p><small>Enviado desde MFlix</small></p>
      `
    };

    await v_emailTransporter.sendMail(v_mailOptions);
    
    await require('../models/Notification').findByIdAndUpdate(
      p_notification._id,
      { 'delivery_status.email': true }
    );
  } catch (p_error) {
    console.error('Error sending email notification:', p_error);
  }
};

const f_sendPushNotification = async (p_notification) => {
  try {
    if (!admin.apps.length) {
      console.log('Firebase not configured, skipping push notification');
      return;
    }

    
    const v_message = {
      notification: {
        title: p_notification.title,
        body: p_notification.message
      },
      data: {
        notificationId: p_notification._id.toString(),
        type: p_notification.type
      }
    };

    
    await require('../models/Notification').findByIdAndUpdate(
      p_notification._id,
      { 'delivery_status.push': true }
    );
  } catch (p_error) {
    console.error('Error sending push notification:', p_error);
  }
};

const f_processTemplate = async (p_templateName, p_variables) => {
  try {
    const v_template = await NotificationTemplate.findOne({ name: p_templateName });
    if (!v_template) {
      throw new Error('Template not found');
    }

    let v_title = v_template.title_template;
    let v_message = v_template.message_template;

    Object.keys(p_variables).forEach(v_key => {
      const v_regex = new RegExp(`{{${v_key}}}`, 'g');
      v_title = v_title.replace(v_regex, p_variables[v_key]);
      v_message = v_message.replace(v_regex, p_variables[v_key]);
    });

    return {
      title: v_title,
      message: v_message,
      type: v_template.type
    };
  } catch (p_error) {
    console.error('Error processing template:', p_error);
    throw p_error;
  }
};

const f_sendBatchNotifications = async (p_notifications) => {
  try {
    const v_batchSize = 100;
    for (let i = 0; i < p_notifications.length; i += v_batchSize) {
      const v_batch = p_notifications.slice(i, i + v_batchSize);
      await Promise.all(v_batch.map(async (p_notification) => {
        await f_sendRealTimeNotification(p_notification);
        await new Promise(resolve => setTimeout(resolve, 100));
      }));
    }
  } catch (p_error) {
    console.error('Error sending batch notifications:', p_error);
  }
};

module.exports = {
  f_sendRealTimeNotification,
  f_sendEmailNotification,
  f_sendPushNotification,
  f_processTemplate,
  f_sendBatchNotifications
};
