# ShopTrack Style Guide

## Overview
ShopTrack uses a modern, consistent design system with support for both light and dark modes. The application is built with TailwindCSS, providing utility-first styling with custom theme extensions.

## Color System

### Brand Colors (shoptrack)
The primary brand color palette uses shades of blue/sky, defined in `tailwind.config.js`:

| Shade | Hex Code | Usage |
|-------|----------|--------|
| shoptrack-50 | `#f0f9ff` | Lightest tint for subtle backgrounds |
| shoptrack-100 | `#e0f2fe` | Light backgrounds |
| shoptrack-200 | `#bae6fd` | Hover states, light borders |
| shoptrack-300 | `#7dd3fc` | Active states |
| shoptrack-400 | `#38bdf8` | Secondary actions |
| shoptrack-500 | `#0ea5e9` | Focus rings, primary highlights |
| shoptrack-600 | `#0284c7` | Primary buttons, links |
| shoptrack-700 | `#0369a1` | Primary button hover |
| shoptrack-800 | `#075985` | Dark accents |
| shoptrack-900 | `#0c4a6e` | Darkest shade |

### Light Mode Colors

#### Backgrounds
- **Base Background**: `bg-gray-50` - Main application background
- **Card/Panel Background**: `bg-white` - Cards, panels, modals
- **Hover States**: `bg-gray-100` - Interactive element hover
- **Active States**: `bg-blue-50` - Selected/active items

#### Text Colors
- **Primary Text**: `text-gray-900` - Main content text
- **Secondary Text**: `text-gray-700` - Secondary content
- **Tertiary Text**: `text-gray-600` - Subtle text, labels
- **Disabled Text**: `text-gray-500` - Disabled states
- **Link Text**: `text-blue-600` - Clickable links

#### Borders
- **Default Border**: `border-gray-200` - Cards, dividers
- **Input Border**: `border-gray-300` - Form inputs
- **Focus Border**: `border-blue-600` - Active/focused elements

### Dark Mode Colors

#### Backgrounds
- **Base Background**: `dark:bg-gray-900` - Main application background
- **Card/Panel Background**: `dark:bg-gray-800` - Cards, panels, modals
- **Hover States**: `dark:bg-gray-700` - Interactive element hover
- **Active States**: `dark:bg-blue-900` - Selected/active items
- **Input Background**: `dark:bg-gray-700` - Form inputs

#### Text Colors
- **Primary Text**: `dark:text-white` or `dark:text-gray-100` - Main content
- **Secondary Text**: `dark:text-gray-300` - Secondary content
- **Tertiary Text**: `dark:text-gray-400` - Subtle text, placeholders
- **Link Text**: `dark:text-blue-400` - Clickable links

#### Borders
- **Default Border**: `dark:border-gray-700` - Cards, dividers
- **Input Border**: `dark:border-gray-600` - Form inputs
- **Focus Border**: `dark:border-blue-400` - Active/focused elements

### Semantic Colors

#### Success
- **Light**: `bg-green-600`, `text-white` (buttons), `bg-green-100`, `text-green-800` (alerts)
- **Dark**: `dark:bg-green-600`, `text-white` (consistent in both modes)

#### Danger/Error
- **Light**: `bg-red-600`, `text-white` (buttons), `bg-red-100`, `text-red-800` (alerts)
- **Dark**: `dark:bg-red-600`, `text-white` (consistent in both modes)

#### Warning
- **Light**: `bg-yellow-100`, `text-yellow-800`
- **Dark**: `dark:bg-yellow-900`, `dark:text-yellow-200`

#### Info
- **Light**: `bg-blue-100`, `text-blue-800`
- **Dark**: `dark:bg-blue-900`, `dark:text-blue-300`

## Typography

### Font Family
- **Base Font**: `font-sans` - System font stack with antialiasing

### Font Sizes
- **text-xs**: 0.75rem - Badges, labels, metadata
- **text-sm**: 0.875rem - Secondary text, form labels, navigation
- **text-base**: 1rem - Body text (default)
- **text-lg**: 1.125rem - Subheadings
- **text-xl**: 1.25rem - Section headers
- **text-2xl**: 1.5rem - Page titles
- **text-3xl**: 1.875rem - Main headings

### Font Weights
- **font-normal**: 400 - Body text
- **font-medium**: 500 - Emphasis, labels
- **font-semibold**: 600 - Subheadings
- **font-bold**: 700 - Headings, important text
- **font-extrabold**: 800 - Hero text

## Spacing System

### Padding/Margin Scale
- **0**: 0
- **1**: 0.25rem (4px)
- **2**: 0.5rem (8px)
- **3**: 0.75rem (12px)
- **4**: 1rem (16px)
- **6**: 1.5rem (24px)
- **8**: 2rem (32px)
- **12**: 3rem (48px)

### Common Patterns
- **Button Padding**: `px-4 py-2` (16px horizontal, 8px vertical)
- **Card Padding**: `p-4` or `p-6` (16px or 24px)
- **Section Spacing**: `py-8` (32px vertical)
- **Input Padding**: `px-3 py-2` (12px horizontal, 8px vertical)

## Component Styles

### Buttons (`.btn` base class)

#### Primary Button (`.btn-primary`)
```css
bg-shoptrack-600 text-white hover:bg-shoptrack-700
```

#### Secondary Button (`.btn-secondary`)
```css
bg-gray-200 dark:bg-gray-700 
text-gray-900 dark:text-gray-100 
hover:bg-gray-300 dark:hover:bg-gray-600
```

#### Success Button (`.btn-success`)
```css
bg-green-600 text-white hover:bg-green-700
```

#### Danger Button (`.btn-danger`)
```css
bg-red-600 text-white hover:bg-red-700
```

#### Common Button Properties
- Border Radius: `rounded-lg`
- Transition: `transition-colors duration-200`
- Focus: `focus:ring-2 focus:ring-shoptrack-500 focus:ring-offset-2`
- Dark Mode Focus: `dark:focus:ring-offset-gray-800`
- Disabled: `disabled:pointer-events-none disabled:opacity-50`

### Cards (`.card`)
```css
bg-white dark:bg-gray-800 
rounded-lg 
border border-gray-200 dark:border-gray-700 
shadow-sm
```

### Form Inputs (`.input`)
```css
bg-white dark:bg-gray-700
border border-gray-300 dark:border-gray-600
text-gray-900 dark:text-gray-100
placeholder:text-gray-500 dark:placeholder:text-gray-400
focus:ring-2 focus:ring-shoptrack-500 focus:ring-offset-2
dark:ring-offset-gray-800
```

#### Input Properties
- Height: `h-10` (40px)
- Border Radius: `rounded-md`
- Padding: `px-3 py-2`
- Font Size: `text-sm`
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50`

## Layout

### Container
- Max Width: `max-w-6xl` (72rem)
- Centering: `mx-auto`
- Responsive Padding: `px-4 sm:px-6 lg:px-8`

### Navigation
- Background: `bg-white dark:bg-gray-800`
- Shadow: `shadow-md`
- Height: Flexible with `py-4` padding

### Main Content
- Vertical Padding: `py-8`
- Min Height: `min-h-screen`

### Footer
- Background: `bg-white dark:bg-gray-800`
- Border: `border-t dark:border-gray-700`
- Spacing: `mt-12 py-8`

## Transitions & Animations

### Default Transition
```css
transition-colors duration-300
```

### Hover Transitions
```css
transition-colors duration-200
```

### Dropdown Animations
- Enter: `transition ease-out duration-200`
- Enter From: `transform opacity-0 scale-95`
- Enter To: `transform opacity-100 scale-100`
- Leave: `transition ease-in duration-75`

## Interactive States

### Hover
- Background lightens/darkens appropriately
- Text color may change for better contrast
- Smooth color transition (200ms)

### Focus
- Ring: `focus:ring-2 focus:ring-shoptrack-500`
- Ring Offset: `focus:ring-offset-2`
- Dark Mode Offset: `dark:focus:ring-offset-gray-800`

### Active/Selected
- Light Mode: Blue tinted backgrounds (`bg-blue-50`)
- Dark Mode: Blue tinted backgrounds (`dark:bg-blue-900`)
- Border accent for navigation items

### Disabled
- Reduced opacity: `opacity-50`
- Pointer events disabled: `pointer-events-none`
- Cursor not-allowed: `cursor-not-allowed`

## Icons

### Icon Sizes
- Small: `w-4 h-4` (16px)
- Medium: `w-5 h-5` (20px)
- Large: `w-6 h-6` (24px)

### Icon Colors
- Inherit from text color by default
- Specific colors for semantic meaning:
  - Sun icon (light mode): `text-yellow-500`
  - Moon icon (dark mode): `text-blue-400`
  - System icon: `text-gray-500`

## Best Practices

### Theme Consistency
1. Always provide both light and dark mode styles
2. Use the `dark:` prefix for dark mode overrides
3. Test components in both themes

### Accessibility
1. Maintain sufficient color contrast (WCAG AA minimum)
2. Include focus states for all interactive elements
3. Use semantic HTML elements
4. Add ARIA labels where needed

### Performance
1. Use TailwindCSS utility classes over custom CSS
2. Leverage the built-in purge feature for production
3. Avoid inline styles when possible

### Code Organization
1. Define reusable component classes in `main.css`
2. Use `@apply` directive for complex repeated patterns
3. Keep utility classes in template for one-off styles

## Usage Examples

### Creating a New Component
```vue
<template>
  <div class="card p-6">
    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
      Component Title
    </h2>
    <p class="text-gray-600 dark:text-gray-300">
      Component content goes here.
    </p>
    <button class="btn-primary mt-4">
      Take Action
    </button>
  </div>
</template>
```

### Form Example
```vue
<template>
  <form class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Email
      </label>
      <input type="email" class="input" placeholder="you@example.com">
    </div>
    <button type="submit" class="btn-primary w-full">
      Submit
    </button>
  </form>
</template>
```

### Alert Example
```vue
<template>
  <div class="rounded-md bg-yellow-100 dark:bg-yellow-900 p-4">
    <div class="flex">
      <div class="ml-3">
        <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          Warning
        </h3>
        <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
          This action cannot be undone.
        </div>
      </div>
    </div>
  </div>
</template>
```

## Theme Implementation

The theme system is managed through:
1. **TailwindCSS Dark Mode**: Class-based dark mode (`darkMode: 'class'`)
2. **Theme Toggle Component**: `src/components/ThemeToggle.vue`
3. **Dark Mode Composable**: `src/composables/useDarkMode.ts`
4. **Local Storage**: Theme preference persistence

### Theme Options
- **Light Mode**: Explicitly light theme
- **Dark Mode**: Explicitly dark theme
- **System**: Follows OS preference

## Maintenance Notes

### Adding New Colors
1. Extend the theme in `tailwind.config.js`
2. Document in this style guide
3. Ensure dark mode variants are defined

### Creating New Components
1. Follow existing component patterns
2. Use predefined utility classes
3. Test in both light and dark modes
4. Update this guide with new patterns

### Style Updates
1. Changes to base styles go in `src/assets/styles/main.css`
2. Component-specific styles use utility classes
3. Avoid inline styles unless dynamic