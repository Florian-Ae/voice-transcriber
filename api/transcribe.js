const { OpenAI } = require('openai');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tmpPath = null;

  try {
    const { audio, mimeType } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    const buffer = Buffer.from(audio, 'base64');
    const ext = mimeType?.includes('ogg') ? '.ogg' : mimeType?.includes('mp4') ? '.mp4' : '.webm';
    tmpPath = path.join(os.tmpdir(), `recording_${Date.now()}${ext}`);
    fs.writeFileSync(tmpPath, buffer);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-1',
    });

    res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
};
