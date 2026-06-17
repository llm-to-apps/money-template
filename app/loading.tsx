import { Center, Stack, Text } from '@mantine/core';

export default function Loading() {
  return (
    <Center mih="100dvh">
      <Stack align="center" gap="sm">
        <Text fw={700}>Money</Text>
        <Text c="dimmed" size="sm">
          Opening Money...
        </Text>
      </Stack>
    </Center>
  );
}
