# Midvaal Included-Area Classification

Date: 2026-07-31
Status: Working classification

## Purpose

Karta distinguishes between:

- all Midvaal Census 2011 sub-places used for municipality-wide comparison; and
- a current inclusion set of township and historically marginalised settlement areas highlighted with dissolved outlines.

Stats SA does not publish a `township` boundary type in this dataset. The inclusion set is therefore a project classification, not an official or exhaustive list of Midvaal townships.

## Selection rules

Each included area is defined in `packages/app/src/constants/townships.ts` using one of two reproducible rules:

1. `census-main-place`: include sub-places whose Census code begins with one or more specified main-place codes.
2. `named-sub-places`: include only sub-places matching specified name prefixes where the Census main place is mixed and cannot safely be included wholesale.

Midvaal's municipality code (`MN_CODE`) in the Stats SA Census 2011 sub-place shapefile is 761 (`MN_MDB_C` GT422).

## Current inclusion set

The current version includes 2 areas:

- Mamello
- Evaton (Midvaal segment)

## Limitations

Inclusion does not establish a legal apartheid-era classification, a date of proclamation, demographic composition, or uniform settlement history. Main-place membership is a practical spatial grouping, not historical proof.

Future historical work should add dated proclamation or forced-removal geographies as separate evidence layers rather than silently treating this working classification as historical fact.
