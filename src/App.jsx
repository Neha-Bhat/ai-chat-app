import { useState } from 'react';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const stream = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        stream: true
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        setResponse(prev => prev+text)
      }

      // setResponse(stream.choices[0].message.content || '');
    } catch (err) {
      console.error(err);
      setResponse('Error calling AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'Arial' }}>
      <h1>My First AI App</h1>

      <textarea
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask anything..."
        style={{ width: '100%', padding: 12 }}
      />

      <br />
      <br />

      <button onClick={askAI} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask AI'}
      </button>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          whiteSpace: 'pre-wrap',
        }}
      >
        {response}
      </div>
    </div>
  );
}