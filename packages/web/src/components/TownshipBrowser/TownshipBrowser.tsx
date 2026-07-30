import {
  TOWNSHIP_GROUPS,
  type TownshipFeature,
  getTownshipGroup,
} from "@buffer-zones/shared";
import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { formatCommuteTime } from "../../utils/formatCommuteTime";
import { TownshipPopup } from "../TownshipPopup/TownshipPopup";
import styles from "./TownshipBrowser.module.css";

interface GroupSummary {
  name: string;
  allFeatures: TownshipFeature[];
  shortestTime: number | undefined;
  longestTime: number | undefined;
  subPlaceLabel: string;
  searchName: string;
}

interface VisibleGroup extends GroupSummary {
  features: TownshipFeature[];
}

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
  const { groupSummaries, townshipSubPlaceCount, townshipById } =
    useMemo(() => {
      const grouped = new Map<string, TownshipFeature[]>();
      const byId = new Map<string, TownshipFeature>();
      let subPlaceCount = 0;

      for (const township of townships) {
        byId.set(township.properties.id, township);
        const group = getTownshipGroup(
          township.properties.name,
          township.properties.id,
        );
        if (!group) {
          continue;
        }
        subPlaceCount += 1;
        const current = grouped.get(group);
        if (current) {
          current.push(township);
        } else {
          grouped.set(group, [township]);
        }
      }

      const summaries = TOWNSHIP_GROUPS.flatMap((name) => {
        const features = grouped.get(name);
        if (!features || features.length === 0) {
          return [];
        }

        const allFeatures = [...features].sort((first, second) => {
          const timeDifference =
            (second.properties.commuteMinutes ?? -1) -
            (first.properties.commuteMinutes ?? -1);
          return (
            timeDifference ||
            first.properties.name.localeCompare(second.properties.name, "en-ZA")
          );
        });
        const times = allFeatures
          .map((township) => township.properties.commuteMinutes)
          .filter((time): time is number => time !== null)
          .sort((first, second) => first - second);
        const shortestTime = times[0];
        const longestTime = times.at(-1);

        return [
          {
            name,
            allFeatures,
            shortestTime,
            longestTime,
            subPlaceLabel: `${allFeatures.length} Census ${
              allFeatures.length === 1 ? "sub-place" : "sub-places"
            }`,
            searchName: name.toLocaleLowerCase("en-ZA"),
          },
        ];
      });

      return {
        groupSummaries: summaries,
        townshipSubPlaceCount: subPlaceCount,
        townshipById: byId,
      };
    }, [townships]);

  const groups = useMemo<VisibleGroup[]>(() => {
    return groupSummaries.flatMap((groupSummary) => {
      const groupMatches = groupSummary.searchName.includes(deferredQuery);
      const features = groupMatches
        ? groupSummary.allFeatures
        : groupSummary.allFeatures.filter((township) =>
            township.properties.name
              .toLocaleLowerCase("en-ZA")
              .includes(deferredQuery),
          );

      if (features.length === 0) {
        return [];
      }

      return [{ ...groupSummary, features }];
    });
  }, [deferredQuery, groupSummaries]);

  const resultCount = useMemo(() => {
    return groups.reduce((count, group) => count + group.features.length, 0);
  }, [groups]);

  const includedGroupCount = groupSummaries.length;

  const selectedTownship = useMemo(() => {
    if (!selectedTownshipId) {
      return undefined;
    }
    return townshipById.get(selectedTownshipId);
  }, [selectedTownshipId, townshipById]);

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
        Census 2011 sub-places in the selected regions.{" "}
        {townshipSubPlaceCount.toLocaleString("en-ZA")} sit within the{" "}
        {includedGroupCount} currently included township and settlement areas
        outlined here; the rest provide citywide comparison. This is a
        documented working classification, not an official Stats SA category.
      </p>
      <label className={styles.search}>
        <span className={styles.visuallyHidden}>Search townships</span>
        <Search aria-hidden="true" />
        <input
          type="search"
          data-testid="township-search"
          data-e2e="township-search"
          value={query}
          placeholder="Search townships"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {selectedTownship ? (
        <section
          className={styles.selection}
          aria-live="polite"
          data-testid="township-selection"
          data-e2e="township-selection"
        >
          <TownshipPopup properties={selectedTownship.properties} />
        </section>
      ) : null}

      <p
        className={styles.resultCount}
        aria-live="polite"
        data-testid="township-result-count"
        data-e2e="township-result-count"
      >
        {groups.length}{" "}
        {groups.length === 1 ? "included area" : "included areas"}
        {" · "}
        {resultCount} Census {resultCount === 1 ? "sub-place" : "sub-places"}
      </p>
      <ul className={styles.groupList}>
        {groups.map((group) => {
          const isExpanded =
            deferredQuery.length > 0 || expandedGroup === group.name;
          const timeRange =
            group.shortestTime === undefined || group.longestTime === undefined
              ? "No modeled time"
              : group.shortestTime === group.longestTime
                ? formatCommuteTime(group.shortestTime)
                : `${formatCommuteTime(group.shortestTime)}–${formatCommuteTime(group.longestTime)}`;
          return (
            <li key={group.name} className={styles.group}>
              <button
                type="button"
                className={styles.groupButton}
                data-testid={`township-group-${group.name.toLocaleLowerCase("en-ZA").replaceAll(" ", "-")}`}
                data-e2e={`township-group-${group.name.toLocaleLowerCase("en-ZA").replaceAll(" ", "-")}`}
                aria-expanded={isExpanded}
                aria-controls={`township-group-${group.name.replaceAll(" ", "-")}`}
                aria-label={`Browse ${group.name}, ${group.subPlaceLabel}`}
                onClick={() =>
                  setExpandedGroup((current) =>
                    current === group.name ? null : group.name,
                  )
                }
              >
                <span className={styles.groupName}>{group.name}</span>
                <span className={styles.groupTime}>{timeRange}</span>
                <span className={styles.groupMeta}>{group.subPlaceLabel}</span>
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
                          data-testid={`township-place-${properties.id}`}
                          data-e2e={`township-place-${properties.id}`}
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
