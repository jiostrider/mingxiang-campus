import {defineConfig} from 'vite';

// Production is hosted under the GitHub repository path; local development stays at /.
export default defineConfig(({command})=>({base:command==='build'?'/mingxiang-campus/':'/'}));
