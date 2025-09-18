const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const NotificationTemplate = require('../models/NotificationTemplate');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('Email transporter initialized');
    } else {
      console.log('Email service not configured - missing SMTP environment variables');
    }
  }

  async sendNotificationEmail(userEmail, notification, templateData = {}) {
    try {
      if (!this.transporter) {
        console.log('Email service not configured, skipping email send');
        return false;
      }

      const v_template = await NotificationTemplate.findOne({ 
        type: notification.type, 
        active: true 
      });
      
      if (!v_template) {
        console.log(`No active template found for type: ${notification.type}, using default`);
        return await this.sendDefaultEmail(userEmail, notification);
      }

      const v_subjectTemplate = handlebars.compile(v_template.subject_template);
      const v_bodyTemplate = handlebars.compile(v_template.body_template);

      const v_templateContext = { 
        ...templateData, 
        ...notification.toObject ? notification.toObject() : notification 
      };

      const v_subject = v_subjectTemplate(v_templateContext);
      const v_html = v_bodyTemplate(v_templateContext);

      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@mflix.com',
        to: userEmail,
        subject: v_subject,
        html: v_html
      });

      console.log(`Email sent successfully to ${userEmail} for notification: ${notification.title}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendDefaultEmail(userEmail, notification) {
    try {
      const v_subject = `MFlix Notification: ${notification.title}`;
      const v_html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${notification.title}</h2>
          <p style="color: #666; line-height: 1.6;">${notification.message}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from MFlix. 
            <br>Notification Type: ${notification.type}
            <br>Priority: ${notification.priority}
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@mflix.com',
        to: userEmail,
        subject: v_subject,
        html: v_html
      });

      console.log(`Default email sent successfully to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Default email sending failed:', error);
      return false;
    }
  }

  async sendBatchEmail(userEmail, notifications) {
    try {
      if (!this.transporter) {
        console.log('Email service not configured, skipping batch email send');
        return false;
      }

      const v_subject = `MFlix Notifications Summary (${notifications.length} notifications)`;
      
      let v_html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You have ${notifications.length} new notifications</h2>
      `;

      notifications.forEach((notification, index) => {
        v_html += `
          <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
            <h3 style="color: #555; margin: 0 0 10px 0;">${notification.title}</h3>
            <p style="color: #666; margin: 0; line-height: 1.6;">${notification.message}</p>
            <small style="color: #999;">Type: ${notification.type} | Priority: ${notification.priority}</small>
          </div>
        `;
      });

      v_html += `
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification summary from MFlix.
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@mflix.com',
        to: userEmail,
        subject: v_subject,
        html: v_html
      });

      console.log(`Batch email sent successfully to ${userEmail} with ${notifications.length} notifications`);
      return true;
    } catch (error) {
      console.error('Batch email sending failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
