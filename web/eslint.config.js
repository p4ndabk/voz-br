import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// RN-WEB-ARQ-001: so src/nostr/ conversa com nostr-tools.
const semNostrTools = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['nostr-tools', 'nostr-tools/*'],
          message: 'Importe nostr-tools apenas dentro de src/nostr/.',
        },
      ],
    },
  ],
}

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, ...semNostrTools },
  },
  {
    files: ['src/nostr/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
)
