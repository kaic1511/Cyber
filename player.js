export class Player {
    constructor(scene, type = 'runner') {
        this.scene = scene;
        this.type = type;
        this.mesh = null;
        this.lane = 0; // -1, 0, 1
        this.targetX = 0;
        this.yVelocity = 0;
        this.isJumping = false;
        this.isDoubleJumping = false;
        this.gravity = -35;
        this.jumpForce = 14;
        this.shieldActive = false;
        this.phaseActive = false;
        this.createCharacter();
    }

    createCharacter() {
        const group = new THREE.Group();

        let primaryColor = 0x00ffff;
        let secondaryColor = 0xff00ff;
        if (this.type === 'cyborg') {
            primaryColor = 0xff5500;
            secondaryColor = 0xffff00;
        } else if (this.type === 'ninja') {
            primaryColor = 0x9900ff;
            secondaryColor = 0x00ff88;
        }

        const bodyMat = new THREE.MeshStandardMaterial({
            color: primaryColor,
            roughness: 0.2,
            metalness: 0.9,
            emissive: primaryColor,
            emissiveIntensity: 0.3
        });

        const armorMat = new THREE.MeshStandardMaterial({
            color: secondaryColor,
            roughness: 0.3,
            metalness: 0.8
        });

        const limbMat = new THREE.MeshStandardMaterial({
            color: 0x111122,
            roughness: 0.5,
            metalness: 0.9
        });

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 0.9;
        torso.castShadow = true;
        group.add(torso);

        // Chest plate
        const chestGeo = new THREE.BoxGeometry(0.5, 0.4, 0.45);
        const chest = new THREE.Mesh(chestGeo, armorMat);
        chest.position.set(0, 1.0, 0);
        group.add(chest);

        // Head / Helmet
        const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const head = new THREE.Mesh(headGeo, armorMat);
        head.position.y = 1.55;
        head.castShadow = true;
        group.add(head);

        // Visor glow
        const visorGeo = new THREE.BoxGeometry(0.3, 0.1, 0.2);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.6, -0.15);
        group.add(visor);

        // Limbs
        const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        this.leftLeg = new THREE.Mesh(legGeo, limbMat);
        this.leftLeg.position.set(-0.15, 0.35, 0);
        this.leftLeg.castShadow = true;
        group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, limbMat);
        this.rightLeg.position.set(0.15, 0.35, 0);
        this.rightLeg.castShadow = true;
        group.add(this.rightLeg);

        // Shield Mesh (hidden by default)
        const shieldGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.position.y = 1.0;
        this.shieldMesh.visible = false;
        group.add(this.shieldMesh);

        this.mesh = group;
        this.scene.add(this.mesh);
    }

    moveLeft() {
        if (this.lane > -1) {
            this.lane--;
            this.targetX = this.lane * 2.5;
        }
    }

    moveRight() {
        if (this.lane < 1) {
            this.lane++;
            this.targetX = this.lane * 2.5;
        }
    }

    jump() {
        if (!this.isJumping) {
            this.yVelocity = this.jumpForce;
            this.isJumping = true;
            return true;
        } else if (this.type === 'runner' && !this.isDoubleJumping) {
            this.yVelocity = this.jumpForce * 0.8;
            this.isDoubleJumping = true;
            return true;
        }
        return false;
    }

    update(delta) {
        // Smooth lane interpolation
        this.mesh.position.x += (this.targetX - this.mesh.position.x) * 15 * delta;

        // Jump physics
        if (this.isJumping) {
            this.mesh.position.y += this.yVelocity * delta;
            this.yVelocity += this.gravity * delta;

            if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0;
                this.isJumping = false;
                this.isDoubleJumping = false;
                this.yVelocity = 0;
            }
        }

        // Running animation
        const time = Date.now() * 0.02;
        if (!this.isJumping) {
            this.leftLeg.rotation.x = Math.sin(time) * 0.8;
            this.rightLeg.rotation.x = -Math.sin(time) * 0.8;
            this.mesh.rotation.z = Math.sin(time * 0.5) * 0.05;
        } else {
            this.leftLeg.rotation.x = 0.3;
            this.rightLeg.rotation.x = -0.3;
            this.mesh.rotation.z = 0;
        }
    }

    reset() {
        this.lane = 0;
        this.targetX = 0;
        this.mesh.position.set(0, 0, 0);
        this.isJumping = false;
        this.isDoubleJumping = false;
        this.yVelocity = 0;
    }
}
