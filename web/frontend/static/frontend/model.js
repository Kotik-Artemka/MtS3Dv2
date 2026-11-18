import { STLLoader } from './vendor/jsm/loaders/STLLoader.js';

const loader = new STLLoader();
const geometries = new Map();

export function loadGeometry(url) {
    if (!geometries.has(url)) {
        const request = loader.loadAsync(url).then(geometry => {
            // STL лежит на плоскости XY, а пол сцены — на XZ.
            geometry.rotateX(-Math.PI / 2);
            geometry.computeBoundingBox();
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
            geometries.delete(url);
            throw error;
        });
        geometries.set(url, request);
    }
    return geometries.get(url);
}
