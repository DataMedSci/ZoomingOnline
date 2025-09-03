/**
 * chartRenderer.ts
 *
 * Chart rendering utility adapted for Svelte store-based state management.
 * Handles D3.js visualization of time series data with multi-level zoom functionality.
 */

import * as d3 from "d3";
import { formatTime } from "../lib/mathUtils";

// Type definitions
export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlotDataResult {
  horiz_interval: number;
  no_of_samples: number;
  total_time_s: number;
  adcToMv: (adc: number) => number;
  channel: number;
  trc: number;
  segment: number;
  overviewData: OverviewDataPoint[];
  globalYMin: number | undefined;
  globalYMax: number | undefined;
}

export interface OverviewDataPoint {
  time_s: number;
  min_mv: number;
  max_mv: number;
}

/**
 * Initialize plot configuration and process overview data
 */
export async function initializePlotData(
  rawStore: any,
  zarrGroup: any,
  overviewStore: any,
  channel: number,
  trc: number,
  segment: number,
): Promise<PlotDataResult> {
  try {
    // Validate inputs
    if (!rawStore) {
      throw new Error("rawStore is required but was null/undefined");
    }
    if (!zarrGroup) {
      throw new Error("zarrGroup is required but was null/undefined");
    }
    if (!overviewStore) {
      throw new Error("overviewStore is required but was null/undefined");
    }
    if (
      typeof channel !== "number" ||
      typeof trc !== "number" ||
      typeof segment !== "number"
    ) {
      throw new Error(
        `Invalid indices: channel=${channel}, trc=${trc}, segment=${segment}`,
      );
    }

    // Extract metadata from Zarr attributes
    console.log("📝 Extracting Zarr attributes...");
    const attrs = await zarrGroup.attrs.asObject();
    console.log("📊 Available attributes:", Object.keys(attrs));

    const horiz_interval = attrs.horiz_interval as number;
    const vertical_gains = attrs.vertical_gains as number[][][];
    const vertical_offsets = attrs.vertical_offsets as number[][][];

    // Defensive checks for vertical_gains and vertical_offsets
    if (!vertical_gains) {
      console.warn(
        "⚠️ vertical_gains not found in attributes, using default value 1.0",
      );
    }
    if (!vertical_offsets) {
      console.warn(
        "⚠️ vertical_offsets not found in attributes, using default value 0.0",
      );
    }

    // Safely extract gains and offsets with fallback values
    const vertical_gain = (vertical_gains?.[channel]?.[trc] ?? 1.0) as number;
    const vertical_offset = (vertical_offsets?.[channel]?.[trc] ??
      0.0) as number;

    console.log(
      `📏 Using vertical_gain: ${vertical_gain}, vertical_offset: ${vertical_offset} for channel ${channel}, trc ${trc}`,
    );

    const no_of_samples = rawStore.shape[3] as number;

    // Function to convert ADC values to millivolts
    const adcToMilliVolts = (adc: number): number =>
      1000 * (adc * vertical_gain - vertical_offset);
    const total_time_s = (no_of_samples - 1) * horiz_interval;

    // Load overview (downsampled) data
    const overviewSlice = await overviewStore.get([
      channel,
      trc,
      segment,
      null,
      null,
    ]);
    const overviewMin = (await overviewSlice.get(0)).data as number[];
    const overviewMax = (await overviewSlice.get(1)).data as number[];
    const downsampling_factor = no_of_samples / overviewMin.length;

    // Process overview data for plotting
    const overviewData: OverviewDataPoint[] = Array.from(overviewMin).map(
      (min_val, i) => {
        const time_s = (i + 0.5) * downsampling_factor * horiz_interval;
        const maxVal = overviewMax[i];
        if (typeof maxVal === "undefined") {
          throw new Error(`Missing overview max value at index ${i}`);
        }
        return {
          time_s,
          min_mv: adcToMilliVolts(min_val),
          max_mv: adcToMilliVolts(maxVal),
        };
      },
    );

    // Calculate global Y-axis limits
    const globalYMin = d3.min(overviewData, (d) => d.min_mv);
    const globalYMax = d3.max(overviewData, (d) => d.max_mv);

    const result: PlotDataResult = {
      horiz_interval,
      no_of_samples,
      total_time_s,
      adcToMv: adcToMilliVolts,
      channel,
      trc,
      segment,
      overviewData,
      globalYMin,
      globalYMax,
    };

    console.log("✅ initializePlotData completed successfully");
    return result;
  } catch (error) {
    console.error("❌ Error in initializePlotData:");
    console.error("  - Error:", error);
    console.error("  - Error stack:", (error as Error).stack);
    throw error;
  }
}

/**
 * Create SVG container for a chart with y-axis label
 */
export function createChartSVG(
  containerElement: HTMLElement,
  margin: ChartMargin,
  width: number,
  height: number,
  fullWidth: number,
  chartHeight: number,
): d3.Selection<SVGGElement, unknown, null, undefined> {
  // Validate parameters
  if (
    isNaN(width) ||
    isNaN(height) ||
    isNaN(fullWidth) ||
    isNaN(chartHeight) ||
    !isFinite(width) ||
    !isFinite(height) ||
    !isFinite(fullWidth) ||
    !isFinite(chartHeight)
  ) {
    console.error("❌ Invalid dimensions passed to createChartSVG");
    console.error(
      "  - width:",
      width,
      "height:",
      height,
      "fullWidth:",
      fullWidth,
      "chartHeight:",
      chartHeight,
    );
    throw new Error("Invalid dimensions passed to createChartSVG");
  }

  // Clear existing content
  d3.select(containerElement).selectAll("*").remove();

  const svg = d3
    .select(containerElement)
    .append("svg")
    .attr("viewBox", `0 0 ${fullWidth} ${chartHeight}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add y-axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 15)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Voltage [mV]");

  return svg;
}

/**
 * Draw x and y axes on the chart
 */
export function drawAxes(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xLabel: string,
  height: number,
  margin: ChartMargin,
  width: number,
): void {
  // Create x-axis with better formatted time values
  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat((d) => {
          const timeInSeconds = Number(d);
          return formatTime(timeInSeconds);
        }),
    );

  svg.append("g").call(d3.axisLeft(yScale).ticks(5));

  svg
    .append("text")
    .attr(
      "transform",
      `translate(${width / 2}, ${height + margin.bottom - 10})`,
    )
    .style("text-anchor", "middle")
    .text(xLabel);
}

/**
 * Draw grid lines on the chart
 */
export function drawGridLines(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  width: number,
  height: number,
): void {
  // Add horizontal grid lines
  svg
    .append("g")
    .attr("class", "grid-lines")
    .selectAll("line.horizontal-grid")
    .data(yScale.ticks(5))
    .enter()
    .append("line")
    .attr("class", "horizontal-grid")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", (d) => yScale(d))
    .attr("y2", (d) => yScale(d))
    .attr("stroke", "black")
    .attr("stroke-width", 0.5)
    .attr("opacity", 0.2);

  // Add vertical grid lines
  svg
    .append("g")
    .attr("class", "grid-lines")
    .selectAll("line.vertical-grid")
    .data(xScale.ticks(5))
    .enter()
    .append("line")
    .attr("class", "vertical-grid")
    .attr("x1", (d) => xScale(d))
    .attr("x2", (d) => xScale(d))
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "black")
    .attr("stroke-width", 0.5)
    .attr("opacity", 0.2);
}

/**
 * Draw a filled area chart (used for min-max overview)
 */
export function drawArea<T>(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: T[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xAcc: (d: T) => number,
  y0Acc: (d: T) => number,
  y1Acc: (d: T) => number,
): void {
  svg
    .append("path")
    .datum(data)
    .attr("fill", "#000")
    .attr(
      "d",
      d3
        .area<T>()
        .x((d) => xScale(xAcc(d)))
        .y0((d) => yScale(y0Acc(d)))
        .y1((d) => yScale(y1Acc(d))),
    );
}

/**
 * Draw a line chart
 */
export function drawLine<T>(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: T[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xAcc: (d: T) => number,
  yAcc: (d: T) => number,
): void {
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line<T>()
        .x((d) => xScale(xAcc(d)))
        .y((d) => yScale(yAcc(d))),
    );
}

/**
 * Draw a centered zoom rectangle on the overview chart
 * This rectangle represents the currently selected zoom region and is always centered
 */
export function drawZoomRectangle(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  height: number,
  zoomWidth: number,
  totalTime: number,
): d3.Selection<SVGRectElement, unknown, null, undefined> {
  console.log("🟦 drawZoomRectangle called with parameters:");
  console.log("  - height:", height);
  console.log("  - zoomWidth:", zoomWidth);
  console.log("  - totalTime:", totalTime);
  console.log("  - xScale domain:", xScale.domain());
  console.log("  - xScale range:", xScale.range());

  // Calculate rectangle bounds in time units - always centered at 0.5
  const centerTime = totalTime * 0.5; // Always center the rectangle
  const halfWidth = (zoomWidth * totalTime) / 2;

  console.log("📐 Rectangle bounds calculation:", {
    centerTime: centerTime,
    halfWidth,
    zoomWidth,
  });

  const startTime = centerTime - halfWidth;
  const endTime = centerTime + halfWidth;

  console.log("⏰ Time boundaries:");
  console.log("  - startTime:", startTime);
  console.log("  - endTime:", endTime);
  console.log("  - duration:", endTime - startTime);

  // Convert to pixel coordinates
  const x = xScale(startTime);
  const width = xScale(endTime) - x;

  console.log("📏 Pixel coordinates:");
  console.log("  - x (left edge):", x);
  console.log("  - width:", width);
  console.log("  - right edge:", x + width);

  // Remove any existing zoom rectangle
  const existingRects = svg.selectAll(".zoom-rect").size();
  if (existingRects > 0) {
    console.log("🧹 Removing existing rectangles:", existingRects, "rects");
  }
  svg.selectAll(".zoom-rect").remove();

  // Create the visible rectangle
  const actualWidth = Math.max(width, 3); // Minimum width of 3 pixels for visibility
  console.log("🎨 Creating visible rectangle with width:", actualWidth, "(minimum applied:", actualWidth !== width, ")");

  const rect = svg
    .append("rect")
    .attr("class", "zoom-rect")
    .attr("x", x)
    .attr("y", 0)
    .attr("width", actualWidth)
    .attr("height", height);

  console.log("✅ drawZoomRectangle completed successfully (centered, no drag behavior)");
  return rect;
}


