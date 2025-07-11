import React, { useState, useRef, useEffect } from 'react';
import '../styles/components/MusicPlayer.css';

function MusicPlayer({ currentSong, isPlaying, setIsPlaying, playlist, setCurrentSong }) {
  const audioRef = useRef(new Audio());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);

  // Handle Volume Change
  useEffect(() => {
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    document.documentElement.style.setProperty('--progress', `${progressPercent}%`);
    
    document.documentElement.style.setProperty('--volume', `${volume * 100}%`);
  }, [currentTime, duration, volume]);

  // Manage Progress Bar and Time
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  const handleSkipForward = () => {
    console.log('Skip forward clicked');
    console.log('Current playlist:', playlist);
    console.log('Current song:', currentSong);
    console.log('Shuffle enabled:', isShuffleOn);
    
    if (!playlist?.length || !currentSong) {
      console.log('No playlist or current song available');
      return;
    }
    
    let nextSong;
    
    if (isShuffleOn) {
      const availableSongs = playlist.filter(song => 
        song.id !== currentSong.id && song._id !== currentSong.id
      );
      
      if (availableSongs.length === 0) {
        nextSong = playlist[0];
      } else {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        nextSong = availableSongs[randomIndex];
      }
      
      console.log('Shuffle: Selected random song:', nextSong);
    } else {
      const currentIndex = playlist.findIndex(song => 
        song.id === currentSong.id || 
        song._id === currentSong.id || 
        song.id === currentSong._id
      );
      console.log('Normal: Current index:', currentIndex);
      
      if (currentIndex > -1) {
        const nextIndex = (currentIndex + 1) % playlist.length;
        console.log('Normal: Next index:', nextIndex);
        nextSong = playlist[nextIndex];
      }
    }
    
    if (nextSong) {
      setCurrentSong({
        id: nextSong.id || nextSong._id,
        title: nextSong.title,
        artist: nextSong.artist,
        duration: nextSong.duration,
        url: nextSong.url
      });
      setIsPlaying(true);
    }
  };
  
  const handleSkipBackward = () => {
    if (!playlist?.length || !currentSong) return;
    
    const currentIndex = playlist.findIndex(song => 
      song.id === currentSong.id || 
      song._id === currentSong.id || 
      song.id === currentSong._id
    );
    
    if (currentIndex > -1) {
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      const prevSong = playlist[prevIndex];
      setCurrentSong({
        id: prevSong.id || prevSong._id,
        title: prevSong.title,
        artist: prevSong.artist,
        duration: prevSong.duration,
        url: prevSong.url
      });
      setIsPlaying(true);
    }
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
    console.log('Shuffle toggled:', !isShuffleOn);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleProgressChange = (e) => {
    const newTime = (e.target.value / 100) * duration;
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;
  };

  useEffect(() => {
    if (currentSong) {
      console.log('Loading song:', currentSong); 
      audioRef.current.src = currentSong.url;
      setIsPlaying(true);
      audioRef.current.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentSong]);

  useEffect(() => {
    if (currentSong) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error("Error playing audio:", error);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleSongEnd = () => {
      console.log('Song ended, auto-playing next song');
      console.log('Shuffle enabled:', isShuffleOn);
      
      if (!playlist?.length || !currentSong) {
        console.log('No playlist or current song available for auto-play');
        return;
      }
      
      let nextSong;
      
      if (isShuffleOn) {
        const availableSongs = playlist.filter(song => 
          song.id !== currentSong.id && song._id !== currentSong.id
        );
        
        if (availableSongs.length === 0) {
          nextSong = playlist[0];
        } else {
          const randomIndex = Math.floor(Math.random() * availableSongs.length);
          nextSong = availableSongs[randomIndex];
        }
        
        console.log('Auto-play Shuffle: Selected random song:', nextSong);
      } else {
        const currentIndex = playlist.findIndex(song => 
          song.id === currentSong.id || 
          song._id === currentSong.id || 
          song.id === currentSong._id
        );
        console.log('Auto-play Normal: Current index:', currentIndex);
        
        if (currentIndex > -1) {
          const nextIndex = (currentIndex + 1) % playlist.length;
          console.log('Auto-play Normal: Next index:', nextIndex);
          nextSong = playlist[nextIndex];
        }
      }
      
      if (nextSong) {
        setCurrentSong({
          id: nextSong.id || nextSong._id,
          title: nextSong.title,
          artist: nextSong.artist,
          duration: nextSong.duration,
          url: nextSong.url
        });
        setIsPlaying(true);
        console.log('Auto-playing next song:', nextSong.title);
      }
    };

    audio.addEventListener('ended', handleSongEnd);

    return () => {
      audio.removeEventListener('ended', handleSongEnd);
    };
  }, [playlist, currentSong, isShuffleOn, setCurrentSong, setIsPlaying]);

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume);
      audioRef.current.volume = prevVolume;
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  return (
    <div className="music-player">
      {/* Left section */}
      <div className="left-section">
        {currentSong ? (
          <div className="song-info">
            <span className="song-title">{currentSong.title}</span>
            <span className="song-artist">{currentSong.artist}</span>
          </div>
        ) : (
          <div className="song-info">
            <span className="song-title">No song playing</span>
          </div>
        )}
      </div>

      {/* Middle section */}
      <div className="middle-section">
        <div className="player-controls">
          {/* Shuffle button on far left */}
          <button 
            className={`control-button ${isShuffleOn ? 'active' : ''}`} 
            onClick={toggleShuffle}
            title={isShuffleOn ? 'Shuffle On' : 'Shuffle Off'}
          >
            <i className="bi bi-shuffle"></i>
          </button>
          
          {/* Previous, Play, Next grouped together */}
          <button className="control-button" onClick={handleSkipBackward}>
            <i className="bi bi-skip-start-fill"></i>
          </button>
          
          <button className="control-button play" onClick={togglePlay}>
            <i className={`bi ${isPlaying ? 'bi-pause-circle-fill' : 'bi-play-circle-fill'}`}></i>
          </button>
          
          <button className="control-button" onClick={handleSkipForward}>
            <i className="bi bi-skip-end-fill"></i>
          </button>
        </div>
        <div className="progress-wrapper">
          <div className="time-info">
            <span>{formatTime(currentTime)}</span>
            <span> / </span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={(currentTime / duration) * 100 || 0}
            onChange={handleProgressChange}
            className="progress-bar"
          />
        </div>
      </div>

      {/* Right section - Volume Controls */}
      <div className="right-section">
        <div className="volume-controls">
          <button className="control-button" onClick={toggleMute}>
            <i className={`bi ${volume === 0 ? 'bi-volume-mute-fill' : 
              volume < 0.3 ? 'bi-volume-off-fill' :
              volume < 0.7 ? 'bi-volume-down-fill' : 
              'bi-volume-up-fill'}`}>
            </i>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>  
    </div>
  );
}

export default MusicPlayer;