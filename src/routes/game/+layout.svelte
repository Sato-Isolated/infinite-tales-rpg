<script>
	import '../../app.css';
	import { page } from '$app/stores';
	import { errorState } from '$lib/state/errorState.svelte.ts';
	import ErrorModal from '$lib/components/interaction_modals/ErrorModal.svelte';
	import { handleError } from '$lib/util.svelte.ts';
	import { onMount } from 'svelte';
	import { stringifyPretty } from '$lib/util.svelte';

	let { children } = $props();
	let activeUrl = $state('');
	let hasSubMenu = $state(false);
	$effect(() => {
		activeUrl = $page.url.pathname;
		hasSubMenu = activeUrl.includes('game/settings');
	});

	onMount(() => {
		window.onerror = (event, source, lineno, colno, error) => {
			let text = '';
			if (error.message) {
				text += error.message;
			}
			if (error.stack) {
				text += '\n' + error.stack;
			} else {
				text += '\n' + stringifyPretty({ event, source, lineno, colno, error });
			}
			handleError(text);
			return false;
		};
		window.onunhandledrejection = (a) => {
			let text = '';
			if (a.reason.message) {
				text += a.reason.message;
			}
			if (a.reason.stack) {
				text += '\n' + a.reason.stack;
			} else {
				text += '\n' + a.reason;
			}
			handleError(text);
			return false;
		};
	});
</script>

{#if errorState.userMessage && activeUrl !== '/game'}
	<ErrorModal />
{/if}

<nav class="dock bg-base-300 h-[7vh] w-screen overflow-hidden">
	<a
		href="/game"
		class="hover:bg-base-100 transition-colors"
		class:dock-active={activeUrl === '/game'}
	>
		<span class="dock-label">Tale</span>
	</a>
	<a
		href="/game/debugstate"
		class="hover:bg-base-100 transition-colors"
		class:dock-active={activeUrl === '/game/debugstate'}
	>
		<span class="dock-label">Debug Info</span>
	</a>
	<a
		href="/game/character"
		class="hover:bg-base-100 transition-colors"
		class:dock-active={activeUrl === '/game/character'}
	>
		<span class="dock-label">Character</span>
	</a>
	<a
		href="/game/settings/ai"
		class="hover:bg-base-100 transition-colors"
		class:dock-active={activeUrl.includes('/game/settings')}
	>
		<span class="dock-label">Menu</span>
	</a>
</nav>

<!--TODO max-h-[85vh] is just a workaround because the mobile browser address bar makes 93vh higher than it should...
-->
<main
	class:max-h-[78svh]={hasSubMenu}
	class:lg:max-h-[86svh]={hasSubMenu}
	class:max-h-[85svh]={!hasSubMenu}
	class:lg:max-h-[93svh]={!hasSubMenu}
	class="w-screen overflow-x-hidden overflow-y-auto"
>
	{@render children()}
</main>
