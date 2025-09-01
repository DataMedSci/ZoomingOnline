<script lang="ts">
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { openZarr } from '../../services/dataService';
    
    import Charts from '../../components/chart/Charts.svelte';
    import ShareButton from '../../components/ShareButton.svelte';
    import { onMount, onDestroy } from 'svelte';
    import {
        getSelectionParamsFromUrl,
        buildUrlWithParams,
        validateSelectionParams
    } from '../../utils/urlParams';

    // Local component state using runes
    let hasInitialized = $state(false);

    // Local loaded Zarr handles
    let zarrGroup = $state<any | null>(null);
    let rawStore = $state<any | null>(null);
    let overviewStore = $state<any | null>(null);
    let loading = $state(false);
    let error = $state<string | null>(null);

    // Derived selector options from loaded rawStore
    const selectorOptions = $derived(() => {
        if (!rawStore?.shape) return { channels: [], trcFiles: [], segments: [] };
        const [channelCount, trcCount, segmentCount] = rawStore.shape;
        return {
            channels: Array.from({ length: channelCount || 0 }, (_, i) => `${i + 1}`),
            trcFiles: Array.from({ length: trcCount || 0 }, (_, i) => `${i + 1}`),
            segments: Array.from({ length: segmentCount || 0 }, (_, i) => `${i + 1}`),
        };
    });

    // Get validated selection parameters from URL
    const validatedParams = $derived(() => {
        // Only validate when selectorOptions are populated
        const opts = selectorOptions || { channels: [], trcFiles: [], segments: [] };
        const rawParams = getSelectionParamsFromUrl();
        return validateSelectionParams(rawParams, opts);
    });

    // NOTE: We intentionally avoid deriving numeric indices at this layer.
    // The Charts component accepts selection values (channel/trc/segment)
    // and normalizes to internal indices as needed. This keeps naming
    // consistent across the app and supports arbitrary value schemes.

    // Global store access using derived runes
    const plotReady = $derived($isDataReadyForPlot);
    const loading = $derived($isLoading);
    const dataLoaded = $derived($isDataLoaded);

    // Add/remove visualization-page class to body
    onMount(() => {
        document.body.classList.add('visualization-page');

        // Auto-load data when page mounts if URL param is present
        const url = new URL(page.url).searchParams.get('data');
        if (url) {
            loadDataFromUrl(url).catch(e => {
                error = e instanceof Error ? e.message : String(e);
            });
        }
    });

    onDestroy(() => {
        document.body.classList.remove('visualization-page');
    });

    // Navigation guard using runes effect
    $effect(() => {
        // Guard: if visualization isn't ready (no data), navigate back to selection
        const plotReady = !!rawStore && !!overviewStore && !!zarrGroup;
        if (!plotReady && !loading && hasInitialized) {
            const currentParams = getSelectionParamsFromUrl();
            const selectionUrl = buildUrlWithParams(`${resolve('/selection')}`, currentParams);
            goto(selectionUrl);
            return;
        }

        if (plotReady && !hasInitialized) {
            hasInitialized = true;
        }
    });

    async function loadDataFromUrl(url: string) {
        loading = true;
        error = null;
        try {
            const loaded = await openZarr(url);
            zarrGroup = loaded.zarrGroup;
            rawStore = loaded.rawStore;
            overviewStore = loaded.overviewStore;
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
            throw err;
        } finally {
            loading = false;
        }
    }

    function handleGoBack() {
        // Preserve all current parameters when going back to selection
        const currentParams = getSelectionParamsFromUrl();
        const selectionUrl = buildUrlWithParams(`${resolve('/selection')}`, currentParams);
        goto(selectionUrl);
    }
</script>

<svelte:head>
    <title>Data Visualization - ZoomingOnline</title>
</svelte:head>

{#if rawStore && zarrGroup}
    <div class="w-full">
        <div class="flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow-md">
            <div class="flex items-center gap-4">
                <button class="btn-primary btn-sm" onclick={handleGoBack}>
                    ← Back to Selection
                </button>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                    <span class="font-semibold text-gray-800">Channel:</span>
                    <span class="text-blue-600 font-medium">{validatedParams.channel}</span>
                    <span class="text-gray-500 mx-1">|</span>
                    <span class="font-semibold text-gray-800">TRC:</span>
                    <span class="text-blue-600 font-medium">{validatedParams.trc}</span>
                    <span class="text-gray-500 mx-1">|</span>
                    <span class="font-semibold text-gray-800">Segment:</span>
                    <span class="text-blue-600 font-medium">{validatedParams.segment}</span>
                </div>
            </div>
            <ShareButton />
        </div>
        
        <Charts rawStore={rawStore} overviewStore={overviewStore} zarrGroup={zarrGroup} channel={validatedParams.channel} trc={validatedParams.trc} segment={validatedParams.segment} />
    </div>
{/if}

{#if loading}
    <div class="p-6">
        <p>Loading data...</p>
    </div>
{:else if error}
    <div class="p-6 text-red-600">{error}</div>
{/if}
