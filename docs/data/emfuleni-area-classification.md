# Emfuleni Included-Area Classification

Date: 2026-07-30
Status: Working classification

## Purpose

Stratum distinguishes between:

- all 155 Emfuleni Census 2011 sub-places used for citywide comparison; and
- a current inclusion set of township and historically marginalised settlement areas highlighted with dissolved outlines.

Stats SA does not publish a `township` boundary type in this dataset. The inclusion set is therefore a project classification, not an official or exhaustive list of Emfuleni townships. It follows the same methodology as `docs/data/tshwane-area-classification.md` and `docs/data/johannesburg-area-classification.md`.

## Selection rules

Each included area is defined in `packages/app/src/constants/townships.ts` using one of two reproducible rules:

1. `census-main-place`: include sub-places whose Census code begins with one or more specified main-place codes.
2. `named-sub-places`: include only sub-places matching specified name prefixes where the Census main place is mixed and cannot safely be included wholesale.

Emfuleni's municipality code (`MN_CODE`) in the Stats SA Census 2011 sub-place shapefile is 760 (district: Sedibeng), confirmed by querying the live `SP_SA_2011` shapefile mirror directly.

## Current inclusion set

The current version includes 10 areas:

- Sebokeng
- Evaton
- Boipatong
- Sharpeville
- Bophelong
- Tshepiso
- Tshepong
- Stretford
- Lakeside
- Golden Gardens

Sebokeng, Evaton, Boipatong, and Sharpeville are the primary anchors because they are among the largest and most historically documented apartheid-era settlement areas in Emfuleni. Bophelong, Tshepiso, Tshepong, Stretford, Lakeside, and Golden Gardens are also included as distinct Census main places tied to the same southern Gauteng displacement geography.

Vereeniging and Vanderbijlpark are included in the metro-wide baseline layer as part of Emfuleni's full 155-sub-place boundary set, but they are not currently in the highlighted township-area inclusion set.

## Limitations

Inclusion does not establish a legal apartheid-era classification, a date of proclamation, demographic composition, or uniform settlement history. Main-place membership is a practical spatial grouping, not historical proof. Some rural smallholdings, mixed industrial parcels, informal settlements, and later housing developments remain outside the current highlighted set pending better historical and municipal evidence.

The classification should be extended only when an area has:

- a stable Census code or explicit sub-place selector;
- a documented reason for inclusion;
- a check for mixed land uses and non-residential anomalies; and
- a review of how its label and boundary behave at desktop and mobile scales.

Future archival work should add dated proclamation or forced-removal geographies as separate evidence layers rather than silently treating this working classification as historical fact.
