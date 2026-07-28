import {
  TOWNSHIP_GROUPS,
  type TownshipFeature,
  getTownshipGroup,
} from "@buffer-zones/shared";
import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { formatCommuteTime } from "../../utils/formatCommuteTime";
import { TownshipPopup } from "../TownshipPopup/TownshipPopup";
import styles from "./TownshipBrowser.module.css";

interface TownshipBrowserProps {
  townships: TownshipFeature[];
  selectedTownshipId: string | null;
  onSelect: (township: TownshipFeature) => void;
}

export function TownshipBrowser({
  townships,
  selectedTownshipId,
  onSelect,
}: TownshipBrowserProps) {
  const [query, setQuery] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(
    query.trim().toLocaleLowerCase("en-ZA"),
  );
  const groups = TOWNSHIP_GROUPS.flatMap((name) => {
    const allFeatures = townships.filter(
      (township) =>
        getTownshipGroup(township.properties.name, township.properties.id) ===
        name,
    );
    const groupMatches = name
      .toLocaleLowerCase("en-ZA")
      .includes(deferredQuery);
    const features = (
      groupMatches
        ? allFeatures
        : allFeatures.filter((township) =>
            township.properties.name
              .toLocaleLowerCase("en-ZA")
              .includes(deferredQuery),
          )
    ).sort((first, second) => {
      const timeDifference =
        (second.properties.commuteMinutes ?? -1) -
        (first.properties.commuteMinutes ?? -1);
      return (
        timeDifference ||
        first.properties.name.localeCompare(second.properties.name, "en-ZA")
      );
    });
    return features.length > 0 ? [{ name, features, allFeatures }] : [];
  });
  const resultCount = groups.reduce(
    (count, group) => count + group.features.length,
    0,
  );
  const townshipSubPlaceCount = townships.filter(
    (township) =>
      getTownshipGroup(township.properties.name, township.properties.id) !==
      undefined,
  ).length;
  const selectedTownship = townships.find(
    (township) => township.properties.id === selectedTownshipId,
  );

  useEffect(() => {
    if (!selectedTownship) {
      return;
    }
    const group = getTownshipGroup(
      selectedTownship.properties.name,
      selectedTownship.properties.id,
    );
    if (group) {
      setExpandedGroup(group);
    }
  }, [selectedTownship]);

  return (
    <div className={styles.browser}>
      <p className={styles.intro}>
        The choropleth compares all {townships.length.toLocaleString("en-ZA")}{" "}
        Tshwane Census 2011 sub-places.{" "}
        {townshipSubPlaceCount.toLocaleString("en-ZA")} sit within the{" "}
        {TOWNSHIP_GROUPS.length} township areas outlined and listed here; the
        rest provide citywide comparison.
      </p>
      <label className={styles.search}>
        <span className={styles.visuallyHidden}>Search townships</span>
        <Search aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="Search townships"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {selectedTownship ? (
        <section className={styles.selection} aria-live="polite">
          <TownshipPopup properties={selectedTownship.properties} />
        </section>
      ) : null}

      <p className={styles.resultCount} aria-live="polite">
        {groups.length}{" "}
        {groups.length === 1 ? "township area" : "township areas"}
        {" · "}
        {resultCount} Census {resultCount === 1 ? "sub-place" : "sub-places"}
      </p>
      <ul className={styles.groupList}>
        {groups.map((group) => {
          const isExpanded =
            deferredQuery.length > 0 || expandedGroup === group.name;
          const times = group.allFeatures
            .map((township) => township.properties.commuteMinutes)
            .filter((time): time is number => time !== null)
            .sort((first, second) => first - second);
          const shortestTime = times[0];
          const longestTime = times.at(-1);
          const subPlaceLabel = `${group.allFeatures.length} Census ${
            group.allFeatures.length === 1 ? "sub-place" : "sub-places"
          }`;
          const timeRange =
            shortestTime === undefined || longestTime === undefined
              ? "No modeled time"
              : shortestTime === longestTime
                ? formatCommuteTime(shortestTime)
                : `${formatCommuteTime(shortestTime)}–${formatCommuteTime(longestTime)}`;
          return (
            <li key={group.name} className={styles.group}>
              <button
                type="button"
                className={styles.groupButton}
                aria-expanded={isExpanded}
                aria-controls={`township-group-${group.name.replaceAll(" ", "-")}`}
                aria-label={`Browse ${group.name}, ${subPlaceLabel}`}
                onClick={() =>
                  setExpandedGroup((current) =>
                    current === group.name ? null : group.name,
                  )
                }
              >
                <span className={styles.groupName}>{group.name}</span>
                <span className={styles.groupTime}>{timeRange}</span>
                <span className={styles.groupMeta}>{subPlaceLabel}</span>
              </button>
              {isExpanded ? (
                <ul
                  id={`township-group-${group.name.replaceAll(" ", "-")}`}
                  className={styles.placeList}
                >
                  {group.features.map((township) => {
                    const properties = township.properties;
                    const commuteTime = formatCommuteTime(
                      properties.commuteMinutes,
                    );
                    return (
                      <li key={properties.id}>
                        <button
                          type="button"
                          className={styles.place}
                          aria-label={`${properties.name}, modeled car time ${commuteTime}, nearest selected centre ${properties.nearestJobCenter}`}
                          aria-pressed={properties.id === selectedTownshipId}
                          onClick={() => onSelect(township)}
                        >
                          <span className={styles.placeName}>
                            {properties.name}
                          </span>
                          <span className={styles.placeTime}>
                            {commuteTime}
                          </span>
                          <span className={styles.placeCentre}>
                            Nearest selected centre:{" "}
                            {properties.nearestJobCenter}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {resultCount === 0 ? (
        <p className={styles.empty}>No township areas or sub-places match.</p>
      ) : null}
    </div>
  );
}
