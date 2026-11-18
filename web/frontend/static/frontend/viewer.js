import * as THREE from 'three';
import { OrbitControls } from './vendor/jsm/controls/OrbitControls.js';

export function createViewer(stage) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.domElement.setAttribute('aria-label', 'Интерактивная 3D-модель');
    stage.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxDistance = 12;
    controls.minDistance = 0.75;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.autoRotateSpeed = 2;

    scene.add(new THREE.HemisphereLight(0xe0e7ff, 0x66588f, 1.85));
    const key = new THREE.DirectionalLight(0xfff5eb, 3);
    key.position.set(3, 7, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x99aaff, 2.3);
    rim.position.set(-3, 2, -4);
    scene.add(rim);

    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.28, 1.38, 0.22, 64),
        new THREE.MeshStandardMaterial({ color: 0x424367, roughness: 0.47 }),
    );
    base.position.y = -0.12;
    scene.add(base);
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.27, 0.012, 8, 80),
        new THREE.MeshBasicMaterial({ color: 0x94ebfb }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);

    function reset() {
        controls.enableDamping = false;
        controls.update();
        const distance = Math.max(4.8, 3.9 / camera.aspect);
        camera.position.set(2, 1.65, 3).normalize().multiplyScalar(distance);
        controls.target.set(0, 0.25, 0);
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
    let previousTime = 0;
    function clear() {
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
                renderer.render(scene, camera);
            } : null);
        },
        show(geometry, color) {
            clear();
            mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
            mesh.scale.setScalar(1.85);
            scene.add(mesh);
            reset();
        },
    };
}
