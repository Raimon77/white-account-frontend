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
  } catch (e) {}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
