import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { categorizedDescribe, categorizedIt, TestCategory } from '../../../tests/utils/categories'
import { useIdempotency, createOneTimeKey, withIdempotency } from '../useIdempotency'
import * as idempotencyUtils from '@/utils/idempotency'

// Mock the idempotency utils
vi.mock('@/utils/idempotency', () => ({
  generateIdempotencyKey: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
  getOrCreateIdempotencyKey: vi.fn((operationId: string, persist: boolean = true) =>
    `mock-key-${operationId}`
  ),
  clearIdempotencyKey: vi.fn(),
  isValidIdempotencyKey: vi.fn((key: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(key)
  })
}))

categorizedDescribe('useIdempotency', [TestCategory.COMPOSABLE, TestCategory.UNIT, TestCategory.FAST], () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  categorizedDescribe('Basic Functionality', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should initialize with null key', [TestCategory.CRITICAL], () => {
      const { idempotencyKey, hasKey } = useIdempotency()

      expect(idempotencyKey.value).toBeNull()
      expect(hasKey.value).toBe(false)
    })

    categorizedIt('should generate a new key with refreshKey', [TestCategory.CRITICAL], () => {
      const { idempotencyKey, hasKey, refreshKey } = useIdempotency()

      const key = refreshKey()

      expect(key).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(idempotencyKey.value).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(hasKey.value).toBe(true)
      expect(idempotencyUtils.generateIdempotencyKey).toHaveBeenCalled()
    })

    categorizedIt('should clear the key', [TestCategory.CRITICAL], () => {
      const { idempotencyKey, hasKey, refreshKey, clearKey } = useIdempotency()

      refreshKey()
      expect(hasKey.value).toBe(true)

      clearKey()

      expect(idempotencyKey.value).toBeNull()
      expect(hasKey.value).toBe(false)
    })

    categorizedIt('should get current key or generate new one', [TestCategory.CRITICAL], () => {
      const { idempotencyKey, getKey } = useIdempotency()

      expect(idempotencyKey.value).toBeNull()

      const key = getKey()

      expect(key).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(idempotencyKey.value).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    categorizedIt('should return existing key from getKey if valid', [TestCategory.CRITICAL], () => {
      const { idempotencyKey, refreshKey, getKey } = useIdempotency()

      const initialKey = refreshKey()
      const retrievedKey = getKey()

      expect(retrievedKey).toBe(initialKey)
      // generateIdempotencyKey should only be called once
      expect(idempotencyUtils.generateIdempotencyKey).toHaveBeenCalledTimes(1)
    })

    categorizedIt('should validate key correctly', [TestCategory.CRITICAL], () => {
      const { isKeyValid, refreshKey } = useIdempotency()

      expect(isKeyValid()).toBe(false)

      refreshKey()
      expect(isKeyValid()).toBe(true)
    })
  })

  categorizedDescribe('Operation ID Persistence', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should use getOrCreateIdempotencyKey when operationId provided', [TestCategory.CRITICAL], () => {
      const { refreshKey } = useIdempotency('upload-receipt')

      const key = refreshKey()

      expect(key).toBe('mock-key-upload-receipt')
      expect(idempotencyUtils.getOrCreateIdempotencyKey).toHaveBeenCalledWith('upload-receipt', true)
      expect(idempotencyUtils.generateIdempotencyKey).not.toHaveBeenCalled()
    })

    categorizedIt('should persist key by default when operationId provided', [TestCategory.CRITICAL], () => {
      const { refreshKey } = useIdempotency('create-subscription')

      refreshKey()

      expect(idempotencyUtils.getOrCreateIdempotencyKey).toHaveBeenCalledWith('create-subscription', true)
    })

    categorizedIt('should not persist key when persist=false', [TestCategory.FAST], () => {
      const { refreshKey } = useIdempotency('temp-operation')

      refreshKey(false)

      expect(idempotencyUtils.getOrCreateIdempotencyKey).toHaveBeenCalledWith('temp-operation', false)
    })

    categorizedIt('should clear persisted key when operationId provided', [TestCategory.CRITICAL], () => {
      const { clearKey } = useIdempotency('upload-receipt')

      clearKey()

      expect(idempotencyUtils.clearIdempotencyKey).toHaveBeenCalledWith('upload-receipt')
    })

    categorizedIt('should not call clearIdempotencyKey when no operationId', [TestCategory.FAST], () => {
      const { clearKey } = useIdempotency()

      clearKey()

      expect(idempotencyUtils.clearIdempotencyKey).not.toHaveBeenCalled()
    })
  })

  categorizedDescribe('Component Lifecycle', [TestCategory.FAST, TestCategory.INTEGRATION], () => {
    categorizedIt('should auto-clear key on unmount when no operationId', [TestCategory.CRITICAL], async () => {
      const TestComponent = defineComponent({
        template: '<div>{{ key }}</div>',
        setup() {
          const { idempotencyKey, refreshKey } = useIdempotency()
          refreshKey()
          return { key: idempotencyKey }
        }
      })

      const wrapper = mount(TestComponent)
      expect(wrapper.vm.key).toBe('550e8400-e29b-41d4-a716-446655440000')

      wrapper.unmount()
      await nextTick()

      // Key should be cleared (but we can't directly test it since component is unmounted)
      // This test ensures no errors on unmount
    })

    categorizedIt('should NOT auto-clear persisted key on unmount when operationId provided', [TestCategory.CRITICAL], async () => {
      const TestComponent = defineComponent({
        template: '<div>{{ key }}</div>',
        setup() {
          const { idempotencyKey, refreshKey } = useIdempotency('test-operation')
          refreshKey()
          return { key: idempotencyKey }
        }
      })

      const wrapper = mount(TestComponent)
      expect(wrapper.vm.key).toBe('mock-key-test-operation')

      vi.clearAllMocks()

      wrapper.unmount()
      await nextTick()

      // Should NOT call clearIdempotencyKey on unmount
      expect(idempotencyUtils.clearIdempotencyKey).not.toHaveBeenCalled()
    })
  })

  categorizedDescribe('Reactivity', [TestCategory.FAST], () => {
    categorizedIt('should update reactively when key is refreshed', [TestCategory.CRITICAL], async () => {
      const TestComponent = defineComponent({
        template: '<div><span>{{ key }}</span><button @click="refresh">Refresh</button></div>',
        setup() {
          const { idempotencyKey, refreshKey } = useIdempotency()
          return { key: idempotencyKey, refresh: refreshKey }
        }
      })

      const wrapper = mount(TestComponent)
      expect(wrapper.find('span').text()).toBe('')

      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.find('span').text()).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    categorizedIt('should update reactively when key is cleared', [TestCategory.CRITICAL], async () => {
      const TestComponent = defineComponent({
        template: `
          <div>
            <span>{{ key || 'null' }}</span>
            <button @click="refresh">Refresh</button>
            <button @click="clear">Clear</button>
          </div>
        `,
        setup() {
          const { idempotencyKey, refreshKey, clearKey } = useIdempotency()
          return { key: idempotencyKey, refresh: refreshKey, clear: clearKey }
        }
      })

      const wrapper = mount(TestComponent)

      await wrapper.findAll('button')[0].trigger('click')
      await nextTick()
      expect(wrapper.find('span').text()).toBe('550e8400-e29b-41d4-a716-446655440000')

      await wrapper.findAll('button')[1].trigger('click')
      await nextTick()
      expect(wrapper.find('span').text()).toBe('null')
    })

    categorizedIt('should update hasKey flag reactively', [TestCategory.FAST], async () => {
      const TestComponent = defineComponent({
        template: `
          <div>
            <span>{{ hasKeyFlag }}</span>
            <button @click="refresh">Refresh</button>
            <button @click="clear">Clear</button>
          </div>
        `,
        setup() {
          const { hasKey, refreshKey, clearKey } = useIdempotency()
          return { hasKeyFlag: hasKey, refresh: refreshKey, clear: clearKey }
        }
      })

      const wrapper = mount(TestComponent)
      expect(wrapper.find('span').text()).toBe('false')

      await wrapper.findAll('button')[0].trigger('click')
      await nextTick()
      expect(wrapper.find('span').text()).toBe('true')

      await wrapper.findAll('button')[1].trigger('click')
      await nextTick()
      expect(wrapper.find('span').text()).toBe('false')
    })
  })

  categorizedDescribe('Edge Cases', [TestCategory.FAST], () => {
    categorizedIt('should handle multiple refreshKey calls', [TestCategory.FAST], () => {
      const { refreshKey, idempotencyKey } = useIdempotency()

      const key1 = refreshKey()
      const key2 = refreshKey()
      const key3 = refreshKey()

      expect(key1).toBe(key2)
      expect(key2).toBe(key3)
      expect(idempotencyKey.value).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    categorizedIt('should handle multiple clearKey calls', [TestCategory.FAST], () => {
      const { clearKey, idempotencyKey } = useIdempotency()

      clearKey()
      clearKey()
      clearKey()

      expect(idempotencyKey.value).toBeNull()
    })

    categorizedIt('should handle getKey with invalid existing key', [TestCategory.FAST], () => {
      vi.mocked(idempotencyUtils.isValidIdempotencyKey).mockReturnValueOnce(false)

      const { idempotencyKey, refreshKey, getKey } = useIdempotency()

      refreshKey()
      // Manually set to invalid key
      idempotencyKey.value = 'invalid-key'

      // Should generate new key
      const key = getKey()
      expect(key).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    categorizedIt('should handle empty operationId', [TestCategory.FAST], () => {
      const { refreshKey } = useIdempotency('')

      const key = refreshKey()

      // Empty string is treated as no operationId, should use generateIdempotencyKey
      expect(idempotencyUtils.generateIdempotencyKey).toHaveBeenCalled()
      expect(key).toBe('550e8400-e29b-41d4-a716-446655440000')
    })
  })
})

categorizedDescribe('createOneTimeKey', [TestCategory.FAST, TestCategory.CRITICAL], () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  categorizedIt('should generate a one-time key', [TestCategory.CRITICAL], () => {
    const key = createOneTimeKey()

    expect(key).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(idempotencyUtils.generateIdempotencyKey).toHaveBeenCalled()
  })

  categorizedIt('should generate different keys on each call', [TestCategory.CRITICAL], () => {
    vi.mocked(idempotencyUtils.generateIdempotencyKey)
      .mockReturnValueOnce('key-1')
      .mockReturnValueOnce('key-2')
      .mockReturnValueOnce('key-3')

    const key1 = createOneTimeKey()
    const key2 = createOneTimeKey()
    const key3 = createOneTimeKey()

    expect(key1).toBe('key-1')
    expect(key2).toBe('key-2')
    expect(key3).toBe('key-3')
  })
})

categorizedDescribe('withIdempotency', [TestCategory.INTEGRATION, TestCategory.UNIT], () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  categorizedIt('should wrap API call with idempotency key', [TestCategory.CRITICAL], async () => {
    const mockApiCall = vi.fn(async (key: string, data: string) => {
      return { success: true, key, data }
    })

    const wrappedCall = withIdempotency('test-operation', mockApiCall)
    const result = await wrappedCall('test-data')

    expect(mockApiCall).toHaveBeenCalledWith('mock-key-test-operation', 'test-data')
    expect(result).toEqual({ success: true, key: 'mock-key-test-operation', data: 'test-data' })
  })

  categorizedIt('should clear key on success by default', [TestCategory.CRITICAL], async () => {
    const mockApiCall = vi.fn(async (key: string) => ({ success: true }))

    const wrappedCall = withIdempotency('test-operation', mockApiCall)
    await wrappedCall()

    expect(idempotencyUtils.clearIdempotencyKey).toHaveBeenCalledWith('test-operation')
  })

  categorizedIt('should not clear key on success when clearOnSuccess=false', [TestCategory.CRITICAL], async () => {
    const mockApiCall = vi.fn(async (key: string) => ({ success: true }))

    const wrappedCall = withIdempotency('test-operation', mockApiCall, { clearOnSuccess: false })
    await wrappedCall()

    expect(idempotencyUtils.clearIdempotencyKey).not.toHaveBeenCalled()
  })

  categorizedIt('should not clear key on error by default', [TestCategory.CRITICAL], async () => {
    const mockApiCall = vi.fn(async (key: string) => {
      throw new Error('API Error')
    })

    const wrappedCall = withIdempotency('test-operation', mockApiCall)

    await expect(wrappedCall()).rejects.toThrow('API Error')
    expect(idempotencyUtils.clearIdempotencyKey).not.toHaveBeenCalled()
  })

  categorizedIt('should clear key on error when clearOnError=true', [TestCategory.CRITICAL], async () => {
    const mockApiCall = vi.fn(async (key: string) => {
      throw new Error('API Error')
    })

    const wrappedCall = withIdempotency('test-operation', mockApiCall, { clearOnError: true })

    await expect(wrappedCall()).rejects.toThrow('API Error')
    expect(idempotencyUtils.clearIdempotencyKey).toHaveBeenCalledWith('test-operation')
  })

  categorizedIt('should pass multiple arguments to wrapped function', [TestCategory.CRITICAL], async () => {
    const mockApiCall = vi.fn(async (key: string, arg1: string, arg2: number, arg3: boolean) => {
      return { key, arg1, arg2, arg3 }
    })

    const wrappedCall = withIdempotency('test-operation', mockApiCall)
    const result = await wrappedCall('test', 42, true)

    expect(mockApiCall).toHaveBeenCalledWith('mock-key-test-operation', 'test', 42, true)
    expect(result).toEqual({
      key: 'mock-key-test-operation',
      arg1: 'test',
      arg2: 42,
      arg3: true
    })
  })

  categorizedIt('should reuse same key across retries', [TestCategory.CRITICAL], async () => {
    let callCount = 0
    const mockApiCall = vi.fn(async (key: string) => {
      callCount++
      if (callCount < 3) {
        throw new Error('Temporary error')
      }
      return { success: true, key }
    })

    const wrappedCall = withIdempotency('retry-operation', mockApiCall, { clearOnError: false })

    // First attempt - fails
    await expect(wrappedCall()).rejects.toThrow('Temporary error')
    // Second attempt - fails
    await expect(wrappedCall()).rejects.toThrow('Temporary error')
    // Third attempt - succeeds
    const result = await wrappedCall()

    expect(result).toEqual({ success: true, key: 'mock-key-retry-operation' })
    // All calls should use same key
    expect(mockApiCall).toHaveBeenCalledTimes(3)
    expect(mockApiCall).toHaveBeenNthCalledWith(1, 'mock-key-retry-operation')
    expect(mockApiCall).toHaveBeenNthCalledWith(2, 'mock-key-retry-operation')
    expect(mockApiCall).toHaveBeenNthCalledWith(3, 'mock-key-retry-operation')
  })

  categorizedIt('should handle both clearOnSuccess and clearOnError options', [TestCategory.FAST], async () => {
    const mockSuccessCall = vi.fn(async (key: string) => ({ success: true }))
    const mockErrorCall = vi.fn(async (key: string) => {
      throw new Error('Error')
    })

    const wrappedSuccess = withIdempotency('success-op', mockSuccessCall, {
      clearOnSuccess: true,
      clearOnError: false
    })

    const wrappedError = withIdempotency('error-op', mockErrorCall, {
      clearOnSuccess: false,
      clearOnError: true
    })

    await wrappedSuccess()
    expect(idempotencyUtils.clearIdempotencyKey).toHaveBeenCalledWith('success-op')

    vi.clearAllMocks()

    await expect(wrappedError()).rejects.toThrow('Error')
    expect(idempotencyUtils.clearIdempotencyKey).toHaveBeenCalledWith('error-op')
  })
})
