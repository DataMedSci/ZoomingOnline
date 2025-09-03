<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import type { OverviewDataPoint } from '../../services/chart/ChartDataService';
    import ChartRectangle from './ChartRectangle.svelte';

    // Props using Svelte 5 $props()
    interface Zoom1ChartProps {
        data: OverviewDataPoint[];
        totalTime: number;
        globalYMin: number;
        globalYMax: number;
        zoomLevel: number | null;
        rectanglePosition: number; // Position from overview chart rectangle (0-1 normalized)
        rectangleWidth: number; // Width from overview chart rectangle (0-1 normalized)
        onRectangleChange?: (position: number) => void;
    }

    let {
        data,
        totalTime,
        globalYMin,
        globalYMax,
        zoomLevel,
        rectanglePosition,
        rectangleWidth,
        onRectangleChange
    }: Zoom1ChartProps = $props();

    // DOM references
    let svgElement: SVGSVGElement;
    let containerElement: HTMLDivElement;

    // Reactive dimensions state
    let dimensions = $state({
        width: 800,
        height: 400
    });

    // Rectangle state for this chart's own rectangle
    let localRectanglePosition = $state(0.5); // Center position (0-1 normalized)

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

    // Calculate the subset of data to show based on rectangle position from overview
    const visibleDataRange = $derived(() => {
        const startTime = rectanglePosition * totalTime - (rectangleWidth * totalTime) / 2;
        const endTime = rectanglePosition * totalTime + (rectangleWidth * totalTime) / 2;
        return {
            startTime: Math.max(0, startTime),
            endTime: Math.min(totalTime, endTime)
        };
    });

    const filteredData = $derived(() => {
        if (!data) return [];
        const range = visibleDataRange();
        return data.filter(point =>
            point.time_s >= range.startTime &&
            point.time_s <= range.endTime
        );
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

    const pxPerSecond = $derived(() => {
        const range = visibleDataRange();
        return chartDimensions.innerWidth / (range.endTime - range.startTime);
    });

    // Rectangle metrics for this chart's rectangle
    const localRectangleMetrics = $derived(() => {
        const rectWidth = zoomLevel ? zoomLevel * pxPerSecond() : 80;
        const rectHeight = chartDimensions.innerHeight;
        const centerX = MARGIN.left + (localRectanglePosition * chartDimensions.innerWidth);

        return {
            width: rectWidth,
            height: rectHeight,
            centerX,
            top: MARGIN.top,
            left: centerX - rectWidth / 2
        };
    });

    const chartPaths = $derived(() => {
        const scale = xScale();
        return {
            area: d3.area<OverviewDataPoint>()
                .x(d => scale(d.time_s))
                .y0(d => yScale(d.min_mv))
                .y1(d => yScale(d.max_mv)),

            line: d3.line<OverviewDataPoint>()
                .x(d => scale(d.time_s))
                .y(d => yScale((d.min_mv + d.max_mv) / 2))
        };
    });

    const pathData = $derived(() => {
        const paths = chartPaths();
        const data = filteredData();
        return {
            area: data && data.length > 0 ? paths.area(data) : '',
            line: data && data.length > 0 ? paths.line(data) : ''
        };
    });

    // Functions
    function updateDimensions(): void {
        if (!containerElement) return;

        const parentRect = containerElement.parentElement?.getBoundingClientRect();
        if (!parentRect) return;

        dimensions.width = Math.max(MIN_WIDTH, Math.min(parentRect.width - 40, MAX_WIDTH));
        dimensions.height = Math.max(MIN_HEIGHT, Math.min(parentRect.height - 40, MAX_HEIGHT));
    }

    function handleLocalRectangleDrag(deltaX: number): void {
        const metrics = localRectangleMetrics();
        const newCenterX = metrics.centerX + deltaX;
        const newPosition = (newCenterX - MARGIN.left) / chartDimensions.innerWidth;
        localRectanglePosition = Math.max(0, Math.min(1, newPosition));
        onRectangleChange?.(localRectanglePosition);
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

            <!-- Data visualization -->
            {#if filteredData() && filteredData().length > 0}
                <path d={pathData().area} class="fill-blue-500 opacity-30" />
                <path d={pathData().line} class="fill-none stroke-blue-500 stroke-2" />
            {/if}

            <!-- Axis labels -->
            <text x={dimensions.width / 2} y={dimensions.height - 5} text-anchor="middle" class="text-[14px] fill-current">
                Time (s)
            </text>
            <text x={-(dimensions.height / 2)} y={15} transform="rotate(-90)" text-anchor="middle" class="text-[14px] fill-current">
                Voltage (mV)
            </text>

            <!-- Local zoom rectangle -->
            <ChartRectangle
                width={localRectangleMetrics().width}
                height={localRectangleMetrics().height}
                centerX={localRectangleMetrics().centerX}
                top={localRectangleMetrics().top}
                isEnabled={zoomLevel !== null}
                dragConstraints={{
                    minX: MARGIN.left,
                    maxX: dimensions.width - MARGIN.right
                }}
                onDrag={(deltaX) => handleLocalRectangleDrag(deltaX)}
            />
        </svg>
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
</style>