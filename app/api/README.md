# API Proxy Routes (Deprecated)

**Note**: These Next.js API routes are **deprecated** and no longer needed for separated deployment.

## Status

The frontend now makes **direct API calls** to the backend using `NEXT_PUBLIC_BACKEND_URL`. These proxy routes were used when the frontend and backend were in the same repository, but are no longer necessary.

## Migration

All API calls have been updated in `frontend/lib/api.ts` to call the backend directly. The proxy routes in this directory can be safely removed.

## Files in this Directory

- `templates/route.ts` - Proxied `/api/templates` (now direct call)
- `templates/analyze/route.ts` - Proxied `/api/templates/analyze` (now direct call)
- `csv/analyze/route.ts` - Proxied `/api/csv/analyze` (now direct call)
- `analytics/route.ts` - Proxied `/api/analytics` (now direct call)
- `analytics/export/route.ts` - Proxied `/api/analytics/export` (now direct call)
- `feedback/send/route.ts` - Proxied feedback sending (now direct call)
- `feedback/preview/route.ts` - Proxied feedback preview (now direct call)

## Removal

These files can be deleted after confirming all functionality works with direct backend calls. They are kept temporarily for backward compatibility during migration.

