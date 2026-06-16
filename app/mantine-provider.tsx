'use client';

import {
  ColorInput,
  createTheme,
  MantineProvider,
  NumberInput,
  Select,
  Switch,
  Table
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';

import { os7Theme } from '@os7/ui-kit/os7-theme';

const theme = createTheme({
  ...os7Theme,
  components: {
    ...os7Theme.components,
    ColorInput: ColorInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    DateInput: DateInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md',
        valueFormat: 'MMM D, YYYY'
      }
    }),
    NumberInput: NumberInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    Select: Select.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    Switch: Switch.extend({
      defaultProps: {
        color: 'os7'
      }
    }),
    Table: Table.extend({
      defaultProps: {
        fz: 'sm'
      }
    })
  }
});

export function MoneyMantineProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  );
}
