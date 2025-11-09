# Score Notification Feature - Quick Reference

## 📋 Implementation Summary

**Feature**: Animated score change notifications after receipt uploads
**Status**: ✅ Complete and Ready for Testing
**Files Created**: 3
**Files Modified**: 3
**Localizations**: English + Spanish

---

## 🎯 What It Does

After uploading a receipt:
1. Fetches score before upload (silent)
2. Uploads receipt normally
3. Fetches score after upload (after 2s delay)
4. Shows beautiful animated modal with score change
5. User dismisses → continues working

---

## 📁 File Changes

### New Files

| File | Location | Purpose |
|------|----------|---------|
| `scoreNotification.ts` | `src/types/` | Models + theme logic |
| `analytics.ts` | `src/services/` | Score API service |
| `ScoreNotificationModal.vue` | `src/components/` | Animated modal UI |

### Modified Files

| File | Changes |
|------|---------|
| `QuickUpload.vue` | Added score fetching & notification display |
| `en.json` | Added 8 notification strings |
| `es.json` | Added 8 notification strings |

### Documentation

| File | Purpose |
|------|---------|
| `SCORE_NOTIFICATION_FEATURE.md` | Complete feature documentation |
| `SCORE_NOTIFICATION_QUICK_REFERENCE.md` | This file |

---

## 🎨 Themes & Animations

| Score Change | Theme | Animation | Colors |
|--------------|-------|-----------|--------|
| +5 or more | 🎉 Celebration | Confetti | Green → Yellow |
| +1 to +4 | 📈 Improvement | Sparkles | Blue → Cyan |
| 0 | ✅ Maintained | Checkmark | Cyan → Mint |
| -1 to -4 | 🌵 Slow Progress | Tumbleweed | Orange → Brown |
| -5 or more | 📉 Declining | Raindrops | Red → Orange |

---

## 🔧 Key Code Snippets

### Creating a Notification (TypeScript)

```typescript
import { createScoreNotification } from '@/types/scoreNotification'

const notification = createScoreNotification(
  72,  // previous score
  85,  // new score
  'Amazing! You\'re crushing it at 85/100...'  // message from API
)
```

### Displaying the Modal (Vue)

```vue
<template>
  <ScoreNotificationModal
    v-if="scoreNotification"
    :notification="scoreNotification"
    :show="showScoreNotification"
    @dismiss="handleDismiss"
  />
</template>

<script setup>
import { ref } from 'vue'
import ScoreNotificationModal from '@/components/ScoreNotificationModal.vue'
import type { ScoreNotification } from '@/types/scoreNotification'

const scoreNotification = ref<ScoreNotification | null>(null)
const showScoreNotification = ref(false)

const handleDismiss = () => {
  showScoreNotification.value = false
  scoreNotification.value = null
}
</script>
```

### Fetching Score (Analytics Service)

```typescript
import { analyticsService } from '@/services/analytics'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// Fetch score with localized message
const score = await analyticsService.getExpenseVisibilityScore(locale.value)
console.log(score.totalScore)  // 85
console.log(score.feedbackMessage)  // "Amazing! You're crushing it..."
```

---

## 🌐 Localization Keys

```
score.notification.celebration.title
score.notification.improvement.title
score.notification.maintained.title
score.notification.slow.title
score.notification.declining.title
score.notification.previous
score.notification.new
score.notification.awesome
```

---

## 🔍 Debugging

### Check Console Logs

```
✅ Success:
"Score before upload: 72"
"Upload started with job ID: abc123"
"Score after upload: 85 Previous: 72"

⚠️ Graceful Failures:
"Could not fetch score before upload (non-blocking): Error"
"Could not fetch score after upload (non-blocking): Error"
```

### Common Issues

**Notification not showing?**
- Check browser console for errors
- Verify API endpoint is reachable (`/api/analytics/expense-visibility-score`)
- Check user is authenticated (cookie present)
- Verify score changed (or maintained for first upload)

**Animations laggy?**
- Test on different browser (Chrome/Firefox/Safari)
- Check GPU acceleration enabled
- Test on physical device (not VM)

**Wrong language?**
- Verify `locale.value` in console
- Check fallback to English working
- Verify i18n plugin loaded

---

## 🧪 Testing Checklist

- [ ] Upload receipt when score will increase (+5 = confetti)
- [ ] Upload receipt when score maintains (same = checkmark)
- [ ] Upload receipt when score decreases (-3 = tumbleweed)
- [ ] Test on English locale
- [ ] Test on Spanish locale
- [ ] Test error handling (disconnect network mid-upload)
- [ ] Verify navigation works after dismiss
- [ ] Check animations smooth on device
- [ ] Verify particles cleanup on dismiss

---

## 📊 API Integration

**Endpoint**: `GET /api/analytics/expense-visibility-score?locale={locale}`

**Authentication**: Cookie-based (automatic via axios interceptor)

**Response**:
```json
{
  "totalScore": 85,
  "breakdown": { ... },
  "metrics": { ... },
  "feedbackMessage": "Amazing! You're crushing it...",
  "isNewUser": false
}
```

---

## 🎬 User Flow Example

```
1. User opens ShopTrack web app
2. Navigates to Upload view
3. Selects/drags receipt file
4. Clicks "Process File"
5. [Score fetched silently: 72]
6. Upload starts (shows success message)
7. [Wait 2 seconds]
8. [Score fetched: 85]
9. ✨ Modal appears with confetti animation
10. Shows: "72 → 85" with "+13" badge
11. Message: "Amazing! You're crushing it at 85/100..."
12. User clicks "Awesome!"
13. Modal dismisses smoothly
14. User continues working
```

---

## ⚡ Performance Notes

- **Particles**: 50 per modal (fixed count)
- **API Calls**: 2 per upload (before + after)
- **Cache**: Backend caches scores for 2 hours
- **Memory**: Particles released on modal dismiss
- **Network**: Gracefully handles failures
- **Animation**: GPU-accelerated CSS transitions

---

## 🚀 Build & Deploy

### Development

```bash
# Use correct Node version
nvm use 22

# Start dev server
npm run dev

# Access at http://localhost:5173
```

### Production

```bash
# Type check
npm run type-check

# Build
npm run build

# Preview build
npm run preview
```

### Deploy

```bash
# Fly.io deployment
fly deploy
```

---

## 🔗 Related Features

**Dependencies**:
- Expense Visibility Score calculation (backend)
- Score Message Service (backend localization)
- Receipt upload system (QuickUpload)
- Async job processing
- API authentication

**Related Components**:
- `QuickUpload.vue` - Upload interface
- `useAsyncJobs` - Job management
- `useJobNotifications` - Notifications

---

## 📝 Notes

- Notification only appears after successful upload
- Score updates immediately after backend processes receipt
- Message comes from backend (not hardcoded)
- Animations use CSS for smooth performance
- Tumbleweed is intentionally sarcastic 🌵
- Modal uses Teleport for proper layering

---

## ✅ Completion Criteria

All completed ✓
- [x] Models defined with 5 themes
- [x] Component created with animations
- [x] Integrated into upload flow
- [x] Localized (EN + ES)
- [x] Error handling implemented
- [x] Documentation written
- [x] Type-checked successfully

---

**Last Updated**: November 9, 2025
**Version**: 1.0
**Author**: Claude Code
**Project**: ShopTrack Frontend (Vue 3)
