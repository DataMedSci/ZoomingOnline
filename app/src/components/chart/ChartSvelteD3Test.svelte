<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import * as d3 from 'd3';
    import type { OverviewDataPoint } from '../../services/chart/ChartDataService';

    // Props using Svelte 5 $props()
    interface ChartProps {
        data: OverviewDataPoint[];
        totalTime: number;
        globalYMin: number;
        globalYMax: number;
        zoomLevel?: number | null;
        timeBetweenPoints: number;
    }

    let {
        data,
        totalTime,
        globalYMin,
        globalYMax,
        zoomLevel = null,
        timeBetweenPoints
    }: ChartProps = $props();

    // DOM references
    let svgElement: SVGSVGElement;
    let containerElement: HTMLDivElement;

    // Reactive dimensions state
    let dimensions = $state({
        width: 800,
        height: 400
    });

    // Constants
    const MARGIN = { top: 20, right: 30, bottom: 40, left: 50 } as const;
    const MIN_WIDTH = 400;
    const MAX_WIDTH = 1200;
    const MIN_HEIGHT = 300;
    const MAX_HEIGHT = 800;
    const DEFAULT_RECT_WIDTH = 80;
    const RESIZE_THROTTLE_MS = 100;

    // Rectangle state
    let rectangleState = $state({
        centerX: null as number | null,
        isDragging: false
    });

    // Derived values
    const chartDimensions = $derived({
        innerWidth: dimensions.width - MARGIN.left - MARGIN.right,
        innerHeight: dimensions.height - MARGIN.top - MARGIN.bottom
    });

    const xScale = $derived(
        d3.scaleLinear()
            .domain([0, totalTime])
            .range([MARGIN.left, dimensions.width - MARGIN.right])
    );

    const yScale = $derived(
        d3.scaleLinear()
            .domain([globalYMin, globalYMax])
            .range([dimensions.height - MARGIN.bottom, MARGIN.top])
    );

    const pxPerSecond = $derived(chartDimensions.innerWidth / totalTime);

    const rectangleMetrics = $derived({
        width: zoomLevel ? zoomLevel * pxPerSecond : DEFAULT_RECT_WIDTH,
        height: chartDimensions.innerHeight,
        top: MARGIN.top,
        centerX: rectangleState.centerX ?? xScale(totalTime / 2),
        get left() {
            return this.centerX - this.width / 2;
        }
    });

    const chartPaths = $derived({
        area: d3.area<OverviewDataPoint>()
            .x(d => xScale(d.time_s))
            .y0(d => yScale(d.min_mv))
            .y1(d => yScale(d.max_mv)),

        line: d3.line<OverviewDataPoint>()
            .x(d => xScale(d.time_s))
            .y(d => yScale((d.min_mv + d.max_mv) / 2))
    });

    const pathData = $derived({
        area: data ? chartPaths.area(data) : '',
        line: data ? chartPaths.line(data) : ''
    });

    // Functions
    function updateDimensions(): void {
        if (!containerElement) return;

        const parentRect = containerElement.parentElement?.getBoundingClientRect();
        if (!parentRect) return;

        dimensions.width = Math.max(MIN_WIDTH, Math.min(parentRect.width - 40, MAX_WIDTH));
        dimensions.height = Math.max(MIN_HEIGHT, Math.min(parentRect.height - 40, MAX_HEIGHT));
    }

    function handleRectangleDragStart(): void {
        // console.log('Rectangle drag started');
        rectangleState.isDragging = true;
    }

    function handleRectangleDrag(event: d3.D3DragEvent<SVGRectElement, unknown, unknown>): void {
        const newCenterX = (rectangleState.centerX ?? rectangleMetrics.centerX) + event.dx;

        const minX = MARGIN.left + rectangleMetrics.width / 2;
        const maxX = dimensions.width - MARGIN.right - rectangleMetrics.width / 2;

        rectangleState.centerX = Math.max(minX, Math.min(newCenterX, maxX));
    }

    function handleRectangleDragEnd(): void {
        rectangleState.isDragging = false;
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

        // D3 drag setup
        const rect = d3.select(svgElement).select<SVGRectElement>('.draggable-rect');
        if (!rect.empty()) {
            const dragBehavior = d3.drag<SVGRectElement, unknown>()
                .on('start', handleRectangleDragStart)
                .on('drag', handleRectangleDrag)
                .on('end', handleRectangleDragEnd);
            rect.call(dragBehavior);
        }

        return () => {
            resizeObserver.disconnect();
            clearTimeout(resizeTimeout);
            rect.on('.drag', null);
        };
    });

    // Axis rendering effect
    $effect(() => {
        if (!svgElement) return;

        const svg = d3.select(svgElement);

        svg.select('.x-axis').call(d3.axisBottom(xScale) as any);
        svg.select('.y-axis').call(d3.axisLeft(yScale) as any);
    });
</script>

<div bind:this={containerElement} class="chart-container">
    <h4 class="chart-title">Svelte D3 Test Chart</h4>
    <div class="svg-wrapper">
        <svg
            bind:this={svgElement}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            preserveAspectRatio="xMinYMin meet"
        >
            <!-- X Axis -->
            <g class="x-axis" transform={`translate(0,${dimensions.height - MARGIN.bottom})`} />

            <!-- Y Axis -->
            <g class="y-axis" transform={`translate(${MARGIN.left},0)`} />

            <!-- Data visualization -->
            {#if data && data.length > 0}
                <path d={pathData.area} fill="steelblue" fill-opacity="0.3" />
                <path d={pathData.line} fill="none" stroke="steelblue" stroke-width="2" />
            {/if}

            <!-- Axis labels -->
            <text x={dimensions.width / 2} y={dimensions.height - 5} text-anchor="middle" font-size="12px">
                Time (s)
            </text>
            <text x={-(dimensions.height / 2)} y={15} transform="rotate(-90)" text-anchor="middle" font-size="12px">
                Voltage (mV)
            </text>

            <!-- Draggable rectangle -->
            {#if zoomLevel !== null}
                <rect
                    class="draggable-rect"
                    x={rectangleMetrics.left}
                    y={rectangleMetrics.top}
                    width={rectangleMetrics.width}
                    height={rectangleMetrics.height}
                    fill="rgba(255, 165, 0, 0.3)"
                    stroke={rectangleState.isDragging ? 'red' : 'orange'}
                    stroke-width={rectangleState.isDragging ? 3 : 2}
                    rx="5"
                    cursor="ew-resize"
                />
            {/if}
        </svg>
    </div>
</div>

<style>
    .chart-container {
        width: 100%;
        height: 100%;
        max-height: 600px;
        min-height: 300px;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        box-sizing: border-box;
        overflow: hidden;
    }

    .chart-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .svg-wrapper {
        flex: 1;
        min-height: 250px;
        max-height: 500px;
        width: 100%;
        position: relative;
        overflow: hidden;
    }

    svg {
        width: 100%;
        height: 100%;
        display: block;
    }

    /* Axis styling */
    :global(.x-axis text),
    :global(.y-axis text) {
        font-size: clamp(10px, 2vw, 12px);
    }

    :global(.x-axis line),
    :global(.x-axis path),
    :global(.y-axis line),
    :global(.y-axis path) {
        stroke: #666;
        stroke-width: 1px;
    }

    /* Rectangle transitions */
    .draggable-rect {
        transition: stroke 0.2s ease, stroke-width 0.2s ease;
    }
</style>
