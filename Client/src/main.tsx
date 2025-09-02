import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import VideoPage from './pages/VideoPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <div style={{padding: 12, maxWidth: 960, margin: '0 auto'}}>
        <h2><Link to="/">Video + Subtitles</Link></h2>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/v/:id" element={<VideoPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  </React.StrictMode>,
)