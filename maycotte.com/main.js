// ========== CONFIGURATION ==========
const CONFIG = {
  // Debug settings
  debug: {
    enabled: false,        // Debug off by default
    showCanvas: false,
    showGrid: true,
    showMeasurements: true,
    showAlignmentHelpers: true,
    pauseMovement: false,  // Movement on by default
    pauseRotation: false,  // Rotation on by default
    showTestPattern: false
  },
  
  // Globe settings
  globe: {
    size: 30, // Percentage of viewport HEIGHT
    rotationSpeed: 0.001,
    startRotationY: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.0001,
    wobbleAmount: 0.02
  },
  
  // Floating animation
  floating: {
    enabled: true,
    speed: 0.00002,
    radiusX: 0.25,
    radiusY: 0.15,
    speed2: 0.00003,
    speed3: 0.000015,
    startX: (Math.random() - 0.5) * 0.6,
    startY: (Math.random() - 0.5) * 0.4
  },
  
  // ASCII settings
  ascii: {
    characters: "   ·—+=##",
    cols: 48,
    rows: 48
  },
  
  // Debug adjustments - YOUR SETTINGS AS DEFAULTS
  debugAdjustments: {
    globeScale: 0.5,       // Your setting
    cameraDistance: 5,     // Your setting
    cameraFOV: 35,
    globeOffsetX: 0,       // Your setting
    globeOffsetY: 0,       // Your setting
    renderOffsetX: 0,
    renderOffsetY: 0,
    // Camera orbit controls
    cameraOrbitX: 0.0,     // Your setting
    cameraOrbitY: 0.8,     // Your setting
    // Globe orientation
    globeFlipped: false,   // Normal orientation by default
    currentRotationY: 0
  },
  
  // Lighting settings for daylight/shadow
  lightingSettings: {
    lightMode: 'sun',      // 'sun' or 'moon' - sun by default
    sunIntensity: 1.2,
    sunX: 5.5,             // Your setting
    sunY: 3,               // Your setting
    sunZ: 5,
    moonIntensity: 0.1,
    moonX: -5,
    moonY: -5,
    moonZ: 5,
    ambientIntensity: 0.7, // Your setting
    sunFollowRotation: false
  },
  
  // Test pattern settings (simplified)
  testPatternSettings: {
    patternType: 'border-cross',
    gridSpacing: 4,        // Your setting - applies to all patterns
    borderChar: '#',
    crossChar: '+',
    fillChar: '.',
    gridChar: '·',
    circleChar: 'o',
    diagonalChar: '/'
  }
};

// ========== GLOBALS ==========
let animationTime = 0;
let debugInfo = {};
let sunLight, moonLight, ambientLight;

// ========== INITIALIZATION ==========
function init() {
  // Get output element first
  window.outputEl = document.getElementById("output");
  
  // Set up Three.js
  window.WIDTH = CONFIG.ascii.cols;
  window.HEIGHT = CONFIG.ascii.rows;
  
  window.scene = new THREE.Scene();
  
  // Perspective camera with adjusted FOV for better centering
  window.camera = new THREE.PerspectiveCamera(
    CONFIG.debugAdjustments.cameraFOV,
    1, // Square aspect ratio since our display is square
    0.1,
    1000
  );
  
  window.renderer = new THREE.WebGLRenderer({ 
    alpha: false, 
    antialias: false,
    preserveDrawingBuffer: true
  });
  
  renderer.setSize(WIDTH, HEIGHT);
  renderer.setClearColor(0x000000, 1);
  
  // Hide canvas
  const canvas = renderer.domElement;
  canvas.id = 'three-canvas';
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '-9999px';
  canvas.style.imageRendering = 'pixelated';
  document.body.appendChild(canvas);

  // Create debug UI - always create it
  createDebugUI();
  createAdjustmentControls();
  
  // Remove all debug inputs from tab order
  document.querySelectorAll('#debug-static input, #adjustment-controls input').forEach(input => {
    input.tabIndex = -1;
  });
  
  // Update debug info if enabled
  if (CONFIG.debug.enabled) {
    updateDebugInfo();
  }

  // Load Earth texture
  const texture = new THREE.TextureLoader().load(window.EARTH_TEXTURE);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  // Create globe - with adjustable scale
  const baseRadius = 3.0;
  const scaledRadius = baseRadius * CONFIG.debugAdjustments.globeScale;
  const geometry = new THREE.SphereGeometry(scaledRadius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.2
  });
  
  window.globe = new THREE.Mesh(geometry, material);
  globe.position.set(
    CONFIG.debugAdjustments.globeOffsetX,
    CONFIG.debugAdjustments.globeOffsetY,
    0
  );
  // Set initial rotation - Earth rotates on Y axis only
  globe.rotation.x = 0;
  globe.rotation.y = CONFIG.globe.startRotationY;
  globe.rotation.z = CONFIG.debugAdjustments.globeFlipped ? Math.PI : 0; // Normal orientation by default
  CONFIG.debugAdjustments.currentRotationY = CONFIG.globe.startRotationY;
  scene.add(globe);

  // Create lights with references
  sunLight = new THREE.DirectionalLight(0xffffff, CONFIG.lightingSettings.sunIntensity);
  sunLight.position.set(
    CONFIG.lightingSettings.sunX,
    CONFIG.lightingSettings.sunY,
    CONFIG.lightingSettings.sunZ
  );
  scene.add(sunLight);
  
  moonLight = new THREE.DirectionalLight(0x4040ff, CONFIG.lightingSettings.moonIntensity);
  moonLight.position.set(
    CONFIG.lightingSettings.moonX,
    CONFIG.lightingSettings.moonY,
    CONFIG.lightingSettings.moonZ
  );
  scene.add(moonLight);
  
  ambientLight = new THREE.AmbientLight(0x303030, CONFIG.lightingSettings.ambientIntensity);
  scene.add(ambientLight);
  
  // Apply initial lighting mode
  updateLighting();

  // Position camera with orbit
  updateCameraOrbit();

  // Set up pixel buffer
  window.gl = renderer.getContext();
  window.pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  
  updateGlobeSize();
  window.addEventListener('resize', updateGlobeSize);
  
  // Initial position update
  updateFloatingPosition();
  
  // Keyboard shortcuts
  const handleKey = (e) => {
    // Log all keys for debugging
    console.log(`Key pressed: "${e.key}", keyCode: ${e.keyCode}, target: ${e.target.tagName}`);
    
    // Don't process if already handled or user is typing in an input field
    if (e.defaultPrevented || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const key = e.key || String.fromCharCode(e.keyCode || e.which);
    
    if (key === 'd' || key === 'D' || e.keyCode === 68) {
      e.preventDefault();
      console.log("D key detected - calling toggleDebug()");
      toggleDebug();
    } else if (key === ' ' || e.keyCode === 32) {
      e.preventDefault();
      CONFIG.debug.pauseMovement = !CONFIG.debug.pauseMovement;
      CONFIG.debug.pauseRotation = !CONFIG.debug.pauseRotation;
      if (CONFIG.debug.enabled) updateDebugInfo();
      // Update button text
      const moveBtn = document.getElementById('toggle-movement-btn');
      const rotBtn = document.getElementById('toggle-rotation-btn');
      if (moveBtn) moveBtn.textContent = `${CONFIG.debug.pauseMovement ? 'Resume' : 'Pause'} Movement`;
      if (rotBtn) rotBtn.textContent = `${CONFIG.debug.pauseRotation ? 'Resume' : 'Pause'} Rotation`;
    } else if (key === 't' || key === 'T' || e.keyCode === 84) {
      e.preventDefault();
      runAlignmentDiagnostic();
    } else if (key === 'p' || key === 'P' || e.keyCode === 80) {
      e.preventDefault();
      CONFIG.debug.showTestPattern = !CONFIG.debug.showTestPattern;
      const patternBtn = document.getElementById('test-pattern-btn');
      if (patternBtn) patternBtn.textContent = `${CONFIG.debug.showTestPattern ? 'Hide' : 'Show'} Test Pattern`;
    }
  };
  
  // Add click handler for emergency debug toggle (triple-click)
  let clickCount = 0;
  let clickTimer = null;
  
  document.addEventListener('click', (e) => {
    // Don't count clicks on buttons or inputs
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    clickCount++;
    
    if (clickCount === 3) {
      console.log("Triple-click detected - toggling debug");
      toggleDebug();
      clickCount = 0;
    }
    
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 500);
  });

  // Store ASCII lookup
  window.ASCII = CONFIG.ascii.characters;
  
  // Make debug functions globally accessible
  window.toggleDebug = toggleDebug;
  
  // Make sure clicking on the globe returns focus to document
  outputEl.addEventListener('click', (e) => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    document.body.focus();
  });
  
  // Also handle window focus
  window.addEventListener('focus', () => {
    // When window gains focus, make sure no inputs are focused
    setTimeout(() => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.blur();
      }
    }, 100);
  });
  
  // Log keyboard shortcuts info
  console.log("🌍 Maycotte ASCII Earth Globe");
  console.log("✅ Globe loaded successfully!");
  console.log("");
  console.log("Keyboard shortcuts (click on the page first if they don't work):");
  console.log("  D - Toggle debug UI on/off");
  console.log("  Escape - Close debug UI (when open)");
  console.log("  Space - Pause/resume animation");
  console.log("  P - Toggle test pattern");
  console.log("  T - Run diagnostic (console)");
  console.log("");
  console.log("Alternative ways to toggle debug:");
  console.log("  - Triple-click anywhere on the page");
  console.log("  - Type in console: toggleDebug()");
  console.log("  - Ctrl+D or Cmd+D (works even in input fields)");

  render();
}

// ========== CAMERA ORBIT ==========
function updateCameraOrbit() {
  const distance = CONFIG.debugAdjustments.cameraDistance;
  const orbitX = CONFIG.debugAdjustments.cameraOrbitX;
  const orbitY = CONFIG.debugAdjustments.cameraOrbitY;
  
  // Calculate camera position based on spherical coordinates
  camera.position.x = distance * Math.sin(orbitY) * Math.cos(orbitX);
  camera.position.y = distance * Math.sin(orbitX);
  camera.position.z = distance * Math.cos(orbitY) * Math.cos(orbitX);
  
  // Always look at the center
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

// ========== UPDATE LIGHTING ==========
function updateLighting() {
  const ls = CONFIG.lightingSettings;
  
  // Update based on light mode
  if (ls.lightMode === 'sun') {
    // Sun mode - sun on, moon off
    sunLight.intensity = ls.sunIntensity;
    sunLight.position.set(ls.sunX, ls.sunY, ls.sunZ);
    moonLight.intensity = 0;
  } else {
    // Moon mode - moon on, sun off
    sunLight.intensity = 0;
    moonLight.intensity = ls.moonIntensity;
    moonLight.position.set(ls.moonX, ls.moonY, ls.moonZ);
  }
  
  // Always update ambient light
  ambientLight.intensity = ls.ambientIntensity;
}

// ========== DEBUG UI ==========
function createDebugUI() {
  // Create static container for buttons (never updates)
  const debugStatic = document.createElement('div');
  debugStatic.id = 'debug-static';
  debugStatic.className = 'debug-panel';
  debugStatic.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    color: #00ff00;
    font-family: monospace;
    font-size: 12px;
    background: rgba(0,0,0,0.9);
    padding: 10px;
    border: 1px solid #00ff00;
    z-index: 10000;
    user-select: none;
    display: ${CONFIG.debug.enabled ? 'block' : 'none'};
  `;
  
  // Create dynamic container for updating info
  const debugDynamic = document.createElement('div');
  debugDynamic.id = 'debug-dynamic';
  debugDynamic.style.cssText = `
    margin-bottom: 10px;
  `;
  
  // Create buttons container
  const debugButtons = document.createElement('div');
  debugButtons.id = 'debug-buttons';
  
  // Add dynamic section and buttons to static container
  debugStatic.appendChild(debugDynamic);
  debugStatic.appendChild(debugButtons);
  document.body.appendChild(debugStatic);
  
  // Create buttons ONCE
  debugButtons.innerHTML = `
    <button id="close-debug-btn" style="cursor: pointer; float: right; background: #f00; color: #fff; border: 1px solid #fff; padding: 2px 8px;">✕ Close</button>
    <div style="clear: both; margin-bottom: 5px;"></div>
    <button id="toggle-movement-btn" style="cursor: pointer;">${CONFIG.debug.pauseMovement ? 'Resume' : 'Pause'} Movement</button>
    <button id="toggle-rotation-btn" style="cursor: pointer;">${CONFIG.debug.pauseRotation ? 'Resume' : 'Pause'} Rotation</button>
    <br><br>
    <button id="show-canvas-btn" style="cursor: pointer;">Show Canvas</button>
    <button id="toggle-helpers-btn" style="cursor: pointer;">${CONFIG.debug.showAlignmentHelpers ? 'Hide' : 'Show'} Helpers</button>
    <br><br>
    <button id="test-pattern-btn" style="cursor: pointer;">${CONFIG.debug.showTestPattern ? 'Hide' : 'Show'} Test Pattern</button>
  `;
  
  // Attach event listeners ONCE
  document.getElementById('close-debug-btn').onclick = () => {
    // Blur any active element before closing
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    toggleDebug();
  };
  
  // Attach event listeners ONCE
  document.getElementById('toggle-movement-btn').onclick = () => {
    CONFIG.debug.pauseMovement = !CONFIG.debug.pauseMovement;
    document.getElementById('toggle-movement-btn').textContent = 
      `${CONFIG.debug.pauseMovement ? 'Resume' : 'Pause'} Movement`;
  };
  
  document.getElementById('toggle-rotation-btn').onclick = () => {
    CONFIG.debug.pauseRotation = !CONFIG.debug.pauseRotation;
    document.getElementById('toggle-rotation-btn').textContent = 
      `${CONFIG.debug.pauseRotation ? 'Resume' : 'Pause'} Rotation`;
  };
  
  document.getElementById('show-canvas-btn').onclick = () => {
    const canvas = document.getElementById('three-canvas');
    const btn = document.getElementById('show-canvas-btn');
    if (canvas.style.left === '-9999px') {
      const outputPos = outputEl.getBoundingClientRect();
      canvas.style.position = 'fixed';
      canvas.style.left = outputPos.left + 'px';
      canvas.style.top = outputPos.top + 'px';
      canvas.style.width = outputPos.width + 'px';
      canvas.style.height = outputPos.height + 'px';
      canvas.style.border = '2px solid red';
      canvas.style.opacity = '0.5';
      canvas.style.zIndex = '9999';
      btn.textContent = 'Hide Canvas';
    } else {
      canvas.style.left = '-9999px';
      canvas.style.top = '-9999px';
      canvas.style.opacity = '1';
      canvas.style.zIndex = 'auto';
      btn.textContent = 'Show Canvas';
    }
  };
  
  document.getElementById('toggle-helpers-btn').onclick = () => {
    CONFIG.debug.showAlignmentHelpers = !CONFIG.debug.showAlignmentHelpers;
    const helpers = ['center-x', 'center-y', 'inner-box', 'char-grid'];
    helpers.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = CONFIG.debug.showAlignmentHelpers ? 'block' : 'none';
      }
    });
    if (CONFIG.debug.showAlignmentHelpers && !document.getElementById('center-x')) {
      createAlignmentHelpers();
    }
    updateGlobeSize();
    updateFloatingPosition();
    document.getElementById('toggle-helpers-btn').textContent = 
      `${CONFIG.debug.showAlignmentHelpers ? 'Hide' : 'Show'} Helpers`;
  };
  
  document.getElementById('test-pattern-btn').onclick = () => {
    CONFIG.debug.showTestPattern = !CONFIG.debug.showTestPattern;
    document.getElementById('test-pattern-btn').textContent = 
      `${CONFIG.debug.showTestPattern ? 'Hide' : 'Show'} Test Pattern`;
  };
  
  if (CONFIG.debug.showGrid) {
    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'grid-overlay';
    gridOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid yellow;
      box-sizing: border-box;
      z-index: 1000;
      display: ${CONFIG.debug.enabled ? 'block' : 'none'};
    `;
    document.body.appendChild(gridOverlay);
  }
  
  if (CONFIG.debug.showAlignmentHelpers) {
    createAlignmentHelpers();
  }
}

// ========== ADJUSTMENT CONTROLS ==========
function createAdjustmentControls() {
  const controlsDiv = document.createElement('div');
  controlsDiv.id = 'adjustment-controls';
  controlsDiv.className = 'debug-panel';
  controlsDiv.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    color: #00ff00;
    font-family: monospace;
    font-size: 12px;
    background: rgba(0,0,0,0.9);
    padding: 10px;
    border: 1px solid #00ff00;
    z-index: 10001;
    max-height: 80vh;
    overflow-y: auto;
    display: ${CONFIG.debug.enabled ? 'block' : 'none'};
  `;
  
  controlsDiv.innerHTML = `
    <strong>ADJUSTMENT CONTROLS</strong> (Press D or ESC to close)<br>
    <small>Tip: Click on the globe to regain keyboard focus</small><br><br>
    
    <strong>Globe Transform:</strong><br>
    Scale: <input type="range" id="globe-scale" min="0.5" max="2" step="0.05" value="${CONFIG.debugAdjustments.globeScale}" tabindex="-1">
    <span id="globe-scale-val">${CONFIG.debugAdjustments.globeScale}</span><br>
    
    Camera Distance: <input type="range" id="camera-dist" min="5" max="20" step="0.5" value="${CONFIG.debugAdjustments.cameraDistance}" tabindex="-1">
    <span id="camera-dist-val">${CONFIG.debugAdjustments.cameraDistance}</span><br>
    
    X Offset: <input type="range" id="globe-x" min="-2" max="2" step="0.1" value="${CONFIG.debugAdjustments.globeOffsetX}" tabindex="-1">
    <span id="globe-x-val">${CONFIG.debugAdjustments.globeOffsetX}</span><br>
    
    Y Offset: <input type="range" id="globe-y" min="-2" max="2" step="0.1" value="${CONFIG.debugAdjustments.globeOffsetY}" tabindex="-1">
    <span id="globe-y-val">${CONFIG.debugAdjustments.globeOffsetY}</span><br>
    
    <br><strong>Camera Orbit:</strong><br>
    Orbit Vertical: <input type="range" id="orbit-x" min="-1.57" max="1.57" step="0.1" value="${CONFIG.debugAdjustments.cameraOrbitX}">
    <span id="orbit-x-val">${CONFIG.debugAdjustments.cameraOrbitX.toFixed(1)}</span><br>
    
    Orbit Horizontal: <input type="range" id="orbit-y" min="-3.14" max="3.14" step="0.1" value="${CONFIG.debugAdjustments.cameraOrbitY}">
    <span id="orbit-y-val">${CONFIG.debugAdjustments.cameraOrbitY.toFixed(1)}</span><br>
    
    <button id="flip-globe">Flip Globe</button>
    <button id="reset-camera">Reset Camera</button><br>
    
    <br><strong>Lighting (Daylight/Shadow):</strong><br>
    Light Mode: 
    <label><input type="radio" name="light-mode" value="sun" ${CONFIG.lightingSettings.lightMode === 'sun' ? 'checked' : ''}> Sun</label>
    <label><input type="radio" name="light-mode" value="moon" ${CONFIG.lightingSettings.lightMode === 'moon' ? 'checked' : ''}> Moon</label>
    <small>(Only one active at a time)</small><br>
    
    <div id="sun-controls" style="display: ${CONFIG.lightingSettings.lightMode === 'sun' ? 'block' : 'none'}">
      Sun Intensity: <input type="range" id="sun-intensity" min="0" max="2" step="0.1" value="${CONFIG.lightingSettings.sunIntensity}">
      <span id="sun-intensity-val">${CONFIG.lightingSettings.sunIntensity}</span><br>
      
      Sun Angle X: <input type="range" id="sun-x" min="-10" max="10" step="0.5" value="${CONFIG.lightingSettings.sunX}">
      <span id="sun-x-val">${CONFIG.lightingSettings.sunX}</span><br>
      
      Sun Angle Y: <input type="range" id="sun-y" min="-10" max="10" step="0.5" value="${CONFIG.lightingSettings.sunY}">
      <span id="sun-y-val">${CONFIG.lightingSettings.sunY}</span><br>
    </div>
    
    <div id="moon-controls" style="display: ${CONFIG.lightingSettings.lightMode === 'moon' ? 'block' : 'none'}">
      Moon Intensity: <input type="range" id="moon-intensity" min="0" max="1" step="0.05" value="${CONFIG.lightingSettings.moonIntensity}">
      <span id="moon-intensity-val">${CONFIG.lightingSettings.moonIntensity}</span><br>
      
      Moon Angle X: <input type="range" id="moon-x" min="-10" max="10" step="0.5" value="${CONFIG.lightingSettings.moonX}">
      <span id="moon-x-val">${CONFIG.lightingSettings.moonX}</span><br>
      
      Moon Angle Y: <input type="range" id="moon-y" min="-10" max="10" step="0.5" value="${CONFIG.lightingSettings.moonY}">
      <span id="moon-y-val">${CONFIG.lightingSettings.moonY}</span><br>
    </div>
    
    Ambient Light: <input type="range" id="ambient-intensity" min="0" max="1" step="0.05" value="${CONFIG.lightingSettings.ambientIntensity}">
    <span id="ambient-intensity-val">${CONFIG.lightingSettings.ambientIntensity}</span><br>
    
    <button id="noon-lighting">Noon</button>
    <button id="sunset-lighting">Sunset</button>
    <button id="night-lighting">Night</button><br>
    
    <br><strong>Test Pattern:</strong><br>
    Type: <select id="pattern-type">
      <option value="border-cross">Border + Cross</option>
      <option value="grid">Grid</option>
      <option value="circles">Circles</option>
      <option value="diagonals">Diagonals</option>
      <option value="numbered">Numbered</option>
    </select><br>
    
    Pattern Spacing: <input type="range" id="grid-spacing" min="4" max="24" step="2" value="${CONFIG.testPatternSettings.gridSpacing}">
    <span id="grid-spacing-val">${CONFIG.testPatternSettings.gridSpacing}</span><br>
    
    <br><button id="reset-adjustments">Reset All</button>
  `;
  
  document.body.appendChild(controlsDiv);
  
  // Globe transform listeners
  document.getElementById('globe-scale').oninput = (e) => {
    CONFIG.debugAdjustments.globeScale = parseFloat(e.target.value);
    document.getElementById('globe-scale-val').textContent = e.target.value;
    updateGlobeFromAdjustments();
  };
  
  document.getElementById('camera-dist').oninput = (e) => {
    CONFIG.debugAdjustments.cameraDistance = parseFloat(e.target.value);
    document.getElementById('camera-dist-val').textContent = e.target.value;
    updateCameraOrbit();
  };
  
  document.getElementById('globe-x').oninput = (e) => {
    CONFIG.debugAdjustments.globeOffsetX = parseFloat(e.target.value);
    document.getElementById('globe-x-val').textContent = e.target.value;
    updateGlobeFromAdjustments();
  };
  
  document.getElementById('globe-y').oninput = (e) => {
    CONFIG.debugAdjustments.globeOffsetY = parseFloat(e.target.value);
    document.getElementById('globe-y-val').textContent = e.target.value;
    updateGlobeFromAdjustments();
  };
  
  // Camera orbit listeners
  document.getElementById('orbit-x').oninput = (e) => {
    CONFIG.debugAdjustments.cameraOrbitX = parseFloat(e.target.value);
    document.getElementById('orbit-x-val').textContent = parseFloat(e.target.value).toFixed(1);
    updateCameraOrbit();
  };
  
  document.getElementById('orbit-y').oninput = (e) => {
    CONFIG.debugAdjustments.cameraOrbitY = parseFloat(e.target.value);
    document.getElementById('orbit-y-val').textContent = parseFloat(e.target.value).toFixed(1);
    updateCameraOrbit();
  };
  
  // Flip button
  document.getElementById('flip-globe').onclick = () => {
    CONFIG.debugAdjustments.globeFlipped = !CONFIG.debugAdjustments.globeFlipped;
    globe.rotation.z = CONFIG.debugAdjustments.globeFlipped ? Math.PI : 0;
  };
  
  // Reset camera button
  document.getElementById('reset-camera').onclick = () => {
    CONFIG.debugAdjustments.cameraOrbitX = 0.0;
    CONFIG.debugAdjustments.cameraOrbitY = 0.8;
    document.getElementById('orbit-x').value = CONFIG.debugAdjustments.cameraOrbitX;
    document.getElementById('orbit-y').value = CONFIG.debugAdjustments.cameraOrbitY;
    document.getElementById('orbit-x-val').textContent = CONFIG.debugAdjustments.cameraOrbitX.toFixed(1);
    document.getElementById('orbit-y-val').textContent = CONFIG.debugAdjustments.cameraOrbitY.toFixed(1);
    updateCameraOrbit();
  };
  
  // Light mode radio buttons
  document.querySelectorAll('input[name="light-mode"]').forEach(radio => {
    radio.onchange = (e) => {
      CONFIG.lightingSettings.lightMode = e.target.value;
      // Show/hide appropriate controls
      document.getElementById('sun-controls').style.display = e.target.value === 'sun' ? 'block' : 'none';
      document.getElementById('moon-controls').style.display = e.target.value === 'moon' ? 'block' : 'none';
      updateLighting();
    };
  });
  
  // Lighting listeners
  document.getElementById('sun-intensity').oninput = (e) => {
    CONFIG.lightingSettings.sunIntensity = parseFloat(e.target.value);
    document.getElementById('sun-intensity-val').textContent = e.target.value;
    updateLighting();
  };
  
  document.getElementById('sun-x').oninput = (e) => {
    CONFIG.lightingSettings.sunX = parseFloat(e.target.value);
    document.getElementById('sun-x-val').textContent = e.target.value;
    updateLighting();
  };
  
  document.getElementById('sun-y').oninput = (e) => {
    CONFIG.lightingSettings.sunY = parseFloat(e.target.value);
    document.getElementById('sun-y-val').textContent = e.target.value;
    updateLighting();
  };
  
  document.getElementById('moon-intensity').oninput = (e) => {
    CONFIG.lightingSettings.moonIntensity = parseFloat(e.target.value);
    document.getElementById('moon-intensity-val').textContent = e.target.value;
    updateLighting();
  };
  
  document.getElementById('moon-x').oninput = (e) => {
    CONFIG.lightingSettings.moonX = parseFloat(e.target.value);
    document.getElementById('moon-x-val').textContent = e.target.value;
    updateLighting();
  };
  
  document.getElementById('moon-y').oninput = (e) => {
    CONFIG.lightingSettings.moonY = parseFloat(e.target.value);
    document.getElementById('moon-y-val').textContent = e.target.value;
    updateLighting();
  };
  
  document.getElementById('ambient-intensity').oninput = (e) => {
    CONFIG.lightingSettings.ambientIntensity = parseFloat(e.target.value);
    document.getElementById('ambient-intensity-val').textContent = e.target.value;
    updateLighting();
  };
  
  // Lighting presets
  document.getElementById('noon-lighting').onclick = () => {
    CONFIG.lightingSettings.lightMode = 'sun';
    CONFIG.lightingSettings.sunIntensity = 1.5;
    CONFIG.lightingSettings.sunX = 0;
    CONFIG.lightingSettings.sunY = 10;
    CONFIG.lightingSettings.moonIntensity = 0.1;
    CONFIG.lightingSettings.ambientIntensity = 0.4;
    updateLightingControls();
    updateLighting();
  };
  
  document.getElementById('sunset-lighting').onclick = () => {
    CONFIG.lightingSettings.lightMode = 'sun';
    CONFIG.lightingSettings.sunIntensity = 1.0;
    CONFIG.lightingSettings.sunX = 8;
    CONFIG.lightingSettings.sunY = 2;
    CONFIG.lightingSettings.moonIntensity = 0.1;
    CONFIG.lightingSettings.ambientIntensity = 0.3;
    updateLightingControls();
    updateLighting();
  };
  
  document.getElementById('night-lighting').onclick = () => {
    CONFIG.lightingSettings.lightMode = 'moon';
    CONFIG.lightingSettings.sunIntensity = 1.2;
    CONFIG.lightingSettings.sunX = 5.5;
    CONFIG.lightingSettings.sunY = 3;
    CONFIG.lightingSettings.moonIntensity = 0.8;
    CONFIG.lightingSettings.ambientIntensity = 0.1;
    updateLightingControls();
    updateLighting();
  };
  
  // Pattern listeners
  document.getElementById('pattern-type').onchange = (e) => {
    CONFIG.testPatternSettings.patternType = e.target.value;
  };
  
  document.getElementById('grid-spacing').oninput = (e) => {
    CONFIG.testPatternSettings.gridSpacing = parseInt(e.target.value);
    document.getElementById('grid-spacing-val').textContent = e.target.value;
  };
  
  // Reset button
  document.getElementById('reset-adjustments').onclick = () => {
    // Reset to YOUR settings
    CONFIG.debugAdjustments = {
      globeScale: 0.5,
      cameraDistance: 5,
      cameraFOV: 35,
      globeOffsetX: 0,
      globeOffsetY: 0,
      renderOffsetX: 0,
      renderOffsetY: 0,
      cameraOrbitX: 0.0,
      cameraOrbitY: 0.8,
      globeFlipped: false,
      currentRotationY: CONFIG.debugAdjustments.currentRotationY
    };
    
    CONFIG.lightingSettings = {
      lightMode: 'sun',
      sunIntensity: 1.2,
      sunX: 5.5,
      sunY: 3,
      sunZ: 5,
      moonIntensity: 0.1,
      moonX: -5,
      moonY: -5,
      moonZ: 5,
      ambientIntensity: 0.15,
      sunFollowRotation: false
    };
    
    CONFIG.testPatternSettings = {
      patternType: 'border-cross',
      gridSpacing: 4,
      borderChar: '#',
      crossChar: '+',
      fillChar: '.',
      gridChar: '·',
      circleChar: 'o',
      diagonalChar: '/'
    };
    
    // Update all controls including radio buttons
    document.getElementById('globe-scale').value = CONFIG.debugAdjustments.globeScale;
    document.getElementById('camera-dist').value = CONFIG.debugAdjustments.cameraDistance;
    document.getElementById('globe-x').value = CONFIG.debugAdjustments.globeOffsetX;
    document.getElementById('globe-y').value = CONFIG.debugAdjustments.globeOffsetY;
    document.getElementById('orbit-x').value = CONFIG.debugAdjustments.cameraOrbitX;
    document.getElementById('orbit-y').value = CONFIG.debugAdjustments.cameraOrbitY;
    document.getElementById('pattern-type').value = CONFIG.testPatternSettings.patternType;
    document.getElementById('grid-spacing').value = CONFIG.testPatternSettings.gridSpacing;
    
    // Update all displays
    document.getElementById('globe-scale-val').textContent = CONFIG.debugAdjustments.globeScale;
    document.getElementById('camera-dist-val').textContent = CONFIG.debugAdjustments.cameraDistance;
    document.getElementById('globe-x-val').textContent = CONFIG.debugAdjustments.globeOffsetX;
    document.getElementById('globe-y-val').textContent = CONFIG.debugAdjustments.globeOffsetY;
    document.getElementById('orbit-x-val').textContent = CONFIG.debugAdjustments.cameraOrbitX.toFixed(1);
    document.getElementById('orbit-y-val').textContent = CONFIG.debugAdjustments.cameraOrbitY.toFixed(1);
    document.getElementById('grid-spacing-val').textContent = CONFIG.testPatternSettings.gridSpacing;
    
    // Update lighting controls
    updateLightingControls();
    
    // Apply changes
    updateGlobeFromAdjustments();
    updateCameraOrbit();
    updateLighting();
    globe.rotation.z = CONFIG.debugAdjustments.globeFlipped ? Math.PI : 0;
  };
}

// ========== UPDATE LIGHTING CONTROLS ==========
function updateLightingControls() {
  // Update radio buttons
  document.querySelectorAll('input[name="light-mode"]').forEach(radio => {
    radio.checked = radio.value === CONFIG.lightingSettings.lightMode;
  });
  
  // Show/hide appropriate controls
  document.getElementById('sun-controls').style.display = CONFIG.lightingSettings.lightMode === 'sun' ? 'block' : 'none';
  document.getElementById('moon-controls').style.display = CONFIG.lightingSettings.lightMode === 'moon' ? 'block' : 'none';
  
  // Update sliders
  document.getElementById('sun-intensity').value = CONFIG.lightingSettings.sunIntensity;
  document.getElementById('sun-x').value = CONFIG.lightingSettings.sunX;
  document.getElementById('sun-y').value = CONFIG.lightingSettings.sunY;
  document.getElementById('moon-intensity').value = CONFIG.lightingSettings.moonIntensity;
  document.getElementById('moon-x').value = CONFIG.lightingSettings.moonX;
  document.getElementById('moon-y').value = CONFIG.lightingSettings.moonY;
  document.getElementById('ambient-intensity').value = CONFIG.lightingSettings.ambientIntensity;
  
  // Update value displays
  document.getElementById('sun-intensity-val').textContent = CONFIG.lightingSettings.sunIntensity;
  document.getElementById('sun-x-val').textContent = CONFIG.lightingSettings.sunX;
  document.getElementById('sun-y-val').textContent = CONFIG.lightingSettings.sunY;
  document.getElementById('moon-intensity-val').textContent = CONFIG.lightingSettings.moonIntensity;
  document.getElementById('moon-x-val').textContent = CONFIG.lightingSettings.moonX;
  document.getElementById('moon-y-val').textContent = CONFIG.lightingSettings.moonY;
  document.getElementById('ambient-intensity-val').textContent = CONFIG.lightingSettings.ambientIntensity;
}

// ========== UPDATE GLOBE FROM ADJUSTMENTS ==========
function updateGlobeFromAdjustments() {
  if (window.globe) {
    // Update globe scale
    const baseRadius = 3.0;
    const scaledRadius = baseRadius * CONFIG.debugAdjustments.globeScale;
    
    // Create new geometry with scaled size
    const newGeometry = new THREE.SphereGeometry(scaledRadius, 32, 32);
    globe.geometry.dispose();
    globe.geometry = newGeometry;
    
    // Update position
    globe.position.set(
      CONFIG.debugAdjustments.globeOffsetX,
      CONFIG.debugAdjustments.globeOffsetY,
      0
    );
  }
}

// ========== ALIGNMENT HELPERS ==========
function createAlignmentHelpers() {
  // Center cross
  const centerX = document.createElement('div');
  centerX.id = 'center-x';
  centerX.style.cssText = `
    position: absolute;
    width: 100%;
    height: 1px;
    background: rgba(255, 0, 0, 0.5);
    top: 50%;
    left: 0;
    pointer-events: none;
    z-index: 999;
    display: ${CONFIG.debug.enabled && CONFIG.debug.showAlignmentHelpers ? 'block' : 'none'};
  `;
  document.body.appendChild(centerX);
  
  const centerY = document.createElement('div');
  centerY.id = 'center-y';
  centerY.style.cssText = `
    position: absolute;
    width: 1px;
    height: 100%;
    background: rgba(255, 0, 0, 0.5);
    left: 50%;
    top: 0;
    pointer-events: none;
    z-index: 999;
    display: ${CONFIG.debug.enabled && CONFIG.debug.showAlignmentHelpers ? 'block' : 'none'};
  `;
  document.body.appendChild(centerY);
  
  // Inner box
  const innerBox = document.createElement('div');
  innerBox.id = 'inner-box';
  innerBox.style.cssText = `
    position: absolute;
    pointer-events: none;
    border: 2px solid rgba(0, 255, 255, 0.7);
    box-sizing: border-box;
    z-index: 998;
    display: ${CONFIG.debug.enabled && CONFIG.debug.showAlignmentHelpers ? 'block' : 'none'};
  `;
  document.body.appendChild(innerBox);
  
  // Character grid
  const charGrid = document.createElement('canvas');
  charGrid.id = 'char-grid';
  charGrid.width = CONFIG.ascii.cols;
  charGrid.height = CONFIG.ascii.rows;
  charGrid.style.cssText = `
    position: absolute;
    pointer-events: none;
    opacity: 0.3;
    z-index: 997;
    image-rendering: pixelated;
    display: ${CONFIG.debug.enabled && CONFIG.debug.showAlignmentHelpers ? 'block' : 'none'};
  `;
  document.body.appendChild(charGrid);
  
  // Draw grid
  const ctx = charGrid.getContext('2d');
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
  ctx.lineWidth = 0.5;
  
  for (let x = 0; x <= CONFIG.ascii.cols; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CONFIG.ascii.rows);
    ctx.stroke();
  }
  
  for (let y = 0; y <= CONFIG.ascii.rows; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.ascii.cols, y);
    ctx.stroke();
  }
}

// ========== TOGGLE DEBUG ==========
function toggleDebug() {
  try {
    CONFIG.debug.enabled = !CONFIG.debug.enabled;
    console.log(`✅ Debug mode: ${CONFIG.debug.enabled ? 'ON' : 'OFF'}`);
    
    // Flash the globe briefly to show debug was toggled
    outputEl.style.transition = 'color 0.2s';
    outputEl.style.color = CONFIG.debug.enabled ? '#ff0' : '#f0f';
    setTimeout(() => {
      outputEl.style.color = '';  // Reset to CSS default
      outputEl.style.transition = '';
    }, 200);
    
    // Blur any active input when toggling
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    
    const elements = ['debug-static', 'adjustment-controls', 'grid-overlay', 'center-x', 'center-y', 'inner-box', 'char-grid'];
    
    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === 'debug-static' || id === 'adjustment-controls' || id === 'grid-overlay') {
          el.style.display = CONFIG.debug.enabled ? 'block' : 'none';
        } else if (CONFIG.debug.showAlignmentHelpers) {
          el.style.display = CONFIG.debug.enabled ? 'block' : 'none';
        }
      } else if (CONFIG.debug.enabled && (id === 'debug-static' || id === 'adjustment-controls')) {
        console.warn(`Debug element not found: ${id}`);
      }
    });
    
    // Update debug info when turning debug on
    if (CONFIG.debug.enabled) {
      updateDebugInfo();
    }
  } catch (error) {
    console.error("Error toggling debug:", error);
  }
}

// ========== SIZING ==========
function updateGlobeSize() {
  const viewportHeight = window.innerHeight;
  const globeSize = viewportHeight * (CONFIG.globe.size / 100);
  
  // Set output size
  outputEl.style.width = globeSize + 'px';
  outputEl.style.height = globeSize + 'px';
  
  // Calculate required character dimensions
  const charWidthNeeded = globeSize / CONFIG.ascii.cols;
  const charHeightNeeded = globeSize / CONFIG.ascii.rows;
  
  // Character width ratio for Inconsolata (your testing showed 0.38 works)
  const CHAR_WIDTH_RATIO = 0.38;
  
  // Calculate font size based on BOTH dimensions
  const fontSizeForWidth = charWidthNeeded / CHAR_WIDTH_RATIO;
  const fontSizeForHeight = charHeightNeeded;
  
  // Use the SMALLER to ensure we fit in both dimensions
  const fontSize = Math.min(fontSizeForWidth, fontSizeForHeight);
  
  // Set the calculated values
  outputEl.style.fontSize = fontSize + 'px';
  outputEl.style.lineHeight = charHeightNeeded + 'px';
  
  // Reset letter-spacing first
  outputEl.style.letterSpacing = '0px';
  
  // Calculate if we need extra letter-spacing to fill width
  const actualCharWidth = fontSize * CHAR_WIDTH_RATIO;
  const totalWidth = actualCharWidth * CONFIG.ascii.cols;
  
  if (totalWidth < globeSize) {
    const extraSpaceTotal = globeSize - totalWidth;
    const letterSpacingPerChar = extraSpaceTotal / CONFIG.ascii.cols;
    outputEl.style.letterSpacing = letterSpacingPerChar + 'px';
  }
  
  // Update debug overlays
  const gridOverlay = document.getElementById('grid-overlay');
  if (gridOverlay) {
    gridOverlay.style.width = globeSize + 'px';
    gridOverlay.style.height = globeSize + 'px';
  }
  
  updateAlignmentHelpers(globeSize);
  
  // Store debug info
  debugInfo.displaySize = globeSize;
  debugInfo.fontSize = fontSize;
  debugInfo.lineHeight = charHeightNeeded;
  debugInfo.letterSpacing = outputEl.style.letterSpacing;
  debugInfo.charWidth = actualCharWidth;
  debugInfo.totalWidth = totalWidth;
}

function updateAlignmentHelpers(globeSize) {
  if (!CONFIG.debug.showAlignmentHelpers) return;
  
  const innerBox = document.getElementById('inner-box');
  if (innerBox) {
    innerBox.style.width = globeSize + 'px';
    innerBox.style.height = globeSize + 'px';
  }
  
  const charGrid = document.getElementById('char-grid');
  if (charGrid) {
    charGrid.style.width = globeSize + 'px';
    charGrid.style.height = globeSize + 'px';
  }
}

// ========== FLOATING ANIMATION ==========
function updateFloatingPosition() {
  let xPercent = 50 + CONFIG.floating.startX * 100;
  let yPercent = 50 + CONFIG.floating.startY * 100;
  
  if (CONFIG.floating.enabled && !CONFIG.debug.pauseMovement) {
    const x1 = Math.sin(animationTime * CONFIG.floating.speed) * CONFIG.floating.radiusX;
    const y1 = Math.cos(animationTime * CONFIG.floating.speed * 0.7) * CONFIG.floating.radiusY;
    
    const x2 = Math.sin(animationTime * CONFIG.floating.speed2) * CONFIG.floating.radiusX * 0.3;
    const y2 = Math.cos(animationTime * CONFIG.floating.speed2 * 1.3) * CONFIG.floating.radiusY * 0.3;
    
    xPercent += (x1 + x2) * 100;
    yPercent += (y1 + y2) * 100;
  }
  
  outputEl.style.left = xPercent + '%';
  outputEl.style.top = yPercent + '%';
  outputEl.style.transform = 'translate(-50%, -50%)';
  
  // Sync overlays
  const elements = ['grid-overlay', 'inner-box', 'char-grid'];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.left = xPercent + '%';
      el.style.top = yPercent + '%';
      el.style.transform = 'translate(-50%, -50%)';
    }
  });
}

// ========== TEST PATTERN GENERATION ==========
function generateTestPattern() {
  const { patternType, gridSpacing } = CONFIG.testPatternSettings;
  const { borderChar, crossChar, fillChar, gridChar, circleChar, diagonalChar } = CONFIG.testPatternSettings;
  let text = '';
  
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      let char = fillChar;
      
      switch (patternType) {
        case 'border-cross':
          if (x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1) {
            char = borderChar;
          } else if (x === Math.floor(WIDTH / 2) || y === Math.floor(HEIGHT / 2)) {
            char = crossChar;
          }
          break;
          
        case 'grid':
          if (x % gridSpacing === 0 || y % gridSpacing === 0) {
            char = gridChar;
          }
          // Add stronger lines at center
          if (x === Math.floor(WIDTH / 2) || y === Math.floor(HEIGHT / 2)) {
            char = crossChar;
          }
          break;
          
        case 'circles':
          const cx = WIDTH / 2;
          const cy = HEIGHT / 2;
          const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
          if (Math.abs(dist % gridSpacing) < 1) {
            char = circleChar;
          }
          break;
          
        case 'diagonals':
          if ((x + y) % gridSpacing === 0 || (x - y) % gridSpacing === 0) {
            char = diagonalChar;
          }
          break;
          
        case 'numbered':
          // Show coordinate numbers at grid intersections
          if (x % gridSpacing === 0 && y % gridSpacing === 0) {
            const num = ((x / gridSpacing) % 10).toString();
            char = num;
          } else if (x % gridSpacing === 0 || y % gridSpacing === 0) {
            char = gridChar;
          }
          break;
      }
      
      text += char;
    }
    if (y < HEIGHT - 1) text += '\n';
  }
  
  return text;
}

// ========== RENDER LOOP ==========
function render() {
  requestAnimationFrame(render);
  
  if (!CONFIG.debug.pauseMovement) {
    animationTime += 16;
  }
  
  // Earth only rotates on Y axis (as God intended)
  if (!CONFIG.debug.pauseRotation) {
    CONFIG.debugAdjustments.currentRotationY -= CONFIG.globe.rotationSpeed;
    globe.rotation.y = CONFIG.debugAdjustments.currentRotationY;
  }
  
  // Wobble (very slight, optional)
  if (!CONFIG.debug.pauseMovement) {
    const wobbleX = Math.sin(animationTime * CONFIG.globe.wobbleSpeed) * CONFIG.globe.wobbleAmount;
    globe.rotation.x = wobbleX; // Just a tiny tilt for effect
  }
  
  // Update position
  updateFloatingPosition();
  
  // Render scene
  renderer.render(scene, camera);
  
  // Read pixels
  gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  
  // Generate ASCII
  let text = '';
  
  if (CONFIG.debug.showTestPattern) {
    text = generateTestPattern();
  } else {
    // Normal ASCII rendering - fixed to read pixels correctly
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        // Read from bottom-left to match WebGL coordinate system
        const pixelY = HEIGHT - 1 - y;
        const i = (pixelY * WIDTH + x) * 4;
        
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        const charIndex = Math.floor((brightness / 255) * (ASCII.length - 1));
        text += ASCII[charIndex] || ' ';
      }
      if (y < HEIGHT - 1) text += '\n';
    }
  }
  
  outputEl.textContent = text;
  
  // Update debug info - check if debug is enabled AND the element exists
  if (CONFIG.debug.enabled && CONFIG.debug.showMeasurements && document.getElementById('debug-dynamic')) {
    updateDebugInfo();
  }
}

// ========== DEBUG INFO UPDATE ==========
function updateDebugInfo() {
  const debugDynamic = document.getElementById('debug-dynamic');
  if (!debugDynamic) {
    console.warn("Debug dynamic element not found");
    return;
  }
  
  // Calculate actual text dimensions
  const outputRect = outputEl.getBoundingClientRect();
  const containerSize = parseFloat(outputEl.style.width);
  const coverage = ((debugInfo.totalWidth || containerSize) / containerSize * 100).toFixed(1);
  
  // Only update the dynamic content
  debugDynamic.innerHTML = `
    <strong>DEBUG INFO</strong> (Press D or ESC to close)<br>
    Time: ${(animationTime / 1000).toFixed(1)}s<br>
    <br>
    <strong>Container:</strong><br>
    Display: ${debugInfo.displaySize?.toFixed(0)}px × ${debugInfo.displaySize?.toFixed(0)}px<br>
    Grid: ${CONFIG.ascii.cols}×${CONFIG.ascii.rows}<br>
    <br>
    <strong>Font Metrics:</strong><br>
    Font size: ${debugInfo.fontSize?.toFixed(1)}px<br>
    Line height: ${debugInfo.lineHeight?.toFixed(1)}px<br>
    Letter spacing: ${debugInfo.letterSpacing || '0px'}<br>
    Char width: ${debugInfo.charWidth?.toFixed(2)}px<br>
    <br>
    <strong>Coverage:</strong><br>
    Total width: ${debugInfo.totalWidth?.toFixed(0)}px<br>
    Coverage: ${coverage}%<br>
    <br>
    <strong>Camera Orbit:</strong><br>
    V: ${CONFIG.debugAdjustments.cameraOrbitX.toFixed(1)}, H: ${CONFIG.debugAdjustments.cameraOrbitY.toFixed(1)}<br>
    Globe Y rotation: ${CONFIG.debugAdjustments.currentRotationY.toFixed(2)}<br>
    <br>
    <strong>Lighting:</strong><br>
    Mode: ${CONFIG.lightingSettings.lightMode === 'sun' ? 'Sun' : 'Moon'}<br>
    Sun: ${CONFIG.lightingSettings.sunIntensity}, Moon: ${CONFIG.lightingSettings.moonIntensity}<br>
    <br>
    <strong>Position:</strong><br>
    Start: ${(CONFIG.floating.startX * 100).toFixed(0)}%, ${(CONFIG.floating.startY * 100).toFixed(0)}%<br>
    Movement: ${CONFIG.debug.pauseMovement ? 'Paused' : 'Active'}<br>
    Rotation: ${CONFIG.debug.pauseRotation ? 'Paused' : 'Active'}<br>
    Pattern: ${CONFIG.debug.showTestPattern ? CONFIG.testPatternSettings.patternType : 'Off'}<br>
    <hr style="border-color: #00ff00; margin: 10px 0;">
  `;
}

// ========== ALIGNMENT DIAGNOSTIC ==========
function runAlignmentDiagnostic() {
  console.log("=== ALIGNMENT DIAGNOSTIC ===");
  
  // Get computed styles
  const computed = window.getComputedStyle(outputEl);
  const containerWidth = parseFloat(outputEl.style.width);
  const containerHeight = parseFloat(outputEl.style.height);
  
  console.log("Container dimensions:", {
    width: containerWidth,
    height: containerHeight,
    aspectRatio: (containerWidth / containerHeight).toFixed(2)
  });
  
  console.log("Font metrics:", {
    fontSize: computed.fontSize,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
    fontFamily: computed.fontFamily
  });
  
  console.log("Globe adjustments:", CONFIG.debugAdjustments);
  console.log("Lighting settings:", CONFIG.lightingSettings);
  console.log("Pattern settings:", CONFIG.testPatternSettings);
  console.log("=== END DIAGNOSTIC ===");
}

// ========== START ==========
document.addEventListener("DOMContentLoaded", () => {
  try {
    init();
  } catch (error) {
    console.error("Error initializing globe:", error);
  }
});