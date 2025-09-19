const NotificationTemplate = require('../models/NotificationTemplate');

const c_defaultTemplates = [
  {
    name: 'movie_comment',
    type: 'movie_comment',
    title_template: 'Nuevo comentario en {{movieTitle}}',
    message_template: '{{userName}} ha comentado en la película {{movieTitle}}: "{{commentText}}"',
    email_template: '<h2>Nuevo comentario</h2><p>{{userName}} ha comentado en {{movieTitle}}:</p><blockquote>{{commentText}}</blockquote>',
    variables: ['userName', 'movieTitle', 'commentText']
  },
  {
    name: 'movie_recommendation',
    type: 'movie_recommendation',
    title_template: 'Recomendación de película',
    message_template: 'Te recomendamos la película {{movieTitle}} basada en tus gustos',
    email_template: '<h2>Nueva recomendación</h2><p>Creemos que te gustará {{movieTitle}}</p>',
    variables: ['movieTitle']
  },
  {
    name: 'system_update',
    type: 'system_update',
    title_template: 'Actualización del sistema',
    message_template: '{{updateMessage}}',
    email_template: '<h2>Actualización</h2><p>{{updateMessage}}</p>',
    variables: ['updateMessage']
  }
];

const f_seedTemplates = async () => {
  try {
    for (const v_template of c_defaultTemplates) {
      await NotificationTemplate.findOneAndUpdate(
        { name: v_template.name },
        v_template,
        { upsert: true }
      );
    }
    console.log('Notification templates seeded successfully');
  } catch (p_error) {
    console.error('Error seeding templates:', p_error);
  }
};

module.exports = { f_seedTemplates };
