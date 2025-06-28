const API_BASE_URL = import.meta.env.PROD 
  ? 'https://gerardify-vercel-adykar6lx-erick-de-belens-projects.vercel.app/api'
  : 'http://localhost:5000/api';

export default API_BASE_URL;