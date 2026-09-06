import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    // The simulation must stay pure: no DOM, no browser globals, no UI imports.
    // This rule is the automated guard on the sim/ <-> ui/ boundary.
    files: ['src/sim/**/*.ts', 'src/content/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/ui/**', 'react', 'react-dom'], message: 'sim/ and content/ must not depend on the UI layer.' },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'sim/ must be pure - no browser globals.' },
        { name: 'document', message: 'sim/ must be pure - no browser globals.' },
        { name: 'localStorage', message: 'Use the SaveAdapter interface instead.' },
      ],
    },
  },
)
