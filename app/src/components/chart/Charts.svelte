<script lang="ts">
    // Props and runtime imports
    import { initializePlotData } from '../../renderers/chartRenderer';
    import OverviewChart from './OverviewChart.svelte';
    import Zoom1Chart from './Zoom1Chart.svelte';
    import Zoom2Chart from './Zoom2Chart.svelte';
    import ChartLoadingStates from './ChartLoadingStates.svelte';
    import DualZoomControls from './DualZoomControls.svelte';
    import type { PlotDataResult } from '../../renderers/chartRenderer';

    // Props for selection values (use actual values, not indices)
    interface Props {
        channel?: string | number;
        trc?: string | number;
        segment?: string | number;
    }

    let { channel, trc, segment }: Props = $props();

    // Normalize to numeric indices for internal use (0-based)
    const channelIndex = Number.isFinite(Number(channel)) ? Number(channel) - 1 : 0;
    const trcIndex = Number.isFinite(Number(trc)) ? Number(trc) - 1 : 0;
    const segmentIndex = Number.isFinite(Number(segment)) ? Number(segment) - 1 : 0;

    // Extend Props to include loaded Zarr handles
    interface Props {
        channel?: string | number;
        trc?: string | number;
        segment?: string | number;
        rawStore?: any | null;
        overviewStore?: any | null;
        zarrGroup?: any | null;
    }

    let { channel, trc, segment, rawStore, overviewStore, zarrGroup }: Props = $props();

    // Component state using Svelte 5 runes with proper TypeScript typing
    let plotData = $state<PlotDataResult | null>(null);
    let isInitialized = $state<boolean>(false);
    let chartError = $state<string | null>(null);

    // Multi-level zoom state
    let overviewZoomLevel = $state<number | null>(null);
    let zoom1ZoomLevel = $state<number | null>(null);

    // Rectangle positions (normalized 0-1)
    let overviewRectanglePosition = $state<number>(0.5); // Center
    let zoom1RectanglePosition = $state<number>(0.5); // Center

    const canInitialize = $derived<boolean>(
        rawStore !== null &&
        zarrGroup !== null &&
        overviewStore !== null &&
        typeof channelIndex === 'number' &&
        typeof trcIndex === 'number' &&
        typeof segmentIndex === 'number' &&
        channelIndex >= 0 &&
        trcIndex >= 0 &&
        segmentIndex >= 0 &&
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
                rawStore,
                zarrGroup,
                overviewStore,
                channelIndex,
                trcIndex,
                segmentIndex
            );
            plotData = result;
        } catch (error) {
            console.error('Chart initialization failed:', error);
            chartError = error instanceof Error ? error.message : 'Unknown initialization error';
            isInitialized = false;
        }
    }

    // Optimized zoom handlers with proper TypeScript typing
    function handleOverviewZoomLevelChange(event: CustomEvent<{ zoomLevel: number; levelId: string; position: number }>): void {
        const { zoomLevel } = event.detail;
        overviewZoomLevel = zoomLevel;
    }

    function handleZoom1ZoomLevelChange(event: CustomEvent<{ zoomLevel: number; levelId: string; position: number }>): void {
        const { zoomLevel } = event.detail;
        zoom1ZoomLevel = zoomLevel;
    }

    function handleOverviewRectangleChange(position: number): void {
        overviewRectanglePosition = position;
    }

    function handleZoom1RectangleChange(position: number): void {
        zoom1RectanglePosition = position;
    }

    function handleZoomReset(): void {
        overviewZoomLevel = null;
        zoom1ZoomLevel = null;
        overviewRectanglePosition = 0.5;
        zoom1RectanglePosition = 0.5;
    }

    function handleReloadData(): void {
        plotData = null;
        isInitialized = false;
        chartError = null;
        handleZoomReset();
    }
</script>

<style>
    .chart-wrapper {
        height: 400px;
        max-height: 500px;
        min-height: 300px;
        overflow: hidden;
    }

    .chart-row {
        margin-bottom: 1rem;
    }

    .chart-container {
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        overflow: hidden;
    }

    .controls-container {
        flex-shrink: 0;
        width: 30rem;
    }
</style>

<!-- Chart container -->
<ChartLoadingStates isLoading={false} error={chartError} />

{#if !chartError}
    <div class="space-y-6">
        <!-- Row 1: Overview Chart -->
        <div class="chart-row">
            <div class="flex gap-4">
                <!-- Chart Container -->
                <div class="flex-1 chart-container">
                    <div class="p-2 bg-gray-50 rounded-lg border border-gray-200 chart-wrapper">
                        {#if !isInitialized || !plotData}
                            <ChartLoadingStates showInitializing={true} />
                        {:else}
                            <!-- Overview Chart -->
                            <OverviewChart
                                data={plotData.overviewData || []}
                                totalTime={plotData.total_time_s}
                                globalYMin={plotData.globalYMin ?? 0}
                                globalYMax={plotData.globalYMax ?? 1}
                                zoomLevel={overviewZoomLevel}
                                onRectangleChange={handleOverviewRectangleChange}
                            />
                        {/if}
                    </div>
                </div>

                <!-- Overview Zoom Controls -->
                {#if isInitialized && plotData}
                    <div class="controls-container">
                        <DualZoomControls
                            timeBetweenPoints={plotData.horiz_interval}
                            segmentDuration={plotData.total_time_s}
                            totalSamples={plotData.no_of_samples}
                            currentZoomLevel={overviewZoomLevel}
                            levelId="overview"
                            title="Overview Zoom"
                            on:zoomLevelChange={handleOverviewZoomLevelChange}
                        />
                    </div>
                {/if}
            </div>
        </div>

        <!-- Row 2: Zoom Level 1 Chart -->
        <div class="chart-row">
            <div class="flex gap-4">
                <!-- Chart Container -->
                <div class="flex-1 chart-container">
                    <div class="p-2 bg-gray-50 rounded-lg border border-gray-200 chart-wrapper">
                        {#if !isInitialized || !plotData}
                            <ChartLoadingStates showInitializing={true} />
                        {:else}
                            <!-- Zoom1 Chart -->
                            <Zoom1Chart
                                data={plotData.overviewData || []}
                                totalTime={plotData.total_time_s}
                                globalYMin={plotData.globalYMin ?? 0}
                                globalYMax={plotData.globalYMax ?? 1}
                                zoomLevel={zoom1ZoomLevel}
                                rectanglePosition={overviewRectanglePosition}
                                rectangleWidth={overviewZoomLevel ? overviewZoomLevel / plotData.total_time_s : 0.1}
                                onRectangleChange={handleZoom1RectangleChange}
                            />
                        {/if}
                    </div>
                </div>

                <!-- Zoom1 Controls -->
                {#if isInitialized && plotData}
                    <div class="controls-container">
                        <DualZoomControls
                            timeBetweenPoints={plotData.horiz_interval}
                            segmentDuration={plotData.total_time_s}
                            totalSamples={plotData.no_of_samples}
                            currentZoomLevel={zoom1ZoomLevel}
                            levelId="zoom1"
                            title="Zoom Level 1"
                            on:zoomLevelChange={handleZoom1ZoomLevelChange}
                        />
                    </div>
                {/if}
            </div>
        </div>

        <!-- Row 3: Zoom Level 2 Chart -->
        <div class="chart-row">
            <div class="flex gap-4">
                <!-- Chart Container -->
                <div class="flex-1 chart-container">
                    <div class="p-2 bg-gray-50 rounded-lg border border-gray-200 chart-wrapper">
                        {#if !isInitialized || !plotData}
                            <ChartLoadingStates showInitializing={true} />
                        {:else}
                            <!-- Zoom2 Chart -->
                                <Zoom2Chart
                                rawData={rawStore?.data || []}
                                totalTime={plotData.total_time_s}
                                globalYMin={plotData.globalYMin ?? 0}
                                globalYMax={plotData.globalYMax ?? 1}
                                rectanglePosition={zoom1RectanglePosition}
                                rectangleWidth={zoom1ZoomLevel ? zoom1ZoomLevel / plotData.total_time_s : 0.01}
                                samplingRate={rawStore?.metadata?.samples ? plotData.no_of_samples / plotData.total_time_s : 1000}
                            />
                        {/if}
                    </div>
                </div>

                <!-- Global Controls -->
                {#if isInitialized && plotData}
                    <div class="controls-container">
                        <!-- Debug Panel -->
                        <div class="bg-gray-100 p-3 rounded-lg mb-3 text-xs font-mono border">
                            <div class="space-y-1">
                                <div><strong>Zoom Levels:</strong></div>
                                <div>Overview: {overviewZoomLevel ?? 'null'}</div>
                                <div>Zoom1: {zoom1ZoomLevel ?? 'null'}</div>
                                <div><strong>Rectangle Positions:</strong></div>
                                <div>Overview: {overviewRectanglePosition.toFixed(3)}</div>
                                <div>Zoom1: {zoom1RectanglePosition.toFixed(3)}</div>
                                <div><strong>Data:</strong></div>
                                <div>Raw Data: {currentData?.rawStore?.data?.length ?? 0} samples</div>
                                <div>Plot Data: {plotData ? 'loaded' : 'null'}</div>
                            </div>
                        </div>

                        <div class="bg-white p-3 rounded-lg shadow-md min-w-[200px] max-w-[240px] space-y-3">
                            <h3 class="text-lg font-semibold text-gray-800 m-0">Global Controls</h3>

                            <button
                                onclick={handleZoomReset}
                                class="w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer bg-red-500 hover:bg-red-600 hover:-translate-y-0.5"
                            >
                                🔄 Reset All Zoom
                            </button>

                            <button
                                onclick={handleReloadData}
                                class="w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer bg-blue-500 hover:bg-blue-600 hover:-translate-y-0.5"
                            >
                                📊 Reload Data
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}


