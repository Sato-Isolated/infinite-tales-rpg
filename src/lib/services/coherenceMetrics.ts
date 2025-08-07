import type { EntityValidationResult } from './entityCoordinator';
import type { MemoryValidationResult } from './memoryCoordinator';

/**
 * Service de métriques avancées pour la cohérence narrative
 * Fournit un système de scoring détaillé et d'historique
 */

export interface CoherenceMetrics {
	overall_score: number;
	category_scores: {
		temporal: number;
		character: number;
		plot: number;
		world: number;
		memory: number;
	};
	timestamp: string;
	action_index: number;
	trends: {
		improving: boolean;
		stable: boolean;
		degrading: boolean;
	};
	quality_indicators: {
		consistency_level: 'excellent' | 'good' | 'fair' | 'poor';
		risk_level: 'low' | 'medium' | 'high' | 'critical';
		player_experience: 'immersive' | 'engaging' | 'acceptable' | 'problematic';
	};
}

export interface CoherenceHistoryEntry {
	metrics: CoherenceMetrics;
	action_summary: string;
	issues_detected: string[];
	improvements_made: string[];
}

export interface PredictiveInsights {
	potential_conflicts: {
		type: string;
		description: string;
		probability: number;
		severity: 'low' | 'medium' | 'high' | 'critical';
		prevention_suggestions: string[];
	}[];
	optimal_choices: {
		action_type: string;
		description: string;
		coherence_impact: number;
		reasoning: string;
	}[];
	risk_assessment: {
		plot_hole_risk: number;
		character_inconsistency_risk: number;
		temporal_paradox_risk: number;
		world_building_risk: number;
	};
}

export class CoherenceMetricsService {
	private history: CoherenceHistoryEntry[] = [];
	private readonly MAX_HISTORY = 100; // Garder les 100 dernières mesures

	/**
	 * Calcule les métriques détaillées de cohérence
	 */
	calculateDetailedMetrics(
		entityValidation: EntityValidationResult,
		memoryValidation: MemoryValidationResult,
		actionIndex: number,
		actionSummary: string
	): CoherenceMetrics {
		// Scores par catégorie (0-100)
		const temporalScore = this.calculateTemporalScore(memoryValidation);
		const characterScore = this.calculateCharacterScore(entityValidation);
		const plotScore = this.calculatePlotScore(memoryValidation, entityValidation);
		const worldScore = this.calculateWorldScore(entityValidation, memoryValidation);
		const memoryScore = this.calculateMemoryScore(memoryValidation);

		// Score global pondéré
		const overallScore = Math.round(
			(temporalScore * 0.2) +
			(characterScore * 0.25) +
			(plotScore * 0.25) +
			(worldScore * 0.15) +
			(memoryScore * 0.15)
		);

		// Analyse des tendances
		const trends = this.analyzeTrends(overallScore);

		// Indicateurs de qualité
		const qualityIndicators = this.calculateQualityIndicators(overallScore, entityValidation, memoryValidation);

		const metrics: CoherenceMetrics = {
			overall_score: overallScore,
			category_scores: {
				temporal: temporalScore,
				character: characterScore,
				plot: plotScore,
				world: worldScore,
				memory: memoryScore
			},
			timestamp: new Date().toISOString(),
			action_index: actionIndex,
			trends,
			quality_indicators: qualityIndicators
		};

		// Ajouter à l'historique
		this.addToHistory(metrics, actionSummary, entityValidation, memoryValidation);

		return metrics;
	}

	/**
	 * Score de cohérence temporelle
	 */
	private calculateTemporalScore(memoryValidation: MemoryValidationResult): number {
		let score = 100;

		// Pénalités pour les conflits temporels
		memoryValidation.conflicts_detected.forEach(conflict => {
			if (conflict.conflict_type === 'temporal_inconsistency') {
				switch (conflict.severity) {
					case 'critical': score -= 30; break;
					case 'high': score -= 20; break;
					case 'medium': score -= 10; break;
					case 'low': score -= 5; break;
				}
			}
		});

		// Bonus pour la cohérence chronologique
		if (memoryValidation.temporal_consistency_score) {
			score += (memoryValidation.temporal_consistency_score - 50) / 5; // Normaliser de 0-100 à bonus/malus
		}

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Score de cohérence des personnages
	 */
	private calculateCharacterScore(entityValidation: EntityValidationResult): number {
		let score = 100;

		// Pénalités pour les conflits d'entités
		entityValidation.conflicts.forEach(conflict => {
			switch (conflict.severity) {
				case 'critical': score -= 25; break;
				case 'high': score -= 15; break;
				case 'medium': score -= 8; break;
				case 'low': score -= 3; break;
			}
		});

		// Bonus pour la cohérence (moins de conflits = meilleur score)
		const conflictCount = entityValidation.conflicts.length;
		if (conflictCount === 0) {
			score += 10; // Bonus pour aucun conflit
		}

		// Bonus basique pour les corrections automatiques (signe d'amélioration)
		const correctionCount = entityValidation.auto_corrections?.length || 0;
		score += Math.min(5, correctionCount);

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Score de cohérence de l'intrigue
	 */
	private calculatePlotScore(memoryValidation: MemoryValidationResult, entityValidation: EntityValidationResult): number {
		let score = 100;

		// Pénalités pour les conflits narratifs
		memoryValidation.conflicts_detected.forEach(conflict => {
			if (conflict.conflict_type === 'character_contradiction' || conflict.conflict_type === 'plot_hole') {
				switch (conflict.severity) {
					case 'critical': score -= 20; break;
					case 'high': score -= 12; break;
					case 'medium': score -= 6; break;
					case 'low': score -= 2; break;
				}
			}
		});

		// Bonus basé sur le score de cohérence des plots
		if (memoryValidation.plot_consistency_score) {
			score += (memoryValidation.plot_consistency_score - 50) / 10; // Bonus/malus léger
		}

		// Pénalité pour trop d'événements sans cohérence
		if (memoryValidation.total_events > 50 && memoryValidation.overall_score < 70) {
			score -= 10; // Pénalité pour complexité incohérente
		}

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Score de cohérence du monde
	 */
	private calculateWorldScore(entityValidation: EntityValidationResult, memoryValidation: MemoryValidationResult): number {
		let score = 100;

		// Pénalités pour les incohérences générales
		memoryValidation.conflicts_detected.forEach(conflict => {
			if (conflict.conflict_type === 'factual_error') {
				switch (conflict.severity) {
					case 'critical': score -= 25; break;
					case 'high': score -= 15; break;
					case 'medium': score -= 8; break;
					case 'low': score -= 3; break;
				}
			}
		});

		// Bonus basique basé sur le nombre d'événements (richesse du monde)
		const eventCount = memoryValidation.total_events || 0;
		score += Math.min(10, Math.floor(eventCount / 10)); // 1 point par 10 événements, max 10

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Score de cohérence de la mémoire
	 */
	private calculateMemoryScore(memoryValidation: MemoryValidationResult): number {
		let score = 100;

		// Pénalités générales pour les conflits de mémoire
		memoryValidation.conflicts_detected.forEach(conflict => {
			switch (conflict.severity) {
				case 'critical': score -= 15; break;
				case 'high': score -= 10; break;
				case 'medium': score -= 5; break;
				case 'low': score -= 2; break;
			}
		});

		// Bonus pour la profondeur de mémoire validée
		const validationDepth = memoryValidation.validation_depth || 0;
		score += Math.min(15, validationDepth);

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Analyse des tendances basée sur l'historique
	 */
	private analyzeTrends(currentScore: number): CoherenceMetrics['trends'] {
		if (this.history.length < 3) {
			return {
				improving: false,
				stable: true,
				degrading: false
			};
		}

		const recentScores = this.history.slice(-5).map(entry => entry.metrics.overall_score);
		const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
		
		const olderScores = this.history.slice(-10, -5).map(entry => entry.metrics.overall_score);
		const avgOlder = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : avgRecent;

		const trend = avgRecent - avgOlder;
		const threshold = 5; // Seuil de changement significatif

		return {
			improving: trend > threshold,
			stable: Math.abs(trend) <= threshold,
			degrading: trend < -threshold
		};
	}

	/**
	 * Calcule les indicateurs de qualité
	 */
	private calculateQualityIndicators(
		overallScore: number,
		entityValidation: EntityValidationResult,
		memoryValidation: MemoryValidationResult
	): CoherenceMetrics['quality_indicators'] {
		// Niveau de consistance
		let consistencyLevel: CoherenceMetrics['quality_indicators']['consistency_level'];
		if (overallScore >= 90) consistencyLevel = 'excellent';
		else if (overallScore >= 75) consistencyLevel = 'good';
		else if (overallScore >= 60) consistencyLevel = 'fair';
		else consistencyLevel = 'poor';

		// Niveau de risque
		const criticalConflicts = entityValidation.conflicts.filter(c => c.severity === 'critical').length +
								 memoryValidation.conflicts_detected.filter(c => c.severity === 'critical').length;
		const highConflicts = entityValidation.conflicts.filter(c => c.severity === 'high').length +
							  memoryValidation.conflicts_detected.filter(c => c.severity === 'high').length;

		let riskLevel: CoherenceMetrics['quality_indicators']['risk_level'];
		if (criticalConflicts > 0) riskLevel = 'critical';
		else if (highConflicts > 2) riskLevel = 'high';
		else if (highConflicts > 0 || overallScore < 70) riskLevel = 'medium';
		else riskLevel = 'low';

		// Expérience joueur
		let playerExperience: CoherenceMetrics['quality_indicators']['player_experience'];
		if (overallScore >= 85 && riskLevel === 'low') playerExperience = 'immersive';
		else if (overallScore >= 70 && riskLevel !== 'critical') playerExperience = 'engaging';
		else if (overallScore >= 50) playerExperience = 'acceptable';
		else playerExperience = 'problematic';

		return {
			consistency_level: consistencyLevel,
			risk_level: riskLevel,
			player_experience: playerExperience
		};
	}

	/**
	 * Ajoute une entrée à l'historique
	 */
	private addToHistory(
		metrics: CoherenceMetrics,
		actionSummary: string,
		entityValidation: EntityValidationResult,
		memoryValidation: MemoryValidationResult
	): void {
		const issuesDetected = [
			...entityValidation.conflicts.map(c => `Entity: ${c.description}`),
			...memoryValidation.conflicts_detected.map(c => `Memory: ${c.description}`)
		];

		const improvementsMade = entityValidation.auto_corrections?.map(c => `Auto-corrected: ${c.reason}`) || [];

		const historyEntry: CoherenceHistoryEntry = {
			metrics,
			action_summary: actionSummary,
			issues_detected: issuesDetected,
			improvements_made: improvementsMade
		};

		this.history.push(historyEntry);

		// Limiter la taille de l'historique
		if (this.history.length > this.MAX_HISTORY) {
			this.history = this.history.slice(-this.MAX_HISTORY);
		}
	}

	/**
	 * Récupère l'historique complet
	 */
	getHistory(): CoherenceHistoryEntry[] {
		return [...this.history];
	}

	/**
	 * Récupère les métriques récentes
	 */
	getRecentMetrics(count: number = 10): CoherenceHistoryEntry[] {
		return this.history.slice(-count);
	}

	/**
	 * Calcule les statistiques globales
	 */
	getOverallStatistics(): {
		average_score: number;
		best_score: number;
		worst_score: number;
		total_actions: number;
		issues_resolved: number;
		trend_direction: 'improving' | 'stable' | 'degrading';
	} {
		if (this.history.length === 0) {
			return {
				average_score: 0,
				best_score: 0,
				worst_score: 0,
				total_actions: 0,
				issues_resolved: 0,
				trend_direction: 'stable'
			};
		}

		const scores = this.history.map(entry => entry.metrics.overall_score);
		const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
		const bestScore = Math.max(...scores);
		const worstScore = Math.min(...scores);
		const totalActions = this.history.length;
		const issuesResolved = this.history.reduce((total, entry) => total + entry.improvements_made.length, 0);

		// Tendance générale
		const recentAvg = this.history.slice(-10).reduce((sum, entry) => sum + entry.metrics.overall_score, 0) / Math.min(10, this.history.length);
		const olderAvg = this.history.slice(0, -10).reduce((sum, entry) => sum + entry.metrics.overall_score, 0) / Math.max(1, this.history.length - 10);
		
		let trendDirection: 'improving' | 'stable' | 'degrading';
		const trendDiff = recentAvg - olderAvg;
		if (trendDiff > 5) trendDirection = 'improving';
		else if (trendDiff < -5) trendDirection = 'degrading';
		else trendDirection = 'stable';

		return {
			average_score: Math.round(averageScore),
			best_score: bestScore,
			worst_score: worstScore,
			total_actions: totalActions,
			issues_resolved: issuesResolved,
			trend_direction: trendDirection
		};
	}

	/**
	 * Prédit les conflits potentiels basés sur les patterns historiques
	 */
	generatePredictiveInsights(
		currentEntityValidation: EntityValidationResult,
		currentMemoryValidation: MemoryValidationResult
	): PredictiveInsights {
		// Analyser les patterns historiques pour prédire les problèmes
		const recentConflicts = this.history.slice(-10).flatMap(entry => entry.issues_detected);
		
		// Conflits potentiels basés sur les patterns
		const potentialConflicts = this.predictConflictsFromPatterns(recentConflicts, currentEntityValidation, currentMemoryValidation);
		
		// Choix optimaux pour améliorer la cohérence
		const optimalChoices = this.suggestOptimalChoices(currentEntityValidation, currentMemoryValidation);
		
		// Évaluation des risques
		const riskAssessment = this.assessRisks(currentEntityValidation, currentMemoryValidation);

		return {
			potential_conflicts: potentialConflicts,
			optimal_choices: optimalChoices,
			risk_assessment: riskAssessment
		};
	}

	/**
	 * Prédit les conflits basés sur les patterns historiques
	 */
	private predictConflictsFromPatterns(
		recentConflicts: string[],
		entityValidation: EntityValidationResult,
		memoryValidation: MemoryValidationResult
	): PredictiveInsights['potential_conflicts'] {
		const conflicts: PredictiveInsights['potential_conflicts'] = [];

		// Pattern: Doublons de noms
		const nameConflictCount = recentConflicts.filter(c => c.includes('duplicate') || c.includes('name')).length;
		if (nameConflictCount > 2) {
			conflicts.push({
				type: 'name_duplication',
				description: 'High probability of character name conflicts based on recent patterns',
				probability: Math.min(0.9, nameConflictCount * 0.15),
				severity: 'medium',
				prevention_suggestions: [
					'Use unique naming conventions',
					'Validate new character names against existing ones',
					'Consider using titles or nicknames for differentiation'
				]
			});
		}

		// Pattern: Conflits mémoire
		const memoryConflictCount = memoryValidation.conflicts_detected.length;
		if (memoryConflictCount > 3) {
			conflicts.push({
				type: 'memory_overload',
				description: 'Memory system showing signs of stress with multiple conflicts',
				probability: Math.min(0.8, memoryConflictCount * 0.1),
				severity: 'high',
				prevention_suggestions: [
					'Consolidate similar events',
					'Archive older, less relevant memories',
					'Validate memory consistency more frequently'
				]
			});
		}

		// Pattern: Stats inconsistency
		const statsConflicts = entityValidation.conflicts.filter(c => c.type === 'stat_inconsistency');
		if (statsConflicts.length > 1) {
			conflicts.push({
				type: 'stats_cascade',
				description: 'Statistics conflicts may cascade to affect more entities',
				probability: 0.6,
				severity: 'medium',
				prevention_suggestions: [
					'Implement automatic stats validation',
					'Use centralized stat management',
					'Regular entity synchronization'
				]
			});
		}

		return conflicts;
	}

	/**
	 * Suggère les choix optimaux pour améliorer la cohérence
	 */
	private suggestOptimalChoices(
		entityValidation: EntityValidationResult,
		memoryValidation: MemoryValidationResult
	): PredictiveInsights['optimal_choices'] {
		const choices: PredictiveInsights['optimal_choices'] = [];

		// Si beaucoup de conflits d'entités
		if (entityValidation.conflicts.length > 2) {
			choices.push({
				action_type: 'entity_consolidation',
				description: 'Focus on character development rather than introducing new ones',
				coherence_impact: 15,
				reasoning: 'Reducing entity conflicts by deepening existing relationships'
			});
		}

		// Si problèmes mémoire
		if (memoryValidation.conflicts_detected.length > 2) {
			choices.push({
				action_type: 'memory_organization',
				description: 'Structure narrative around existing established events',
				coherence_impact: 12,
				reasoning: 'Building on consistent memory foundation reduces contradictions'
			});
		}

		// Toujours suggérer la continuité
		choices.push({
			action_type: 'narrative_continuity',
			description: 'Continue existing plot threads rather than starting new ones',
			coherence_impact: 8,
			reasoning: 'Maintaining narrative momentum while avoiding new complexity'
		});

		return choices;
	}

	/**
	 * Évalue les risques de différents types de problèmes
	 */
	private assessRisks(
		entityValidation: EntityValidationResult,
		memoryValidation: MemoryValidationResult
	): PredictiveInsights['risk_assessment'] {
		// Risque de plot holes basé sur les conflits détectés
		const plotHoleRisk = memoryValidation.conflicts_detected.filter(c => 
			c.conflict_type === 'plot_hole'
		).length;

		// Risque d'incohérence des personnages
		const characterInconsistencyRisk = entityValidation.conflicts.filter(c => 
			c.type === 'name_duplicate' || c.type === 'relationship_conflict'
		).length;

		// Risque de paradoxes temporels
		const temporalParadoxRisk = memoryValidation.conflicts_detected.filter(c => 
			c.conflict_type === 'temporal_inconsistency'
		).length;

		// Risque de world building basé sur les erreurs factuelles
		const worldBuildingRisk = memoryValidation.conflicts_detected.filter(c => 
			c.conflict_type === 'factual_error'
		).length;

		return {
			plot_hole_risk: Math.min(100, plotHoleRisk * 20),
			character_inconsistency_risk: Math.min(100, characterInconsistencyRisk * 15),
			temporal_paradox_risk: Math.min(100, temporalParadoxRisk * 25),
			world_building_risk: Math.min(100, worldBuildingRisk * 18)
		};
	}

	/**
	 * Exporte les métriques pour analyse ou sauvegarde
	 */
	exportMetrics(): {
		history: CoherenceHistoryEntry[];
		statistics: ReturnType<CoherenceMetricsService['getOverallStatistics']>;
		export_timestamp: string;
	} {
		return {
			history: this.getHistory(),
			statistics: this.getOverallStatistics(),
			export_timestamp: new Date().toISOString()
		};
	}

	/**
	 * Importe des métriques depuis un export
	 */
	importMetrics(exportData: ReturnType<CoherenceMetricsService['exportMetrics']>): void {
		this.history = exportData.history.slice(-this.MAX_HISTORY);
	}

	/**
	 * Réinitialise l'historique
	 */
	reset(): void {
		this.history = [];
	}
}

// Instance singleton
let coherenceMetricsServiceInstance: CoherenceMetricsService | null = null;

export function getCoherenceMetricsService(): CoherenceMetricsService {
	if (!coherenceMetricsServiceInstance) {
		coherenceMetricsServiceInstance = new CoherenceMetricsService();
	}
	return coherenceMetricsServiceInstance;
}
