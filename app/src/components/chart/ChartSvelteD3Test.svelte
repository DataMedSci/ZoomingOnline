<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import type { OverviewDataPoint } from '../../services/chart/ChartDataService';

    // Props using Svelte 5 $props() with proper TypeScript typing
    const {
        data,
        totalTime,
        totalSamples,
        globalYMin,
        globalYMax,
        zoomLevel = null,
        timeBetweenPoints
    }: {
        data: OverviewDataPoint[];
        totalTime: number;
        totalSamples: number;
        globalYMin: number;
        globalYMax: number;
        zoomLevel?: number | null;
        timeBetweenPoints: number;
    } = $props();

    let svgElement: SVGSVGElement;
    let containerElement: HTMLDivElement;

    // Responsive dimensions
    let width = $state(800);
    let height = $state(400);
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    // Track rectangle center position to maintain it across zoom changes
    let rectangleCenterX = $state<number | null>(null);

    // Function to update dimensions based on container size
    function updateDimensions() {
        if (containerElement) {
            const rect = containerElement.getBoundingClientRect();
            const parentRect = containerElement.parentElement?.getBoundingClientRect();

            // Use parent container dimensions if available, otherwise use current element
            const availableWidth = parentRect ? parentRect.width - 40 : rect.width - 40;
            const availableHeight = parentRect ? parentRect.height - 40 : rect.height - 40;

            // Constrain dimensions to reasonable bounds
            width = Math.max(400, Math.min(availableWidth, 1200));
            height = Math.max(300, Math.min(availableHeight, 800));
        }
    }

    // Function to render the chart
    function renderChart() {
        if (!svgElement || !containerElement) return;

        // Clear any existing content
        d3.select(svgElement).selectAll('*').remove();

        // Use real data instead of dummy sine wave
        const chartData = data || [];

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, totalTime])
            .range([margin.left, width - margin.right]);

        const yScale = d3.scaleLinear()
            .domain([globalYMin, globalYMax])
            .range([height - margin.bottom, margin.top]);

        // Create SVG with viewBox for responsiveness
        const svg = d3.select(svgElement)
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('max-width', '100%')
            .style('max-height', '100%')
            .style('width', '100%')
            .style('height', '100%');

        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale));

        // Add Y axis
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));

        // Create area generator for min/max range
        const area = d3.area<OverviewDataPoint>()
            .x(d => xScale(d.time_s))
            .y0(d => yScale(d.min_mv))
            .y1(d => yScale(d.max_mv));

        // Add the area fill
        svg.append('path')
            .datum(chartData)
            .attr('fill', 'steelblue')
            .attr('fill-opacity', 0.3)
            .attr('d', area);

        // Create line generator for the mean/center line
        const line = d3.line<OverviewDataPoint>()
            .x(d => xScale(d.time_s))
            .y(d => yScale((d.min_mv + d.max_mv) / 2));

        // Add the center line
        svg.append('path')
            .datum(chartData)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2)
            .attr('d', line);

        // Add axis labels
        svg.append('text')
            .attr('transform', `translate(${width/2}, ${height - 5})`)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Time (s)');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -(height/2))
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Voltage (mV)');

        console.log('Zoom level:', zoomLevel);
        console.log('xScale:', xScale.domain());
        console.log('xScale range:', xScale.range());
        console.log('timeBetweenPoints:', timeBetweenPoints);
        const pxPerSecond = (xScale.range()[1] - xScale.range()[0]) / (xScale.domain()[1] - xScale.domain()[0]);
        console.log('Pixels per second:', pxPerSecond);
        const rectWidthPx = zoomLevel ? zoomLevel * pxPerSecond : 80;
        console.log('Calculated rectangle width (px):', rectWidthPx);
        const rectHeight = height - margin.top - margin.bottom; // Full height
        const rectY = margin.top; // Start from top margin

        // Use stored rectangle center position, or calculate initial center if not set
        if (rectangleCenterX === null) {
            const initialPositionSeconds = (xScale.domain()[1] + xScale.domain()[0]) / 2;
            rectangleCenterX = xScale(initialPositionSeconds);
            console.log('Setting initial rectangle center position (s):', initialPositionSeconds);
            console.log('Setting initial rectangle center position (px):', rectangleCenterX);
        } else {
            console.log('Using stored rectangle center position (px):', rectangleCenterX);
        }
        console.log('Current zoom level:', zoomLevel);

        const rectX = rectangleCenterX - rectWidthPx / 2;
        console.log('Rectangle position (px):', rectX);
        console.log('Rectangle width (px):', rectWidthPx);

        // Create horizontal-only drag behavior with position tracking
        const dragWithPositionTracking = d3.drag<SVGRectElement, unknown>()
            .on('start', function() {
                d3.select(this)
                    .attr('stroke', 'red')
                    .attr('stroke-width', 3);
            })
            .on('drag', function(event) {
                const currentX = +d3.select(this).attr("x");
                const newX = currentX + event.dx;
                d3.select(this).attr("x", newX);

                // Update the stored center position
                const currentWidth = +d3.select(this).attr("width");
                rectangleCenterX = newX + currentWidth / 2;
                console.log('Rectangle dragged, new center position (px):', rectangleCenterX);
            })
            .on('end', function() {
                d3.select(this)
                    .attr('stroke', 'orange')
                    .attr('stroke-width', 2);
                console.log('Rectangle drag ended, center position:', rectangleCenterX);
            });

        svg.append('rect')
            .attr('x', rectX)
            .attr('y', rectY)
            .attr('width', rectWidthPx)
            .attr('height', rectHeight)
            .attr('fill', 'rgba(255, 165, 0, 0.3)')
            .attr('stroke', 'orange')
            .attr('stroke-width', 2)
            .attr('rx', 5)
            .attr('cursor', 'ew-resize') // Horizontal resize cursor
            .call(dragWithPositionTracking);
    }

    onMount(() => {
        if (!containerElement) return;

        // Initial dimension update and render
        updateDimensions();
        renderChart();

        // Add resize observer for responsive behavior with throttling
        let resizeTimeout: number;
        const resizeObserver = new ResizeObserver(() => {
            // Throttle resize events to prevent excessive re-renders
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateDimensions();
                renderChart();
            }, 100); // 100ms throttle
        });

        resizeObserver.observe(containerElement);

        // Fallback for older browsers - window resize listener
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateDimensions();
                renderChart();
            }, 100);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        };
    });

    // Re-render when data or dimensions change
    $effect(() => {
        if (containerElement && data && data.length > 0) {
            renderChart();
        }
    });

    // Re-render when zoom level changes (but preserve rectangle position)
    $effect(() => {
        if (containerElement && data && data.length > 0 && zoomLevel !== null) {
            renderChart();
        }
    });

</script>

<div bind:this={containerElement} class="chart-container">
    <h4 class="text-md font-semibold mb-2">Svelte D3 Test Chart</h4>
    <div class="svg-wrapper">
        <svg bind:this={svgElement}></svg>
    </div>
</div>

<style>
    .chart-container {
        width: 100%;
        height: 100%;
        max-height: 600px; /* Constrain maximum height */
        min-height: 300px; /* Ensure minimum height */
        display: flex;
        flex-direction: column;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        box-sizing: border-box;
        overflow: hidden; /* Prevent content from overflowing */
    }

    .svg-wrapper {
        flex: 1;
        min-height: 250px;
        max-height: 500px; /* Constrain SVG wrapper height */
        width: 100%;
        position: relative;
        overflow: hidden; /* Ensure SVG doesn't overflow */
    }

    svg {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        display: block;
        overflow: hidden; /* Prevent SVG content from overflowing */
    }

    /* Ensure text elements scale properly */
    :global(.axis text) {
        font-size: clamp(10px, 2vw, 12px);
    }

    :global(.axis line),
    :global(.axis path) {
        stroke-width: 1px;
    }

    /* Prevent any child elements from causing overflow */
    :global(.chart-container *) {
        max-width: 100%;
        box-sizing: border-box;
    }
</style>