import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: '@storybook/nextjs-vite',
  // Nothing leaves the machine: no usage telemetry, no release-notes pings.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};

export default config;
