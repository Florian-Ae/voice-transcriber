const { OpenAI } = require('openai');
const formidable = require('formidable');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports.config = {
  api: { bodyParser: false },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ uploadDir: os.tmpdir(), keepExtensions: true });

  let audioPath = null;

  try {
    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file received' });
    }

    // Ensure the temp file has a supported extension for Whisper
    const originalName = audioFile.originalFilename || 'recording.webm';
    const ext = path.extname(originalName) || '.webm';
    audioPath = audioFile.filepath + ext;
    fs.renameSync(audioFile.filepath, audioPath);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
    });

    res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  } finally {
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
};
