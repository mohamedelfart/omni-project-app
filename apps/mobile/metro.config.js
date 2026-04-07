/**
 * Metro config for Expo monorepo (pnpm workspace)
 * 
 * Handles:
 * - Workspace package resolution (packages/ with symlinks via pnpm)
 * - Live file watching across monorepo
 * - Proper node_modules path resolution (local > workspace root)
 * - Transform safety for web and native platforms
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

/**
 * 1. WATCH FOLDERS
 * Metro watches ALL files in workspace so changes to packages/ 
 * trigger hot reload without manual root restart
 */
config.watchFolders = [workspaceRoot];

/**
 * 2. NODE_MODULES PATHS
 * Resolution order: 
 *   1. apps/mobile/node_modules (local deps, lock versions)
 *   2. root node_modules (workspace hoisted deps)
 * This prevents duplicate modules and symlink conflicts
 */
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

/**
 * 3. SYMLINKS SUPPORT
 * pnpm creates symlinks to workspace packages.
 * Without this, Metro treats symlinks as broken paths → undefined error
 */
config.resolver.unstable_enableSymlinks = true;

/**
 * 4. EXTRA NODE MODULES (optional but recommended)
 * Explicitly tell Metro which folders contain valid node_modules.
 * Reduces resolution time and prevents scanning non-module folders
 */
config.resolver.extraNodeModules = {
  '@quickrent': path.resolve(workspaceRoot, 'packages'),
};

/**
 * 6. SOURCE EXTENSIONS
 * Ensure .web.ts / .web.tsx load before .ts / .tsx for web
 */
config.resolver.sourceExts = [
  'web.js',
  'web.ts',
  'web.tsx',
  'mjs',
  'cjs',
  'js',
  'ts',
  'tsx',
  'json',
];

/**
 * 7. TRANSFORM PROFILE
 * 'default' is safest for Expo + Web compatibility
 */
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = config;
