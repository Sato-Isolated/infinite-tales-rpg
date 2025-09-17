/**
 * Types for the hybrid localStorage + File System storage system
 * No backward compatibility — clean implementation
 */

export interface HybridStorageConfig {
	/** Keys that must be stored using the File System */
	fileSystemKeys: string[];
	/** Keys that remain in localStorage */
	localStorageKeys: string[];
	/** Size threshold in bytes for automatic detection */
	sizeThreshold: number;
	/** Analysis statistics */
	analysis: {
		totalSize: number;
		fileSystemSize: number;
		localStorageSize: number;
		fileSystemPercentage: string;
		localStoragePercentage: string;
	};
}

export interface FileSystemStorageManager {
	/** Initialize the manager and request permissions */
	initialize(): Promise<void>;
	/** Check whether the File System Access API is supported */
	isSupported(): boolean;
	/** Save a value to a file */
	save<T>(key: string, value: T): Promise<void>;
	/** Load a value from a file */
	load<T>(key: string, fallback?: T): Promise<T | undefined>;
	/** Delete a file */
	remove(key: string): Promise<void>;
	/** List all saved files */
	listFiles(): Promise<string[]>;
	/** Clear all files */
	clear(): Promise<void>;
	/** Get a file size */
	getFileSize(key: string): Promise<number>;
}

export type StorageLocation = 'localStorage' | 'fileSystem';

export interface HybridStorageItem<T> {
	/** Stored value */
	value: T;
	/** Storage location */
	location: StorageLocation;
	/** Size in bytes */
	size: number;
	/** Last modification timestamp */
	lastModified: number;
}

export interface UseHybridLocalStorageReturn<T> {
	/** Reactive value */
	get value(): T;
	/** Set a new value */
	set value(newValue: T);
	/** Update the value with a function */
	update(updater: (current: T) => T): void;
	/** Reset to the initial value */
	reset(): void;
	/** Reset a specific property */
	resetProperty(property: keyof T): void;
	/** Storage information */
	readonly storageInfo: {
		location: StorageLocation;
		size: number;
		isHydrated: boolean;
		isMounted: boolean;
		isInitializing: boolean;
		connectionStatus?: {
			isConnected: boolean;
			connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
			changeStreamsSupported: boolean;
		};
	};
	/** Force a manual save */
	forceSave(): Promise<void>;
	/** Force a reload from storage */
	forceReload(): Promise<void>;
	/** Subscribe to external changes (for real-time updates) */
	subscribe?(listener: (newValue: T) => void): () => void;
}

export interface HybridStorageOptions {
	/** Force a specific storage location */
	forceLocation?: StorageLocation;
	/** Disable in-memory cache */
	disableMemoryCache?: boolean;
	/** Debounce delay for saves (ms) */
	saveDebounceMs?: number;
	/** Enable debug logs */
	enableDebugLogs?: boolean;
	/** Enable real-time reactive updates from MongoDB changes */
	enableReactiveUpdates?: boolean;
	/** Enable optimistic updates for better UX */
	enableOptimisticUpdates?: boolean;
}

export interface HybridStorageError extends Error {
	code: 'FILESYSTEM_NOT_SUPPORTED' | 'FILESYSTEM_PERMISSION_DENIED' | 'FILESYSTEM_WRITE_ERROR' | 'LOCALSTORAGE_QUOTA_EXCEEDED' | 'INVALID_JSON' | 'KEY_NOT_FOUND';
	storageLocation: StorageLocation;
	originalError?: Error;
}

/**
 * In-memory cache to optimize performance
 */
export interface MemoryCache<T> {
	value: T;
	timestamp: number;
	location: StorageLocation;
	size: number;
}

/**
 * Hybrid system events
 */
export interface HybridStorageEventMap {
	'storage-changed': {
		key: string;
		newValue: unknown;
		oldValue: unknown;
		location: StorageLocation;
	};
	'storage-error': {
		key: string;
		error: HybridStorageError;
		location: StorageLocation;
	};
	'storage-cleared': {
		location?: StorageLocation;
	};
	'filesystem-initialized': {
		supported: boolean;
		permissionGranted: boolean;
	};
}

/**
 * Interface to listen to hybrid system events
 */
export interface HybridStorageEventTarget {
	addEventListener<K extends keyof HybridStorageEventMap>(
		type: K,
		listener: (event: CustomEvent<HybridStorageEventMap[K]>) => void
	): void;
	removeEventListener<K extends keyof HybridStorageEventMap>(
		type: K,
		listener: (event: CustomEvent<HybridStorageEventMap[K]>) => void
	): void;
	dispatchEvent<K extends keyof HybridStorageEventMap>(
		type: K,
		detail: HybridStorageEventMap[K]
	): void;
}
