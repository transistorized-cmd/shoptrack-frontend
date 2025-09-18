# Vue Component Mounting Guide

This guide explains when and how to use shallow mounting vs full mounting for Vue component tests.

## Quick Reference

| Test Scenario | Mounting Method | Why |
|---------------|----------------|-----|
| **Component Props & Events** | `shallowMountComponent()` | Focus on component interface |
| **Component Logic/State** | `shallowMountComponent()` | Isolate component behavior |
| **User Interactions** | `mountComponent()` | Need real child behavior |
| **Integration Testing** | `mountComponent()` | Test component collaboration |
| **Performance Testing** | `shallowMountComponent()` | Faster execution |
| **Router Navigation** | `mountView()` | Need real routing |
| **Store Integration** | `shallowMountView()` | Test store logic without UI complexity |

## Mounting Methods

### Shallow Mounting

**Use `shallowMountComponent()` when:**
- Testing component props and events
- Testing component state and methods
- Focusing on component logic
- Performance is important
- Child components are irrelevant to the test

```typescript
import { shallowMountComponent } from '../../tests/utils/mounting';

it('should accept props correctly', () => {
  const wrapper = shallowMountComponent(MyComponent, {
    props: { title: 'Test Title' }
  });

  expect(wrapper.text()).toContain('Test Title');
});
```

**Benefits:**
- ⚡ **Faster execution** - Child components are stubbed
- 🎯 **Focused testing** - Tests only the component itself
- 🔧 **Easier debugging** - Simpler component tree
- 📦 **Smaller snapshots** - Less HTML to maintain

**Limitations:**
- 🚫 **No child behavior** - Child components are stubbed
- 🚫 **Limited integration** - Cannot test component interactions
- 🚫 **CSS limitations** - Child styles may not apply

### Full Mounting

**Use `mountComponent()` when:**
- Testing user interactions across components
- Testing component integration
- Testing real DOM behavior
- Testing CSS/styling that depends on child components
- Testing complex event propagation

```typescript
import { mountComponent } from '../../tests/utils/mounting';

it('should handle complex user interaction', async () => {
  const wrapper = mountComponent(MyComponent);

  // Real child components will respond to interactions
  await wrapper.find('button').trigger('click');
  expect(wrapper.find('.result').text()).toBe('Updated');
});
```

**Benefits:**
- 🔄 **Real interactions** - Child components behave normally
- 🧩 **Integration testing** - Tests component collaboration
- 🎨 **Real styling** - CSS from all components applies
- 🌍 **Real DOM** - Actual browser-like behavior

**Limitations:**
- 🐌 **Slower execution** - Renders entire component tree
- 🔍 **Complex debugging** - More components to consider
- 📈 **Resource intensive** - Uses more memory and CPU

## Specialized Mounting Functions

### Props Testing
```typescript
import { mountForProps } from '../../tests/utils/mounting';

it('should display props correctly', () => {
  const wrapper = mountForProps(MyComponent, {
    title: 'Test',
    count: 42,
    active: true
  });

  expect(wrapper.props()).toMatchObject({
    title: 'Test',
    count: 42,
    active: true
  });
});
```

### Event Testing
```typescript
import { mountForEvents } from '../../tests/utils/mounting';

it('should emit events correctly', async () => {
  const wrapper = mountForEvents(MyComponent);

  await wrapper.find('button').trigger('click');

  expect(wrapper.emitted('click')).toBeTruthy();
});
```

### Slot Testing
```typescript
import { mountWithSlots } from '../../tests/utils/mounting';

it('should render slots correctly', () => {
  const wrapper = mountWithSlots(MyComponent, {
    default: '<p>Default content</p>',
    header: '<h1>Header content</h1>'
  });

  expect(wrapper.text()).toContain('Default content');
  expect(wrapper.text()).toContain('Header content');
});
```

### View Testing
```typescript
import { shallowMountView, mountView } from '../../tests/utils/mounting';

// For testing view logic without complex child rendering
it('should handle route params', () => {
  const wrapper = shallowMountView(MyView);
  // Test view-specific logic
});

// For testing navigation and full view behavior
it('should navigate correctly', async () => {
  const wrapper = mountView(MyView);
  await wrapper.find('[data-testid="nav-link"]').trigger('click');
  // Test actual navigation
});
```

## Test Patterns

### Pattern: Component Interface Testing (Shallow)
```typescript
describe('Component Interface', () => {
  it('should accept all required props', () => {
    const props = {
      title: 'Test Title',
      items: [1, 2, 3],
      onSelect: vi.fn()
    };

    const wrapper = mountForProps(MyComponent, props);
    expect(wrapper.props()).toMatchObject(props);
  });

  it('should emit events with correct payload', async () => {
    await testPatterns.shouldEmitEvent(
      MyComponent,
      async (wrapper) => {
        await wrapper.find('button').trigger('click');
      },
      'item-selected',
      { id: 1, name: 'Item 1' }
    );
  });
});
```

### Pattern: User Interaction Testing (Full)
```typescript
describe('User Interactions', () => {
  it('should handle complete user workflow', async () => {
    const wrapper = mountComponent(SearchComponent);

    // Type in search input
    const input = wrapper.find('input');
    await input.setValue('test query');

    // Click search button
    await wrapper.find('button[type="submit"]').trigger('click');

    // Verify results are displayed
    expect(wrapper.find('.search-results').exists()).toBe(true);
  });
});
```

### Pattern: Store Integration Testing (Shallow)
```typescript
describe('Store Integration', () => {
  it('should call correct store methods', () => {
    const wrapper = shallowMountComponent(MyComponent);

    // Focus on store calls, not UI rendering
    expect(mockStore.fetchData).toHaveBeenCalled();
    expect(mockStore.setLoading).toHaveBeenCalledWith(true);
  });
});
```

## Component Stubs

### Automatic Stubs
Common components are automatically stubbed in shallow mounting:

```typescript
// These are automatically stubbed:
// - RouterLink → <a><slot /></a>
// - Icons → <svg data-testid="icon-name" />
// - Charts → <div data-testid="chart" />
// - Complex components → <div data-testid="component-name" />
```

### Custom Stubs
```typescript
const wrapper = shallowMountComponent(MyComponent, {
  componentStubs: {
    'CustomComponent': {
      name: 'CustomComponent',
      template: '<div data-testid="custom-stub">{{ title }}</div>',
      props: ['title']
    }
  }
});
```

## Performance Considerations

### Shallow Mounting Performance
```typescript
// ✅ Fast - Only renders component itself
const wrapper = shallowMountComponent(ComplexView);

// ✅ Fast - Child components are stubbed
expect(wrapper.findAll('[data-testid="receipt-card"]')).toHaveLength(100);
```

### Full Mounting Performance
```typescript
// ⚠️ Slower - Renders all child components
const wrapper = mountComponent(ComplexView);

// ⚠️ Slower - All 100 receipt cards are fully rendered
expect(wrapper.findAll('.receipt-card-content')).toHaveLength(100);
```

### Performance Testing
```typescript
it('should render efficiently with shallow mounting', () => {
  const start = performance.now();
  const wrapper = shallowMountComponent(HeavyComponent);
  const renderTime = performance.now() - start;

  expect(renderTime).toBeLessThan(50); // Should be fast
  wrapper.unmount();
});
```

## Common Scenarios

### Testing a Simple Component
```typescript
// ✅ Use shallow mounting for simple components
describe('Button Component', () => {
  it('should render text', () => {
    const wrapper = shallowMountComponent(Button, {
      props: { text: 'Click me' }
    });
    expect(wrapper.text()).toBe('Click me');
  });
});
```

### Testing a Complex View
```typescript
// ✅ Use shallow mounting for view logic
describe('Dashboard View Logic', () => {
  it('should load data on mount', () => {
    const wrapper = shallowMountView(Dashboard);
    expect(mockStore.loadDashboard).toHaveBeenCalled();
  });
});

// ✅ Use full mounting for integration
describe('Dashboard View Integration', () => {
  it('should display charts when data loads', async () => {
    const wrapper = mountView(Dashboard);
    await flushPromises();
    expect(wrapper.find('.chart-container').exists()).toBe(true);
  });
});
```

### Testing Form Components
```typescript
// ✅ Shallow for form validation logic
describe('Form Validation', () => {
  it('should validate required fields', () => {
    const wrapper = shallowMountComponent(ContactForm);
    // Test validation without child component complexity
  });
});

// ✅ Full for form submission flow
describe('Form Submission', () => {
  it('should submit form with all fields', async () => {
    const wrapper = mountComponent(ContactForm);
    // Fill out actual form inputs and submit
  });
});
```

## Migration Strategy

### Step 1: Identify Current Tests
```bash
# Find tests that could benefit from shallow mounting
grep -r "mount(" src/components/__tests__/
```

### Step 2: Categorize Tests
- **Props/Events** → Convert to shallow mounting
- **User Interactions** → Keep full mounting
- **Component Logic** → Convert to shallow mounting
- **Integration** → Keep full mounting

### Step 3: Gradual Migration
```typescript
// Before: Full mounting for everything
describe('MyComponent', () => {
  it('should accept props', () => {
    const wrapper = mount(MyComponent, { props: { title: 'Test' } });
    expect(wrapper.text()).toContain('Test');
  });
});

// After: Appropriate mounting for each test
describe('MyComponent', () => {
  it('should accept props', () => {
    const wrapper = shallowMountComponent(MyComponent, {
      props: { title: 'Test' }
    });
    expect(wrapper.text()).toContain('Test');
  });
});
```

## Best Practices

### 1. Choose the Right Tool
```typescript
// ✅ Good: Use shallow for component logic
it('should calculate total correctly', () => {
  const wrapper = shallowMountComponent(Calculator);
  // Test calculation logic
});

// ✅ Good: Use full for user flows
it('should complete checkout process', async () => {
  const wrapper = mountComponent(CheckoutForm);
  // Test entire user workflow
});
```

### 2. Use Test Patterns
```typescript
// ✅ Good: Use predefined patterns
it('should render correctly', () => {
  testPatterns.shouldRender(MyComponent);
});

it('should handle props', () => {
  testPatterns.shouldAcceptProps(MyComponent, { title: 'Test' });
});
```

### 3. Keep Tests Focused
```typescript
// ✅ Good: Focused test with shallow mounting
it('should emit delete event with correct ID', async () => {
  const wrapper = shallowMountComponent(ItemCard, {
    props: { item: { id: 1, name: 'Test' } }
  });

  await wrapper.find('[data-testid="delete-button"]').trigger('click');
  expect(wrapper.emitted('delete')).toEqual([[1]]);
});
```

### 4. Use Appropriate Utilities
```typescript
// ✅ Good: Use specialized mounting functions
const wrapper = mountForProps(MyComponent, { active: true });
const wrapper = mountForEvents(MyComponent);
const wrapper = mountWithSlots(MyComponent, { default: '<p>Content</p>' });
```

## Debugging Tips

### Shallow Mounting Debug
```typescript
// See what's actually rendered
console.log(wrapper.html());

// Check stubbed components
expect(wrapper.find('[data-testid="child-component"]').exists()).toBe(true);

// Verify props are passed to stubs
const childStub = wrapper.findComponent({ name: 'ChildComponent' });
expect(childStub.props()).toMatchObject({ title: 'Test' });
```

### Full Mounting Debug
```typescript
// See complete rendered tree
console.log(wrapper.html());

// Check actual child component behavior
const childComponent = wrapper.findComponent(ChildComponent);
expect(childComponent.vm.isActive).toBe(true);
```

### Common Issues
```typescript
// Issue: Test fails with shallow mounting
// Solution: Check if child component behavior is needed
const wrapper = shallowMountComponent(Parent);
// Child is stubbed, so child.emit() won't trigger parent methods

// Issue: Test is slow
// Solution: Use shallow mounting if possible
const wrapper = shallowMountComponent(HeavyComponent);
// Much faster than full mounting
```

This mounting strategy provides the right balance of test speed, reliability, and maintainability while ensuring comprehensive coverage of both component logic and integration scenarios.