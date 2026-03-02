// Dashboard JavaScript 

// CHECK AUTHENTICATION - Protect dashboard page
(function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    // If not logged in, redirect to login page
    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    
    // If logged in, display user name
    const userName = sessionStorage.getItem('userName') || 'Admin';
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Load dashboard data from backend
    loadDashboardData();
});

/**
 * Main function to load all dashboard data from backend
 * Replace the endpoint with actual backend url in short eme lang to 
 */
async function loadDashboardData() {
    try {
        // For now, using mock data as template
        // Oreplace this with actual data
        const data = {
            userName: 'Admin',
            stats: {
                totalCollection: 1253,
                collectionTrend: 1.5,
                collectionTrendPositive: true,
                totalSales: 2142,
                salesTrend: 5.5,
                salesTrendPositive: true,
                totalDistributors: 872,
                distributorTrend: 1.4,
                distributorTrendPositive: true
            },
            sparklineData: {
                collection: [30, 45, 40, 55, 50, 65, 60, 75],
                sales: [40, 55, 50, 70, 65, 80, 75, 90],
                distributors: [20, 25, 30, 28, 35, 40, 38, 45]
            },
            materialsData: {
                labels: ['Jan', 'Feb', 'March', 'April', 'May'],
                datasets: [
                    {
                        label: 'Plastic',
                        data: [120, 90, 70, 50, 40],
                        backgroundColor: '#FFEB8A'
                    },
                    {
                        label: 'Metal',
                        data: [140, 100, 80, 60, 50],
                        backgroundColor: '#71D7D0'
                    },
                    {
                        label: 'Paper',
                        data: [160, 110, 90, 70, 60],
                        backgroundColor: '#B9E682'
                    }
                ]
            },
            categoryData: {
                labels: ['Barangay', 'School', 'Walk-in'],
                data: [45, 30, 25],
                backgroundColor: ['#FFEB8A', '#71D7D0', '#B9E682']
            }
        };
        
        // Update the dashboard with the data
        updateDashboard(data);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

/**
 * Update dashboard elements with data from backend
 */
function updateDashboard(data) {
    // Update user name in greeting
    updateUserName(data.userName);
    
    // Update statistics cards
    updateStats(data.stats);
    
    // Create sparkline charts
    createSparklines(data.sparklineData);
    
    // Create main charts
    createMaterialsChart(data.materialsData);
    createCategoryChart(data.categoryData);
}

/**
 * Update user name in greeting
 */
function updateUserName(name) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = name;
    }
}

/**
 * Update all statistics cards
 * Backend should provide stats object with all values
 */
function updateStats(stats) {
    // Update Total Collection
    document.getElementById('total-collection').textContent = formatNumber(stats.totalCollection);
    document.getElementById('collection-trend-value').textContent = stats.collectionTrend + '%';
    updateTrendIndicator('collection-trend', stats.collectionTrendPositive);
    
    // Update Total Sales
    document.getElementById('total-sales').textContent = formatNumber(stats.totalSales);
    document.getElementById('sales-trend-value').textContent = stats.salesTrend + '%';
    updateTrendIndicator('sales-trend', stats.salesTrendPositive);
    
    // Update Total Distributors
    document.getElementById('total-distributors').textContent = formatNumber(stats.totalDistributors);
    document.getElementById('distributor-trend-value').textContent = stats.distributorTrend + '%';
    updateTrendIndicator('distributor-trend', stats.distributorTrendPositive);
}

/**
 * Update trend indicator (positive/negative)
 */
function updateTrendIndicator(elementId, isPositive) {
    const trendElement = document.getElementById(elementId);
    if (trendElement) {
        trendElement.classList.remove('positive', 'negative');
        trendElement.classList.add(isPositive ? 'positive' : 'negative');
        
        // Update icon
        const icon = trendElement.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isPositive ? 'trending-up' : 'trending-down');
            lucide.createIcons();
        }
    }
}

/**
 * Create sparkline charts
 * Backend should provide array of values for each sparkline
 */
function createSparklines(sparklineData) {
    createSparkline('collectionSparkline', sparklineData.collection, '#FFEB8A');
    createSparkline('salesSparkline', sparklineData.sales, '#71D7D0');
    createSparkline('distributorSparkline', sparklineData.distributors, '#B9E682');
}

/**
 * Create individual sparkline chart
 */
function createSparkline(canvasId, data, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Destroy existing chart if it exists to prevent duplication
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: color + '20',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            events: [] // Disable all events to prevent redraws
        }
    });
}

/**
 * Create Most Collected Materials bar chart
 * Backend should provide labels and datasets
 */
function createMaterialsChart(data) {
    const ctx = document.getElementById('materialsChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: data.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Create Top Contribution by Category donut chart
 * Backend should provide labels, data, and colors
 */
function createCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.backgroundColor,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

/**
 * Helper function to format numbers with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}