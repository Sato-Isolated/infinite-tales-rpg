<script lang="ts">
	import { onMount } from 'svelte';
	import { mongoStorageManager } from '$lib/db/mongoStorageManager.js';
	import { useHybridLocalStorage, initializeMongoDBManually, getMongoDBStatus } from '$lib/state/hybrid/useHybridLocalStorage.svelte';

	let isMongoDBSupported = $state(false);
	let isMongoDBInitialized = $state(false);
	let wasMongoDBAttempted = $state(false);
	let currentUserId = $state<string>('');
	let storageInfo = $state<Array<{ key: string; location: string; size: number; isHydrated: boolean }>>([]);
	let debugLogs = $state<string[]>([]);

	// Test quelques clés importantes
	const storyState = useHybridLocalStorage('storyState');
	const gameActionsState = useHybridLocalStorage('gameActionsState');
	const historyMessagesState = useHybridLocalStorage('historyMessagesState');

	function addLog(message: string) {
		debugLogs = [...debugLogs, `${new Date().toLocaleTimeString()} - ${message}`];
	}

	onMount(() => {
		updateMongoDBStatus();
		addLog(`MongoDB supporté: ${isMongoDBSupported}`);
		
		// Collecter les informations de stockage
		updateStorageInfo();
	});

	function updateMongoDBStatus() {
		const status = getMongoDBStatus();
		isMongoDBSupported = status.isSupported;
		isMongoDBInitialized = status.isInitialized;
		wasMongoDBAttempted = status.wasAttempted;
		currentUserId = status.userId || '';
	}

	function updateStorageInfo() {
		const info = [
			{
				key: 'storyState',
				location: storyState.storageInfo.location,
				size: storyState.storageInfo.size,
				isHydrated: storyState.storageInfo.isHydrated
			},
			{
				key: 'gameActionsState', 
				location: gameActionsState.storageInfo.location,
				size: gameActionsState.storageInfo.size,
				isHydrated: gameActionsState.storageInfo.isHydrated
			},
			{
				key: 'historyMessagesState',
				location: historyMessagesState.storageInfo.location,
				size: historyMessagesState.storageInfo.size,
				isHydrated: historyMessagesState.storageInfo.isHydrated
			}
		];
		storageInfo = info;
		addLog('Informations de stockage mises à jour');
	}

	async function initializeMongoDB() {
		try {
			addLog('Tentative d\'initialisation manuelle de MongoDB...');
			await initializeMongoDBManually();
			updateMongoDBStatus();
			addLog('✅ MongoDB initialisé avec succès!');
			
			// Forcer une sauvegarde de test pour vérifier que ça marche
			await storyState.forceSave();
			await gameActionsState.forceSave();
			await historyMessagesState.forceSave();
			updateStorageInfo();
		} catch (error) {
			addLog(`❌ Erreur lors de l'initialisation: ${error}`);
			updateMongoDBStatus();
		}
	}

	async function downloadAsJSON() {
		try {
			addLog('Téléchargement des données en JSON...');
			
			// Récupérer les données importantes
			const exportData = {
				storyState: storyState.value,
				gameActionsState: gameActionsState.value,
				historyMessagesState: historyMessagesState.value,
				exportedAt: new Date().toISOString(),
				note: 'Exported from Infinite Tales RPG - Storage Debug Panel'
			};
			
			// Créer le fichier JSON
			const jsonString = JSON.stringify(exportData, null, 2);
			const blob = new Blob([jsonString], { type: 'application/json' });
			
			// Créer un lien de téléchargement
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `infinite-tales-save-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			addLog('✅ Fichier JSON téléchargé avec succès!');
		} catch (error) {
			addLog(`❌ Erreur lors du téléchargement: ${error}`);
		}
	}

	async function forceMongoDBSave() {
		try {
			addLog('Force la sauvegarde en MongoDB...');
			await storyState.forceSave();
			await gameActionsState.forceSave();
			await historyMessagesState.forceSave();
			updateStorageInfo();
			addLog('✅ Sauvegarde forcée terminée');
		} catch (error) {
			addLog(`❌ Erreur lors de la sauvegarde: ${error}`);
		}
	}

	function clearLogs() {
		debugLogs = [];
	}
</script>

<div class="card bg-base-100 shadow-lg">
	<div class="card-body p-4">
		<h3 class="card-title text-lg mb-4">🔍 Debug Stockage - Où sont mes fichiers JSON ?</h3>
		
		<!-- Status de MongoDB -->
		<div class="alert {isMongoDBSupported ? (isMongoDBInitialized ? 'alert-success' : (wasMongoDBAttempted ? 'alert-warning' : 'alert-info')) : 'alert-error'} mb-4">
			<div>
				<span class="text-lg">
					{#if !isMongoDBSupported}
						❌
					{:else if isMongoDBInitialized}
						✅
					{:else if wasMongoDBAttempted}
						⚠️
					{:else}
						🔄
					{/if}
				</span>
				<div class="flex flex-col">
					<span>
						MongoDB: {isMongoDBSupported ? 'Connecté' : 'Non connecté'}
					</span>
					{#if isMongoDBSupported}
						<span class="text-sm opacity-70">
							{#if isMongoDBInitialized}
								Initialisé et prêt (User ID: {currentUserId})
							{:else if wasMongoDBAttempted}
								Échec d'initialisation (connexion MongoDB échouée)
							{:else}
								Sera initialisé automatiquement au premier usage
							{/if}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Informations de stockage -->
		<div class="mb-4">
			<h4 class="font-semibold mb-2">📍 Où sont stockées tes données :</h4>
			<div class="overflow-x-auto">
				<table class="table table-compact w-full">
					<thead>
						<tr>
							<th>Clé</th>
							<th>Emplacement</th>
							<th>Taille (bytes)</th>
							<th>Hydraté</th>
						</tr>
					</thead>
					<tbody>
						{#each storageInfo as info}
							<tr class="hover">
								<td class="font-mono text-sm">{info.key}</td>
								<td>
									<span class="badge {info.location === 'fileSystem' ? 'badge-success' : 'badge-warning'}">
										{info.location === 'fileSystem' ? '�️ MongoDB' : '💾 localStorage'}
									</span>
								</td>
								<td>{info.size.toLocaleString()}</td>
								<td>
									<span class="badge {info.isHydrated ? 'badge-success' : 'badge-error'}">
										{info.isHydrated ? '✅' : '❌'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex flex-wrap gap-2 mb-4">
			<button 
				class="btn btn-primary btn-sm"
				onclick={initializeFileSystem}
				disabled={!isFileSystemSupported}
			>
				🚀 Initialiser File System
			</button>
			
			<button 
				class="btn btn-accent btn-sm"
				onclick={downloadAsJSON}
			>
				💾 Télécharger JSON
			</button>
			
			<button 
				class="btn btn-secondary btn-sm"
				onclick={forceFileSystemSave}
			>
				💾 Forcer sauvegarde
			</button>
			
			<button 
				class="btn btn-neutral btn-sm"
				onclick={updateStorageInfo}
			>
				🔄 Actualiser infos
			</button>
		</div>

		<!-- Logs de debug -->
		<div class="mb-4">
			<div class="flex justify-between items-center mb-2">
				<h4 class="font-semibold">📝 Logs de debug :</h4>
				<button class="btn btn-ghost btn-xs" onclick={clearLogs}>Effacer</button>
			</div>
			
			<div class="bg-base-200 rounded-lg p-3 max-h-40 overflow-y-auto">
				{#if debugLogs.length === 0}
					<p class="text-base-content/60 text-sm">Aucun log...</p>
				{:else}
					{#each debugLogs as log}
						<div class="text-xs font-mono mb-1">{log}</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Explications -->
		<div class="alert alert-info">
			<div class="text-sm">
				<p class="font-semibold mb-2">💡 Comment ça marche maintenant :</p>
				<ul class="list-disc list-inside space-y-1 text-xs">
					<li>Les gros fichiers (story, actions) <strong>tentent automatiquement</strong> d'utiliser le File System</li>
					<li>Une popup s'ouvrira <strong>automatiquement</strong> la première fois pour choisir un dossier</li>
					<li>Si tu refuses ou si ça échoue, tout reste en <strong>localStorage</strong></li>
					<li>Si tout est en localStorage = pas de fichiers JSON sur ton PC</li>
					<li>Utilise "Initialiser File System" pour re-essayer manuellement</li>
				</ul>
			</div>
		</div>
	</div>
</div>
