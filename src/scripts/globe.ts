/**
 * Draws the globe's corridors once, when the globe comes into view. Only
 * globes that start below the fold are prepared, and nothing happens for
 * visitors who prefer reduced motion: their routes are drawn from the start.
 */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const globe = entry.target as HTMLElement;
        // Next frame, so the pending state has painted before the transition starts.
        requestAnimationFrame(() => (globe.dataset.state = 'drawing'));
        observer.unobserve(globe);
      }
    },
    { threshold: 0.35 },
  );

  for (const globe of document.querySelectorAll<HTMLElement>('[data-globe]')) {
    if (globe.getBoundingClientRect().top < window.innerHeight) continue;
    globe.dataset.state = 'pending';
    observer.observe(globe);
  }
}
