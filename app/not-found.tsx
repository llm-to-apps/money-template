import { Button, Center, Stack, Text, Title } from '@mantine/core';

export default function NotFound() {
  return (
    <Center mih="100dvh" p="md">
      <Stack align="center" gap="sm">
        <Title order={1}>Not found</Title>
        <Text c="dimmed">This Money page does not exist.</Text>
        <Button component="a" href="/">
          Go home
        </Button>
      </Stack>
    </Center>
  );
}
