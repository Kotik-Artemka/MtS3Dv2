import * as THREE from 'three';
import { OrbitControls } from './vendor/jsm/controls/OrbitControls.js';
import { STLLoader } from './vendor/jsm/loaders/STLLoader.js';

export function createViewer(stage) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Интерактивная 3D-модель');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 80);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxDistance = 12;
    controls.minDistance = 0.35;
    controls.autoRotateSpeed = 2;

    scene.add(new THREE.HemisphereLight(0xf3eaff, 0x594b7f, 2.2));
    const key = new THREE.DirectionalLight(0xfff5eb, 3);
    key.position.set(3, 7, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa48aff, 2);
    rim.position.set(-3, 2, -4);
    scene.add(rim);

    const grid = new THREE.GridHelper(18, 54, 0x5d4d81, 0x3f3758);
    grid.position.y = -1;
    grid.material.transparent = true;
    grid.material.opacity = 0.52;
    scene.add(grid);

    function reset() {
        controls.enableDamping = false;
        controls.update();
        const distance = Math.max(4.5, 3.8 / camera.aspect);
        camera.position.set(1.6, 1.1, 2.5).normalize().multiplyScalar(distance);
        controls.target.set(0, 0, 0);
        controls.update();
        controls.enableDamping = true;
    }

    new ResizeObserver(() => {
        const { clientWidth: width, clientHeight: height } = stage;
        if (!width || !height) return;
        const previousAspect = camera.aspect;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        if (camera.aspect < 0.9 && previousAspect >= 0.9) reset();
    }).observe(stage);
    reset();

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });

    let mesh;
    function clear() {
        if (!mesh) return;
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        mesh = undefined;
    }

    return {
        clear,
        reset,
        setSpin(enabled) { controls.autoRotate = enabled; },
        show(buffer, color) {
            const geometry = new STLLoader().parse(buffer);
            // В этих STL высота идёт по Z, а в сцене Three.js — по Y.
            geometry.rotateX(-Math.PI / 2);
            geometry.computeBoundingSphere();
            const { center, radius } = geometry.boundingSphere;
            if (!Number.isFinite(radius) || radius <= 0) {
                geometry.dispose();
                throw new Error('Некорректная геометрия STL');
            }
            geometry.translate(-center.x, -center.y, -center.z);
            geometry.scale(1 / radius, 1 / radius, 1 / radius);
            geometry.computeBoundingBox();
            grid.position.y = geometry.boundingBox.min.y - 0.06;

            clear();
            mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
            scene.add(mesh);
            reset();
        },
    };
}
