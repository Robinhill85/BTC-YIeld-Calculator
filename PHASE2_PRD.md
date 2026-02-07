# BTC Yield Calculator - Phase 2 Features PRD

**Project:** IXS Finance BTC Yield Calculator  
**Version:** 2.0  
**Date:** February 7, 2026  
**Status:** Ready for Implementation  

---

## Overview

This PRD defines three enhancement features for the BTC Yield Calculator to increase viral shareability, historical insight, and future planning capabilities.

**Current State:**
- Live MVP at https://btc-yield-calculator.vercel.app
- Dark IXS-branded theme with teal/orange accents
- CryptoCompare API for historical BTC prices
- Basic 2-line chart (holding vs yield)
- Single ATH marker (global peak)
- Custom date range support

**Goals:**
1. **Increase viral sharing** - Make it easy for users to share results on X/Twitter
2. **Richer historical context** - Show multiple ATH markers for comprehensive view
3. **Forward-looking utility** - Let users project future yield scenarios

---

## Feature 1: Share Feature (High Priority)

### Description
Generate a shareable image with user's specific results and enable one-click sharing to X/Twitter for viral growth.

### User Story
> "As a BTC holder who just calculated my missed yield, I want to share my results on X with one click so my followers can see how much I left on the table and try the calculator themselves."

### Requirements

#### Functional Requirements

**FR-1.1: Generate Shareable Image**
- When user clicks "Share Results" button, generate a PNG image containing:
  - IXS logo (top-left)
  - User's start and end dates
  - BTC amount held
  - Total missed yield amount (large, prominent in orange)
  - Simplified mini chart (2 lines, no interactivity)
  - Calculator URL with UTM tracking: `btc-yield-calculator.vercel.app?utm_source=twitter`
  - Brand colors (dark background, teal/orange accents)

**FR-1.2: One-Click Share to X**
- "Share on X" button opens X composer with:
  - Pre-filled text: `I left $[amount] on the table by not earning yield on my Bitcoin. 😬\n\nCalculate yours:`
  - Calculator URL (with UTM tracking)
  - Generated image attached (if browser supports it)

**FR-1.3: Download Option**
- "Download Image" button saves PNG locally
- Filename format: `btc-yield-missed-[amount].png`

#### Technical Specifications

**Canvas Image Generation:**
```javascript
// Use HTML Canvas API to render image
function generateShareImage(result) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630; // Twitter card optimized size
  const ctx = canvas.getContext('2d');
  
  // Dark background with gradient (IXS brand)
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#1a2332');
  gradient.addColorStop(1, '#0d3d3d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  
  // IXS Logo (text-based for simplicity)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('IXS®', 40, 60);
  
  // Main stat (Total Missed)
  ctx.fillStyle = '#F39C12';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(`$${formatNumber(result.totalMissed)} Missed`, 40, 200);
  
  // Supporting text
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px sans-serif';
  ctx.fillText(`${result.startDate} to ${result.endDate}`, 40, 260);
  ctx.fillText(`${result.btcAmount} BTC held`, 40, 310);
  
  // Mini chart (simplified - just key data points)
  drawMiniChart(ctx, result.chartData, 40, 350, 1100, 200);
  
  // URL
  ctx.fillStyle = '#00B8A9';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('btc-yield-calculator.vercel.app', 40, 600);
  
  return canvas.toDataURL('image/png');
}
```

**X Share Integration:**
```javascript
function shareToX(imageDataUrl, totalMissed) {
  const text = encodeURIComponent(
    `I left $${formatNumber(totalMissed)} on the table by not earning yield on my Bitcoin. 😬\n\nCalculate yours:`
  );
  const url = encodeURIComponent('https://btc-yield-calculator.vercel.app?utm_source=twitter');
  
  // Open X composer (image attachment requires user to manually add it)
  const xUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  window.open(xUrl, '_blank', 'width=600,height=400');
  
  // Note: Programmatic image upload to X requires backend OAuth
  // For MVP, user can manually attach the downloaded image
}
```

**Download Image:**
```javascript
function downloadImage(imageDataUrl, totalMissed) {
  const link = document.createElement('a');
  link.download = `btc-yield-missed-${totalMissed}.png`;
  link.href = imageDataUrl;
  link.click();
}
```

#### UI/UX Requirements

**Button Placement:**
- Add "Share Results" section below summary stats, above CTAs
- Two buttons side-by-side:
  - **Primary:** "Share on X" (teal background, white text)
  - **Secondary:** "Download Image" (transparent, teal border)

**Image Preview:**
- Show small preview of generated image when user hovers "Share on X"
- Optional: Modal preview before sharing

**Error Handling:**
- If canvas generation fails, show error: "Unable to generate image. Try again."
- Fallback to text-only share (no image)

#### Acceptance Criteria
- [ ] User can generate shareable image with their results
- [ ] "Share on X" opens Twitter composer with pre-filled text and URL
- [ ] "Download Image" saves PNG locally with correct filename
- [ ] Image is 1200x630px (Twitter card optimized)
- [ ] Image matches IXS brand colors and styling
- [ ] UTM tracking works (check analytics for `utm_source=twitter` traffic)
- [ ] Works on mobile (canvas generation + download)

---

## Feature 2: Multiple ATH Markers (High Priority)

### Description
Display all significant all-time high (ATH) markers within the selected date range, not just the global ATH, to show multiple "missed opportunities at the peak" moments.

### User Story
> "As a long-term BTC holder who bought in 2017, I want to see both the 2017 ATH (~$20K) and 2021 ATH (~$69K) on the chart so I can understand how much yield I missed at each peak."

### Requirements

#### Functional Requirements

**FR-2.1: Detect Multiple ATH Peaks**
- Scan historical price data within selected date range
- Identify all local maximums that qualify as "significant ATH"
- Criteria for ATH:
  - Price is ≥15% higher than surrounding 30-day average
  - Peak lasts at least 3 consecutive days
  - Price drops ≥20% after the peak (confirming it was a top)
  - Minimum 6 months between ATH markers (avoid too many)

**FR-2.2: Display ATH Markers on Chart**
- Each ATH shown as red vertical line with marker
- Label shows date and price: "Nov 10, 2021 - $69,000"
- Tooltip on hover shows:
  - Date
  - BTC price at peak
  - User's holding value at that time
  - User's yield value at that time
  - Missed $ at that peak

**FR-2.3: ATH Summary Below Chart**
- If multiple ATH detected, show consolidated callout:
  ```
  📍 Multiple Bitcoin Peaks Detected
  
  Peak 1: Dec 17, 2017 - $19,783
  You missed $1,200 at this peak
  
  Peak 2: Nov 10, 2021 - $69,000
  You missed $3,450 at this peak
  
  Total missed across all peaks: $4,650
  ```

#### Technical Specifications

**ATH Detection Algorithm:**
```javascript
function detectATHMarkers(prices, startDate, endDate) {
  const athMarkers = [];
  const priceArray = prices.map(p => p[1]); // Extract prices
  
  for (let i = 30; i < priceArray.length - 30; i++) {
    const currentPrice = priceArray[i];
    
    // Check if local maximum
    const before30 = priceArray.slice(i - 30, i);
    const after30 = priceArray.slice(i + 1, i + 31);
    const avgBefore = before30.reduce((a, b) => a + b) / 30;
    const avgAfter = after30.reduce((a, b) => a + b) / 30;
    
    // Criteria: 15% above before, 20% drop after
    if (currentPrice > avgBefore * 1.15 && avgAfter < currentPrice * 0.8) {
      // Check if peak lasts 3+ days
      const sustained = priceArray.slice(i, i + 3).every(p => p >= currentPrice * 0.98);
      
      if (sustained) {
        // Check minimum 6 months from last ATH
        const lastATH = athMarkers[athMarkers.length - 1];
        const sixMonthsAgo = lastATH ? lastATH.timestamp - (180 * 86400 * 1000) : 0;
        
        if (!lastATH || prices[i][0] > sixMonthsAgo) {
          athMarkers.push({
            timestamp: prices[i][0],
            price: currentPrice,
            date: new Date(prices[i][0]),
            index: i
          });
        }
      }
    }
  }
  
  return athMarkers;
}
```

**Chart Annotation:**
```javascript
// Add to Chart.js options
options: {
  plugins: {
    annotation: {
      annotations: athMarkers.map((ath, index) => ({
        type: 'line',
        xMin: ath.date,
        xMax: ath.date,
        borderColor: '#F39C12',
        borderWidth: 3,
        borderDash: [5, 5],
        label: {
          content: `ATH: $${formatNumber(ath.price)}`,
          enabled: true,
          position: 'top',
          backgroundColor: 'rgba(243, 156, 18, 0.8)',
          color: '#ffffff'
        }
      }))
    }
  }
}
```

**ATH Callout UI:**
```html
<div class="ath-callout" id="athCallout">
  <p class="ath-title">📍 Multiple Bitcoin Peaks Detected</p>
  <div id="athList">
    <!-- Populated dynamically -->
  </div>
</div>
```

#### UI/UX Requirements

**Chart Updates:**
- Red dashed vertical lines at each ATH date
- Orange marker dot at intersection with price line
- Label shows date + price above line
- Hover tooltip shows full missed yield breakdown

**ATH Callout Box:**
- Only show if 2+ ATH detected
- Orange left border (matches ATH accent color)
- Light orange background
- List all ATH chronologically
- Show missed $ at each peak
- Bold "Total missed across all peaks" at bottom

**Mobile Optimization:**
- ATH labels rotate 45° on small screens (avoid overlap)
- Tap to see full ATH details on mobile

#### Acceptance Criteria
- [ ] Algorithm correctly detects multiple ATH within date range
- [ ] Chart displays red dashed lines at each ATH date
- [ ] Hover tooltip shows missed yield breakdown per ATH
- [ ] ATH callout box lists all detected peaks with dates and missed $
- [ ] Works for date ranges spanning 2017-2021 (2 major peaks)
- [ ] No false positives (minor bumps not flagged as ATH)
- [ ] Performance: ATH detection completes in <500ms for 10-year range

---

## Feature 3: Future Projection Toggle (Medium Priority)

### Description
Add optional "Project Forward" mode that calculates future yield scenarios, helping users visualize "what if I start earning yield NOW."

### User Story
> "As a BTC holder considering IXS, I want to see how much more BTC I'll accumulate if I start earning yield today and project 3-5 years into the future."

### Requirements

#### Functional Requirements

**FR-3.1: Toggle Switch**
- Add "Project Forward?" toggle switch below end date input
- When enabled, show new inputs:
  - **Projection End Date** (date picker, min: today + 1 day, max: today + 10 years)
  - **Projection Model** (dropdown):
    - Conservative (BTC price grows 10% annually)
    - Plan B S2F Model (stock-to-flow based)
    - Flat (BTC price stays same)

**FR-3.2: Future Price Projection**
- **Conservative Model:**
  ```javascript
  futurePrice = currentPrice * Math.pow(1.10, yearsFromNow)
  ```
  
- **Plan B S2F Model:**
  ```javascript
  // Simplified S2F: Price = 0.4 * (stock/flow)^3
  // Bitcoin halving every 4 years, next halving: 2028
  function planBProjection(currentPrice, yearsFromNow) {
    const halvings = Math.floor(yearsFromNow / 4);
    const stockToFlow = 50 * Math.pow(2, halvings); // Simplification
    return 0.4 * Math.pow(stockToFlow, 3);
  }
  ```
  
- **Flat Model:**
  ```javascript
  futurePrice = currentPrice // No appreciation
  ```

**FR-3.3: Extended Chart**
- Chart extends from current date to projection end date
- Historical data: solid lines (blue/green)
- Projected data: dashed lines (blue/green)
- Vertical marker at "Today" (divide historical from projected)

**FR-3.4: Projection Disclaimer**
- Big disclaimer box above results:
  ```
  ⚠️ Future Projections - Not Financial Advice
  
  Projections are based on [Model Name] and historical patterns.
  Actual results may vary significantly. Bitcoin is volatile.
  
  This calculator does not constitute investment advice.
  ```

**FR-3.5: Updated Summary Stats**
- Change labels when projection enabled:
  - "Today: X BTC = $Y"
  - "Projected [Date]: X BTC = $Y (holding)"
  - "Projected [Date]: X.XX BTC = $Y (with yield)"
  - "Total opportunity: $Z" (instead of "Total missed")

#### Technical Specifications

**Toggle UI:**
```html
<div class="input-group">
  <label for="projectionToggle">
    <input type="checkbox" id="projectionToggle" onchange="toggleProjection()">
    Project Forward? (Experimental)
  </label>
  <div id="projectionInputs" style="display: none;">
    <input type="date" id="projectionEndDate" min="">
    <select id="projectionModel">
      <option value="conservative">Conservative (+10% annually)</option>
      <option value="planb">Plan B S2F Model</option>
      <option value="flat">Flat (no price change)</option>
    </select>
  </div>
</div>
```

**Projection Calculation:**
```javascript
function calculateProjection(currentBTC, currentDate, projectionDate, yieldRate, model) {
  const yearsToProject = (new Date(projectionDate) - new Date(currentDate)) / (365.25 * 86400 * 1000);
  const projectedBTC = currentBTC * Math.pow(1 + yieldRate, yearsToProject);
  
  let projectedPrice;
  switch (model) {
    case 'conservative':
      projectedPrice = getCurrentBTCPrice() * Math.pow(1.10, yearsToProject);
      break;
    case 'planb':
      projectedPrice = planBProjection(getCurrentBTCPrice(), yearsToProject);
      break;
    case 'flat':
      projectedPrice = getCurrentBTCPrice();
      break;
  }
  
  return {
    holdingBTC: currentBTC,
    holdingUSD: currentBTC * projectedPrice,
    yieldBTC: projectedBTC,
    yieldUSD: projectedBTC * projectedPrice,
    opportunity: (projectedBTC - currentBTC) * projectedPrice
  };
}
```

**Chart Update:**
```javascript
// Add projected data with dashed lines
datasets: [
  {
    label: 'Just Holding (Historical)',
    data: historicalHoldingData,
    borderColor: '#4299e1',
    borderDash: [],
    borderWidth: 3
  },
  {
    label: 'Just Holding (Projected)',
    data: projectedHoldingData,
    borderColor: '#4299e1',
    borderDash: [5, 5],
    borderWidth: 2
  },
  // ... same for yield lines
]
```

#### UI/UX Requirements

**Toggle Interaction:**
- Checkbox in form section
- When enabled, show projection inputs with slide-down animation
- Projection end date defaults to +3 years from today
- Projection model defaults to "Conservative"

**Chart Visual Changes:**
- Dashed lines for projected data (clear visual distinction)
- Vertical "Today" marker (solid gray line)
- Legend shows "(Historical)" and "(Projected)" labels

**Disclaimer Box:**
- Yellow/orange background (warning color)
- Large warning icon (⚠️)
- Bold text
- Positioned above results section

**Model Descriptions:**
- Tooltip on each model option explaining methodology:
  - Conservative: "Assumes 10% annual BTC appreciation"
  - Plan B S2F: "Based on stock-to-flow halving cycles"
  - Flat: "Assumes BTC price stays constant"

#### Acceptance Criteria
- [ ] Toggle shows/hides projection inputs smoothly
- [ ] Projection end date validates (min today+1, max today+10y)
- [ ] Conservative model calculates 10% annual growth correctly
- [ ] Plan B S2F model follows halving cycle logic
- [ ] Flat model maintains current price
- [ ] Chart shows dashed lines for projected data
- [ ] "Today" vertical marker divides historical from projected
- [ ] Disclaimer box is prominent and readable
- [ ] Summary stats update with "Projected" labels
- [ ] Works with custom start/end dates + projection

---

## Technical Dependencies

**Required Libraries:**
- Chart.js (already included) - v4.x
- Chart.js Annotation Plugin - for multiple ATH markers
  ```html
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3"></script>
  ```

**Browser Requirements:**
- HTML Canvas API (for image generation)
- Modern ES6 JavaScript
- Local storage (for caching projection preferences)

**API Dependencies:**
- CryptoCompare API (already in use) - no changes needed
- No backend required (all client-side)

---

## Implementation Order

1. **Phase 2.1: Multiple ATH Markers** (Easiest, high impact)
   - Estimated time: 2-3 hours
   - Dependencies: Chart.js Annotation Plugin
   - Deploy first for immediate value

2. **Phase 2.2: Share Feature** (Medium complexity, high viral potential)
   - Estimated time: 3-4 hours
   - Dependencies: Canvas API
   - Deploy second for viral growth

3. **Phase 2.3: Future Projection Toggle** (Most complex, nice-to-have)
   - Estimated time: 4-6 hours
   - Dependencies: Projection models, extended chart logic
   - Deploy last, optional for MVP

---

## Testing Checklist

### Multiple ATH Markers
- [ ] Test 2017-2021 range (should show 2 ATH: Dec 2017, Nov 2021)
- [ ] Test 2020-2021 range (should show 1 ATH: Nov 2021)
- [ ] Test 2022-2026 range (no major ATH, should show none or recent peak)
- [ ] Verify ATH detection doesn't trigger on minor bumps
- [ ] Check ATH callout only shows when 2+ peaks detected
- [ ] Verify mobile: ATH labels readable, no overlap

### Share Feature
- [ ] Generate image on multiple devices (desktop, mobile)
- [ ] Verify image dimensions (1200x630px)
- [ ] Check brand colors match IXS theme
- [ ] Test "Share on X" opens Twitter with pre-filled text
- [ ] Test "Download Image" saves with correct filename
- [ ] Verify UTM tracking in URL
- [ ] Check image quality (readable text, clear chart)

### Future Projection Toggle
- [ ] Toggle shows/hides projection inputs
- [ ] Projection end date validation works
- [ ] Conservative model: verify 10% annual growth math
- [ ] Plan B S2F model: verify halving cycle logic
- [ ] Flat model: verify price stays constant
- [ ] Chart shows dashed lines correctly
- [ ] "Today" marker appears between historical and projected
- [ ] Disclaimer box is visible and prominent
- [ ] Summary stats update with "Projected" labels

---

## Performance Targets

- **ATH Detection:** <500ms for 10-year date range
- **Image Generation:** <2 seconds on average device
- **Projection Calculation:** <300ms for any projection range
- **Chart Rendering:** <1 second with multiple ATH markers + projection

---

## Analytics & Success Metrics

### Share Feature Success
- Track "Share on X" button clicks (Google Analytics event)
- Monitor UTM source traffic: `utm_source=twitter`
- Measure conversion rate: Shares → New users → Calculator usage
- Target: 10% of users who complete calculation share results

### Multiple ATH Markers Impact
- Track avg session time (should increase with richer data)
- Monitor date range selection (users exploring longer ranges?)
- Target: 20% increase in avg session duration

### Future Projection Usage
- Track projection toggle enable rate
- Monitor which projection model is most popular
- Measure conversion: Users who project forward → Click IXS CTA
- Target: 5-10% of users enable projection

---

## Edge Cases & Error Handling

### Share Feature
- **Canvas not supported:** Show error + fallback to text-only share
- **Image generation fails:** Retry once, then fallback
- **X composer blocked (popup blocker):** Show instruction to allow popups

### Multiple ATH Markers
- **No ATH detected:** Show single global ATH as fallback
- **Too many ATH (>5):** Limit to top 5 by price magnitude
- **ATH calculation timeout:** Show "Calculating peaks..." then fallback to single ATH

### Future Projection Toggle
- **Invalid projection end date:** Show error "End date must be after today"
- **Projection too far (>10 years):** Cap at 10 years with warning
- **Model calculation error:** Fallback to Conservative model + log error

---

## Design Assets Needed

### Share Feature
- IXS logo PNG (transparent background) - 200x60px
- Social share icon (X/Twitter logo) - 24x24px

### Multiple ATH Markers
- Peak marker icon (optional) - 16x16px

### Future Projection Toggle
- Warning icon (⚠️) - can use emoji or SVG

---

## Security Considerations

- **XSS Prevention:** Sanitize any user inputs before rendering to canvas
- **URL Safety:** Validate UTM parameters before appending
- **Client-Side Only:** No sensitive data sent to server (all calculations in browser)
- **Rate Limiting:** Consider local rate limiting for image generation (prevent abuse)

---

## Accessibility

### Share Feature
- Alt text for generated images
- Keyboard accessible buttons (Tab + Enter)
- Screen reader announces "Image generated successfully"

### Multiple ATH Markers
- Chart annotations have aria-labels
- ATH callout has proper heading hierarchy

### Future Projection Toggle
- Toggle has associated label
- Dropdown has descriptive options
- Disclaimer uses `role="alert"` for screen readers

---

## Deployment Plan

1. **Test locally:** Build features in dev environment
2. **Git commit:** Descriptive commit messages per feature
3. **Vercel deploy:** Push to production (auto-deploy on commit)
4. **QA:** Test all features on live URL
5. **Rollback plan:** Keep previous working version tagged in Git

---

## Open Questions

1. **Share Feature:** Should we add other social platforms (LinkedIn, Reddit)? Or X-only for MVP?
2. **Multiple ATH:** What's the exact threshold for "significant" ATH? (currently 15% above + 20% drop after)
3. **Future Projection:** Should we add custom price input? (user enters their own BTC price prediction)
4. **All Features:** Do we need backend analytics dashboard? Or Google Analytics sufficient?

---

## Success Definition

**Phase 2 is successful if:**
1. ✅ Share feature drives 10%+ of calculator users to share results on X
2. ✅ Multiple ATH markers increase avg session time by 20%
3. ✅ Future projection toggle converts 5%+ of users to click IXS CTA
4. ✅ No performance degradation (<2s page load with all features)
5. ✅ Zero critical bugs in first 48 hours post-launch

---

**End of PRD**

This document is ready for implementation by Claude Code, Cursor, or any developer. All technical specs, acceptance criteria, and edge cases are defined.
