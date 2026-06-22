import mongoose from 'mongoose';

const connectMongo = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trohub_db';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB successfully.');
    return { status: 'connected', db: 'mongodb' };
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
};

export default connectMongo;
