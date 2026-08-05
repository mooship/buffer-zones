import * as turf from "@turf/turf";
import type { BBox, FeatureCollection } from "geojson";

/**
 * Merges multiple bounding boxes into the smallest box containing all of them.
 * @param boxes - Bounding boxes as `[minLng, minLat, maxLng, maxLat]`.
 * @throws If `boxes` is empty.
 */
export function unionBoundingBoxes(boxes: readonly BBox[]): BBox {
  if (boxes.length === 0) {
    throw new Error("At least one bounding box is required");
  }

  const minLng = Math.min(...boxes.map((box) => box[0]));
  const minLat = Math.min(...boxes.map((box) => box[1]));
  const maxLng = Math.max(...boxes.map((box) => box[2]));
  const maxLat = Math.max(...boxes.map((box) => box[3]));

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Computes the bounding box spanning every feature in `collection`.
 * @param collection - The collection to measure.
 * @returns `[minLng, minLat, maxLng, maxLat]`.
 */
export function featureCollectionBounds(collection: FeatureCollection): BBox {
  return turf.bbox(collection);
}
