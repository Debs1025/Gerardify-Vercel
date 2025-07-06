import { useState, useEffect } from 'react'
import './styles/App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import MusicPlayer from './components/MusicPlayer'
import Album from './pages/Album'
import Song from './pages/Song'
import Login from './authentication/Login';

function App() {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState([]); 
  const [songs, setSongs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentSong(null);
    setIsPlaying(false);
    setPlaylists([]);
    setCurrentPlaylist([]);
    setSongs([]);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <BrowserRouter>
        <div className="main-content">
          <Navbar user={user} onLogout={handleLogout} />
          <div className="content-area">
            <Routes>
              <Route path="/" element={<Home playlists={playlists} />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={
                <Library 
                  setCurrentSong={setCurrentSong}
                  playlists={playlists}
                  setPlaylists={setPlaylists}
                  setCurrentPlaylist={setCurrentPlaylist} 
                  songs={songs}  
                  setSongs={setSongs}  
                  setIsPlaying={setIsPlaying}
                />} 
              />
              <Route path="/album/:id" element={
                <Album 
                  setCurrentSong={setCurrentSong} 
                  currentSong={currentSong}
                  setIsPlaying={setIsPlaying}
                  playlists={playlists}
                  setPlaylists={setPlaylists}
                  setCurrentPlaylist={setCurrentPlaylist} 
                  songs={songs}
                />
              } />
              <Route path="/song" element={
                <Song 
                  setCurrentSong={setCurrentSong}
                  setIsPlaying={setIsPlaying}
                  songs={songs}
                  setSongs={setSongs}
                />
              } />
            </Routes>
          </div>
        </div>
        <MusicPlayer 
          currentSong={currentSong}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playlist={currentPlaylist} 
          setCurrentSong={setCurrentSong}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;