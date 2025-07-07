import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/Library.css';

const createAuthenticatedApi = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token found in localStorage');
    window.location.href = '/';
    return null;
  }
  
  console.log('Token found:', token.substring(0, 20) + '...');
  
  return axios.create({
    baseURL: 'https://gerardify-vercel-backend.vercel.app/api',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    timeout: 30000
  });
};

function Library({ setCurrentSong, playlists, setPlaylists, setCurrentPlaylist, setIsPlaying, songs, setSongs }) {  
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSongForm, setShowSongForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newSongData, setNewSongData] = useState({
    title: '',
    artist: '',
    file: null,
    tempUrl: ''
  });

  const handleCreatePlaylist = async (e) => { 
    e.preventDefault();
    if (newPlaylistName.trim()) {
      try {
        const api = createAuthenticatedApi();
        const response = await api.post('/playlists', {
          name: newPlaylistName,
          artist: 'Your Playlist'
        });

        const newPlaylist = response.data;
        setPlaylists(prevPlaylists => [...prevPlaylists, newPlaylist]);
        setNewPlaylistName('');
        setShowCreateForm(false);
      } catch (error) {
        console.error('Error creating playlist:', error);
        alert('Failed to create playlist. Please try again.');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('File is too large. Please select a file smaller than 50MB.');
        return;
      }
        
      const url = URL.createObjectURL(file);
      setNewSongData({
        ...newSongData,
        file: file,
        tempUrl: url,
        title: file.name.replace(/\.[^/.]+$/, "")
      });
      setShowSongForm(true);
    }
  };

  const compressAudio = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio(URL.createObjectURL(file));
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(file);
      });
      
      audio.addEventListener('error', () => {
        alert('Error loading audio file. Please try a different file.');
        resolve(null);
      });
    });
  };

  const handleSongFormSubmit = async (e) => {
  e.preventDefault();
  
  if (!newSongData.file || !newSongData.title.trim() || !newSongData.artist.trim()) {
    alert('Please fill in all required fields');
    return;
  }

  console.log('Starting upload...');
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in again');
      window.location.href = '/';
      return;
    }

    // Validate token format
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        alert('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
      }
    } catch (tokenError) {
      console.error('Invalid token format:', tokenError);
      alert('Invalid session. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
      return;
    }

    let duration = '0:00'; 
    
    try {
      const audio = new Audio(newSongData.tempUrl);
      
      duration = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Audio loading timeout'));
        }, 5000);

        audio.addEventListener('loadedmetadata', () => {
          clearTimeout(timeoutId);
          const durationSeconds = Math.floor(audio.duration);
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          resolve(formatted);
        });
        
        audio.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          console.warn('Could not get audio duration:', e);
          resolve('0:00');
        });
      });
    } catch (durationError) {
      console.warn('Duration calculation failed:', durationError);
      duration = '0:00'; 
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', newSongData.file);
    formData.append('title', newSongData.title.trim());
    formData.append('artist', newSongData.artist.trim());
    formData.append('duration', duration);

    console.log('Uploading:', {
      title: newSongData.title.trim(),
      artist: newSongData.artist.trim(),
      duration: duration,
      fileSize: newSongData.file.size,
      fileName: newSongData.file.name
    });

    // Upload to backend
    const response = await fetch('https://gerardify-vercel-backend.vercel.app/api/songs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('Response status:', response.status);
    
    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error('Invalid response from server');
    }
    
    console.log('Response data:', result);

    if (!response.ok) {
      throw new Error(result.message || `Server error: ${response.status}`);
    }

    if (result.success && result.song) {
      const newSong = {
        id: result.song._id,
        title: result.song.title,
        artist: result.song.artist,
        duration: result.song.duration,
        url: result.song.filePath
      };

      console.log('New song created:', newSong);

      // Update songs state
      setSongs(prevSongs => [...prevSongs, newSong]);
      setCurrentPlaylist(prevPlaylist => [...prevPlaylist, newSong]);
      
      alert('Song uploaded successfully! 🎉');
      
      // Reset form
      setNewSongData({
        title: '',
        artist: '',
        file: null,
        tempUrl: ''
      });
      setShowSongForm(false);
    } else {
      throw new Error('Invalid response format from server');
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      alert('Session expired. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    } else {
      alert(`Upload failed: ${error.message}`);
    }
  }
};

  useEffect(() => {
    const api = createAuthenticatedApi();
    
    // Fetch songs
    api.get('/songs')
      .then(response => {
        console.log('Fetched songs from API:', response.data);
        const formattedSongs = response.data.map(song => ({
          id: song._id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          url: song.filePath 
        }));
        setSongs(formattedSongs);
        console.log('Formatted songs:', formattedSongs);
      })
      .catch(error => {
        console.error('Error fetching songs:', error);
      });

    // Fetch playlists
    api.get('/playlists')
      .then(response => {
        setPlaylists(response.data);
      })
      .catch(error => {
        console.error('Error fetching playlists:', error);
      });
  }, [setSongs, setPlaylists]);

  const handlePlaylistClick = (playlist) => {
    navigate(`/album/${playlist.id}`);
  };

  const handleSongClick = (song) => {
    navigate('/song', { state: { song } });
  };

  const handlePlayClick = (e, song) => {
    e.stopPropagation(); 
    console.log('Playing song:', song);
    setCurrentSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      url: song.url 
    });
    setCurrentPlaylist(songs);
    setIsPlaying(true);
  };
  
  return (
    <div className="library-container">
      <div className="library-header">
        <h1>Your Library</h1>
        <div className="library-header-buttons">
          <button 
            className="library-create-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <i className="bi bi-plus-lg"></i>
          </button>
          <label className="library-upload-btn">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <i className="bi bi-upload"></i>
          </label>
        </div>
      </div>

      {showCreateForm && (
        <div className="library-form">
          <form onSubmit={handleCreatePlaylist}>
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
            />
            <div className="library-form-buttons">
              <button type="submit">Create</button>
              <button type="button" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showSongForm && (
        <div className="library-form">
          <form onSubmit={handleSongFormSubmit}>
            <div className="library-form-group">
              <label>Title:</label>
              <input
                type="text"
                value={newSongData.title}
                onChange={(e) => setNewSongData({...newSongData, title: e.target.value})}
                placeholder="Enter song title"
                required
              />
            </div>
            <div className="library-form-group">
              <label>Artist:</label>
              <input
                type="text"
                value={newSongData.artist}
                onChange={(e) => setNewSongData({...newSongData, artist: e.target.value})}
                placeholder="Enter artist name"
                required
              />
            </div>
            <div className="library-form-group">
              <label>Selected File:</label>
              <div className="library-selected-file">{newSongData.file?.name}</div>
            </div>
            <div className="library-form-buttons">
              <button type="submit">Add Song</button>
              <button type="button" onClick={() => {
                setShowSongForm(false);
                setNewSongData({
                  title: '',
                  artist: '',
                  file: null,
                  tempUrl: ''
                });
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="library-playlists-grid">
        {playlists.map(playlist => (
          <div 
            key={playlist.id} 
            className="library-playlist-item"
            onClick={() => handlePlaylistClick(playlist)}
          >
            <h3>{playlist.name}</h3>
            <p>{playlist.songs.length} songs</p>
          </div>
        ))}
      </div>

      <div className="library-songs-section">
        <h2>All Songs</h2>
        <div className="library-songs-content">
          {songs.length === 0 ? (
            <div className="library-empty-message">
              <p>No songs available</p>
              <label className="library-upload-btn-large">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <i className="bi bi-cloud-upload"></i>
                <span>Upload Songs</span>
              </label>
            </div>
          ) : (
            <div className="library-songs-list">
              {songs.map((song, index) => (
                <div 
                  className="library-song-item" 
                  key={song.id} 
                  onClick={() => handleSongClick(song)}
                >
                  <div className="library-song-number-container">
                    <span className="library-song-number">{index + 1}</span>
                    <button 
                      className="library-play-button"
                      onClick={(e) => handlePlayClick(e, song)}
                    >
                      <i className="bi bi-play-fill"></i>
                    </button>
                  </div>
                  <div className="library-song-info">
                    <span className="library-song-title">{song.title}</span>
                    <span className="library-song-artist">{song.artist}</span>
                  </div>
                  <span className="library-song-duration">{song.duration}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Library;