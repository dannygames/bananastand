/**
 * App configuration and feature flags
 */

export const Config = {
  // Feature flags
  features: {
    // Set to false to disable the Home tab
    homeTabEnabled: false,
    // Set to true to enable authentication bypass for development
    bypassAuthEnabled: true,
  },
  
  // App settings
  app: {
    name: 'bananastand',
    version: '1.0.0',
  },
};
