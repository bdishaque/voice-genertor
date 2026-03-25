const express = require('express');
const multer = require('multer');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

fs.ensureDirSync('public');
fs.ensureDirSync('uploads');

app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

// ====================== HOME PAGE ======================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VoiceForge - Emotional TTS</title>
      <style>
        :root { --primary: #0066ff; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin:0; background:#f8f9fa; color:#333; }
        header { background: linear-gradient(135deg, #0066ff, #0044cc); color:white; padding:1rem 0; position:sticky; top:0; z-index:100; }
        nav { max-width:1100px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; padding:0 20px; }
        .logo { font-size:28px; font-weight:bold; }
        .nav-links a { color:white; margin-left:25px; text-decoration:none; font-weight:500; }
        
        .hero { text-align:center; padding:90px 20px 70px; background:white; }
        .hero h1 { font-size:48px; margin:0 0 15px; }
        .hero p { font-size:20px; color:#555; max-width:700px; margin:0 auto; }

        .container { max-width:1100px; margin:0 auto; padding:20px; }
        .card { background:white; border-radius:16px; box-shadow:0 6px 20px rgba(0,0,0,0.1); padding:40px; }
        textarea { width:100%; height:180px; padding:18px; font-size:17px; border:2px solid #ddd; border-radius:10px; resize:vertical; }
        select, button { padding:14px 24px; font-size:17px; border-radius:10px; margin:8px 5px; }
        button { background:var(--primary); color:white; border:none; font-weight:bold; cursor:pointer; transition:0.3s; }
        button:hover { background:#0052cc; transform:translateY(-3px); }
        button:disabled { background:#888; cursor:not-allowed; transform:none; }

        .loading { display:none; text-align:center; margin:25px 0; font-size:19px; color:#0066ff; }
        .spinner { display:inline-block; width:26px; height:26px; border:5px solid #f3f3f3; border-top:5px solid #0066ff; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:12px; }
        @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }

        .footer { background:#222; color:#ccc; text-align:center; padding:50px 20px; margin-top:80px; }
        .footer a { color:#aaa; text-decoration:none; }
      </style>
    </head>
    <body>

      <header>
        <nav>
          <div class="logo">VoiceForge</div>
          <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </nav>
      </header>

      <div class="hero">
        <h1>VoiceForge</h1>
        <p>Emotional Male Voices • Bangla • Hindi • English</p>
      </div>

      <div class="container">
        <div class="card">
          <form id="voiceForm" action="/generate" method="POST" enctype="multipart/form-data">
            <textarea name="text" placeholder="Type or paste your text here..." required>আজ আমি খুব খুশি! Today I am very happy! Aaj main bahut khush hoon!</textarea><br><br>
            
            <label><strong>Voice:</strong></label><br>
            <select name="voice">
              <option value="bn-BD-PradeepNeural">Pradeep - Bangla Male</option>
              <option value="bn-IN-BashkarNeural">Bashkar - Bangla Male</option>
              <option value="hi-IN-MadhurNeural">Madhur - Hindi Male (Warm)</option>
              <option value="hi-IN-ArjunNeural">Arjun - Hindi Male</option>
              <option value="en-US-GuyNeural">Guy - US Male (Expressive)</option>
              <option value="en-GB-RyanNeural">Ryan - UK Male</option>
            </select><br><br>

            <label><strong>Emotion:</strong></label><br>
            <select name="emotion">
              <option value="cheerful">Cheerful 😊</option>
              <option value="serious">Serious 😐</option>
              <option value="sad">Sad 😢</option>
            </select><br><br>
            
            <label><strong>Reference Audio (optional):</strong></label><br>
            <input type="file" name="reference" accept="audio/*"><br><br>
            
            <button type="submit" id="generateBtn" style="font-size:20px; padding:18px 50px;">🎙️ Generate Emotional Voice</button>
          </form>

          <div id="loading" class="loading">
            <span class="spinner"></span> Generating Emotional Voice... Please wait
          </div>
        </div>
      </div>

      <div class="footer">
        <p>© 2026 VoiceForge • Local TTS with Emotion Control</p>
        <p><a href="/about">About</a> • <a href="/privacy">Privacy</a> • <a href="/terms">Terms</a></p>
      </div>

      <script>
        const form = document.getElementById('voiceForm');
        const btn = document.getElementById('generateBtn');
        const loading = document.getElementById('loading');

        form.addEventListener('submit', function() {
          btn.disabled = true;
          btn.style.opacity = '0.7';
          loading.style.display = 'block';
        });
      </script>
    </body>
    </html>
  `);
});

// ====================== POST /generate (Stable - No complex SSML) ======================
app.post('/generate', upload.single('reference'), async (req, res) => {
  const text = req.body.text?.trim() || "Hello!";
  const voice = req.body.voice || 'bn-BD-PradeepNeural';
  const emotion = req.body.emotion || 'cheerful';
  const hasReference = !!req.file;

  const filename = `voice-${Date.now()}.mp3`;
  const filePath = path.join(__dirname, 'public', filename);

  // Emotion mapping (safe values that work reliably)
  let rate = 1.0, pitch = 0, volume = 100;
  if (emotion === "cheerful")  { rate = 1.15; pitch = 10; volume = 110; }
  if (emotion === "sad")       { rate = 0.85; pitch = -10; volume = 90; }
  if (emotion === "serious")   { rate = 0.95; pitch = -3; volume = 100; }

  try {
    const tts = new MsEdgeTTS();
    
    // Use prosody options directly (most stable method)
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const options = { rate, pitch: `${pitch}%`, volume: `${volume}%` };

    const { audioStream } = tts.toStream(text, options);

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log(`✅ Generated size: ${buffer.length} bytes`);

    if (buffer.length < 1000) {
      throw new Error("Audio generation failed. Try a shorter text or different voice.");
    }

    await fs.writeFile(filePath, buffer);

    res.redirect(`/speak?file=${filename}&emotion=${emotion}&voice=${encodeURIComponent(voice)}`);

  } catch (err) {
    console.error(err);
    res.send(`<h2>Error</h2><p>${err.message}</p><br><a href="/">← Try Again</a>`);
  } finally {
    if (req.file) fs.unlink(req.file.path).catch(() => {});
  }
});

// ====================== RESULT PAGE ======================
app.get('/speak', (req, res) => {
  const filename = req.query.file;
  const emotion = (req.query.emotion || 'neutral').charAt(0).toUpperCase() + (req.query.emotion || 'neutral').slice(1);
  const voiceName = req.query.voice || 'Selected Voice';

  if (!filename) return res.redirect('/');

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Voice Ready - VoiceForge</title>
      <style>
        body { font-family: Arial; text-align:center; margin:0; padding:60px 20px; background:#f8f9fa; }
        .card { max-width:700px; margin:0 auto; background:white; padding:50px; border-radius:16px; box-shadow:0 8px 30px rgba(0,0,0,0.1); }
        audio { width:100%; margin:30px 0; }
        button { background:#0066ff; color:white; border:none; padding:18px 50px; font-size:20px; border-radius:10px; cursor:pointer; }
        button:hover { background:#0052cc; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✅ Voice Ready!</h1>
        <p><strong>Emotion:</strong> ${emotion} &nbsp;&nbsp; <strong>Voice:</strong> ${voiceName}</p>
        <audio controls autoplay src="/public/${filename}"></audio>
        <br><br>
        <a href="/public/${filename}" download="${filename}">
          <button>📥 Download MP3</button>
        </a>
        <br><br><br>
        <a href="/">← Generate New Voice</a>
      </div>
    </body>
    </html>
  `);
});

// Static pages
app.get('/about', (req, res) => res.send('<h1>About VoiceForge</h1><p>Local TTS with Cheerful, Sad & Serious emotions.</p><a href="/">Back</a>'));
app.get('/privacy', (req, res) => res.send('<h1>Privacy</h1><p>All processing is local.</p><a href="/">Back</a>'));
app.get('/terms', (req, res) => res.send('<h1>Terms</h1><p>Free tool for personal use.</p><a href="/">Back</a>'));

app.listen(3000, () => {
  console.log('🚀 VoiceForge is running at http://localhost:3000');
});
