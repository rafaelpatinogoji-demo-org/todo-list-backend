const nodemailer = require('nodemailer');

const c_transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const f_sendEmailNotification = async (p_notification, p_user, p_template = null) => {
  try {
    let v_subject = p_notification.title;
    let v_body = p_notification.message;

    if (p_template) {
      v_subject = f_processTemplate(p_template.subject_template, {
        user: p_user,
        notification: p_notification
      });
      v_body = f_processTemplate(p_template.body_template, {
        user: p_user,
        notification: p_notification
      });
    }

    const v_mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mflix.com',
      to: p_user.email,
      subject: v_subject,
      html: v_body
    };

    const v_result = await c_transporter.sendMail(v_mailOptions);
    
    return {
      success: true,
      messageId: v_result.messageId,
      response: v_result.response
    };
  } catch (p_error) {
    console.error('Error sending email:', p_error);
    return {
      success: false,
      error: p_error.message
    };
  }
};

const f_processTemplate = (p_template, p_variables) => {
  let v_processedTemplate = p_template;
  
  Object.keys(p_variables).forEach(key => {
    const v_value = p_variables[key];
    if (typeof v_value === 'object') {
      Object.keys(v_value).forEach(subKey => {
        const v_placeholder = `{{${key}.${subKey}}}`;
        v_processedTemplate = v_processedTemplate.replace(
          new RegExp(v_placeholder, 'g'),
          v_value[subKey]
        );
      });
    } else {
      const v_placeholder = `{{${key}}}`;
      v_processedTemplate = v_processedTemplate.replace(
        new RegExp(v_placeholder, 'g'),
        v_value
      );
    }
  });
  
  return v_processedTemplate;
};

module.exports = {
  f_sendEmailNotification,
  f_processTemplate
};
