import mongoose from 'mongoose';
import { env } from '$env/dynamic/private';

// Type for stored game data (without userId)
export interface GameDataDocument {
	key: string;
	data: any;
	lastModified: Date;
}

// Simplified MongoDB schema
const gameDataSchema = new mongoose.Schema<GameDataDocument>({
	key: { type: String, required: true, unique: true, index: true },
	data: { type: mongoose.Schema.Types.Mixed, required: true },
	lastModified: { type: Date, default: Date.now }
});

// Model
export const GameData = mongoose.models.GameData || mongoose.model<GameDataDocument>('GameData', gameDataSchema);

// MongoDB connection (singleton)
let isConnected = false;

export async function connectToMongoDB(): Promise<boolean> {
	if (isConnected) {
		return true;
	}

	if (!env.MONGODB_URI) {
		console.warn('MONGODB_URI not configured, MongoDB storage disabled');
		return false;
	}

	try {
		await mongoose.connect(env.MONGODB_URI, {
			bufferCommands: false, // Disable mongoose buffering
			maxPoolSize: 10, // Maintain up to 10 socket connections
			serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
			socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
		});
		
		isConnected = true;
		console.log('✅ Connected to MongoDB');
		return true;
	} catch (error) {
		console.error('❌ MongoDB connection failed:', error);
		return false;
	}
}

// Utility function to ensure MongoDB is connected
export async function ensureMongoDBConnection(): Promise<boolean> {
	if (mongoose.connection.readyState === 1) {
		return true; // Already connected
	}
	
	return await connectToMongoDB();
}
