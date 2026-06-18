'use client';

import { Alert, Button, Center, Stack } from '@mantine/core';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errors = useTranslations('Errors');

  return (
    <Center mih="100dvh" p="md">
      <Stack maw={420} w="100%">
        <Alert color="red" title={errors('moneyCouldNotLoad')}>
          {error.message || errors('unexpected')}
        </Alert>
        <Button onClick={reset}>{errors('tryAgain')}</Button>
      </Stack>
    </Center>
  );
}
