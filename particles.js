export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        const geo = new THREE.BufferGeometry();
        const count = 300;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        this.maxParticles = count;
        this.particleData = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -100;
            positions[i * 3 + 2] = 0;

            colors[i * 3] = 0;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;

            this.particleData.push({
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1,
                active: false
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(geo, mat);
        this.scene.add(this.points);
    }

    emit(pos, colorHex, count = 15, speed = 5) {
        const positions = this.points.geometry.attributes.position.array;
        const colors = this.points.geometry.attributes.color.array;
        const baseColor = new THREE.Color(colorHex);

        let emitted = 0;
        for (let i = 0; i < this.maxParticles && emitted < count; i++) {
            let p = this.particleData[i];
            if (!p.active) {
                p.active = true;
                p.life = 0;
                p.maxLife = 0.5 + Math.random() * 0.5;

                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;

                colors[i * 3] = baseColor.r;
                colors[i * 3 + 1] = baseColor.g;
                colors[i * 3 + 2] = baseColor.b;

                p.velocity.set(
                    (Math.random() - 0.5) * speed,
                    Math.random() * speed,
                    (Math.random() - 0.5) * speed
                );
                emitted++;
            }
        }
        this.points.geometry.attributes.position.needsUpdate = true;
    }

    update(delta) {
        const positions = this.points.geometry.attributes.position.array;

        for (let i = 0; i < this.maxParticles; i++) {
            let p = this.particleData[i];
            if (p.active) {
                p.life += delta;
                if (p.life >= p.maxLife) {
                    p.active = false;
                    positions[i * 3 + 1] = -100;
                } else {
                    positions[i * 3] += p.velocity.x * delta;
                    positions[i * 3 + 1] += p.velocity.y * delta;
                    positions[i * 3 + 2] += p.velocity.z * delta;
                    p.velocity.y -= 9.8 * delta; // Gravity
                }
            }
        }
        this.points.geometry.attributes.position.needsUpdate = true;
    }
}
