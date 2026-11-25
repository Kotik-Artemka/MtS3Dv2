import { loadSceneGeometry } from './model.js';

export async function loadEnvironment() {
    const [pedestal, top] = await Promise.all([
        loadSceneGeometry('/scene/pedestal.stl'),
        loadSceneGeometry('/scene/pedestal-top.stl'),
    ]);
    return { pedestal, top };
}
