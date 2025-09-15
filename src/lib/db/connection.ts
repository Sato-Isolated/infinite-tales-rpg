import mongoose from 'mongoose';

/**
 * MongoDB connection manager for the hybrid storage system
 */
class MongoDBConnection {
        private isConnected = false;	/**
	 * Initialize MongoDB connection
	 */
	async connect(connectionString?: string): Promise<void> {
		if (this.isConnected) {
			return;
		}

		// Try to get connection string from different sources
		const mongoUri = connectionString 
			|| process.env.MONGODB_URI 
			|| localStorage.getItem('mongodb_connection_string')
			|| 'mongodb://localhost:27017/infinite-tales-rpg';

		try {
			await mongoose.connect(mongoUri, {
				serverSelectionTimeoutMS: 5000,
				connectTimeoutMS: 10000,
				// Modern options for Mongoose 8+
				maxPoolSize: 10,
				minPoolSize: 1,
			});

			this.isConnected = true;
			console.log('✅ MongoDB connected successfully');
		} catch (error) {
			console.warn('⚠️ MongoDB connection failed:', error);
			this.isConnected = false;
			throw error;
		}
	}

	/**
	 * Disconnect from MongoDB
	 */
	async disconnect(): Promise<void> {
		if (!this.isConnected) {
			return;
		}

		try {
			await mongoose.disconnect();
			this.isConnected = false;
			console.log('📴 MongoDB disconnected');
		} catch (error) {
			console.warn('⚠️ MongoDB disconnect error:', error);
		}
	}

	/**
	 * Check if MongoDB is connected
	 */
	isConnectedToMongoDB(): boolean {
		return this.isConnected && mongoose.connection.readyState === 1;
	}

	/**
	 * Get connection status information
	 */
	getConnectionStatus() {
		return {
			isConnected: this.isConnected,
			connectionState: mongoose.connection.readyState,
			host: mongoose.connection.host,
			name: mongoose.connection.name,
			readyState: this.getReadyStateText(mongoose.connection.readyState)
		};
	}

	private getReadyStateText(state: number): string {
		switch (state) {
			case 0: return 'disconnected';
			case 1: return 'connected';
			case 2: return 'connecting';
			case 3: return 'disconnecting';
			default: return 'unknown';
		}
	}

	/**
	 * Test MongoDB connection with a simple ping
	 */
	async testConnection(): Promise<boolean> {
		try {
			if (!this.isConnected || !mongoose.connection.db) {
				return false;
			}
			
			// Simple ping to test connection
			await mongoose.connection.db.admin().ping();
			return true;
		} catch {
			return false;
		}
	}
}

// Export singleton instance
export const mongoConnection = new MongoDBConnection();

/**
 * Initialize MongoDB connection with graceful error handling
 */
export async function initializeMongoDB(connectionString?: string): Promise<boolean> {
	try {
		await mongoConnection.connect(connectionString);
		return true;
	} catch (error) {
		console.warn('MongoDB initialization failed, will fallback to localStorage:', error);
		return false;
	}
}

/**
 * Cleanup MongoDB connection on app shutdown
 */
export async function cleanupMongoDB(): Promise<void> {
	await mongoConnection.disconnect();
}
