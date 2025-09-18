const mongoose = require('mongoose');
const UserEvent = require('../models/UserEvent');
const MovieAnalytics = require('../models/MovieAnalytics');
const Booking = require('../models/Booking');
const Dashboard = require('../models/Dashboard');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
require('dotenv').config();

const f_seedAnalyticsData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB para seeding');

    const v_users = await User.find().limit(5);
    const v_movies = await Movie.find().limit(10);
    const v_theaters = await Theater.find().limit(3);

    if (v_users.length === 0 || v_movies.length === 0) {
      console.log('No hay usuarios o películas suficientes para generar datos de prueba');
      return;
    }

    await UserEvent.deleteMany({});
    await MovieAnalytics.deleteMany({});
    await Booking.deleteMany({});
    await Dashboard.deleteMany({});

    const v_userEvents = [];
    const v_eventTypes = ['page_view', 'movie_view', 'search', 'comment_create'];
    
    for (let i = 0; i < 100; i++) {
      const v_randomUser = v_users[Math.floor(Math.random() * v_users.length)];
      const v_randomMovie = v_movies[Math.floor(Math.random() * v_movies.length)];
      const v_eventType = v_eventTypes[Math.floor(Math.random() * v_eventTypes.length)];
      
      const v_event = {
        user_id: v_randomUser._id,
        event_type: v_eventType,
        event_data: {},
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Test Browser)'
      };

      if (v_eventType === 'movie_view') {
        v_event.event_data.movie_id = v_randomMovie._id;
        v_event.event_data.duration = Math.floor(Math.random() * 7200); // 0-2 horas en segundos
      } else if (v_eventType === 'search') {
        v_event.event_data.search_query = ['action', 'comedy', 'drama', 'thriller'][Math.floor(Math.random() * 4)];
      } else if (v_eventType === 'page_view') {
        v_event.event_data.page_url = ['/movies', '/theaters', '/profile'][Math.floor(Math.random() * 3)];
      }

      v_userEvents.push(v_event);
    }

    await UserEvent.insertMany(v_userEvents);
    console.log('Eventos de usuario creados:', v_userEvents.length);

    const v_movieAnalytics = [];
    for (const v_movie of v_movies) {
      const v_viewCount = Math.floor(Math.random() * 1000);
      const v_analytics = {
        movie_id: v_movie._id,
        view_count: v_viewCount,
        weekly_views: Math.floor(v_viewCount * 0.3),
        monthly_views: Math.floor(v_viewCount * 0.8),
        trending_score: Math.floor(Math.random() * 100),
        average_rating: Math.random() * 5,
        comment_count: Math.floor(Math.random() * 50),
        daily_views: []
      };

      for (let i = 0; i < 7; i++) {
        v_analytics.daily_views.push({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          views: Math.floor(Math.random() * 50)
        });
      }

      v_movieAnalytics.push(v_analytics);
    }

    await MovieAnalytics.insertMany(v_movieAnalytics);
    console.log('Análisis de películas creados:', v_movieAnalytics.length);

    if (v_theaters.length > 0) {
      const v_bookings = [];
      for (let i = 0; i < 50; i++) {
        const v_randomUser = v_users[Math.floor(Math.random() * v_users.length)];
        const v_randomMovie = v_movies[Math.floor(Math.random() * v_movies.length)];
        const v_randomTheater = v_theaters[Math.floor(Math.random() * v_theaters.length)];
        
        const v_booking = {
          user_id: v_randomUser._id,
          movie_id: v_randomMovie._id,
          theater_id: v_randomTheater._id,
          booking_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          show_date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          seats: [
            { row: 'A', number: Math.floor(Math.random() * 20) + 1 },
            { row: 'A', number: Math.floor(Math.random() * 20) + 1 }
          ],
          total_amount: Math.floor(Math.random() * 50) + 10,
          payment_status: ['completed', 'pending', 'cancelled'][Math.floor(Math.random() * 3)],
          booking_status: ['confirmed', 'cancelled', 'completed'][Math.floor(Math.random() * 3)]
        };

        v_bookings.push(v_booking);
      }

      await Booking.insertMany(v_bookings);
      console.log('Reservas creadas:', v_bookings.length);
    }

    const v_dashboards = [
      {
        name: 'Dashboard Administrador',
        user_role: 'admin',
        widgets: [
          {
            type: 'chart',
            title: 'Comportamiento de Usuario',
            data_source: 'user_behavior',
            config: { chart_type: 'bar' },
            position: { x: 0, y: 0, width: 6, height: 4 }
          },
          {
            type: 'metric',
            title: 'Popularidad de Películas',
            data_source: 'movie_popularity',
            config: { metric_type: 'trending' },
            position: { x: 6, y: 0, width: 6, height: 4 }
          },
          {
            type: 'chart',
            title: 'Ingresos',
            data_source: 'revenue',
            config: { chart_type: 'line' },
            position: { x: 0, y: 4, width: 12, height: 4 }
          },
          {
            type: 'table',
            title: 'Salud del Sistema',
            data_source: 'system_health',
            config: { show_errors: true },
            position: { x: 0, y: 8, width: 12, height: 4 }
          }
        ],
        is_default: true
      },
      {
        name: 'Dashboard Manager',
        user_role: 'manager',
        widgets: [
          {
            type: 'chart',
            title: 'Popularidad de Películas',
            data_source: 'movie_popularity',
            config: { chart_type: 'pie' },
            position: { x: 0, y: 0, width: 6, height: 6 }
          },
          {
            type: 'chart',
            title: 'Ingresos',
            data_source: 'revenue',
            config: { chart_type: 'bar' },
            position: { x: 6, y: 0, width: 6, height: 6 }
          }
        ],
        is_default: true
      },
      {
        name: 'Dashboard Usuario',
        user_role: 'user',
        widgets: [
          {
            type: 'metric',
            title: 'Películas Populares',
            data_source: 'movie_popularity',
            config: { metric_type: 'top_movies' },
            position: { x: 0, y: 0, width: 12, height: 6 }
          }
        ],
        is_default: true
      }
    ];

    await Dashboard.insertMany(v_dashboards);
    console.log('Dashboards creados:', v_dashboards.length);

    console.log('Seeding de datos de analytics completado exitosamente');
    process.exit(0);
  } catch (p_error) {
    console.error('Error en seeding:', p_error);
    process.exit(1);
  }
};

if (require.main === module) {
  f_seedAnalyticsData();
}

module.exports = f_seedAnalyticsData;
