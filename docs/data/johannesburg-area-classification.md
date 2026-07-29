# Johannesburg Included-Area Classification

Date: 2026-07-29
Status: Working classification

## Purpose

Buffer Zones distinguishes between:

- all 807 City of Johannesburg Census 2011 sub-places used for citywide comparison; and
- a current inclusion set of township and historically marginalised settlement areas highlighted with dissolved outlines.

Stats SA does not publish a `township` boundary type in this dataset. The inclusion set is therefore a project classification, not an official or exhaustive list of Johannesburg townships. It follows the same methodology as `docs/data/tshwane-area-classification.md`.

## Selection rules

Each included area is defined in `packages/shared/src/constants/townships.ts` using one of two reproducible rules:

1. `census-main-place`: include sub-places whose Census code begins with one or more specified main-place codes.
2. `named-sub-places`: include only sub-places matching specified name prefixes where the Census main place is mixed and cannot safely be included wholesale.

City of Johannesburg's municipality code (`MN_CODE`) in the Stats SA Census 2011 sub-place shapefile is 798 (`MN_MDB_C` "JHB"), confirmed by querying the live `SP_SA_2011` shapefile mirror directly.

## Current inclusion set

The current version includes 28 areas:

- Alexandra
- Bosmont
- Cosmo City
- Coronationville
- Diepsloot
- Drie Ziek
- Ebony Park
- Ennerdale
- Kaalfontein
- Kanana Park
- Kya Sand
- Lakeside
- Lawley
- Lehae
- Lenasia
- Lenasia South
- Mayibuye
- Newclare
- Orange Farm
- Poortjie
- Rabie Ridge
- Riverlea
- Soweto
- Stretford
- Vlakfontein
- Westbury
- Zandspruit

Four regional anchors retain permanent overview labels: Alexandra, Soweto, Diepsloot, and Orange Farm — Johannesburg's largest and most historically significant township areas, analogous to Atteridgeville/Mamelodi/Soshanguve/Temba in Tshwane. Other areas use quieter secondary outlines. All areas remain available in the text browser.

Ivory Park, Kaalfontein, Ebony Park, Rabie Ridge, and Mayibuye form a contiguous corridor of townships and informal settlements straddling the Midrand/Tembisa border, each with its own distinct Census main-place code. Lenasia, Lenasia South, Lehae, Vlakfontein, Ennerdale, Drie Ziek, Stretford, Lakeside, Lawley, Kanana Park, and Poortjie form a second contiguous corridor south of Soweto, historically the area designated for Indian and Coloured residents under apartheid (Lenasia) alongside later informal settlements and relocations (Orange Farm and its surrounding extensions). Cosmo City, Zandspruit, and Kya Sand are named sub-places within the mixed Roodepoort main place. Newclare, Bosmont, Riverlea, Westbury, and Coronationville are historic Coloured townships whose sub-places are split across the mixed Randburg and Johannesburg main places — the same `named-sub-places` pattern used for Tshwane's Lotus Gardens.

## Limitations

Inclusion does not establish a legal apartheid-era classification, a date of proclamation, demographic composition, or uniform settlement history. Main-place membership is a practical spatial grouping, not historical proof. Some rural villages, informal settlements, later housing developments, and historically displaced communities remain outside the current set pending better historical and municipal evidence.

Zevenfontein (a single sub-place named "Zevenfontein Pipeline" in the Census 2011 data) was checked and excluded: the sub-place's own name suggests a pipeline right-of-way parcel rather than a clearly residential area, and no corroborating evidence was found to include it with confidence. Affluent or non-township main places bordering the included corridors (e.g. Sandton, Dainfern, Chartwell, Bloubosrand, Riverbend, Inadan) were checked and deliberately excluded.

The classification should be extended only when an area has:

- a stable Census code or explicit sub-place selector;
- a documented reason for inclusion;
- a check for mixed land uses and non-residential anomalies; and
- a review of how its label and boundary behave at desktop and mobile scales.

Future archival work should add dated proclamation or forced-removal geographies as separate evidence layers rather than silently treating this working classification as historical fact.
