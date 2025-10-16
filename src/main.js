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
let enableShadows = true; // Schatten können deaktiviert werden für bessere Performance

let annotationData = {};
let raycaster, mouse;

// Loader
let gltfLoader, objLoader, mtlLoader, rgbeLoader;

// First-Person Controls
let keys = {};
let moveSpeed = 35.0; // Erhöhte Geschwindigkeit (20.0 → 35.0)
let lookSpeed = 0.002;
let pitch = 0;
let yaw = 0;
let isMouseLookActive = false;

// Smooth Movement für First-Person
let fpVelocity = new THREE.Vector3();
let fpAcceleration = 0.8; // Smooth acceleration
let fpDeceleration = 0.9; // Smooth deceleration

// Drohnen Controls
let dronePitch = 0;
let droneYaw = 0;
let droneMoveSpeed = 80.0; // Erhöhte Geschwindigkeit
let droneLookSpeed = 0.006; // Smooth Look (erhöht)
let isDroneLookActive = false;

// Smooth Movement für Drohne
let droneVelocity = new THREE.Vector3();
let droneAcceleration = 0.9; // Smooth acceleration (erhöht)
let droneDeceleration = 0.85; // Smooth deceleration (schneller)

// Smooth Look für Drohne
let targetDronePitch = 0;
let targetDroneYaw = 0;
let droneLookSmoothing = 0.15; // Smooth Look interpolation (schneller)

// Kollisionssystem
let collisionObjects = []; // Array für alle kollidierbaren Objekte
let cameraRadius = 2.0; // Kollisionsradius für Kameras
let collisionEnabled = true; // Kollisionen aktiv

// DOM Elemente - werden nach DOMContentLoaded geladen
let canvas, cameraModeSelect, lightModeSelect, resetCameraBtn, shadowToggle;
let fpsDisplay, renderTimeDisplay, memoryDisplay, cameraPositionDisplay;
let annotationPanel, annotationTitle, annotationContent, closeAnnotationBtn, loadingOverlay;

// DOM-Elemente laden nach DOMContentLoaded
function loadDOMElements() {
    console.log('Loading DOM elements...');
    
    // Alle Elemente mit IDs im DOM auflisten
    const allElements = document.querySelectorAll('[id]');
    console.log('All elements with IDs:', Array.from(allElements).map(el => el.id));
    
    canvas = document.getElementById('threejs-canvas');
    cameraModeSelect = document.getElementById('camera-mode');
    lightModeSelect = document.getElementById('light-mode');
    resetCameraBtn = document.getElementById('reset-camera');
    shadowToggle = document.getElementById('shadow-toggle');
    
    // Debug: Schatten-Toggle spezifisch überprüfen
    if (shadowToggle) {
        console.log('shadowToggle gefunden:', shadowToggle);
    } else {
        console.error('shadowToggle NICHT gefunden!');
        console.log('Alle verfügbaren Elemente mit "shadow" im Namen:');
        const shadowElements = document.querySelectorAll('[id*="shadow"], [class*="shadow"]');
        shadowElements.forEach(el => console.log('Element:', el.id, el.className, el));
        
        // Alternative Selektoren versuchen
        const alt1 = document.querySelector('#shadow-toggle');
        const alt2 = document.querySelector('select[id="shadow-toggle"]');
        const alt3 = document.querySelector('div.control-group select');
        console.log('Alternative Selektoren:', { alt1, alt2, alt3 });
    }
    fpsDisplay = document.getElementById('fps');
    renderTimeDisplay = document.getElementById('render-time');
    memoryDisplay = document.getElementById('memory');
    cameraPositionDisplay = document.getElementById('camera-position');
    annotationPanel = document.getElementById('annotation-panel');
    annotationTitle = document.getElementById('annotation-title');
    annotationContent = document.getElementById('annotation-content');
    closeAnnotationBtn = document.getElementById('close-annotation');
    loadingOverlay = document.getElementById('loading-overlay');

    // Debug: Überprüfe ob alle DOM-Elemente gefunden wurden
    console.log('DOM Elements loaded:', {
        fpsDisplay: !!fpsDisplay,
        renderTimeDisplay: !!renderTimeDisplay,
        memoryDisplay: !!memoryDisplay,
        cameraPositionDisplay: !!cameraPositionDisplay,
        canvas: !!canvas,
        cameraModeSelect: !!cameraModeSelect,
        lightModeSelect: !!lightModeSelect,
        resetCameraBtn: !!resetCameraBtn,
        shadowToggle: !!shadowToggle
    });

    // Test: Sofort Kamera-Position anzeigen
    if (cameraPositionDisplay) {
        cameraPositionDisplay.textContent = 'Position: X: -- Y: -- Z: --';
        console.log('Camera position element found and set to initial text');
    } else {
        console.error('Camera position element NOT found!');
        console.log('Trying alternative selectors...');
        
        // Alternative Selektoren versuchen
        const alt1 = document.querySelector('#camera-position');
        const alt2 = document.querySelector('div[id="camera-position"]');
        const alt3 = document.querySelector('.control-group div');
        
        console.log('Alternative selectors:', {
            querySelector: !!alt1,
            querySelectorWithDiv: !!alt2,
            controlGroupDiv: !!alt3
        });
        
        // Fallback: Element dynamisch erstellen
        console.log('Creating camera position element dynamically...');
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            const newDiv = document.createElement('div');
            newDiv.id = 'camera-position';
            newDiv.textContent = 'Position: X: -- Y: -- Z: --';
            controlPanel.appendChild(newDiv);
            cameraPositionDisplay = newDiv;
            console.log('Camera position element created dynamically');
        }
    }
}

// Initialisierung
async function init() {
    try {
        // DOM-Elemente laden
        loadDOMElements();
        
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
    // Drohnen-Kamera (freie Bewegung)
    droneCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    droneCamera.position.set(0, 100, 100);
    droneCamera.rotation.order = 'YXZ'; // Für freie Rotation

    // First-Person Kamera
    firstPersonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    firstPersonCamera.position.set(0, 8, 0); // Höher positioniert (8 statt 5)
    firstPersonCamera.rotation.order = 'YXZ';

    // Setze aktuelle Kamera
    currentCamera = droneCamera;

    // OrbitControls nur für UI (nicht für Drohnen-Modus)
    controls = new OrbitControls(droneCamera, canvas);
    controls.enabled = false; // Standardmäßig deaktiviert
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
    renderer.shadowMap.enabled = enableShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
}

// Lichtsystem erstellen
function createLighting() {
    // Ambient Light - Reduziert für stärkere Schatten
    ambientLight = new THREE.AmbientLight(0x404040, 0.15);
    scene.add(ambientLight);

    // Directional Light (Sonne) - Stärkeres Licht für deutlichere Schatten
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = enableShadows;
    
    // Schatten-Kamera optimieren für bessere Sichtbarkeit
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -150; // Kleinere Kamera für schärfere Schatten
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    directionalLight.shadow.bias = -0.0005; // Stärkerer Bias für deutlichere Schatten
    directionalLight.shadow.normalBias = 0.05; // Erhöhter Normal-Bias für stärkere Schatten
    directionalLight.shadow.radius = 4; // Weichere Schatten-Kanten für bessere Sichtbarkeit
    
    scene.add(directionalLight);
    scene.add(directionalLight.target);

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
            await loadHDRIEnvironment('/models/sky/qwantani_noon_4k.hdr');
        } else {
            await loadHDRIEnvironment('/models/sky/night/qwantani_moon_noon_puresky_4k.hdr');
        }
        
        // Persische Stadt laden
        await loadGLTFModel('/models/environment/persian_city.glb', {x: 0, y: 0, z: 0}, {x: 0.25, y: 0.25, z: 0.25}, 'persian_city');
        console.log('Persische Stadt erfolgreich geladen');

        // Kollisionsobjekte prüfen und Kollisionen aktivieren
        debugCollisionObjects();
        toggleCollisions(true);
    } catch (error) {
        console.error('Fehler beim Laden der persischen Stadt:', error);
        // Fallback: Einfache Szene erstellen
        createFallbackScene();
        
        // Debug: Kollisionsobjekte anzeigen
        debugCollisionObjects();
    }
}

// Fallback-Szene falls persische Stadt nicht lädt
function createFallbackScene() {
    // Boden
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    ground.receiveShadow = enableShadows;
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

                // Schatten für alle Meshes im Modell aktivieren
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = enableShadows;
                        child.receiveShadow = enableShadows;
                        
                        // Material für Schatten optimieren
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat) mat.transparent = false;
                                });
                            } else {
                                child.material.transparent = false;
                            }
                        }
                        
                        // Kollisionsobjekt hinzufügen
                        addCollisionObject(child);
                    }
                });

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

// Schatten an/aus schalten
function toggleShadows(enabled) {
    enableShadows = enabled;

    if (directionalLight) {
        directionalLight.castShadow = enabled;
        // Schatten-Kamera aktualisieren
        directionalLight.shadow.camera.updateProjectionMatrix();
    }

    if (renderer) {
        renderer.shadowMap.enabled = enabled;
        renderer.shadowMap.needsUpdate = true;
    }

    // Alle Objekte in der Szene durchgehen und Schatten aktivieren/deaktivieren
    scene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = enabled;
            child.receiveShadow = enabled;
        }
    });

    console.log('Schatten', enabled ? 'aktiviert' : 'deaktiviert', '- Performance:', enabled ? 'reduziert' : 'optimiert');
    
    // Debug: Schatten-Status überprüfen
    if (enabled) {
        console.log('Schatten-Debug:', {
            directionalLightCastShadow: directionalLight?.castShadow,
            rendererShadowMapEnabled: renderer?.shadowMap?.enabled,
            shadowMapSize: directionalLight?.shadow?.mapSize,
            shadowCamera: directionalLight?.shadow?.camera
        });
    }
}

// Kollisionsprüfung
function checkCollision(newPosition, camera) {
    if (!collisionEnabled || collisionObjects.length === 0) return false;

    const cameraPos = new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z);

    for (let obj of collisionObjects) {
        if (!obj.geometry) continue;
        try {
            const box = new THREE.Box3().setFromObject(obj);
            // Vertikale Überschneidung prüfen
            const withinY = cameraPos.y >= (box.min.y - 0.5) && cameraPos.y <= (box.max.y + 1.0);
            if (!withinY) continue;

            // 2D XZ-Kollision mit Kameraradius
            const minX = box.min.x - cameraRadius;
            const maxX = box.max.x + cameraRadius;
            const minZ = box.min.z - cameraRadius;
            const maxZ = box.max.z + cameraRadius;

            if (cameraPos.x >= minX && cameraPos.x <= maxX && cameraPos.z >= minZ && cameraPos.z <= maxZ) {
                return true;
            }
        } catch (_) {
            continue;
        }
    }
    return false;
}

// Kollisionsobjekte zur Szene hinzufügen
function addCollisionObject(object) {
    if (!object || !object.geometry) return;
    try {
        // Heuristik: Nur plausible Gebäude registrieren, keine riesigen/zu flachen/Untergrund-Objekte
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Sehr große Hüllen (z.B. gesamtes Stadt-Mesh) ignorieren
        if (size.x > 300 || size.z > 300) return;
        // Sehr flache Objekte (Boden, Straßen, Dekal) ignorieren
        if (size.y < 1.5) return;
        // Namen-basierter Filter für Boden
        const name = (object.name || '').toLowerCase();
        if (name.includes('ground') || name.includes('floor') || name.includes('road')) return;
        // Transparente Objekte ignorieren
        const mat = object.material;
        if (Array.isArray(mat)) {
            if (mat.some(m => m && m.transparent)) return;
        } else if (mat && mat.transparent) {
            return;
        }

        collisionObjects.push(object);
    } catch (_) {
        // Ignorieren, falls Box nicht berechnet werden kann
    }
}

// Debug: Kollisionsobjekte anzeigen
function debugCollisionObjects() {
    console.log('Kollisionsobjekte:', collisionObjects.length);
    collisionObjects.forEach((obj, index) => {
        console.log(`Objekt ${index}:`, obj.position, obj.geometry);
    });
    
    // Kollisionen aktivieren wenn Objekte vorhanden sind
    if (collisionObjects.length > 0) {
        collisionEnabled = true;
        console.log('Kollisionen aktiviert');
    }
}

// Kollisionen manuell aktivieren/deaktivieren
function toggleCollisions(enabled) {
    collisionEnabled = enabled;
    console.log('Kollisionen', enabled ? 'aktiviert' : 'deaktiviert');
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
        mesh.castShadow = enableShadows;
        mesh.receiveShadow = enableShadows;

        // Füge Annotation-Daten hinzu
        mesh.userData.annotationId = `building_${index}`;
        mesh.userData.clickable = true;
        
        // Kollisionsobjekt hinzufügen
        addCollisionObject(mesh);

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
    road.castShadow = false;
    road.receiveShadow = enableShadows;
    scene.add(road);

    // Kreuzung
    const crossRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 10),
        roadMaterial
    );
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.01;
    crossRoad.castShadow = false;
    crossRoad.receiveShadow = enableShadows;
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
    trunk.castShadow = enableShadows;
    trunk.receiveShadow = enableShadows;
    
    // Kollisionsobjekt hinzufügen
    addCollisionObject(trunk);
    
    scene.add(trunk);

        // Krone
        const crownGeometry = new THREE.SphereGeometry(4);
        const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.set(pos.x, 10, pos.z);
    crown.castShadow = enableShadows;
    crown.receiveShadow = enableShadows;
    
    // Kollisionsobjekt hinzufügen
    addCollisionObject(crown);
    
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
    if (cameraModeSelect) {
        cameraModeSelect.addEventListener('change', (e) => {
            switchCameraMode(e.target.value);
        });
    } else {
        console.error('cameraModeSelect not found!');
    }

    // Licht-Modus wechseln
    if (lightModeSelect) {
        lightModeSelect.addEventListener('change', (e) => {
            toggleDayNight(e.target.value === 'night');
        });
    } else {
        console.error('lightModeSelect not found!');
    }

    // Schatten-Toggle
    if (shadowToggle) {
        shadowToggle.addEventListener('change', (e) => {
            toggleShadows(e.target.value === 'on');
        });

        // Initialen Zustand des Schatten-Toggles setzen
        shadowToggle.value = enableShadows ? 'on' : 'off';
    } else {
        console.error('shadowToggle not found! Trying to create fallback...');
        
        // Fallback: Element dynamisch erstellen
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            console.log('Creating shadow toggle dynamically...');
            
            // Prüfe ob bereits ein Schatten-Toggle existiert
            const existingToggle = controlPanel.querySelector('#shadow-toggle');
            if (existingToggle) {
                shadowToggle = existingToggle;
                console.log('Found existing shadow toggle:', shadowToggle);
            } else {
                // Einfacher Ansatz: Direkt nach dem HTML einfügen
                const lightModeGroup = controlPanel.querySelector('#light-mode').closest('.control-group');
                if (lightModeGroup) {
                    // Erstelle das Element
                    const shadowGroup = document.createElement('div');
                    shadowGroup.className = 'control-group';
                    shadowGroup.innerHTML = `
                        <label>Schatten:</label>
                        <select id="shadow-toggle">
                            <option value="on">An</option>
                            <option value="off">Aus</option>
                        </select>
                    `;
                    
                    // Füge es nach der light-mode Gruppe hinzu
                    lightModeGroup.parentNode.insertBefore(shadowGroup, lightModeGroup.nextSibling);
                    console.log('Shadow toggle inserted after light mode group');
                } else {
                    // Fallback: Einfach am Ende hinzufügen
                    const shadowGroup = document.createElement('div');
                    shadowGroup.className = 'control-group';
                    shadowGroup.innerHTML = `
                        <label>Schatten:</label>
                        <select id="shadow-toggle">
                            <option value="on">An</option>
                            <option value="off">Aus</option>
                        </select>
                    `;
                    
                    controlPanel.appendChild(shadowGroup);
                    console.log('Shadow toggle appended to control panel');
                }
                
                shadowToggle = document.getElementById('shadow-toggle');
                console.log('Created shadow toggle:', shadowToggle);
            }
            
            // Event Listener hinzufügen
            if (shadowToggle) {
                shadowToggle.addEventListener('change', (e) => {
                    toggleShadows(e.target.value === 'on');
                });
                shadowToggle.value = enableShadows ? 'on' : 'off';
                console.log('Shadow toggle event listener added successfully');
            }
        } else {
            console.error('Control panel not found - cannot create shadow toggle');
        }
    }

    // Kamera zurücksetzen
    if (resetCameraBtn) {
        resetCameraBtn.addEventListener('click', resetCamera);
    } else {
        console.error('resetCameraBtn not found!');
    }

    // Annotation schließen
    if (closeAnnotationBtn) {
        closeAnnotationBtn.addEventListener('click', () => {
            if (annotationPanel) {
                annotationPanel.classList.add('hidden');
            }
        });
    } else {
        console.error('closeAnnotationBtn not found!');
    }

    // Maus-Interaktion
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    if (canvas) {
        canvas.addEventListener('click', onCanvasClick);
        canvas.addEventListener('mousemove', onCanvasMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
    } else {
        console.error('Canvas not found!');
    }

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
        controls.enabled = false; // OrbitControls deaktiviert für freie Drohnen-Steuerung
        // Mauszeiger sichtbar lassen für Drohnen-Look
        document.body.style.cursor = 'default';
        canvas.style.cursor = 'default';
        isMouseLookActive = false;
        isDroneLookActive = false;
    } else if (mode === 'first-person') {
        currentCamera = firstPersonCamera;
        controls.enabled = false;
        // Mauszeiger sichtbar lassen
        document.body.style.cursor = 'default';
        canvas.style.cursor = 'default';
        isMouseLookActive = false;
        isDroneLookActive = false;
    }
}

// Tag/Nacht Modus umschalten
async function toggleDayNight(isNight) {
    isDayMode = !isNight;

    if (isDayMode) {
        // Tag-Modus - HDRI-Himmel laden
        try {
            await loadHDRIEnvironment('/models/sky/qwantani_noon_4k.hdr');
        } catch (error) {
            console.error('Fehler beim Laden des HDRI-Himmels:', error);
            // Fallback zu einfachem Himmel
            scene.background = new THREE.Color(0x87CEEB);
            setRealisticFog();
        }
        ambientLight.intensity = 0.3;
        directionalLight.intensity = 1.0;
        
        // Tone Mapping Exposure für Tag-Modus zurücksetzen
        renderer.toneMappingExposure = 1.0;

        pointLights.forEach(light => {
            light.intensity = 0;
        });
    } else {
        // Nacht-Modus - HDRI-Nachthimmel laden
        try {
            await loadHDRIEnvironment('/models/sky/night/qwantani_moon_noon_puresky_4k.hdr');
            
            // HDRI-Textur für Nachtmodus abdunkeln
            if (scene.background && scene.background.isTexture) {
                // Tone Mapping Exposure reduzieren für dunkleren Himmel
                renderer.toneMappingExposure = 0.3; // Deutlich dunkler
                
                // Zusätzlich: HDRI-Textur direkt abdunkeln
                scene.background.colorSpace = THREE.SRGBColorSpace;
                scene.background.encoding = THREE.sRGBEncoding;
            }
        } catch (error) {
            console.error('Fehler beim Laden des HDRI-Nachthimmels:', error);
            // Fallback zu einfachem dunklen Himmel
            scene.background = new THREE.Color(0x191970);
            scene.environment = null;
            renderer.toneMappingExposure = 1.0; // Reset für Fallback
        }
        // Verstärkter Fog für Nacht - weniger blau
        scene.fog = new THREE.FogExp2(0x2F2F3F, 0.0020);
        ambientLight.intensity = 0.05; // Noch dunkler für Nacht
        directionalLight.intensity = 0.05; // Sehr schwaches Licht

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
    
    // Drohnen-Look nur wenn Maus gedrückt gehalten wird
    if (currentCamera === droneCamera && isDroneLookActive) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        targetDroneYaw -= movementX * droneLookSpeed;
        targetDronePitch -= movementY * droneLookSpeed;

        // Pitch begrenzen für Drohne
        targetDronePitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetDronePitch));
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
    if (event.button === 0) { // Linke Maustaste
        if (currentCamera === firstPersonCamera) {
            isMouseLookActive = true;
            canvas.style.cursor = 'grabbing';
        } else if (currentCamera === droneCamera) {
            isDroneLookActive = true;
            canvas.style.cursor = 'grabbing';
        }
    }
}

function onMouseUp(event) {
    if (event.button === 0) { // Linke Maustaste
        if (currentCamera === firstPersonCamera) {
            isMouseLookActive = false;
            canvas.style.cursor = 'default';
        } else if (currentCamera === droneCamera) {
            isDroneLookActive = false;
            canvas.style.cursor = 'default';
        }
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

    const targetVelocity = new THREE.Vector3();
    const speed = moveSpeed * deltaTime;

    // WASD oder Pfeiltasten
    if (keys['KeyW'] || keys['ArrowUp']) {
        targetVelocity.z -= speed;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        targetVelocity.z += speed;
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        targetVelocity.x -= speed;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        targetVelocity.x += speed;
    }

    // Smooth interpolation für Geschwindigkeit
    if (targetVelocity.length() > 0) {
        // Beschleunigung
        fpVelocity.lerp(targetVelocity, fpAcceleration);
    } else {
        // Verzögerung
        fpVelocity.multiplyScalar(fpDeceleration);
    }

    // Bewegung relativ zur Kamera-Richtung
    if (fpVelocity.length() > 0.01) { // Minimale Bewegung ignorieren
        const moveVector = fpVelocity.clone();
        moveVector.applyQuaternion(firstPersonCamera.quaternion);
        moveVector.y = 0; // Keine vertikale Bewegung
        
        // Neue Position berechnen
        const newPosition = firstPersonCamera.position.clone().add(moveVector);
        
        // Kollisionsprüfung
        if (!checkCollision(newPosition, firstPersonCamera)) {
            firstPersonCamera.position.copy(newPosition);
            console.log('First-Person Bewegung:', firstPersonCamera.position);
        } else {
            console.log('First-Person Kollision verhindert');
        }
    }
}

// Drohnen-Kamera Movement verarbeiten
function updateDroneMovement(deltaTime) {
    if (currentCamera !== droneCamera) return;

    const targetVelocity = new THREE.Vector3();
    const speed = droneMoveSpeed * deltaTime;

    // WASD für Bewegung in Blickrichtung
    if (keys['KeyW']) {
        targetVelocity.z -= speed; // Vorwärts
    }
    if (keys['KeyS']) {
        targetVelocity.z += speed; // Rückwärts
    }
    if (keys['KeyA']) {
        targetVelocity.x -= speed; // Links
    }
    if (keys['KeyD']) {
        targetVelocity.x += speed; // Rechts
    }

    // Pfeiltasten für vertikale Bewegung
    if (keys['ArrowUp']) {
        targetVelocity.y += speed; // Hoch
    }
    if (keys['ArrowDown']) {
        targetVelocity.y -= speed; // Runter
    }

    // Smooth interpolation für Geschwindigkeit
    if (targetVelocity.length() > 0) {
        // Beschleunigung
        droneVelocity.lerp(targetVelocity, droneAcceleration);
    } else {
        // Verzögerung
        droneVelocity.multiplyScalar(droneDeceleration);
    }

    // Bewegung relativ zur Kamera-Richtung anwenden
    if (droneVelocity.length() > 0.01) { // Minimale Bewegung ignorieren
        const moveVector = droneVelocity.clone();
        moveVector.applyQuaternion(droneCamera.quaternion);
        
        // Neue Position berechnen
        const newPosition = droneCamera.position.clone().add(moveVector);
        
        // Kollisionsprüfung
        if (!checkCollision(newPosition, droneCamera)) {
            droneCamera.position.copy(newPosition);
            console.log('Drohnen-Bewegung:', droneCamera.position);
            
            // Grenzen anwenden
            applyDroneBoundaries();
        } else {
            console.log('Drohnen-Kollision verhindert');
        }
    }
}

// Sphärische Drohnen-Grenzen anwenden
function applyDroneBoundaries() {
    const position = droneCamera.position;
    const distanceFromOrigin = Math.sqrt(position.x * position.x + position.z * position.z);
    
    // Sphärische Höhen-Begrenzung
    // Y = 150 am Ursprung, abflach nach außen
    const maxHeight = Math.max(5, 150 - (distanceFromOrigin * 0.3)); // Abflach-Faktor 0.3
    
    // Höhen-Grenzen anwenden
    if (position.y > maxHeight) {
        droneCamera.position.y = maxHeight;
    }
    if (position.y < 5) {
        droneCamera.position.y = 5;
    }
    
    // Sphärische Grenzen für X und Z (Radius von 400)
    const maxRadius = 400;
    if (distanceFromOrigin > maxRadius) {
        // Position auf Kugeloberfläche projizieren
        const angle = Math.atan2(position.z, position.x);
        droneCamera.position.x = Math.cos(angle) * maxRadius;
        droneCamera.position.z = Math.sin(angle) * maxRadius;
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

    // Smooth Drohnen-Look interpolation
    if (currentCamera === droneCamera) {
        droneYaw += (targetDroneYaw - droneYaw) * droneLookSmoothing;
        dronePitch += (targetDronePitch - dronePitch) * droneLookSmoothing;
        
        // Drohnen-Rotation anwenden
        droneCamera.rotation.order = 'YXZ';
        droneCamera.rotation.y = droneYaw;
        droneCamera.rotation.x = dronePitch;
    }

    // Fog basierend auf Kamera-Position anpassen
    updateFogForCamera();

    // Schatten kontinuierlich aktualisieren für bessere Qualität
    if (enableShadows && directionalLight && directionalLight.shadow && directionalLight.shadow.map) {
        directionalLight.shadow.map.needsUpdate = true;
    }

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
        if (fpsDisplay) {
            fpsDisplay.textContent = `FPS: ${Math.round(fps)}`;
        }
        updatePerformanceDisplay.lastTime = now;
        updatePerformanceDisplay.frameCount = 0;
    }
    
    if (renderTimeDisplay) {
        renderTimeDisplay.textContent = `Render: ${renderTime.toFixed(1)} ms`;
    }

    // Speicher-Info (falls verfügbar)
    if (memoryDisplay) {
        if (performance.memory) {
            const memoryMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
            memoryDisplay.textContent = `RAM: ${memoryMB} MB`;
        } else {
            memoryDisplay.textContent = 'RAM: N/A';
        }
    }

    // Kamera-Position anzeigen
    if (cameraPositionDisplay) {
        if (currentCamera) {
            const pos = currentCamera.position;
            cameraPositionDisplay.textContent = `Position: X: ${pos.x.toFixed(1)} Y: ${pos.y.toFixed(1)} Z: ${pos.z.toFixed(1)}`;
        } else {
            cameraPositionDisplay.textContent = 'Position: Kamera nicht verfügbar';
        }
    } else {
        console.error('cameraPositionDisplay element not found!');
    }
}

// Warten bis DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, starting initialization...');
    
    // Kleine Verzögerung um sicherzustellen, dass alle Elemente verfügbar sind
    setTimeout(() => {
        console.log('Starting delayed initialization...');
        init();
    }, 100);
});
