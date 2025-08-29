export async function calculateDatasetInfoFrom(rawStore: any, overviewStore: any, zarrGroup: any) {
  // Return a minimal datasetInfo object or throw with a descriptive message
  if (!rawStore?.shape) throw new Error('rawStore missing shape information');
  if (!zarrGroup) throw new Error('zarr group missing');

  const shape = rawStore.shape;
  const pointsInSegment = shape[3] || 0;

  // Read attributes defensively
  let attrs: any = {};
  try {
    attrs = (await zarrGroup.attrs.asObject()) || {};
  } catch (e) {
    attrs = {};
  }

  const horizInterval = attrs.horiz_interval || attrs.horizontal_interval || 1000;
  const timeBetweenPoints = horizInterval ? (horizInterval / 1000) : 0.001;
  const segmentLength = (pointsInSegment && timeBetweenPoints) ? (pointsInSegment * timeBetweenPoints) : 0;

  const rawDataElements = Array.isArray(shape) ? shape.reduce((a, b) => (a || 1) * (b || 1), 1) : 0;
  const overviewElements = (overviewStore?.shape && Array.isArray(overviewStore.shape))
    ? overviewStore.shape.reduce((a: number, b: number) => (a || 1) * (b || 1), 1) : 0;
  const totalElements = rawDataElements + overviewElements;
  const elementSizeBytes = 2;
  const totalDataSize = totalElements * elementSizeBytes;

  return {
    pointsInSegment: pointsInSegment || 0,
    timeBetweenPoints: timeBetweenPoints || 0,
    segmentLength: segmentLength || 0,
    totalDataSize: totalDataSize || 0,
  };
}
