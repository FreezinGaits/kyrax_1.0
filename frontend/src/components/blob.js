import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Helper: safely parse any color string to THREE.Color (strips alpha from 8-digit hex)
function safeColor(colorStr) {
  if (typeof colorStr === 'string' && colorStr.length === 9 && colorStr.startsWith('#')) {
    // #rrggbbaa → #rrggbb (THREE.Color doesn't support alpha hex)
    return new THREE.Color(colorStr.slice(0, 7));
  }
  return new THREE.Color(colorStr);
}

export default function PlasmaBlob({ themeColor = '#8b5cf6', sizeMultiplier = 1.0, sensitivityMultiplier = 1.0, brightnessMultiplier = 1.5, opacityMultiplier = 1.0 }) {
  const mountRef = useRef(null);
  const audioStateRef = useRef({ stream: null, audioCtx: null, analyser: null, data: null });
  const matsRef = useRef({});
  const configRef = useRef({ sizeMultiplier, sensitivityMultiplier, brightnessMultiplier, opacityMultiplier });

  // ---- PROP WATCHER: dynamically push color/brightness/sensitivity/opacity changes ----
  useEffect(() => {
    configRef.current = { sizeMultiplier, sensitivityMultiplier, brightnessMultiplier, opacityMultiplier };

    const baseColor = safeColor(themeColor);
    const brightColor = safeColor(themeColor).lerp(new THREE.Color('#ffffff'), 0.45);
    const deepColor = safeColor(themeColor).multiplyScalar(0.12);
    const backShellColor = safeColor(themeColor).multiplyScalar(0.25);

    console.log('[Kyrax] Theme updated →', themeColor, '| RGB:', baseColor.r.toFixed(2), baseColor.g.toFixed(2), baseColor.b.toFixed(2));

    // Update plasma blob shader uniforms
    const pm = matsRef.current.plasmaMat;
    if (pm && pm.uniforms) {
      pm.uniforms.uColorDeep.value.copy(deepColor);
      pm.uniforms.uColorMid.value.copy(baseColor);
      pm.uniforms.uColorBright.value.copy(brightColor);
      pm.uniforms.uBrightness.value = brightnessMultiplier;
      pm.uniforms.uOpacity.value = opacityMultiplier;
    }

    // Update floating particles
    const pmt = matsRef.current.pMat;
    if (pmt && pmt.uniforms) {
      pmt.uniforms.uColor.value.copy(baseColor);
    }

    // Update point light
    const pl = matsRef.current.pointLight;
    if (pl) {
      pl.color.copy(baseColor);
      pl.intensity = brightnessMultiplier * 0.8;
    }

    // Update shell bubble
    const sfm = matsRef.current.shellFrontMat;
    if (sfm && sfm.uniforms) {
      sfm.uniforms.uColor.value.copy(baseColor);
      sfm.uniforms.uOpacity.value = 0.35 * opacityMultiplier;
    }
    const sbm = matsRef.current.shellBackMat;
    if (sbm && sbm.uniforms) {
      sbm.uniforms.uColor.value.copy(backShellColor);
      sbm.uniforms.uOpacity.value = 0.3 * opacityMultiplier;
    }
  }, [themeColor, sizeMultiplier, sensitivityMultiplier, brightnessMultiplier, opacityMultiplier]);

  // ---- INIT: create ThreeJS scene once ----
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer, scene, camera, controls, clock, rafId;
    let mainGroup, plasmaMesh, particles, pointLight;
    let plasmaMat, pMat;

    const initColor = safeColor(themeColor);
    const initBright = safeColor(themeColor).lerp(new THREE.Color('#ffffff'), 0.45);
    const initDeep = safeColor(themeColor).multiplyScalar(0.12);

    // ======= SHADERS =======
    const noiseFunctions = `
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute( permute( permute(
                      i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      float fbm(vec3 p) {
          float total = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          for (int i = 0; i < 3; i++) { 
              total += snoise(p * frequency) * amplitude;
              amplitude *= 0.5;
              frequency *= 2.0;
          }
          return total;
      }
    `;

    // ======= INITIALIZE THREE =======
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.z = 2.4;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 20;

    clock = new THREE.Clock();

    mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // LIGHT
    pointLight = new THREE.PointLight(initColor, 1.2, 10);
    pointLight.position.set(2, 2, 2);
    mainGroup.add(pointLight);
    matsRef.current.pointLight = pointLight;

    // SHELL (Bubble)
    const shellGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const shellVertex = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const shellFragment = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uAudio;
      void main() {
        float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewPosition)), 2.5);
        gl_FragColor = vec4(uColor, fresnel * uOpacity * (1.0 + uAudio * 0.5));
      }
    `;

    const shellBackMat = new THREE.ShaderMaterial({
      vertexShader: shellVertex, fragmentShader: shellFragment,
      uniforms: { uColor: { value: initColor.clone().multiplyScalar(0.25) }, uOpacity: { value: 0.3 }, uAudio: { value: 0 } },
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false
    });

    const shellFrontMat = new THREE.ShaderMaterial({
      vertexShader: shellVertex, fragmentShader: shellFragment,
      uniforms: { uColor: { value: initColor.clone() }, uOpacity: { value: 0.35 }, uAudio: { value: 0 } },
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.FrontSide, depthWrite: false
    });

    mainGroup.add(new THREE.Mesh(shellGeo, shellBackMat));
    mainGroup.add(new THREE.Mesh(shellGeo, shellFrontMat));
    matsRef.current.shellFrontMat = shellFrontMat;
    matsRef.current.shellBackMat = shellBackMat;

    // PLASMA
    const plasmaGeo = new THREE.SphereGeometry(0.998, 128, 128);

    plasmaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uScale: { value: 0.1404 },
        uBrightness: { value: brightnessMultiplier },
        uThreshold: { value: 0.05 },
        uColorDeep: { value: initDeep.clone() },
        uColorMid: { value: initColor.clone() },
        uColorBright: { value: initBright.clone() },
        uSensitivity: { value: 1.0 },
        uOpacity: { value: opacityMultiplier }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAudio;
        uniform float uSensitivity;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        ${noiseFunctions}
        void main() {
          vNormal = normalize(normalMatrix * normal);
          
          float activeMultiplier = step(0.01, uSensitivity); 
          float noiseT = uTime * 0.6 * activeMultiplier;
          vec3 noisePos = position * 2.5;
          float rawDisplacement = fbm(noisePos + vec3(0.0, noiseT, 0.0)) * 2.0 - 1.0;
          float displacement = rawDisplacement * activeMultiplier;
          
          float jitter = snoise(position * 8.0 + uTime * 2.0) * 0.4 * activeMultiplier;
          
          float baseline = 0.1 * clamp(uSensitivity, 0.0, 1.0);
          
          vec3 newPos = position + normal * (displacement + jitter) * (uAudio * 1.5 + baseline); 
          
          vPosition = newPos;
          vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScale;
        uniform float uBrightness;
        uniform float uThreshold;
        uniform float uOpacity;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorBright;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        ${noiseFunctions}
        void main() {
          vec3 p = vPosition * uScale;
          vec3 q = vec3(
            fbm(p + vec3(0.0, uTime * 0.05, 0.0)),
            fbm(p + vec3(5.2, 1.3, 2.8) + uTime * 0.05),
            fbm(p + vec3(2.2, 8.4, 0.5) - uTime * 0.02)
          );
          float density = fbm(p + 2.0 * q);
          float t = (density + 0.4) * 0.8;
          float alpha = smoothstep(uThreshold, 0.7, t);
          vec3 color = mix(uColorDeep, uColorMid, smoothstep(uThreshold, 0.5, t));
          color = mix(color, uColorBright, smoothstep(0.5, 0.8, t));
          color = mix(color, vec3(1.0), smoothstep(0.85, 1.0, t));
          float facing = dot(normalize(vNormal), normalize(vViewPosition));
          float depthFactor = (facing + 1.0) * 0.5;
          float finalAlpha = alpha * (0.02 + 0.98 * depthFactor) * uOpacity;
          gl_FragColor = vec4(color * uBrightness, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    matsRef.current.plasmaMat = plasmaMat;
    mainGroup.add(plasmaMesh);

    // PARTICLES
    const pCount = 600;
    const pPos = new Float32Array(pCount * 3);
    const pSizes = new Float32Array(pCount);
    for (let i = 0; i < pCount; i++) {
      const r = 0.95 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
      pSizes[i] = Math.random();
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

    pMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: initColor.clone() } },
      vertexShader: `
        uniform float uTime;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.2 + pos.x) * 0.02;
          pos.x += cos(uTime * 0.15 + pos.z) * 0.02;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float baseSize = 8.0 * aSize + 4.0;
          gl_PointSize = baseSize * (1.0 / -mvPosition.z);
          vAlpha = 0.8 + 0.2 * sin(uTime + aSize * 10.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          float glow = 1.0 - (dist * 2.0);
          glow = pow(glow, 1.8);
          gl_FragColor = vec4(uColor, glow * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    particles = new THREE.Points(pGeo, pMat);
    matsRef.current.pMat = pMat;
    mainGroup.add(particles);

    // RESIZE
    function onWindowResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onWindowResize);

    // AUDIO
    let alive = true; // Guard against React 18 StrictMode double-mount race

    async function initAudio() {
      try {
        console.log('[Kyrax Blob] Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // If component was unmounted while we were waiting for mic permission, bail out
        if (!alive) {
          console.log('[Kyrax Blob] Component unmounted during mic request, cleaning up stale stream');
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        const data = new Uint8Array(analyser.fftSize);
        source.connect(analyser);
        audioStateRef.current = { stream, audioCtx, analyser, data };
        console.log('[Kyrax Blob] ✅ Microphone connected successfully! Audio reactivity is LIVE.');
      } catch (e) {
        console.warn('[Kyrax Blob] ❌ Microphone access denied or not available:', e.message);
      }
    }

    function getAudioLevel() {
      const st = audioStateRef.current;
      if (!st || !st.analyser) return 0;
      try {
        st.analyser.getByteTimeDomainData(st.data);
        let sum = 0;
        for (let i = 0; i < st.data.length; i++) {
          const val = (st.data[i] - 128) / 128;
          sum += val * val;
        }
        return Math.sqrt(sum / st.data.length);
      } catch (e) {
        // AudioContext might have been closed by a previous strict mode cleanup
        return 0;
      }
    }

    // ANIMATION
    function animate() {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      plasmaMat.uniforms.uTime.value = t * 0.78;
      pMat.uniforms.uTime.value = t;

      plasmaMesh.rotation.y = t * 0.08;
      mainGroup.rotation.x += 0.002;
      mainGroup.rotation.y += 0.005;

      const rawAudioLevel = getAudioLevel();
      const currentAudioUniform = plasmaMat.uniforms.uAudio.value;
      const targetAudio = rawAudioLevel * 2.5 * configRef.current.sensitivityMultiplier;
      const smoothAudio = THREE.MathUtils.lerp(currentAudioUniform, targetAudio, 0.15);

      plasmaMat.uniforms.uAudio.value = smoothAudio;
      plasmaMat.uniforms.uSensitivity.value = configRef.current.sensitivityMultiplier;
      plasmaMat.uniforms.uBrightness.value = configRef.current.brightnessMultiplier;
      plasmaMat.uniforms.uOpacity.value = configRef.current.opacityMultiplier;

      if (matsRef.current.shellFrontMat) matsRef.current.shellFrontMat.uniforms.uAudio.value = smoothAudio;
      if (matsRef.current.shellBackMat) matsRef.current.shellBackMat.uniforms.uAudio.value = smoothAudio;

      const scaleBreathing = configRef.current.sizeMultiplier + (Math.sin(t) * 0.02) + (smoothAudio * 0.1);
      mainGroup.scale.setScalar(scaleBreathing);

      controls.update();
      renderer.render(scene, camera);
    }

    // Start animation IMMEDIATELY — don't wait for audio.
    clock.start();
    animate();

    // Audio is a bonus enhancement — fire-and-forget in the background.
    initAudio();

    return () => {
      alive = false; // Signal any pending async work to stop
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(rafId);
      try {
        const audioState = audioStateRef.current;
        if (audioState.stream) {
          audioState.stream.getTracks().forEach(t => t.stop());
        }
        if (audioState.audioCtx && audioState.audioCtx.state !== 'closed') {
          audioState.audioCtx.close();
        }
      } catch (e) {}
      // Reset audio ref so the next mount starts clean
      audioStateRef.current = { stream: null, audioCtx: null, analyser: null, data: null };
      try {
        if (container.firstChild) container.removeChild(container.firstChild);
        scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
        renderer.dispose();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Init THREE once. Prop watcher above handles dynamic updates.

  return (
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden', background: '#000' }}
      aria-label="Plasma blob canvas"
    />
  );
}
