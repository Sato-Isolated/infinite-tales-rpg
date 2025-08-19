<script lang="ts" module>
	export type Receiver = 'Character Action' | 'Game Command' | 'GM Question' | 'Dice Roll';
</script>

<script lang="ts">
	// Modern Svelte 5 props pattern
	interface Props {
		handleSubmit: (text: string, receiver: Receiver) => void;
		receiver?: Receiver;
	}

	let { handleSubmit, receiver = $bindable('Character Action' as Receiver) }: Props = $props();
	let inputValue = $state('');
	let inputRef = $state<HTMLInputElement>();

	// Derived state for placeholder text
	const placeholder = $derived(() => {
		switch (receiver) {
			case 'Character Action':
				return 'What do you want to do?';
			case 'GM Question':
				return 'Message to the Game Master';
			case 'Dice Roll':
				return 'notation like 1d20, 2d6+3';
			default:
				return 'Command without restrictions';
		}
	});

	// Export clear function for parent component
	export function clear() {
		inputValue = '';
		inputRef?.focus();
	}

	// Optimized form submission handler
	const handleFormSubmit = (e: Event) => {
		e.preventDefault();
		const trimmedValue = inputValue.trim();
		if (!trimmedValue) return;

		handleSubmit(trimmedValue, receiver);
		clear();
	};

	// Auto-focus on mount
	$effect(() => {
		if (inputRef) {
			inputRef.focus();
		}
	});
</script>

<form id="input-form" class="p-4 pb-2" onsubmit={handleFormSubmit}>
	<div class="lg:join w-full gap-0 lg:flex">
		<select bind:value={receiver} class="select select-md join-item w-full lg:w-fit">
			<option value="Character Action">Character Action</option>
			<option value="Game Command">Game Command</option>
			<option value="GM Question">GM Question</option>
			<option value="Dice Roll">Dice Roll</option>
		</select>
		<input
			type="text"
			bind:this={inputRef}
			bind:value={inputValue}
			class="input input-md join-item w-full lg:flex-1"
			id="user-input"
			placeholder={placeholder()}
			autocomplete="off"
		/>
		<button
			class="btn btn-neutral btn-md join-item w-full shrink-0 lg:w-1/4"
			id="submit-button"
			type="submit"
			disabled={!inputValue.trim()}
		>
			Submit
		</button>
	</div>
</form>
