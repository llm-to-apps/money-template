'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  ColorInput,
  createTheme,
  MantineProvider,
  Modal,
  NumberInput,
  Select,
  Switch,
  Table,
  Text,
  TextInput,
  ThemeIcon
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';

const theme = createTheme({
  colors: {
    os7: [
      '#f2f5fb',
      '#e4e9f4',
      '#cbd4e6',
      '#a4b2cf',
      '#7788af',
      '#566789',
      '#303b57',
      '#151d33',
      '#080d20',
      '#030717'
    ]
  },
  primaryColor: 'os7',
  primaryShade: 8,
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
    fontWeight: '700'
  },
  components: {
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        radius: 'md',
        size: 'lg'
      }
    }),
    Badge: Badge.extend({
      defaultProps: {
        radius: 'md',
        variant: 'light'
      }
    }),
    Button: Button.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    Card: Card.extend({
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        withBorder: true
      }
    }),
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
    Modal: Modal.extend({
      defaultProps: {
        centered: true,
        radius: 'lg'
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
    }),
    Text: Text.extend({
      defaultProps: {
        size: 'sm'
      }
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    ThemeIcon: ThemeIcon.extend({
      defaultProps: {
        color: 'os7',
        radius: 'md'
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
