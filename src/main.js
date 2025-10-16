import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import Stats from 'stats.js';
import * as dat from 'dat.gui';

// Globale Variablen
let scene, camera, renderer, controls;
let droneCamera, firstPersonCamera;
let currentCamera;
let stats;
let gui;

let directionalLight, ambientLight, pointLights = [];
let isDayMode = true;

let annotationData = {};
let raycaster, mouse;

// Loader
let gltfLoader, objLoader, mtlLoader;

// First-Person Controls
let keys = {};
let moveSpeed = 8.0;
let lookSpeed = 0.002;
let pitch = 0;
let yaw = 0;
let isMouseLookActive = false;

// DOM Elemente
const canvas = document.getElementById('threejs-canvas');
const cameraModeSelect = document.getElementById('camera-mode');
const lightModeSelect = document.getElementById('light-mode');
const resetCameraBtn = document.getElementById('reset-camera');
const fpsDisplay = document.getElementById('fps');
const renderTimeDisplay = document.getElementById('render-time');
const memoryDisplay = document.getElementById('memory');
const annotationPanel = document.getElementById('annotation-panel');
const annotationTitle = document.getElementById('annotation-title');
const annotationContent = document.getElementById('annotation-content');
const closeAnnotationBtn = document.getElementById('close-annotation');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialisierung
async function init() {
    try {
        // Lade Annotations-Daten
        await loadAnnotations();

        // Erstelle Szene
        createScene();

        // Erstelle Kameras
        createCameras();

        // Erstelle Renderer
        createRenderer();

        // Erstelle Licht
        createLighting();

        // Erstelle Stadt
        await createCity();

        // Erstelle UI
        createUI();

        // Erstelle Performance Monitor
        createPerformanceMonitor();

        // Event Listener
        setupEventListeners();

        // Starte Render-Loop
        animate();

        // Verstecke Lade-Overlay
        loadingOverlay.style.display = 'none';

    } catch (error) {
        console.error('Fehler beim Initialisieren:', error);
        loadingOverlay.innerHTML = '<p>Fehler beim Laden der Anwendung</p>';
    }
}

// Szene erstellen
function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Himmelblau für Tag
    scene.fog = new THREE.Fog(0x87CEEB, 50, 1000);
}

// Kameras erstellen
function createCameras() {
    // Drohnen-Kamera (OrbitControls)
    droneCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    droneCamera.position.set(0, 100, 100);

    // First-Person Kamera
    firstPersonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    firstPersonCamera.position.set(0, 5, 0);

    // Setze aktuelle Kamera
    currentCamera = droneCamera;

    // OrbitControls für Drohnen-Kamera
    controls = new OrbitControls(droneCamera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 10;
    controls.maxDistance = 500;
}

// Renderer erstellen
function createRenderer() {
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
}

// Lichtsystem erstellen
function createLighting() {
    // Ambient Light
    ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // Directional Light (Sonne)
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Nachtlichter (Point Lights)
    const lightPositions = [
        { x: -20, y: 10, z: -20 },
        { x: 20, y: 10, z: -20 },
        { x: -20, y: 10, z: 20 },
        { x: 20, y: 10, z: 20 },
        { x: 0, y: 15, z: 0 }
    ];

    lightPositions.forEach(pos => {
        const pointLight = new THREE.PointLight(0xffaa44, 0, 50);
        pointLight.position.set(pos.x, pos.y, pos.z);
        pointLight.castShadow = true;
        pointLights.push(pointLight);
        scene.add(pointLight);
    });
}

// Stadt erstellen (einfache Geometrien als Platzhalter)
async function createCity() {
    // Boden
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Einfache Gebäude
    createSimpleBuildings();

    // Straße
    createRoad();

    // Bäume
    createTrees();
}

// Einfache Gebäude erstellen
function createSimpleBuildings() {
    const buildingPositions = [
        { x: -30, z: -30, w: 8, h: 15, d: 8, color: 0x8B4513 },
        { x: 30, z: -30, w: 10, h: 20, d: 10, color: 0x696969 },
        { x: -30, z: 30, w: 12, h: 18, d: 12, color: 0x8B4513 },
        { x: 30, z: 30, w: 9, h: 25, d: 9, color: 0x696969 },
        { x: 0, z: 0, w: 15, h: 30, d: 15, color: 0xDAA520 } // Kirche
    ];

    buildingPositions.forEach((building, index) => {
        const geometry = new THREE.BoxGeometry(building.w, building.h, building.d);
        const material = new THREE.MeshLambertMaterial({ color: building.color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(building.x, building.h / 2, building.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Füge Annotation-Daten hinzu
        mesh.userData.annotationId = `building_${index}`;
        mesh.userData.clickable = true;

        scene.add(mesh);
    });
}

// Straße erstellen
function createRoad() {
    const roadGeometry = new THREE.PlaneGeometry(10, 200);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01; // Leicht über dem Boden
    road.receiveShadow = true;
    scene.add(road);

    // Kreuzung
    const crossRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 10),
        roadMaterial
    );
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.01;
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);
}

// Bäume erstellen
function createTrees() {
    const treePositions = [
        { x: -40, z: -40 }, { x: 40, z: -40 },
        { x: -40, z: 40 }, { x: 40, z: 40 },
        { x: -50, z: 0 }, { x: 50, z: 0 },
        { x: 0, z: -50 }, { x: 0, z: 50 }
    ];

    treePositions.forEach(pos => {
        // Stamm
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(pos.x, 4, pos.z);
        trunk.castShadow = true;
        scene.add(trunk);

        // Krone
        const crownGeometry = new THREE.SphereGeometry(4);
        const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.set(pos.x, 10, pos.z);
        crown.castShadow = true;
        scene.add(crown);
    });
}

// UI erstellen (vereinfacht - nur das linke Kontrollpanel wird verwendet)
function createUI() {
    // Keine zusätzliche GUI - nur das linke Kontrollpanel
}

// Performance Monitor erstellen
function createPerformanceMonitor() {
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    // Stats wird nicht mehr im DOM angezeigt, nur für Daten verwendet
    // Wichtig: stats.begin() und stats.end() müssen in der animate() Funktion aufgerufen werden
}

// Event Listener einrichten
function setupEventListeners() {
    // Kamera-Modus wechseln
    cameraModeSelect.addEventListener('change', (e) => {
        switchCameraMode(e.target.value);
    });

    // Licht-Modus wechseln
    lightModeSelect.addEventListener('change', (e) => {
        toggleDayNight(e.target.value === 'night');
    });

    // Kamera zurücksetzen
    resetCameraBtn.addEventListener('click', resetCamera);

    // Annotation schließen
    closeAnnotationBtn.addEventListener('click', () => {
        annotationPanel.classList.add('hidden');
    });

    // Maus-Interaktion
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    // Tastatur-Events für First-Person
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Fenstergröße ändern
    window.addEventListener('resize', onWindowResize);
}

// Annotations-Daten laden
async function loadAnnotations() {
    try {
        const response = await fetch('../annotations.json');
        if (response.ok) {
            annotationData = await response.json();
        } else {
            // Fallback: Leere Annotations
            annotationData = {
                building_0: { title: 'Altes Rathaus', content: 'Das historische Rathaus aus dem 15. Jahrhundert.' },
                building_1: { title: 'Handwerkerhaus', content: 'Wohnhaus eines wohlhabenden Handwerkers.' },
                building_2: { title: 'Bürgerhaus', content: 'Traditionelles Bürgerhaus der damaligen Zeit.' },
                building_3: { title: 'Werkstatt', content: 'Schmiede und Werkstatt.' },
                building_4: { title: 'Kirche', content: 'Die zentrale Kirche der Gemeinde.' }
            };
        }
    } catch (error) {
        console.warn('Annotations konnten nicht geladen werden:', error);
        // Verwende Fallback-Daten
    }
}

// Kamera-Modus wechseln
function switchCameraMode(mode) {
    if (mode === 'drone') {
        currentCamera = droneCamera;
        controls.enabled = true;
        // Mauszeiger freigeben
        document.body.style.cursor = 'default';
        canvas.style.cursor = 'default';
        isMouseLookActive = false;
    } else if (mode === 'first-person') {
        currentCamera = firstPersonCamera;
        controls.enabled = false;
        // Mauszeiger sichtbar lassen
        document.body.style.cursor = 'default';
        canvas.style.cursor = 'default';
        isMouseLookActive = false;
    }
}

// Tag/Nacht Modus umschalten
function toggleDayNight(isNight) {
    isDayMode = !isNight;

    if (isDayMode) {
        // Tag-Modus
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog.color = new THREE.Color(0x87CEEB);
        ambientLight.intensity = 0.3;
        directionalLight.intensity = 1.0;

        pointLights.forEach(light => {
            light.intensity = 0;
        });
    } else {
        // Nacht-Modus
        scene.background = new THREE.Color(0x191970);
        scene.fog.color = new THREE.Color(0x191970);
        ambientLight.intensity = 0.1;
        directionalLight.intensity = 0.1;

        pointLights.forEach(light => {
            light.intensity = 2.0;
        });
    }

    lightModeSelect.value = isDayMode ? 'day' : 'night';
}

// Kamera zurücksetzen
function resetCamera() {
    if (currentCamera === droneCamera) {
        droneCamera.position.set(0, 100, 100);
        controls.reset();
    } else {
        firstPersonCamera.position.set(0, 5, 0);
        firstPersonCamera.lookAt(0, 5, -10);
    }
}

// Canvas-Klick verarbeiten
function onCanvasClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, currentCamera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    for (let intersect of intersects) {
        if (intersect.object.userData.clickable && intersect.object.userData.annotationId) {
            showAnnotation(intersect.object.userData.annotationId);
            break;
        }
    }
}

// Mausbewegung verarbeiten (für Hover-Effekte und First-Person Look)
function onCanvasMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // First-Person Look nur wenn Maus gedrückt gehalten wird
    if (currentCamera === firstPersonCamera && isMouseLookActive) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        yaw -= movementX * lookSpeed;
        pitch -= movementY * lookSpeed;

        // Pitch begrenzen
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        // Kamera-Rotation anwenden
        firstPersonCamera.rotation.order = 'YXZ';
        firstPersonCamera.rotation.y = yaw;
        firstPersonCamera.rotation.x = pitch;
    }
}

// Annotation anzeigen
function showAnnotation(annotationId) {
    const annotation = annotationData[annotationId];
    if (annotation) {
        annotationTitle.textContent = annotation.title;
        annotationContent.textContent = annotation.content;
        annotationPanel.classList.remove('hidden');
    }
}

// Maus-Events für First-Person
function onMouseDown(event) {
    if (currentCamera === firstPersonCamera && event.button === 0) {
        isMouseLookActive = true;
        canvas.style.cursor = 'grabbing';
    }
}

function onMouseUp(event) {
    if (currentCamera === firstPersonCamera && event.button === 0) {
        isMouseLookActive = false;
        canvas.style.cursor = 'default';
    }
}

// Tastatur-Events für First-Person Movement
function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

// First-Person Movement verarbeiten
function updateFirstPersonMovement(deltaTime) {
    if (currentCamera !== firstPersonCamera) return;

    const moveVector = new THREE.Vector3();
    const speed = moveSpeed * deltaTime;

    // WASD oder Pfeiltasten
    if (keys['KeyW'] || keys['ArrowUp']) {
        moveVector.z -= speed;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        moveVector.z += speed;
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        moveVector.x -= speed;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        moveVector.x += speed;
    }

    // Bewegung relativ zur Kamera-Richtung
    if (moveVector.length() > 0) {
        moveVector.applyQuaternion(firstPersonCamera.quaternion);
        moveVector.y = 0; // Keine vertikale Bewegung
        firstPersonCamera.position.add(moveVector);
    }
}

// Fenstergröße ändern
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    droneCamera.aspect = width / height;
    droneCamera.updateProjectionMatrix();

    firstPersonCamera.aspect = width / height;
    firstPersonCamera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// Animations-Loop
function animate() {
    requestAnimationFrame(animate);

    stats.begin();

    const startTime = performance.now();
    const deltaTime = 0.016; // Ungefähr 60 FPS

    // Controls updaten
    if (controls.enabled) {
        controls.update();
    }

    // First-Person Movement
    updateFirstPersonMovement(deltaTime);

    // Renderer
    renderer.render(scene, currentCamera);

    const renderTime = performance.now() - startTime;

    // Performance-Updates
    updatePerformanceDisplay(renderTime);

    stats.end();
}

// Performance-Anzeige aktualisieren
function updatePerformanceDisplay(renderTime) {
    // FPS manuell berechnen da stats.fps nicht zuverlässig funktioniert
    const now = performance.now();
    if (!updatePerformanceDisplay.lastTime) {
        updatePerformanceDisplay.lastTime = now;
        updatePerformanceDisplay.frameCount = 0;
    }
    
    updatePerformanceDisplay.frameCount++;
    
    if (now - updatePerformanceDisplay.lastTime >= 1000) {
        const fps = (updatePerformanceDisplay.frameCount * 1000) / (now - updatePerformanceDisplay.lastTime);
        fpsDisplay.textContent = `FPS: ${Math.round(fps)}`;
        updatePerformanceDisplay.lastTime = now;
        updatePerformanceDisplay.frameCount = 0;
    }
    
    renderTimeDisplay.textContent = `Render: ${renderTime.toFixed(1)} ms`;

    // Speicher-Info (falls verfügbar)
    if (performance.memory) {
        const memoryMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
        memoryDisplay.textContent = `RAM: ${memoryMB} MB`;
    } else {
        memoryDisplay.textContent = 'RAM: N/A';
    }
}

// Initialisierung starten
init();
