# Tshwane Included-Area Classification

Date: 2026-07-28
Status: Working classification

## Purpose

Buffer Zones distinguishes between:

- all 591 City of Tshwane Census 2011 sub-places used for citywide comparison; and
- a current inclusion set of township and historically marginalised settlement areas highlighted with dissolved outlines.

Stats SA does not publish a `township` boundary type in this dataset. The inclusion set is therefore a project classification, not an official or exhaustive list of Tshwane townships.

## Selection rules

Each included area is defined in `packages/shared/src/constants/townships.ts` using one of two reproducible rules:

1. `census-main-place`: include sub-places whose Census code begins with one or more specified main-place codes.
2. `named-sub-places`: include only sub-places matching specified name prefixes where the Census main place is mixed and cannot safely be included wholesale.

Explicit exclusions remove known non-residential anomalies from otherwise useful Census groups. The current exclusions are Ekandustria from Ekangala and Tswaing Nature Reserve from Soshanguve.

## Current inclusion set

The current version includes 20 areas and 231 Census sub-places:

- Atteridgeville
- Eersterust
- Ekangala
- Ga-Rankuwa
- Laudium
- Lotus Gardens
- Mabopane
- Mamelodi
- Nellmapius
- New Eersterus
- Olievenhoutbosch
- Refilwe
- Rethabiseng
- Saulsville
- Soshanguve
- Stinkwater
- Suurman
- Temba
- Winterveld
- Zithobeni

Four regional anchors retain permanent overview labels: Atteridgeville, Mamelodi, Soshanguve, and Temba. Other areas use quieter secondary outlines and reveal their labels at detailed zoom levels, when the map has enough room. All areas remain available in the text browser.

## Limitations

Inclusion does not establish a legal apartheid-era classification, a date of proclamation, demographic composition, or uniform settlement history. Main-place membership is a practical spatial grouping, not historical proof. Some rural villages, informal settlements, later housing developments, and historically displaced communities remain outside the current set pending better historical and municipal evidence.

The classification should be extended only when an area has:

- a stable Census code or explicit sub-place selector;
- a documented reason for inclusion;
- a check for mixed land uses and non-residential anomalies; and
- a review of how its label and boundary behave at desktop and mobile scales.

Future archival work should add dated proclamation or forced-removal geographies as separate evidence layers rather than silently treating this working classification as historical fact.
