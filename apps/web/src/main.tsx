import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './globals.css'

if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'dev') {
  const link = document.querySelector("link[rel~='icon']");
  //if (link) (link as HTMLLinkElement).href = '/favicon-dev.svg';
  const prefix = window.location.hostname === 'localhost' ? '(local)' : '(dev)'
  document.title = `${prefix} ${document.title}`;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
