<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    // Props using Svelte 5 $props()
    interface Zoom2ChartProps {
        rawData: number[] | Float32Array | Int16Array;
        totalTime: number;
        globalYMin: number;
        globalYMax: number;
        rectanglePosition: number; // Position from zoom1 chart rectangle (0-1 normalized)
        rectangleWidth: number; // Width from zoom1 chart rectangle (0-1 normalized)
        samplingRate: number;
    }

    let {
        rawData,
        totalTime,
        globalYMin,
        globalYMax,
        rectanglePosition,
        rectangleWidth,
        samplingRate
    }: Zoom2ChartProps = $props();

    // DOM references
    let svgElement: SVGSVGElement;
    let containerElement: HTMLDivElement;

    // Reactive dimensions state
    let dimensions = $state({
        width: 800,
        height: 400
    });

    // Constants
    const MARGIN = { top: 10, right: 10, bottom: 35, left: 80 } as const;
    const MIN_WIDTH = 400;
    const MAX_WIDTH = 1200;
    const MIN_HEIGHT = 300;
    const MAX_HEIGHT = 500;
    const RESIZE_THROTTLE_MS = 100;

    // Derived values
    const chartDimensions = $derived({
        innerWidth: dimensions.width - MARGIN.left - MARGIN.right,
        innerHeight: dimensions.height - MARGIN.top - MARGIN.bottom
    });

    // Calculate the subset of data to show based on rectangle position from zoom1
    const visibleDataRange = $derived(() => {
        const startTime = rectanglePosition * totalTime - (rectangleWidth * totalTime) / 2;
        const endTime = rectanglePosition * totalTime + (rectangleWidth * totalTime) / 2;
        const result = {
            startTime: Math.max(0, startTime),
            endTime: Math.min(totalTime, endTime)
        };
        console.log('Zoom2Chart - visibleDataRange:', {
            rectanglePosition,
            rectangleWidth,
            totalTime,
            startTime,
            endTime,
            result
        });
        return result;
    });

    // Convert time range to sample indices
    const sampleRange = $derived(() => {
        const range = visibleDataRange();
        const startSample = Math.floor(range.startTime * samplingRate);
        const endSample = Math.ceil(range.endTime * samplingRate);
        const result = {
            start: Math.max(0, startSample),
            end: Math.min(rawData.length, endSample)
        };
        console.log('Zoom2Chart - sampleRange:', {
            range,
            samplingRate,
            rawDataLength: rawData?.length,
            startSample,
            endSample,
            result
        });
        return result;
    });

    // Extract the visible data subset
    const visibleData = $derived(() => {
        const range = sampleRange();
        if (!rawData || range.start >= range.end) {
            console.log('Zoom2Chart - visibleData: No data or invalid range', {
                rawData: rawData ? 'present' : 'null/undefined',
                range,
                rawDataLength: rawData?.length
            });
            return [];
        }
        const data = Array.from(rawData.slice(range.start, range.end));
        console.log('Zoom2Chart - visibleData:', {
            range,
            dataLength: data.length,
            firstFewValues: data.slice(0, 5),
            lastFewValues: data.slice(-5)
        });
        return data;
    });

    // Create time points for the visible data
    const timePoints = $derived(() => {
        const range = sampleRange();
        const times: number[] = [];
        for (let i = range.start; i < range.end; i++) {
            times.push(i / samplingRate);
        }
        console.log('Zoom2Chart - timePoints:', {
            range,
            samplingRate,
            timesLength: times.length,
            firstFewTimes: times.slice(0, 3),
            lastFewTimes: times.slice(-3)
        });
        return times;
    });

    const xScale = $derived(() => {
        const range = visibleDataRange();
        return d3.scaleLinear()
            .domain([range.startTime, range.endTime])
            .range([MARGIN.left, dimensions.width - MARGIN.right]);
    });

    const yScale = $derived(
        d3.scaleLinear()
            .domain([globalYMin, globalYMax])
            .range([dimensions.height - MARGIN.bottom, MARGIN.top])
    );

    const lineGenerator = $derived(() => {
        const scale = xScale();
        const times = timePoints();
        return d3.line<number>()
            .x((_, i) => scale(times[i] ?? 0))
            .y(d => yScale(d));
    });

    const pathData = $derived(() => {
        const data = visibleData();
        const result = data && data.length > 0 ? lineGenerator()(data) : '';
        console.log('Zoom2Chart - pathData:', {
            dataLength: data?.length,
            hasData: data && data.length > 0,
            pathDataLength: result.length,
            pathDataPreview: result.substring(0, 100) + (result.length > 100 ? '...' : '')
        });
        return result;
    });

    // Functions
    function updateDimensions(): void {
        if (!containerElement) return;

        const parentRect = containerElement.parentElement?.getBoundingClientRect();
        if (!parentRect) return;

        dimensions.width = Math.max(MIN_WIDTH, Math.min(parentRect.width - 40, MAX_WIDTH));
        dimensions.height = Math.max(MIN_HEIGHT, Math.min(parentRect.height - 40, MAX_HEIGHT));
    }

    // Lifecycle
    onMount(() => {
        updateDimensions();

        // Resize observer
        let resizeTimeout: ReturnType<typeof setTimeout>;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateDimensions, RESIZE_THROTTLE_MS);
        });
        resizeObserver.observe(containerElement);

        return () => {
            resizeObserver.disconnect();
            clearTimeout(resizeTimeout);
        };
    });

    // Axis rendering effect
    $effect(() => {
        if (!svgElement) return;

        const svg = d3.select(svgElement);

        // Create X axis with grid lines
        const xAxis = d3.axisBottom(xScale())
            .tickSize(-chartDimensions.innerHeight)
            .tickFormat(d => `${d3.format("~s")(d)}s`);

        // Create Y axis with grid lines
        const yAxis = d3.axisLeft(yScale)
            .tickSize(-chartDimensions.innerWidth)
            .tickFormat(d => `${Number(d).toFixed(1)}`);

        svg.select('.x-axis').call(xAxis as any);
        svg.select('.y-axis').call(yAxis as any);

        // Style grid lines
        svg.selectAll('.x-axis .tick line')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', 1)
            .attr('opacity', 0.7);

        svg.selectAll('.y-axis .tick line')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', 1)
            .attr('opacity', 0.7);

        // Hide the main axis lines (domain)
        svg.selectAll('.x-axis .domain, .y-axis .domain')
            .attr('stroke', '#666')
            .attr('stroke-width', 1);
    });
</script>

<div bind:this={containerElement} class="w-full h-full max-h-[600px] min-h-[300px] flex flex-col p-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
    <div class="flex-1 min-h-[250px] max-h-[500px] w-full relative overflow-hidden">
        <svg
            bind:this={svgElement}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            preserveAspectRatio="xMinYMin meet"
            class="w-full h-full block"
        >
            <!-- X Axis -->
            <g class="x-axis" transform={`translate(0,${dimensions.height - MARGIN.bottom})`} />

            <!-- Y Axis -->
            <g class="y-axis" transform={`translate(${MARGIN.left},0)`} />

            <!-- Raw data line -->
            {#if visibleData() && visibleData().length > 0}
                <path
                    d={pathData()}
                    fill="none"
                    stroke="#10b981"
                    stroke-width="1.5"
                    class="raw-data-line"
                />
            {/if}

            <!-- Axis labels -->
            <text x={dimensions.width / 2} y={dimensions.height - 5} text-anchor="middle" class="text-[14px] fill-current">
                Time (s)
            </text>
            <text x={-(dimensions.height / 2)} y={15} transform="rotate(-90)" text-anchor="middle" class="text-[14px] fill-current">
                Voltage (mV)
            </text>

            <!-- Data info overlay -->
            {#if visibleData() && visibleData().length > 0}
                <text x={dimensions.width - 10} y={25} text-anchor="end" class="text-[12px] fill-gray-600">
                    Samples: {visibleData().length.toLocaleString()}
                </text>
            {/if}
        </svg>
    </div>

    <!-- Debug Panel -->
    <div class="mt-2 p-2 bg-gray-100 rounded text-xs font-mono border">
        <div class="grid grid-cols-2 gap-2">
            <div>
                <strong>Input:</strong>
                <div>Raw Data: {rawData ? `${rawData.length} samples` : 'null'}</div>
                <div>Total Time: {totalTime}s</div>
                <div>Sampling Rate: {samplingRate}Hz</div>
            </div>
            <div>
                <strong>Rectangle:</strong>
                <div>Position: {rectanglePosition.toFixed(3)}</div>
                <div>Width: {rectangleWidth.toFixed(3)}</div>
            </div>
            <div>
                <strong>Visible Range:</strong>
                <div>Start: {visibleDataRange().startTime.toFixed(3)}s</div>
                <div>End: {visibleDataRange().endTime.toFixed(3)}s</div>
            </div>
            <div>
                <strong>Sample Range:</strong>
                <div>Start: {sampleRange().start}</div>
                <div>End: {sampleRange().end}</div>
            </div>
            <div>
                <strong>Data:</strong>
                <div>Visible: {visibleData().length} samples</div>
                <div>Time Points: {timePoints().length}</div>
            </div>
            <div>
                <strong>Path:</strong>
                <div>Length: {pathData().length} chars</div>
                <div>Has Data: {visibleData().length > 0 ? 'Yes' : 'No'}</div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Axis styling - D3 generated elements need CSS specificity */
    :global(.x-axis text),
    :global(.y-axis text) {
        font-size: clamp(11px, 2vw, 14px);
    }

    :global(.x-axis line),
    :global(.x-axis path),
    :global(.y-axis line),
    :global(.y-axis path) {
        stroke: #666;
        stroke-width: 1px;
    }

    .raw-data-line {
        stroke-linecap: round;
        stroke-linejoin: round;
    }
</style>