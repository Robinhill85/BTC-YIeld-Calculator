# BTC Yield Calculator - MVP Specification

**Deadline:** Monday, Feb 10, 2026 6:00 AM GMT  
**Purpose:** Demo tool for IXS Finance campaign showing missed yield opportunity

---

## Core Functionality

### User Inputs
1. **Start Date** - When they bought BTC (date picker, min: 2010-07-18, max: today)
2. **BTC Amount** - How much BTC they hold (number input, 0.001 - 1000 range)
3. **Yield %** - Annual yield rate (slider, 3% - 10%, default: 5%)

### Outputs
1. **2-Line Chart:**
   - Blue line: "Just Holding" (flat BTC amount, USD value changes with price)
   - Green line: "Holding + Yield" (growing BTC amount with compounding, USD value)
   - X-axis: Monthly intervals from start date to today
   - Y-axis: USD value

2. **ATH Marker:**
   - Red dot/annotation at BTC all-time high point
   - Shows what they missed at peak: "At $69K on Nov 10, 2021: You missed $X,XXX"

3. **Summary Stats (below chart):**
   - Start: X BTC = $X,XXX (on start date)
   - Today: 
     * Just holding: X BTC = $X,XXX
     * With yield: X.XX BTC = $X,XXX
   - **Total missed: $X,XXX** (big, red, bold)

---

## Technical Stack

**Frontend:**
- HTML/CSS/JavaScript (vanilla, no framework for MVP speed)
- Chart.js for visualization
- Mobile-first responsive design

**Data Source:**
- CoinGecko API (free tier): `/coins/bitcoin/market_chart/range`
- Historical BTC prices from start date to today
- Endpoint: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from={unix_timestamp}&to={unix_timestamp}`

**Hosting:**
- Static site (Netlify, Vercel, or GitHub Pages)
- No backend needed for MVP

---

## Calculation Logic

### 1. Fetch Historical BTC Prices
- Get daily BTC USD prices from start date to today
- Identify ATH date and price in that range

### 2. Calculate "Just Holding" Path
For each month:
- BTC amount stays constant
- USD value = BTC amount × BTC price on that date

### 3. Calculate "Holding + Yield" Path
For each month:
- BTC amount compounds: `BTC_new = BTC_old × (1 + annual_yield / 12)`
- USD value = BTC amount × BTC price on that date

### 4. Find ATH Missed Opportunity
At ATH date:
- Just holding: X BTC × ATH price = $A
- With yield: Y BTC × ATH price = $B
- Missed at peak: $B - $A

---

## UI/UX Flow

### Landing State
```
+------------------------------------------+
|  How Much BTC Yield Did You Miss?       |
|                                          |
|  [Date Picker] Start Date: Jan 1, 2021  |
|  [Number Input] BTC Amount: 1.0         |
|  [Slider] Yield %: ●────── 5%           |
|                                          |
|         [Calculate My Missed Yield]     |
+------------------------------------------+
```

### Results State
```
+------------------------------------------+
| [Chart showing 2 lines + ATH marker]    |
|                                          |
| 📍 Nov 10, 2021 (BTC ATH: $69,000)      |
| You missed $3,450 at the peak           |
|                                          |
| Summary:                                 |
| Start: 1.00 BTC = $29,000               |
| Today: 1.00 BTC = $95,000 (just hold)   |
| Today: 1.26 BTC = $119,700 (with yield) |
|                                          |
| 🔴 Total Missed: $24,700                |
|                                          |
| [Start Earning with IXS →]              |
| [Calculate Again]                        |
+------------------------------------------+
```

---

## MVP Scope (What's Included)

✅ Historical price data (CoinGecko API)  
✅ 2-line chart (Just Hold vs Yield)  
✅ Monthly data points  
✅ ATH marker with annotation  
✅ Summary stats with "Total Missed" in red  
✅ Mobile responsive  
✅ Basic styling (clean, readable)  

## Post-MVP (Week 2 Features)

❌ X connect gate (auth + follow requirement)  
❌ Share image generation  
❌ Future projection mode  
❌ Multiple ATH markers  
❌ Export to PDF  
❌ Advanced styling/animations  

---

## Files Structure

```
btc-yield-calculator/
├── README.md (this file)
├── index.html
├── style.css
├── script.js
└── deploy.sh (optional, for quick deploy)
```

---

## API Rate Limits

**CoinGecko Free Tier:**
- 10-30 calls/minute (enough for MVP)
- No API key required for basic endpoints
- Fallback: Use daily prices to reduce calls (1 call per calculation)

---

## Testing Checklist

Before Monday 6am demo:
- [ ] Test with multiple date ranges (2017, 2020, 2021, 2024)
- [ ] Test with small amounts (0.01 BTC) and large (10 BTC)
- [ ] Test with different yield % (3%, 5%, 10%)
- [ ] Verify ATH detection works (should show Nov 2021 peak)
- [ ] Test on mobile (Chrome Android, Safari iOS)
- [ ] Check chart readability (legend, axes, tooltips)
- [ ] Verify CoinGecko API doesn't rate limit

---

## Known Limitations (MVP)

1. **Daily price data only** - Not hourly (fine for demo)
2. **Single ATH marker** - Only shows global ATH, not local peaks
3. **No error handling** - Assumes API always works (add in v2)
4. **No caching** - Fetches fresh data every time (slow, but functional)
5. **Simple design** - Functional, not polished (beautify in v2)

---

## Demo Talking Points (for Robin)

When showing to IXS on Monday:

> "This calculator shows BTC holders exactly what they missed by not earning yield.
> 
> Example: Someone who bought 1 BTC in Jan 2021 for $29K.
> 
> At the peak in Nov 2021, if they had 5% yield, they would've had $72K instead of $69K.
> 
> Today, they'd have $119K instead of $95K. That's $24K left on the table.
> 
> The ATH marker hits hard - shows they timed it right but still missed out.
> 
> Next steps: Add X connect gate, make it shareable, embed on landing page."

---

## Deployment

**Option 1: Netlify (recommended for speed)**
```bash
cd btc-yield-calculator
# Drag folder into Netlify web UI
# Live in 30 seconds
```

**Option 2: Vercel**
```bash
cd btc-yield-calculator
vercel --prod
```

**Option 3: GitHub Pages**
```bash
git init
git add .
git commit -m "BTC Yield Calculator MVP"
gh repo create btc-yield-calculator --public
git push -u origin main
# Enable GitHub Pages in repo settings
```

---

**Built for:** IXS Finance Campaign  
**Timeline:** Friday evening → Monday 6am (60 hours)  
**Status:** Spec complete, building now...
