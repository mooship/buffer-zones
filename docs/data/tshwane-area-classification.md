# Tshwane Included-Area Classification

Date: 2026-07-28
Status: Working classification

## Purpose

Stratum distinguishes between:

- all 591 City of Tshwane Census 2011 sub-places used for citywide comparison; and
- a current inclusion set of township and historically marginalised settlement areas highlighted with dissolved outlines.

Stats SA does not publish a `township` boundary type in this dataset. The inclusion set is therefore a project classification, not an official or exhaustive list of Tshwane townships.

## Why Census 2011, not Census 2022

Census 2022 replaced the 2011 "sub-place" geography with a finer "Small Area Layer" (SAL). A public, scriptable boundary export for Tshwane's SAL geometry could not be found: Stats SA's own download pages return 404s or fail to serve scriptable content, and the only working public endpoints found are either restricted behind an ArcGIS token (`SMALL_AREA_2022...FeatureServer`) or aggregated to municipality level only (DPME's `Census2022` `MapServer`, one polygon per municipality, no sub-municipal geometry). Census 2011's sub-place shapefile remains the only source with a working, license-compatible, scriptable mirror (`SP_SA_2011` via the `j-norwood-young/SA-Maps` GitHub mirror), so this project continues to use it. This should be revisited if a public SAL boundary export becomes available.

## Selection rules

Each included area is defined in `packages/app/src/constants/townships.ts` using one of two reproducible rules:

1. `census-main-place`: include sub-places whose Census code begins with one or more specified main-place codes.
2. `named-sub-places`: include only sub-places matching specified name prefixes where the Census main place is mixed and cannot safely be included wholesale.

Explicit exclusions remove known non-residential anomalies from otherwise useful Census groups. The current exclusions are Ekandustria from Ekangala and Tswaing Nature Reserve from Soshanguve.

## Current inclusion set

The current version includes 34 areas:

- Atteridgeville
- Bosplaas Mathabe
- Dilopye
- Eersterust
- Ekangala
- Ga-Rankuwa
- Hebron
- Kekana Garden
- Kudube
- Laudium
- Lotus Gardens
- Mabopane
- Majaneng
- Makanyaneng
- Mamelodi
- Mandela Village
- Marokolong
- Mashemong
- Nellmapius
- New Eersterus
- Olievenhoutbosch
- Plastic View
- Ramotse
- Refilwe
- Rethabiseng
- Saulsville
- Soshanguve
- Soutpan
- Stinkwater
- Suurman
- Temba
- Tsebe
- Winterveld
- Zithobeni

Bosplaas Mathabe, Dilopye, Hebron, Kekana Garden, Majaneng, Makanyaneng, Mandela Village, Marokolong, Mashemong, Ramotse, Soutpan, and Tsebe were added after confirming each is a distinct Census main place in the same former-Bophuthatswana Moretele/Hammanskraal corridor as already-included areas such as Ga-Rankuwa, Mabopane, Stinkwater, Suurman, and Winterveld.

Four regional anchors retain permanent overview labels: Atteridgeville, Mamelodi, Soshanguve, and Temba. Other areas use quieter secondary outlines and reveal their labels at detailed zoom levels, when the map has enough room. All areas remain available in the text browser.

## Limitations

Inclusion does not establish a legal apartheid-era classification, a date of proclamation, demographic composition, or uniform settlement history. Main-place membership is a practical spatial grouping, not historical proof. Some rural villages, informal settlements, later housing developments, and historically displaced communities remain outside the current set pending better historical and municipal evidence.

For example, Itumeleng Informal Settlement does not appear as a distinct named sub-place anywhere in the Census 2011 `SP_SA_2011` shapefile used by this project (checked directly against all 591 City of Tshwane sub-place names) — Stats SA's 2011 sub-place geography does not delineate it separately, so it cannot be added to the inclusion set from this data source. It may be captured within a neighbouring sub-place's boundary, or it may have formed/grown after the 2011 enumeration. A finer or newer geography (such as a scriptable Census 2022 Small Area Layer boundary export, if one becomes publicly available) would be needed to represent it.

The classification should be extended only when an area has:

- a stable Census code or explicit sub-place selector;
- a documented reason for inclusion;
- a check for mixed land uses and non-residential anomalies; and
- a review of how its label and boundary behave at desktop and mobile scales.

Future archival work should add dated proclamation or forced-removal geographies as separate evidence layers rather than silently treating this working classification as historical fact.
