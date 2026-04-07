/**
 * Babel config for Expo mobile app running on Native + Web
 * Handles transpilation for both platforms + workspace packages
 */

module.exports = function (api) {
  // Cache busting on NODE_ENV changes
  // Dev cache is disabled automatically by Expo cli during 'dev' command
  const isDev = api.env('development');
  
  api.cache(() => isDev);

  return {
    // babel-preset-expo handles all Expo-specific transforms
    // Includes: JSX, Flow, Optional Chaining, Nullish Coalescing, etc.
    presets: [
      'babel-preset-expo',
    ],
    
    // Plugins for additional transforms
    plugins: [
      // Required for styled-components & emotion (if used)
      // ['@emotion/babel-plugin', { sourceMap: isDev }],
      
      // Transform inline requires to improve performance
      [
        '@babel/plugin-transform-runtime',
        {
          useESModules: true,
          // Prevent async/await bloat on native
          regenerator: true,
        },
      ],
    ],

    // Environment-specific overrides
    env: {
      // Web-specific: stricter transforms for browser compatibility
      web: {
        presets: ['babel-preset-expo'],
        plugins: [
          [
            '@babel/plugin-proposal-decorators',
            { legacy: true },
          ],
        ],
      },
      // Production: optimizations
      production: {
        plugins: [
          'transform-remove-console', // Remove console.log in production
        ],
      },
    },
  };
};
