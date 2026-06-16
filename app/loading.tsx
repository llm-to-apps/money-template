import { Center, Loader } from '@mantine/core';

export default function Loading() {
  return (
    <Center mih="100dvh">
      <Loader aria-label="Loading Money" />
    </Center>
  );
}
