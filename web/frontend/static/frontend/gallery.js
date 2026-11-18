import * as THREE from 'three';

import { controlFlight } from './flight.js';
import { loadGeometry } from './model.js';

const EXHIBIT_POSITIONS = [[-5.6, 3.9], [5.6, 3.9], [-5.6, -4.6], [5.6, -4.6]];
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x292c47, roughness: 0.76 });
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x454764, roughness: 0.56 });
const platformTopMaterial = new THREE.MeshStandardMaterial({ color: 0x646586, roughness: 0.42 });
const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x9a89ed });

function disc(radius, bottom, height, sides, material, y) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, bottom, height, sides), material);
    mesh.position.y = y;
    return mesh;
}

function ring(radius, thickness, y, material, sides = 96) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 6, sides), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    return mesh;
}

function decorate(scene) {
    const foundation = disc(14.3, 13.5, 0.84, 8, floorMaterial, -0.45);
    foundation.receiveShadow = true;
    scene.add(foundation);
    const outerEdge = ring(14.27, 0.034, -0.02, edgeMaterial, 8);
    scene.add(outerEdge);

    const outlines = new THREE.MeshBasicMaterial({ color: 0x494b78 });
    scene.add(ring(12.2, 0.018, -0.016, outlines), ring(2.3, 0.025, -0.016, outlines));

    const gridPositions = [];
    for (let x = -12; x <= 12; x += 1.2) {
        const half = Math.sqrt(12 ** 2 - x ** 2);
        gridPositions.push(x, -0.014, -half, x, -0.014, half, -half, -0.014, x, half, -0.014, x);
    }
    const grid = new THREE.BufferGeometry();
    grid.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    scene.add(new THREE.LineSegments(grid, new THREE.LineBasicMaterial({ color: 0x535475, transparent: true, opacity: 0.4 })));

    const center = new THREE.Group();
    for (const radius of [0.55, 0.87, 1.2]) {
        center.add(ring(radius, 0.015, -0.014, edgeMaterial));
    }
    scene.add(center);

    const markerGeometry = new THREE.BoxGeometry(0.46, 0.05, 0.13);
    for (let i = 0; i < 48; i++) {
        const angle = i * Math.PI / 24;
        const marker = new THREE.Mesh(markerGeometry, i % 6 === 0 ? edgeMaterial : outlines);
        marker.position.set(Math.sin(angle) * 12.75, -0.005, Math.cos(angle) * 12.75);
        marker.rotation.y = angle;
        scene.add(marker);
    }

    const stars = [];
    THREE.MathUtils.seededRandom(42);
    const random = THREE.MathUtils.seededRandom;
    for (let i = 0; i < 760; i++) {
        const a = random() * Math.PI * 2;
        const radius = 29 + random() * 75;
        stars.push(Math.sin(a) * radius, (random() - 0.47) * 106, Math.cos(a) * radius);
    }
    const points = new THREE.BufferGeometry();
    points.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    scene.add(new THREE.Points(points, new THREE.PointsMaterial({
        color: 0xb2bdf7, size: 0.145, transparent: true, opacity: 0.65, depthWrite: false,
    })));
}

function lightGallery(scene) {
    scene.add(new THREE.HemisphereLight(0xe0e7ff, 0x585679, 2.0));
    const key = new THREE.DirectionalLight(0xf2f3ff, 2.65);
    key.position.set(-5, 16, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 45 });
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.04;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9b9cff, 2.2);
    rim.position.set(7, 5, -9);
    scene.add(rim);
}

function positionFor(index, total) {
    if (total <= 4) return EXHIBIT_POSITIONS[index];
    const radius = Math.min(10.5, 4.4 + total * 0.49);
    const angle = (index + 0.5) * 2 * Math.PI / total;
    return [Math.sin(angle) * radius, Math.cos(angle) * radius];
}

export function createGallery(world, labels, onSelect, lockChanged) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.19;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', 'Площадка с 3D-моделями');
    canvas.tabIndex = 0;
    world.append(canvas);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x111429, 0.012);
    const camera = new THREE.PerspectiveCamera(49, 1, 0.08, 220);
    decorate(scene);
    lightGallery(scene);

    const raycaster = new THREE.Raycaster();
    const projection = new THREE.Vector3();
    const point = new THREE.Vector2();
    const exhibits = new Map();
    const topGeometry = new THREE.CylinderGeometry(2.39, 2.48, 0.26, 48);
    const baseGeometry = new THREE.CylinderGeometry(2.48, 2.62, 0.44, 48);
    const ringGeometry = new THREE.TorusGeometry(2.37, 0.024, 8, 64);

    function pick(x, y) {
        point.set(x, y);
        raycaster.setFromCamera(point, camera);
        const targets = Array.from(exhibits.values()).flatMap(exhibit => exhibit.group.children);
        const hit = raycaster.intersectObjects(targets, false)[0];
        if (hit) onSelect(hit.object.parent.userData.model.id);
    }

    const flight = controlFlight(camera, canvas, { pick, lockChanged });
    let portrait;
    const resize = () => {
        if (!world.clientWidth || !world.clientHeight) return;
        camera.aspect = world.clientWidth / world.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(world.clientWidth, world.clientHeight, false);
        if (portrait === undefined || portrait !== (camera.aspect < 1)) flight.reset();
        portrait = camera.aspect < 1;
    };
    new ResizeObserver(resize).observe(world);
    resize();

    function makeExhibit(model) {
        const group = new THREE.Group();
        group.userData.model = model;
        const base = new THREE.Mesh(baseGeometry, platformMaterial);
        base.position.y = 0.22;
        const top = new THREE.Mesh(topGeometry, platformTopMaterial);
        top.position.y = 0.51;
        top.receiveShadow = true;
        const accent = new THREE.MeshBasicMaterial({ color: model.color });
        const rim = new THREE.Mesh(ringGeometry, accent);
        rim.position.y = 0.65;
        rim.rotation.x = -Math.PI / 2;
        group.add(base, top, rim);
        scene.add(group);

        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'exhibit';
        label.addEventListener('click', () => onSelect(model.id));
        labels.append(label);
        return { group, label, accent, height: 1.4 };
    }

    async function loadExhibit(exhibit, model) {
        exhibit.mesh?.removeFromParent();
        exhibit.mesh?.material.dispose();
        exhibit.mesh = undefined;
        exhibit.url = model.stl_url;
        exhibit.height = 1.4;
        const url = model.stl_url;
        const ticket = Symbol();
        exhibit.ticket = ticket;
        try {
            const geometry = await loadGeometry(url);
            if (exhibits.get(model.id) !== exhibit || exhibit.ticket !== ticket) return;
            const material = new THREE.MeshStandardMaterial({
                color: exhibit.group.userData.model.color, roughness: 0.47, metalness: 0.12,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.setScalar(3.75);
            mesh.position.y = 0.65;
            mesh.rotation.y = 0.35;
            mesh.castShadow = true;
            exhibit.mesh = mesh;
            exhibit.group.add(mesh);
            geometry.computeBoundingBox();
            exhibit.height = geometry.boundingBox.max.y * 3.75 + 1.22;
            renderer.shadowMap.needsUpdate = true;
        } catch {
            if (exhibit.ticket === ticket) exhibit.url = undefined;
            throw new Error('Не удалось загрузить STL');
        }
    }

    function setModels(models) {
        const ids = new Set(models.map(model => model.id));
        for (const [id, exhibit] of exhibits) {
            if (ids.has(id)) continue;
            exhibit.group.removeFromParent();
            exhibit.mesh?.material.dispose();
            exhibit.accent.dispose();
            exhibit.label.remove();
            exhibits.delete(id);
        }

        const loads = models.map((model, index) => {
            let exhibit = exhibits.get(model.id);
            if (!exhibit) {
                exhibit = makeExhibit(model);
                exhibits.set(model.id, exhibit);
            }
            exhibit.group.userData.model = model;
            const [x, z] = positionFor(index, models.length);
            exhibit.group.position.set(x, 0, z);
            exhibit.accent.color.set(model.color);
            exhibit.mesh?.material.color.set(model.color);
            exhibit.label.textContent = model.name;
            exhibit.label.style.setProperty('--exhibit-color', model.color);
            if (exhibit.url !== model.stl_url) exhibit.loading = loadExhibit(exhibit, model);
            return exhibit.loading;
        });
        renderer.shadowMap.needsUpdate = true;
        return Promise.allSettled(loads);
    }

    let lastTime = 0;
    function render(time) {
        flight.update(Math.min((time - lastTime) / 1000, 0.045));
        lastTime = time;
        renderer.render(scene, camera);
        for (const { group, label, height } of exhibits.values()) {
            projection.copy(group.position);
            projection.y = height;
            projection.project(camera);
            const visible = projection.z > 0 && projection.z < 1
                && Math.abs(projection.x) < 0.95 && Math.abs(projection.y) < 0.95;
            label.hidden = !visible;
            if (visible) {
                const x = (projection.x + 1) * world.clientWidth / 2;
                const y = (1 - projection.y) * world.clientHeight / 2;
                label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
            }
        }
    }
    renderer.setAnimationLoop(render);

    return {
        flight,
        setModels,
        setActive(active) {
            flight.setActive(active);
            renderer.setAnimationLoop(active ? render : null);
        },
    };
}
