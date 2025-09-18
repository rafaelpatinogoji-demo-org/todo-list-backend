const mongoose = require('mongoose');
const NotificationTemplate = require('../models/NotificationTemplate');
require('dotenv').config();

const defaultTemplates = [
  {
    name: 'comment_notification',
    type: 'comment',
    subject_template: 'New Comment on MFlix - {{title}}',
    body_template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">{{title}}</h2>
        <p style="color: #666; line-height: 1.6;">{{message}}</p>
        {{#if data.commenter_name}}
        <p style="color: #888;">Comment by: <strong>{{data.commenter_name}}</strong></p>
        {{/if}}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated notification from MFlix.
          <br>You can manage your notification preferences in your account settings.
        </p>
      </div>
    `,
    variables: [
      { name: 'title', description: 'Notification title', required: true },
      { name: 'message', description: 'Notification message', required: true },
      { name: 'data.commenter_name', description: 'Name of the person who commented', required: false }
    ],
    active: true
  },
  {
    name: 'movie_recommendation',
    type: 'movie_recommendation',
    subject_template: 'New Movie Recommendation - {{title}}',
    body_template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🎬 {{title}}</h2>
        <p style="color: #666; line-height: 1.6;">{{message}}</p>
        {{#if data.movie_title}}
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #555;">Recommended Movie: {{data.movie_title}}</h3>
          {{#if data.movie_plot}}
          <p style="margin: 0; color: #777; font-style: italic;">{{data.movie_plot}}</p>
          {{/if}}
        </div>
        {{/if}}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated recommendation from MFlix.
          <br>You can manage your notification preferences in your account settings.
        </p>
      </div>
    `,
    variables: [
      { name: 'title', description: 'Notification title', required: true },
      { name: 'message', description: 'Notification message', required: true },
      { name: 'data.movie_title', description: 'Title of recommended movie', required: false },
      { name: 'data.movie_plot', description: 'Plot of recommended movie', required: false }
    ],
    active: true
  },
  {
    name: 'system_notification',
    type: 'system',
    subject_template: 'MFlix System Notification - {{title}}',
    body_template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin: 0;">⚠️ {{title}}</h2>
        </div>
        <p style="color: #666; line-height: 1.6;">{{message}}</p>
        {{#if data.action_required}}
        <div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #f57c00;"><strong>Action Required:</strong> {{data.action_required}}</p>
        </div>
        {{/if}}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is a system notification from MFlix.
          <br>System notifications cannot be disabled for security reasons.
        </p>
      </div>
    `,
    variables: [
      { name: 'title', description: 'Notification title', required: true },
      { name: 'message', description: 'Notification message', required: true },
      { name: 'data.action_required', description: 'Action required from user', required: false }
    ],
    active: true
  },
  {
    name: 'promotional_notification',
    type: 'promotional',
    subject_template: 'Special Offer from MFlix - {{title}}',
    body_template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">🎉 {{title}}</h2>
        </div>
        <div style="padding: 20px; background: white; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #666; line-height: 1.6; font-size: 16px;">{{message}}</p>
          {{#if data.offer_code}}
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center;">
            <p style="margin: 0; color: #333;"><strong>Promo Code:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #667eea;">{{data.offer_code}}</p>
          </div>
          {{/if}}
          {{#if data.expires_at}}
          <p style="color: #dc3545; font-weight: bold; text-align: center;">Expires: {{data.expires_at}}</p>
          {{/if}}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is a promotional notification from MFlix.
          <br>You can unsubscribe from promotional emails in your account settings.
        </p>
      </div>
    `,
    variables: [
      { name: 'title', description: 'Notification title', required: true },
      { name: 'message', description: 'Notification message', required: true },
      { name: 'data.offer_code', description: 'Promotional code', required: false },
      { name: 'data.expires_at', description: 'Expiration date', required: false }
    ],
    active: true
  }
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const template of defaultTemplates) {
      const existingTemplate = await NotificationTemplate.findOne({ name: template.name });
      if (!existingTemplate) {
        await NotificationTemplate.create(template);
        console.log(`Created template: ${template.name}`);
      } else {
        console.log(`Template already exists: ${template.name}`);
      }
    }

    console.log('Template seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedTemplates();
}

module.exports = { seedTemplates, defaultTemplates };
