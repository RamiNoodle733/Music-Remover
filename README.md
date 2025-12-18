# VidFlow - Video Player with Music Reduction

A premium, YouTube-like video player that runs entirely in the browser. Upload your own videos and reduce background music using Web Audio API processing.

🌐 **[Live Demo on GitHub Pages](https://raminoodle733.github.io/Music-Remover/)**

## Features

### 🎬 Video Playback
- **Premium Watch Experience**: YouTube-inspired layout with large player, theater mode, and fullscreen
- **Custom Controls**: Play/pause, seek, volume, playback speed, and more
- **Keyboard Shortcuts**: Space (play/pause), arrows (seek/volume), M (mute), F (fullscreen), T (theater)
- **Mobile Optimized**: Responsive design works great on phones and tablets

### 🎵 Music Reduction
- **Speech Focus Preset**: Enhances voice clarity by reducing bass and treble
- **Music Soften Preset**: Reduces background music while preserving dialogue
- **Strength Slider**: Adjust the intensity of audio processing
- **A/B Comparison**: Instantly toggle between original and processed audio

### 📥 Export Options
- **Download Original**: Save the unmodified video file
- **Export Processed Audio (WAV)**: Download the music-reduced audio track
- **Export Processed Video (MP4)**: Re-encode video with processed audio (uses ffmpeg.wasm)

### 🎨 Design
- **Premium Dark Theme**: Professional, media-focused aesthetic
- **Light Mode**: Toggle for daytime viewing
- **Smooth Animations**: Orchestrated page transitions and micro-interactions
- **Custom Typography**: Space Grotesk + Outfit font pairing
- **Accessibility**: ARIA labels, focus states, reduced motion support

## Quick Start

### Run Locally

1. Clone the repository:
```bash
git clone https://github.com/RamiNoodle733/Music-Remover.git
cd Music-Remover
```

2. Start a local server:
```bash
# Using Python
python -m http.server 8080

# Or using Node.js
npx serve

# Or using PHP
php -S localhost:8080
```

3. Open `http://localhost:8080` in your browser

### Deploy to GitHub Pages

1. Go to your repository Settings → Pages
2. Set Source to "Deploy from a branch"
3. Select `main` branch and `/ (root)` folder
4. Click Save

Your site will be available at `https://[username].github.io/Music-Remover/`

## Usage

### Upload a Video
1. Click the upload zone or drag & drop a video file
2. Supported formats: MP4, WebM, OGG
3. Large files (>500MB) will show a warning but still work

### Paste a Video URL
1. Enter a direct video URL (must end in .mp4, .webm, or .ogg)
2. **Note**: Only direct file URLs work. YouTube and other streaming URLs are not supported.
3. If CORS blocks the URL, try downloading the file and uploading instead.

### Reduce Background Music
1. Play your video
2. Click the Settings ⚙️ button
3. Select "Speech Focus" or "Music Soften" preset
4. Adjust the strength slider as needed
5. Use the A/B toggle to compare with original

### Export Processed Video
1. Apply your desired audio preset
2. Click Download → Export Processed Audio (WAV) for quick export
3. Or choose Export Processed Video (MP4) for full re-encode
4. **Note**: Video export requires ffmpeg.wasm which is lazy-loaded (~31MB)

## Technical Details

### Architecture
- **Pure HTML/CSS/JS**: No build step required
- **ES Modules**: Modern JavaScript module system
- **Hash Routing**: SPA navigation compatible with GitHub Pages
- **Web Audio API**: Real-time audio processing
- **ffmpeg.wasm**: Browser-based video encoding

### Audio Processing Pipeline
The music reduction uses a chain of Web Audio API nodes:
1. **Low Shelf Filter**: Reduces bass frequencies (< 200Hz)
2. **High Shelf Filter**: Reduces treble frequencies (> 4kHz)
3. **Peaking Filter**: Boosts speech clarity range (1.5-2.5kHz)
4. **Dynamics Compressor**: Reduces dynamic range

### Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome for Android

### Known Limitations
- **Not Perfect Separation**: This is best-effort processing, not AI source separation
- **URL CORS**: External video URLs may be blocked by CORS
- **Video Export**: Requires SharedArrayBuffer (needs HTTPS with proper headers)
- **Large Files**: Very large videos may cause memory issues

## Optional: True Source Separation Backend

For real AI-powered music removal, you can run an optional Python backend with Demucs:

### Server Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
pip install flask flask-cors demucs torch
```

3. Run the server:
```bash
python app.py
```

4. The server will be available at `http://localhost:5000`

### API Endpoint
```
POST /api/separate
Content-Type: multipart/form-data

Body: videoFile (file)

Response: {
  "vocalUrl": "/outputs/vocals.wav",
  "otherUrl": "/outputs/other.wav", 
  "recombinedUrl": "/outputs/recombined.mp4"
}
```

## Project Structure

```
/
├── index.html          # Main HTML file
├── styles.css          # All styles with CSS variables
├── app.js              # Application entry point
├── modules/
│   ├── router.js       # Hash-based SPA routing
│   ├── player.js       # Custom video player
│   ├── thumbnails.js   # Thumbnail generation
│   ├── audiofx.js      # Web Audio processing
│   ├── export.js       # WAV/MP4 export
│   └── ui.js           # UI utilities
├── assets/
│   ├── icons/          # SVG icons
│   └── fonts/          # WOFF2 font files
├── server/             # Optional Python backend
│   ├── app.py
│   └── requirements.txt
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - Video encoding in browser
- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) - Display font
- [Outfit](https://fonts.google.com/specimen/Outfit) - Body font

---

**⚠️ Disclaimer**: This tool is for processing your own videos only. Do not use it to extract or process copyrighted content from YouTube or other platforms.