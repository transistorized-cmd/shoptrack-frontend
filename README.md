# ShopTrack Frontend

A modern Vue.js 3 frontend application for ShopTrack receipt processing with advanced analytics, interactive visualizations, and a plugin-based architecture.

## 📋 Table of Contents

- [Setup & Installation](#setup--installation)
- [Project Structure](#project-structure)
- [Features & Components](#features--components)
- [Analytics & Reporting](#analytics--reporting)
- [Chart Visualizations](#chart-visualizations)
- [Navigation & Routing](#navigation--routing)
- [Development Guide](#development-guide)
- [API Integration](#api-integration)

## 🚀 Setup & Installation

### Prerequisites

- **Node.js**: Version 22.x (automatically enforced - see [Node Version Management](#node-version-management))
- **npm**: Version 10.9.3+
- **nvm**: Node Version Manager (optional but recommended)
- **Backend API**: ShopTrack backend running on `http://localhost:5000`

### Installation Steps

1. **Clone and navigate to the project:**
   ```bash
   cd shoptrack-frontend
   ```

2. **Use correct Node.js version:**
   ```bash
   nvm use  # Uses version from .nvmrc file (v22)
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Local: `http://localhost:5173`
   - The app will automatically proxy API calls to the backend

## 🔧 Node Version Management

This project automatically enforces the correct Node.js version (v22) for all development commands.

### Automatic Version Checking

All development commands check the Node version before running:

```bash
npm run dev          # ✅ Checks Node version first
npm run build        # ✅ Checks Node version first  
npm run test:run     # ✅ Checks Node version first
npm run type-check   # ✅ Checks Node version first
```

If you're using the wrong Node version, you'll see:
```
❌ Wrong Node version!
   Required: Node v22.x (from .nvmrc)
   Current:  Node v16.x

📝 To fix this, run one of these commands:
   nvm use              (if you have nvm installed)
   nvm use 22          (explicit version)

💡 Tip: You can also use these helper scripts:
   npm run nvm:dev          (auto-switch and run dev server)
   npm run nvm:build        (auto-switch and build)
   npm run nvm:test:run     (auto-switch and run tests)
```

### Auto-Switching Commands

Use these commands to automatically switch to the correct Node version:

```bash
npm run nvm:dev          # Auto-switch to v22 and start dev server
npm run nvm:build        # Auto-switch to v22 and build project
npm run nvm:test         # Auto-switch to v22 and run tests (watch mode)
npm run nvm:test:run     # Auto-switch to v22 and run tests (once)
```

### Generic Wrapper

Run any command with the correct Node version:
```bash
npm run with-nvm -- <any-command>
npm run with-nvm -- npm run preview
npm run with-nvm -- npm run lint
```

### For CI/CD and Production

The project includes:
- **`.nvmrc`** file specifying Node v22
- **`engines`** field in package.json for npm install warnings
- **`preinstall`** script that checks Node version during `npm install`

### New Team Members Setup

1. Install nvm: https://github.com/nvm-sh/nvm
2. Clone the project
3. Run `nvm use` (installs Node v22 if needed)
4. Run `npm install`
5. All commands will now work automatically!

### Environment Setup

The application uses these key configurations:

- **Vite Config**: Configured with Vue 3, TailwindCSS, Chart.js, and API proxy
- **TailwindCSS**: Utility-first CSS framework via CDN
- **TypeScript**: Full type safety throughout the application
- **Chart.js**: Interactive data visualizations with Vue-ChartJS wrapper
- **Pinia**: Centralized state management for stores
- **API Proxy**: `/api` requests forwarded to `http://localhost:5000`

## 📁 Project Structure

```
shoptrack-frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── reports/          # Report-specific components
│   │   │   ├── CategoryAnalyticsReport.vue
│   │   │   └── PriceTrendsReport.vue (with Chart.js)
│   │   └── QuickUpload.vue   # Quick upload component
│   ├── views/                # Page-level components
│   │   ├── Reports.vue       # Reports hub page
│   │   ├── CategoryAnalytics.vue # Category analytics page
│   │   ├── PriceTrends.vue   # Price trends page with visualizations
│   │   ├── Upload.vue        # File upload page
│   │   ├── Receipts.vue      # Receipts listing page
│   │   └── ReceiptDetail.vue # Individual receipt view
│   ├── stores/               # Pinia state management
│   │   ├── plugins.ts        # Plugin store
│   │   └── reports.ts        # Reports store
│   ├── router/               # Vue Router configuration
│   │   └── index.ts          # Route definitions
│   ├── composables/          # Vue 3 composables
│   │   ├── useApi.ts         # API helper functions
│   │   └── useCharts.ts      # Chart.js utilities
│   ├── types/                # TypeScript definitions
│   │   ├── api.ts            # API response types
│   │   └── charts.ts         # Chart configuration types
│   ├── services/             # API service layer
│   │   ├── api.ts            # Base API service
│   │   ├── reports.ts        # Reports API service
│   │   └── analytics.ts      # Analytics API service
│   ├── assets/               # Static assets
│   │   └── styles/
│   │       └── main.css      # TailwindCSS configuration
│   ├── App.vue               # Main application component
│   └── main.ts               # Application entry point
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration with Chart.js
├── tailwind.config.js        # TailwindCSS configuration
└── package.json              # Dependencies including Chart.js
```

## ✨ Features & Components

### Core Features
- **📤 Receipt Upload**: Multi-format file upload with plugin auto-detection
- **🧾 Receipt Management**: View, search, and manage processed receipts
- **📊 Reports Hub**: Central dashboard for all analytics and reports
- **📈 Price Trends**: Interactive price tracking with Chart.js visualizations
- **📋 Category Analytics**: Hierarchical spending analysis with drill-down
- **💾 Data Export**: CSV and JSON export capabilities
- **🔍 Advanced Filtering**: Date ranges, categories, and search functionality

### Key Components

#### Navigation & Layout
- **App.vue**: Main layout with streamlined navigation (Upload, Receipts, Reports)
- **Router**: Vue Router with lazy-loaded routes and query parameter sync
- **Responsive Design**: Mobile-first approach with TailwindCSS

#### Reports System
- **Reports.vue**: Plugin discovery hub with report cards
- **CategoryAnalytics.vue**: Multi-level category drill-down analysis
- **PriceTrends.vue**: Price trend analysis with interactive charts
- **Report Components**: Reusable report visualization components

## 📊 Analytics & Reporting

### Category Analytics
**Route**: `/analytics/categories`

Features:
- **Hierarchical Navigation**: Categories → Items → Receipts → Receipt Detail
- **Spending Analysis**: Total amounts, transaction counts, percentages
- **Category Filtering**: Include/exclude categories from analysis
- **URL State Sync**: Shareable URLs with filter parameters

```typescript
// URL Examples
/analytics/categories
/analytics/categories?startDate=2024-09-01&endDate=2024-09-30
/analytics/categories?excluded=Electronics,Clothing
```

### Price Trends Analysis
**Route**: `/analytics/price-trends`

Features:
- **Price Volatility**: Statistical analysis of price changes over time
- **Historical Tracking**: Date-based price history with transaction counts
- **Trend Visualization**: Interactive line charts showing price patterns
- **Day-to-Day Changes**: Percentage change calculations with color coding

```typescript
// Price trend data structure
interface PriceTrendDto {
  itemName: string
  category: string
  overallAveragePrice: number
  minPrice: number
  maxPrice: number
  priceVolatility: number
  totalTransactions: number
  priceHistory: PriceHistoryDto[]
}
```

### Report Plugin System
The frontend mirrors the backend plugin architecture:

```typescript
// Report plugin interface
interface ReportPlugin {
  key: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  requiresDateRange: boolean
  supportsExport: boolean
  supportedExportFormats: string[]
}
```

## 📈 Chart Visualizations

### Chart.js Integration
The application uses Chart.js with Vue-ChartJS wrapper for interactive visualizations.

#### Price Trend Charts
```typescript
// Chart configuration for price trends
const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { title: { display: true, text: 'Date' } },
    y: { title: { display: true, text: 'Price ($)' }, beginAtZero: false }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function(context) {
          return `$${context.parsed.y.toFixed(2)}`
        }
      }
    }
  }
}
```

#### Chart Features
- **Responsive Design**: Charts adapt to container size
- **Interactive Tooltips**: Hover for detailed price information
- **Smooth Animations**: 0.1 tension for natural curve transitions
- **Custom Styling**: Blue theme (#3B82F6) matching application design
- **Data Points**: 4px radius with 6px hover expansion

### Chart Data Processing
```typescript
const getChartData = (item: PriceTrendDto) => ({
  labels: item.priceHistory.map(point => formatDate(point.date)),
  datasets: [{
    label: item.itemName,
    data: item.priceHistory.map(point => point.averagePrice),
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    fill: false
  }]
})
```

## 🗺️ Navigation & Routing

### Route Structure
```typescript
const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/receipts', name: 'receipts', component: Receipts },
  { path: '/receipts/:id', name: 'receipt-detail', component: ReceiptDetail },
  { path: '/upload', name: 'upload', component: Upload },
  { path: '/reports', name: 'reports', component: Reports },
  { path: '/analytics/categories', name: 'category-analytics', component: CategoryAnalytics },
  { path: '/analytics/price-trends', name: 'price-trends', component: PriceTrends }
]
```

### Navigation Flow
```
Header Navigation:
📤 Upload → 🧾 Receipts → 📊 Reports

Reports Hub:
📊 Category Analytics → /analytics/categories
📈 Price Trends → /analytics/price-trends

Category Analytics Drill-Down:
Categories → Category Items → Item Receipts → Receipt Detail
```

### State Management (Pinia)

#### Plugin Store
```typescript
export const usePluginStore = defineStore('plugins', {
  state: () => ({
    receiptPlugins: [],
    reportPlugins: [],
    loading: false
  }),
  actions: {
    async fetchPlugins(),
    getPluginByKey(key: string)
  }
})
```

#### Reports Store
```typescript
export const useReportsStore = defineStore('reports', {
  state: () => ({
    reports: [],
    currentReport: null,
    loading: false,
    exportingFormat: null
  }),
  actions: {
    async generateReport(reportKey: string, request: ReportRequest),
    async exportReport(reportKey: string, format: string, request: ReportRequest)
  }
})
```

## 🔧 Plugin Architecture

The plugin system is designed to mirror the backend C# plugin architecture, providing a consistent and extensible way to add new receipt processing capabilities.

### Core Components

#### 1. **Plugin Interface (`IPlugin`)**
```typescript
interface IPlugin {
  id: string              // Unique plugin identifier
  name: string            // Display name
  version: string         // Plugin version
  description: string     // Plugin description
  icon: string            // Emoji icon
  color: string           // Primary color (hex)
  gradientFrom: string    // Gradient start color
  gradientTo: string      // Gradient end color
  fileTypes: string[]     // Supported file extensions
  maxFileSize: number     // Max file size in bytes
  features: string[]      // Plugin capabilities
  uploadEndpoint: string  // Upload API endpoint
  hasManualEntry?: boolean // Supports manual entry
  manualEntryRoute?: string // Manual entry URL
}
```

#### 2. **Plugin Registry**
- **Singleton Pattern**: Central plugin management
- **Auto-Detection**: Finds best plugin for file types
- **Dynamic Loading**: Registers plugins at startup
- **File Type Mapping**: Maps extensions to compatible plugins

#### 3. **Base Plugin Component**
- **Consistent UI**: Standardized plugin cards
- **Dynamic Styling**: Colors and gradients from plugin config
- **Feature Badges**: Automatic capability display
- **Form Handling**: Built-in upload form generation

### Plugin Flow

1. **Registration**: Plugins registered in `main.ts` via `initializePlugins()`
2. **Discovery**: PluginRegistry manages all registered plugins
3. **Rendering**: PluginGrid displays all plugins using BasePlugin
4. **Interaction**: Users upload files through generated forms
5. **Processing**: Files sent to plugin-specific backend endpoints

## 🛠️ Creating New Plugins

### Step 1: Define Plugin Configuration

Create a new file in `src/plugins/definitions/`:

```typescript
// src/plugins/definitions/newPlugin.ts
import type { PluginConfig } from '../types/IPlugin'

export const newPlugin: PluginConfig = {
  plugin: {
    id: 'new-plugin',
    name: 'New Plugin',
    version: 'v1.0.0',
    description: 'Description of what this plugin does.',
    icon: '📄',                    // Choose an appropriate emoji
    color: '#3b82f6',              // Primary color (blue example)
    gradientFrom: '#3b82f615',     // Light gradient start
    gradientTo: '#3b82f605',       // Lighter gradient end
    fileTypes: ['pdf', 'txt'],     // Supported file extensions
    maxFileSize: 5 * 1024 * 1024,  // 5MB in bytes
    features: ['Text Processing'], // Plugin capabilities
    uploadEndpoint: 'http://shoptrack.test/upload/new-plugin',
    hasManualEntry: false          // Optional manual entry
  },
  capabilities: {
    fileUpload: true,
    manualEntry: false,
    batchProcessing: false,
    imageProcessing: false
  },
  endpoints: {
    upload: 'http://shoptrack.test/upload/new-plugin'
  }
}
```

### Step 2: Register the Plugin

Add your plugin to the initialization file:

```typescript
// src/plugins/index.ts
import { newPlugin } from './definitions/newPlugin'

export function initializePlugins(): void {
  pluginRegistry.registerPlugin(genericReceiptPlugin)
  pluginRegistry.registerPlugin(amazonOrdersPlugin)
  pluginRegistry.registerPlugin(newPlugin) // Add your plugin here
}
```

### Step 3: Backend Integration

Ensure your backend has a corresponding endpoint:

```csharp
// Backend: Controllers/UploadController.cs
[HttpPost("new-plugin")]
public async Task<IActionResult> ProcessNewPlugin(IFormFile file)
{
    // Your plugin processing logic
    return Ok();
}
```

### Step 4: Test Your Plugin

1. Restart the development server:
   ```bash
   npm run dev
   ```

2. Your plugin will automatically appear in the Plugin Grid
3. Test file uploads and verify backend integration

## 💻 Development Guide

### Adding Features to Existing Plugins

Modify the plugin configuration in `definitions/`:

```typescript
// Add new file types
fileTypes: ['pdf', 'txt', 'docx'],

// Add new features
features: ['Text Processing', 'OCR', 'AI Analysis'],

// Enable manual entry
hasManualEntry: true,
manualEntryRoute: 'http://shoptrack.test/upload/plugin/manual'
```

### Customizing Plugin UI

The `BasePlugin.vue` component provides standard UI, but you can:

1. **Modify Feature Classes**: Update `getFeatureClass()` for custom badge colors
2. **Custom File Input Styling**: Modify `fileInputClass` computed property
3. **Override Specific Plugins**: Create plugin-specific components if needed

### Plugin Registry Methods

```typescript
// Get all registered plugins
const plugins = pluginRegistry.getAllPlugins()

// Find plugins for specific file type
const pdfPlugins = pluginRegistry.getPluginsByFileType('pdf')

// Auto-detect best plugin
const bestPlugin = pluginRegistry.detectBestPlugin('receipt.jpg')

// Get file type mapping
const fileTypeMap = pluginRegistry.getFileTypePluginMap()
```

## 🌐 API Integration

### Reports API

The application integrates with the backend reports plugin system:

#### Get Available Reports
```typescript
// GET /api/reports
const { data } = await axios.get('/api/reports')
// Returns list of available report plugins with metadata
```

#### Generate Report
```typescript
// POST /api/reports/{reportKey}/generate
const request = {
  dateRange: {
    startDate: '2024-09-01',
    endDate: '2024-09-30'
  },
  parameters: {
    category: 'Groceries'
  }
}
const { data } = await axios.post(`/api/reports/price-trends/generate`, request)
```

#### Export Report
```typescript
// POST /api/reports/{reportKey}/export?format=csv
const response = await axios.post(
  `/api/reports/price-trends/export?format=csv`,
  request,
  { responseType: 'blob' }
)
// Returns file download
```

### Analytics API

Direct analytics endpoints for detailed data:

```typescript
// Category analytics
GET /api/analytics/categories?startDate=2024-09-01&endDate=2024-09-30

// Items within category  
GET /api/analytics/categories/Groceries/items

// Receipts for specific item
GET /api/analytics/items/Bananas/receipts
```

### Upload Endpoints

Receipt processing through plugin system:
```typescript
// POST /api/upload?pluginKey=amazon-receipt
const formData = new FormData()
formData.append('file', file)
const { data } = await axios.post('/api/upload', formData, {
  params: { pluginKey: 'amazon-receipt' }
})
```

### Error Handling

Consistent error response format:
```typescript
interface ApiError {
  type: string
  title: string
  status: number
  traceId: string
  errors?: Record<string, string[]>
}
```

## 🎨 Styling Guidelines

### Plugin Colors
- Use hex colors for consistency: `#10b981`, `#ff9900`
- Provide gradient variants: `#10b98115` (15% opacity)
- Maintain accessibility contrast ratios

### Feature Badge Colors
- Image Processing: `bg-purple-100 text-purple-800`
- Manual Entry: `bg-green-100 text-green-800`
- Batch Processing: `bg-blue-100 text-blue-800`
- OCR: `bg-yellow-100 text-yellow-800`
- AI Analysis: `bg-pink-100 text-pink-800`

### TailwindCSS Classes
The application uses TailwindCSS utilities. Common patterns:
- Cards: `bg-white rounded-lg shadow-md`
- Buttons: `px-4 py-2 rounded-lg hover:opacity-90`
- Forms: `border border-gray-300 rounded-lg focus:ring-2`

## 🔄 Hot Reload & Development

The development server supports:
- **Hot Module Replacement**: Changes reflect instantly
- **Component Hot Reload**: Vue components update without page refresh
- **Plugin Auto-Discovery**: New plugins appear automatically after registration

## 🚀 Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Production builds are optimized with:
- Tree-shaking for unused code elimination
- CSS purging for minimal bundle size
- Component lazy loading for better performance
- Chart.js bundle optimization

## 🧪 Testing & Quality

This project includes comprehensive testing with **Vitest**, **Vue Test Utils**, and **Testing Library**.

### Test Setup

The testing infrastructure includes:
- **Vitest**: Fast test runner optimized for Vite
- **@vue/test-utils**: Vue component testing utilities
- **@testing-library/vue**: User-centric testing library
- **happy-dom**: Lightweight DOM implementation for tests
- **MSW (Mock Service Worker)**: API mocking for tests

### Running Tests

All test commands automatically check Node version (v22) before running:

```bash
# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Auto-Switching Test Commands

If you're on the wrong Node version, use these auto-switching commands:

```bash
npm run nvm:test:run     # Auto-switch to v22 and run tests
npm run nvm:test         # Auto-switch to v22 and start watch mode
```

### Test Structure

```
shoptrack-frontend/
├── src/
│   └── components/
│       └── __tests__/           # Component tests
│           └── ThemeToggle.test.ts
├── tests/
│   ├── setup.ts                 # Global test setup
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── utils/                   # Test utilities
│       └── math.test.ts
└── vitest.config.ts             # Vitest configuration
```

### Writing Tests

Example component test:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import MyComponent from '../MyComponent.vue'

describe('MyComponent', () => {
  it('renders properly', () => {
    const wrapper = mount(MyComponent, {
      props: { message: 'Hello' }
    })
    expect(wrapper.text()).toContain('Hello')
  })
})
```

### Test Configuration

The project includes:
- **Global test setup** in `tests/setup.ts`
- **Mocks for browser APIs** (localStorage, IntersectionObserver, etc.)
- **Vue Test Utils configuration** with common stubs
- **Coverage reporting** with v8 provider

### Code Quality

All quality commands check Node version automatically:

```bash
# Type checking (with Node version check)
npm run type-check

# Linting (ESLint with Vue and TypeScript support)
npm run lint

# Format code (Prettier)
npm run format
```

## 📦 Key Dependencies

### Production Dependencies
- **vue**: Vue.js 3 framework
- **vue-router**: Client-side routing
- **pinia**: State management
- **axios**: HTTP client
- **chart.js**: Data visualization
- **vue-chartjs**: Vue wrapper for Chart.js

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **@vitejs/plugin-vue**: Vue support for Vite
- **tailwindcss**: Utility-first CSS

## 🚀 Deployment

### Environment Variables
```env
# .env.production
VITE_API_URL=https://api.shoptrack.com/api
VITE_APP_VERSION=1.0.0
```

### Build Commands
```bash
# Production build
npm run build

# Analyze bundle
npm run build:analyze

# Preview production build
npm run preview
```

### Performance Optimization
- **Code Splitting**: Routes are lazy-loaded
- **Chart Lazy Loading**: Chart.js loaded only when needed
- **Image Optimization**: Responsive images with proper formats
- **Caching Strategy**: Service worker for offline capability (future)

---

## 🌟 Feature Highlights

### Advanced Analytics
- **Interactive Charts**: Real-time price trend visualizations
- **Drill-Down Navigation**: Multi-level category exploration
- **Export Capabilities**: CSV and JSON data export
- **Filter Persistence**: URL-based filter state management

### Modern Architecture
- **Plugin System**: Extensible receipt processing
- **Component-Based**: Reusable UI components
- **TypeScript**: Full type safety
- **State Management**: Centralized Pinia stores
- **Responsive Design**: Mobile-first approach

### Developer Experience
- **Hot Reload**: Instant feedback during development
- **Type Safety**: Comprehensive TypeScript coverage
- **Code Splitting**: Optimized bundle loading
- **Modern Tooling**: Vite, Vue 3, TailwindCSS

This modern Vue.js frontend provides a comprehensive, extensible platform for receipt processing and analytics with a focus on user experience and developer productivity.
