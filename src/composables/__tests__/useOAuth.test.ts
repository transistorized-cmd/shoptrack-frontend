import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOAuth } from '../useOAuth'
import type { AuthResponse, OAuthLoginRequest } from '@/types/auth'

// Mock auth store
const mockAuthStore = {
  loginWithOAuth: vi.fn(),
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

// Mock environment variables using process.env pattern
process.env.VITE_GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.VITE_APPLE_CLIENT_ID = 'test-apple-client-id'

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_GOOGLE_CLIENT_ID: 'test-google-client-id',
    VITE_APPLE_CLIENT_ID: 'test-apple-client-id',
  },
  writable: true,
  configurable: true,
})

// Mock DOM and window objects
const mockDocument = {
  createElement: vi.fn(),
  head: {
    appendChild: vi.fn(),
  },
}

const mockWindow = {
  location: {
    origin: 'https://test.example.com',
  },
  google: undefined as any,
  AppleID: undefined as any,
}

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
})

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
})

describe('useOAuth', () => {
  let oauth: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset DOM and window mocks
    mockDocument.createElement.mockReturnValue({
      src: '',
      async: false,
      defer: false,
      onload: null,
      onerror: null,
    })
    mockDocument.head.appendChild.mockImplementation(() => {})

    // Reset window objects
    mockWindow.google = undefined
    mockWindow.AppleID = undefined

    // Reset auth store mock
    mockAuthStore.loginWithOAuth.mockResolvedValue({
      success: true,
      user: { id: 1, email: 'test@example.com' },
      token: 'test-token',
      message: 'Login successful',
    })

    oauth = useOAuth()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Composable Initialization', () => {
    it('should initialize with default state', () => {
      expect(oauth.loading.value).toBe(false)
      expect(oauth.error.value).toBeNull()
      expect(typeof oauth.loginWithGoogle).toBe('function')
      expect(typeof oauth.loginWithApple).toBe('function')
      expect(typeof oauth.loginWithMicrosoft).toBe('function')
      expect(typeof oauth.clearError).toBe('function')
    })

    it('should provide reactive loading state', () => {
      expect(oauth.loading.value).toBe(false)
      oauth.loading.value = true
      expect(oauth.loading.value).toBe(true)
    })

    it('should provide reactive error state', () => {
      expect(oauth.error.value).toBeNull()
      oauth.error.value = 'Test error'
      expect(oauth.error.value).toBe('Test error')
    })
  })

  describe('Error Management', () => {
    it('should clear error when clearError is called', () => {
      oauth.error.value = 'Test error'
      expect(oauth.error.value).toBe('Test error')

      oauth.clearError()
      expect(oauth.error.value).toBeNull()
    })

    it('should clear error automatically when starting new OAuth flow', async () => {
      oauth.error.value = 'Previous error'

      mockWindow.google = {
        accounts: {
          id: {
            initialize: vi.fn(({ callback }) => {
              setTimeout(() => {
                callback({ credential: 'test-credential' })
              }, 0)
            }),
            prompt: vi.fn((callback) => {
              callback({
                isNotDisplayed: () => false,
                isSkippedMoment: () => false,
              })
            }),
          },
        },
      }

      // Start OAuth flow (will clear error)
      const loginPromise = oauth.loginWithGoogle()

      // Error should be cleared immediately when flow starts
      expect(oauth.error.value).toBeNull()

      await loginPromise
    }, 10000)
  })

  describe('Google OAuth', () => {
    describe('Script Loading', () => {
      it('should skip script loading if Google SDK already loaded', async () => {
        mockWindow.google = {
          accounts: {
            id: {
              initialize: vi.fn(({ callback }) => {
                setTimeout(() => {
                  callback({ credential: 'test-credential' })
                }, 0)
              }),
              prompt: vi.fn((callback) => {
                callback({
                  isNotDisplayed: () => false,
                  isSkippedMoment: () => false,
                })
              }),
            },
          },
        }

        await oauth.loginWithGoogle()

        expect(mockDocument.createElement).not.toHaveBeenCalled()
        expect(mockDocument.head.appendChild).not.toHaveBeenCalled()
      }, 10000)

      it('should load Google OAuth script if not already loaded', async () => {
        const mockScript = {
          src: '',
          async: false,
          defer: false,
          onload: null as any,
          onerror: null as any,
        }

        mockDocument.createElement.mockReturnValue(mockScript)
        mockDocument.head.appendChild.mockImplementation((script) => {
          // Simulate successful script load
          setTimeout(() => {
            if (script.onload) {
              // Set up Google SDK after script loads
              mockWindow.google = {
                accounts: {
                  id: {
                    initialize: vi.fn(({ callback }) => {
                      setTimeout(() => {
                        callback({ credential: 'test-credential' })
                      }, 0)
                    }),
                    prompt: vi.fn((callback) => {
                      callback({
                        isNotDisplayed: () => false,
                        isSkippedMoment: () => false,
                      })
                    }),
                  },
                },
              }
              script.onload()
            }
          }, 0)
        })

        await oauth.loginWithGoogle()

        expect(mockDocument.createElement).toHaveBeenCalledWith('script')
        expect(mockScript.src).toBe('https://accounts.google.com/gsi/client')
        expect(mockScript.async).toBe(true)
        expect(mockScript.defer).toBe(true)
        expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockScript)
      }, 10000)

      it('should handle Google script loading failure', async () => {
        const mockScript = {
          src: '',
          async: false,
          defer: false,
          onload: null as any,
          onerror: null as any,
        }

        mockDocument.createElement.mockReturnValue(mockScript)
        mockDocument.head.appendChild.mockImplementation((script) => {
          // Simulate script loading error
          setTimeout(() => {
            if (script.onerror) {
              script.onerror()
            }
          }, 0)
        })

        const result = await oauth.loginWithGoogle()

        expect(result.success).toBe(false)
        expect(result.message).toContain('Failed to load Google OAuth script')
        expect(oauth.error.value).toContain('Failed to load Google OAuth script')
        expect(oauth.loading.value).toBe(false)
      })
    })

    describe('OAuth Flow', () => {
      beforeEach(() => {
        mockWindow.google = {
          accounts: {
            id: {
              initialize: vi.fn(),
              prompt: vi.fn(),
            },
            oauth2: {
              initTokenClient: vi.fn(),
            },
          },
        }
      })

      it('should initialize Google OAuth with correct configuration', async () => {
        mockWindow.google.accounts.id.initialize.mockImplementation(({ callback }) => {
          setTimeout(() => {
            callback({ credential: 'test-credential' })
          }, 0)
        })

        mockWindow.google.accounts.id.prompt.mockImplementation((callback) => {
          callback({
            isNotDisplayed: () => false,
            isSkippedMoment: () => false,
          })
        })

        await oauth.loginWithGoogle()

        expect(mockWindow.google.accounts.id.initialize).toHaveBeenCalledWith({
          client_id: 'test-google-client-id',
          callback: expect.any(Function),
          auto_select: false,
          cancel_on_tap_outside: true,
        })
      }, 10000)

      it('should handle successful Google ID token response', async () => {
        mockWindow.google.accounts.id.initialize.mockImplementation(({ callback }) => {
          // Simulate successful credential response
          setTimeout(() => {
            callback({ credential: 'test-google-credential' })
          }, 0)
        })

        mockWindow.google.accounts.id.prompt.mockImplementation((callback) => {
          callback({
            isNotDisplayed: () => false,
            isSkippedMoment: () => false,
          })
        })

        const result = await oauth.loginWithGoogle()

        expect(mockAuthStore.loginWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          accessToken: 'test-google-credential',
          idToken: 'test-google-credential',
        })
        expect(result.success).toBe(true)
        expect(oauth.loading.value).toBe(false)
      })

      it('should handle auth store login failure', async () => {
        mockAuthStore.loginWithOAuth.mockRejectedValue(new Error('Auth store error'))

        mockWindow.google.accounts.id.initialize.mockImplementation(({ callback }) => {
          setTimeout(() => {
            callback({ credential: 'test-google-credential' })
          }, 0)
        })

        mockWindow.google.accounts.id.prompt.mockImplementation((callback) => {
          callback({
            isNotDisplayed: () => false,
            isSkippedMoment: () => false,
          })
        })

        const result = await oauth.loginWithGoogle()

        expect(result.success).toBe(false)
        expect(result.message).toBe('Auth store error')
        expect(oauth.error.value).toBe('Auth store error')
        expect(oauth.loading.value).toBe(false)
      })

      it('should fallback to popup when prompt is not displayed', async () => {
        const mockTokenClient = {
          requestAccessToken: vi.fn(),
        }

        mockWindow.google.accounts.oauth2.initTokenClient.mockImplementation((config) => {
          // Immediately call the callback to simulate token response
          setTimeout(() => {
            config.callback({ access_token: 'test-access-token' })
          }, 0)
          return mockTokenClient
        })

        mockWindow.google.accounts.id.prompt.mockImplementation((callback) => {
          callback({
            isNotDisplayed: () => true,
            isSkippedMoment: () => false,
          })
        })

        const result = await oauth.loginWithGoogle()

        expect(mockWindow.google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
          client_id: 'test-google-client-id',
          scope: 'openid email profile',
          callback: expect.any(Function),
        })
        expect(mockAuthStore.loginWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          accessToken: 'test-access-token',
        })
        expect(result.success).toBe(true)
      }, 10000)

      it('should fallback to popup when moment is skipped', async () => {
        const mockTokenClient = {
          requestAccessToken: vi.fn(),
        }

        mockWindow.google.accounts.oauth2.initTokenClient.mockImplementation((config) => {
          setTimeout(() => {
            config.callback({ access_token: 'test-access-token' })
          }, 0)
          return mockTokenClient
        })

        mockWindow.google.accounts.id.prompt.mockImplementation((callback) => {
          callback({
            isNotDisplayed: () => false,
            isSkippedMoment: () => true,
          })
        })

        await oauth.loginWithGoogle()

        expect(mockWindow.google.accounts.oauth2.initTokenClient).toHaveBeenCalled()
      }, 10000)

      it('should handle popup OAuth failure', async () => {
        mockAuthStore.loginWithOAuth.mockRejectedValue(new Error('Popup auth failed'))

        const mockTokenClient = {
          requestAccessToken: vi.fn(),
        }

        mockWindow.google.accounts.oauth2.initTokenClient.mockImplementation((config) => {
          setTimeout(() => {
            config.callback({ access_token: 'test-access-token' })
          }, 0)
          return mockTokenClient
        })

        mockWindow.google.accounts.id.prompt.mockImplementation((callback) => {
          callback({
            isNotDisplayed: () => true,
            isSkippedMoment: () => false,
          })
        })

        const result = await oauth.loginWithGoogle()

        expect(result.success).toBe(false)
        expect(result.message).toBe('Popup auth failed')
        expect(oauth.error.value).toBe('Popup auth failed')
      }, 10000)
    })
  })

  describe('Apple OAuth', () => {
    describe('Script Loading', () => {
      it('should skip script loading if Apple SDK already loaded', async () => {
        mockWindow.AppleID = {
          auth: {
            init: vi.fn(),
            signIn: vi.fn().mockResolvedValue({
              authorization: {
                code: 'test-code',
                id_token: 'test-id-token',
              },
            }),
          },
        }

        await oauth.loginWithApple()

        expect(mockDocument.createElement).not.toHaveBeenCalled()
        expect(mockDocument.head.appendChild).not.toHaveBeenCalled()
      })

      it('should load Apple OAuth script if not already loaded', async () => {
        const mockScript = {
          src: '',
          async: false,
          defer: false,
          onload: null as any,
          onerror: null as any,
        }

        mockDocument.createElement.mockReturnValue(mockScript)
        mockDocument.head.appendChild.mockImplementation((script) => {
          setTimeout(() => {
            if (script.onload) {
              mockWindow.AppleID = {
                auth: {
                  init: vi.fn(),
                  signIn: vi.fn().mockResolvedValue({
                    authorization: {
                      code: 'test-code',
                      id_token: 'test-id-token',
                    },
                  }),
                },
              }
              script.onload()
            }
          }, 0)
        })

        await oauth.loginWithApple()

        expect(mockDocument.createElement).toHaveBeenCalledWith('script')
        expect(mockScript.src).toBe('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js')
        expect(mockScript.async).toBe(true)
        expect(mockScript.defer).toBe(true)
      })

      it('should handle Apple script loading failure', async () => {
        const mockScript = {
          src: '',
          async: false,
          defer: false,
          onload: null as any,
          onerror: null as any,
        }

        mockDocument.createElement.mockReturnValue(mockScript)
        mockDocument.head.appendChild.mockImplementation((script) => {
          setTimeout(() => {
            if (script.onerror) {
              script.onerror()
            }
          }, 0)
        })

        const result = await oauth.loginWithApple()

        expect(result.success).toBe(false)
        expect(result.message).toContain('Failed to load Apple Sign In script')
        expect(oauth.loading.value).toBe(false)
      })
    })

    describe('OAuth Flow', () => {
      beforeEach(() => {
        mockWindow.AppleID = {
          auth: {
            init: vi.fn(),
            signIn: vi.fn(),
          },
        }
      })

      it('should initialize Apple OAuth with correct configuration', async () => {
        mockWindow.AppleID.auth.signIn.mockResolvedValue({
          authorization: {
            code: 'test-code',
            id_token: 'test-id-token',
          },
        })

        await oauth.loginWithApple()

        expect(mockWindow.AppleID.auth.init).toHaveBeenCalledWith({
          clientId: 'test-apple-client-id',
          scope: 'name email',
          redirectURI: 'https://test.example.com/auth/apple/callback',
          usePopup: true,
        })
      }, 10000)

      it('should handle successful Apple sign in', async () => {
        mockWindow.AppleID.auth.signIn.mockResolvedValue({
          authorization: {
            code: 'apple-auth-code',
            id_token: 'apple-id-token',
          },
          user: {
            name: {
              firstName: 'John',
              lastName: 'Doe',
            },
            email: 'john@example.com',
          },
        })

        const result = await oauth.loginWithApple()

        expect(mockAuthStore.loginWithOAuth).toHaveBeenCalledWith({
          provider: 'apple',
          accessToken: 'apple-auth-code',
          idToken: 'apple-id-token',
        })
        expect(result.success).toBe(true)
        expect(oauth.loading.value).toBe(false)
      })

      it('should handle Apple sign in with minimal user data', async () => {
        mockWindow.AppleID.auth.signIn.mockResolvedValue({
          authorization: {
            code: 'apple-auth-code',
            id_token: 'apple-id-token',
          },
          // No user data provided (privacy setting)
        })

        const result = await oauth.loginWithApple()

        expect(mockAuthStore.loginWithOAuth).toHaveBeenCalledWith({
          provider: 'apple',
          accessToken: 'apple-auth-code',
          idToken: 'apple-id-token',
        })
        expect(result.success).toBe(true)
      })

      it('should handle auth store login failure for Apple', async () => {
        mockAuthStore.loginWithOAuth.mockRejectedValue(new Error('Apple auth failed'))

        mockWindow.AppleID.auth.signIn.mockResolvedValue({
          authorization: {
            code: 'apple-auth-code',
            id_token: 'apple-id-token',
          },
        })

        const result = await oauth.loginWithApple()

        expect(result.success).toBe(false)
        expect(result.message).toBe('Apple auth failed')
        expect(oauth.error.value).toBe('Apple auth failed')
        expect(oauth.loading.value).toBe(false)
      })

      it('should handle Apple sign in cancellation', async () => {
        mockWindow.AppleID.auth.signIn.mockRejectedValue({
          error: 'popup_closed_by_user',
        })

        const result = await oauth.loginWithApple()

        expect(result.success).toBe(false)
        expect(result.message).toBe('Sign in was cancelled')
        expect(oauth.loading.value).toBe(false)
      })

      it('should handle other Apple sign in errors', async () => {
        mockWindow.AppleID.auth.signIn.mockRejectedValue({
          error: 'invalid_request',
        })

        const result = await oauth.loginWithApple()

        expect(result.success).toBe(false)
        expect(result.message).toBe('Apple Sign In failed')
        expect(oauth.loading.value).toBe(false)
      })

      it('should handle Apple SDK initialization failure', async () => {
        mockWindow.AppleID.auth.signIn.mockRejectedValue(new Error('SDK init failed'))

        const result = await oauth.loginWithApple()

        expect(result.success).toBe(false)
        expect(result.message).toBe('Apple Sign In failed')
      }, 10000)
    })
  })

  describe('Microsoft OAuth', () => {
    it('should return not implemented error', async () => {
      const result = await oauth.loginWithMicrosoft()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Microsoft OAuth not yet implemented')
      expect(oauth.error.value).toBe('Microsoft OAuth not yet implemented')
      expect(oauth.loading.value).toBe(false)
    })

    it('should set loading state during Microsoft OAuth attempt', async () => {
      expect(oauth.loading.value).toBe(false)

      // Spy on the loading ref's value setter
      const loadingSpy = vi.spyOn(oauth.loading, 'value', 'set')

      const result = await oauth.loginWithMicrosoft()

      // Verify that loading was set to true and then false
      expect(loadingSpy).toHaveBeenCalledWith(true)
      expect(loadingSpy).toHaveBeenCalledWith(false)
      expect(oauth.loading.value).toBe(false)
      expect(result.success).toBe(false)

      loadingSpy.mockRestore()
    }, 10000)
  })

  describe('Loading State Management', () => {
    it('should set loading to true during Google OAuth', async () => {
      mockWindow.google = {
        accounts: {
          id: {
            initialize: vi.fn(({ callback }) => {
              setTimeout(() => {
                callback({ credential: 'test-credential' })
              }, 10)
            }),
            prompt: vi.fn((callback) => {
              setTimeout(() => {
                callback({
                  isNotDisplayed: () => false,
                  isSkippedMoment: () => false,
                })
              }, 0)
            }),
          },
        },
      }

      const loginPromise = oauth.loginWithGoogle()

      expect(oauth.loading.value).toBe(true)

      await loginPromise
      expect(oauth.loading.value).toBe(false)
    }, 10000)

    it('should set loading to true during Apple OAuth', async () => {
      mockWindow.AppleID = {
        auth: {
          init: vi.fn(),
          signIn: vi.fn(() => new Promise(() => {})), // Never resolve to test loading state
        },
      }

      oauth.loginWithApple()

      expect(oauth.loading.value).toBe(true)
    })

    it('should reset loading on error', async () => {
      const mockScript = {
        src: '',
        async: false,
        defer: false,
        onload: null as any,
        onerror: null as any,
      }

      mockDocument.createElement.mockReturnValue(mockScript)
      mockDocument.head.appendChild.mockImplementation((script) => {
        setTimeout(() => {
          if (script.onerror) {
            script.onerror()
          }
        }, 0)
      })

      const result = await oauth.loginWithGoogle()

      expect(oauth.loading.value).toBe(false)
      expect(result.success).toBe(false)
    })
  })

  describe('Environment Configuration', () => {
    it('should use environment variables for client IDs', async () => {
      mockWindow.google = {
        accounts: {
          id: {
            initialize: vi.fn(({ callback }) => {
              setTimeout(() => {
                callback({ credential: 'test-credential' })
              }, 0)
            }),
            prompt: vi.fn((callback) => {
              callback({
                isNotDisplayed: () => false,
                isSkippedMoment: () => false,
              })
            }),
          },
        },
      }

      await oauth.loginWithGoogle()

      expect(mockWindow.google.accounts.id.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'test-google-client-id',
        })
      )
    }, 10000)

    it('should use environment variables for Apple client ID', async () => {
      mockWindow.AppleID = {
        auth: {
          init: vi.fn(),
          signIn: vi.fn().mockResolvedValue({
            authorization: {
              code: 'test-code',
              id_token: 'test-id-token',
            },
          }),
        },
      }

      await oauth.loginWithApple()

      expect(mockWindow.AppleID.auth.init).toHaveBeenCalledWith({
        clientId: 'test-apple-client-id',
        scope: 'name email',
        redirectURI: 'https://test.example.com/auth/apple/callback',
        usePopup: true,
      })
    }, 10000)

    it('should use current origin for Apple redirect URI', async () => {
      mockWindow.location.origin = 'https://custom-domain.com'
      mockWindow.AppleID = {
        auth: {
          init: vi.fn(),
          signIn: vi.fn().mockResolvedValue({
            authorization: {
              code: 'test-code',
              id_token: 'test-id-token',
            },
          }),
        },
      }

      await oauth.loginWithApple()

      expect(mockWindow.AppleID.auth.init).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectURI: 'https://custom-domain.com/auth/apple/callback',
        })
      )
    })
  })

  describe('Security Considerations', () => {
    it('should handle script injection securely', async () => {
      const mockScript = {
        src: '',
        async: false,
        defer: false,
        onload: null as any,
        onerror: null as any,
      }

      mockDocument.createElement.mockReturnValue(mockScript)

      oauth.loginWithGoogle()

      // Verify script source is from trusted Google domain
      expect(mockScript.src).toBe('https://accounts.google.com/gsi/client')
      expect(mockScript.async).toBe(true)
      expect(mockScript.defer).toBe(true)
    })

    it('should handle Apple script injection securely', async () => {
      const mockScript = {
        src: '',
        async: false,
        defer: false,
        onload: null as any,
        onerror: null as any,
      }

      mockDocument.createElement.mockReturnValue(mockScript)

      oauth.loginWithApple()

      // Verify script source is from trusted Apple domain
      expect(mockScript.src).toBe('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js')
    })

    it('should validate OAuth provider before sending to auth store', async () => {
      mockWindow.google = {
        accounts: {
          id: {
            initialize: vi.fn(({ callback }) => {
              setTimeout(() => {
                callback({ credential: 'test-credential' })
              }, 0)
            }),
            prompt: vi.fn((callback) => {
              callback({
                isNotDisplayed: () => false,
                isSkippedMoment: () => false,
              })
            }),
          },
        },
      }

      await oauth.loginWithGoogle()

      expect(mockAuthStore.loginWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
        })
      )
    })
  })

  describe('Error Recovery', () => {
    it('should recover from Google script loading failure', async () => {
      let scriptLoadAttempts = 0
      const mockScript = {
        src: '',
        async: false,
        defer: false,
        onload: null as any,
        onerror: null as any,
      }

      mockDocument.createElement.mockReturnValue(mockScript)
      mockDocument.head.appendChild.mockImplementation((script) => {
        scriptLoadAttempts++
        setTimeout(() => {
          if (script.onerror) {
            script.onerror()
          }
        }, 0)
      })

      const result = await oauth.loginWithGoogle()

      expect(scriptLoadAttempts).toBe(1)
      expect(result.success).toBe(false)
      expect(oauth.error.value).toContain('Failed to load Google OAuth script')
    })

    it('should handle concurrent OAuth attempts gracefully', async () => {
      mockWindow.google = {
        accounts: {
          id: {
            initialize: vi.fn(({ callback }) => {
              setTimeout(() => {
                callback({ credential: 'test-credential' })
              }, 0)
            }),
            prompt: vi.fn((callback) => {
              setTimeout(() => {
                callback({
                  isNotDisplayed: () => false,
                  isSkippedMoment: () => false,
                })
              }, 10)
            }),
          },
        },
      }

      // Start two concurrent login attempts
      const login1 = oauth.loginWithGoogle()
      const login2 = oauth.loginWithGoogle()

      const [result1, result2] = await Promise.all([login1, login2])

      // Both should complete (though the behavior might vary)
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    }, 10000)
  })
})