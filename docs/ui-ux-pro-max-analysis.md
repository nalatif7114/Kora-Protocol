# Kora Protocol — UI/UX Pro Max Design Research & Architectural Analysis

> **Mandatory design research, aesthetic audit, and scroll storytelling synthesis for Milestone FE-A3.**  
> *Conducted from the UI/UX Pro Max Design Intelligence System (`ui-ux-pro-max-skill-main`).*

---

## 1. Executive Summary & Design Philosophy

Kora is an **institutional decentralized lending and borrowing infrastructure**. Its user base consists of liquidity providers, risk officers, algorithmic liquidators, and sophisticated borrowers. 

The UI/UX Pro Max skill explicitly categorizes **Fintech / Crypto / Financial Infrastructure** under:
- **Recommended Pattern**: *Trust & Authority* + *Scroll-Triggered Storytelling* (Pattern #10 & #33)
- **Primary Style Family**: *Minimalism & Swiss Style* + *Accessible & Ethical* (Style #1 & #8)
- **Visual Tone**: Dark Mode (OLED / Slate), High Contrast, Calm, Restrained, Deterministic
- **Core Emotional Need**: *Solvency, precision, transparency, security, predictability*
- **Primary Anti-Patterns**: *AI purple/pink gradients, playful designs, excessive simultaneous motion, continuous decorative animations, unclear fees/parameters, superficial glowing particles.*

### The Core Mandate
> **3D and motion must communicate system state, not decorate a website.**  
> If an animation does not explain capital routing, collateral backing, rate curvature, or solvency margins, **it must not exist**.

---

## 2. Deep Extraction of UI/UX Pro Max Principles

### 2.1 Visual Hierarchy & Composition
1. **Typography Scale & Rhythm (`typography.csv`)**:
   - **Display / Hero**: Crisp sans-serif (`Inter`, `-apple-system`, `system-ui`) with tight tracking (`-0.02em` to `-0.03em`) and disciplined line-height (`1.05` to `1.15`).
   - **Labels & Micro-Copy**: Monospace (`JetBrains Mono`, `ui-monospace`) for mathematical units ($10^{27}$ Ray, APY, LTV, addresses). Monospace communicates engineering rigor, but must be set at smaller optical sizes (`11px`–`13px`) with letter-spacing (`+0.05em`) to avoid clunky reading.
   - **Measure (Line Length)**: Body paragraphs must never exceed $65\text{--}75\text{ch}$ (`max-w-prose` / `max-w-xl`). Overly wide text lines destroy reading cadence.
2. **Spacing Grid & Proportions**:
   - Strict 8pt spatial grid (`gap-2`, `gap-4`, `gap-6`, `gap-8`, `gap-12`, `gap-16`).
   - Macro-spacing (between sections: `96px`–`128px`) allows complex technical concepts to breathe. High whitespace signals institutional confidence.
3. **Content Density & Hierarchy**:
   - Every view must have **exactly one primary visual focal point**, **one secondary supporting element**, and **tertiary contextual data**.
   - Equal-weight metric cards side-by-side create cognitive competition. Instead, use scale, typographic contrast, and spatial separation to establish an indisputable order of importance.

---

### 2.2 Motion Design & Animation Discipline (`motion.csv` & `ux-guidelines.csv`)

| Interaction / Motion Role | Recommended Timing | Easing Function | Behavior & Constraint |
| :--- | :--- | :--- | :--- |
| **Micro-Interactions (Button/Hover)** | $150\text{--}200\text{ms}$ | `power1.out` / `ease-out` | Minimal displacement ($\le 2\text{px}$). Runs on `transform`/`opacity` only. Reverse tween on mouseleave. |
| **Section Content Fade & Reveal** | $300\text{--}400\text{ms}$ | `power1.out` / `cubic-bezier(0.16, 1, 0.3, 1)` | Y-offset strictly under $16\text{px}$. Reads as an elegant fade, not an exaggerated slide. |
| **Scroll Scrub Camera Interpolation** | Continuous scrub | Damped `lerp` ($\alpha = 0.04\text{--}0.08$) | Deterministic section targets. Damping eliminates jerky wheel snaps and browser scroll desync. |
| **State Transitions (Node Focus)** | $300\text{--}500\text{ms}$ | `power2.out` | Smooth lerp of emissive intensity, scale, and material opacity. Never snap abruptly. |

#### Critical Motion Rules from the Skill:
1. **Rule of 1–2 Moving Elements (Rule #7 in `ux-guidelines.csv`)**:
   > *"Too many animations cause distraction and motion sickness. Animate 1–2 key elements per view maximum."*
2. **Eliminate Continuous Decorative Loops (Rule #13 in `ux-guidelines.csv`)**:
   > *"Infinite animations are distracting. Use for loading indicators only, not for decorative elements."*
   - In Kora, objects should not spin constantly in idle state. Idle rotation must be imperceptible ($\le 0.05\text{ rad/s}$) or halted when the user is reading technical copy.
3. **Asymmetric Timing**:
   - Entrances should resolve faster and smoother than exits ($300\text{ms}$ in, $200\text{ms}$ out).
4. **Pause Offscreen / Tab Hidden (Rule #34 in `threejs.csv`)**:
   - Three.js loop and RAF listeners must immediately halt on `document.visibilityState === 'hidden'`.

---

### 2.3 Interaction Design & Affordances
1. **Visual Feedback on Interaction**:
   - Every clickable target must provide clear, instant feedback: cursor style, focus ring, subtle color/fill response, active press state (`active:scale-[0.98]`).
2. **Keyboard Focus & Operability (Rule #28 in `ux-guidelines.csv`)**:
   - Never suppress `outline-none` without an explicit high-contrast focus ring (`focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`).
3. **Sticky Storytelling Progression (Pattern #10 in `landing.csv`)**:
   - When using scroll-triggered storytelling, the viewport must pin smoothly with deterministic height.
   - The user must always feel in complete control of scroll speed. Never hijack the scrollbar or accelerate scroll speed unpredictably.
   - The active chapter/section must be reflected in a minimal HUD indicator, allowing click-to-jump navigation.

---

### 2.4 Anti-Patterns & "AI-Looking" Design Checklist

The UI/UX Pro Max skill identifies clear hallmarks of amateur or AI-generated design that must be systematically eliminated:

| AI / Template Anti-Pattern | How It Manifests in Code | Kora Architectural Correction |
| :--- | :--- | :--- |
| **Compounding Infinite Motion** | 4–5 things spinning, pulsing, and bobbing at the same time. | **Unified Calm**: Idle scene is nearly static. Motion only triggers on scroll scrub or hover focus. |
| **Gratuitous Gradients & Neon Glows** | Rainbow text gradients (`from-purple-500 via-pink-500 to-cyan-500`) and blinding bloom. | **Monochromatic Slate + Single Semantic Accent**: Slate-100 headers, muted slate-400 body, and targeted emerald/cyan/blue for verified states. |
| **Decorative Filler Elements** | Random floating rings, floating crypto coins, arbitrary grid lines, glowing background blobs. | **Pure Semantic Geometry**: Every 3D node represents an actual contract module (`LiquidityCore`, `CollateralMatrix`, `BorrowHub`, `RiskPerimeter`). No floating coins or decorative polyhedra. |
| **Uniform Spacing & Equal Weight** | Every card is the same box with the same padding and the same border. | **Asymmetric Hierarchy**: Clear anchor cards, differentiated scales, varied typography, distinct secondary tags. |
| **Generic Pulse Dots Everywhere** | Every single badge has a blinking green pulse dot. | **Intentional State Only**: Pulse only on active live oracle telemetry or active risk recalculation. |
| **Disconnected Tech Demo Feel** | 3D scene sits in an isolated box while web text sits in another box with zero semantic link. | **Integrated Narrative Canvas**: The 3D scene serves as the spatial environment that shifts perspective to explain each chapter of Kora's protocol. |

---

## 3. Critical Audit of Existing FE-A2 Implementation

Let's evaluate Kora's current FE-A2 codebase against these extracted principles:

### 3.1 `LiquidityCore.tsx`
- **Issue**: Simultaneously rotates the outer group (`rotation.y = time * 0.15`), counter-rotates `rayRing1` (`rotation.z = -time * 0.12`), rotates `rayRing2` (`rotation.x = time * 0.1`), and pulses the inner core sphere scale continuously.
- **Verdict**: **Violates Rule #13 (Continuous Animation)**. It feels like a 3D screensaver rather than an accounting engine.
- **Recommendation**: Drastically reduce or eliminate continuous idle rotation. The core should remain stable and structured. Subtle rotation should only occur when scroll progress scrubs the timeline.

### 3.2 `CapitalFlow.tsx`
- **Issue**: 30 particles constantly traveling along 5 bezier paths simultaneously, even when the user is reading hero text.
- **Verdict**: High visual noise competing with typography.
- **Recommendation**: In the idle state, capital flow should be stationary or move with an imperceptible trickle. When the user scrolls into the *Liquidity* or *Borrow* sections, the relevant paths illuminate and pulses flow with purpose.

### 3.3 `RiskPerimeter.tsx`
- **Issue**: Elliptical ring tilts continuously, and 3 sentinel beacons orbit endlessly.
- **Verdict**: Unnecessary background motion.
- **Recommendation**: Lock the perimeter tilt to an engineered, stable orientation. Sentinels advance smoothly along the perimeter as scroll scrub progresses, stopping when scroll stops.

### 3.4 `HeroCamera.tsx`
- **Issue**: Binds pointer parallax directly to camera position on every frame. If combined with scroll-driven camera translation, the two motions fight each other, causing camera wobble and potential nausea.
- **Verdict**: Needs clean separation between scroll-timeline camera positioning and pointer parallax.
- **Recommendation**: Pointer parallax should be dampened to near-zero ($\pm 0.15$) during scroll transitions, only providing a whisper of depth when the scroll settles.

### 3.5 `HeroCopy.tsx` & `HeroCTA.tsx`
- **Issue**: The hero section currently has a generic badge (`/ v1.0 MAINNET` with green pulse), a 3-stop text gradient, and 3 identical small metric boxes underneath.
- **Verdict**: Looks slightly template-like.
- **Recommendation**: Replace generic badges with clean, high-contrast institutional metadata. Create typographic hierarchy where one primary metric dominates and secondary data provides quiet support.

### 3.6 `SmoothScrollProvider.tsx`
- **Issue**: Global Lenis is initialized, but does not provide a scoped storytelling progress calculation or section jump helper for child components.
- **Verdict**: Needs enhancement to support programmatic section scrolling (`lenis.scrollTo(...)`) and section-based progress normalization without duplicating listeners.

---

## 4. Practical Design Specifications for FE-A3 (Scroll Storytelling)

### 4.1 Narrative Structure & Spatial Progression
The storytelling sequence must guide the user through the logical lifecycle of capital:

```text
[0.00 – 0.15]  CHAPTER 1: SYSTEM OVERVIEW
               • 3D Scene: Neutral, balanced overview of the full infrastructure cluster.
               • DOM: "Lending, Engineered." Core value proposition and institutional positioning.

[0.15 – 0.30]  CHAPTER 2: LIQUIDITY SUPPLY
               • 3D Scene: Camera pans into asset nodes (USDC, WETH, WBTC) and the Reserve Core.
               • Motion: Supply filaments illuminate; cash liquidity pulse deepens.
               • DOM: "Liquidity becomes productive." Scaled balance accounting, $O(1)$ accrual.

[0.30 – 0.45]  CHAPTER 3: COLLATERAL ARCHITECTURE
               • 3D Scene: Camera elevates towards Collateral Matrix (top-right).
               • Motion: Cyan matrix structure lights up; Max LTV (75%) and Liquidation Thresholds (80%) emerge.
               • DOM: "Over-collateralized by design." Multi-tier asset safety and borrowing capacity.

[0.45 – 0.60]  CHAPTER 4: DYNAMIC BORROW ENGINE
               • 3D Scene: Camera shifts down towards Borrow Hub (bottom-right).
               • Motion: Borrow outflow paths activate; Two-Kink utilization curve highlights.
               • DOM: "Adaptive rates that protect liquidity." 2% base rate, 80% optimal kink, 75% slope jump.

[0.60 – 0.75]  CHAPTER 5: DETERMINISTIC INTEREST ACCRUAL
               • 3D Scene: Camera zooms into Reserve Core center; Ray index concentric rings align.
               • Motion: 1e27 Ray precision tick marks illuminate; discrete capital packets route across the core.
               • DOM: "Mathematical certainty." Continuous linear compounding without loop gas costs.

[0.75 – 0.90]  CHAPTER 6: RISK PERIMETER & SOLVENCY
               • 3D Scene: Camera pulls back to elevated wide-angle view of the full orbital Risk Perimeter.
               • Motion: Orbit perimeter glows emerald; 3 sentinel beacons (Oracles, Solvency, Risk) lock into place.
               • DOM: "Continuous solvency verification." Real-time Health Factor ($HF = 1.84$) and Chainlink feeds.

[0.90 – 1.00]  CHAPTER 7: SECURITY & PROTOCOL ACCESS
               • 3D Scene: Camera smoothly re-centers to a grounded, pristine architectural state.
               • Motion: Motion calms; system stabilizes into full readiness.
               • DOM: "Institutional security at every layer." Dynamic close factors (50%/100%), Launch App CTA.
```

---

### 4.2 Spacing, Typography & Contrast Standards
- **Background**: `#090d16` (Deep Obsidian / Midnight Slate) — authentic, non-fatiguing dark background.
- **Text Contrast**:
  - Primary Headlines: `#ffffff` ($21:1$ contrast against `#090d16`).
  - Secondary Body: `#94a3b8` / `slate-400` ($6.5:1$ contrast, passing WCAG AAA).
  - Accents: Single semantic colors only — `#10b981` (Emerald for solvency/safety), `#0ea5e9` (Trust Blue for protocol core), `#06b6d4` (Cyan for collateral). Zero arbitrary purple or pink gradients.
- **Card Spacing**: Narrative cards use `p-6` to `p-8`, subtle borders (`border-slate-800`), dark matte backgrounds (`bg-slate-900/80` with `backdrop-blur-md`), and zero noisy drop-shadows.

---

### 4.3 Mobile & Responsive Strategy
- **Desktop ($\ge 1024\text{px}$)**:
  - Sticky two-column composition: Left side hosts the scrolling narrative cards ($45\%$ width); right side hosts the sticky 3D visual viewport ($55\%$ width).
  - Subtle mouse parallax active when scroll is settled.
- **Tablet ($768\text{px}\text{--}1023\text{px}$)**:
  - 3D scene sits in sticky background with increased opacity fade; narrative cards scroll over in a readable, centered column.
  - Camera travel range reduced by $40\%$.
- **Mobile ($< 768\text{px}$)**:
  - Simplified sticky visual header or compact backdrop.
  - Camera transitions simplified to gentle Z-distance and subtle Y-tilts.
  - Narrative cards have generous touch targets ($\ge 48\text{px}$), concise copy, and zero horizontal scroll overflow.

---

### 4.4 Reduced Motion & Accessibility Strategy (`prefers-reduced-motion`)
- **Strictly respected via reactive listener** (`window.matchMedia('(prefers-reduced-motion: reduce)')`).
- When active:
  - Camera positions snap or transition instantly without easing lag.
  - All idle continuous rotations (core, rings, particles, beacons) are completely stopped.
  - The scene is rendered as a clean, static, high-contrast architectural model.
  - DOM section cards use standard opacity fades without transforms (`y: 0`).
  - Smooth scrolling interpolation in Lenis is disabled, reverting to standard accessible scrolling.
- **No-WebGL Fallback**:
  - When WebGL fails, `HeroSceneFallback.tsx` remains fixed in the sticky visual area and smoothly highlights the active schematic node as the user scrolls past each chapter.

---

## 5. Summary of Actions for FE-A3

1. **Eliminate Compounding Continuous Animation**:
   - Refactor `LiquidityCore.tsx`, `CapitalFlow.tsx`, and `RiskPerimeter.tsx` so they do not all rotate and pulse simultaneously in idle state. Motion will be scrubbed by scroll and calmed during reading.
2. **Build `useStoryProgress.ts` Hook**:
   - Normalized container-aware scroll progress derived cleanly from global Lenis without re-rendering the entire React tree on scroll ticks.
3. **Build `ScrollStory.tsx`**:
   - The sticky layout container holding the persistent 3D canvas and driving the 7-chapter narrative cards.
4. **Implement Deterministic `HeroCamera.tsx` Timeline**:
   - Exact mathematical transforms for each chapter, with delta-clamped lerp damping ($\alpha = 0.05$).
5. **Add Minimal HUD `SectionProgress.tsx`**:
   - High-contrast, non-intrusive step indicators (`01 LIQUIDITY`, `02 COLLATERAL`, etc.) with Lenis-aware smooth click-to-scroll navigation.
