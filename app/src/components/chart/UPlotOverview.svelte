<script lang="ts">
import { onMount } from 'svelte';
import type { OverviewDataPoint } from '../../services/chart/ChartDataService';
import 'uplot/dist/uPlot.min.css';
import { createUPlotOverview, createUPlotZoomed } from '../../renderers/uPlotRenderer';

const {
    data,
    totalTime,
    globalYMin,
    globalYMax
}: {
    data: OverviewDataPoint[];
    totalTime: number;
    globalYMin: number;
    globalYMax: number;
} = $props();

let rangerDiv: HTMLDivElement | null = null;
let zoomedDiv: HTMLDivElement | null = null;
let rangerPlot: any = null;
let zoomedPlot: any = null;

onMount(() => {
    if (!rangerDiv || !zoomedDiv || !data || data.length === 0) return;

    // Initial zoom window
    const times = data.map(d => d.time_s);
    const initXmin = times[Math.floor(times.length * 0.1)] ?? 0;
    const initXmax = times[Math.floor(times.length * 0.5)] ?? totalTime / 2;

    rangerPlot = createUPlotOverview({
        container: rangerDiv,
        data,
        totalTime,
        globalYMin,
        globalYMax
    });

    zoomedPlot = createUPlotZoomed({
        container: zoomedDiv,
        data,
        xMin: initXmin,
        xMax: initXmax,
        globalYMin,
        globalYMax
    });

    return () => {
        rangerPlot?.destroy();
        zoomedPlot?.destroy();
        rangerPlot = null;
        zoomedPlot = null;
    };
});
</script>

<style>
.uplot-container {
    display: block;
    width: 800px;
    margin-bottom: 8px;
}
</style>

<div>
    <div class="uplot-container" bind:this={rangerDiv}></div>
    <div class="uplot-container" bind:this={zoomedDiv}></div>
</div>
