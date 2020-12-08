module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
  },
  // engines: {
  //   node: '8',
  // },
  extends: ['eslint:recommended'],
  env: { node: true },
  rules: {
    'no-unused-vars': ['warn', { args: 'none' }],
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'always-multiline',
      },
    ],
    'func-call-spacing': ['error', 'never'],
    indent: ['error', 2],
    'max-len': [
      'warn',
      {
        code: 140,
        tabWidth: 2,
        ignoreComments: true,
        ignoreUrls: true,
        // ignoreStrings: true,
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    quotes: [2, 'single', { avoidEscape: true }],
    semi: ['error', 'never'],
    'space-in-parens': ['error', 'never'],
  },
}
