# History_town_3d

Die Aufgabe des Programmentwurfs besteht in der Erstellung einer interaktiven 3D-Visualisierung einer historischen Stadt.

## 🚀 Features

- **Interaktive 3D-Visualisierung** einer mittelalterlichen Stadt
- **Zwei Kamera-Modi**: Drohnenflug (Orbit-Controls) und First-Person
- **Tag/Nacht Zyklus** mit dynamischer Beleuchtung
- **Historische Annotationen** - Klicke auf Gebäude für Informationen
- **Performance-Monitoring** (FPS, Renderzeit, Speicherverbrauch)
- **Responsive UI** mit Steuerpanel

## 🛠️ Technologien

- **Three.js** - 3D-Rendering Engine
- **Vite** - Build-Tool und Entwicklungsserver
- **JavaScript ES6 Modules**
- **Stats.js** - Performance-Monitoring
- **dat.GUI** - Erweiterte UI-Steuerung

## 📦 Installation & Setup

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn

### Installation

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die Anwendung ist dann unter `http://localhost:5173` verfügbar.

### Build für Produktion

```bash
npm run build
npm run preview
```

## 🎮 Bedienung

### Kamera-Steuerung
- **Drohnenflug-Modus**: Maus zum Schwenken/Drehen, Mausrad zum Zoomen
- **First-Person-Modus**: (Noch nicht vollständig implementiert)

### UI-Steuerung
- **Kamera-Modus**: Zwischen Drohnenflug und First-Person wechseln
- **Licht-Modus**: Tag/Nacht Zyklus umschalten
- **Kamera zurücksetzen**: Zur Standardposition zurückkehren

### Interaktion
- **Linksklick** auf Gebäude zeigt historische Informationen
- **ESC** schließt Annotations-Fenster

## 📁 Projektstruktur

```
history_town_3d/
├── models/           # 3D-Modelle (.glb, .obj, etc.)
├── public/           # Statische Dateien
│   ├── index.html    # Haupt-HTML
│   └── style.css     # Styles
├── src/              # Quellcode
│   └── main.js       # Haupt-Three.js Anwendung
├── annotations.json  # Historische Informationen
├── package.json      # Abhängigkeiten
└── vite.config.js    # Vite-Konfiguration
```

## 🔧 Erweiterte Features (geplant)

- [ ] First-Person Kamera mit WASD-Steuerung
- [ ] 3D-Modell-Import (GLTF/GLB)
- [ ] Erweiterte Stadt mit mehr Gebäuden
- [ ] Soundeffekte und Musik
- [ ] VR/AR-Unterstützung
- [ ] Mobile Touch-Steuerung

## 📊 Performance

Die Anwendung ist optimiert für moderne Browser und bietet:
- Echtzeit-Performance-Monitoring
- Schatten-Mapping für realistische Beleuchtung
- LOD (Level of Detail) für entfernte Objekte
- Effiziente Geometrie-Verwaltung

## 🤝 Beitragen

1. Fork das Projekt
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist Teil einer Programmentwurfs-Aufgabe und dient ausschließlich Bildungszwecken.
