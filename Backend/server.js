const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS Middleware
app.use((req, res, next) => {
  console.log('Request origin:', req.headers.origin);
  console.log('Request method:', req.method);
  console.log('Request path:', req.path);
  

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight request');
    return res.status(200).end();
  }
  
  next();
});

app.use('/songs', express.static(path.join(__dirname, 'songs')));

// Check JSON body content type
app.use((req, res, next) => {
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body:', req.body);
  next();
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edebelen:MbvUtR5pgAQ2k3q0@erickdebelen.0poxbsq.mongodb.net/gerardify?retryWrites=true&w=majority';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Cloudinary Configuration
if (process.env.NODE_ENV === 'production') {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Missing Cloudinary environment variables');
  }
}

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbapmmimu2',
    api_key: process.env.CLOUDINARY_API_KEY || '819751423758252',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'kMsHsylKp56yPHHNqFx03DCUwm4',
  });
}

// Create uploads directory if it doesn't exist 
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir) && process.env.NODE_ENV !== 'production') {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gerardify-songs',
    resource_type: 'auto',
    allowed_formats: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
    public_id: (req, file) => `song-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  }
});

// Song Schema
const songSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  artist: { 
    type: String, 
    required: true,
    trim: true
  },
  duration: { 
    type: String, 
    required: true
  },
  filePath: { 
    type: String, 
    required: true
  },
  publicId: String,
  userId: { 
    type: String,  
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Song = mongoose.model('Song', songSchema);

// Playlist Schema
const playlistSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  artist: { type: String, required: true },
  year: { type: Number, default: () => new Date().getFullYear() },
  userId: { type: String, required: true }, 
  songs: [{
    _id: { type: String }, 
    title: { type: String, required: true },
    artist: { type: String, required: true },
    duration: { type: String, required: true },
    filePath: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Playlist = mongoose.model('Playlist', playlistSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'gerardify-project', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Checks if the database is connected
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Checks if the server is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'Gerardify Backend API',
    status: 'Running',
    endpoints: [
      'GET /api/health',
      'GET /api/songs', 
      'POST /api/songs',
      'GET /api/playlists',
      'POST /api/playlists',
      'GET /api/playlists/:id',
      'POST /api/auth/register',
      'POST /api/auth/login',
    ],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test', (req, res) => {
  res.json({ message: 'Test route works', body: req.body });
});

//Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Username, email, and password are required' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },  // ADD .toString()
      process.env.JWT_SECRET || 'gerardify-project',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username }, 
      process.env.JWT_SECRET || 'gerardify-project',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Song Routes
app.post('/api/songs', authenticateToken, upload.single('file'), async (req, res) => {
  console.log('=== SONG UPLOAD START ===');
  
  try {
    // Log everything for debugging
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('File:', req.file);
    console.log('User from token:', req.user);

    const { title, artist, duration } = req.body;
    
    // More detailed validation logging
    console.log('Validating fields:');
    console.log('- title:', title, 'valid:', !!title?.trim());
    console.log('- artist:', artist, 'valid:', !!artist?.trim());
    console.log('- duration:', duration, 'valid:', !!duration?.trim());
    console.log('- file:', !!req.file);
    console.log('- userId:', req.user?.userId);

    // Validate required fields
    if (!title?.trim()) {
      console.log('ERROR: Missing title');
      return res.status(400).json({ 
        success: false,
        message: 'Title is required' 
      });
    }

    if (!artist?.trim()) {
      console.log('ERROR: Missing artist');
      return res.status(400).json({ 
        success: false,
        message: 'Artist is required' 
      });
    }

    if (!duration?.trim()) {
      console.log('ERROR: Missing duration');
      return res.status(400).json({ 
        success: false,
        message: 'Duration is required' 
      });
    }

    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({ 
        success: false,
        message: 'Audio file is required' 
      });
    }

    if (!req.user?.userId) {
      console.log('ERROR: No user ID in token');
      return res.status(401).json({ 
        success: false,
        message: 'User authentication failed' 
      });
    }

    if (!req.file.path) {
      console.log('ERROR: Cloudinary upload failed - no file path');
      return res.status(500).json({
        success: false,
        message: 'File upload to cloud storage failed'
      });
    }

    const songData = {
      title: title.trim(),
      artist: artist.trim(),
      duration: duration.toString(),
      filePath: req.file.path,
      publicId: req.file.public_id || req.file.filename,
      userId: req.user.userId 
    };

    console.log('=== ATTEMPTING DATABASE SAVE ===');
    console.log('Song data to save:', songData);

    // Test database connection first
    if (mongoose.connection.readyState !== 1) {
      console.log('ERROR: Database not connected');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    // Create and save song
    const song = new Song(songData);
    
    // Validate the song object before saving
    const validationError = song.validateSync();
    if (validationError) {
      console.log('ERROR: Validation failed:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        details: Object.values(validationError.errors).map(err => err.message)
      });
    }

    console.log('Saving song to database...');
    const savedSong = await song.save();
    console.log('SUCCESS: Song saved with ID:', savedSong._id);
    
    // Return success response
    const response = {
      success: true,
      message: 'Song uploaded successfully',
      song: {
        _id: savedSong._id,
        title: savedSong.title,
        artist: savedSong.artist,
        duration: savedSong.duration,
        filePath: savedSong.filePath,
        publicId: savedSong.publicId,
        userId: savedSong.userId,
        createdAt: savedSong.createdAt
      }
    };

    console.log('=== SONG UPLOAD SUCCESS ===');
    res.status(201).json(response);

  } catch (error) {
    console.log('=== SONG UPLOAD ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);

    // Clean up uploaded file on error
    if (req.file?.public_id) {
      try {
        console.log('Cleaning up Cloudinary file:', req.file.public_id);
        await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'auto' });
        console.log('File cleanup successful');
      } catch (cleanupError) {
        console.error('File cleanup failed:', cleanupError);
      }
    }
    
    // Return detailed error information
    return res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message,
      errorType: error.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/preloaded-songs', (req, res) => {
  const backendUrl = process.env.NODE_ENV === 'production' 
    ? 'https://gerardify-vercel-backend.vercel.app' 
    : 'http://localhost:5000';
    
  const preloadedSongs = [
    {
      id: 'preload_1',
      _id: 'preload_1',
      title: 'The Days',
      artist: 'Chrystal, NOTION',
      duration: '3:53',
      filePath: `${backendUrl}/songs/days.mp3`, 
      publicId: 'preload_days',
      isPreloaded: true
    },
    {
      id: 'preload_3',
      _id: 'preload_3',
      title: 'Escapism',
      artist: 'Raye, 070 Shake',
      duration: '4:32',
      filePath: `${backendUrl}/songs/escapism.mp3`, 
      publicId: 'preload_escapism',
      isPreloaded: true
    },
    {
      id: 'preload_4',
      _id: 'preload_4',
      title: 'Feel',
      artist: 'd4vd',
      duration: '2:36',
      filePath: `${backendUrl}/songs/feel.mp3`, 
      publicId: 'preload_feel',
      isPreloaded: true
    },
    {
      id: 'preload_5',
      _id: 'preload_5',
      title: 'Lady Killers II',
      artist: 'G-eazy',
      duration: '4:57',
      filePath: `${backendUrl}/songs/lady.mp3`, 
      publicId: 'preload_lady',
      isPreloaded: true
    },
    {
      id: 'preload_6',
      _id: 'preload_6',
      title: 'Multo',
      artist: 'Cup of Joe',
      duration: '4:00',
      filePath: `${backendUrl}/songs/multo.mp3`, 
      publicId: 'preload_multo',
      isPreloaded: true
    },
    {
      id: 'preload_7',
      _id: 'preload_7',
      title: 'Night Like This',
      artist: 'The Kid Laroi',
      duration: '1:30',
      filePath: `${backendUrl}/songs/night.mp3`, 
      publicId: 'preload_night',
      isPreloaded: true
    },
    {
      id: 'preload_8',
      _id: 'preload_8',
      title: 'Sailor Song',
      artist: 'Gigi Perez',
      duration: '3:29',
      filePath: `${backendUrl}/songs/sailor.mp3`, 
      publicId: 'preload_sailor',
      isPreloaded: true
    },
    {
      id: 'preload_9',
      _id: 'preload_9',
      title: 'Sino',
      artist: 'Unique Salonga',
      duration: '4:43',
      filePath: `${backendUrl}/songs/sino.mp3`, 
      publicId: 'preload_sino',
      isPreloaded: true
    }
  ];
  
  res.json(preloadedSongs);
});

// Get song by ID
app.put('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist } = req.body;

    // Check if it's a preloaded song
    if (id.startsWith('preload_')) {
      // For preloaded songs, return success but don't persist changes
      // This allows frontend to handle temporary editing
      const updatedSong = {
        _id: id,
        id: id,
        title: title,
        artist: artist,
        duration: '3:45', 
        isPreloaded: true,
        isTemporary: true 
      };
      
      return res.json(updatedSong);
    }

    // Handle regular user songs (persist changes)
    const song = await Song.findOneAndUpdate(
      { _id: id, userId: req.user.userId }, 
      { title, artist },
      { new: true }
    );

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete song by ID
app.delete('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a preloaded song
    if (id.startsWith('preload_')) {
      // For preloaded songs, return success but don't actually delete
      // This allows frontend to handle temporary deletion
      return res.json({ 
        message: 'Song deleted successfully',
        isTemporary: true 
      });
    }
    
    const song = await Song.findOne({ _id: id, userId: req.user.userId });

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    if (process.env.NODE_ENV === 'production' && song.publicId) {
      try {
        await cloudinary.uploader.destroy(song.publicId, { resource_type: 'auto' }); 
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    await Song.findByIdAndDelete(id);
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all songs of the user
app.get('/api/songs', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching songs for user:', req.user.userId);
    
    const songs = await Song.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    console.log('Found songs:', songs.length);
    
    res.json(songs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ message: error.message });
  }
});

// Playlist Routes
app.post('/api/playlists', authenticateToken, async (req, res) => {
  try {
    const { name, artist } = req.body;
    console.log('Creating playlist with data:', { name, artist });
    
    const playlistId = Date.now();
    console.log('Generated playlist ID:', playlistId);
    
    const playlist = new Playlist({
      id: playlistId,
      name,
      artist,
      songs: [],
      userId: req.user.userId 
    });
    
    console.log('New playlist object:', playlist);
    await playlist.save();
    console.log('Saved playlist:', playlist);
    
    res.status(201).json(playlist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/playlists', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching playlists for user:', req.user.userId);
    const playlists = await Playlist.find({ userId: req.user.userId }).populate('songs');
    console.log('Found playlists:', playlists);
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching playlist with ID:', id);
    
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return res.status(400).json({ message: 'Invalid playlist ID format' });
    }

    const playlist = await Playlist.findOne({ 
      id: numericId, 
      userId: req.user.userId 
    }).populate('songs');
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.json(playlist);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, artist } = req.body;

    const playlist = await Playlist.findOneAndUpdate(
      { id: parseInt(id), userId: req.user.userId },
      { name, artist },
      { new: true }
    ).populate('songs');

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await Playlist.findOneAndDelete({ 
      id: parseInt(id), 
      userId: req.user.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add or update songs in a playlist
app.post('/api/playlists/:id/songs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;

    const playlist = await Playlist.findOne({ 
      id: parseInt(id), 
      userId: req.user.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    let songToAdd;

    // Check if it's a preloaded song
    if (songId.startsWith('preload_')) {
      // Handle preloaded songs
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://gerardify-vercel-backend.vercel.app' 
        : 'http://localhost:5000';
        
      const preloadedSongs = {
        'preload_1': { title: 'The Days', artist: 'Chrystal, NOTION', duration: '3:53', filePath: `${backendUrl}/songs/days.mp3` },
        'preload_3': { title: 'Escapism', artist: 'Raye, 070 Shake', duration: '4:32', filePath: `${backendUrl}/songs/escapism.mp3` },
        'preload_4': { title: 'Feel', artist: 'd4vd', duration: '2:36', filePath: `${backendUrl}/songs/feel.mp3` },
        'preload_5': { title: 'Lady Killers II', artist: 'G-eazy', duration: '4:57', filePath: `${backendUrl}/songs/lady.mp3` },
        'preload_6': { title: 'Multo', artist: 'Cup of Joe', duration: '4:00', filePath: `${backendUrl}/songs/multo.mp3` },
        'preload_7': { title: 'Night Like This', artist: 'The Kid Laroi', duration: '1:30', filePath: `${backendUrl}/songs/night.mp3` },
        'preload_8': { title: 'Sailor Song', artist: 'Gigi Perez', duration: '3:29', filePath: `${backendUrl}/songs/sailor.mp3` },
        'preload_9': { title: 'Sino', artist: 'Unique Salonga', duration: '4:43', filePath: `${backendUrl}/songs/sino.mp3` }
      };

      songToAdd = preloadedSongs[songId];
      if (!songToAdd) {
        return res.status(404).json({ message: 'Preloaded song not found' });
      }
      
      songToAdd._id = songId;
    } else {
      // Handle regular user songs
      const song = await Song.findOne({ 
        _id: songId, 
        userId: req.user.userId 
      });
      
      if (!song) {
        return res.status(404).json({ message: 'Song not found' });
      }
      
      songToAdd = {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        filePath: song.filePath
      };
    }

    // Check if song already exists in playlist
    if (playlist.songs.some(s => s._id.toString() === songId)) {
      return res.status(400).json({ message: 'Song already in playlist' });
    }

    playlist.songs.push(songToAdd);
    await playlist.save();
    
    const updatedPlaylist = await Playlist.findOne({ id: parseInt(id) });
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/playlists/:id/songs/:songId', authenticateToken, async (req, res) => {
  try {
    const { id, songId } = req.params;

    const playlist = await Playlist.findOne({ 
      id: parseInt(id), 
      userId: req.user.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    playlist.songs = playlist.songs.filter(song => song._id.toString() !== songId);
    await playlist.save();

    const updatedPlaylist = await Playlist.findOne({ id: parseInt(id) });
    res.json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Debug route to list all playlists
app.get('/api/debug/playlists', async (req, res) => {
  try {
    const playlists = await Playlist.find().populate('songs');
    console.log('All playlists:', playlists);
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching all playlists:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/test-config', (req, res) => {
  res.json({
    cloudinary: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbapmmimu2',
      api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set',
      cloudinary_url: process.env.CLOUDINARY_URL ? 'Set' : 'Not set'
    },
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    node_env: process.env.NODE_ENV
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Handle multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: error.message });
  }
  
  // Handle other errors
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Export for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
