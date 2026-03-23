/* ============================================ */
/* PRODUCT RESEARCH DASHBOARD - MAIN SCRIPT.JS
/* Version: 2.0 | Modular, Fully Functional
/* Features: CRUD, LocalStorage, Search, Filter, Sort, PDF Export, Notifications
/* ============================================ */

// ============================================
// GLOBAL STATE & DOM ELEMENTS
// ============================================

// Main data array - stores all product objects
let products = [];

// UI State Management
let currentEditId = null;           // ID of product being edited (null if not in edit mode)
let currentFilter = 'all';          // Current filter value
let currentSearchTerm = '';          // Current search query
let currentSortField = 'name';       // Field to sort by: 'name', 'rating', 'cost'
let currentSortOrder = 'asc';        // Sort order: 'asc' or 'desc'

// DOM Elements - Form Fields
const productNameInput = document.getElementById('productName');
const productRatingInput = document.getElementById('productRating');
const productCostInput = document.getElementById('productCost');
const creativeLinkInput = document.getElementById('creativeLink');
const sourcingUrlInput = document.getElementById('sourcingUrl');
const competitorDetailsInput = document.getElementById('competitorDetails');

// DOM Elements - Buttons
const addProductBtn = document.getElementById('addProductBtn');
const updateProductBtn = document.getElementById('updateProductBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const exportPdfBtn = document.getElementById('exportPdfBtnInline');

// DOM Elements - Controls
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const sortByNameAsc = document.getElementById('sortByNameAsc');
const sortByRatingDesc = document.getElementById('sortByRatingDesc');
const sortByCostAsc = document.getElementById('sortByCostAsc');

// DOM Elements - Display
const productTableBody = document.getElementById('productTableBody');
const productCountBadge = document.getElementById('productCountBadge');
const totalProductsFooter = document.getElementById('totalProductsFooter');

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generates a unique ID for new products
 * @returns {number} Unique timestamp-based ID
 */
function generateUniqueId() {
    return Date.now() + Math.floor(Math.random() * 10000);
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
function isValidUrl(url) {
    if (!url) return true; // Optional field
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Truncates text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 60) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Displays a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 */
function showNotification(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Set icon based on type
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    // Style the toast
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = type === 'success' ? '#10b981' : 
                                  type === 'error' ? '#ef4444' : 
                                  type === 'warning' ? '#f59e0b' : '#3b82f6';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '500';
    toast.style.animation = 'slideIn 0.3s ease-out';
    
    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.marginLeft = '8px';
    
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    document.body.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

/**
 * Shows loading indicator on a button
 * @param {HTMLElement} button - Button element
 * @param {string} originalText - Original button text
 */
function showButtonLoading(button, originalText) {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Loading...';
}

/**
 * Restores button text
 * @param {HTMLElement} button - Button element
 * @param {string} originalText - Original button text
 */
function hideButtonLoading(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}

// ============================================
// FORM VALIDATION & HANDLING
// ============================================

/**
 * Validates form inputs
 * @returns {object|null} Validated product data or null if invalid
 */
function validateAndGetFormData() {
    // Get values
    const name = productNameInput.value.trim();
    const rating = parseFloat(productRatingInput.value);
    const cost = parseFloat(productCostInput.value);
    const creativeLink = creativeLinkInput.value.trim();
    const sourcingUrl = sourcingUrlInput.value.trim();
    const competitorDetails = competitorDetailsInput.value.trim();
    
    // Validation checks
    const errors = [];
    
    if (!name) {
        errors.push('Product name is required');
    } else if (name.length < 2) {
        errors.push('Product name must be at least 2 characters');
    }
    
    if (isNaN(rating)) {
        errors.push('Rating is required');
    } else if (rating < 0 || rating > 5) {
        errors.push('Rating must be between 0 and 5');
    }
    
    if (isNaN(cost)) {
        errors.push('Cost is required');
    } else if (cost < 0) {
        errors.push('Cost must be a positive number');
    }
    
    if (creativeLink && !isValidUrl(creativeLink)) {
        errors.push('Creative Link must be a valid URL');
    }
    
    if (sourcingUrl && !isValidUrl(sourcingUrl)) {
        errors.push('Sourcing URL must be a valid URL');
    }
    
    // Show errors if any
    if (errors.length > 0) {
        errors.forEach(error => showNotification(error, 'error'));
        return null;
    }
    
    // Return validated product data
    return {
        name,
        rating: parseFloat(rating.toFixed(1)),
        cost: parseFloat(cost.toFixed(2)),
        creativeLink: creativeLink || '',
        sourcingUrl: sourcingUrl || '',
        competitorDetails: competitorDetails || ''
    };
}

/**
 * Resets the form to default state
 */
function resetForm() {
    productNameInput.value = '';
    productRatingInput.value = '';
    productCostInput.value = '';
    creativeLinkInput.value = '';
    sourcingUrlInput.value = '';
    competitorDetailsInput.value = '';
    
    // Exit edit mode
    currentEditId = null;
    addProductBtn.style.display = 'inline-flex';
    updateProductBtn.style.display = 'none';
    
    // Clear validation styles
    document.querySelectorAll('.form-group input, .form-group textarea').forEach(field => {
        field.classList.remove('error');
    });
    
    showNotification('Form cleared', 'info');
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Adds a new product
 */
function addProduct() {
    const productData = validateAndGetFormData();
    if (!productData) return;
    
    // Create new product with unique ID
    const newProduct = {
        id: generateUniqueId(),
        ...productData,
        createdAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    saveToLocalStorage();
    renderProducts();
    resetForm();
    
    showNotification(`Product "${productData.name}" added successfully!`, 'success');
}

/**
 * Populates form with product data for editing
 * @param {number} id - Product ID to edit
 */
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Fill form with product data
    productNameInput.value = product.name;
    productRatingInput.value = product.rating;
    productCostInput.value = product.cost;
    creativeLinkInput.value = product.creativeLink || '';
    sourcingUrlInput.value = product.sourcingUrl || '';
    competitorDetailsInput.value = product.competitorDetails || '';
    
    // Switch to edit mode
    currentEditId = id;
    addProductBtn.style.display = 'none';
    updateProductBtn.style.display = 'inline-flex';
    
    // Scroll to form
    document.getElementById('productFormSection').scrollIntoView({ behavior: 'smooth' });
    
    showNotification(`Editing "${product.name}"`, 'info');
}

/**
 * Updates an existing product
 */
function updateProduct() {
    if (!currentEditId) {
        showNotification('No product selected for editing', 'error');
        return;
    }
    
    const productData = validateAndGetFormData();
    if (!productData) return;
    
    // Find and update product
    const index = products.findIndex(p => p.id === currentEditId);
    if (index === -1) {
        showNotification('Product not found', 'error');
        resetForm();
        return;
    }
    
    // Preserve original ID and creation date
    products[index] = {
        ...products[index],
        ...productData,
        updatedAt: new Date().toISOString()
    };
    
    saveToLocalStorage();
    renderProducts();
    resetForm();
    
    showNotification(`Product "${productData.name}" updated successfully!`, 'success');
}

/**
 * Deletes a product
 * @param {number} id - Product ID to delete
 */
function deleteProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
        products = products.filter(p => p.id !== id);
        
        // If deleting the product currently being edited, reset form
        if (currentEditId === id) {
            resetForm();
        }
        
        saveToLocalStorage();
        renderProducts();
        
        showNotification(`Product "${product.name}" deleted successfully`, 'warning');
    }
}

// ============================================
// SEARCH, FILTER & SORT FUNCTIONS
// ============================================

/**
 * Filters products based on search term and filter criteria
 * @returns {Array} Filtered products array
 */
function getFilteredProducts() {
    let filtered = [...products];
    
    // Apply search filter (by product name or competitor details)
    if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchLower) || 
            p.competitorDetails.toLowerCase().includes(searchLower)
        );
    }
    
    // Apply dropdown filter
    switch (currentFilter) {
        case 'rating-high':
            filtered = filtered.filter(p => p.rating >= 4.0);
            break;
        case 'rating-low':
            filtered = filtered.filter(p => p.rating <= 2.5);
            break;
        case 'cost-low':
            filtered = filtered.filter(p => p.cost < 20);
            break;
        case 'cost-high':
            filtered = filtered.filter(p => p.cost > 50);
            break;
        default:
            // 'all' - no filter
            break;
    }
    
    return filtered;
}

/**
 * Sorts products based on current sort field and order
 * @param {Array} productsArray - Products to sort
 * @returns {Array} Sorted products array
 */
function sortProducts(productsArray) {
    const sorted = [...productsArray];
    
    sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch (currentSortField) {
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
            case 'rating':
                aVal = a.rating;
                bVal = b.rating;
                break;
            case 'cost':
                aVal = a.cost;
                bVal = b.cost;
                break;
            default:
                aVal = a.name;
                bVal = b.name;
        }
        
        if (currentSortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    return sorted;
}

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

/**
 * Renders products to the table
 */
function renderProducts() {
    // Apply filters and sorting
    let filteredProducts = getFilteredProducts();
    filteredProducts = sortProducts(filteredProducts);
    
    // Update counter badges
    const totalProducts = products.length;
    const displayedCount = filteredProducts.length;
    productCountBadge.innerText = `(${totalProducts} item${totalProducts !== 1 ? 's' : ''})`;
    totalProductsFooter.innerText = totalProducts;
    
    // Handle empty state
    if (filteredProducts.length === 0) {
        let emptyMessage = 'No products found';
        if (products.length === 0) {
            emptyMessage = 'No products yet. Add your first winning product!';
        } else if (currentSearchTerm || currentFilter !== 'all') {
            emptyMessage = 'No matching products found. Try adjusting filters.';
        }
        
        productTableBody.innerHTML = `
            <tr class="empty-row-message">
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-database"></i>
                        <p>${emptyMessage}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Build table rows
    let rows = '';
    filteredProducts.forEach(product => {
        const escapedName = escapeHtml(product.name);
        const escapedCompetitor = escapeHtml(truncateText(product.competitorDetails, 60));
        const fullCompetitor = escapeHtml(product.competitorDetails);
        
        rows += `
            <tr data-id="${product.id}" class="product-row">
                <td class="product-name-cell">
                    <strong>${escapedName}</strong>
                </td>
                <td class="rating-cell">
                    <span class="rating-badge">
                        <i class="fas fa-star"></i> ${product.rating.toFixed(1)}
                    </span>
                </td>
                <td class="cost-cell">
                    <strong>$${product.cost.toFixed(2)}</strong>
                </td>
                <td class="link-cell">
                    ${product.creativeLink ? 
                        `<a href="${escapeHtml(product.creativeLink)}" target="_blank" rel="noopener noreferrer">
                            <i class="fas fa-play-circle"></i> Preview
                        </a>` : 
                        '<span class="text-muted">—</span>'
                    }
                </td>
                <td class="link-cell">
                    ${product.sourcingUrl ? 
                        `<a href="${escapeHtml(product.sourcingUrl)}" target="_blank" rel="noopener noreferrer">
                            <i class="fas fa-link"></i> Source
                        </a>` : 
                        '<span class="text-muted">—</span>'
                    }
                </td>
                <td class="competitor-cell" title="${fullCompetitor}">
                    ${escapedCompetitor || '<span class="text-muted">—</span>'}
                </td>
                <td class="actions-cell">
                    <button class="action-btn edit-btn" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" data-id="${product.id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    productTableBody.innerHTML = rows;
    
    // Add fade-in animation class to new rows
    document.querySelectorAll('.product-row').forEach((row, index) => {
        row.style.animation = `fadeInUp 0.3s ease-out ${index * 0.05}s forwards`;
        row.style.opacity = '0';
    });
}

// ============================================
// LOCAL STORAGE MANAGEMENT
// ============================================

/**
 * Saves products to localStorage
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('winning_products', JSON.stringify(products));
        showNotification('Data saved to localStorage', 'success', 1500);
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        showNotification('Failed to save data', 'error');
    }
}

/**
 * Loads products from localStorage
 */
function loadFromLocalStorage() {
    try {
        const storedProducts = localStorage.getItem('winning_products');
        if (storedProducts) {
            products = JSON.parse(storedProducts);
            showNotification('Data loaded from localStorage', 'success', 1500);
        } else {
            // Load demo data for first-time users
            loadDemoData();
        }
        renderProducts();
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        showNotification('Failed to load saved data', 'error');
        loadDemoData();
    }
}

/**
 * Loads demo product data
 */
function loadDemoData() {
    products = [
        {
            id: 1001,
            name: "Ergonomic Travel Pillow",
            rating: 4.8,
            cost: 24.99,
            creativeLink: "https://example.com/pillow-ad",
            sourcingUrl: "https://alibaba.com/pillow-supplier",
            competitorDetails: "Main competitor: Infinity Pillow. Our advantage: memory foam + washable cover.",
            createdAt: new Date().toISOString()
        },
        {
            id: 1002,
            name: "Smart LED Desk Lamp",
            rating: 4.5,
            cost: 39.99,
            creativeLink: "https://example.com/lamp-video",
            sourcingUrl: "https://aliexpress.com/smart-lamp",
            competitorDetails: "Competitors: TaoTronics, BenQ. Our lamp features wireless charging and color temperature adjustment.",
            createdAt: new Date().toISOString()
        },
        {
            id: 1003,
            name: "HydroBoost Water Bottle",
            rating: 4.9,
            cost: 18.75,
            creativeLink: "https://example.com/bottle-ad",
            sourcingUrl: "https://amazon.com/hydroboost",
            competitorDetails: "Yeti & Nalgene are main competitors. Unique selling point: built-in fruit infuser and insulation.",
            createdAt: new Date().toISOString()
        },
        {
            id: 1004,
            name: "Wireless Noise-Cancelling Earbuds",
            rating: 4.7,
            cost: 59.99,
            creativeLink: "https://example.com/earbuds-promo",
            sourcingUrl: "https://supplier.com/earbuds",
            competitorDetails: "Competitors: Apple AirPods, Samsung Buds. Our advantage: 30hr battery life + IPX7 waterproof.",
            createdAt: new Date().toISOString()
        }
    ];
    saveToLocalStorage();
}

// ============================================
// PDF EXPORT FUNCTIONALITY (CRITICAL)
// ============================================

/**
 * Generates and downloads PDF of product data
 */
async function generatePDF() {
    const originalButtonText = exportPdfBtn.innerHTML;
    showButtonLoading(exportPdfBtn, originalButtonText);
    
    try {
        // Create a temporary container for PDF export
        const pdfContainer = document.createElement('div');
        pdfContainer.style.padding = '20px';
        pdfContainer.style.backgroundColor = 'white';
        pdfContainer.style.fontFamily = 'Arial, sans-serif';
        pdfContainer.style.width = '800px';
        
        // Add header
        pdfContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #6366f1;">
                <h1 style="color: #6366f1; margin-bottom: 10px;">Winning Product Dashboard Report</h1>
                <p style="color: #666;">Generated on ${new Date().toLocaleString()}</p>
                <p style="color: #666;">Total Products: ${products.length}</p>
            </div>
        `;
        
        // Create table for products
        if (products.length > 0) {
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '20px';
            
            // Table header
            table.innerHTML = `
                <thead>
                    <tr style="background-color: #f3f4f6; border-bottom: 2px solid #6366f1;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Product Name</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Rating</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Cost (USD)</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Creative Link</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Sourcing URL</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Competitor Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(p.name)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${p.rating.toFixed(1)} ★</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">$${p.cost.toFixed(2)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${p.creativeLink || '—'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${p.sourcingUrl || '—'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(p.competitorDetails) || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            pdfContainer.appendChild(table);
        } else {
            pdfContainer.innerHTML += '<p style="text-align: center; color: #999; margin-top: 50px;">No products available to export.</p>';
        }
        
        // Add footer
        pdfContainer.innerHTML += `
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
                <p>Winning Product Dashboard - Confidential Research Report</p>
                <p>© ${new Date().getFullYear()} All Rights Reserved</p>
            </div>
        `;
        
        // Temporarily append to body for rendering
        document.body.appendChild(pdfContainer);
        
        // Use html2canvas to capture the container
        const canvas = await html2canvas(pdfContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        });
        
        // Remove temporary container
        document.body.removeChild(pdfContainer);
        
        // Create PDF with jsPDF
        const { jsPDF } = window.jspdf;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 190; // mm
        const pageHeight = 277; // mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let position = 10;
        
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        
        // Add new page if content exceeds one page
        let heightLeft = imgHeight;
        while (heightLeft > pageHeight) {
            position = heightLeft - pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, -position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`winning_products_${new Date().toISOString().slice(0, 19)}.pdf`);
        
        showNotification('PDF generated successfully!', 'success');
    } catch (error) {
        console.error('PDF generation error:', error);
        showNotification('Failed to generate PDF. Please try again.', 'error');
    } finally {
        hideButtonLoading(exportPdfBtn, originalButtonText);
    }
}

// ============================================
// EVENT HANDLERS & INITIALIZATION
// ============================================

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    // Form buttons
    addProductBtn.addEventListener('click', addProduct);
    updateProductBtn.addEventListener('click', updateProduct);
    resetFormBtn.addEventListener('click', resetForm);
    exportPdfBtn.addEventListener('click', generatePDF);
    
    // Search with debounce
    const debouncedSearch = debounce((e) => {
        currentSearchTerm = e.target.value;
        renderProducts();
    }, 300);
    searchInput.addEventListener('input', debouncedSearch);
    
    // Filter dropdown
    filterSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderProducts();
    });
    
    // Sort buttons
    sortByNameAsc.addEventListener('click', () => {
        currentSortField = 'name';
        currentSortOrder = 'asc';
        renderProducts();
        showNotification('Sorted by Name (A-Z)', 'info');
    });
    
    sortByRatingDesc.addEventListener('click', () => {
        currentSortField = 'rating';
        currentSortOrder = 'desc';
        renderProducts();
        showNotification('Sorted by Rating (Highest first)', 'info');
    });
    
    sortByCostAsc.addEventListener('click', () => {
        currentSortField = 'cost';
        currentSortOrder = 'asc';
        renderProducts();
        showNotification('Sorted by Cost (Lowest first)', 'info');
    });
    
    // Event delegation for edit/delete buttons (handles dynamic elements)
    productTableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        
        if (editBtn) {
            const id = parseInt(editBtn.getAttribute('data-id'));
            editProduct(id);
        } else if (deleteBtn) {
            const id = parseInt(deleteBtn.getAttribute('data-id'));
            deleteProduct(id);
        }
    });
    
    // Star rating preview listener
    productRatingInput.addEventListener('input', () => {
        const rating = parseFloat(productRatingInput.value);
        if (!isNaN(rating) && rating >= 0 && rating <= 5) {
            const starPreview = document.querySelector('.star-icon');
            if (starPreview) {
                const fullStars = Math.floor(rating);
                const hasHalf = rating - fullStars >= 0.5;
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= fullStars) {
                        starsHtml += '<i class="fas fa-star" style="color:#f5b342;"></i>';
                    } else if (i === fullStars + 1 && hasHalf) {
                        starsHtml += '<i class="fas fa-star-half-alt" style="color:#f5b342;"></i>';
                    } else {
                        starsHtml += '<i class="far fa-star" style="color:#ccc;"></i>';
                    }
                }
                starPreview.innerHTML = starsHtml;
                const ratingValueSpan = document.querySelector('.rating-value');
                if (ratingValueSpan) ratingValueSpan.innerText = rating.toFixed(1);
            }
        }
    });
    
    // Navigation buttons
    document.getElementById('navHomeBtn').addEventListener('click', () => {
        document.querySelector('.dashboard-main').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('navAddBtn').addEventListener('click', () => {
        document.getElementById('productFormSection').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('navExportPdfBtn').addEventListener('click', generatePDF);
}

/**
 * Initializes the application
 */
function init() {
    loadFromLocalStorage();
    setupEventListeners();
    
    // Add animation keyframes to document if not present
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .text-muted {
            color: #9ca3af;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            margin-left: 8px;
            font-size: 14px;
        }
        
        .toast-close:hover {
            opacity: 0.8;
        }
        
        .error {
            border-color: #ef4444 !important;
        }
    `;
    document.head.appendChild(styleSheet);
    
    showNotification('Dashboard ready! Loaded ' + products.length + ' products', 'success');
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);