import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceSchemaPath = join(rootDir, 'prisma/schema.prisma');
const generatedSchemaPath = join(rootDir, 'prisma/schema.generated.prisma');

export function resolveDatabaseProvider() {
  const explicitProvider = process.env.DATABASE_PROVIDER;

  if (explicitProvider) {
    return normalizeProvider(explicitProvider);
  }

  const databaseUrl = process.env.DATABASE_URL ?? '';

  if (databaseUrl.startsWith('file:')) {
    return 'sqlite';
  }

  if (
    databaseUrl.startsWith('mysql://') ||
    databaseUrl.startsWith('mysql2://')
  ) {
    return 'mysql';
  }

  return 'mysql';
}

export function writePrismaSchema() {
  const provider = resolveDatabaseProvider();
  const sourceSchema = readFileSync(sourceSchemaPath, 'utf8');
  const generatedSchema = sourceSchema.replace(
    /provider\s*=\s*"(mysql|sqlite)"/,
    `provider = "${provider}"`
  );

  mkdirSync(dirname(generatedSchemaPath), { recursive: true });
  writeFileSync(generatedSchemaPath, generatedSchema);

  return {
    path: generatedSchemaPath,
    provider
  };
}

function normalizeProvider(provider) {
  if (provider === 'mysql' || provider === 'sqlite') {
    return provider;
  }

  throw new Error('DATABASE_PROVIDER must be mysql or sqlite');
}
