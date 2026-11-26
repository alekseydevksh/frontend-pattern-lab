import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { fontVariables } from '../src/lib/fonts';
import '../src/styles/globals.css';

// The app puts the font variables on <html> (see src/app/layout.tsx); do the same here.
const withFonts: Decorator = (Story) => {
  document.documentElement.classList.add(...fontVariables.split(' '));
  return <Story />;
};

const preview: Preview = {
  decorators: [
    withFonts,
    // The toolbar switch: sets data-theme on <html>, exactly as the site's toggle does.
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
  parameters: {
    layout: 'padded',
    // The page background comes from the tokens, so the canvas background switcher is off.
    backgrounds: { disabled: true },
    controls: { matchers: { date: /Date$/ } },
  },
  tags: ['autodocs'],
};

export default preview;
