/* global process */

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages,
    });

    res.status(200).json({
      content: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get response' });
  }
}