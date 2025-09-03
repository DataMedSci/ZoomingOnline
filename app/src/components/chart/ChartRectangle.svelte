<script lang="ts">
    import * as d3 from 'd3';

    // Props using Svelte 5 $props()
    interface RectangleProps {
        width: number;
        height: number;
        centerX: number;
        top: number;
        isEnabled: boolean;
        onDragStart?: () => void;
        onDrag?: (deltaX: number) => void;
        onDragEnd?: () => void;
        dragConstraints?: {
            minX: number;
            maxX: number;
        };
    }

    let {
        width,
        height,
        centerX,
        top,
        isEnabled = true,
        onDragStart,
        onDrag,
        onDragEnd,
        dragConstraints
    }: RectangleProps = $props();

    // DOM reference
    let rectElement = $state<SVGRectElement | null>(null);

    // State
    let isDragging = $state(false);

    // Computed values
    const left = $derived(centerX - width / 2);

    // Drag handlers
    function handleDragStart(): void {
        isDragging = true;
        onDragStart?.();
    }

    function handleDrag(event: d3.D3DragEvent<SVGRectElement, unknown, unknown>): void {
        if (!isEnabled) return;

        let newCenterX = centerX + event.dx;

        // Apply constraints if provided
        if (dragConstraints) {
            const minCenterX = dragConstraints.minX + width / 2;
            const maxCenterX = dragConstraints.maxX - width / 2;
            newCenterX = Math.max(minCenterX, Math.min(newCenterX, maxCenterX));
        }

        onDrag?.(newCenterX - centerX);
    }

    function handleDragEnd(): void {
        isDragging = false;
        onDragEnd?.();
    }

    // Setup drag behavior
    $effect(() => {
        if (!rectElement || !isEnabled) return;

        const dragBehavior = d3.drag<SVGRectElement, unknown>()
            .on('start', handleDragStart)
            .on('drag', handleDrag)
            .on('end', handleDragEnd);

        d3.select(rectElement).call(dragBehavior);

        // Cleanup function
        return () => {
            d3.select(rectElement).on('.drag', null);
        };
    });
</script>

{#if isEnabled}
    <rect
        bind:this={rectElement}
        x={left}
        y={top}
        width={width}
        height={height}
        fill="rgba(255, 165, 0, 0.3)"
        stroke={isDragging ? 'red' : 'orange'}
        stroke-width={isDragging ? 3 : 2}
        rx="5"
        cursor="ew-resize"
        class="chart-rectangle"
    />
{/if}

<style>
    .chart-rectangle {
        transition: stroke 0.2s ease, stroke-width 0.2s ease;
    }

    .chart-rectangle:hover {
        stroke: #ff8c00;
        stroke-width: 2.5;
    }
</style>