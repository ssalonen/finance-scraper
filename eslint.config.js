'use strict'
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'
export default neostandard({
  ignores: resolveIgnoresFromGitignore(),
  env: [
    'mocha',
    'chai'
  ]
})
