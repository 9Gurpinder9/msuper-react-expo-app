import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from 'react-native-paper';

export default function ThreeBackground() {
  const theme = useTheme();

  // Dark/Light configuration colors
  const primaryColor = theme.colors.primary;
  const secondaryColor = theme.colors.secondary;
  const isDark = theme.dark;

  // Embedded WebGL page containing the ThreeJS particle grid
  const htmlSource = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent;
        }
        canvas {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: auto;
        }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    </head>
    <body>
      <script>
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 8;
        camera.position.y = 4;
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(renderer.domElement);

        // Particle definitions
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const initialY = new Float32Array(particleCount);

        const rows = 25;
        const cols = 40;
        const spacingX = 0.5;
        const spacingZ = 0.5;
        const offsetX = (cols * spacingX) / 2;
        const offsetZ = (rows * spacingZ) / 2;

        let index = 0;
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x = i * spacingX - offsetX;
            const z = j * spacingZ - offsetZ;
            const y = 0;

            positions[index * 3] = x;
            positions[index * 3 + 1] = y;
            positions[index * 3 + 2] = z;

            initialY[index] = y;
            index++;
          }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create canvas for circular particle textures
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 16;
        pCanvas.height = 16;
        const ctx = pCanvas.getContext('2d');
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, '${primaryColor}');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);

        const pTexture = new THREE.CanvasTexture(pCanvas);

        const material = new THREE.PointsMaterial({
          size: 0.15,
          map: pTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        const particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);

        // Interactivity
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        window.addEventListener('mousemove', (e) => {
          mouseX = (e.clientX / window.innerWidth) - 0.5;
          mouseY = (e.clientY / window.innerHeight) - 0.5;
        });

        window.addEventListener('touchmove', (e) => {
          if (e.touches.length > 0) {
            mouseX = (e.touches[0].clientX / window.innerWidth) - 0.5;
            mouseY = (e.touches[0].clientY / window.innerHeight) - 0.5;
          }
        });

        let count = 0;
        function animate() {
          requestAnimationFrame(animate);
          count += 0.05;

          // Apply wave ripple motion
          const pos = particleSystem.geometry.attributes.position.array;
          let idx = 0;
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              const xIdx = idx * 3;
              const yIdx = idx * 3 + 1;
              const zIdx = idx * 3 + 2;

              // Wave mathematical model
              pos[yIdx] = Math.sin(i * 0.3 + count) * 0.4 + Math.cos(j * 0.3 + count) * 0.4;
              idx++;
            }
          }
          particleSystem.geometry.attributes.position.needsUpdate = true;

          // Smoothly interpolate rotations reacting to mouse movements
          targetX += (mouseX - targetX) * 0.05;
          targetY += (mouseY - targetY) * 0.05;

          particleSystem.rotation.y = targetX * 0.8;
          particleSystem.rotation.x = targetY * 0.4;

          renderer.render(scene, camera);
        }

        window.addEventListener('resize', () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlSource }}
        style={styles.webview}
        scrollEnabled={false}
        overScrollMode="never"
        pointerEvents="none"
        androidHardwareAccelerationDisabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
});
