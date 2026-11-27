import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const kitPattern = {
  group: ['**/sceneKit', '**/sceneKit.tsx'],
  message: 'The shared scene module is for scenes only (D20).',
};
const testHelpersPattern = {
  group: ['**/sceneTest', '**/sceneTest.tsx'],
  message: 'The scene test helpers are for tests only (D20).',
};

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
  // Who may import the shared scene module and the scene test helpers, and what a scene may not
  // import (D20). src/components/scenes/boundaries.test.ts checks the same rules over the whole
  // tree and on broken trees; this gives the answer in the editor.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/components/scenes/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [kitPattern, testHelpersPattern] }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    ignores: ['src/components/scenes/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [kitPattern] }] },
  },
  {
    files: ['src/components/scenes/**/*Scene.tsx', 'src/components/scenes/sceneKit.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/*Scene', '**/*Scene.tsx'],
              message: 'A scene imports no other scene, so a lesson page never carries two.',
            },
            {
              group: ['@content/*', '**/content/lessons/*'],
              message: 'A scene is not tied to a lesson: the lesson imports the scene.',
            },
            testHelpersPattern,
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
