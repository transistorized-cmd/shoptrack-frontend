/**
 * Simple Dependency Injection Container
 * Provides service registration, resolution, and lifecycle management
 */

export type ServiceFactory<T = any> = () => T;
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

export interface ServiceBinding<T = any> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

export class DIContainer {
  private bindings = new Map<string | symbol, ServiceBinding>();
  private resolving = new Set<string | symbol>();

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: string | symbol,
    factory: ServiceFactory<T>,
  ): DIContainer {
    this.bindings.set(token, {
      factory,
      singleton: true,
    });
    return this;
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(
    token: string | symbol,
    factory: ServiceFactory<T>,
  ): DIContainer {
    this.bindings.set(token, {
      factory,
      singleton: false,
    });
    return this;
  }

  /**
   * Register a singleton class
   */
  registerSingletonClass<T>(
    token: string | symbol,
    constructor: ServiceConstructor<T>,
    ...args: any[]
  ): DIContainer {
    return this.registerSingleton(token, () => new constructor(...args));
  }

  /**
   * Register a transient class
   */
  registerTransientClass<T>(
    token: string | symbol,
    constructor: ServiceConstructor<T>,
    ...args: any[]
  ): DIContainer {
    return this.registerTransient(token, () => new constructor(...args));
  }

  /**
   * Register an existing instance
   */
  registerInstance<T>(token: string | symbol, instance: T): DIContainer {
    this.bindings.set(token, {
      factory: () => instance,
      singleton: true,
      instance,
    });
    return this;
  }

  /**
   * Resolve a service by token
   */
  resolve<T>(token: string | symbol): T {
    if (this.resolving.has(token)) {
      throw new Error(
        `Circular dependency detected for token: ${String(token)}`,
      );
    }

    const binding = this.bindings.get(token);
    if (!binding) {
      throw new Error(`No binding found for token: ${String(token)}`);
    }

    if (binding.singleton && binding.instance) {
      return binding.instance;
    }

    this.resolving.add(token);

    try {
      const instance = binding.factory();

      if (binding.singleton) {
        binding.instance = instance;
      }

      return instance;
    } catch (error) {
      throw new Error(
        `Failed to resolve service for token: ${String(token)}. ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered(token: string | symbol): boolean {
    return this.bindings.has(token);
  }

  /**
   * Unregister a service
   */
  unregister(token: string | symbol): boolean {
    return this.bindings.delete(token);
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.bindings.clear();
  }

  /**
   * Get all registered tokens
   */
  getTokens(): (string | symbol)[] {
    return Array.from(this.bindings.keys());
  }

  /**
   * Create a child container that inherits from this one
   */
  createChild(): DIContainer {
    const child = new DIContainer();
    // Copy bindings from parent
    this.bindings.forEach((binding, token) => {
      child.bindings.set(token, { ...binding });
    });
    return child;
  }
}

// Service tokens (symbols for type safety)
export const SERVICE_TOKENS = {
  PLUGIN_REGISTRY: Symbol("PluginRegistry"),
  ERROR_LOGGER: Symbol("ErrorLogger"),
  API_CLIENT: Symbol("ApiClient"),
} as const;

// Global container instance
export const container = new DIContainer();
