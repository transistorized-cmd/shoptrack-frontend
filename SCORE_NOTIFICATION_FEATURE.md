# Score Notification Feature - Frontend Implementation

## 📋 Overview

The Score Notification feature displays animated notifications after receipt uploads, showing users how their Expense Visibility Score changed. This is a Vue 3 frontend implementation matching the iOS version from shoptrack-ios.

**Status**: ✅ Complete and Ready for Testing
**Date**: November 9, 2025
**Platforms**: Web (Vue 3 + TypeScript)

---

## 🎯 What It Does

After a user uploads a receipt through the QuickUpload component:

1. **Before Upload**: Fetches the current score silently
2. **Upload Process**: Receipt uploads normally (async job system)
3. **After Upload**: Fetches the new score and calculates change
4. **Notification**: Beautiful animated modal appears showing the score change
5. **Dismiss**: User clicks "Awesome!" to dismiss and continue

---

## 📁 Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `src/types/scoreNotification.ts` | TypeScript models, theme logic, and score calculations |
| `src/services/analytics.ts` | Service for fetching Expense Visibility Score from API |
| `src/components/ScoreNotificationModal.vue` | Animated modal component with particle effects |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/QuickUpload.vue` | Added score fetching logic and notification display |
| `src/i18n/locales/en.json` | Added 8 notification strings |
| `src/i18n/locales/es.json` | Added 8 notification strings (Spanish) |

---

## 🎨 Themes & Animations

| Score Change | Theme | Animation | Gradient Colors |
|--------------|-------|-----------|-----------------|
| +5 or more | 🎉 Celebration | Confetti | Green → Yellow |
| +1 to +4 | 📈 Improvement | Sparkles | Blue → Cyan |
| 0 | ✅ Maintained | Checkmark | Cyan → Mint |
| -1 to -4 | 🌵 Slow Progress | Tumbleweed | Orange → Brown |
| -5 or more | 📉 Declining | Raindrops | Red → Orange |

---

## 🔧 Technical Details

### Architecture

**Frontend (Vue 3)**:
- `ScoreNotificationModal.vue`: Teleported modal with 50 animated particles
- `scoreNotification.ts`: Theme detection and score notification creation
- `QuickUpload.vue`: Integration with upload flow
- `analytics.ts`: API client for score fetching

**Backend API**:
- Endpoint: `GET /api/analytics/expense-visibility-score?locale={locale}`
- Returns: Score data + localized feedback message
- Cache: 2-hour server-side cache for performance

### Data Flow

```
1. User clicks "Process File"
   ↓
2. Fetch score (before upload)
   GET /api/analytics/expense-visibility-score?locale=en
   Response: { totalScore: 72, feedbackMessage: "...", ... }
   ↓
3. Upload receipt (async job system)
   POST /api/upload
   ↓
4. Wait 2 seconds for processing
   ↓
5. Fetch score (after upload)
   GET /api/analytics/expense-visibility-score?locale=en
   Response: { totalScore: 85, feedbackMessage: "...", ... }
   ↓
6. Calculate change: +13
   ↓
7. Select theme: CELEBRATION (+5 or more)
   ↓
8. Show animated modal with confetti
   ↓
9. User clicks "Awesome!" → dismiss
```

---

## 🌐 Localization

### English (en.json)

```json
{
  "score": {
    "notification": {
      "celebration": { "title": "Amazing Progress!" },
      "improvement": { "title": "Great Job!" },
      "maintained": { "title": "Solid Work!" },
      "slow": { "title": "Keep Going!" },
      "declining": { "title": "Don't Give Up!" },
      "previous": "Previous",
      "new": "New",
      "awesome": "Awesome!"
    }
  }
}
```

### Spanish (es.json)

```json
{
  "score": {
    "notification": {
      "celebration": { "title": "¡Progreso Increíble!" },
      "improvement": { "title": "¡Buen Trabajo!" },
      "maintained": { "title": "¡Sólido!" },
      "slow": { "title": "¡Sigue Así!" },
      "declining": { "title": "¡No Te Rindas!" },
      "previous": "Anterior",
      "new": "Nuevo",
      "awesome": "¡Genial!"
    }
  }
}
```

---

## 🎬 User Experience

1. User opens app and navigates to Upload view
2. Selects or drags/drops a receipt file
3. Clicks "Process File"
4. Score fetched before upload (silent, non-blocking)
5. Receipt uploads (shows "Processing..." message)
6. After 2 seconds, score fetched again
7. ✨ **Animated modal appears** showing:
   - Theme emoji bouncing
   - Previous score → New score with arrow
   - Score change badge (+13 in green)
   - Localized feedback message
   - Gradient background matching theme
   - 50 floating animated particles
8. User clicks "Awesome!" button
9. Modal dismisses with smooth animation
10. User continues working

---

## ⚡ Performance

- **Particle Count**: 50 per modal (fixed, not continuous)
- **API Calls**: 2 per upload (before + after)
- **Animation**: CSS transitions + keyframes (GPU-accelerated)
- **Memory**: Particles cleaned up on modal dismiss
- **Network**: Gracefully handles API failures (non-blocking)
- **Cache**: Backend caches scores for 2 hours

---

## 🔍 Error Handling

### Graceful Degradation

- **Score fetch fails (before)**: Upload proceeds normally, no notification shown
- **Upload fails**: Standard error handling, no score notification
- **Score fetch fails (after)**: No notification shown, doesn't block user
- **API timeout**: Non-blocking, logged to console

### Console Logs

```javascript
// Success flow
"Score before upload: 72"
"Upload started with job ID: abc123"
"Score after upload: 85 Previous: 72"

// Error handling
"Could not fetch score before upload (non-blocking): Error message"
"Could not fetch score after upload (non-blocking): Error message"
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Upload receipt → verify score fetches silently
- [ ] Upload completes → verify notification appears after 2 seconds
- [ ] Different score changes → verify correct themes:
  - [ ] +10 → Celebration (🎉 confetti)
  - [ ] +3 → Improvement (📈 sparkles)
  - [ ] 0 → Maintained (✅ checkmark)
  - [ ] -2 → Slow Progress (🌵 tumbleweed)
  - [ ] -8 → Declining (📉 raindrops)
- [ ] English language → verify English strings
- [ ] Spanish language → verify Spanish strings
- [ ] Click "Awesome!" → verify modal dismisses smoothly
- [ ] Network failure → verify upload still works (graceful degradation)
- [ ] API timeout → verify no notification shown (graceful)

### Automated Testing

The feature has been type-checked and no TypeScript errors were introduced. Existing test suite passes.

---

## 🚀 Deployment

### Prerequisites

- Backend API running with `/api/analytics/expense-visibility-score` endpoint
- Node.js v22 (required by frontend)
- User must be authenticated (cookie-based auth)

### Build Commands

```bash
# Development (with type checking)
nvm use 22
npm run dev

# Production build
npm run build

# Type check
npm run type-check
```

### Environment Setup

No additional environment variables required. Uses existing API configuration.

---

## 📚 API Integration

### Request

```
GET /api/analytics/expense-visibility-score?locale=en
Cookie: [authentication cookie]
```

### Response

```json
{
  "totalScore": 85,
  "breakdown": {
    "daysTracked": { "score": 90, "weight": 0.4 },
    "categoryDiversity": { "score": 75, "weight": 0.3 },
    "itemDetailRichness": { "score": 90, "weight": 0.3 }
  },
  "metrics": {
    "totalDays": 45,
    "categoriesUsed": 12,
    "averageItemsPerReceipt": 5.2
  },
  "feedbackMessage": "Amazing! You're crushing it at 85/100...",
  "isNewUser": false
}
```

### Error Responses

- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Backend error (gracefully handled)
- `504 Gateway Timeout`: Score calculation timeout (gracefully handled)

---

## 🎨 Animation Details

### Particle System

- **Count**: 50 particles per theme
- **Emojis**: Theme-specific (5 variations per theme)
- **Animations**: 5 types (up, down, left, right, diagonal)
- **Duration**: Random 2-5 seconds
- **Delay**: Random 0-2 seconds
- **Opacity**: Random 0.3-0.9
- **Size**: Random 10-30px

### CSS Animations

```css
@keyframes float-up {
  0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(0deg); }
  50% { transform: translate(-50%, -50%) translateY(-20px) rotate(180deg); }
}

/* + 4 more animation types */

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
```

---

## 🔗 Related Features

### Dependencies

- Expense Visibility Score calculation (backend)
- Score Message Service (backend localization)
- Receipt upload system (QuickUpload component)
- Async job processing system
- API authentication (cookie-based)

### Related Components

- `QuickUpload.vue` - Receipt upload component
- `useAsyncJobs` - Async job management composable
- `useJobNotifications` - Job notification system

---

## 📝 Notes

- Notification only appears after successful upload initiation
- Score updates immediately after backend processes receipt
- Message comes from backend (not hardcoded in frontend)
- Particles use CSS animations for smooth performance
- Tumbleweed animation is intentionally sarcastic 🌵
- Modal uses Vue Teleport for proper z-index layering

---

## ✅ Completion Status

**All tasks completed**:
- [x] TypeScript models defined with 5 themes
- [x] Vue component created with animations
- [x] Integrated into upload flow
- [x] Localized (English + Spanish)
- [x] Error handling implemented
- [x] Documentation written
- [x] Type-checked successfully

---

## 📞 Support

**If notification breaks**:
1. Check browser console for errors
2. Verify API endpoint is reachable
3. Test score fetch manually
4. Check localization files are present
5. Verify user is authenticated

**If animations lag**:
1. Test on different browser
2. Check GPU acceleration enabled
3. Reduce particle count if needed (edit component)
4. Test on physical device (not VM)

---

**Last Updated**: November 9, 2025
**Version**: 1.0
**Author**: Claude Code
**Project**: ShopTrack Frontend (Vue 3)
