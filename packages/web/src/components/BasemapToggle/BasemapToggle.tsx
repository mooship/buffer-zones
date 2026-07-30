import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";

interface BasemapToggleProps {
  basemap: Basemap;
  onChange: (basemap: Basemap) => void;
}

const BASEMAP_IDS = Object.keys(BASEMAPS) as Basemap[];

export function BasemapToggle({ basemap, onChange }: BasemapToggleProps) {
  return (
    <SegmentedControl
      label="Basemap"
      options={BASEMAP_IDS.map((id) => ({
        id,
        label: BASEMAPS[id].label,
        ariaLabel: `${BASEMAPS[id].label} basemap`,
      }))}
      value={basemap}
      onChange={onChange}
      testId="basemap"
    />
  );
}
