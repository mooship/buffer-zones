import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchAReYengRoutes,
  normalizeAReYeng,
  normalizeAReYengOverpass,
} from "./adapters/aReYeng";
import {
  fetchTshwaneBoundaries,
  normalizeBoundaries,
} from "./adapters/boundaries";
import {
  fetchGautrainRail,
  normalizeGautrainOverpass,
} from "./adapters/gautrain";
import { fetchUnemploymentData } from "./adapters/unemployment";
import { JOB_CENTERS } from "./constants/jobCenters";
import { writeGeoJsonFile } from "./export";
import { joinTownshipData } from "./join";
import { getNearestJobCenter } from "./osrmClient";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../packages/web/public/data");

async function main() {
  console.log("Fetching Tshwane sub-place boundaries...");
  const rawBoundaries = await fetchTshwaneBoundaries();
  const townships = normalizeBoundaries(rawBoundaries);
  console.log(`  ${townships.length} sub-places loaded`);

  console.log(
    `Computing drive times to nearest of ${JOB_CENTERS.length} job centers (${JOB_CENTERS.map((c) => c.name).join(", ")}) via public OSRM...`,
  );
  const nearestJobCenters = await getNearestJobCenter(
    townships.map((t) => t.centroid),
    JOB_CENTERS,
  );

  console.log("Fetching unemployment data (best-effort)...");
  const unemployment = await fetchUnemploymentData();
  if (!unemployment) {
    console.log(
      "  No usable unemployment source found — layer will ship empty.",
    );
  }

  const townshipFeatures = joinTownshipData(
    townships,
    nearestJobCenters,
    unemployment,
  );
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "townships.v1.geojson"), {
    type: "FeatureCollection",
    features: townshipFeatures,
  });

  console.log("Fetching Gautrain rail via Overpass...");
  const gautrain = normalizeGautrainOverpass(await fetchGautrainRail());
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "gautrain.v1.geojson"), gautrain);

  console.log("Fetching A Re Yeng routes...");
  const rawAReYeng = await fetchAReYengRoutes();
  const aReYeng =
    "elements" in rawAReYeng
      ? normalizeAReYengOverpass(rawAReYeng)
      : normalizeAReYeng(rawAReYeng);
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "a-re-yeng.v1.geojson"), aReYeng);

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
