// Global variables
let myChart = null;
let lastResult = null; // Store for share feature

// Set max date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('startDate').max = today;
document.getElementById('endDate').max = today;

// Set projection date constraints
const todayDate = new Date();
const minProjection = new Date(todayDate);
minProjection.setDate(minProjection.getDate() + 1);
const maxProjection = new Date(todayDate);
maxProjection.setFullYear(maxProjection.getFullYear() + 10);
document.getElementById('projectionEndDate').min = minProjection.toISOString().split('T')[0];
document.getElementById('projectionEndDate').max = maxProjection.toISOString().split('T')[0];

// Default projection end date: today + 3 years
const defaultProjection = new Date(todayDate);
defaultProjection.setFullYear(defaultProjection.getFullYear() + 3);
document.getElementById('projectionEndDate').value = defaultProjection.toISOString().split('T')[0];

// Update yield display
document.getElementById('yieldRate').addEventListener('input', function() {
    document.getElementById('yieldDisplay').textContent = this.value + '%';
});

// Toggle end date visibility
function toggleEndDate() {
    const endDateInput = document.getElementById('endDate');
    const isChecked = document.getElementById('endDateToggle').checked;
    endDateInput.style.display = isChecked ? 'block' : 'none';
    if (!isChecked) {
        endDateInput.value = '';
    }
}

// Toggle projection inputs
function toggleProjection() {
    const inputs = document.getElementById('projectionInputs');
    const isChecked = document.getElementById('projectionToggle').checked;
    inputs.style.display = isChecked ? 'block' : 'none';
}

// ============================================================
// API: Multi-fetch for long date ranges
// ============================================================

async function fetchBTCPrices(startDate, endDate) {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    const daysDiff = Math.ceil((endTimestamp - startTimestamp) / 86400);

    if (daysDiff <= 2000) {
        // Single fetch
        return await fetchPriceChunk(endTimestamp, Math.min(daysDiff + 1, 2000), startTimestamp * 1000, endTimestamp * 1000);
    }

    // Multi-fetch: chain calls in chunks of 2000 days
    let allPrices = [];
    let currentEndTs = endTimestamp;
    let remaining = daysDiff;

    while (remaining > 0) {
        const chunkSize = Math.min(remaining + 1, 2000);
        const chunk = await fetchPriceChunk(currentEndTs, chunkSize, startTimestamp * 1000, endTimestamp * 1000);
        allPrices = allPrices.concat(chunk);

        remaining -= 2000;
        currentEndTs -= 2000 * 86400;
    }

    // Deduplicate by timestamp and sort chronologically
    const seen = new Set();
    const unique = [];
    for (const p of allPrices) {
        if (!seen.has(p[0])) {
            seen.add(p[0]);
            unique.push(p);
        }
    }
    unique.sort((a, b) => a[0] - b[0]);
    return unique;
}

async function fetchPriceChunk(toTs, limit, filterStart, filterEnd) {
    const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${limit}&toTs=${toTs}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch BTC prices from CryptoCompare');
    }

    const data = await response.json();
    if (data.Response === 'Error') {
        throw new Error(data.Message || 'CryptoCompare API error');
    }

    return data.Data.Data
        .map(item => [item.time * 1000, item.close])
        .filter(([ts]) => ts >= filterStart && ts <= filterEnd)
        .sort((a, b) => a[0] - b[0]);
}

// ============================================================
// ATH Detection Algorithm
// ============================================================

function detectATHMarkers(prices) {
    const athMarkers = [];

    if (prices.length < 61) return athMarkers; // Need at least 30+1+30 days

    for (let i = 30; i < prices.length - 30; i++) {
        const currentPrice = prices[i][1];

        // Calculate 30-day average before
        let sumBefore = 0;
        for (let j = i - 30; j < i; j++) sumBefore += prices[j][1];
        const avgBefore = sumBefore / 30;

        // Calculate 30-day average after
        let sumAfter = 0;
        for (let j = i + 1; j <= i + 30; j++) sumAfter += prices[j][1];
        const avgAfter = sumAfter / 30;

        // Criteria: 15% above before average, 20% drop after
        if (currentPrice > avgBefore * 1.15 && avgAfter < currentPrice * 0.8) {
            // Check if peak sustained 3+ days within 2%
            let sustained = true;
            for (let j = i; j < Math.min(i + 3, prices.length); j++) {
                if (prices[j][1] < currentPrice * 0.98) {
                    sustained = false;
                    break;
                }
            }

            if (sustained) {
                // Check minimum 6 months from last ATH
                const lastATH = athMarkers[athMarkers.length - 1];
                const sixMonthsMs = 180 * 86400 * 1000;

                if (!lastATH || (prices[i][0] - lastATH.timestamp) > sixMonthsMs) {
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

    // Limit to top 5 by price magnitude if too many
    if (athMarkers.length > 5) {
        athMarkers.sort((a, b) => b.price - a.price);
        athMarkers.length = 5;
        athMarkers.sort((a, b) => a.timestamp - b.timestamp);
    }

    return athMarkers;
}

// ============================================================
// Projection Models
// ============================================================

function conservativeModel(currentPrice, yearsFromNow) {
    return currentPrice * Math.pow(1.10, yearsFromNow);
}

function planBModel(currentPrice, yearsFromNow) {
    // Simplified S2F: halving every 4 years, next halving ~2028
    // Each halving roughly doubles the "fair value" floor
    const halvings = Math.floor(yearsFromNow / 4);
    const halvingMultiplier = Math.pow(2, halvings);
    // Add gradual growth between halvings
    const yearInCycle = yearsFromNow % 4;
    const intraGrowth = 1 + (yearInCycle * 0.15); // 15% per year within cycle
    return currentPrice * halvingMultiplier * intraGrowth;
}

function flatModel(currentPrice) {
    return currentPrice;
}

function getProjectedPrice(currentPrice, yearsFromNow, model) {
    switch (model) {
        case 'conservative': return conservativeModel(currentPrice, yearsFromNow);
        case 'planb': return planBModel(currentPrice, yearsFromNow);
        case 'flat': return flatModel(currentPrice);
        default: return conservativeModel(currentPrice, yearsFromNow);
    }
}

// ============================================================
// Main Calculation
// ============================================================

async function calculateYield() {
    const startDate = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;
    const endDate = endDateInput || new Date().toISOString().split('T')[0];
    const btcAmount = parseFloat(document.getElementById('btcAmount').value);
    const yieldRate = parseFloat(document.getElementById('yieldRate').value) / 100;
    const projectionEnabled = document.getElementById('projectionToggle').checked;
    const projectionEndDate = document.getElementById('projectionEndDate').value;
    const projectionModel = document.getElementById('projectionModel').value;

    // Validation
    if (!startDate || !btcAmount || btcAmount <= 0) {
        alert('Please fill in all fields with valid values');
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        alert('End date must be after start date');
        return;
    }

    if (projectionEnabled && (!projectionEndDate || new Date(projectionEndDate) <= new Date(endDate))) {
        alert('Projection end date must be after the end date');
        return;
    }

    // Show loading
    document.getElementById('inputForm').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    try {
        const prices = await fetchBTCPrices(startDate, endDate);
        const result = calculatePaths(prices, btcAmount, yieldRate, startDate);

        // Add projection data if enabled
        if (projectionEnabled && projectionEndDate) {
            const lastPrice = prices[prices.length - 1][1];
            const lastDate = new Date(prices[prices.length - 1][0]);
            const projEnd = new Date(projectionEndDate);
            const projMonths = Math.ceil((projEnd - lastDate) / (30 * 86400 * 1000));

            result.projectionEnabled = true;
            result.projectionModel = projectionModel;
            result.projectedHoldingPath = [];
            result.projectedYieldPath = [];

            // Historical end values
            const histEndHolding = result.holdingPath[result.holdingPath.length - 1];
            const histEndYield = result.yieldPath[result.yieldPath.length - 1];
            const startTimestamp = new Date(startDate).getTime();

            // Generate monthly projected data points
            for (let m = 1; m <= projMonths; m++) {
                const projDate = new Date(lastDate);
                projDate.setMonth(projDate.getMonth() + m);
                if (projDate > projEnd) break;

                const yearsFromHistEnd = (projDate - lastDate) / (365.25 * 86400 * 1000);
                const projectedPrice = getProjectedPrice(lastPrice, yearsFromHistEnd, projectionModel);

                // Holding: same BTC, projected price
                result.projectedHoldingPath.push({
                    date: new Date(projDate),
                    btc: btcAmount,
                    usd: btcAmount * projectedPrice,
                    price: projectedPrice
                });

                // Yield: compounding continues from historical end
                const totalYearsFromStart = (projDate.getTime() - startTimestamp) / (365.25 * 86400 * 1000);
                const yieldBTC = btcAmount * Math.pow(1 + yieldRate, totalYearsFromStart);
                result.projectedYieldPath.push({
                    date: new Date(projDate),
                    btc: yieldBTC,
                    usd: yieldBTC * projectedPrice,
                    price: projectedPrice
                });
            }

            // "Today" marker date
            result.todayMarkerDate = lastDate;
        }

        lastResult = result;
        displayResults(result);
    } catch (error) {
        alert('Error fetching data. Please try again.');
        resetCalculator();
    }
}

// Calculate holding vs yield paths
function calculatePaths(prices, initialBTC, annualYield, startDate) {
    const monthlyPrices = sampleMonthly(prices);
    const holdingPath = [];
    const yieldPath = [];
    const startTimestamp = new Date(startDate).getTime();

    // Detect ATH markers on full (non-sampled) data
    const athMarkers = detectATHMarkers(prices);

    // Build ATH detail for each marker
    const athDetails = athMarkers.map(ath => {
        const yearsElapsed = (ath.timestamp - startTimestamp) / (1000 * 60 * 60 * 24 * 365.25);
        const yieldBTC = initialBTC * Math.pow(1 + annualYield, yearsElapsed);
        const holdingUSD = initialBTC * ath.price;
        const yieldUSD = yieldBTC * ath.price;
        return {
            date: ath.date,
            price: ath.price,
            holdingBTC: initialBTC,
            holdingUSD: holdingUSD,
            yieldBTC: yieldBTC,
            yieldUSD: yieldUSD,
            missed: yieldUSD - holdingUSD
        };
    });

    // If no ATH markers detected, find global max as fallback
    let globalATH = null;
    let maxPrice = 0;

    monthlyPrices.forEach((pricePoint) => {
        const [timestamp, price] = pricePoint;
        const date = new Date(timestamp);
        const yearsElapsed = (timestamp - startTimestamp) / (1000 * 60 * 60 * 24 * 365.25);

        const holdingUSD = initialBTC * price;
        holdingPath.push({ date, btc: initialBTC, usd: holdingUSD, price });

        const currentBTC = initialBTC * Math.pow(1 + annualYield, yearsElapsed);
        const yieldUSD = currentBTC * price;
        yieldPath.push({ date, btc: currentBTC, usd: yieldUSD, price });

        if (price > maxPrice) {
            maxPrice = price;
            globalATH = {
                date, price,
                holdingBTC: initialBTC, holdingUSD,
                yieldBTC: currentBTC, yieldUSD,
                missed: yieldUSD - holdingUSD
            };
        }
    });

    return {
        holdingPath,
        yieldPath,
        athMarkers: athDetails,
        globalATH: globalATH,
        startDate: new Date(startDate),
        todayPrice: monthlyPrices[monthlyPrices.length - 1][1],
        projectionEnabled: false
    };
}

// Sample prices monthly
function sampleMonthly(prices) {
    const monthly = [];
    let lastMonth = null;

    prices.forEach(pricePoint => {
        const date = new Date(pricePoint[0]);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthKey !== lastMonth) {
            monthly.push(pricePoint);
            lastMonth = monthKey;
        }
    });

    return monthly;
}

// ============================================================
// Display Results
// ============================================================

function displayResults(result) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('results').style.display = 'block';

    renderChart(result);
    displayATHCallout(result);
    displaySummaryStats(result);

    // Show/hide disclaimer
    const disclaimerBox = document.getElementById('disclaimerBox');
    if (result.projectionEnabled) {
        disclaimerBox.style.display = 'block';
        const modelNames = { conservative: 'Conservative (+10%/yr)', planb: 'Plan B S2F', flat: 'Flat' };
        document.getElementById('disclaimerText').textContent =
            `Projections are based on the ${modelNames[result.projectionModel]} model and historical patterns. Actual results may vary significantly. Bitcoin is volatile. This calculator does not constitute investment advice.`;
    } else {
        disclaimerBox.style.display = 'none';
    }
}

function displayATHCallout(result) {
    const callout = document.getElementById('athCallout');
    const titleEl = document.getElementById('athTitle');
    const listEl = document.getElementById('athList');

    if (result.athMarkers.length >= 2) {
        // Multiple ATH peaks
        callout.style.display = 'block';
        titleEl.textContent = 'Multiple Bitcoin Peaks Detected';

        let html = '';
        let totalMissed = 0;
        result.athMarkers.forEach((ath, i) => {
            totalMissed += ath.missed;
            html += `<div class="ath-peak-item">
                <strong>Peak ${i + 1}: ${formatDate(ath.date)} - $${formatNumber(ath.price)}</strong><br>
                Holding: ${ath.holdingBTC.toFixed(4)} BTC = $${formatNumber(ath.holdingUSD)}<br>
                With yield: ${ath.yieldBTC.toFixed(4)} BTC = $${formatNumber(ath.yieldUSD)}<br>
                <span style="color: #F7931A; font-size: 1.3em; font-weight: 700;">You missed <span style="color: #ffffff; font-size: 1.2em;">$${formatNumber(ath.missed)}</span> at this peak</span>
            </div>`;
        });
        html += `<div class="ath-total"><strong>Total missed across all peaks: $${formatNumber(totalMissed)}</strong></div>`;
        listEl.innerHTML = html;

    } else if (result.athMarkers.length === 1) {
        // Single ATH from detection
        callout.style.display = 'block';
        titleEl.textContent = "At Bitcoin's Peak";
        const ath = result.athMarkers[0];
        listEl.innerHTML = `<div class="ath-peak-item">
            <strong>${formatDate(ath.date)}: BTC hit $${formatNumber(ath.price)}</strong><br>
            Just holding: ${ath.holdingBTC.toFixed(4)} BTC = $${formatNumber(ath.holdingUSD)}<br>
            With yield: ${ath.yieldBTC.toFixed(4)} BTC = $${formatNumber(ath.yieldUSD)}<br>
            <span style="color: #F7931A; font-size: 1.3em; font-weight: 700;">You missed <span style="color: #ffffff; font-size: 1.2em;">$${formatNumber(ath.missed)}</span> at the peak</span>
        </div>`;

    } else if (result.globalATH) {
        // Fallback to global max
        callout.style.display = 'block';
        titleEl.textContent = "At Bitcoin's Peak";
        const ath = result.globalATH;
        listEl.innerHTML = `<div class="ath-peak-item">
            <strong>${formatDate(ath.date)}: BTC hit $${formatNumber(ath.price)}</strong><br>
            Just holding: ${ath.holdingBTC.toFixed(4)} BTC = $${formatNumber(ath.holdingUSD)}<br>
            With yield: ${ath.yieldBTC.toFixed(4)} BTC = $${formatNumber(ath.yieldUSD)}<br>
            <span style="color: #F7931A; font-size: 1.3em; font-weight: 700;">You missed <span style="color: #ffffff; font-size: 1.2em;">$${formatNumber(ath.missed)}</span> at the peak</span>
        </div>`;

    } else {
        callout.style.display = 'none';
    }
}

function displaySummaryStats(result) {
    const startHolding = result.holdingPath[0];
    const isProjection = result.projectionEnabled && result.projectedHoldingPath && result.projectedHoldingPath.length > 0;

    let endHolding, endYield;
    if (isProjection) {
        endHolding = result.projectedHoldingPath[result.projectedHoldingPath.length - 1];
        endYield = result.projectedYieldPath[result.projectedYieldPath.length - 1];
    } else {
        endHolding = result.holdingPath[result.holdingPath.length - 1];
        endYield = result.yieldPath[result.yieldPath.length - 1];
    }

    const totalMissed = endYield.usd - endHolding.usd;

    const endDateInput = document.getElementById('endDate').value;
    let endLabel;
    if (isProjection) {
        endLabel = `Projected (${formatDate(endHolding.date)})`;
    } else if (endDateInput) {
        endLabel = formatDate(endHolding.date);
    } else {
        endLabel = `Today (${formatDate(endHolding.date)})`;
    }

    document.getElementById('startLabel').textContent = `Start (${formatDate(startHolding.date)}):`;
    document.getElementById('endLabelHold').textContent = `${endLabel} (Just Holding):`;
    document.getElementById('endLabelYield').textContent = `${endLabel} (With Yield):`;
    document.getElementById('totalMissedLabel').textContent = isProjection ? 'Total Opportunity:' : 'Total Missed:';

    document.getElementById('startValue').textContent =
        `${startHolding.btc.toFixed(4)} BTC = $${formatNumber(startHolding.usd)}`;
    document.getElementById('todayHoldValue').textContent =
        `${endHolding.btc.toFixed(4)} BTC = $${formatNumber(endHolding.usd)}`;
    document.getElementById('todayYieldValue').textContent =
        `${endYield.btc.toFixed(4)} BTC = $${formatNumber(endYield.usd)}`;
    document.getElementById('totalMissed').textContent =
        `$${formatNumber(totalMissed)}`;
}

// ============================================================
// Chart Rendering
// ============================================================

function renderChart(result) {
    const ctx = document.getElementById('yieldChart').getContext('2d');

    if (myChart) {
        myChart.destroy();
    }

    const labels = result.holdingPath.map(p => formatDate(p.date));
    const holdingData = result.holdingPath.map(p => p.usd);
    const yieldData = result.yieldPath.map(p => p.usd);

    const datasets = [
        {
            label: 'Just Holding',
            data: holdingData,
            borderColor: '#888888',
            backgroundColor: 'rgba(136, 136, 136, 0.08)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        },
        {
            label: 'Holding + Yield',
            data: yieldData,
            borderColor: '#F7931A',
            backgroundColor: 'rgba(247, 147, 26, 0.08)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        }
    ];

    // Add projected data if enabled
    if (result.projectionEnabled && result.projectedHoldingPath) {
        const projLabels = result.projectedHoldingPath.map(p => formatDate(p.date));
        const projHoldingData = result.projectedHoldingPath.map(p => p.usd);
        const projYieldData = result.projectedYieldPath.map(p => p.usd);

        // Pad historical data with nulls for projected range
        const historicalLen = labels.length;
        const projLen = projLabels.length;

        // Bridge: connect last historical point to first projected point
        const bridgeHolding = new Array(historicalLen).fill(null);
        bridgeHolding[historicalLen - 1] = holdingData[historicalLen - 1]; // Last historical value
        const fullProjHolding = bridgeHolding.concat(projHoldingData);

        const bridgeYield = new Array(historicalLen).fill(null);
        bridgeYield[historicalLen - 1] = yieldData[yieldData.length - 1];
        const fullProjYield = bridgeYield.concat(projYieldData);

        // Extend labels
        labels.push(...projLabels);

        datasets.push({
            label: 'Just Holding (Projected)',
            data: fullProjHolding,
            borderColor: '#888888',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        });

        datasets.push({
            label: 'Holding + Yield (Projected)',
            data: fullProjYield,
            borderColor: '#F7931A',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        });
    }

    // Build annotation lines for ATH markers
    const annotations = {};
    const athSource = result.athMarkers.length > 0 ? result.athMarkers : (result.globalATH ? [result.globalATH] : []);

    athSource.forEach((ath, i) => {
        // Find closest label index for this ATH date
        const athTime = ath.date.getTime();
        let closestIdx = 0;
        let closestDiff = Infinity;
        for (let j = 0; j < labels.length; j++) {
            // Parse the label back to a date for comparison
            const labelDate = new Date(labels[j]);
            const diff = Math.abs(labelDate.getTime() - athTime);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestIdx = j;
            }
        }

        annotations[`ath${i}`] = {
            type: 'line',
            xMin: closestIdx,
            xMax: closestIdx,
            borderColor: '#F39C12',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                display: true,
                content: `ATH: $${formatNumber(ath.price)}`,
                position: 'start',
                backgroundColor: 'rgba(243, 156, 18, 0.85)',
                color: '#ffffff',
                font: { size: 11, weight: 'bold' },
                padding: 4
            }
        };
    });

    // Add "Today" marker if projection is enabled
    if (result.projectionEnabled && result.todayMarkerDate) {
        const todayTime = result.todayMarkerDate.getTime();
        let todayIdx = 0;
        let closestDiff = Infinity;
        for (let j = 0; j < labels.length; j++) {
            const labelDate = new Date(labels[j]);
            const diff = Math.abs(labelDate.getTime() - todayTime);
            if (diff < closestDiff) {
                closestDiff = diff;
                todayIdx = j;
            }
        }

        annotations['todayLine'] = {
            type: 'line',
            xMin: todayIdx,
            xMax: todayIdx,
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 2,
            label: {
                display: true,
                content: 'Today',
                position: 'start',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                font: { size: 11 },
                padding: 4
            }
        };
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 14, weight: 'bold' },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            if (context.parsed.y == null) return null;
                            return context.dataset.label + ': $' +
                                context.parsed.y.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                });
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                            return '$' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 12,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// ============================================================
// Share Feature
// ============================================================

async function generateShareImage() {
    if (!lastResult) return null;

    const result = lastResult;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');

    // Background — solid dark
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#0A0A0A');
    gradient.addColorStop(1, '#141414');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    // Try to load IXS logo
    try {
        const logo = await loadImage('assets/ixs-logo-white.png');
        const logoHeight = 50;
        const logoWidth = logo.width * (logoHeight / logo.height);
        ctx.drawImage(logo, 40, 30, logoWidth, logoHeight);
    } catch {
        // Fallback: text logo
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('IXS', 40, 65);
    }

    // Determine values based on projection mode
    const isProjection = result.projectionEnabled && result.projectedHoldingPath && result.projectedHoldingPath.length > 0;
    let endHolding, endYield;
    if (isProjection) {
        endHolding = result.projectedHoldingPath[result.projectedHoldingPath.length - 1];
        endYield = result.projectedYieldPath[result.projectedYieldPath.length - 1];
    } else {
        endHolding = result.holdingPath[result.holdingPath.length - 1];
        endYield = result.yieldPath[result.yieldPath.length - 1];
    }
    const totalMissed = endYield.usd - endHolding.usd;
    const startPoint = result.holdingPath[0];

    // Main stat
    ctx.fillStyle = '#F39C12';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
    const mainLabel = isProjection ? 'Opportunity' : 'Missed';
    ctx.fillText(`$${formatNumber(totalMissed)} ${mainLabel}`, 40, 170);

    // Supporting text
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${formatDate(startPoint.date)} to ${formatDate(endHolding.date)}`, 40, 220);
    ctx.fillText(`${startPoint.btc.toFixed(2)} BTC held`, 40, 260);

    // Mini chart
    drawMiniChart(ctx, result, 40, 290, 1120, 250);

    // URL
    ctx.fillStyle = '#F7931A';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('btc-yield-calculator.vercel.app', 40, 610);

    return canvas.toDataURL('image/png');
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function drawMiniChart(ctx, result, x, y, w, h) {
    const holdingPath = result.holdingPath;
    const yieldPath = result.yieldPath;

    if (holdingPath.length < 2) return;

    // Get all USD values to determine scale
    const allValues = holdingPath.map(p => p.usd).concat(yieldPath.map(p => p.usd));

    // Include projection data if available
    if (result.projectionEnabled && result.projectedHoldingPath) {
        allValues.push(...result.projectedHoldingPath.map(p => p.usd));
        allValues.push(...result.projectedYieldPath.map(p => p.usd));
    }

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;

    const totalPoints = holdingPath.length + (result.projectedHoldingPath ? result.projectedHoldingPath.length : 0);

    function drawLine(path, color, startIdx, dashed) {
        if (path.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        if (dashed) ctx.setLineDash([8, 4]);
        else ctx.setLineDash([]);

        path.forEach((point, i) => {
            const px = x + ((startIdx + i) / (totalPoints - 1)) * w;
            const py = y + h - ((point.usd - minVal) / range) * h;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw historical lines
    drawLine(holdingPath, '#888888', 0, false);
    drawLine(yieldPath, '#F7931A', 0, false);

    // Draw projected lines
    if (result.projectionEnabled && result.projectedHoldingPath) {
        drawLine(result.projectedHoldingPath, '#888888', holdingPath.length, true);
        drawLine(result.projectedYieldPath, '#F7931A', holdingPath.length, true);
    }
}

function shareToX() {
    if (!lastResult) return;

    const isProjection = lastResult.projectionEnabled && lastResult.projectedHoldingPath && lastResult.projectedHoldingPath.length > 0;
    let endHolding, endYield;
    if (isProjection) {
        endHolding = lastResult.projectedHoldingPath[lastResult.projectedHoldingPath.length - 1];
        endYield = lastResult.projectedYieldPath[lastResult.projectedYieldPath.length - 1];
    } else {
        endHolding = lastResult.holdingPath[lastResult.holdingPath.length - 1];
        endYield = lastResult.yieldPath[lastResult.yieldPath.length - 1];
    }
    const totalMissed = Math.round(endYield.usd - endHolding.usd);
    const startPoint = lastResult.holdingPath[0];

    // Build share URL — Twitter crawls this, sees OG meta tags, renders the image automatically
    const shareParams = new URLSearchParams({
        missed: totalMissed,
        btc: startPoint.btc.toFixed(2),
        start: formatDate(startPoint.date),
        end: formatDate(endHolding.date),
        projection: isProjection ? '1' : '0',
    });
    const shareUrl = `https://btc-yield-calculator.vercel.app/api/share?${shareParams.toString()}`;

    let tweetText;
    if (isProjection) {
        tweetText = `If I start earning yield on my Bitcoin now, I could gain $${formatNumber(totalMissed)}. 📈\n\nProject yours:`;
    } else {
        tweetText = `I left $${formatNumber(totalMissed)} on the table by not earning yield on my Bitcoin. 😬\n\nCalculate yours:`;
    }

    const text = encodeURIComponent(tweetText);
    const url = encodeURIComponent(shareUrl);
    const xUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(xUrl, '_blank', 'width=600,height=400');
}

async function downloadImage() {
    if (!lastResult) return;

    try {
        const imageDataUrl = await generateShareImage();
        if (!imageDataUrl) return;

        const isProjection = lastResult.projectionEnabled && lastResult.projectedHoldingPath && lastResult.projectedHoldingPath.length > 0;
        let endHolding, endYield;
        if (isProjection) {
            endHolding = lastResult.projectedHoldingPath[lastResult.projectedHoldingPath.length - 1];
            endYield = lastResult.projectedYieldPath[lastResult.projectedYieldPath.length - 1];
        } else {
            endHolding = lastResult.holdingPath[lastResult.holdingPath.length - 1];
            endYield = lastResult.yieldPath[lastResult.yieldPath.length - 1];
        }
        const totalMissed = Math.round(endYield.usd - endHolding.usd);

        const link = document.createElement('a');
        link.download = `btc-yield-missed-${totalMissed}.png`;
        link.href = imageDataUrl;
        link.click();
    } catch {
        alert('Unable to generate image. Try again.');
    }
}

// ============================================================
// Reset & Utilities
// ============================================================

function resetCalculator() {
    document.getElementById('inputForm').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    lastResult = null;
}

function formatNumber(num) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
