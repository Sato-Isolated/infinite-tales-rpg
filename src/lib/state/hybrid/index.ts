/**
 * Hybrid storage system: localStorage + File System
 * Public API exports
 */

// Hook principal
export { useHybridLocalStorage } from './useHybridLocalStorage.svelte.js';

// Types
export type {
	HybridStorageConfig,
	FileSystemStorageManager,
	StorageLocation,
	HybridStorageItem,
	UseHybridLocalStorageReturn,
	HybridStorageOptions,
	HybridStorageError,
	MemoryCache,
	HybridStorageEventMap,
	HybridStorageEventTarget
} from './types.js';

// Configuration
export {
	hybridStorageConfig,
	getStorageLocation,
	shouldUseFileSystem,
	shoulduseHybridLocalStorage,
	getConfigStats,
	logConfigInfo
} from './config.js';
