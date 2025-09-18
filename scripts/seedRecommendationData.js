const mongoose = require('mongoose');
const User = require('../src/models/User');
const UserRating = require('../src/models/UserRating');
const ViewingHistory = require('../src/models/ViewingHistory');
const EmbeddedMovie = require('../src/models/EmbeddedMovie');
const connectDB = require('../src/config/database');

const f_seedTestData = async () => {
  try {
    await connectDB();
    
    console.log('Creating test users...');
    const v_testUsers = await User.create([
      { 
        name: 'Test User 1', 
        email: 'test1@example.com', 
        password: 'password123',
        preferences: {
          favorite_genres: ['Action', 'Drama'],
          preferred_languages: ['English']
        }
      },
      { 
        name: 'Test User 2', 
        email: 'test2@example.com', 
        password: 'password123',
        preferences: {
          favorite_genres: ['Comedy', 'Romance'],
          preferred_languages: ['English']
        }
      }
    ]);
    
    console.log('Getting sample movies...');
    const v_movies = await EmbeddedMovie.find().limit(20);
    
    if (v_movies.length === 0) {
      console.log('No movies found in database. Please ensure embedded_movies collection has data.');
      return;
    }
    
    console.log('Creating test ratings...');
    const v_ratings = [];
    v_testUsers.forEach((user, userIndex) => {
      v_movies.slice(0, 10).forEach((movie, movieIndex) => {
        const v_rating = userIndex === 0 ? 
          (movieIndex < 5 ? 5 : Math.floor(Math.random() * 3) + 1) :
          (movieIndex < 3 ? 4 : Math.floor(Math.random() * 4) + 2);
        
        v_ratings.push({
          user_id: user._id,
          movie_id: movie._id,
          rating: v_rating
        });
      });
    });
    
    await UserRating.create(v_ratings);
    
    console.log('Creating test viewing history...');
    const v_viewingHistory = [];
    v_testUsers.forEach(user => {
      v_movies.slice(0, 8).forEach(movie => {
        v_viewingHistory.push({
          user_id: user._id,
          movie_id: movie._id,
          watch_duration: Math.floor(Math.random() * 120) + 30,
          completed: Math.random() > 0.3
        });
      });
    });
    
    await ViewingHistory.create(v_viewingHistory);
    
    console.log('Test data seeded successfully!');
    console.log(`Created ${v_testUsers.length} users`);
    console.log(`Created ${v_ratings.length} ratings`);
    console.log(`Created ${v_viewingHistory.length} viewing history entries`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test data:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  f_seedTestData();
}

module.exports = { f_seedTestData };
