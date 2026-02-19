# Booking table consolidation

This project uses `public.bookings` as the canonical table for booking records.

## Why this exists

Generated database types and migrations previously referenced both `bookings` and `amenity_bookings`, while API paths were expected to query `bookings`.

To avoid policy drift and authorization mismatches:

- Keep all RLS policies on `public.bookings`.
- Keep `public.amenity_bookings` only as a compatibility view (`SELECT * FROM public.bookings`).
- Do not introduce writes through `amenity_bookings`.

## Migration

Apply `supabase/migrations/20260219090000_consolidate_booking_tables.sql`.
It performs the following:

1. Renames `amenity_bookings` table to `bookings` when needed.
2. Drops duplicate `amenity_bookings` table if both exist.
3. Recreates `amenity_bookings` as a view on `bookings`.
4. Enables and defines RLS policies on `bookings`.

## Follow-up

- Update generated DB types after migration.
- Ensure booking API routes and services query `public.bookings` directly.
