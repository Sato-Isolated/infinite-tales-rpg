// TODO: Implement intelligent storage selection based on data size and usage patterns
// TODO: Add automatic storage cleanup for old game sessions
// TODO: Create storage analytics dashboard for monitoring usage and performance
// TODO: Implement storage compression for large game state objects
// TODO: Add automatic backup scheduling with configurable intervals
// TODO: Create storage migration tools for data structure changes
// TODO: Implement storage synchronization between devices (for future cloud features)
// TODO: Add storage quotas and warnings for large save files
// TODO: Create storage health monitoring and automatic repair mechanisms

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
 * Fonction d'initialisation manuelle de MongoDB (pour le debug panel)
 * Permet de re-essayer même après un échec précédent
 */
export async function initializeMongoDBManually(userId?: string): Promise<void> {
	const info = mongoStorageManager.getInfo();
	if (!info.isSupported) {
		throw new Error('MongoDB not supported or not connected');
	}

	// Reset des flags pour permettre une nouvelle tentative
	mongoDBInitAttempted = false;
	mongoDBInitialized = false;
	mongoDBInitPromise = null;

	await mongoStorageManager.initialize();
	mongoDBInitialized = true;
	mongoDBInitAttempted = true;

	console.log('✅ MongoDB manually initialized');
}

/**
 * Retourne le statut de MongoDB
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
 * Comparaison profonde optimisée pour éviter les problèmes de sérialisation JSON
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
 * Indicateur global d'initialisation de MongoDB
 */
let mongoDBInitialized = false;
let mongoDBInitPromise: Promise<void> | null = null;
let mongoDBInitAttempted = false; // Nouveau : évite les tentatives répétées

/**
 * Hook Svelte 5 pour stockage hybride localStorage + File System
 * API identique à useHybridLocalStorage mais avec stockage intelligent
 */
export function useHybridLocalStorage<T>(
	key: string,
	initialValue?: T,
	options: HybridStorageOptions = {}
): UseHybridLocalStorageReturn<T> {
	if (!key || typeof key !== 'string') {
		throw new Error('useHybridLocalStorage requires a valid string key');
	}

	// Configuration et état
	const storageLocation = options.forceLocation || getStorageLocation(key);
	const saveDebounceMs = options.saveDebounceMs || 300;
	const enableDebugLogs = options.enableDebugLogs || false;

	// Debug temporaire pour les clés problématiques - désactivé maintenant que le problème est résolu
	const isDebugKey = false; // ['gameActionsState', 'characterState', 'characterStatsState'].includes(key);

	// État réactif Svelte 5
	let value = $state<T | undefined>(initialValue ? cloneDeep(initialValue) : undefined);
	let isMounted = $state(false);
	let hasHydrated = $state(false);
	let lastSavedValue: T | undefined = $state<T | undefined>(undefined);
	let currentSize = $state(0);
	let isSaving = $state(false); // Protection contre les sauvegardes en cascade
	let isInitializing = $state(true); // Protection pendant l'initialisation

	// Timeout pour le debouncing des sauvegardes
	let saveTimeout: NodeJS.Timeout | null = null;

	/**
	 * Log de debug conditionnel
	 */
	function debugLog(...args: unknown[]) {
		if (enableDebugLogs || isDebugKey) {
			console.log(`[${key}]`, ...args);
		}
	}

	/**
	 * Calcule la taille d'une valeur en bytes
	 */
	function calculateSize(val: unknown): number {
		try {
			return new TextEncoder().encode(JSON.stringify(val)).length;
		} catch {
			return 0;
		}
	}

	/**
	 * Sauvegarde dans localStorage
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
	 * Charge depuis localStorage
	 */
	function loadFromLocalStorage(): T | undefined {
		try {
			const stored = localStorage.getItem(key);
			if (stored === null) {
				debugLog(`ℹ️ No data found for ${key} in localStorage`);
				return undefined; // Retourner undefined pour éviter les sauvegardes automatiques
			}

			const parsed = JSON.parse(stored) as T;
			debugLog('📂 Loaded from localStorage');
			return parsed;
		} catch (error) {
			console.warn(`Failed to parse localStorage value for key "${key}":`, error);
			return undefined; // Retourner undefined en cas d'erreur
		}
	}

	/**
	 * Sauvegarde dans MongoDB
	 */
	async function saveToMongoDB(val: T): Promise<void> {
		try {
			await ensureMongoDBInitialized();
			const info = mongoStorageManager.getInfo();
			await info.save(key, val);
			debugLog('🗃️ Saved to MongoDB');
		} catch (error) {
			// Fallback silencieux vers localStorage pour différents cas
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
	 * Charge depuis MongoDB
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
				// Important: retourner undefined pour indiquer qu'il n'y a pas de données sauvegardées
				// L'initialisation utilisera initialValue sans déclencher de sauvegarde
				return undefined;
			}
		} catch (error) {
			// Fallback silencieux vers localStorage si MongoDB non disponible
			if (error instanceof Error && (
				error.message.includes('MongoDB not supported') ||
				error.message.includes('not available') ||
				error.message.includes('user declined')
			)) {
				debugLog('📂 Fallback to localStorage (MongoDB not available)');
				return loadFromLocalStorage();
			} else {
				console.warn(`Failed to load from MongoDB for key "${key}":`, error);
				return undefined; // Utiliser undefined pour éviter les sauvegardes automatiques
			}
		}
	}

	/**
	 * S'assure que MongoDB est initialisé
	 * Essaie d'initialiser automatiquement UNE SEULE FOIS au premier usage
	 */
	async function ensureMongoDBInitialized(): Promise<void> {
		if (mongoDBInitialized) return;

		if (mongoDBInitPromise) {
			await mongoDBInitPromise;
			return;
		}

		// Si on a déjà essayé et échoué, ne pas re-essayer
		if (mongoDBInitAttempted) {
			throw new Error('MongoDB not available (user declined or not supported)');
		}

		mongoDBInitPromise = (async () => {
			try {
				mongoDBInitAttempted = true;

				console.log('🚀 Tentative d\'initialisation automatique de MongoDB...');
				await mongoStorageManager.initialize();

				const info = mongoStorageManager.getInfo();
				if (!info.isSupported) {
					throw new Error('MongoDB not supported or not connected');
				}

				mongoDBInitialized = true;

				console.log('✅ MongoDB initialisé automatiquement avec succès!');

				// Log config info une seule fois
				if (enableDebugLogs) {
					logConfigInfo();
				}
			} catch (error) {
				console.log('ℹ️ MongoDB non disponible, utilisation de localStorage:', error instanceof Error ? error.message : error);
				throw error;
			}
		})();

		await mongoDBInitPromise;
	}

	/**
	 * Sauvegarde la valeur selon l'emplacement configuré
	 */
	async function saveValue(val: T): Promise<void> {
		try {
			if (storageLocation === 'fileSystem') {
				await saveToMongoDB(val);
			} else {
				await saveToLocalStorage(val);
			}

			// Met à jour le cache mémoire
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
			// Pour les erreurs de MongoDB non supporté, ne pas loguer comme erreur
			if (error instanceof Error && error.message.includes('MongoDB not supported')) {
				debugLog(`⚠️ ${key}: MongoDB fallback completed`);
			} else {
				console.error(`Failed to save ${key}:`, error);
			}
			throw error;
		}
	}

	/**
	 * Charge la valeur depuis l'emplacement configuré
	 */
	async function loadValue(): Promise<T | undefined> {
		// Vérifie d'abord le cache mémoire
		if (!options.disableMemoryCache) {
			const cached = memoryCache.get(key);
			if (cached && cached.location === storageLocation) {
				debugLog('⚡ Loaded from memory cache');
				return cloneDeep(cached.value) as T;
			}
		}

		// Charge depuis le stockage
		if (storageLocation === 'fileSystem') {
			return await loadFromMongoDB();
		} else {
			return loadFromLocalStorage();
		}
	}

	/**
	 * Sauvegarde avec debouncing
	 */
	function debouncedSave(val: T) {
		// Protection contre les sauvegardes en cascade
		if (isSaving) {
			debugLog(`⏳ Skipping save for ${key} - already saving`);
			return;
		}

		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}

		saveTimeout = setTimeout(async () => {
			if (isSaving) return; // Double vérification

			try {
				isSaving = true;
				await saveValue(val);
				currentSize = calculateSize(val);
				// Mettre à jour lastSavedValue après une sauvegarde réussie
				lastSavedValue = cloneDeep(val);
				debugLog(`✅ Successfully saved ${key}`);
			} catch (error) {
				// Pour les erreurs de MongoDB non supporté, ne pas loguer comme erreur
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
	 * Effet pour sauvegarder automatiquement les changements
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

		// Protection contre les cycles de réactivité ET pendant l'initialisation
		if (!isMounted || !hasHydrated || currentValue === undefined || isSaving || isInitializing) {
			if (isDebugKey) {
				console.log(`[${key}] Skipping effect - protection triggered`);
			}
			return;
		}

		// Éviter les cycles de réactivité en utilisant une comparaison optimisée
		let shouldSave = false;

		try {
			// Si lastSavedValue est undefined, cela signifie qu'on utilise la valeur par défaut
			// et qu'il n'y avait pas de données sauvegardées. Dans ce cas, on ne sauvegarde
			// que si la valeur a été modifiée par l'utilisateur
			if (lastSavedValue === undefined) {
				// Comparer avec la valeur initiale pour voir si l'utilisateur a fait des changements
				// Utilisation d'une comparaison plus stable
				shouldSave = !deepEqual(currentValue, initialValue);
				if (isDebugKey) {
					console.log(`[${key}] Comparing with initialValue:`, { shouldSave });
				}
			} else {
				// Évite la sauvegarde si la valeur n'a pas changé par rapport à la dernière sauvegarde
				shouldSave = !deepEqual(currentValue, lastSavedValue);
				if (isDebugKey) {
					console.log(`[${key}] Comparing with lastSavedValue:`, { shouldSave });
				}
			}
		} catch (error) {
			console.warn(`Error comparing values for ${key}:`, error);
			// En cas d'erreur de sérialisation, on évite la sauvegarde pour éviter les boucles
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
	 * Initialisation au montage
	 */
	onMount(async () => {
		try {
			isMounted = true;

			const loadedValue = await loadValue();

			if (loadedValue !== undefined) {
				// Il y a des données sauvegardées
				value = loadedValue;
				lastSavedValue = cloneDeep(loadedValue);
				currentSize = calculateSize(loadedValue);
				debugLog(`📦 Initialized with saved data for ${key}`);
			} else if (initialValue !== undefined) {
				// Pas de données sauvegardées, utiliser la valeur par défaut
				value = cloneDeep(initialValue);
				// Important: NE PAS mettre à jour lastSavedValue pour éviter la sauvegarde automatique
				// lastSavedValue reste undefined, donc value !== lastSavedValue
				// mais on évite la sauvegarde grâce à une condition supplémentaire
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
			// Important : marquer l'hydratation comme terminée ET l'initialisation comme finie
			hasHydrated = true;
			// Attendre un tick pour s'assurer que tous les états sont stabilisés
			setTimeout(() => {
				isInitializing = false;
				debugLog(`✅ Initialization completed for ${key}`);
			}, 0);
		}
	});

	/**
	 * API publique
	 */
	return {
		get value() {
			return value as T;
		},

		set value(newValue: T) {
			value = newValue;
		},

		update(updater: (current: T) => T) {
			if (value !== undefined) {
				value = updater(value as T);
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
				const loadedValue = await loadValue();
				if (loadedValue !== undefined) {
					value = loadedValue;
					lastSavedValue = cloneDeep(loadedValue);
					currentSize = calculateSize(loadedValue);
				}
			} catch (error) {
				console.error(`Failed to force reload ${key}:`, error);
				throw error;
			}
		}
	};
}
