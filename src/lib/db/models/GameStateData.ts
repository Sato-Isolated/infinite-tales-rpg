import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface for game state data stored in MongoDB
 */
export interface IGameStateData extends Document {
	userId: string;
	sessionId?: string;
	key: string;
	data: any;
	size: number;
	lastModified: Date;
	version: number;
	metadata?: {
		description?: string;
		tags?: string[];
		isBackup?: boolean;
	};
	// Instance methods
	getDataSize(): number;
	isRecentlyModified(minutesAgo?: number): boolean;
}

/**
 * Interface for static methods on the GameStateData model
 */
export interface IGameStateDataModel extends Model<IGameStateData> {
	findByUserAndKey(userId: string, key: string): Promise<IGameStateData | null>;
	findByUser(userId: string): Promise<IGameStateData[]>;
	findRecentByUser(userId: string, hoursAgo?: number): Promise<IGameStateData[]>;
	createBackup(userId: string, key: string): Promise<IGameStateData | null>;
}

/**
 * MongoDB schema for storing game state data
 * Replaces File System Access API for cloud persistence
 */
const GameStateDataSchema = new Schema<IGameStateData>({
	userId: {
		type: String,
		required: true,
		index: true
	},
	sessionId: {
		type: String,
		index: true
	},
	key: {
		type: String,
		required: true,
		index: true
	},
	data: {
		type: Schema.Types.Mixed,
		required: true
	},
	size: {
		type: Number,
		required: true,
		default: 0
	},
	lastModified: {
		type: Date,
		default: Date.now,
		index: true
	},
	version: {
		type: Number,
		default: 1
	},
	metadata: {
		description: String,
		tags: [String],
		isBackup: {
			type: Boolean,
			default: false
		}
	}
}, {
	timestamps: true,
	collection: 'gameStateData'
});

// Compound indexes for efficient queries
GameStateDataSchema.index({ userId: 1, key: 1 }, { unique: true });
GameStateDataSchema.index({ userId: 1, lastModified: -1 });
GameStateDataSchema.index({ sessionId: 1, lastModified: -1 });

// Pre-save middleware to calculate data size
GameStateDataSchema.pre('save', function(this: IGameStateData) {
	if (this.isModified('data')) {
		try {
			const serialized = JSON.stringify(this.data);
			this.size = new TextEncoder().encode(serialized).length;
		} catch {
			this.size = 0;
		}
		this.lastModified = new Date();
		this.version += 1;
	}
});

// Instance methods
GameStateDataSchema.methods.getDataSize = function(): number {
	return this.size;
};

GameStateDataSchema.methods.isRecentlyModified = function(minutesAgo: number = 5): boolean {
	const threshold = new Date(Date.now() - minutesAgo * 60 * 1000);
	return this.lastModified > threshold;
};

// Static methods
GameStateDataSchema.statics.findByUserAndKey = function(userId: string, key: string) {
	return this.findOne({ userId, key });
};

GameStateDataSchema.statics.findByUser = function(userId: string) {
	return this.find({ userId }).sort({ lastModified: -1 });
};

GameStateDataSchema.statics.findRecentByUser = function(userId: string, hoursAgo: number = 24) {
	const threshold = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
	return this.find({ 
		userId, 
		lastModified: { $gte: threshold } 
	}).sort({ lastModified: -1 });
};

GameStateDataSchema.statics.createBackup = async function(userId: string, key: string) {
	const original = await GameStateData.findOne({ userId, key });
	if (!original) return null;

	const backup = new GameStateData({
		userId,
		sessionId: original.sessionId,
		key: `${key}_backup_${Date.now()}`,
		data: original.data,
		metadata: {
			...original.metadata,
			isBackup: true,
			description: `Backup of ${key} created at ${new Date().toISOString()}`
		}
	});

	return backup.save();
};

// Export the model
export const GameStateData: IGameStateDataModel = mongoose.model<IGameStateData, IGameStateDataModel>('GameStateData', GameStateDataSchema);

/**
 * User settings model for storing user preferences
 */
export interface IUserSettings extends Document {
	userId: string;
	preferences: {
		theme?: string;
		language?: string;
		notifications?: boolean;
		autoSave?: boolean;
		syncInterval?: number;
	};
	gameSettings: {
		difficulty?: string;
		autoRoll?: boolean;
		showAdvancedOptions?: boolean;
	};
	lastLogin: Date;
	isActive: boolean;
}

const UserSettingsSchema = new Schema<IUserSettings>({
	userId: {
		type: String,
		required: true,
		unique: true,
		index: true
	},
	preferences: {
		theme: {
			type: String,
			default: 'dark'
		},
		language: {
			type: String,
			default: 'en'
		},
		notifications: {
			type: Boolean,
			default: true
		},
		autoSave: {
			type: Boolean,
			default: true
		},
		syncInterval: {
			type: Number,
			default: 30000 // 30 seconds
		}
	},
	gameSettings: {
		difficulty: {
			type: String,
			default: 'normal'
		},
		autoRoll: {
			type: Boolean,
			default: false
		},
		showAdvancedOptions: {
			type: Boolean,
			default: false
		}
	},
	lastLogin: {
		type: Date,
		default: Date.now
	},
	isActive: {
		type: Boolean,
		default: true
	}
}, {
	timestamps: true,
	collection: 'userSettings'
});

export const UserSettings: Model<IUserSettings> = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
