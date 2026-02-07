// Global variables
let myChart = null;

// Set max date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('startDate').max = today;
document.getElementById('endDate').max = today;

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

// Main calculation function
async function calculateYield() {
    // Get inputs
    const startDate = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;
    const endDate = endDateInput || new Date().toISOString().split('T')[0];
    const btcAmount = parseFloat(document.getElementById('btcAmount').value);
    const yieldRate = parseFloat(document.getElementById('yieldRate').value) / 100;

    // Validation
    if (!startDate || !btcAmount || btcAmount <= 0) {
        alert('Please fill in all fields with valid values');
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        alert('End date must be after start date');
        return;
    }

    // Show loading
    document.getElementById('inputForm').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    try {
        // Fetch historical BTC prices
        const prices = await fetchBTCPrices(startDate, endDate);
        
        // Calculate paths
        const result = calculatePaths(prices, btcAmount, yieldRate, startDate);
        
        // Display results
        displayResults(result);
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching data. Please try again.');
        resetCalculator();
    }
}

// Fetch BTC prices from CryptoCompare
async function fetchBTCPrices(startDate, endDate) {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    
    const daysDiff = Math.ceil((endTimestamp - startTimestamp) / 86400);
    const prices = [];
    
    // CryptoCompare limit is 2000 days per request, so we might need multiple calls
    let currentEndTs = endTimestamp;
    let remaining = daysDiff;
    
    while (remaining > 0) {
        const limit = Math.min(remaining, 2000);
        const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${limit}&toTs=${currentEndTs}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch BTC prices from CryptoCompare');
        }
        
        const data = await response.json();
        if (data.Response === 'Error') {
            throw new Error(data.Message || 'CryptoCompare API error');
        }
        
        // Convert CryptoCompare format to [timestamp_ms, price] format
        const batch = data.Data.Data.map(item => [item.time * 1000, item.close]);
        prices.unshift(...batch.reverse());
        
        remaining -= limit;
        currentEndTs = data.Data.Data[0].time - 86400; // Go back one more day
    }
    
    // Filter to exact range and remove duplicates
    const filteredPrices = prices.filter(([ts]) => 
        ts >= startTimestamp * 1000 && ts <= endTimestamp * 1000
    );
    
    return filteredPrices;
}

// Calculate holding vs yield paths
function calculatePaths(prices, initialBTC, annualYield, startDate) {
    // Sample data monthly (reduce data points for chart performance)
    const monthlyPrices = sampleMonthly(prices);
    
    const holdingPath = [];
    const yieldPath = [];
    let currentBTC = initialBTC;
    let athData = null;
    let maxPrice = 0;
    
    const startTimestamp = new Date(startDate).getTime();
    
    monthlyPrices.forEach((pricePoint, index) => {
        const [timestamp, price] = pricePoint;
        const date = new Date(timestamp);
        
        // Calculate time elapsed in years for yield
        const yearsElapsed = (timestamp - startTimestamp) / (1000 * 60 * 60 * 24 * 365.25);
        
        // Holding path (constant BTC)
        const holdingUSD = initialBTC * price;
        holdingPath.push({
            date: date,
            btc: initialBTC,
            usd: holdingUSD,
            price: price
        });
        
        // Yield path (compounding BTC)
        currentBTC = initialBTC * Math.pow(1 + annualYield, yearsElapsed);
        const yieldUSD = currentBTC * price;
        yieldPath.push({
            date: date,
            btc: currentBTC,
            usd: yieldUSD,
            price: price
        });
        
        // Track ATH
        if (price > maxPrice) {
            maxPrice = price;
            athData = {
                date: date,
                price: price,
                holdingBTC: initialBTC,
                holdingUSD: initialBTC * price,
                yieldBTC: currentBTC,
                yieldUSD: yieldUSD,
                missed: yieldUSD - holdingUSD
            };
        }
    });
    
    return {
        holdingPath,
        yieldPath,
        athData,
        startDate: new Date(startDate),
        todayPrice: monthlyPrices[monthlyPrices.length - 1][1]
    };
}

// Sample prices monthly (take one data point per month)
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

// Display results
function displayResults(result) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    
    // Render chart
    renderChart(result);
    
    // Display ATH callout
    if (result.athData) {
        document.getElementById('athCallout').style.display = 'block';
        document.getElementById('athDetail').innerHTML = `
            <strong>${formatDate(result.athData.date)}: BTC hit $${formatNumber(result.athData.price)}</strong><br>
            Just holding: ${result.athData.holdingBTC.toFixed(4)} BTC = $${formatNumber(result.athData.holdingUSD)}<br>
            With yield: ${result.athData.yieldBTC.toFixed(4)} BTC = $${formatNumber(result.athData.yieldUSD)}<br>
            <strong style="color: #c53030;">You missed $${formatNumber(result.athData.missed)} at the peak</strong>
        `;
    }
    
    // Display summary stats
    const startHolding = result.holdingPath[0];
    const todayHolding = result.holdingPath[result.holdingPath.length - 1];
    const todayYield = result.yieldPath[result.yieldPath.length - 1];
    const totalMissed = todayYield.usd - todayHolding.usd;
    
    document.getElementById('startValue').textContent = 
        `${startHolding.btc.toFixed(4)} BTC = $${formatNumber(startHolding.usd)}`;
    document.getElementById('todayHoldValue').textContent = 
        `${todayHolding.btc.toFixed(4)} BTC = $${formatNumber(todayHolding.usd)}`;
    document.getElementById('todayYieldValue').textContent = 
        `${todayYield.btc.toFixed(4)} BTC = $${formatNumber(todayYield.usd)}`;
    document.getElementById('totalMissed').textContent = 
        `$${formatNumber(totalMissed)}`;
}

// Render Chart.js chart
function renderChart(result) {
    const ctx = document.getElementById('yieldChart').getContext('2d');
    
    // Destroy existing chart if any
    if (myChart) {
        myChart.destroy();
    }
    
    // Prepare data
    const labels = result.holdingPath.map(p => formatDate(p.date));
    const holdingData = result.holdingPath.map(p => p.usd);
    const yieldData = result.yieldPath.map(p => p.usd);
    
    // Find ATH index
    let athIndex = null;
    if (result.athData) {
        athIndex = result.holdingPath.findIndex(p => 
            p.date.getTime() === result.athData.date.getTime()
        );
    }
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Just Holding',
                    data: holdingData,
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Holding + Yield',
                    data: yieldData,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        },
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
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + 
                                   context.parsed.y.toLocaleString('en-US', {
                                       minimumFractionDigits: 0,
                                       maximumFractionDigits: 0
                                   });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
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

// Reset calculator
function resetCalculator() {
    document.getElementById('inputForm').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
}

// Utility functions
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
