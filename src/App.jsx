import { useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function App() {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!prompt.trim() || loading) return;

    const userMessage = { role: 'user', content: prompt };

    // Create conversation locally (avoids stale state issues)
    const conversation = [
      {
        role: 'system',
        content:
          'You are a warm, helpful AI assistant. Keep answers clear and friendly.',
      },
      ...messages,
      userMessage,
    ];

    // Show user message immediately
    setMessages((prev) => [...prev, userMessage]);

    setPrompt('');
    setLoading(true);

    // Add empty assistant message
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '' },
    ]);

    let aiContent = '';

    try {
      const stream = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: conversation,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';

        aiContent += text;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: aiContent,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error(err);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '❌ Error calling OpenAI API',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div
      style={{
        minHeight: '85vh',
        background: '#0f172a',
        color: '#e2e8f0',
        padding: '24px',
        fontFamily: 'monospace, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div style={{ maxWidth: 1300, minWidth: 600 }}>
        <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'start', alignItems: 'center'}}>
          <img src="/logo.svg" alt="Vsper" width="40" height="40" style={{marginBottom: '24px'}} />
          <h6
          style={{
            textAlign: 'center',
            fontSize: '1.5rem',
            marginBottom: '24px',
            marginTop: '-20px'
          }}
        >
          Vsper
        </h6>
        </div>

        {/* Messages */}
        <div
          style={{
            maxHeight: '65vh',
            overflowY: 'auto',
            width: '70vw',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent:
                  msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background:
                    msg.role === 'user' ? '#011541' : '#111827',
                  border: '1px solid #334155',
                  maxWidth: '100%',
                  color: 'white',
                }}
              >
                <div
                  style={{
                    fontWeight: 'bold',
                    marginBottom: 8,
                    color:
                      msg.role === 'user' ? '#dbeafe' : '#86efac',
                      textAlign: 'left'
                  }}
                >
                  {msg.role === 'user' ? 'You' : 'Vsper'}
                </div>

                <div
                  style={{
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    textAlign: 'left'
                  }}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input box */}
        <div
          style={{
            background: '#111827',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 16
          }}
        >
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askAI();
              }
            }}
            placeholder="Ask anything..."
            style={{
              width: '100%',
              background: 'transparent',
              color: '#e2e8f0',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontSize: 16,
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              marginTop: 12,
            }}
          >
            <button
              onClick={clearChat}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #475569',
                background: '#1e293b',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              Clear Chat
            </button>

            <button
              onClick={askAI}
              disabled={loading || !prompt.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: loading ? '#475569' : '#2563eb',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Thinking…' : 'Ask AI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}