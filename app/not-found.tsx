import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <Center mih="100dvh" p="md">
      <Stack align="center" gap="sm">
        <Title order={1}>{t('title')}</Title>
        <Text c="dimmed">{t('description')}</Text>
        <Button component="a" href="/">
          {t('goHome')}
        </Button>
      </Stack>
    </Center>
  );
}
