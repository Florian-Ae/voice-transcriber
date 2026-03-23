const { OpenAI } = require('openai');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an assistant that structures meeting and client call transcripts.
Extract the following from the provided transcript and return strictly as JSON:
{
  "clientName": "string or null",
  "contactPerson": "string or null",
  "dateOfRecording": "string or null",
  "summary": "max 2 short sentences summarising the content",
  "followUpTasks": ["short bullet task 1", "short bullet task 2", ...]
}
If a field cannot be determined from the transcript, use null.
Keep follow-up tasks short and action-oriented.`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.status(200).json(result);
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message || 'Summarization failed' });
  }
};
