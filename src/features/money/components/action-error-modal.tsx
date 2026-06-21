'use client';

import { Alert, Button, Group, Modal } from '@mantine/core';
import { ModalTitle } from '@os7/ui-kit/modal-title';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ActionErrorModal({
  error,
  onDismiss
}: {
  error: string | null;
  onDismiss: () => void;
}) {
  const common = useTranslations('Common');
  const errors = useTranslations('Errors');

  return (
    <Modal
      opened={Boolean(error)}
      onClose={onDismiss}
      title={
        <ModalTitle icon={<AlertCircle size={16} />}>
          {errors('actionFailed')}
        </ModalTitle>
      }
      centered
    >
      <Alert color="red" icon={<AlertCircle size={18} />}>
        {error}
      </Alert>
      <Group mt="md" justify="flex-end">
        <Button onClick={onDismiss}>{common('ok')}</Button>
      </Group>
    </Modal>
  );
}
