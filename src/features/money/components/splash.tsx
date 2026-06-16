'use client';

import { Center, Loader, Stack, Transition } from '@mantine/core';

import { Os7Logo } from '@os7/ui-kit/os7-brand';

export function Splash() {
  return (
    <Transition duration={220} mounted transition="fade">
      {(styles) => (
        <Center h="100vh" style={styles}>
          <Stack align="center" gap="lg">
            <Os7Logo w={112} />
            <Loader size="xs" type="dots" />
          </Stack>
        </Center>
      )}
    </Transition>
  );
}
