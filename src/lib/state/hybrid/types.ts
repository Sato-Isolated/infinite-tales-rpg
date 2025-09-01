/**
 * Types pour le système de stockage hybride localStorage + File System
 * Sans rétrocompatibilité - implémentation clean
 */

export interface HybridStorageConfig {
	/** Clés qui doivent être stockées dans le File System */
	fileSystemKeys: string[];
	/** Clés qui restent dans localStorage */
	localStorageKeys: string[];
	/** Seuil de taille en bytes pour la détection automatique */
	sizeThreshold: number;
	/** Statistiques d'analyse */
	analysis: {
		totalSize: number;
		fileSystemSize: number;
		localStorageSize: number;
		fileSystemPercentage: string;
		localStoragePercentage: string;
	};
}

export interface FileSystemStorageManager {
	/** Initialise le gestionnaire et demande les permissions */
	initialize(): Promise<void>;
	/** Vérifie si le File System Access API est supporté */
	isSupported(): boolean;
	/** Sauvegarde une valeur dans un fichier */
	save<T>(key: string, value: T): Promise<void>;
	/** Charge une valeur depuis un fichier */
	load<T>(key: string, fallback?: T): Promise<T | undefined>;
	/** Supprime un fichier */
	remove(key: string): Promise<void>;
	/** Liste tous les fichiers de sauvegarde */
	listFiles(): Promise<string[]>;
	/** Nettoie tous les fichiers */
	clear(): Promise<void>;
	/** Obtient la taille d'un fichier */
	getFileSize(key: string): Promise<number>;
}

export type StorageLocation = 'localStorage' | 'fileSystem';

export interface HybridStorageItem<T> {
	/** Valeur stockée */
	value: T;
	/** Emplacement de stockage */
	location: StorageLocation;
	/** Taille en bytes */
	size: number;
	/** Timestamp de dernière modification */
	lastModified: number;
}

export interface UseHybridLocalStorageReturn<T> {
	/** Valeur réactive */
	get value(): T;
	/** Définir une nouvelle valeur */
	set value(newValue: T);
	/** Mettre à jour la valeur avec une fonction */
	update(updater: (current: T) => T): void;
	/** Reset à la valeur initiale */
	reset(): void;
	/** Reset une propriété spécifique */
	resetProperty(property: keyof T): void;
	/** Informations sur le stockage */
	readonly storageInfo: {
		location: StorageLocation;
		size: number;
		isHydrated: boolean;
		isMounted: boolean;
		isInitializing: boolean;
	};
	/** Force une sauvegarde manuelle */
	forceSave(): Promise<void>;
	/** Force un rechargement depuis le stockage */
	forceReload(): Promise<void>;
}

export interface HybridStorageOptions {
	/** Force un emplacement de stockage spécifique */
	forceLocation?: StorageLocation;
	/** Désactive le cache en mémoire */
	disableMemoryCache?: boolean;
	/** Délai de debounce pour les sauvegardes (ms) */
	saveDebounceMs?: number;
	/** Active les logs de debug */
	enableDebugLogs?: boolean;
}

export interface HybridStorageError extends Error {
	code: 'FILESYSTEM_NOT_SUPPORTED' | 'FILESYSTEM_PERMISSION_DENIED' | 'FILESYSTEM_WRITE_ERROR' | 'LOCALSTORAGE_QUOTA_EXCEEDED' | 'INVALID_JSON' | 'KEY_NOT_FOUND';
	storageLocation: StorageLocation;
	originalError?: Error;
}

/**
 * Cache en mémoire pour optimiser les performances
 */
export interface MemoryCache<T> {
	value: T;
	timestamp: number;
	location: StorageLocation;
	size: number;
}

/**
 * Événements du système hybride
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
 * Interface pour écouter les événements du système hybride
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
