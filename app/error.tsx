'use client';

import { Alert, Button, Center, Stack } from '@mantine/core';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Center mih="100dvh" p="md">
      <Stack maw={420} w="100%">
        <Alert color="red" title="Money could not load">
          {error.message || 'Unexpected application error.'}
        </Alert>
        <Button onClick={reset}>Try again</Button>
      </Stack>
    </Center>
  );
}
