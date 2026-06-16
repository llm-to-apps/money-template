'use client';

import { Alert, Button, Group, Modal } from '@mantine/core';
import { AlertCircle } from 'lucide-react';

export function ActionErrorModal({
  error,
  onDismiss
}: {
  error: string | null;
  onDismiss: () => void;
}) {
  return (
    <Modal
      opened={Boolean(error)}
      onClose={onDismiss}
      title="Action failed"
      centered
    >
      <Alert color="red" icon={<AlertCircle size={18} />}>
        {error}
      </Alert>
      <Group mt="md" justify="flex-end">
        <Button onClick={onDismiss}>OK</Button>
      </Group>
    </Modal>
  );
}
