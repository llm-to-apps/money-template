import {
  Button,
  Center,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core';
import { Wallet } from 'lucide-react';

import { Os7Logo } from '@os7/ui-kit/os7-brand';

import { isLocalAuthMode } from '@/server/env';

export default function SignedOutPage() {
  const isLocalAuth = isLocalAuthMode();

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" radius="md" p="xl" maw={420} w="100%">
        <Stack align="center" ta="center">
          <ThemeIcon size={48} radius="md">
            <Wallet size={22} />
          </ThemeIcon>
          <Title order={1} size="h3">
            You are signed out of Money
          </Title>
          <Text c="dimmed">
            {isLocalAuth
              ? 'Continue with the local development user to return to Money.'
              : 'Continue with your OS7 account to return to Money.'}
          </Text>
          <Button
            component="a"
            href="/api/auth/login?interactive=1"
            aria-label={isLocalAuth ? 'Continue as local' : 'Continue with OS7'}
            color="dark"
            variant="default"
          >
            {isLocalAuth ? 'Continue as Local' : <Os7Logo w={62} />}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
