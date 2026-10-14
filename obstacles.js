export class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.collectibles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.2; // Seconds
    }

    update(delta, speed) {
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnWave();
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.position.z += speed * delta;
            obs.rotation.y += 1.5 * delta;

            if (obs.position.z > 15) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }

        // Update collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            let item = this.collectibles[i];
            item.position.z += speed * delta;
            item.rotation.y += 3 * delta;

            if (item.position.z > 15) {
                this.scene.remove(item);
                this.collectibles.splice(i, 1);
            }
        }
    }

    spawnWave() {
        const lanes = [-2.5, 0, 2.5];
        const chosenLane = lanes[Math.floor(Math.random() * lanes.length)];

        // 75% obstacle, 25% powerup or coin cluster
        const rand = Math.random();
        if (rand < 0.7) {
            // Neon Obstacle Block / Drone
            const geo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
            const mat = new THREE.MeshStandardMaterial({
                color: 0xff0055,
                roughness: 0.2,
                metalness: 0.8,
                emissive: 0xff0055,
                emissiveIntensity: 0.4
            });
            const obs = new THREE.Mesh(geo, mat);
            obs.position.set(chosenLane, 0.9, -70);
            obs.castShadow = true;
            this.scene.add(obs);
            this.obstacles.push(obs);
        } else {
            // Collectible Coin Arch
            lanes.forEach(lane => {
                const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 16);
                const coinMat = new THREE.MeshStandardMaterial({
                    color: 0xffd700,
                    metalness: 0.9,
                    roughness: 0.1,
                    emissive: 0xffaa00,
                    emissiveIntensity: 0.5
                });
                const coin = new THREE.Mesh(coinGeo, coinMat);
                coin.rotation.x = Math.PI / 2;
                coin.position.set(lane, 1.0, -70);
                this.scene.add(coin);
                this.collectibles.push(coin);
            });
        }
    }

    checkCollisions(playerMesh, onCoin, onObstacle) {
        const playerBox = new THREE.Box3().setFromObject(playerMesh);

        // Check collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const item = this.collectibles[i];
            const itemBox = new THREE.Box3().setFromObject(item);
            if (playerBox.intersectsBox(itemBox)) {
                this.scene.remove(item);
                this.collectibles.splice(i, 1);
                onCoin(item.position);
            }
        }

        // Check obstacles
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            const obsBox = new THREE.Box3().setFromObject(obs);
            obsBox.min.add(new THREE.Vector3(0.2, 0.2, 0.2));
            obsBox.max.sub(new THREE.Vector3(0.2, 0.2, 0.2));

            if (playerBox.intersectsBox(obsBox)) {
                onObstacle(obs.position);
            }
        }
    }

    reset() {
        this.obstacles.forEach(o => this.scene.remove(o));
        this.collectibles.forEach(c => this.scene.remove(c));
        this.obstacles = [];
        this.collectibles = [];
        this.spawnTimer = 0;
    }
}
