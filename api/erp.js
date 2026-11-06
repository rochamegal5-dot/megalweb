// api/erp.js - Alias para que el front viejo que llama a /api/erp siga funcionando
// Reusa exactamente el mismo handler de postgres.js
export { default } from './postgres.js';
