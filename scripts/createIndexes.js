const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    console.log('Creating indexes for recommendation system...');
    
    await db.collection('user_ratings').createIndex({ user_id: 1, movie_id: 1 }, { unique: true });
    await db.collection('user_ratings').createIndex({ movie_id: 1 });
    await db.collection('user_ratings').createIndex({ user_id: 1 });
    await db.collection('user_ratings').createIndex({ rating: -1 });
    console.log('User ratings indexes created');
    
    await db.collection('viewing_history').createIndex({ user_id: 1, viewed_at: -1 });
    await db.collection('viewing_history').createIndex({ movie_id: 1 });
    await db.collection('viewing_history').createIndex({ viewed_at: -1 });
    console.log('Viewing history indexes created');
    
    await db.collection('embedded_movies').createIndex({ genres: 1 });
    await db.collection('embedded_movies').createIndex({ 'imdb.rating': -1, 'imdb.votes': -1 });
    await db.collection('embedded_movies').createIndex({ year: -1 });
    console.log('Movie indexes for recommendations created');
    
    console.log('All indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
};

createIndexes();
