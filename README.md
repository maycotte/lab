# ASCII Earth Globe - Maycotte.com Homepage

## The Vision
After decades of owning maycotte.com, it's time for something special. This project is the inaugural homepage - a technical, eccentric, and awesome ASCII Earth globe that connects the Maycotte family across our cities: Austin, Seattle, San Miguel de Allende, and soon San Antonio.

## Project Goals
- **Technical**: Showcase coding prowess with real-time 3D to ASCII conversion
- **Eccentric**: Unique retro-terminal aesthetic that stands out
- **Traveler**: Interactive globe highlighting our family's locations
- **Awesome**: Make visitors say "whoa, what is this?"
- **Family Connection**: Acknowledge and celebrate where we all live

## Current Implementation
- **Technology Stack**: Three.js (r128), vanilla JavaScript, HTML/CSS
- **Resolution**: 48x48 ASCII grid
- **Rendering**: Real-time 3D sphere with Earth texture converted to ASCII
- **ASCII Palette**: `"   ·—+=##"` (from dark to light)
- **Visual Style**: Green phosphor terminal aesthetic with circular viewport

## Feature Roadmap

### Phase 1: Core Enhancements
1. **Floating/Bouncing Animation**: Gentle drift animation for the globe
2. **Day/Night Visualization**: Real-time shading based on actual sun position
3. **City Highlights**: Special markers for family cities:
   - Austin, TX
   - Seattle, WA
   - San Miguel de Allende, Mexico
   - San Antonio, TX

### Phase 2: The Journey Features
4. **Flight Path Animations**: Connect our cities with animated paths
5. **City Zoom Sequences**: Cinematic zooms to each location
6. **Location Labels**: ASCII art city names during zoom
7. **Time Displays**: Show current time in each city

### Phase 3: Interactive & Personal Touches
8. **Click Navigation**: Click to visit each family city
9. **Welcome Message**: "Welcome to Maycotte.com" in ASCII art
10. **Family Mode**: Special animations when family members visit
11. **Travel Stats**: Distance between cities, flight times

### Phase 4: Technical Flourishes
12. **Retro Boot Sequence**: Terminal-style startup
13. **CRT Effects**: Scanlines and phosphor glow
14. **Weather Integration**: Live weather at each location
15. **ISS Tracker**: When it passes over our cities
16. **Matrix Rain Background**: Because it's awesome

### Phase 5: Advanced Features
17. **Mobile Responsive**: Touch controls for phones/tablets
18. **Multiple Themes**: Green, amber, blue phosphor options
19. **Easter Eggs**: Hidden features for curious visitors
20. **About Page**: Family history and city connections

## Technical Architecture
```
/maycotte.com
├── index.html          # Main HTML file
├── style.css          # Retro terminal aesthetics
├── main.js            # Core globe and animation logic
├── texture.js         # Earth texture data
├── cities.js          # Family city coordinates and data
├── effects.js         # Visual effects and animations
└── README.md          # This file
```

## The Maycotte Cities

### Austin, Texas
- Latitude: 30.2672° N
- Longitude: 97.7431° W
- Family significance: [to be filled]

### Seattle, Washington  
- Latitude: 47.6062° N
- Longitude: 122.3321° W
- Family significance: [to be filled]

### San Miguel de Allende, Mexico
- Latitude: 20.9144° N
- Longitude: 100.7450° W
- Family significance: [to be filled]

### San Antonio, Texas
- Latitude: 29.4241° N
- Longitude: 98.4936° W
- Family significance: [coming soon]

## Design Philosophy
- **First Impressions Matter**: This is the first thing people see on maycotte.com
- **Technical but Approachable**: Complex under the hood, magical to watch
- **Personal Touch**: Every feature should connect to the family story
- **Performance**: Smooth on all devices, from phones to desktops
- **Timeless**: Retro aesthetic that won't feel dated

## Contact
**Creator**: ho@maycotte.com

## Development Notes
- Each feature can be toggled for performance
- Mobile-first responsive design
- Accessibility considerations for screen readers
- Progressive enhancement approach

## Future Dreams
- Family member login for personalized views
- Historical family migration paths
- Photo integration at each location
- Maycotte family tree visualization
- Time capsule messages between cities

---

*"After decades of digital real estate, maycotte.com finally has a home as unique as our family's journey."*

# Technical Issues Summary

## ASCII Coverage Problem - Deep Dive

### What We're Seeing:
- ASCII text only occupies ~60% of the container width
- Globe is cut off on the right side
- Bottom portion is empty
- Text appears bunched in upper-left

### Root Cause Analysis:
```javascript
// Current approach:
fontSize = lineHeight * 0.85;

// Problem: Monospace fonts have aspect ratios!
// Inconsolata character width ≈ 0.6 * height
// So a 48x48 grid needs different calculations
```

### Potential Fix:
```javascript
// Calculate based on which dimension is limiting
const charWidth = globeSize / CONFIG.ascii.cols;
const charHeight = globeSize / CONFIG.ascii.rows;
const fontSize = Math.min(charWidth / 0.6, charHeight * 0.9);
```

## Button Event Problem - Investigation

### What's Happening:
- Buttons render in HTML
- Click events don't fire
- No console errors
- Hover states work (cursor changes)

### Debugging Attempts:
1. ❌ Inline onclick
2. ❌ addEventListener after creation
3. ❌ setTimeout wrapping
4. ❌ Z-index elevation
5. ❌ Direct element.onclick assignment

### Likely Culprit:
```javascript
// This might be the issue:
debugDiv.innerHTML = `...`; // Recreating DOM every frame!

// Solution: Update text content only, not recreate buttons
```

## Coordinate System Confusion

### Three.js vs Screen vs ASCII:
```
Three.js: Y-up, Z-toward camera
Screen: Y-down, origin top-left  
ASCII: Row/column, needs flipping
WebGL: Y-up from bottom
```

### Current Flip Logic:
```javascript
// We're doing this:
for (let y = HEIGHT - 1; y >= 0; y--) { // Flip Y
  for (let x = WIDTH - 1; x >= 0; x--) { // Flip X

// But maybe we need:
// 1. Read pixels normally
// 2. Flip only when converting to ASCII
// 3. Account for sphere rotation
```

## Performance Considerations

### Current Render Loop:
- 48x48 = 2,304 pixels read per frame
- 2,304 character replacements per frame
- DOM update every frame
- No optimization for static frames

### Optimization Opportunities:
1. Only update ASCII when globe actually changes
2. Use canvas for ASCII rendering instead of text
3. Reduce resolution when moving, increase when stopped
4. Cache character lookups

## Debug Visual Helpers - What Each Shows

### Yellow Border (Working ✓)
- Exact boundaries of #output element
- Should contain entire globe

### Red Crosshairs (Working ✓)  
- Viewport center (50%, 50%)
- Future: Should track globe center

### Cyan Border (Working ✓)
- Inner boundary where ASCII should render
- Currently same as yellow (no padding)

### Green Grid (Working ✓)
- 12x12 character divisions
- Helps see character alignment

### Missing Helpers We Could Add:
- Purple box: Actual ASCII text bounding box
- Orange circle: Expected globe outline
- Blue dot: Calculated globe center

## Browser Considerations

### Font Rendering Differences:
- Chrome: Subpixel antialiasing
- Firefox: Different kerning
- Safari: Font weight variations
- Mobile: Completely different metrics

### Solutions:
1. Use web fonts with explicit metrics
2. Measure actual rendered characters
3. Add platform-specific adjustments
4. Use CSS `font-feature-settings`

---

*This technical summary should help us tackle each issue systematically.*