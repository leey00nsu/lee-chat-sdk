import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = join(rootDir, 'packages', 'sdk', 'package.json')
const bundlePath = join(rootDir, 'packages', 'sdk', 'dist', 'lee-chat.global.js')
const manifestPath = join(
  rootDir,
  'packages',
  'sdk',
  'dist',
  'lee-chat.global.manifest.json',
)

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
const bundle = await readFile(bundlePath)
const manifest = {
  packageName: packageJson.name,
  version: packageJson.version,
  file: 'lee-chat.global.js',
  size: bundle.byteLength,
  integrity: createIntegrity(bundle, 'sha384'),
  sha256: createHash('sha256').update(bundle).digest('hex'),
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`Created CDN manifest at ${manifestPath}`)

function createIntegrity(buffer, algorithm) {
  return `${algorithm}-${createHash(algorithm).update(buffer).digest('base64')}`
}
