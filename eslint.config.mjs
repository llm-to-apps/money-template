import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  {
    ignores: ['.next/**', '.next-e2e/**', 'coverage/**', 'node_modules/**']
  }
];

export default eslintConfig;
