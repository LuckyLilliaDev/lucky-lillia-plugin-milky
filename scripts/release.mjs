import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const registry = 'https://registry.npmjs.org'
const repository = 'LuckyLilliaDev/lucky-lillia-plugin-milky'
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
assert.equal(pkg.name, '@luckylillia-dev/plugin-milky')
assert.match(pkg.version, semver, 'Expected a full SemVer version')
assert.equal(pkg.repository?.type, 'git')
assert.equal(pkg.repository?.url, 'git+https://github.com/' + repository + '.git')
assert.equal(pkg.publishConfig?.access, 'public')
assert.equal(pkg.publishConfig?.registry, registry)
for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    assert.ok(!/^(?:file:|link:|workspace:|\.\.?[/\\]|[/\\]|[A-Za-z]:)/.test(spec), 'Local dependency is not publishable: ' + name)
  }
}
const version = pkg.version
const tag = version.split('+')[0].includes('-') ? 'next' : 'latest'
const filename = 'luckylillia-dev-plugin-milky-' + version + '.tgz'
const artifact = path.resolve(process.argv[3] ?? path.join(root, 'output/release'))
const tarball = path.join(artifact, filename)
const command = process.argv[2]
const expected = { name: pkg.name, version, tag, filename }

async function output(values) {
  if (!process.env.GITHUB_OUTPUT) return
  for (const [key, value] of Object.entries(values)) {
    await appendFile(process.env.GITHUB_OUTPUT, key + '=' + value + '\n')
  }
}

async function integrity() {
  return 'sha512-' + createHash('sha512').update(await readFile(tarball)).digest('base64')
}

async function verifyArtifact() {
  const release = JSON.parse(await readFile(path.join(artifact, 'release.json'), 'utf8'))
  for (const [key, value] of Object.entries(expected)) assert.equal(release[key], value)
  assert.equal(release.integrity, await integrity(), 'Packed artifact integrity mismatch')
  return release
}

async function request(url) {
  return fetch(url, { signal: AbortSignal.timeout(30_000), headers: { 'Cache-Control': 'no-cache' } })
}

const versionUrl = registry + '/' + encodeURIComponent(pkg.name) + '/' + encodeURIComponent(version)

switch (command) {
  case 'metadata': {
    const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
    assert.equal(lock.lockfileVersion, 3)
    assert.equal(lock.name, pkg.name)
    assert.equal(lock.version, version)
    assert.equal(lock.packages[''].name, pkg.name)
    assert.equal(lock.packages[''].version, version)
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'peerDependenciesMeta', 'optionalDependencies']) {
      assert.deepEqual(lock.packages[''][field], pkg[field], 'Lockfile field is out of sync: ' + field)
    }
    for (const [name, entry] of Object.entries(lock.packages)) {
      assert.ok(!entry.link, 'Lockfile contains a local link: ' + name)
      if (entry.resolved) assert.ok(entry.resolved.startsWith(registry + '/'), 'Non-registry dependency: ' + name)
    }
    if (process.env.GITHUB_ACTIONS === 'true') {
      assert.equal(process.env.GITHUB_REPOSITORY, repository)
      if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
        assert.equal(process.env.GITHUB_REF, 'refs/heads/main', 'Manual releases must run from main')
      } else {
        assert.equal(process.env.GITHUB_EVENT_NAME, 'push')
        assert.equal(process.env.GITHUB_REF, 'refs/tags/v' + version, 'Tag must match package.json version exactly')
      }
    }
    await output(expected)
    console.log('Validated ' + pkg.name + '@' + version + ' (' + tag + ')')
    break
  }
  case 'pack': {
    const packs = JSON.parse(await readFile(path.join(artifact, 'pack.json'), 'utf8'))
    assert.equal(packs.length, 1)
    const [pack] = packs
    for (const key of ['name', 'version', 'filename']) assert.equal(pack[key], expected[key])
    const paths = new Set(pack.files.map(file => file.path))
    for (const required of ['package.json', 'README.md', 'LICENSE', 'lib/index.js', 'lib/types/index.d.ts', 'lib/client/index.js']) {
      assert.ok(paths.has(required), 'Missing package file: ' + required)
    }
    for (const file of paths) {
      assert.ok(file === 'package.json' || file === 'README.md' || file === 'LICENSE' || file.startsWith('lib/'), 'Unexpected package file: ' + file)
      assert.ok(!/(?:^|\/)(?:native|development|data|node_modules|\.git|\.env)(?:\/|$)|\.(?:node|so|dll|dylib|db|tgz)$|(?:^|\/)\.\.(?:\/|$)/i.test(file), 'Forbidden package file: ' + file)
    }
    assert.equal(pack.integrity, await integrity(), 'npm pack integrity mismatch')
    await writeFile(path.join(artifact, 'release.json'), JSON.stringify({ ...expected, integrity: pack.integrity }, null, 2) + '\n')
    console.log('Verified ' + filename + ': ' + pack.integrity)
    break
  }
  case 'artifact': {
    await verifyArtifact()
    await output({ tag, tarball })
    console.log('Artifact verified: ' + filename)
    break
  }
  case 'unpublished': {
    await verifyArtifact()
    const response = await request(versionUrl)
    if (response.ok) throw new Error(pkg.name + '@' + version + ' is already published; increment the version before releasing')
    assert.equal(response.status, 404, 'npm registry check failed: HTTP ' + response.status)
    console.log(pkg.name + '@' + version + ' is not publicly available yet')
    break
  }
  case 'published': {
    const release = await verifyArtifact()
    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await request(versionUrl)
      if (response.ok) {
        const published = await response.json()
        assert.equal(published.name, pkg.name)
        assert.equal(published.version, version)
        assert.equal(published.dist?.integrity, release.integrity, 'Registry tarball differs from the reviewed artifact')
        const manifestResponse = await request(registry + '/' + encodeURIComponent(pkg.name))
        assert.ok(manifestResponse.ok, 'npm dist-tag check failed: HTTP ' + manifestResponse.status)
        const manifest = await manifestResponse.json()
        assert.equal(manifest['dist-tags']?.[tag], version, 'npm tag does not point to ' + version)
        const summary = 'Published ' + pkg.name + '@' + version + ' with tag ' + tag + '; registry integrity verified.\n'
        if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
        console.log(summary.trim())
        process.exit(0)
      }
      assert.equal(response.status, 404, 'npm publication check failed: HTTP ' + response.status)
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 10_000))
    }
    const message = 'npm accepted the request but ' + pkg.name + '@' + version + ' is not publicly available. It may be awaiting npm staged review; inspect Staged Packages before retrying. This run does not confirm a public release.'
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, message + '\n')
    throw new Error(message)
  }
  default:
    throw new Error('Usage: node scripts/release.mjs metadata|pack|artifact|unpublished|published [artifact-directory]')
}
