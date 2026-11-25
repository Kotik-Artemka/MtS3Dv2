import * as THREE from 'three';

import { controlFlight } from './flight.js';
import { loadGeometry } from './model.js';
import { loadEnvironment } from './environment.js';
import { createStudio, createContactShadow, porcelainMaterial, goldMaterial, PEDESTAL_HEIGHT } from './studio.js?v=3';

import { positionFor } from './layout.js?v=3';

const platformMaterial = porcelainMaterial();
const topMaterial = goldMaterial();

export function createGallery(world, labels, onSelect, lockChanged) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', 'Площадка с 3D-моделями');
    canvas.tabIndex = 0;
    world.append(canvas);

    const { scene, floor } = createStudio(renderer);
    const camera = new THREE.PerspectiveCamera(49, 1, 0.08, 350);

    const raycaster = new THREE.Raycaster();
    const projection = new THREE.Vector3();
    const point = new THREE.Vector2();
    const exhibits = new Map();
    let environment;
    let environmentRequest;
    function ensureEnvironment() {
        if (!environmentRequest) environmentRequest = loadEnvironment().then(assets => {
            environment = assets;
            renderer.shadowMap.needsUpdate = true;
        }).catch(error => {
            environmentRequest = undefined;
            throw error;
        });
        return environmentRequest;
    }

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
        const base = new THREE.Mesh(environment.pedestal, platformMaterial);
        base.receiveShadow = true;
        base.castShadow = true;
        const top = new THREE.Mesh(environment.top, topMaterial);
        top.receiveShadow = top.castShadow = true;
        group.add(base, top);
        const contact = createContactShadow();
        contact.raycast = () => {};
        group.add(contact);
        scene.add(group);

        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'exhibit';
        label.addEventListener('click', () => onSelect(model.id));
        labels.append(label);
        return { group, label, height: 1.4 };
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
                color: new THREE.Color(exhibit.group.userData.model.color).multiplyScalar(0.78), roughness: 0.5, metalness: 0.05,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.setScalar(3.75);
            mesh.position.y = PEDESTAL_HEIGHT;
            mesh.rotation.y = 0.35;
            mesh.castShadow = mesh.receiveShadow = true;
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

    async function setModels(models) {
        await ensureEnvironment();
        const ids = new Set(models.map(model => model.id));
        for (const [id, exhibit] of exhibits) {
            if (ids.has(id)) continue;
            exhibit.group.removeFromParent();
            exhibit.mesh?.material.dispose();
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
            const [x, z] = positionFor(index, models.length, model.id);
            exhibit.group.position.set(x, 0, z);
            exhibit.mesh?.material.color.set(model.color).multiplyScalar(0.78);
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
        // The floor follows horizontal flight; its edge always stays beyond the fog.
        floor.position.x = camera.position.x;
        floor.position.z = camera.position.z;
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
