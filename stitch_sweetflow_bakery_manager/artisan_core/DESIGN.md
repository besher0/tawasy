---
name: Artisan Core
colors:
  surface: '#f4faff'
  surface-dim: '#cfdce4'
  surface-bright: '#f4faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e9f6fd'
  surface-container: '#e3f0f8'
  surface-container-high: '#ddeaf2'
  surface-container-highest: '#d7e4ec'
  on-surface: '#111d23'
  on-surface-variant: '#5b3f43'
  inverse-surface: '#263238'
  inverse-on-surface: '#e6f3fb'
  outline: '#8f6f73'
  outline-variant: '#e4bdc2'
  surface-tint: '#bc004b'
  primary: '#b80049'
  on-primary: '#ffffff'
  primary-container: '#e2165f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2be'
  secondary: '#6b5a60'
  on-secondary: '#ffffff'
  secondary-container: '#f4dce4'
  on-secondary-container: '#716066'
  tertiary: '#00685e'
  on-tertiary: '#ffffff'
  tertiary-container: '#008377'
  on-tertiary-container: '#f4fffb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9de'
  primary-fixed-dim: '#ffb2be'
  on-primary-fixed: '#400014'
  on-primary-fixed-variant: '#900038'
  secondary-fixed: '#f4dce4'
  secondary-fixed-dim: '#d7c1c8'
  on-secondary-fixed: '#25181e'
  on-secondary-fixed-variant: '#524249'
  tertiary-fixed: '#85f6e5'
  tertiary-fixed-dim: '#67d9c9'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#f4faff'
  on-background: '#111d23'
  surface-variant: '#d7e4ec'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
  container-max: 1280px
---

## Brand & Style
The design system is engineered for a professional B2B cake production environment, balancing the high-energy precision of a commercial bakery with the rigorous data requirements of enterprise management. The brand personality is efficient, vibrant, and dependable. 

The aesthetic follows a **Corporate / Modern** approach with a "Confectionary Precision" twist. It utilizes a clean, white-space heavy layout to ensure clarity in high-pressure kitchen environments, while using vibrant pink accents to celebrate the craft. The interface must feel "delicious" but strictly professional, avoiding overly "cute" elements in favor of streamlined, task-oriented workflows.

## Colors
This design system utilizes a high-visibility palette optimized for legibility and status tracking.

- **Primary (Vibrant Pink):** Used for primary actions, branding, and active progress states. It provides high contrast against white backgrounds.
- **Secondary (Soft Petal):** A light pastel pink used for surface backgrounds, hover states, and tonal layering to prevent visual fatigue.
- **Tertiary (Mint Teal):** A functional contrast color used for "Success" states, completion indicators, and secondary data points to balance the warmth of the pink.
- **Neutral (Slate):** A deep, professional grey-blue used for typography and structural borders to maintain a grounded, B2B feel.
- **Status Tones:** Standardized Semantic colors for Warning (Amber) and Error (Rose Red) are required for production line alerts.

## Typography
The typography system prioritizes clarity and rapid scanning. While the tokens specify **Be Vietnam Pro** for its modern, geometric clarity in English contexts, for the **RTL/Arabic** implementation, use **Cairo**. 

Cairoâ€™s wide apertures and stable baseline ensure that technical data (weights, temperatures, times) remain legible even on smaller mobile screens in a dusty or high-glare kitchen setting. All line heights are generous to accommodate the taller ascenders and descenders of Arabic script. Headlines use a Bold weight (700) to create a clear information hierarchy, while body text remains at Regular (400) for long-form instruction reading.

## Layout & Spacing
This design system utilizes a **Mobile-First, Fluid Grid** model.

- **RTL Alignment:** The entire grid and spacing logic must flip for Arabic localization. Margins on the right become the primary start-point.
- **Mobile (Base):** Single column layout with 16px side margins. Cards span the full width of the viewport.
- **Desktop (Dashboard):** A 12-column grid. Side navigation is docked to the right (in RTL mode). Content areas utilize a maximum width of 1280px to prevent excessive line lengths in data tables.
- **Rhythm:** An 8px linear scale is used for all component spacing (padding, gaps). Use 4px increments only for tight-knit label/input pairings.

## Elevation & Depth
To maintain a modern B2B feel, this design system uses **Tonal Layers** combined with **Ambient Shadows**.

- **Surface Levels:** The base background is slightly off-white (#FAFAFA). Primary cards use a pure white background to "pop."
- **Shadows:** Use extremely soft, high-diffusion shadows (Blur: 20px, Spread: -4px, Opacity: 6%) with a slight Pink-Neutral tint to prevent a "dirty" look.
- **Interaction:** On hover or active state, cards should slightly lift (increase shadow) or gain a 2px Primary border.
- **Depth Hierarchy:** Modals and Pop-overs occupy the highest elevation, using a semi-transparent backdrop blur (12px) to keep the user focused on the production task at hand.

## Shapes
The shape language is **Rounded**, reflecting the organic nature of the product (cakes, pastries) while maintaining professional structure. 

- **Components:** Standard buttons and input fields use a 0.5rem (8px) corner radius. 
- **Cards:** Main dashboard containers and production cards use a 1rem (16px) radius to create a soft, friendly "container" for data.
- **Status Badges:** Use a pill-shape (full rounding) to distinguish them from interactive buttons.

## Components
- **Buttons:** Primary buttons are solid Primary Pink with white text. Secondary buttons use a Pink outline with a 5% Pink fill.
- **Production Cards:** These are the heart of the system. They must include a clear status badge (top-right in RTL), a bold title (Cake Name), and a "Step Progress" indicator.
- **Status Indicators (Badges):** High-contrast background with dark text. 
    - *Pending:* Neutral Grey
    - *In Progress:* Primary Pink
    - *Ready:* Tertiary Mint
    - *Delayed:* Warning Amber
- **Input Fields:** Large tap targets (min 48px height) for mobile. Borders are Slate-200, turning Primary Pink on focus. Labels must be pinned to the right (RTL).
- **Data Tables:** For the desktop dashboard, use "Zebra-striping" with the Secondary color (Soft Petal) for better horizontal scanning of order rows.
- **Quantity Pickers:** Large "+" and "-" buttons are essential for production staff wearing gloves or working quickly; these should be prominent in recipe views.