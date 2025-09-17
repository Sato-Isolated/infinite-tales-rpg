import mongoose from 'mongoose';
import { env } from '$env/dynamic/private';

// Type for stored game data (without userId)
export interface GameDataDocument {
	key: string;
	data: any;
	lastModified: Date;
}

// Change stream event types for reactivity
export interface ChangeStreamEvent {
	operationType: 'insert' | 'update' | 'delete' | 'replace';
	documentKey: { _id: any };
	fullDocument?: GameDataDocument;
	updateDescription?: {
		updatedFields: Record<string, any>;
		removedFields: string[];
	};
	clusterTime: any;
	wallTime: Date;
}

// Connection status for reactive UI
export interface ConnectionStatus {
	isConnected: boolean;
	isReconnecting: boolean;
	lastError?: string;
	changeStreamsSupported: boolean;
	lastConnectionTime?: Date;
	connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

// Simplified MongoDB schema
const gameDataSchema = new mongoose.Schema<GameDataDocument>({
	key: { type: String, required: true, unique: true, index: true },
	data: { type: mongoose.Schema.Types.Mixed, required: true },
	lastModified: { type: Date, default: Date.now }
});

// Add index for better change stream performance
gameDataSchema.index({ lastModified: 1 });

// Model
export const GameData = mongoose.models.GameData || mongoose.model<GameDataDocument>('GameData', gameDataSchema);

// MongoDB connection state management
let isConnected = false;
let isReconnecting = false;
let connectionQuality: ConnectionStatus['connectionQuality'] = 'disconnected';
let changeStreamsSupported = false;
let lastConnectionTime: Date | undefined;
let lastError: string | undefined;

// Event emitter for connection status changes
const connectionListeners = new Set<(status: ConnectionStatus) => void>();

// Change stream management
const changeStreamListeners = new Map<string, Set<(event: ChangeStreamEvent & { key: string }) => void>>();
let globalChangeStream: any = null;

/**
 * Broadcast connection status to all listeners
 */
function broadcastConnectionStatus(): void {
	const status: ConnectionStatus = {
		isConnected,
		isReconnecting,
		lastError,
		changeStreamsSupported,
		lastConnectionTime,
		connectionQuality
	};
	
	connectionListeners.forEach(listener => {
		try {
			listener(status);
		} catch (error) {
			console.warn('Error in connection status listener:', error);
		}
	});
}

/**
 * Subscribe to connection status changes
 */
export function onConnectionStatusChange(listener: (status: ConnectionStatus) => void): () => void {
	connectionListeners.add(listener);
	
	// Immediately call with current status
	broadcastConnectionStatus();
	
	// Return unsubscribe function
	return () => {
		connectionListeners.delete(listener);
	};
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
	return {
		isConnected,
		isReconnecting,
		lastError,
		changeStreamsSupported,
		lastConnectionTime,
		connectionQuality
	};
}

/**
 * Test MongoDB features and determine connection quality
 */
async function testConnectionQuality(): Promise<void> {
	try {
		const start = Date.now();
		
		// Test basic connectivity
		if (!mongoose.connection.db) {
			throw new Error('Database connection not available');
		}
		
		await mongoose.connection.db.admin().ping();
		const pingTime = Date.now() - start;
		
		// Determine connection quality based on ping time
		if (pingTime < 50) {
			connectionQuality = 'excellent';
		} else if (pingTime < 150) {
			connectionQuality = 'good';
		} else {
			connectionQuality = 'poor';
		}
		
		// Test change streams support safely - check server type first
		try {
			const adminDb = mongoose.connection.db.admin();
			const serverStatus = await adminDb.command({ isMaster: 1 });
			
			// Check multiple indicators for replica set
			const isReplicaSet = !!(
				serverStatus.setName || // Direct replica set name
				serverStatus.hosts || // Replica set hosts
				serverStatus.setVersion !== undefined // Replica set version
			);
			
			if (isReplicaSet) {
				// We have a replica set, enable change streams
				changeStreamsSupported = true;
				console.log(`✅ Replica set detected (${serverStatus.setName}), change streams enabled`);
			} else {
				// Standalone instance - permanently disable change streams
				changeStreamsSupported = false;
				console.log('ℹ️ Standalone MongoDB instance detected - change streams disabled (this is normal)');
				console.log('💡 For real-time features, consider using MongoDB Atlas or setting up a replica set');
			}
		} catch (error) {
			// If we can't determine server type, assume standalone for safety
			changeStreamsSupported = false;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.log('⚠️ Server type detection failed, disabling change streams for safety:', errorMessage);
		}
		
	} catch (error) {
		connectionQuality = 'poor';
		changeStreamsSupported = false;
		console.warn('Connection quality test failed:', error);
	}
}

export async function connectToMongoDB(): Promise<boolean> {
	if (isConnected) {
		return true;
	}

	if (!env.MONGODB_URI) {
		console.warn('MONGODB_URI not configured, MongoDB storage disabled');
		lastError = 'MONGODB_URI not configured';
		connectionQuality = 'disconnected';
		changeStreamsSupported = false; // Explicitly disable
		broadcastConnectionStatus();
		return false;
	}

	try {
		isReconnecting = true;
		lastError = undefined;
		changeStreamsSupported = false; // Start with disabled until proven otherwise
		broadcastConnectionStatus();

		await mongoose.connect(env.MONGODB_URI, {
			bufferCommands: false, // Disable mongoose buffering
			maxPoolSize: 10, // Maintain up to 10 socket connections
			serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
			socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
			heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds for better connection monitoring
		});
		
		isConnected = true;
		isReconnecting = false;
		lastConnectionTime = new Date();
		
		// Test connection quality and features
		await testConnectionQuality();
		
		// Set up connection event listeners for real-time status updates
		mongoose.connection.on('disconnected', () => {
			console.warn('⚠️ MongoDB disconnected');
			isConnected = false;
			connectionQuality = 'disconnected';
			changeStreamsSupported = false; // Disable on disconnect
			lastError = 'Connection lost';
			stopGlobalChangeStream(); // Ensure change stream is stopped
			broadcastConnectionStatus();
		});

		mongoose.connection.on('reconnected', () => {
			console.log('✅ MongoDB reconnected');
			isConnected = true;
			isReconnecting = false;
			lastConnectionTime = new Date();
			// Re-test quality and change stream support on reconnection
			testConnectionQuality().then(() => {
				broadcastConnectionStatus();
			});
		});

		mongoose.connection.on('error', (error) => {
			console.error('❌ MongoDB connection error:', error);
			lastError = error.message;
			connectionQuality = 'poor';
			changeStreamsSupported = false; // Disable on error
			stopGlobalChangeStream(); // Ensure change stream is stopped
			broadcastConnectionStatus();
		});

		console.log(`✅ Connected to MongoDB (${connectionQuality} quality, change streams: ${changeStreamsSupported ? 'enabled' : 'disabled'})`);
		broadcastConnectionStatus();
		return true;
	} catch (error) {
		console.error('❌ MongoDB connection failed:', error);
		isConnected = false;
		isReconnecting = false;
		changeStreamsSupported = false;
		lastError = error instanceof Error ? error.message : 'Unknown connection error';
		connectionQuality = 'disconnected';
		broadcastConnectionStatus();
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

/**
 * Subscribe to changes for specific keys or all keys
 * Returns unsubscribe function
 */
export function subscribeToChanges(
	keyPattern: string | null, // null for all keys, string for exact match
	listener: (event: ChangeStreamEvent & { key: string }) => void
): () => void {
	if (!changeStreamsSupported) {
		console.log('🚫 Change streams disabled - MongoDB standalone instance');
		console.log('💡 For real-time updates, switch to MongoDB replica set or Atlas');
		return () => {}; // Return no-op unsubscribe
	}

	const keyStr = keyPattern || 'all';
	
	if (!changeStreamListeners.has(keyStr)) {
		changeStreamListeners.set(keyStr, new Set());
	}
	changeStreamListeners.get(keyStr)!.add(listener);

	// Start global change stream if not already active
	startGlobalChangeStream();

	// Return unsubscribe function
	return () => {
		const listeners = changeStreamListeners.get(keyStr);
		if (listeners) {
			listeners.delete(listener);
			if (listeners.size === 0) {
				changeStreamListeners.delete(keyStr);
			}
		}
		
		// Stop global change stream if no more listeners
		if (changeStreamListeners.size === 0) {
			stopGlobalChangeStream();
		}
	};
}

/**
 * Permanently disable change streams (called when replica set error is detected)
 */
function permanentlyDisableChangeStreams(): void {
	console.log('🚫 Permanently disabling change streams for this session');
	console.log('💡 MongoDB change streams require replica set or Atlas cluster');
	
	changeStreamsSupported = false;
	
	// Stop any active change stream immediately
	stopGlobalChangeStream();
	
	// Clear all listeners since they won't work
	changeStreamListeners.clear();
	
	// Broadcast status update to inform UI
	broadcastConnectionStatus();
}

/**
 * Start global change stream for reactivity
 */
function startGlobalChangeStream(): void {
	// Multiple safety checks to prevent change stream attempts on standalone instances
	if (!changeStreamsSupported) {
		console.log('🚫 Change streams disabled - MongoDB standalone instance detected');
		console.log('💡 Change streams require MongoDB replica set or Atlas cluster');
		return;
	}

	if (globalChangeStream || !isConnected) {
		return;
	}

	// Additional safety check - verify we're still on a replica set before attempting
	if (mongoose.connection.db) {
		mongoose.connection.db.admin().command({ isMaster: 1 })
			.then(serverStatus => {
				const isReplicaSet = !!(serverStatus.setName || serverStatus.hosts || serverStatus.setVersion !== undefined);
				
				if (!isReplicaSet) {
					console.log('� Replica set check failed at stream start - disabling change streams');
					permanentlyDisableChangeStreams();
					return;
				}
				
				// Proceed with starting change stream only if replica set is confirmed
				createChangeStream();
			})
			.catch(error => {
				console.warn('Failed to verify replica set status:', error);
				permanentlyDisableChangeStreams();
			});
	} else {
		console.log('🚫 No database connection for change stream');
	}
}

/**
 * Actually create the change stream (separated for safety)
 */
function createChangeStream(): void {
	try {
		console.log('🔄 Creating change stream on confirmed replica set...');
		globalChangeStream = GameData.watch([], {
			fullDocument: 'updateLookup', // Get full document on updates
			maxAwaitTimeMS: 5000 // Prevent hanging
		});

		globalChangeStream.on('change', (change: any) => {
			try {
				const event: ChangeStreamEvent & { key: string } = {
					operationType: change.operationType,
					documentKey: change.documentKey,
					fullDocument: change.fullDocument,
					updateDescription: change.updateDescription,
					clusterTime: change.clusterTime,
					wallTime: change.wallTime || new Date(),
					key: change.fullDocument?.key || 'unknown'
				};

				// Broadcast to all relevant listeners
				changeStreamListeners.forEach((listeners, keyPattern) => {
					let shouldNotify = false;
					
					if (keyPattern === 'all') {
						shouldNotify = true;
					} else {
						shouldNotify = event.key === keyPattern;
					}

					if (shouldNotify) {
						listeners.forEach(listener => {
							try {
								listener(event);
							} catch (error) {
								console.warn('Error in change stream listener:', error);
							}
						});
					}
				});
			} catch (error) {
				console.error('Error processing change stream event:', error);
			}
		});

		globalChangeStream.on('error', (error: any) => {
			console.error('Change stream error:', error);
			
			// Check if this is the replica set error and permanently disable
			if (error.code === 40573 || error.codeName === 'Location40573' || 
				(error.message && error.message.includes('only supported on replica sets'))) {
				console.log('🚫 Change streams permanently disabled - standalone instance detected');
				permanentlyDisableChangeStreams();
				return; // Don't attempt restart
			}
			
			globalChangeStream = null;
			
			// Only attempt restart if change streams are still supposed to be supported
			if (changeStreamsSupported) {
				console.log('⚠️ Change stream error, retrying in 5 seconds...');
				setTimeout(() => {
					if (changeStreamListeners.size > 0 && changeStreamsSupported) {
						startGlobalChangeStream();
					}
				}, 5000);
			}
		});

		console.log('✅ Change stream active on replica set');
	} catch (error) {
		console.error('Failed to create change stream:', error);
		
		// Check if this is the replica set error and permanently disable
		const errorMessage = error instanceof Error ? error.message : '';
		if (errorMessage.includes('only supported on replica sets') || 
			errorMessage.includes('Location40573') ||
			(error as any)?.code === 40573) {
			console.log('🚫 Change streams permanently disabled - requires MongoDB replica set');
			permanentlyDisableChangeStreams();
		}
		
		globalChangeStream = null;
	}
}

/**
 * Stop global change stream
 */
function stopGlobalChangeStream(): void {
	if (globalChangeStream) {
		try {
			globalChangeStream.close();
			console.log('🛑 Global change stream stopped');
		} catch (error) {
			console.warn('Error stopping change stream:', error);
		}
		globalChangeStream = null;
	}
}

/**
 * Batch operations for better performance
 */
export async function saveBatch(items: Array<{ key: string; data: any }>): Promise<boolean> {
	if (!isConnected) {
		return false;
	}

	try {
		const operations = items.map(item => ({
			updateOne: {
				filter: { key: item.key },
				update: { 
					$set: { 
						data: item.data, 
						lastModified: new Date() 
					}
				},
				upsert: true
			}
		}));

		await GameData.bulkWrite(operations);
		console.log(`✅ Batch saved ${items.length} items`);
		return true;
	} catch (error) {
		console.error('❌ Batch save failed:', error);
		return false;
	}
}

/**
 * Get multiple items efficiently
 */
export async function loadBatch(keys: string[]): Promise<Record<string, any>> {
	if (!isConnected) {
		return {};
	}

	try {
		const documents = await GameData.find({ key: { $in: keys } });
		const result: Record<string, any> = {};
		
		documents.forEach(doc => {
			result[doc.key] = doc.data;
		});
		
		return result;
	} catch (error) {
		console.error('❌ Batch load failed:', error);
		return {};
	}
}

/**
 * Get MongoDB configuration information for debugging
 */
export async function getMongoDBInfo(): Promise<{
	isConnected: boolean;
	changeStreamsSupported: boolean;
	serverType: 'standalone' | 'replica-set' | 'sharded' | 'unknown';
	connectionQuality: string;
	recommendations: string[];
}> {
	const recommendations: string[] = [];
	let serverType: 'standalone' | 'replica-set' | 'sharded' | 'unknown' = 'unknown';

	try {
		if (mongoose.connection.db) {
			const adminDb = mongoose.connection.db.admin();
			const serverStatus = await adminDb.command({ isMaster: 1 });
			
			if (serverStatus.setName) {
				serverType = 'replica-set';
			} else if (serverStatus.msg === 'isdbgrid') {
				serverType = 'sharded';
			} else {
				serverType = 'standalone';
				recommendations.push('Consider using MongoDB replica set for real-time features');
				recommendations.push('For development: Use MongoDB Atlas or setup local replica set');
			}
		}
	} catch (error) {
		console.warn('Failed to get MongoDB server info:', error);
	}

	if (!changeStreamsSupported) {
		recommendations.push('Real-time updates unavailable - change streams require replica set');
	}

	return {
		isConnected,
		changeStreamsSupported,
		serverType,
		connectionQuality,
		recommendations
	};
}
