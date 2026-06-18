import { Center, Stack, Text } from '@mantine/core';
import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const app = await getTranslations('App');
  const loading = await getTranslations('Loading');

  return (
    <Center mih="100dvh">
      <Stack align="center" gap="sm">
        <Text fw={700}>{app('name')}</Text>
        <Text c="dimmed" size="sm">
          {loading('opening')}
        </Text>
      </Stack>
    </Center>
  );
}
