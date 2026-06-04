import { readFile } from 'node:fs/promises'

const REQUIRED_PACKAGE_FIELDS = [
  'name',
  'version',
  'description',
  'license',
  'author',
  'keywords',
  'publishConfig',
]

const REQUIRED_EXPORTS = [
  '.',
  './vanilla',
  './style.css',
  './package.json',
]

const REQUIRED_FILES = [
  'dist',
  'LICENSE',
  'README.md',
  'README.en.md',
]

const packageJson = JSON.parse(
  await readFile(new URL('../packages/sdk/package.json', import.meta.url), 'utf8'),
)

const errors = []

if (packageJson.private === true) {
  errors.push('packages/sdk/package.json must not be private before publishing.')
}

REQUIRED_PACKAGE_FIELDS.forEach((fieldName) => {
  if (!packageJson[fieldName]) {
    errors.push(`packages/sdk/package.json is missing ${fieldName}.`)
  }
})

REQUIRED_EXPORTS.forEach((exportPath) => {
  if (!packageJson.exports?.[exportPath]) {
    errors.push(`packages/sdk/package.json is missing export ${exportPath}.`)
  }
})

REQUIRED_FILES.forEach((filePath) => {
  if (!packageJson.files?.includes(filePath)) {
    errors.push(`packages/sdk/package.json files must include ${filePath}.`)
  }
})

if (packageJson.publishConfig?.access !== 'public') {
  errors.push('packages/sdk/package.json publishConfig.access must be public.')
}

if (!packageJson.peerDependenciesMeta?.react?.optional) {
  errors.push('react peer dependency must remain optional.')
}

if (!packageJson.peerDependenciesMeta?.['react-dom']?.optional) {
  errors.push('react-dom peer dependency must remain optional.')
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Release readiness checks passed.')
