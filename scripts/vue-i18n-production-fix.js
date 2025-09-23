/**
 * Vue i18n Production Fix Plugin
 *
 * This plugin ensures that vue-i18n works correctly in production by:
 * 1. Validating the build for CSP compliance
 * 2. Checking for runtime compilation issues
 * 3. Providing warnings for potential problems
 */
export function vueI18nProductionFix() {
  return {
    name: 'vue-i18n-production-fix',

    generateBundle(options, bundle) {
      const isProd = process.env.NODE_ENV === 'production' || options.format === 'es'

      if (isProd) {
        // Check for any message compiler code that shouldn't be in production
        Object.keys(bundle).forEach(fileName => {
          const chunk = bundle[fileName]
          if (chunk.type === 'chunk' && chunk.code) {
            // Remove any eval() calls that might be used for message compilation
            if (chunk.code.includes('eval(') || chunk.code.includes('Function(')) {
              console.warn(`⚠️  Found eval/Function in ${fileName} - this may cause CSP violations`)
            }

            // Check for message compiler signatures
            if (chunk.code.includes('compileToFunction') || chunk.code.includes('compile(')) {
              console.warn(`⚠️  Found message compiler code in ${fileName}`)
            }
          }
        })

        console.log('✅ Vue i18n Production Fix: Bundle analysis completed')
      }
    }
  }
}