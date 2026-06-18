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
import { getTranslations } from 'next-intl/server';

import { Os7Logo } from '@os7/ui-kit/os7-brand';

import { isLocalAuthMode } from '@/server/env';

export default async function SignedOutPage() {
  const auth = await getTranslations('Auth');
  const isLocalAuth = isLocalAuthMode();

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" radius="md" p="xl" maw={420} w="100%">
        <Stack align="center" ta="center">
          <ThemeIcon size={48} radius="md">
            <Wallet size={22} />
          </ThemeIcon>
          <Title order={1} size="h3">
            {auth('signedOutTitle')}
          </Title>
          <Text c="dimmed">
            {isLocalAuth
              ? auth('localDescription')
              : auth('os7Description')}
          </Text>
          <Button
            component="a"
            href="/api/auth/login?interactive=1"
            aria-label={
              isLocalAuth ? auth('continueAsLocalAria') : auth('continueWithOs7')
            }
            color="dark"
            variant="default"
          >
            {isLocalAuth ? auth('continueAsLocal') : <Os7Logo w={62} />}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
