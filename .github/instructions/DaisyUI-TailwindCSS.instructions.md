---
applyTo: '**'
---
## 🎨 DaisyUI + TailwindCSS Design System Guidelines

### 📋 Core Principles
- **Consistency**: Use DaisyUI components as base, extend with Tailwind utilities
- **Accessibility**: Semantic HTML + DaisyUI accessibility features
- **Responsiveness**: Mobile-first approach with Tailwind breakpoints
- **Performance**: Avoid inline styles, prefer utility classes
- **Maintainability**: Consistent spacing, colors, and component patterns

---

## 🧱 Component Architecture

### Base Component Structure
```svelte
<div class="card bg-base-100 shadow-lg">
  <div class="card-body p-3">
    <h3 class="card-title text-sm mb-2">
      <span class="text-base">🎯</span>
      Component Title
    </h3>
    <!-- Content -->
  </div>
</div>
```

### Layout Containers
- **Full screen**: `h-screen` or `h-full` depending on context
- **Flexible layouts**: `flex flex-col` + `flex-1` for expansion
- **Grid systems**: `grid grid-cols-X gap-Y` for structured layouts
- **Overflow management**: `overflow-hidden` + conditional `overflow-y-auto`

---

## 🎨 Color Palette & Theming

### Semantic Colors (DaisyUI)
```css
/* Backgrounds */
bg-base-100    /* Cards, main content */
bg-base-200    /* Secondary backgrounds */
bg-base-300    /* Borders, dividers */

/* Interactive Elements */
bg-primary     /* Main actions */
bg-secondary   /* Secondary actions */
bg-accent      /* Highlights */

/* Status Colors */
bg-success     /* Positive feedback */
bg-warning     /* Caution */
bg-error       /* Errors */
bg-info        /* Information */

/* Gradients */
bg-gradient-to-br from-base-300/20 via-base-200/10 to-base-100
bg-gradient-to-r from-primary/8 to-secondary/8
```

### Text Colors
```css
text-base-content      /* Primary text */
text-base-content/70   /* Secondary text */
text-base-content/50   /* Disabled/muted text */
text-primary           /* Links, important text */
text-error             /* Error messages */
```

---

## 📏 Spacing System

### Consistent Spacing Scale
```css
/* Micro spacing */
gap-1, p-1, m-1      /* 4px - tight elements */
gap-2, p-2, m-2      /* 8px - small spacing */

/* Standard spacing */
gap-3, p-3, m-3      /* 12px - default card padding */
gap-4, p-4, m-4      /* 16px - section spacing */

/* Macro spacing */
gap-6, p-6, m-6      /* 24px - large sections */
gap-8, p-8, m-8      /* 32px - major separations */
```

### Layout Guidelines
- **Card padding**: `p-3` standard, `p-2` for compact
- **Section gaps**: `space-y-3` in vertical lists
- **Grid gaps**: `gap-3` standard, `gap-4` for more breathing room
- **Container margins**: `px-3` mobile, `px-4` desktop

---

## 🔤 Typography Scale

### Headings
```css
text-xs      /* 12px - Small labels, metadata */
text-sm      /* 14px - Secondary text, captions */
text-base    /* 16px - Body text, default */
text-lg      /* 18px - Section headers */
text-xl      /* 20px - Page titles */
text-2xl     /* 24px - Major headings */
```

### Font Weights & Styles
```css
font-normal     /* Regular text */
font-medium     /* Emphasized text */
font-semibold   /* Section titles */
font-bold       /* Page titles */

opacity-50      /* Disabled text */
opacity-70      /* Secondary text */
```

---

## 🎛️ Interactive Components

### Buttons (DaisyUI)
```svelte
<!-- Primary Actions -->
<button class="btn btn-primary">Main Action</button>

<!-- Secondary Actions -->
<button class="btn btn-secondary">Secondary</button>

<!-- Neutral Actions -->
<button class="btn">Default</button>

<!-- Size Variants -->
<button class="btn btn-xs">Extra Small</button>
<button class="btn btn-sm">Small</button>
<button class="btn btn-lg">Large</button>

<!-- States -->
<button class="btn btn-primary" disabled>Disabled</button>
<button class="btn btn-primary loading">Loading</button>
```

### Cards & Containers
```svelte
<!-- Standard Card -->
<div class="card bg-base-100 shadow-lg">
  <div class="card-body p-3">
    <!-- Content -->
  </div>
</div>

<!-- Compact Card -->
<div class="card bg-base-100 shadow-sm">
  <div class="card-body p-2">
    <!-- Content -->
  </div>
</div>
```

### Form Elements
```svelte
<!-- Input Fields -->
<input class="input input-bordered w-full" />
<textarea class="textarea textarea-bordered w-full"></textarea>
<select class="select select-bordered w-full"></select>

<!-- Form Groups -->
<div class="form-control w-full">
  <label class="label">
    <span class="label-text">Field Label</span>
  </label>
  <input class="input input-bordered" />
</div>
```

---

## 📱 Responsive Design Patterns

### Breakpoint Strategy
```css
/* Mobile First (default) */
class="text-sm p-2"

/* Tablet+ */
class="md:text-base md:p-3"

/* Desktop+ */
class="lg:text-lg lg:p-4"

/* Large Desktop+ */
class="xl:text-xl xl:p-6"
```

### Layout Adaptations
```svelte
<!-- Responsive Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

<!-- Responsive Flex -->
<div class="flex flex-col md:flex-row gap-3">

<!-- Responsive Visibility -->
<div class="hidden md:block">Desktop only</div>
<div class="block md:hidden">Mobile only</div>
```

---

## 🎭 Animation & Transitions

### Standard Transitions
```css
/* Hover Effects */
hover:scale-105         /* Subtle scale on hover */
hover:shadow-lg         /* Shadow increase */
hover:bg-base-200       /* Background change */

/* Transition Classes */
transition-all duration-300 ease-in-out
transition-colors duration-200
transition-transform duration-150
```

### Loading States
```svelte
<!-- Loading Spinner -->
<div class="loading loading-spinner loading-md"></div>

<!-- Loading Button -->
<button class="btn loading">Processing...</button>

<!-- Skeleton Loading -->
<div class="skeleton h-4 w-full"></div>
```

---

## 🏗️ Layout Patterns

### Game Interface Layout
```svelte
<!-- Full Screen Container -->
<div class="h-full flex flex-col">
  
  <!-- Fixed Header -->
  <div class="flex-shrink-0 bg-base-100 border-b border-base-300 p-3">
    <!-- Header content -->
  </div>
  
  <!-- Expandable Content -->
  <div class="flex-1 overflow-y-auto">
    <!-- Scrollable content -->
  </div>
  
  <!-- Fixed Footer -->
  <div class="flex-shrink-0 bg-base-200 border-t border-base-300 p-3">
    <!-- Footer content -->
  </div>
</div>
```

### Split Panel Layout
```svelte
<div class="flex h-full overflow-hidden">
  <!-- Left Panel -->
  <div class="w-[30%] bg-base-200/50 border-r border-base-300 overflow-hidden">
    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <!-- Scrollable left content -->
    </div>
  </div>
  
  <!-- Right Panel -->
  <div class="w-[70%] flex flex-col overflow-hidden">
    <!-- Right panel content -->
  </div>
</div>
```

---

## 🔧 Utility Patterns

### Conditional Classes (Svelte)
```svelte
<!-- Boolean conditions -->
<div class:active={isActive} class:disabled={!isEnabled}>

<!-- Multiple conditions -->
<div 
  class="btn"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:loading={isLoading}
>

<!-- Ternary expressions -->
<div class={isLarge ? 'text-xl p-6' : 'text-sm p-3'}>
```

### Common Utility Combinations
```css
/* Centering */
flex items-center justify-center
grid place-items-center

/* Full coverage */
absolute inset-0
fixed inset-0

/* Aspect ratios */
aspect-square
aspect-video
aspect-[4/3]

/* Scrolling */
overflow-hidden
overflow-y-auto
scroll-smooth
```

---

## 🎯 Component Specific Guidelines

### Game Cards
```svelte
<div class="card bg-base-100 shadow-lg">
  <div class="card-body p-3">
    <h3 class="card-title text-sm mb-2">
      <span class="text-base">🎯</span>
      Card Title
    </h3>
    <!-- Card content with space-y-2 for items -->
    <div class="space-y-2">
      <!-- Items -->
    </div>
  </div>
</div>
```

### Action Buttons
```svelte
<!-- Game action button -->
<button 
  class="btn btn-primary btn-sm w-full justify-start"
  class:btn-disabled={!action.is_possible}
>
  <span class="text-left">Action Text</span>
</button>
```

### Modal Patterns
```svelte
<!-- DaisyUI Modal -->
<dialog class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg mb-4">Modal Title</h3>
    <!-- Modal content -->
    <div class="modal-action">
      <button class="btn">Close</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</dialog>
```

---

## ⚠️ Common Pitfalls to Avoid

### ❌ Don't Do
```css
/* Avoid inline styles */
style="color: red; margin: 10px;"

/* Avoid arbitrary values without reason */
w-[347px] h-[123px]

/* Avoid mixing semantic and arbitrary colors */
bg-red-500 text-blue-300

/* Avoid deep nesting without structure */
<div><div><div><div>content</div></div></div></div>
```

### ✅ Do Instead
```css
/* Use utility classes */
text-error m-3

/* Use design system values */
w-full h-24

/* Use semantic colors */
bg-error text-error-content

/* Use semantic structure */
<section><header><main><footer>
```

---

## 🎨 Theme Customization

### DaisyUI Theme Variables
```css
/* Base colors (auto-managed by DaisyUI) */
--b1: base-100 background
--b2: base-200 background  
--b3: base-300 background
--bc: base-content text

/* Semantic colors */
--p: primary color
--s: secondary color
--a: accent color
```

### Custom CSS (when needed)
```css
/* Use @apply for reusable patterns */
.game-panel {
  @apply bg-base-100 rounded-lg shadow-lg p-3;
}

/* Use CSS variables for dynamic values */
.progress-bar {
  width: var(--progress-width, 50%);
}
```

---

## 📝 Best Practices Summary

1. **Start with DaisyUI components**, extend with Tailwind utilities
2. **Use semantic color classes** instead of specific color values
3. **Maintain consistent spacing** with the 4px grid system
4. **Apply responsive design** with mobile-first approach
5. **Use conditional classes** in Svelte for dynamic styling
6. **Avoid inline styles** and arbitrary values without justification
7. **Structure layouts** with flexbox and grid for maintainability
8. **Test accessibility** with screen readers and keyboard navigation
9. **Optimize for performance** by avoiding unnecessary re-renders
10. **Document custom patterns** when they become reusable

---

## 🔄 Maintenance Notes

- Review color usage quarterly for consistency
- Update spacing patterns when new components are added
- Monitor bundle size impact of utility classes
- Test responsive behavior on actual devices
- Validate accessibility compliance regularly
- Keep DaisyUI and Tailwind versions in sync
- Document any custom utility patterns that emerge

---

*Last updated: 2025-01-24*
*Version: 1.0.0*
