// Client-side script for heatmap year navigation and tooltips

function initHeatmap() {
  const yearDataElements = document.querySelectorAll('.heatmap-year-data');
  const prevBtn = document.getElementById('heatmap-prev') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('heatmap-next') as HTMLButtonElement | null;
  const yearDisplay = document.getElementById('heatmap-current-year');
  const totalDisplay = document.getElementById('heatmap-total-value');
  const tooltip = document.getElementById('heatmap-tooltip');

  if (!yearDataElements.length || !prevBtn || !nextBtn || !yearDisplay || !totalDisplay || !tooltip) {
    console.log('Heatmap init failed - missing elements:', {
      yearDataElements: yearDataElements.length,
      prevBtn: !!prevBtn,
      nextBtn: !!nextBtn,
      yearDisplay: !!yearDisplay,
      totalDisplay: !!totalDisplay,
      tooltip: !!tooltip
    });
    return;
  }

  const years = Array.from(yearDataElements).map(el => ({
    element: el as HTMLElement,
    year: Number(el.getAttribute('data-year')),
    total: Number(el.getAttribute('data-total')),
    isDefault: el.getAttribute('data-is-default') === 'true',
  })).sort((a, b) => b.year - a.year); // Sort descending (newest first)

  // Find the index for year 2026, or use the first one with isDefault=true, or fallback to 0
  let currentIndex = years.findIndex(y => y.year === 2026);
  if (currentIndex < 0) {
    currentIndex = years.findIndex(y => y.isDefault);
  }
  if (currentIndex < 0) {
    currentIndex = 0;
  }

  console.log('Heatmap initialized with years:', years.map(y => y.year), 'currentIndex:', currentIndex);

  function updateDisplay() {
    const current = years[currentIndex];

    // Update active year data
    years.forEach((y, i) => {
      y.element.classList.toggle('active', i === currentIndex);
    });

    // Update year and total
    if (yearDisplay) yearDisplay.textContent = String(current.year);
    if (totalDisplay) totalDisplay.textContent = current.total.toLocaleString();

    // Update button states
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === years.length - 1;

    console.log('Display updated:', {
      year: current.year,
      total: current.total,
      index: currentIndex,
      prevDisabled: currentIndex === 0,
      nextDisabled: currentIndex === years.length - 1
    });
  }

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Prev button clicked, currentIndex:', currentIndex);
    if (currentIndex > 0) {
      currentIndex--;
      updateDisplay();
    }
  });

  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Next button clicked, currentIndex:', currentIndex);
    if (currentIndex < years.length - 1) {
      currentIndex++;
      updateDisplay();
    }
  });

  // Initialize display
  updateDisplay();

  // Tooltip handling
  function showTooltip(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('heatmap-day')) return;
    if (target.parentElement?.classList.contains('heatmap-legend')) return;

    const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
    const text = currentLang === 'zh'
      ? target.getAttribute('data-tooltip-zh')
      : target.getAttribute('data-tooltip-en');

    if (text && tooltip) {
      tooltip.textContent = text;
      tooltip.style.display = 'block';
      positionTooltip(event);
    }
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  function positionTooltip(event: MouseEvent) {
    if (!tooltip) return;
    const x = event.clientX;
    const y = event.clientY;
    const tooltipRect = tooltip.getBoundingClientRect();

    tooltip.style.left = `${x - tooltipRect.width / 2}px`;
    tooltip.style.top = `${y - tooltipRect.height - 10}px`;
  }

  document.addEventListener('mouseover', showTooltip);
  document.addEventListener('mouseout', hideTooltip);
  document.addEventListener('mousemove', (event) => {
    if (tooltip && tooltip.style.display === 'block') {
      positionTooltip(event);
    }
  });
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeatmap);
} else {
  initHeatmap();
}
