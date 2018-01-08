document.addEventListener('DOMContentLoaded', function () {
    let scene;
    let camera;
    let renderer;
    const NUM_SEGMENTS = 256;
    const options = {
        paused: false
    };
    window.options = options;
    const meshes = [];

    function initScene() {
        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight);
        camera.position.x = 300;
        camera.position.y = 100;
        camera.position.z = 500;
        camera.lookAt(0, 0, 0)
        scene = new THREE.Scene();
        window.scene = scene;

        addMeshesToScene(scene);
        addLightToScene(scene);
        const axes = new THREE.AxesHelper(200);
        scene.add(axes);

        const container = document.getElementById('container');
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);

        return {
            render: function() {
                renderer.render(scene, camera);
            },
            handleResize: function(newWidth, newHeight) {
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            }
        }

        function addLightToScene(scene) {
            const pLight = new THREE.DirectionalLight(0xffffff);
            pLight.position.set(0, 1, 1);
            scene.add(pLight);

            const hLight = new THREE.HemisphereLight();
            scene.add(hLight);
        }

        function addMeshesToScene(scene) {
            const MESH_X_SPACING = 10;
            const meshGroup = new THREE.Group();

            const colorA = new THREE.Color('blue');
            const colorB = new THREE.Color('lightgreen');
            for (var i = 0; i < NUM_SEGMENTS; i++) {
                // const geometry = new THREE.IcosahedronGeometry(4, 1);
                const geometry = new THREE.BoxGeometry(MESH_X_SPACING / 2, 20, 200, 2, 2, 2);
                // const material = new THREE.MeshBasicMaterial({
                //     color: 0xfefefe,
                //     // wireframe: true,
                //     opacity: 0.5
                // });
                const material = new THREE.MeshPhongMaterial({
                    // color: 0x00ffff,
                    color: colorA.clone().lerp(colorB, i / NUM_SEGMENTS),
                    flatShading: true,
                    vertexColors: THREE.VertexColors,
                    shininess: 0
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.x = i * MESH_X_SPACING;
                meshes.push(mesh);
                meshGroup.add(mesh);
            }
            meshGroup.translateX(- (NUM_SEGMENTS / 2) * MESH_X_SPACING); // Center the group on X axis
            scene.add(meshGroup);
        }
    }

    function animate(render, getByteTimeDomainData) {
        render();
        
        if (!options.paused) {
            const positions = getByteTimeDomainData();
    
            console.assert(positions.length === meshes.length);

            meshes.forEach(function(mesh, i) {
                mesh.position.y = positions[i] - 128; // center
                mesh.position.y *= 4; // scale
            });
        }

        window.requestAnimationFrame(animate.bind(null, render, getByteTimeDomainData));
    }

    function initAudio() {
        if (navigator.mediaDevices.getUserMedia) {
            return navigator.mediaDevices.getUserMedia({ audio: true })
                .then(connectAudioInputStream);
        } else if (navigator.getUserMedia) {
            return new Promise(function (resolve) {
                navigator.getUserMedia({ audio: true },
                    // Success callback
                    function(stream) {
                        resolve(connectAudioInputStream(stream));
                    },

                    // Error callback
                    function (err) {
                        console.log('The following gUM error occured: ' + err);
                    }
                );
            });
        } else {
            throw new Error('Unsupported browser, could not get user media.');
        }

        function connectAudioInputStream(stream) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            source.connect(analyser);
            analyser.fftSize = NUM_SEGMENTS;
            const dataArray = new Uint8Array(analyser.fftSize);

            return function getByteTimeDomainData() {
                analyser.getByteTimeDomainData(dataArray);
                return dataArray;
            }
        }
    }

    initAudio()
        .then(function(getByteTimeDomainData) {
            const { render, handleResize } = initScene();
            animate(render, getByteTimeDomainData);
     
            window.addEventListener('resize', function() {
                handleResize(window.innerWidth, window.innerHeight);
            });

            document.getElementById('pause').onclick = function() {
                options.paused = !options.paused;
            }
        });
});