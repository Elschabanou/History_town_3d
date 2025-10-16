import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
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
let gltfLoader, objLoader, mtlLoader, rgbeLoader;

// First-Person Controls
let keys = {};
let moveSpeed = 20.0;
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

        // Erstelle Loader
        createLoaders();

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
    // Fog wird später dynamisch gesetzt, abhängig vom Himmel
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

// Persische Stadt laden
async function createCity() {
    try {
        // HDRI-Himmel laden basierend auf aktuellem Modus
        if (isDayMode) {
            await loadHDRIEnvironment('/models/sky/citrus_orchard_road_puresky_4k.hdr');
        } else {
            await loadHDRIEnvironment('/models/sky/night/qwantani_moon_noon_puresky_4k.hdr');
        }
        
        // Persische Stadt laden
        await loadGLTFModel('/models/environment/persian_city.glb', {x: 0, y: 0, z: 0}, {x: 0.25, y: 0.25, z: 0.25}, 'persian_city');
        console.log('Persische Stadt erfolgreich geladen');
    } catch (error) {
        console.error('Fehler beim Laden der persischen Stadt:', error);
        // Fallback: Einfache Szene erstellen
        createFallbackScene();
    }
}

// Fallback-Szene falls persische Stadt nicht lädt
function createFallbackScene() {
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

// Loader erstellen
function createLoaders() {
    gltfLoader = new GLTFLoader();
    objLoader = new OBJLoader();
    mtlLoader = new MTLLoader();
    rgbeLoader = new RGBELoader();
}

// GLTF-Modell laden
async function loadGLTFModel(path, position = {x: 0, y: 0, z: 0}, scale = {x: 1, y: 1, z: 1}, annotationId = null) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            path,
            (gltf) => {
                const model = gltf.scene;
                model.position.set(position.x, position.y, position.z);
                model.scale.set(scale.x, scale.y, scale.z);
                model.castShadow = true;
                model.receiveShadow = true;

                // Annotation-Daten hinzufügen (falls angegeben)
                if (annotationId) {
                    model.userData.annotationId = annotationId;
                    model.userData.clickable = true;
                }

                scene.add(model);
                resolve(model);
            },
            (progress) => console.log('Loading progress:', progress),
            (error) => reject(error)
        );
    });
}

// HDRI-Himmel laden
async function loadHDRIEnvironment(path) {
    return new Promise((resolve, reject) => {
        rgbeLoader.load(
            path,
            (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.background = texture;
                scene.environment = texture; // Für realistische Reflexionen
                
                // Realistischen Fog basierend auf HDRI-Himmel setzen
                setRealisticFog();
                
                console.log('HDRI-Himmel erfolgreich geladen');
                resolve(texture);
            },
            (progress) => console.log('HDRI Loading progress:', progress),
            (error) => reject(error)
        );
    });
}

// Realistischen Fog setzen
function setRealisticFog() {
    // Verstärkter Fog für bessere Tiefenwirkung - weniger blau, mehr neutral
    scene.fog = new THREE.FogExp2(0xB0C4DE, 0.0015); // Verstärkter Fog
}

// Fog basierend auf Kamera-Höhe anpassen
function updateFogForCamera() {
    if (!scene.fog) return;
    
    const cameraHeight = currentCamera.position.y;
    
    // Bei hoher Kamera-Position (Drohnenflug) Fog reduzieren
    if (cameraHeight > 50) {
        if (isDayMode) {
            scene.fog = new THREE.FogExp2(0xC0C8D0, 0.0008); // Verstärkter neutraler Fog
        } else {
            scene.fog = new THREE.FogExp2(0x2F2F3F, 0.0010); // Verstärkter dunkler Fog
        }
    } else {
        // Bei niedriger Position normaler Fog
        if (isDayMode) {
            scene.fog = new THREE.FogExp2(0xB0C4DE, 0.0015); // Verstärkter grau-blau Fog
        } else {
            scene.fog = new THREE.FogExp2(0x2F2F3F, 0.0020); // Verstärkter dunkler Fog
        }
    }
}

// Einfache Gebäude erstellen
function createSimpleBuildings() {
    const buildingPositions = [
        { x: -30, z: -30, w: 2.4, h: 4.5, d: 2.4, color: 0x8B4513 },
        { x: 30, z: -30, w: 3, h: 6, d: 3, color: 0x696969 },
        { x: -30, z: 30, w: 3.6, h: 5.4, d: 3.6, color: 0x8B4513 },
        { x: 30, z: 30, w: 2.7, h: 7.5, d: 2.7, color: 0x696969 }
        // Kirche in der Mitte wird durch Tower ersetzt
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
async function toggleDayNight(isNight) {
    isDayMode = !isNight;

    if (isDayMode) {
        // Tag-Modus - HDRI-Himmel laden
        try {
            await loadHDRIEnvironment('/models/sky/citrus_orchard_road_puresky_4k.hdr');
        } catch (error) {
            console.error('Fehler beim Laden des HDRI-Himmels:', error);
            // Fallback zu einfachem Himmel
            scene.background = new THREE.Color(0x87CEEB);
            setRealisticFog();
        }
        ambientLight.intensity = 0.3;
        directionalLight.intensity = 1.0;

        pointLights.forEach(light => {
            light.intensity = 0;
        });
    } else {
        // Nacht-Modus - HDRI-Nachthimmel laden
        try {
            await loadHDRIEnvironment('/models/sky/night/qwantani_moon_noon_puresky_4k.hdr');
        } catch (error) {
            console.error('Fehler beim Laden des HDRI-Nachthimmels:', error);
            // Fallback zu einfachem dunklen Himmel
            scene.background = new THREE.Color(0x191970);
            scene.environment = null;
        }
        // Verstärkter Fog für Nacht - weniger blau
        scene.fog = new THREE.FogExp2(0x2F2F3F, 0.0020);
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

// Drohnen-Kamera Movement verarbeiten
function updateDroneMovement(deltaTime) {
    if (currentCamera !== droneCamera) return;

    const moveVector = new THREE.Vector3();
    const speed = moveSpeed * deltaTime;

    // WASD für horizontale Bewegung (korrigierte Richtungen)
    if (keys['KeyW']) {
        moveVector.z -= speed; // Vorwärts
    }
    if (keys['KeyS']) {
        moveVector.z += speed; // Rückwärts
    }
    if (keys['KeyA']) {
        moveVector.x -= speed; // Links
    }
    if (keys['KeyD']) {
        moveVector.x += speed; // Rechts
    }

    // Pfeiltasten für vertikale Bewegung
    if (keys['ArrowUp']) {
        moveVector.y += speed; // Hoch
    }
    if (keys['ArrowDown']) {
        moveVector.y -= speed; // Runter
    }

    // Bewegung anwenden
    if (moveVector.length() > 0) {
        droneCamera.position.add(moveVector);
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

    // Drohnen-Kamera Movement
    updateDroneMovement(deltaTime);

    // Fog basierend auf Kamera-Position anpassen
    updateFogForCamera();

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
