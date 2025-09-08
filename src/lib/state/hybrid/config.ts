import type { HybridStorageConfig } from './types.js';
// @ts-ignore - JSON import will be handled by the bundler
import configData from '../hybrid-storage-config.json';

/**
 * Hybrid storage configuration automatically generated
 * by the analyze-save-size.js script
 */
export const hybridStorageConfig: HybridStorageConfig = configData as HybridStorageConfig;

/**
 * Determine the storage location for a given key
 */
export function getStorageLocation(key: string): 'localStorage' | 'fileSystem' {
	// Explicit check in the config
	if (hybridStorageConfig.fileSystemKeys.includes(key)) {
		return 'fileSystem';
	}
	
	if (hybridStorageConfig.localStorageKeys.includes(key)) {
		return 'localStorage';
	}

	// By default, use localStorage for new keys
	console.warn(`🤔 Key "${key}" not found in hybrid config, defaulting to localStorage`);
	return 'localStorage';
}

/**
 * Check whether a key should be stored using the File System
 */
export function shouldUseFileSystem(key: string): boolean {
	return getStorageLocation(key) === 'fileSystem';
}

/**
 * Check whether a key should remain in localStorage
 */
export function shoulduseHybridLocalStorage(key: string): boolean {
	return getStorageLocation(key) === 'localStorage';
}

/**
 * Get configuration statistics
 */
export function getConfigStats() {
	return {
		fileSystemKeys: hybridStorageConfig.fileSystemKeys.length,
		localStorageKeys: hybridStorageConfig.localStorageKeys.length,
		totalKeys: hybridStorageConfig.fileSystemKeys.length + hybridStorageConfig.localStorageKeys.length,
		sizeThreshold: hybridStorageConfig.sizeThreshold,
		fileSystemPercentage: hybridStorageConfig.analysis.fileSystemPercentage,
		localStoragePercentage: hybridStorageConfig.analysis.localStoragePercentage
	};
}

/**
 * Log configuration at startup (for debugging)
 */
export function logConfigInfo() {
	const stats = getConfigStats();
	console.log('🔧 Hybrid Storage Configuration:');
	console.log(`   📁 File System: ${stats.fileSystemKeys} keys (${stats.fileSystemPercentage}%)`);
	console.log(`   💾 localStorage: ${stats.localStorageKeys} keys (${stats.localStoragePercentage}%)`);
	console.log(`   📏 Size threshold: ${stats.sizeThreshold} bytes`);
	console.log('   🗃️  File System keys:', hybridStorageConfig.fileSystemKeys);
}
