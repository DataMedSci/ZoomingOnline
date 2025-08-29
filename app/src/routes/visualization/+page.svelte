<script lang="ts">
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { 
        isDataReadyForPlot,
        isLoading,
        isDataLoaded
    } from '../../stores/index';
    
    import Charts from '../../components/chart/Charts.svelte';
    import ShareButton from '../../components/ShareButton.svelte';
    import { onMount, onDestroy } from 'svelte';

    // Local component state using runes
    let hasInitialized = $state(false);

    // Selection values from URL parameters
    const channelParam = $derived(() => {
        const url = new URL(page.url);
        return url.searchParams.get('channel') || '1';
    });
    const trcParam = $derived(() => {
        const url = new URL(page.url);
        return url.searchParams.get('trc') || '1';
    });
    const segmentParam = $derived(() => {
        const url = new URL(page.url);
        return url.searchParams.get('segment') || '1';
    });

    // Convert to indices for display
    const channelIndex = $derived(parseInt(channelParam()) - 1);
    const trcIndex = $derived(parseInt(trcParam()) - 1);
    const segmentIndex = $derived(parseInt(segmentParam()) - 1);

    // Global store access using derived runes
    const plotReady = $derived($isDataReadyForPlot);
    const loading = $derived($isLoading);
    const dataLoaded = $derived($isDataLoaded);

    // Add/remove visualization-page class to body
    onMount(() => {
        document.body.classList.add('visualization-page');
    });

    onDestroy(() => {
        document.body.classList.remove('visualization-page');
    });

    // Navigation guard using runes effect
    $effect(() => {
        // Guard: if visualization isn't ready (no data), navigate back to selection
        if (!plotReady && !loading && dataLoaded && hasInitialized) {
            // Preserve data and selection parameters when redirecting back to selection
            const currentUrl = new URL(page.url);
            const dataParam = currentUrl.searchParams.get('data');
            const channelParam = currentUrl.searchParams.get('channel');
            const trcParam = currentUrl.searchParams.get('trc');
            const segmentParam = currentUrl.searchParams.get('segment');

            let selectionUrl = `${resolve('/selection')}`;
            const params = new URLSearchParams();
            
            if (dataParam) params.set('data', dataParam);
            if (channelParam) params.set('channel', channelParam);
            if (trcParam) params.set('trc', trcParam);
            if (segmentParam) params.set('segment', segmentParam);
            
            const paramString = params.toString();
            if (paramString) {
                selectionUrl += `?${paramString}`;
            }
            
            goto(selectionUrl);
            return;
        }

        if (plotReady && !hasInitialized) {
            hasInitialized = true;
        }
    });

    function handleGoBack() {
        // Preserve data and selection parameters from current URL when going back to selection
        const currentUrl = new URL(page.url);
        const dataParam = currentUrl.searchParams.get('data');
        const channelParam = currentUrl.searchParams.get('channel');
        const trcParam = currentUrl.searchParams.get('trc');
        const segmentParam = currentUrl.searchParams.get('segment');

        let selectionUrl = `${resolve('/selection')}`;
        const params = new URLSearchParams();
        
        if (dataParam) params.set('data', dataParam);
        if (channelParam) params.set('channel', channelParam);
        if (trcParam) params.set('trc', trcParam);
        if (segmentParam) params.set('segment', segmentParam);
        
        const paramString = params.toString();
        if (paramString) {
            selectionUrl += `?${paramString}`;
        }
        
        goto(selectionUrl);
    }
</script>

<svelte:head>
    <title>Data Visualization - ZoomingOnline</title>
</svelte:head>

{#if plotReady}
    <div class="w-full">
        <div class="flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow-md">
            <div class="flex items-center gap-4">
                <button class="btn-primary btn-sm" onclick={handleGoBack}>
                    ← Back to Selection
                </button>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                    <span class="font-semibold text-gray-800">Channel:</span>
                    <span class="text-blue-600 font-medium">{channelIndex + 1}</span>
                    <span class="text-gray-500 mx-1">|</span>
                    <span class="font-semibold text-gray-800">TRC:</span>
                    <span class="text-blue-600 font-medium">{trcIndex + 1}</span>
                    <span class="text-gray-500 mx-1">|</span>
                    <span class="font-semibold text-gray-800">Segment:</span>
                    <span class="text-blue-600 font-medium">{segmentIndex + 1}</span>
                </div>
            </div>
            <ShareButton />
        </div>
        
        <Charts channelIndex={channelIndex} trcIndex={trcIndex} segmentIndex={segmentIndex} />
    </div>
{/if}
