<script lang="ts">
	import { onMount } from 'svelte';
	import { mongoStorageManager } from '$lib/state/hybrid/mongoStorageManager';
	import type { ConnectionStatus } from '$lib/state/hybrid/mongoStorageManager';

	let connectionStatus = $state<ConnectionStatus>({
		isConnected: false,
		isReconnecting: false,
		changeStreamsSupported: false,
		connectionQuality: 'disconnected'
	});

	let diagnostics = $state({
		apiEndpointTest: 'pending',
		sseEndpointTest: 'pending',
		batchEndpointTest: 'pending',
		mongoConnection: 'pending'
	});

	let mongoInfo = $state<{
		serverType: string;
		recommendations: string[];
	}>({
		serverType: 'unknown',
		recommendations: []
	});

	async function runDiagnostics() {
		console.log('🔍 Running MongoDB connection diagnostics...');

		// Test main API endpoint
		try {
			const response = await fetch('/api/storage?key=diagnostic-test');
			if (response.ok) {
				diagnostics.apiEndpointTest = 'success';
				console.log('✅ Main API endpoint working');
			} else {
				diagnostics.apiEndpointTest = 'failed';
				console.log('❌ Main API endpoint failed:', response.status);
			}
		} catch (error) {
			diagnostics.apiEndpointTest = 'error';
			console.log('❌ Main API endpoint error:', error);
		}

		// Test SSE endpoint
		try {
			const response = await fetch('/api/storage/events', { method: 'HEAD' });
			if (response.ok) {
				diagnostics.sseEndpointTest = 'success';
				console.log('✅ SSE endpoint available');
			} else {
				diagnostics.sseEndpointTest = 'failed';
				console.log('❌ SSE endpoint failed:', response.status);
			}
		} catch (error) {
			diagnostics.sseEndpointTest = 'error';
			console.log('❌ SSE endpoint error:', error);
		}

		// Test batch endpoint
		try {
			const response = await fetch('/api/storage/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ keys: ['test'] })
			});
			if (response.ok) {
				diagnostics.batchEndpointTest = 'success';
				console.log('✅ Batch endpoint working');
			} else {
				diagnostics.batchEndpointTest = 'failed';
				console.log('❌ Batch endpoint failed:', response.status);
			}
		} catch (error) {
			diagnostics.batchEndpointTest = 'error';
			console.log('❌ Batch endpoint error:', error);
		}

		// Test MongoDB initialization
		try {
			await mongoStorageManager.initialize();
			const info = mongoStorageManager.getInfo();
			connectionStatus = info.connectionStatus;
			
			if (info.isSupported && connectionStatus.isConnected) {
				diagnostics.mongoConnection = 'success';
				console.log('✅ MongoDB connection successful');
				
				// Get MongoDB server information
				try {
					const response = await fetch('/api/mongodb-info');
					if (response.ok) {
						const serverInfo = await response.json();
						mongoInfo = {
							serverType: serverInfo.serverType || 'unknown',
							recommendations: serverInfo.recommendations || []
						};
					}
				} catch (error) {
					console.log('ℹ️ Could not fetch MongoDB server info:', error);
				}
			} else {
				diagnostics.mongoConnection = 'failed';
				console.log('❌ MongoDB connection failed');
			}
		} catch (error) {
			diagnostics.mongoConnection = 'error';
			console.log('❌ MongoDB connection error:', error);
		}
	}

	onMount(() => {
		runDiagnostics();
	});

	function getStatusIcon(status: string) {
		switch (status) {
			case 'success': return '✅';
			case 'failed': return '❌';
			case 'error': return '🚨';
			case 'pending': return '⏳';
			default: return '❓';
		}
	}

	function getQualityColor(quality: string) {
		switch (quality) {
			case 'excellent': return 'text-success';
			case 'good': return 'text-info';
			case 'poor': return 'text-warning';
			case 'disconnected': return 'text-error';
			default: return 'text-base-content';
		}
	}

	function getServerTypeIcon(serverType: string) {
		switch (serverType) {
			case 'replica-set': return '🔄';
			case 'sharded': return '🌐';
			case 'standalone': return '💻';
			default: return '❓';
		}
	}

	function getServerTypeColor(serverType: string) {
		switch (serverType) {
			case 'replica-set': return 'text-success';
			case 'sharded': return 'text-info';
			case 'standalone': return 'text-warning';
			default: return 'text-base-content';
		}
	}
</script>

<div class="card bg-base-100 shadow-lg">
	<div class="card-body p-3">
		<h3 class="card-title text-sm mb-3">
			<span class="text-base">🔧</span>
			MongoDB Connection Diagnostics
		</h3>

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-sm">Main API Endpoint</span>
				<span class="text-sm">{getStatusIcon(diagnostics.apiEndpointTest)} {diagnostics.apiEndpointTest}</span>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-sm">Real-time Events (SSE)</span>
				<span class="text-sm">{getStatusIcon(diagnostics.sseEndpointTest)} {diagnostics.sseEndpointTest}</span>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-sm">Batch Operations</span>
				<span class="text-sm">{getStatusIcon(diagnostics.batchEndpointTest)} {diagnostics.batchEndpointTest}</span>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-sm">MongoDB Connection</span>
				<span class="text-sm">{getStatusIcon(diagnostics.mongoConnection)} {diagnostics.mongoConnection}</span>
			</div>

			<div class="divider my-2"></div>

			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<span class="text-xs opacity-70">Connection Status</span>
					<span class="text-xs {connectionStatus.isConnected ? 'text-success' : 'text-error'}">
						{connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
					</span>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-xs opacity-70">Connection Quality</span>
					<span class="text-xs {getQualityColor(connectionStatus.connectionQuality)}">
						{connectionStatus.connectionQuality}
					</span>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-xs opacity-70">Server Type</span>
					<span class="text-xs {getServerTypeColor(mongoInfo.serverType)}">
						{getServerTypeIcon(mongoInfo.serverType)} {mongoInfo.serverType}
					</span>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-xs opacity-70">Real-time Updates</span>
					<span class="text-xs {connectionStatus.changeStreamsSupported ? 'text-success' : 'text-warning'}">
						{connectionStatus.changeStreamsSupported ? 'Supported' : 'Not Available'}
					</span>
				</div>

				{#if connectionStatus.lastError}
					<div class="mt-2 p-2 bg-error/10 rounded border border-error/20">
						<span class="text-xs text-error">{connectionStatus.lastError}</span>
					</div>
				{/if}

				{#if mongoInfo.recommendations.length > 0}
					<div class="mt-3">
						<div class="text-xs font-medium mb-1 opacity-70">Recommendations:</div>
						<div class="space-y-1">
							{#each mongoInfo.recommendations as recommendation}
								<div class="text-xs text-info bg-info/10 p-2 rounded border border-info/20">
									💡 {recommendation}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div class="flex justify-end mt-3">
				<button class="btn btn-sm btn-primary" onclick={runDiagnostics}>
					Rerun Diagnostics
				</button>
			</div>
		</div>
	</div>
</div>