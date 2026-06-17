import { jsonOk } from '@/shared/result';

export function GET() {
  return jsonOk({
    service: 'money-template'
  });
}
