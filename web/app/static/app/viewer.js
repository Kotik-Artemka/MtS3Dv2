import * as THREE from 'three';
import { OrbitControls } from './vendor/jsm/controls/OrbitControls.js';
import { loadEnvironment } from './environment.js';
import { createStudio, createContactShadow, porcelainMaterial, goldMaterial, PEDESTAL_HEIGHT } from './studio.js?v=3';

export function createViewer(stage) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.domElement.setAttribute('aria-label', 'Интерактивная 3D-модель');
    stage.append(renderer.domElement);

    const { scene } = createStudio(renderer, 4);
    const contact = createContactShadow();
    contact.scale.setScalar(0.52);
    scene.add(contact);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxDistance = 12;
    controls.minDistance = 0.75;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.autoRotateSpeed = 2;

    const environmentReady = loadEnvironment().then(assets => {
        const base = new THREE.Mesh(assets.pedestal, porcelainMaterial());
        const top = new THREE.Mesh(assets.top, goldMaterial());
        for (const mesh of [base, top]) {
            mesh.scale.setScalar(0.52);
            mesh.position.y = 0;
            mesh.castShadow = mesh.receiveShadow = true;
            scene.add(mesh);
        }
        renderer.shadowMap.needsUpdate = true;
    });
    // A rejected asset request is observed here and reported when show() awaits it.
    environmentReady.catch(() => {});

    function reset() {
        controls.enableDamping = false;
        controls.update();
        const distance = Math.max(4.8, 3.9 / camera.aspect);
        camera.position.set(2, 1.65, 3).normalize().multiplyScalar(distance);
        controls.target.set(0, 0.25 + PEDESTAL_HEIGHT * 0.52, 0);
        controls.update();
        controls.enableDamping = true;
    }

    new ResizeObserver(() => {
        const { clientWidth: width, clientHeight: height } = stage;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }).observe(stage);
    reset();

    let mesh;
    let revision = 0;
    let previousTime = 0;
    function clear() {
        revision++;
        if (!mesh) return;
        scene.remove(mesh);
        mesh.material.dispose();
        mesh = undefined;
    }

    return {
        clear,
        reset,
        setSpin(enabled) { controls.autoRotate = enabled; },
        setActive(active) {
            renderer.setAnimationLoop(active ? time => {
                controls.update(Math.min((time - previousTime) / 1000, 0.05));
                previousTime = time;
                // OrbitControls moves only the camera. The model and lights
                // stay still, so their shadow map remains valid while orbiting.
                renderer.render(scene, camera);
            } : null);
        },
        async show(geometry, color) {
            const ticket = ++revision;
            await environmentReady;
            if (ticket !== revision) return;
            clear();
            mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.78), roughness: 0.5, metalness: 0.05 }));
            mesh.scale.setScalar(1.85);
            mesh.position.y = PEDESTAL_HEIGHT * 0.52;
            mesh.castShadow = mesh.receiveShadow = true;
            scene.add(mesh);
            renderer.shadowMap.needsUpdate = true;
            reset();
        },
    };
}
