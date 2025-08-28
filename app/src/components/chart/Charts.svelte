<script lang="ts">
    import { 
        appState,
        dataState,
        uiState
    } from '../../stores/appState';
    import { initializePlotData } from '../../renderers/chartRenderer';
    import OverviewChart from './OverviewChart.svelte';
    import ChartLoadingStates from './ChartLoadingStates.svelte';
    import ChartZoomControls from './ChartZoomControls.svelte';
    import type { PlotDataResult } from '../../renderers/chartRenderer';

    // Component state using Svelte 5 runes with proper TypeScript typing
    let plotData = $state<PlotDataResult | null>(null);
    let isInitialized = $state<boolean>(false);
    let chartError = $state<string | null>(null);

    // Local zoom state - no global store needed!
    let zoomLevel = $state<number | null>(null);

    // Derived values using Svelte 5 $derived with proper typing
    const state = $derived($appState);
    const data = $derived($dataState);

    const canInitialize = $derived<boolean>(
        data.rawStore !== null &&
        data.zarrGroup !== null &&
        data.overviewStore !== null &&
        state.selection.channelIndex !== null &&
        state.selection.trcIndex !== null &&
        state.selection.segmentIndex !== null &&
        typeof state.selection.channelIndex === 'number' &&
        typeof state.selection.trcIndex === 'number' &&
        typeof state.selection.segmentIndex === 'number' &&
        !isInitialized &&
        !chartError
    );

    // Initialize when ready using $effect
    $effect(() => {
        if (canInitialize) {
            initializeChart();
        }
    });

    // Functions with improved error handling and proper typing
    async function initializeChart(): Promise<void> {
        if (isInitialized) return;
        
        try {
            isInitialized = true;
            chartError = null;
            
            const result = await initializePlotData(
                data.rawStore,
                data.zarrGroup,
                data.overviewStore,
                state.selection.channelIndex!,
                state.selection.trcIndex!,
                state.selection.segmentIndex!
            );
            plotData = result;
        } catch (error) {
            console.error('Chart initialization failed:', error);
            chartError = error instanceof Error ? error.message : 'Unknown initialization error';
            isInitialized = false;
        }
    }

    // Optimized zoom handlers with proper TypeScript typing
    function handleZoomLevelChange(event: CustomEvent<{ zoomLevel: number; position: number }>): void {
        const { zoomLevel: newLevel } = event.detail;
        zoomLevel = newLevel;
    }

    function handleZoomReset(): void {
        zoomLevel = null;
    }

    function handleReloadData(): void {
        plotData = null;
        isInitialized = false;
        chartError = null;
    }
</script>

<style>
    .chart-wrapper {
        height: 400px; /* Fixed height to prevent infinite growth */
        max-height: 500px;
        min-height: 300px;
        overflow: hidden; /* Ensure content doesn't overflow */
    }
</style>

<!-- Chart container -->
<ChartLoadingStates isLoading={$uiState.isLoading} error={$uiState.error || chartError} />

{#if !$uiState.isLoading && !$uiState.error && !chartError}
    <div class="flex gap-4">
        <!-- Chart Container -->
        <div class="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
                <div class="p-2 bg-gray-50 rounded-lg border border-gray-200 chart-wrapper">
                    {#if !isInitialized || !plotData}
                        <ChartLoadingStates showInitializing={true} />
                    {:else}
                        <!-- Overview Chart -->
                        <OverviewChart
                            data={plotData.overviewData || []}
                            totalTime={plotData.total_time_s}
                            totalSamples={plotData.no_of_samples}
                            globalYMin={plotData.globalYMin ?? 0}
                            globalYMax={plotData.globalYMax ?? 1}
                            timeBetweenPoints={plotData.horiz_interval}
                            {zoomLevel}
                        />
                    {/if}
                </div>
        </div>
        
        <!-- Zoom Controls -->
        {#if isInitialized && plotData}
            <div class="flex-shrink-0 w-120">
                <ChartZoomControls
                    timeBetweenPoints={plotData.horiz_interval}
                    segmentDuration={plotData.total_time_s}
                    totalSamples={plotData.no_of_samples}
                    on:zoomLevelChange={handleZoomLevelChange}
                    on:zoomReset={handleZoomReset}
                    on:reloadData={handleReloadData}
                />
            </div>
        {/if}
    </div>
{/if}


