// Monorepo bridge: Expo AppEntry resolves ../../App from hoisted node_modules
// Re-export the actual app from the frontend workspace
import App from './frontend/App';
export default App;
