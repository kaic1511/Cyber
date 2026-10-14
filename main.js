import { Player } from './player.js';
import { ObstacleManager } from './obstacles.js';
import { ParticleSystem } from './particles.js';
import { SoundManager } from './sound.js';

class Game {
    constructor() {
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.multiplier = 1.0;
        this.gameSpeed = 25; // Units per second
        this.isPlaying = false;
        this.isPaused = false;
        this.selectedChar = 'runner';
        this.abilityCooldown = 0;

        this.sound = new SoundManager();
        this.initThree();
        this.initWorld();
        this.initListeners();
        
        // Hide loader once ready
        setTimeout(() => {
            document.getElementById('loader').style.opacity = '0';
            setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
        }, 800);

        this.lastTime = performance.now();
        this.animate(this.lastTime);
    }

    initThree() {
        const container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x03030c);
        this.scene.fog = new THREE.FogExp2(0x03030c, 0.02);

        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 4, 8);
        this.camera.lookAt(0, 1.5, -5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
    }

    initWorld() {
        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0x00ffff, 1.2);
        dirLight.position.set(15, 30, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Cyber Road
        const roadGeo = new THREE.PlaneGeometry(12, 300, 30, 150);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x08081a,
            roughness: 0.7,
            metalness: 0.3
        });
        this.road = new THREE.Mesh(roadGeo, roadMat);
        this.road.rotation.x = -Math.PI / 2;
        this.road.position.set(0, 0, -100);
        this.road.receiveShadow = true;
        this.scene.add(this.road);

        // Neon Grid Lines on Road
        const lineGeo = new THREE.PlaneGeometry(0.15, 300);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        [-2.5, 2.5].forEach(x => {
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x, 0.02, -100);
            this.scene.add(line);
        });

        // City Skyscrapers in Background
        this.buildings = [];
        const bGeo = new THREE.BoxGeometry(6, 40, 6);
        for (let i = 0; i < 30; i++) {
            const bMat = new THREE.MeshStandardMaterial({
                color: 0x050515,
                roughness: 0.5,
                metalness: 0.8,
                emissive: i % 2 === 0 ? 0x002233 : 0x220033,
                emissiveIntensity: 0.3
            });
            const building = new THREE.Mesh(bGeo, bMat);
            const side = i % 2 === 0 ? -1 : 1;
            building.position.set(side * (12 + Math.random() * 15), 20, -i * 20);
            this.scene.add(building);
            this.buildings.push(building);
        }

        // Initialize Systems
        this.particles = new ParticleSystem(this.scene);
        this.player = new Player(this.scene, this.selectedChar);
        this.obstacleManager = new ObstacleManager(this.scene);
    }

    initListeners() {
        // Character Selection
        document.querySelectorAll('.char-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                const targetCard = e.currentTarget;
                targetCard.classList.add('selected');
                this.selectedChar = targetCard.dataset.char;
                this.scene.remove(this.player.mesh);
                this.player = new Player(this.scene, this.selectedChar);
            });
        });

        // Start & Restart buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());

        document.getElementById('pause-icon-btn').addEventListener('click', () => this.pauseGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('quit-btn').addEventListener('click', () => this.quitGame());

        // On-screen touch controls
        document.getElementById('btn-left').addEventListener('click', () => {
            if (this.isPlaying && !this.isPaused) this.player.moveLeft();
        });
        document.getElementById('btn-right').addEventListener('click', () => {
            if (this.isPlaying && !this.isPaused) this.player.moveRight();
        });
        document.getElementById('btn-jump').addEventListener('click', () => {
            if (this.isPlaying && !this.isPaused) {
                if (this.player.jump()) this.sound.playJump();
            }
        });
        document.getElementById('btn-ability').addEventListener('click', () => {
            if (this.isPlaying && !this.isPaused && this.abilityCooldown <= 0) {
                this.triggerAbility();
            }
        });

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (!this.isPlaying || this.isPaused) return;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.player.moveLeft();
            if (e.key === 'ArrowRight' || e.key === 'd') this.player.moveRight();
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
                if (this.player.jump()) this.sound.playJump();
            }
            if (e.key === 'e' && this.abilityCooldown <= 0) this.triggerAbility();
        });

        // Touch Swipe support
        let startX = 0, startY = 0;
        window.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchend', e => {
            if (!this.isPlaying || this.isPaused) return;
            let diffX = e.changedTouches[0].clientX - startX;
            let diffY = e.changedTouches[0].clientY - startY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 40) this.player.moveRight();
                else if (diffX < -40) this.player.moveLeft();
            } else {
                if (diffY < -40) {
                    if (this.player.jump()) this.sound.playJump();
                }
            }
        }, { passive: true });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    startGame() {
        this.sound.init();
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('pause-icon-btn').classList.remove('hidden');
        document.getElementById('touch-controls').classList.remove('hidden');

        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.multiplier = 1.0;
        this.gameSpeed = 28;
        this.abilityCooldown = 0;

        this.player.reset();
        this.obstacleManager.reset();
        this.isPlaying = true;
        this.isPaused = false;
    }

    pauseGame() {
        this.isPaused = true;
        document.getElementById('pause-screen').classList.remove('hidden');
    }

    resumeGame() {
        this.isPaused = false;
        document.getElementById('pause-screen').classList.add('hidden');
    }

    quitGame() {
        this.isPaused = false;
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('pause-icon-btn').classList.add('hidden');
        document.getElementById('touch-controls').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        this.isPlaying = false;
    }

    triggerAbility() {
        this.sound.playAbility();
        this.abilityCooldown = 15; // 15 second cooldown
        this.particles.emit(this.player.mesh.position, 0xff00ff, 30, 8);
        // Temporary invincibility or score boost
        this.multiplier = 3.0;
        setTimeout(() => { this.multiplier = 1.0; }, 5000);
    }

    gameOver() {
        this.sound.playCrash();
        this.particles.emit(this.player.mesh.position, 0xff0055, 50, 10);
        this.isPlaying = false;
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('pause-icon-btn').classList.add('hidden');
        document.getElementById('touch-controls').classList.add('hidden');

        document.getElementById('final-score').innerText = Math.floor(this.score);
        document.getElementById('final-coins').innerText = this.coins;
        document.getElementById('final-distance').innerText = Math.floor(this.distance) + 'm';
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    animate(currentTime) {
        requestAnimationFrame((t) => this.animate(t));

        const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        if (this.isPlaying && !this.isPaused) {
            // Update stats
            this.distance += this.gameSpeed * delta;
            this.score += this.gameSpeed * delta * this.multiplier;
            this.gameSpeed += delta * 0.2; // Gradual speed acceleration

            if (this.abilityCooldown > 0) {
                this.abilityCooldown -= delta;
                let pct = (this.abilityCooldown / 15) * 100;
                document.getElementById('ability-bar').style.transform = `scaleY(${pct / 100})`;
            }

            document.getElementById('score-val').innerText = Math.floor(this.score);
            document.getElementById('coins-val').innerText = this.coins;
            document.getElementById('mult-val').innerText = 'x' + this.multiplier.toFixed(1);

            // Update entities
            this.player.update(delta);
            this.obstacleManager.update(delta, this.gameSpeed);
            this.particles.update(delta);

            // Loop background buildings
            this.buildings.forEach(b => {
                b.position.z += this.gameSpeed * delta;
                if (b.position.z > 20) b.position.z -= 600;
            });

            // Collision checks
            this.obstacleManager.checkCollisions(
                this.player.mesh,
                (pos) => {
                    this.coins++;
                    this.sound.playCoin();
                    this.particles.emit(pos, 0xffd700, 15, 4);
                },
                (pos) => {
                    this.gameOver();
                }
            );
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => {
    new Game();
});
