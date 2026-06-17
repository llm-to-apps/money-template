import { jsonOk } from '@/server/http';

export function GET() {
  return jsonOk({
    service: 'money-template'
  });
}
