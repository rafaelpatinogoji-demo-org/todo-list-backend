const c_sampleTemplates = [
  {
    name: 'welcome_email',
    type: 'email',
    subject_template: 'Bienvenido a MFlix, {{user.name}}!',
    body_template: `
      <h1>¡Bienvenido a MFlix!</h1>
      <p>Hola {{user.name}},</p>
      <p>Gracias por unirte a nuestra plataforma de películas. Ahora puedes:</p>
      <ul>
        <li>Explorar miles de películas</li>
        <li>Dejar comentarios y reseñas</li>
        <li>Crear listas personalizadas</li>
      </ul>
      <p>¡Disfruta de la experiencia!</p>
      <p>El equipo de MFlix</p>
    `,
    variables: [
      { name: 'user.name', description: 'Nombre del usuario', required: true },
      { name: 'user.email', description: 'Email del usuario', required: true }
    ],
    is_active: true
  },
  {
    name: 'new_comment_notification',
    type: 'in_app',
    body_template: 'Nuevo comentario en "{{movie.title}}" de {{commenter.name}}',
    variables: [
      { name: 'movie.title', description: 'Título de la película', required: true },
      { name: 'commenter.name', description: 'Nombre del comentarista', required: true }
    ],
    is_active: true
  },
  {
    name: 'weekly_digest',
    type: 'email',
    subject_template: 'Tu resumen semanal de MFlix',
    body_template: `
      <h1>Resumen Semanal</h1>
      <p>Hola {{user.name}},</p>
      <p>Aquí tienes tu resumen de actividad de esta semana:</p>
      <ul>
        <li>{{stats.movies_watched}} películas vistas</li>
        <li>{{stats.comments_made}} comentarios realizados</li>
        <li>{{stats.new_movies}} nuevas películas agregadas</li>
      </ul>
      <p>¡Sigue explorando!</p>
    `,
    variables: [
      { name: 'user.name', description: 'Nombre del usuario', required: true },
      { name: 'stats.movies_watched', description: 'Películas vistas', required: false },
      { name: 'stats.comments_made', description: 'Comentarios realizados', required: false },
      { name: 'stats.new_movies', description: 'Nuevas películas', required: false }
    ],
    is_active: true
  }
];

module.exports = c_sampleTemplates;
