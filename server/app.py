"""
VidFlow - Optional Backend Server for True Source Separation
Uses Demucs for AI-powered vocal/music separation

This is OPTIONAL and not required for the basic GitHub Pages deployment.
Run this locally for higher quality music removal.
"""

import os
import uuid
import subprocess
import logging
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = Path('./uploads')
OUTPUT_FOLDER = Path('./outputs')
ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov', 'wav', 'mp3'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Create directories
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['OUTPUT_FOLDER'] = str(OUTPUT_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_audio(video_path, audio_path):
    """Extract audio from video file using ffmpeg"""
    cmd = [
        'ffmpeg', '-i', str(video_path),
        '-vn', '-acodec', 'pcm_s16le',
        '-ar', '44100', '-ac', '2',
        '-y', str(audio_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"FFmpeg audio extraction failed: {result.stderr}")
    return audio_path


def separate_audio(audio_path, output_dir):
    """Use Demucs to separate vocals from other sounds"""
    cmd = [
        'demucs', '--two-stems', 'vocals',
        '-o', str(output_dir),
        str(audio_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Demucs separation failed: {result.stderr}")
    
    # Find the output files
    model_name = 'htdemucs'  # Default model
    stem_dir = output_dir / model_name / audio_path.stem
    
    vocals_path = stem_dir / 'vocals.wav'
    other_path = stem_dir / 'no_vocals.wav'
    
    return vocals_path, other_path


def recombine_video(video_path, audio_path, output_path):
    """Replace video audio with processed audio"""
    cmd = [
        'ffmpeg', '-i', str(video_path),
        '-i', str(audio_path),
        '-c:v', 'copy', '-c:a', 'aac',
        '-map', '0:v:0', '-map', '1:a:0',
        '-shortest',
        '-y', str(output_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"FFmpeg recombine failed: {result.stderr}")
    return output_path


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'VidFlow Separation Server',
        'demucs_available': subprocess.run(['which', 'demucs'], capture_output=True).returncode == 0
    })


@app.route('/api/separate', methods=['POST'])
def separate_video():
    """
    Main endpoint for audio separation
    
    POST /api/separate
    Content-Type: multipart/form-data
    Body: videoFile (file)
    
    Returns:
    {
        "success": true,
        "vocalUrl": "/outputs/<id>/vocals.wav",
        "otherUrl": "/outputs/<id>/other.wav",
        "recombinedUrl": "/outputs/<id>/recombined.mp4"
    }
    """
    # Check if file is present
    if 'videoFile' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['videoFile']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())[:8]
    job_dir = OUTPUT_FOLDER / job_id
    job_dir.mkdir(exist_ok=True)
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        video_path = job_dir / filename
        file.save(str(video_path))
        logger.info(f"Saved video: {video_path}")
        
        # Extract audio
        audio_path = job_dir / 'audio.wav'
        extract_audio(video_path, audio_path)
        logger.info(f"Extracted audio: {audio_path}")
        
        # Separate with Demucs
        vocals_path, other_path = separate_audio(audio_path, job_dir)
        logger.info(f"Separation complete: vocals={vocals_path}, other={other_path}")
        
        # Copy outputs to job directory with cleaner names
        final_vocals = job_dir / 'vocals.wav'
        final_other = job_dir / 'no_music.wav'
        
        if vocals_path.exists():
            subprocess.run(['cp', str(vocals_path), str(final_vocals)])
        if other_path.exists():
            subprocess.run(['cp', str(other_path), str(final_other)])
        
        # Recombine with vocals-only audio (music removed)
        recombined_path = job_dir / 'recombined.mp4'
        recombine_video(video_path, final_vocals, recombined_path)
        logger.info(f"Recombined video: {recombined_path}")
        
        # Return URLs
        return jsonify({
            'success': True,
            'jobId': job_id,
            'vocalUrl': f'/outputs/{job_id}/vocals.wav',
            'otherUrl': f'/outputs/{job_id}/no_music.wav',
            'recombinedUrl': f'/outputs/{job_id}/recombined.mp4'
        })
        
    except Exception as e:
        logger.error(f"Separation failed: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


@app.route('/outputs/<job_id>/<filename>')
def serve_output(job_id, filename):
    """Serve processed files"""
    return send_from_directory(
        str(OUTPUT_FOLDER / job_id),
        filename
    )


@app.route('/api/cleanup/<job_id>', methods=['DELETE'])
def cleanup_job(job_id):
    """Clean up files for a specific job"""
    job_dir = OUTPUT_FOLDER / job_id
    if job_dir.exists():
        import shutil
        shutil.rmtree(str(job_dir))
        return jsonify({'success': True, 'message': f'Cleaned up job {job_id}'})
    return jsonify({'error': 'Job not found'}), 404


if __name__ == '__main__':
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║  VidFlow - Source Separation Server                       ║
    ║                                                           ║
    ║  This server provides AI-powered music removal using      ║
    ║  Demucs. It's optional - the web app works without it.    ║
    ║                                                           ║
    ║  API Endpoints:                                           ║
    ║  - GET  /api/health     - Check server status             ║
    ║  - POST /api/separate   - Upload and process video        ║
    ║  - GET  /outputs/<id>/* - Download processed files        ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(host='0.0.0.0', port=5000, debug=True)
