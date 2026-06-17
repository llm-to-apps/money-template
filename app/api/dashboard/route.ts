import { dashboardPayload } from '@/server/route-helpers';
import { jsonOk } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const result = await dashboardPayload();

  if (!result.ok) {
    return result.response;
  }

  return jsonOk(result.payload);
}
