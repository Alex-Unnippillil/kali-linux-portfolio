import { NextResponse, type NextRequest } from 'next/server';

/**
 * Placeholder Supabase middleware bridge.
 *
 * The project does not currently refresh Supabase auth sessions in middleware,
 * but this helper is kept so imports from `@/utils/supabase/middleware` always
 * resolve safely across snapshots.
 */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}
