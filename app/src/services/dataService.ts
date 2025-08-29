/**
 * dataService.ts
 *
 * Service for loading and retrieving Zarr-formatted data from a URL.
 */

import { openGroup, openArray, slice, HTTPStore } from "zarr";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Open a Zarr group and primary arrays from a HTTP URL and return
 * the loaded handles. This is a pure function and does not touch
 * any global app state - callers should store results in their
 * local component state (Svelte runes) as required.
 */
export async function openZarr(url: string): Promise<{
  zarrGroup: any;
  rawStore: any;
  overviewStore: any | null;
  url: string;
}> {
  // Create HTTP store for remote access
  const store = new HTTPStore(url);

  // Open the Zarr group and arrays with timeout
  const group = await Promise.race([
    openGroup(store),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout opening group")), 10000),
    ),
  ]);

  const raw = await Promise.race([
    openArray({ store, path: "raw" }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout opening raw array")), 10000),
    ),
  ]);

  let overview: any;
  try {
    overview = await Promise.race([
      openArray({ store, path: "overview/0" }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout opening overview array")),
          10000,
        ),
      ),
    ]);
  } catch {
    overview = null;
  }

    // ← Artificial delay
  await sleep(2000); // 3 seconds

  return { zarrGroup: group, rawStore: raw, overviewStore: overview, url };
}

/**
 * Get a slice of raw data with efficient chunk caching
 */
export async function getRawDataSlice(
  rawStoreObj: any,
  ch: number,
  trc: number,
  seg: number,
  start: number,
  end: number,
): Promise<Int16Array> {
  const chunkSize = rawStoreObj.meta.chunks[3] as number;
  const startChunkIdx = Math.floor(start / chunkSize);
  const endChunkIdx = Math.floor((end - 1) / chunkSize);

  // Create buffer for the final data
  const finalData = new Int16Array(end - start);
  let finalDataOffset = 0;

  // Fetch data chunk by chunk (simplified without cache for now)
  for (let i = startChunkIdx; i <= endChunkIdx; i++) {
    // Fetch from remote store
    const chunkStart = i * chunkSize;
    const chunkEnd = Math.min((i + 1) * chunkSize, rawStoreObj.shape[3]);
    const fetchedSlice = await rawStoreObj.get([
      ch,
      trc,
      seg,
      slice(chunkStart, chunkEnd),
    ]);
    const chunkData = fetchedSlice.data as Int16Array;

    // Calculate the portion of this chunk needed for our result
    const reqStartInChunk = Math.max(0, start - i * chunkSize);
    const reqEndInChunk = Math.min(chunkSize, end - i * chunkSize);

    // Copy the relevant portion to our result buffer
    const sliced = chunkData.subarray(reqStartInChunk, reqEndInChunk);
    finalData.set(sliced, finalDataOffset);
    finalDataOffset += sliced.length;
  }

  return finalData;
}
