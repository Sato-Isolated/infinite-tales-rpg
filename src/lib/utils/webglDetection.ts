/**
 * WebGL Detection and Fallback Utilities
 * Provides graceful handling of WebGL availability for dice-box 3D rendering
 */

export type DiceSimulationMode = 'auto' | '3d' | '2d';

export interface WebGLCapabilities {
  hasWebGL: boolean;
  hasWebGL2: boolean;
  renderer: string | null;
  vendor: string | null;
  maxTextureSize: number | null;
  isHardwareAccelerated: boolean;
  recommendedMode: '3d' | '2d';
  warnings: string[];
}

/**
 * Detects WebGL capabilities and provides recommendations for dice simulation mode
 */
export function detectWebGLCapabilities(): WebGLCapabilities {
  const capabilities: WebGLCapabilities = {
    hasWebGL: false,
    hasWebGL2: false,
    renderer: null,
    vendor: null,
    maxTextureSize: null,
    isHardwareAccelerated: false,
    recommendedMode: '2d',
    warnings: []
  };

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.document) {
    capabilities.warnings.push('Not running in browser environment');
    return capabilities;
  }

  try {
    // Create a temporary canvas for testing
    const canvas = document.createElement('canvas');

    // Test WebGL context
    const webglContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (webglContext && webglContext instanceof WebGLRenderingContext) {
      capabilities.hasWebGL = true;

      // Get renderer and vendor information
      const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        capabilities.renderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        capabilities.vendor = webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }

      // Get max texture size (indicator of GPU capabilities)
      capabilities.maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE);

      // Check if this is likely hardware accelerated
      const renderer = capabilities.renderer?.toLowerCase() || '';
      const vendor = capabilities.vendor?.toLowerCase() || '';

      // Software renderers typically contain these keywords
      const softwareKeywords = ['software', 'swiftshader', 'mesa', 'microsoft basic'];
      capabilities.isHardwareAccelerated = !softwareKeywords.some(keyword =>
        renderer.includes(keyword) || vendor.includes(keyword)
      );

      // Test WebGL2 context
      const webgl2Context = canvas.getContext('webgl2');
      if (webgl2Context) {
        capabilities.hasWebGL2 = true;
      }

      // Clean up
      const loseContext = webglContext.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }

    // Clean up canvas
    canvas.remove();

  } catch (error) {
    capabilities.warnings.push(`WebGL detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Determine recommended mode based on capabilities
  if (capabilities.hasWebGL && capabilities.isHardwareAccelerated && (capabilities.maxTextureSize || 0) >= 2048) {
    capabilities.recommendedMode = '3d';
  } else {
    capabilities.recommendedMode = '2d';

    if (!capabilities.hasWebGL) {
      capabilities.warnings.push('WebGL not supported - falling back to 2D dice simulation');
    } else if (!capabilities.isHardwareAccelerated) {
      capabilities.warnings.push('Software WebGL detected - 2D mode recommended for better performance');
    } else if ((capabilities.maxTextureSize || 0) < 2048) {
      capabilities.warnings.push('Limited GPU capabilities detected - 2D mode recommended');
    }
  }

  return capabilities;
}

/**
 * Determines the actual simulation mode to use based on user preference and system capabilities
 */
export function determineDiceSimulationMode(
  userPreference: DiceSimulationMode,
  capabilities: WebGLCapabilities
): { mode: '3d' | '2d'; reason: string } {
  switch (userPreference) {
    case '3d':
      if (capabilities.hasWebGL) {
        return {
          mode: '3d',
          reason: 'User preference: 3D mode (forced)'
        };
      } else {
        return {
          mode: '2d',
          reason: 'User requested 3D but WebGL unavailable - using 2D fallback'
        };
      }

    case '2d':
      return {
        mode: '2d',
        reason: 'User preference: 2D mode'
      };

    case 'auto':
    default:
      return {
        mode: capabilities.recommendedMode,
        reason: `Auto-detected: ${capabilities.recommendedMode.toUpperCase()} mode recommended based on system capabilities`
      };
  }
}

/**
 * Logs WebGL capabilities information for debugging
 */
export function logWebGLInfo(capabilities: WebGLCapabilities): void {
  console.group('🎲 Dice Simulation WebGL Capabilities');
  console.log('WebGL Support:', capabilities.hasWebGL ? '✅' : '❌');
  console.log('WebGL2 Support:', capabilities.hasWebGL2 ? '✅' : '❌');
  console.log('Hardware Accelerated:', capabilities.isHardwareAccelerated ? '✅' : '❌');
  console.log('Recommended Mode:', capabilities.recommendedMode.toUpperCase());

  if (capabilities.renderer) {
    console.log('Renderer:', capabilities.renderer);
  }
  if (capabilities.vendor) {
    console.log('Vendor:', capabilities.vendor);
  }
  if (capabilities.maxTextureSize) {
    console.log('Max Texture Size:', capabilities.maxTextureSize);
  }

  if (capabilities.warnings.length > 0) {
    console.warn('Warnings:');
    capabilities.warnings.forEach(warning => console.warn('⚠️', warning));
  }

  console.groupEnd();
}

/**
 * Returns user-friendly description of the current simulation mode
 */
export function getDiceSimulationModeDescription(mode: '3d' | '2d'): string {
  return mode === '3d'
    ? '🎲 3D Physics Simulation - Realistic dice rolling with 3D graphics'
    : '🎯 Fast 2D Mode - Quick dice rolling with random number generation';
}
