<script lang="ts">
	import NarrativeMarkupParser from './NarrativeMarkupParser.svelte';

	// Exemple de story avec notre nouveau système de markup
	const exampleStory = `L'air matinal est frais et humide. Vous vous réveillez dans votre chambre d'auberge, les rayons du soleil filtrant à travers les volets de bois.

[action]Vous vous étirez et bâillez, encore ensommeillé[/action]

En descendant dans la salle commune, vous entendez des voix familières.

[dialogue:Aubergiste]Bonjour mon brave ! Bien dormi ? Le petit-déjeuner vous attend.[/dialogue]

[atmosphere]L'odeur du pain frais et du bacon grillé emplit la salle. Quelques voyageurs sont déjà attablés, discutant à voix basse de leurs affaires.[/atmosphere]

[dialogue:Voyageur]As-tu entendu les nouvelles du nord ? Les routes ne sont plus sûres...[/dialogue]

[thought]Ces rumeurs sont-elles vraies ? Peut-être devrais-je reconsidérer mon itinéraire.[/thought]

[status:warning]Votre bourse semble plus légère que prévu[/status]

[transition]

[atmosphere]Soudain, un messager fait irruption dans l'auberge, hors d'haleine.[/atmosphere]

[dialogue:Messager]Un message urgent pour l'aventurier ! Le maire vous demande de toute urgence ![/dialogue]

[emphasis]Cette nouvelle change tout[/emphasis]

[badge]Quête disponible[/badge]

[status:success]Une nouvelle aventure commence[/status]`;
</script>

<div class="card bg-base-100 shadow-xl max-w-4xl mx-auto">
	<div class="card-body">
		<h2 class="card-title text-2xl mb-6">🧪 Test du Système de Markup Narratif</h2>
		
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Source Markup -->
			<div>
				<h3 class="text-lg font-semibold mb-3">📝 Source (Markup)</h3>
				<div class="bg-base-200 p-4 rounded-lg overflow-auto max-h-96">
					<pre class="text-xs whitespace-pre-wrap">{exampleStory}</pre>
				</div>
			</div>
			
			<!-- Rendered Result -->
			<div>
				<h3 class="text-lg font-semibold mb-3">🎨 Rendu (HTML Stylé)</h3>
				<div class="bg-base-100 border-2 border-base-300 p-4 rounded-lg max-h-96 overflow-auto">
					<NarrativeMarkupParser content={exampleStory} />
				</div>
			</div>
		</div>
		
		<div class="mt-6">
			<h3 class="text-lg font-semibold mb-3">📊 Comparaison des Tailles</h3>
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-title">Markup Source</div>
					<div class="stat-value text-primary">{exampleStory.length}</div>
					<div class="stat-desc">caractères</div>
				</div>
				<div class="stat">
					<div class="stat-title">Tokens économisés</div>
					<div class="stat-value text-success">~60%</div>
					<div class="stat-desc">vs HTML dans prompts</div>
				</div>
			</div>
		</div>
	</div>
</div>
