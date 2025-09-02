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
import uPlot from 'uplot';
import type { OverviewDataPoint } from '../services/chart/ChartDataService';

export interface ChartMargin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export async function initializePlotData(
    rawStore: any,
    zarrGroup: any,
    overviewStore: any,
    channel: number,
    trc: number,
    segment: number,
): Promise<PlotDataResult> {
    try {
        if (!rawStore) throw new Error("rawStore is required but was null/undefined");
        if (!zarrGroup) throw new Error("zarrGroup is required but was null/undefined");
        if (!overviewStore) throw new Error("overviewStore is required but was null/undefined");
        if (typeof channel !== "number" || typeof trc !== "number" || typeof segment !== "number") {
            throw new Error(`Invalid indices: channel=${channel}, trc=${trc}, segment=${segment}`);
        }

        const attrs = await zarrGroup.attrs.asObject();
        const horiz_interval = attrs.horiz_interval as number;
        const vertical_gains = attrs.vertical_gains as number[][][];
        const vertical_offsets = attrs.vertical_offsets as number[][][];
        const vertical_gain = (vertical_gains?.[channel]?.[trc] ?? 1.0) as number;
        const vertical_offset = (vertical_offsets?.[channel]?.[trc] ?? 0.0) as number;
        const no_of_samples = rawStore.shape[3] as number;
        const adcToMilliVolts = (adc: number): number => 1000 * (adc * vertical_gain - vertical_offset);
        const total_time_s = (no_of_samples - 1) * horiz_interval;

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

        const globalYMin = Math.min(...overviewData.map(d => d.min_mv));
        const globalYMax = Math.max(...overviewData.map(d => d.max_mv));

        return {
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
    } catch (error) {
        console.error("❌ Error in initializePlotData:", error);
        throw error;
    }
}

export interface UPlotOverviewConfig {
    container: HTMLDivElement;
    data: OverviewDataPoint[];
    totalTime: number;
    globalYMin: number;
    globalYMax: number;
}

export interface UPlotZoomedConfig {
    container: HTMLDivElement;
    data: OverviewDataPoint[];
    xMin: number;
    xMax: number;
    globalYMin: number;
    globalYMax: number;
}

function formatTimeAxis(self: uPlot, splits: number[], axisIdx: number, scaleIdx: number): string[] {
    const min = Math.min(...splits);
    const max = Math.max(...splits);
    const range = max - min;
    let unit = "s";
    let factor = 1;
    if (range < 1e-6) {
        unit = "ns";
        factor = 1e9;
    } else if (range < 1e-3) {
        unit = "µs";
        factor = 1e6;
    } else if (range < 1) {
        unit = "ms";
        factor = 1e3;
    }
    return splits.map((v: number) => `${((v-min) * factor).toFixed(1)}${unit}`);
}

export function createUPlotOverview(config: UPlotOverviewConfig): uPlot {
    const { container, data, totalTime, globalYMin, globalYMax } = config;
    const times = data.map(d => d.time_s);
    const minVals = data.map(d => d.min_mv);
    const maxVals = data.map(d => d.max_mv);
    const plotData: uPlot.AlignedData = [times, minVals, maxVals];
    const syncKey = "moo";
    const initXmin = times[Math.floor(times.length * 0.4)] ?? 0;
    const initXmax = times[Math.floor(times.length * 0.6)] ?? totalTime / 2;
    const opts: uPlot.Options = {
        width: 800,
        height: 300,
        cursor: {
            y: false,
            points: { show: false },
            drag: { setScale: false, x: true, y: false },
            sync: { key: syncKey },
        },
        legend: { show: true },
        scales: {
            x: { min: 0, max: totalTime, time: false },
            y: { min: globalYMin, max: globalYMax },
        },
        axes: [
            {
                label: "Time",
                values: formatTimeAxis
            },
            { label: "Voltage [mV]" }
        ],
        series: [
            {},
            { stroke: "blue" },
            { stroke: "red" }
        ],
        hooks: {
            ready: [uRanger => {
                let left = Math.round(uRanger.valToPos(initXmin, 'x'));
                let width = Math.round(uRanger.valToPos(initXmax, 'x')) - left;
                let height = uRanger.bbox.height / devicePixelRatio;
                uRanger.setSelect({left, top: 0, width, height}, false);
            }]
        }
    };
    return new uPlot(opts, plotData, container);
}

export function createUPlotZoomed(config: UPlotZoomedConfig): uPlot {
    const { container, data, xMin, xMax, globalYMin, globalYMax } = config;
    const times = data.map(d => d.time_s);
    const minVals = data.map(d => d.min_mv);
    const maxVals = data.map(d => d.max_mv);
    const plotData: uPlot.AlignedData = [times, minVals, maxVals];
    const syncKey = "moo";
    const opts: uPlot.Options = {
        width: 800,
        height: 300,
        cursor: {
            drag: { x: true, y: false },
            sync: { key: syncKey },
        },
        scales: {
            x: { min: xMin, max: xMax, time: false },
            y: { min: globalYMin, max: globalYMax },
        },
        axes: [
            {
                label: "Time",
                values: formatTimeAxis
            },
            { label: "Voltage [mV]" }
        ],
        series: [
            { label: "Time (s)" },
            { label: "Min", stroke: "blue" },
            { label: "Max", stroke: "red" }
        ]
    };
    return new uPlot(opts, plotData, container);
}
