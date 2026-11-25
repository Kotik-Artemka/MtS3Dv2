import * as THREE from 'three';

export const PEDESTAL_HEIGHT = 0.65;
export const porcelainMaterial = () => new THREE.MeshStandardMaterial({
    color: 0xf5f3ef, roughness: 0.8, metalness: 0, envMapIntensity: 0.2,
});
export const goldMaterial = () => new THREE.MeshStandardMaterial({
    color: 0xd5aa55, roughness: 0.42, metalness: 0.72,
});

export function createStudio(renderer, shadowExtent = 30) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8e9eb);
    scene.fog = new THREE.Fog(0xe8e9eb, 65, 180);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(shadowExtent <= 4 ? 200 : 2000, shadowExtent <= 4 ? 200 : 2000),
        new THREE.MeshStandardMaterial({ color: 0xe8e9eb, roughness: 1, metalness: 0, envMapIntensity: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.008;
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa0a5b1, 0.65));
    const key = new THREE.DirectionalLight(0xfff6e7, 3.1);
    key.position.set(-9, 16, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 4;
    key.shadow.bias = -0.00015;
    // Keep the offset proportional to the shadow texel size. The close-up
    // viewer needs a much smaller offset than the full gallery.
    key.shadow.normalBias = shadowExtent * 0.0008;
    Object.assign(key.shadow.camera, { left: -shadowExtent, right: shadowExtent, top: shadowExtent, bottom: -shadowExtent, near: 1, far: 65 });
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe4edff, 0.65);
    fill.position.set(8, 7, -6);
    scene.add(fill);

    // Neutral studio reflections give the metal a readable gold surface.
    const reflectionScene = new THREE.Scene();
    reflectionScene.background = new THREE.Color(0xe3dfd8);
    const softboxGeometry = new THREE.PlaneGeometry(8, 12);
    const softboxMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    for (const [x, y, z] of [[-5, 4, 3], [5, 5, -2], [0, 9, 0]]) {
        const softbox = new THREE.Mesh(softboxGeometry, softboxMaterial);
        softbox.position.set(x, y, z);
        softbox.lookAt(0, 0, 0);
        reflectionScene.add(softbox);
    }
    const generator = new THREE.PMREMGenerator(renderer);
    scene.environment = generator.fromScene(reflectionScene, 0.08).texture;
    scene.environmentIntensity = 0.45;
    generator.dispose();
    softboxGeometry.dispose();
    softboxMaterial.dispose();
    return { scene, floor };
}

// Broad contact shade keeps the white base grounded even outside the key light's shadow map.
export function createContactShadow(radius = 2.75) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 25, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(39,45,55,0.24)');
    gradient.addColorStop(0.65, 'rgba(39,45,55,0.16)');
    gradient.addColorStop(1, 'rgba(39,45,55,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.35, radius * 2.35),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.006;
    return mesh;
}
