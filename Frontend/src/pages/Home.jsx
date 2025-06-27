import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/Home.css';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

function Home() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get('/playlists');
        console.log('Fetched playlists:', response.data);
        setPlaylists(response.data);
      } catch (error) {
        console.error('Error fetching playlists:', error);
        setError('Failed to load playlists. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const handlePlaylistClick = (playlist) => {
    navigate(`/album/${playlist.id}`);
  };

  if (isLoading) {
    return <div className="loading">Loading playlists...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="home">
      <h1>Welcome to Gerardify</h1>
      <p>Your music streaming platform</p>

      {playlists.length > 0 ? (
        <div className="your-playlists">
          <h2>Your Playlists</h2>
          <div className="playlists-grid">
            {playlists.map(playlist => (
              <div 
                key={playlist.id} 
                className="playlist-item"
                onClick={() => handlePlaylistClick(playlist)}
              >
                <div className="playlist-cover">
                  <i className="bi bi-music-note-list"></i>
                </div>
                <h3>{playlist.name}</h3>
                <p>{playlist.songs.length} songs</p>
                <p className="playlist-artist">{playlist.artist}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-playlists">
          <p>You haven't created any playlists yet.</p>
          <button 
            className="create-playlist-btn"
            onClick={() => navigate('/library')}
          >
            Create Your First Playlist
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;