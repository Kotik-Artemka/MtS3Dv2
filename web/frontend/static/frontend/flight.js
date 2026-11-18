import * as THREE from 'three';

const flightKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyC', 'ShiftLeft', 'ShiftRight']);

export function controlFlight(camera, canvas, { pick, lockChanged }) {
    const pressed = new Set();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const move = new THREE.Vector3();
    const rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    let active = true;
    let gesture;
    let locked = false;

    function reset() {
        if (camera.aspect < 1) {
            const distance = Math.max(25, 18 / camera.aspect);
            camera.position.set(2, distance * 0.57, distance);
        } else {
            camera.position.set(7.5, 14.5, 23);
        }
        camera.lookAt(0, 0.5, 0);
        rotation.setFromQuaternion(camera.quaternion, 'YXZ');
    }

    function turn(x, y) {
        rotation.y -= x * 0.003;
        rotation.x = THREE.MathUtils.clamp(rotation.x - y * 0.003, -1.47, 1.47);
        camera.quaternion.setFromEuler(rotation);
    }

    canvas.addEventListener('pointerdown', event => {
        if (!active || locked || event.button !== 0) return;
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', event => {
        if (!active) return;
        if (locked) {
            turn(event.movementX, event.movementY);
            return;
        }
        if (gesture?.id !== event.pointerId) return;
        const x = event.clientX - gesture.x;
        const y = event.clientY - gesture.y;
        gesture.distance += Math.hypot(x, y);
        gesture.x = event.clientX;
        gesture.y = event.clientY;
        if (gesture.distance > 5) turn(x, y);
    });

    canvas.addEventListener('pointerup', event => {
        if (!active || event.button !== 0) return;
        if (locked) {
            pick(0, 0);
        } else if (gesture?.id === event.pointerId && gesture.distance <= 5) {
            const bounds = canvas.getBoundingClientRect();
            pick(2 * (event.clientX - bounds.left) / bounds.width - 1,
                 1 - 2 * (event.clientY - bounds.top) / bounds.height);
        }
        gesture = undefined;
    });
    canvas.addEventListener('lostpointercapture', () => { gesture = undefined; });

    document.addEventListener('pointerlockchange', () => {
        locked = document.pointerLockElement === canvas;
        pressed.clear();
        lockChanged(locked);
    });

    window.addEventListener('keydown', event => {
        if (!active || !flightKeys.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return;
        if (!locked && event.target.closest?.('input, select, textarea, button, a, [contenteditable]')) return;
        event.preventDefault();
        pressed.add(event.code);
    });

    window.addEventListener('keyup', event => pressed.delete(event.code));
    window.addEventListener('blur', () => pressed.clear());
    document.addEventListener('focusin', event => {
        if (!locked && event.target.closest?.('input, select, textarea, button, a, [contenteditable]')) pressed.clear();
    });

    function update(delta) {
        if (!active || !pressed.size) return;
        camera.getWorldDirection(forward);
        right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        move.set(0, Number(pressed.has('Space')) - Number(pressed.has('KeyC')), 0);
        move.addScaledVector(forward, Number(pressed.has('KeyW')) - Number(pressed.has('KeyS')));
        move.addScaledVector(right, Number(pressed.has('KeyD')) - Number(pressed.has('KeyA')));
        const speed = pressed.has('ShiftLeft') || pressed.has('ShiftRight') ? 17 : 8;
        camera.position.addScaledVector(move.normalize(), delta * speed);
        camera.position.y = Math.max(0.75, camera.position.y);
    }

    return {
        reset,
        update,
        setActive(value) {
            active = value;
            pressed.clear();
            gesture = undefined;
            if (!active && document.pointerLockElement === canvas) document.exitPointerLock();
        },
        async lock() {
            if (locked) {
                document.exitPointerLock();
                return;
            }
            await canvas.requestPointerLock();
        },
        setPressed(key, value) {
            if (active && value) pressed.add(key);
            else pressed.delete(key);
        },
    };
}
