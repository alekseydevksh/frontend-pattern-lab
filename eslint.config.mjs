import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'coverage/**',
      'playwright-report/**',
      'storybook-static/**',
      'reference/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  // Full jsx-a11y recommended rule set (eslint-config-next only enables a subset).
  { files: ['**/*.{jsx,tsx}'], rules: jsxA11y.flatConfigs.recommended.rules },
];

export default eslintConfig;
