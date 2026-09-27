import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const userRaw = localStorage.getItem("white_account_user");
if (userRaw) {
  try {
    const user = JSON.parse(userRaw);
    if (user.role === 'admin') {
      document.body.classList.add('role-admin');
    }
  } catch {
    localStorage.removeItem("white_account_user");
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
