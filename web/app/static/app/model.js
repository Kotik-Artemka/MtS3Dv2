import { STLLoader } from './vendor/jsm/loaders/STLLoader.js';

const loader = new STLLoader();
const geometries = new Map();

function loadSTL(url, normalize) {
    const key = `${normalize ? 'exhibit' : 'scene'}:${url}`;
    if (!geometries.has(key)) {
        const request = loader.loadAsync(url).then(geometry => {
            // STL лежит на плоскости XY, а пол сцены — на XZ.
            geometry.rotateX(-Math.PI / 2);
            geometry.computeBoundingBox();
            if (!normalize) return geometry;
            const center = geometry.boundingBox.getCenter(geometry.boundingBox.min.clone());
            const size = geometry.boundingBox.getSize(center.clone());
            const width = Math.max(size.x, size.y, size.z);
            if (!Number.isFinite(width) || width <= 0) {
                geometry.dispose();
                throw new Error('Некорректная геометрия STL');
            }
            geometry.translate(-center.x, -geometry.boundingBox.min.y, -center.z);
            geometry.scale(1 / width, 1 / width, 1 / width);
            return geometry;
        }).catch(error => {
            geometries.delete(key);
            throw error;
        });
        geometries.set(key, request);
    }
    return geometries.get(key);
}

export const loadGeometry = url => loadSTL(url, true);
// Environment meshes preserve their authored scale, origin and floor height.
export const loadSceneGeometry = url => loadSTL(url, false);
