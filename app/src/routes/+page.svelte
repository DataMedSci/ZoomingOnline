<script lang="ts">
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { browser } from '$app/environment';
    import DataInput from '../components/DataInput.svelte';

    let inputUrl = $state('');

    const exampleUrl = $derived(() => {
        if (browser) {
            return new URL('/downloads/example.zarr', window.location.origin).toString();
        }
        return '/downloads/example.zarr'; // Fallback for SSR
    });

    async function handleLoadData(event: { url: string }) {
        const url = event.url;
        const dataParam = encodeURIComponent(url);
        goto(`${resolve('/selection')}?data=${dataParam}`);
    }

</script>

<svelte:head>
    <title>ZoomingOnline - Interactive Raw Data Analysis</title>
</svelte:head>

<div class="min-h-[60vh] flex flex-col justify-center items-center">
    <DataInput 
        bind:inputUrl
        exampleUrl={exampleUrl()}
        onload={handleLoadData}
    />
</div>
