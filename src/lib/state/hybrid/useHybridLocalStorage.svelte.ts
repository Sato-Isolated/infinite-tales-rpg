import { getContext, setContext } from 'svelte';

import { onMount } from 'svelte';
import cloneDeep from 'lodash.clonedeep';
import type {
	UseHybridLocalStorageReturn,
	HybridStorageOptions,
	StorageLocation,
	MemoryCache,
	HybridStorageError
} from './types.js';
import { mongoStorageManager } from './mongoStorageManager.js';
import { getStorageLocation, logConfigInfo } from './config.js';

/**
 * Manual MongoDB initialization function (for debug panel)
 * Allows retrying even after a previous failure
 */
export async function initializeMongoDBManually(userId?: string): Promise<void> {
	const info = mongoStorageManager.getInfo();
	if (!info.isSupported) {
		throw new Error('MongoDB not supported or not connected');
	}

	// Reset flags to allow a new attempt
	mongoDBInitAttempted = false;
	mongoDBInitialized = false;
	mongoDBInitPromise = null;

	await mongoStorageManager.initialize();
	mongoDBInitialized = true;
	mongoDBInitAttempted = true;

	console.log('✅ MongoDB manually initialized');
}

/**
 * Returns MongoDB status
 */
export function getMongoDBStatus() {
	const info = mongoStorageManager.getInfo();
	return {
		isSupported: info.isSupported,
		isInitialized: mongoDBInitialized,
		wasAttempted: mongoDBInitAttempted
	};
}

/**
 * Reset MongoDB state (for testing)
 */
export function resetMongoDBState() {
	mongoDBInitialized = false;
	mongoDBInitAttempted = false;
	mongoDBInitPromise = null;
}
/**
 * Optimized deep comparison to avoid JSON serialization problems
 */
function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;

	if (a == null || b == null) return a === b;

	if (typeof a !== typeof b) return false;

	if (typeof a !== 'object') return a === b;

	if (Array.isArray(a) !== Array.isArray(b)) return false;

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual(a[key], b[key])) return false;
	}

	return true;
}

const memoryCache = new Map<string, MemoryCache<unknown>>();

/**
 * Global indicator for MongoDB initialization
 */
let mongoDBInitialized = false;
let mongoDBInitPromise: Promise<void> | null = null;
let mongoDBInitAttempted = false; // New: avoids repeated attempts

/**
 * Svelte 5 hook for hybrid localStorage + File System storage
 * API identical to useHybridLocalStorage but with intelligent storage
 */
export function useHybridLocalStorage<T>(
	key: string,
	initialValue?: T,
	options: HybridStorageOptions = {}
): UseHybridLocalStorageReturn<T> {
	if (!key || typeof key !== 'string') {
		throw new Error('useHybridLocalStorage requires a valid string key');
	}

	// Configuration and state
	const storageLocation = options.forceLocation || getStorageLocation(key);
	const saveDebounceMs = options.saveDebounceMs || 300;
	const enableDebugLogs = options.enableDebugLogs || false;

	// Temporary debug for problematic keys - disabled now that the problem is resolved
	const isDebugKey = false; // ['gameActionsState', 'characterState', 'characterStatsState'].includes(key);

	// Svelte 5 reactive state
	let value = $state<T | undefined>(initialValue !== undefined ? cloneDeep(initialValue) : undefined);
	let isMounted = $state(false);
	let hasHydrated = $state(false);
	let lastSavedValue: T | undefined = $state<T | undefined>(undefined);
	let currentSize = $state(initialValue !== undefined ? calculateSize(initialValue) : 0);
	let isSaving = $state(false); // Protection against cascading saves
	let isInitializing = $state(true); // Protection during initialization

	// Timeout for save debouncing
	let saveTimeout: NodeJS.Timeout | null = null;

	/**
	 * Conditional debug log
	 */
	function debugLog(...args: unknown[]) {
		if (enableDebugLogs || isDebugKey) {
			console.log(`[${key}]`, ...args);
		}
	}

	/**
	 * Calculate the byte size of a value
	 */
	function calculateSize(val: unknown): number {
		try {
			const json = JSON.stringify(val);
			const encoded = new TextEncoder().encode(json);
			return encoded.length;
		} catch {
			return 0;
		}
	}

	/**
	 * Save to localStorage
	 */
	async function saveToLocalStorage(val: T): Promise<void> {
		try {
			const serialized = JSON.stringify(val);
			localStorage.setItem(key, serialized);
			debugLog('💾 Saved to localStorage');
		} catch (error) {
			const storageError = new Error('localStorage save failed') as HybridStorageError;
			storageError.code = 'LOCALSTORAGE_QUOTA_EXCEEDED';
			storageError.storageLocation = 'localStorage';
			storageError.originalError = error as Error;
			throw storageError;
		}
	}

	/**
	 * Load from localStorage
	 */
	function loadFromLocalStorage(): T | undefined {
		try {
			const stored = localStorage.getItem(key);
			if (stored === null) {
				debugLog(`ℹ️ No data found for ${key} in localStorage`);
				return undefined; // Return undefined to avoid automatic saves
			}

			const parsed = JSON.parse(stored) as T;
			debugLog('📂 Loaded from localStorage');
			return parsed;
		} catch (error) {
			console.warn(`Failed to parse localStorage value for key "${key}":`, error);
			return undefined; // Return undefined on error
		}
	}

	/**
	 * Save to MongoDB
	 */
	async function saveToMongoDB(val: T): Promise<void> {
		try {
			await ensureMongoDBInitialized();
			const info = mongoStorageManager.getInfo();
			await info.save(key, val);
			debugLog('🗃️ Saved to MongoDB');
		} catch (error) {
			// Silent fallback to localStorage for different cases
			if (error instanceof Error && (
				error.message.includes('MongoDB not supported') ||
				error.message.includes('not available') ||
				error.message.includes('User cancelled') ||
				error.message.includes('user declined')
			)) {
				debugLog('💾 Fallback to localStorage (MongoDB not available)');
				await saveToLocalStorage(val);
			} else {
				throw error;
			}
		}
	}

	/**
	 * Load from MongoDB
	 */
	async function loadFromMongoDB(): Promise<T | undefined> {
		try {
			await ensureMongoDBInitialized();
			const info = mongoStorageManager.getInfo();
			const loaded = await info.load(key);
			if (loaded !== undefined && loaded !== null) {
				debugLog('📁 Loaded from MongoDB');
				return loaded;
			} else {
				debugLog(`ℹ️ No data found for ${key} in MongoDB, using initial value`);
				// Important: return undefined to indicate there is no saved data
				// Initialization will use initialValue without triggering a save
				return undefined;
			}
		} catch (error) {
			// Silent fallback to localStorage if MongoDB is not available
			if (error instanceof Error && (
				error.message.includes('MongoDB not supported') ||
				error.message.includes('not available') ||
				error.message.includes('user declined')
			)) {
				debugLog('📂 Fallback to localStorage (MongoDB not available)');
				return loadFromLocalStorage();
			} else {
				console.warn(`Failed to load from MongoDB for key "${key}":`, error);
				throw error; // Throw other errors to allow proper error handling
			}
		}
	}

	/**
	 * Ensures MongoDB is initialized
	 * Attempts automatic initialization ONLY ONCE on first use
	 */
	async function ensureMongoDBInitialized(): Promise<void> {
		if (mongoDBInitialized) return;

		if (mongoDBInitPromise) {
			await mongoDBInitPromise;
			return;
		}

		// If we already tried and failed, do not retry
		if (mongoDBInitAttempted) {
			throw new Error('MongoDB not available (user declined or not supported)');
		}

		mongoDBInitPromise = (async () => {
			try {
				mongoDBInitAttempted = true;

				console.log('🚀 Attempting automatic MongoDB initialization...');
				await mongoStorageManager.initialize();

				const info = mongoStorageManager.getInfo();
				if (!info.isSupported) {
					throw new Error('MongoDB not supported or not connected');
				}

				mongoDBInitialized = true;

				console.log('✅ MongoDB initialized automatically with success!');

				// Log config info only once
				if (enableDebugLogs) {
					logConfigInfo();
				}
			} catch (error) {
				console.log('ℹ️ MongoDB not available, using localStorage:', error instanceof Error ? error.message : error);
				throw error;
			}
		})();

		await mongoDBInitPromise;
	}

	/**
	 * Save the value according to the configured location
	 */
	async function saveValue(val: T): Promise<void> {
		try {
			if (storageLocation === 'fileSystem') {
				await saveToMongoDB(val);
			} else {
				await saveToLocalStorage(val);
			}

			// Update the in-memory cache
			if (!options.disableMemoryCache) {
				const size = calculateSize(val);
				memoryCache.set(key, {
					value: cloneDeep(val),
					timestamp: Date.now(),
					location: storageLocation,
					size
				});
			}

			lastSavedValue = cloneDeep(val);
		} catch (error) {
			// For unsupported MongoDB errors, don't log as error
			if (error instanceof Error && error.message.includes('MongoDB not supported')) {
				debugLog(`⚠️ ${key}: MongoDB fallback completed`);
			} else {
				console.error(`Failed to save ${key}:`, error);
			}
			throw error;
		}
	}

	/**
	 * Load the value from the configured location
	 */
	async function loadValue(): Promise<{ value: T | undefined; fromMemory: boolean }> {
		// Check the memory cache first
		if (!options.disableMemoryCache) {
			const cached = memoryCache.get(key);
			if (cached && cached.location === storageLocation) {
				debugLog('⚡ Loaded from memory cache');
				return { value: cloneDeep(cached.value) as T, fromMemory: true };
			}
		}

		// Load from storage
		if (storageLocation === 'fileSystem') {
			return { value: await loadFromMongoDB(), fromMemory: false };
		} else {
			return { value: loadFromLocalStorage(), fromMemory: false };
		}
	}

	/**
	 * Save with debouncing
	 */
	function debouncedSave(val: T) {
		// Protection against cascading saves
		if (isSaving) {
			debugLog(`⏳ Skipping save for ${key} - already saving`);
			return;
		}

		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}

		saveTimeout = setTimeout(async () => {
			if (isSaving) return; // Double check

			try {
				isSaving = true;
				await saveValue(val);
				currentSize = calculateSize(val);
				// Update lastSavedValue after successful save
				lastSavedValue = cloneDeep(val);
				debugLog(`✅ Successfully saved ${key}`);
			} catch (error) {
				// For unsupported MongoDB errors, don't log as error
				if (error instanceof Error && error.message.includes('MongoDB not supported')) {
					debugLog(`⚠️ ${key}: Debounced save completed with localStorage fallback`);
					lastSavedValue = cloneDeep(val);
				} else {
					console.error('Debounced save failed:', error);
				}
			} finally {
				isSaving = false;
			}
		}, saveDebounceMs);
	}

	/**
	 * Effect to automatically save changes
	 */
	$effect(() => {
		const currentValue = value;

		if (isDebugKey) {
			console.log(`[${key}] $effect triggered:`, {
				isMounted,
				hasHydrated,
				isInitializing,
				isSaving,
				hasValue: currentValue !== undefined,
				lastSavedValueExists: lastSavedValue !== undefined
			});
		}

		// Protection against reactivity cycles AND during initialization
		if (!isMounted || !hasHydrated || currentValue === undefined || isSaving || isInitializing) {
			if (isDebugKey) {
				console.log(`[${key}] Skipping effect - protection triggered`);
			}
			return;
		}

		// Avoid reactivity cycles by using an optimized comparison
		let shouldSave = false;

		try {
			// If lastSavedValue is undefined, it means we're using the default value
			// and there was no saved data. In this case, we don't save
			// unless the value has been modified by the user
			if (lastSavedValue === undefined) {
				// Compare with initial value to see if user has made changes using a stable comparison
				shouldSave = !deepEqual(currentValue, initialValue);
				if (isDebugKey) {
					console.log(`[${key}] Comparing with initialValue:`, { shouldSave });
				}
			} else {
				// Avoid saving if the value hasn't changed since the last save
				shouldSave = !deepEqual(currentValue, lastSavedValue);
				if (isDebugKey) {
					console.log(`[${key}] Comparing with lastSavedValue:`, { shouldSave });
				}
			}
		} catch (error) {
			console.warn(`Error comparing values for ${key}:`, error);
			// In case of serialization error, we avoid saving to prevent loops
			return;
		}

		if (!shouldSave) {
			if (isDebugKey) {
				console.log(`[${key}] No save needed - values are equal`);
			}
			return;
		}

		debugLog(`💾 Auto-saving ${key} due to change detection`);
		debouncedSave(currentValue);
	});

	/**
	 * Initialization on mount
	 */
	onMount(async () => {
		try {
			isMounted = true;

			const loaded = await loadValue();

			if (loaded.value !== undefined) {
				// There is saved data
				value = loaded.value;
				currentSize = calculateSize(loaded.value);
				// Important: if the value comes from the memory cache, do not
				// consider it as saved to ensure a storage save is triggered if necessary
				if (!loaded.fromMemory) {
					lastSavedValue = cloneDeep(loaded.value);
				}
				debugLog(`📦 Initialized with ${loaded.fromMemory ? 'memory-cached' : 'saved'} data for ${key}`);
			} else if (initialValue !== undefined) {
				// No saved data, use default value
				value = cloneDeep(initialValue);
				// Important: DO NOT update lastSavedValue to avoid automatic saving
				// lastSavedValue remains undefined, so value !== lastSavedValue
				// but we avoid saving thanks to an additional condition
				currentSize = calculateSize(value);
				debugLog(`🆕 Initialized with default value for ${key} (no saved data found)`);
			}
		} catch (error) {
			console.error(`Failed to load ${key} on mount:`, error);
			if (initialValue !== undefined) {
				value = cloneDeep(initialValue);
				currentSize = calculateSize(value);
				debugLog(`⚠️ Initialized with fallback value for ${key} due to load error`);
			}
		} finally {
			// Important: mark hydration as complete AND initialization as finished
			hasHydrated = true;
			// Wait a tick to ensure all states are stabilized
			setTimeout(() => {
				isInitializing = false;
				debugLog(`✅ Initialization completed for ${key}`);
			}, 0);
		}
	});

	/**
	 * Public API
	 */
	return {
		get value() {
			return value as T;
		},

		set value(newValue: T) {
			value = newValue;
			// Update memory cache immediately to avoid races
			// during navigation between pages before debounced saves complete
			if (!options.disableMemoryCache) {
				const size = calculateSize(newValue);
				memoryCache.set(key, {
					value: cloneDeep(newValue),
					timestamp: Date.now(),
					location: storageLocation,
					size
				});
			}
		},

		update(updater: (current: T) => T) {
			if (value !== undefined) {
				const updated = updater(value as T);
				value = updated;
				// Also propagate to the memory cache immediately
				if (!options.disableMemoryCache) {
					const size = calculateSize(updated);
					memoryCache.set(key, {
						value: cloneDeep(updated),
						timestamp: Date.now(),
						location: storageLocation,
						size
					});
				}
			}
		},

		reset() {
			if (initialValue !== undefined) {
				value = cloneDeep(initialValue);
			}
		},

		resetProperty(property: keyof T) {
			if (value && initialValue && typeof value === 'object' && typeof initialValue === 'object') {
				(value as Record<string, unknown>)[property as string] =
					(cloneDeep(initialValue) as Record<string, unknown>)[property as string];
			}
		},

		get storageInfo() {
			return {
				location: storageLocation,
				size: currentSize,
				isHydrated: hasHydrated,
				isMounted: isMounted,
				isInitializing: isInitializing
			};
		},

		async forceSave() {
			if (value !== undefined) {
				await saveValue(value as T);
				currentSize = calculateSize(value);
			}
		},

		async forceReload() {
			try {
				const loaded = await loadValue();
				if (loaded.value !== undefined) {
					value = loaded.value;
					// Only mark as "last saved" if the source is not memory
					if (!loaded.fromMemory) {
						lastSavedValue = cloneDeep(loaded.value);
					}
					currentSize = calculateSize(loaded.value);
				}
			} catch (error) {
				console.error(`Failed to force reload ${key}:`, error);
				throw error;
			}
		}
	};
}
