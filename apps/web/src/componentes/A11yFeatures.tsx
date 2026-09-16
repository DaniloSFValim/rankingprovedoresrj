/**
 * Accessibility (A11y) Features implemented in Phase 3.6
 *
 * This file documents the accessibility improvements implemented to meet
 * WCAG 2.1 Level AA compliance and provide better mobile experience.
 *
 * ## Key Improvements:
 *
 * 1. Skip-to-Content Link
 *    - Allows keyboard users to skip repetitive navigation
 *    - Visible on focus for clear keyboard navigation path
 *    - Implemented in app/layout.tsx
 *
 * 2. Semantic HTML
 *    - <main> element with id="main-content" for landmark navigation
 *    - <nav> with aria-label for navigation region
 *    - <table> with proper scope attributes on headers
 *    - role="region" on components that need semantic meaning
 *
 * 3. ARIA Attributes
 *    - aria-label on interactive elements for screen readers
 *    - aria-expanded for toggle states
 *    - aria-haspopup for popup buttons
 *    - aria-selected for selected items
 *    - aria-hidden for decorative elements
 *
 * 4. Focus Management
 *    - Clear focus indicators (outline-marca-400)
 *    - Focus visible styles for keyboard navigation
 *    - Minimum touch target size of 44px (11 = 44px in Tailwind)
 *
 * 5. Color Contrast
 *    - Background: bg-grafite-950 with text-grafite-100 (high contrast)
 *    - Links: text-white with underlines for clear affordance
 *    - Interactive elements: hover and focus states for clarity
 *
 * 6. Screen Reader Support
 *    - .sr-only utility for hidden text labels
 *    - Proper heading hierarchy (h1, h2, h3)
 *    - Table captions and descriptions
 *    - Form labels associated with inputs
 *
 * 7. Mobile Touch Targets
 *    - All interactive elements sized for touch (min 44x44px)
 *    - Better spacing on small screens
 *    - Responsive navigation with horizontal scroll on mobile
 *
 * 8. Keyboard Navigation
 *    - Full keyboard access to all interactive elements
 *    - Arrow key navigation in dropdowns
 *    - Enter/Escape keys for common actions
 *    - Tab order follows visual layout
 *
 * ## Testing Guidelines:
 *
 * - Use NVDA (Windows), JAWS, or VoiceOver (Mac) for screen reader testing
 * - Test keyboard navigation with Tab, Shift+Tab, Arrow keys, Enter, Escape
 * - Use Lighthouse or axe DevTools for automated accessibility audits
 * - Test at 320px width for mobile responsiveness
 * - Verify color contrast with WebAIM Contrast Checker
 *
 * ## Resources:
 *
 * - WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
 * - ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
 * - WebAIM: https://webaim.org/
 */

export const A11Y_FEATURES = {
  skipLink: 'Skip to main content link visible on focus',
  semanticHTML: 'Proper use of main, nav, section, article elements',
  ariaLabels: 'Descriptive labels for screen readers',
  focusIndicators: 'Clear focus states for keyboard navigation',
  touchTargets: 'Minimum 44x44px for touch-friendly interaction',
  colorContrast: 'WCAG AA compliant contrast ratios',
  screenReaderSupport: 'Proper heading hierarchy and labels',
  keyboardNavigation: 'Full keyboard access without mouse',
} as const;
