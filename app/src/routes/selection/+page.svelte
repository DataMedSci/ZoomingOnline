<script lang="ts">
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { CircleAlert, CheckCircle } from '@lucide/svelte';
    import { 
        actions,
        isDataReady,
        selectorOptions,
        dataState,
        uiState
    } from '../../stores/appState';
    import { loadZarrData } from '../../services/dataService';
    import ShareButton from '../../components/ShareButton.svelte';
    import DatasetInfo from '../../components/DatasetInfo.svelte';
    import SelectionForm from '../../components/SelectionForm.svelte';
    import LoadingState from '../../components/LoadingState.svelte';

    // Local component state using Svelte 5 runes
    let hasInitialized = $state(false);
    let datasetInfo = $state(null as any); // Dataset info object
    let isAutoLoading = $state(false);

    // Selection state moved from store to local component state
    let selectedChannel = $state('1');
    let selectedTrc = $state('1');
    let selectedSegment = $state('1');

    // Global store access using derived runes
    const options = $derived($selectorOptions);
    const dataReady = $derived($isDataReady);
    const loading = $derived($uiState.isLoading);
    const error = $derived($uiState.error);

    // Get data URL from query parameters
    const dataUrlParam = $derived(() => {
        const url = new URL(page.url);
        return url.searchParams.get('data');
    });

    // Get selection parameters from URL
    const channelParam = $derived(() => {
        const url = new URL(page.url);
        return url.searchParams.get('channel');
    });

    const trcParam = $derived(() => {
        const url = new URL(page.url);
        return url.searchParams.get('trc');
    });

    const segmentParam = $derived(() => {
        const url = new URL(page.url);
        return url.searchParams.get('segment');
    });

    // Check if data is ready for plotting (data loaded, no need for selection validation)
    const plotReady = $derived(dataReady);
    $effect(() => {
        const url = dataUrlParam();
        if (url && !dataReady && !isAutoLoading && !loading) {
            isAutoLoading = true;
            loadDataFromUrl(url);
        }
    });

    // Initialize and check data readiness using runes effect
    $effect(() => {
        if (!dataReady && hasInitialized) {
            goto(resolve('/'));
            return;
        }

        if (dataReady && !hasInitialized) {
            hasInitialized = true;

            // Read URL parameters and set selection if available
            const urlParams = new URLSearchParams(page.url.search);
            const channelParam = urlParams.get('channel');
            const trcParam = urlParams.get('trc');
            const segmentParam = urlParams.get('segment');

            // Set channel if parameter exists and is valid
            if (channelParam && options.channels.includes(channelParam)) {
                selectedChannel = channelParam;
            }

            // Set TRC if parameter exists and is valid
            if (trcParam && options.trcFiles.includes(trcParam)) {
                selectedTrc = trcParam;
            }

            // Set segment if parameter exists and is valid
            if (segmentParam && options.segments.includes(segmentParam)) {
                selectedSegment = segmentParam;
            }
        }
    });

    // Effect to calculate dataset info when data becomes available
    $effect(() => {
        if ($dataState.rawStore?.shape && $dataState.zarrGroup && !datasetInfo) {
            calculateDatasetInfo();
        }
    });

    // Calculate dataset info when data is ready
    async function calculateDatasetInfo() {
        try {
            if (!$dataState.rawStore?.shape || !$dataState.zarrGroup) {
                return;
            }
            
            // Get basic info from rawStore shape
            const shape = $dataState.rawStore.shape;
            const pointsInSegment = shape[3] || 0; // Last dimension is time samples
            
            // Get attributes from zarr group with defensive access
            let attrs: any = {};
            try {
                attrs = await $dataState.zarrGroup.attrs.asObject() || {};
            } catch (attrError) {
                attrs = {};
            }
            
            // Calculate timing info with safe defaults
            const horizInterval = attrs.horiz_interval || attrs.horizontal_interval || 1000; // Default 1ms
            const timeBetweenPoints = horizInterval ? (horizInterval / 1000) : 0.001; // Convert to seconds
            const segmentLength = (pointsInSegment && timeBetweenPoints) ? (pointsInSegment * timeBetweenPoints) : 0;
            
            // Calculate total data size with safe access
            const rawDataElements = shape && Array.isArray(shape) ? shape.reduce((a, b) => (a || 1) * (b || 1), 1) : 0;
            const overviewElements = ($dataState.overviewStore?.shape && Array.isArray($dataState.overviewStore.shape)) 
                ? $dataState.overviewStore.shape.reduce((a, b) => (a || 1) * (b || 1), 1) : 0;
            const totalElements = rawDataElements + overviewElements;
            const elementSizeBytes = 2; // int16 = 2 bytes
            const totalDataSize = totalElements * elementSizeBytes;
            
            // Update dataset info with safe values
            datasetInfo = {
                pointsInSegment: pointsInSegment || 0,
                timeBetweenPoints: timeBetweenPoints || 0,
                segmentLength: segmentLength || 0,
                totalDataSize: totalDataSize || 0,
                url: $dataState.url || 'Unknown'
            };
            
        } catch (error) {
            console.error('Error calculating dataset info:', error);
            // Provide fallback info
            datasetInfo = {
                pointsInSegment: 0,
                timeBetweenPoints: 0,
                segmentLength: 0,
                totalDataSize: 0,
                url: $dataState.url || 'Unknown'
            };
        }
    }

    // Handle selection changes using callback pattern instead of events
    function handleSelectionChange(field: string, value: string) {
        switch (field) {
            case 'channel':
                selectedChannel = value;
                break;
            case 'trc':
                selectedTrc = value;
                break;
            case 'segment':
                selectedSegment = value;
                break;
        }
    }

    // Handle plot navigation
    async function handlePlot() {
        if (plotReady) {
            // Preserve data parameter when navigating to visualization
            const currentUrl = new URL(page.url);
            const dataParam = currentUrl.searchParams.get('data');

            let visualizationUrl = `${resolve('/visualization')}`;
            const params = new URLSearchParams();
            
            if (dataParam) {
                params.set('data', dataParam);
            }
            
            // Add selection parameters
            params.set('channel', selectedChannel);
            params.set('trc', selectedTrc);
            params.set('segment', selectedSegment);
            
            const paramString = params.toString();
            if (paramString) {
                visualizationUrl += `?${paramString}`;
            }
            
            await goto(visualizationUrl);
        } else {
            actions.setError('Data not ready for plotting');
        }
    }

    // Handle loading different dataset
    async function handleLoadDifferentDataset() {
        actions.resetData();
        await goto(`${resolve('/')}`);
    }

    // Auto-load data from URL parameter
    async function loadDataFromUrl(url: string) {
        try {
            actions.setLoading(true);
            await loadZarrData(url);
            actions.setData({ url, isLoaded: true });
            actions.setUI({ showCopyLink: true });
            actions.setError('');
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            actions.setError(errorMsg);
        } finally {
            actions.setLoading(false);
            isAutoLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Data Selection - ZoomingOnline</title>
    <meta name="description" content="Select channel, TRC, and segment for data visualization" />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Select Data Parameters
            </h1>
            <p class="text-gray-600">
                Choose the channel, TRC file, and segment to visualize from your dataset.
            </p>
        </div>
        <ShareButton />
    </div>

    {#if loading}
        <LoadingState loadingMessage="Processing dataset..." />
    {:else if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div class="flex items-center mb-2">
                <div class="w-5 h-5 text-red-600 mr-2">
                    <CircleAlert />
                </div>
                <h3 class="text-red-800 font-medium">Error Loading Dataset</h3>
            </div>
            <p class="text-red-700 mb-4">{error}</p>
            <button class="btn-secondary btn-sm" onclick={handleLoadDifferentDataset}>
                ← Try Different Dataset
            </button>
        </div>
    {:else if dataReady}
        <div class="space-y-6">
            {#if datasetInfo}
                <DatasetInfo datasetInfo={datasetInfo} />
            {:else}
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-800">Loading dataset information...</p>
                </div>
            {/if}

            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Selection Parameters</h2>
                
                <SelectionForm 
                    channels={options.channels}
                    trcFiles={options.trcFiles}
                    segments={options.segments}
                    {selectedChannel}
                    {selectedTrc}
                    {selectedSegment}
                    isDataReadyForPlot={plotReady}
                    onSelectionChange={handleSelectionChange}
                    onPlot={handlePlot}
                    onLoadDifferent={handleLoadDifferentDataset}
                />
            </div>

            {#if plotReady}
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <div class="w-5 h-5 text-green-600 mr-2">
                            <CheckCircle />
                        </div>
                        <span class="text-green-800 font-medium">Ready to plot data</span>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .container {
        animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>