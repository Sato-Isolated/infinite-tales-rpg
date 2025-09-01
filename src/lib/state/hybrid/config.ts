import type { HybridStorageConfig } from './types.js';
// @ts-ignore - JSON import sera géré par le bundler
import configData from '../hybrid-storage-config.json';

/**
 * Configuration du stockage hybride générée automatiquement
 * par le script d'analyse analyze-save-size.js
 */
export const hybridStorageConfig: HybridStorageConfig = configData as HybridStorageConfig;

/**
 * Détermine l'emplacement de stockage pour une clé donnée
 */
export function getStorageLocation(key: string): 'localStorage' | 'fileSystem' {
	// Vérification explicite dans la config
	if (hybridStorageConfig.fileSystemKeys.includes(key)) {
		return 'fileSystem';
	}
	
	if (hybridStorageConfig.localStorageKeys.includes(key)) {
		return 'localStorage';
	}

	// Par défaut, utilise localStorage pour les nouvelles clés
	console.warn(`🤔 Key "${key}" not found in hybrid config, defaulting to localStorage`);
	return 'localStorage';
}

/**
 * Vérifie si une clé doit être stockée dans le File System
 */
export function shouldUseFileSystem(key: string): boolean {
	return getStorageLocation(key) === 'fileSystem';
}

/**
 * Vérifie si une clé doit rester dans localStorage
 */
export function shoulduseHybridLocalStorage(key: string): boolean {
	return getStorageLocation(key) === 'localStorage';
}

/**
 * Obtient des statistiques sur la configuration
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
 * Log de la configuration au démarrage (pour debug)
 */
export function logConfigInfo() {
	const stats = getConfigStats();
	console.log('🔧 Hybrid Storage Configuration:');
	console.log(`   📁 File System: ${stats.fileSystemKeys} keys (${stats.fileSystemPercentage}%)`);
	console.log(`   💾 localStorage: ${stats.localStorageKeys} keys (${stats.localStoragePercentage}%)`);
	console.log(`   📏 Size threshold: ${stats.sizeThreshold} bytes`);
	console.log('   🗃️  File System keys:', hybridStorageConfig.fileSystemKeys);
}
