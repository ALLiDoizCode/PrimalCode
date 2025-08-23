module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'indent': 'off',
    'linebreak-style': 'off', 
    'quotes': 'off',
    'semi': 'off',
    'no-unused-vars': 'warn',
    'no-console': 'off'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    '*.test.js',
    'tests/',
    'ao-processes/*/src/*.lua',
    '**/*.tl'
  ]
};