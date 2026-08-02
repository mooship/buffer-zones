import {
  type Basemap,
  getBasemapDefinition,
  getRegisteredBasemapIds,
} from "../../constants/basemaps";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";

interface BasemapToggleProps {
  basemap: Basemap;
  onChange: (basemap: Basemap) => void;
}

/** A `SegmentedControl` for choosing the active map basemap. */
export function BasemapToggle({ basemap, onChange }: BasemapToggleProps) {
  return (
    <SegmentedControl
      label="Basemap"
      options={getRegisteredBasemapIds().map((id) => {
        const { label } = getBasemapDefinition(id);
        return { id, label, ariaLabel: `${label} basemap` };
      })}
      value={basemap}
      onChange={onChange}
      testId="basemap"
    />
  );
}
