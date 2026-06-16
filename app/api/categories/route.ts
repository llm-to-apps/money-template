import { NextRequest } from 'next/server';

import { createMoneyCategory } from '@/features/categories/service';
import { jsonMutationWithSnapshot } from '@/server/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  let categoryId = '';

  return jsonMutationWithSnapshot({
    action: 'category.created',
    metadata: () => ({ categoryId }),
    mutate: async () => {
      const { category } = await createMoneyCategory(body);
      categoryId = category.id;
    },
    request,
    validationFallback: 'Invalid category'
  });
}
