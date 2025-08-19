<script lang="ts" context="module">
	export type Receiver = 'Character Action' | 'Game Command' | 'GM Question' | 'Dice Roll';
</script>

<script lang="ts">
	export let receiver: Receiver = 'Character Action';
	export let handleSubmit: (text: string, receiver: Receiver) => void;
	let inputRef: HTMLInputElement;
	export function clear() {
		if (inputRef) inputRef.value = '';
	}
	const onFormSubmit = (e: Event) => {
		e.preventDefault();
		if (!inputRef?.value) return;
		handleSubmit(inputRef.value, receiver);
		clear();
	};

	const getPlaceholder = () => {
		if (receiver === 'Character Action') return 'What do you want to do?';
		if (receiver === 'GM Question') return 'Message to the Game Master';
		if (receiver === 'Dice Roll') return 'notation like 1d20, 2d6+3';
		return 'Command without restrictions';
	};
</script>

<form id="input-form" class="p-4 pb-2" onsubmit={onFormSubmit}>
	<div class="lg:join w-full gap-0 lg:flex">
		<select bind:value={receiver} class="select select-md join-item w-full lg:w-fit">
			<option>Character Action</option>
			<option>Game Command</option>
			<option>GM Question</option>
			<option>Dice Roll</option>
		</select>
		<input
			type="text"
			bind:this={inputRef}
			class="input input-md join-item w-full lg:flex-1"
			id="user-input"
			placeholder={getPlaceholder()}
		/>
		<button
			class="btn btn-neutral btn-md join-item w-full shrink-0 lg:w-1/4"
			id="submit-button"
			type="submit">Submit</button
		>
	</div>
</form>
