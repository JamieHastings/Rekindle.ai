// src/admin/index.tsx
import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp';
import './styles.css';

const root = document.getElementById('root-admin');
if (root) createRoot(root).render(<AdminApp />);
