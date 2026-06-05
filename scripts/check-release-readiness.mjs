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
  './global',
  './testing',
  './server',
  './style.css',
  './package.json',
]

const REQUIRED_FILES = [
  'dist',
  'LICENSE',
  'CHANGELOG.md',
  'README.md',
  'README.en.md',
]

const REQUIRED_CHANGELOG_TERMS = [
  'lee-chat-sdk/testing',
  'lee-chat-sdk/server',
  'script-tag',
  'consumer smoke',
  'experimental',
  'message.created',
  'operator-console',
]

const REQUIRED_OPERATOR_CONSOLE_DOCS = [
  {
    path: '../docs/operator-console.md',
    terms: [
      '운영자 콘솔 API는 experimental primitive입니다',
      'production-ready 콘솔',
      'production mutation API는 제공하지 않습니다',
    ],
  },
  {
    path: '../docs/operator-console.en.md',
    terms: [
      'Operator console APIs are experimental primitives',
      'not a production-ready console',
      'does not provide production mutation APIs',
    ],
  },
  {
    path: '../packages/sdk/README.md',
    terms: [
      '운영자 콘솔 API는 experimental primitive입니다',
      'production-ready 콘솔이 아니며',
    ],
  },
  {
    path: '../packages/sdk/README.en.md',
    terms: [
      'Operator console APIs are experimental primitives',
      'not a production-ready console',
    ],
  },
]
const REQUIRED_DOC_FILES = [
  '../docs/integration.md',
  '../docs/integration.en.md',
  '../docs/configuration.md',
  '../docs/configuration.en.md',
  '../docs/api.md',
  '../docs/api.en.md',
  '../docs/operator-console.md',
  '../docs/operator-console.en.md',
  '../docs/backend-contract.ko.md',
  '../docs/backend-contract.md',
  '../docs/release.ko.md',
  '../docs/release.md',
]
const REQUIRED_BACKEND_CONTRACT_TERMS = [
  '## Attachment Upload Endpoint',
  'POST /api/chat/attachments',
  '## Production Next.js Route With Auth, Rate Limit, And Tenant Context',
  'assertRateLimit',
  'tenantId',
  '## Realtime Publish From Storage Writes',
  'message.created',
  'createLeeChatEventStream',
]

const packageJson = JSON.parse(
  await readFile(new URL('../packages/sdk/package.json', import.meta.url), 'utf8'),
)
const changelog = await readFile(
  new URL('../CHANGELOG.md', import.meta.url),
  'utf8',
).catch(() => '')
const packageChangelog = await readFile(
  new URL('../packages/sdk/CHANGELOG.md', import.meta.url),
  'utf8',
).catch(() => '')
const backendContract = await readFile(
  new URL('../docs/backend-contract.md', import.meta.url),
  'utf8',
).catch(() => '')
const requiredDocs = await Promise.all(
  REQUIRED_DOC_FILES.map(async (filePath) => ({
    path: filePath,
    content: await readFile(new URL(filePath, import.meta.url), 'utf8').catch(
      () => '',
    ),
  })),
)
const operatorConsoleDocs = await Promise.all(
  REQUIRED_OPERATOR_CONSOLE_DOCS.map(async (document) => ({
    ...document,
    content: await readFile(new URL(document.path, import.meta.url), 'utf8').catch(
      () => '',
    ),
  })),
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

if (!packageJson.scripts?.build?.includes('create-cdn-manifest.mjs')) {
  errors.push('packages/sdk build script must generate the CDN manifest.')
}

if (!packageJson.peerDependenciesMeta?.react?.optional) {
  errors.push('react peer dependency must remain optional.')
}

if (!packageJson.peerDependenciesMeta?.['react-dom']?.optional) {
  errors.push('react-dom peer dependency must remain optional.')
}

if (!backendContract) {
  errors.push('docs/backend-contract.md is required before publishing.')
} else {
  REQUIRED_BACKEND_CONTRACT_TERMS.forEach((term) => {
    if (!backendContract.includes(term)) {
      errors.push(`docs/backend-contract.md must mention ${term}.`)
    }
  })
}

requiredDocs.forEach((document) => {
  if (!document.content) {
    errors.push(`${document.path} is required before publishing.`)
  }
})

operatorConsoleDocs.forEach((document) => {
  if (!document.content) {
    errors.push(`${document.path} is required before publishing.`)
    return
  }

  document.terms.forEach((term) => {
    if (!document.content.includes(term)) {
      errors.push(`${document.path} must document operator console as ${term}.`)
    }
  })
})

if (!changelog) {
  errors.push('CHANGELOG.md is required before publishing.')
} else if (!changelog.includes(`## ${packageJson.version}`)) {
  errors.push(
    `CHANGELOG.md must include a section for packages/sdk version ${packageJson.version}.`,
  )
} else {
  const changelogSection = readChangelogSection(changelog, packageJson.version)

  REQUIRED_CHANGELOG_TERMS.forEach((term) => {
    if (!changelogSection.includes(term)) {
      errors.push(
        `CHANGELOG.md section ${packageJson.version} must mention ${term}.`,
      )
    }
  })
}

if (!packageChangelog) {
  errors.push('packages/sdk/CHANGELOG.md is required before publishing.')
} else if (!packageChangelog.includes(`## ${packageJson.version}`)) {
  errors.push(
    `packages/sdk/CHANGELOG.md must include a section for version ${packageJson.version}.`,
  )
} else if (
  readChangelogSection(packageChangelog, packageJson.version).trim() !==
  readChangelogSection(changelog, packageJson.version).trim()
) {
  errors.push(
    `packages/sdk/CHANGELOG.md section ${packageJson.version} must match root CHANGELOG.md.`,
  )
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Release readiness checks passed.')

function readChangelogSection(changelogContent, version) {
  const sectionStart = changelogContent.indexOf(`## ${version}`)

  if (sectionStart === -1) {
    return ''
  }

  const nextSectionStart = changelogContent.indexOf('\n## ', sectionStart + 1)

  if (nextSectionStart === -1) {
    return changelogContent.slice(sectionStart)
  }

  return changelogContent.slice(sectionStart, nextSectionStart)
}
