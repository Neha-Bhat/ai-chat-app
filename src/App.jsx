import { useState, useEffect, useRef } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const STORAGE_KEY = 'vsper_conversations';

function makeConversation() {
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    messages: [],
    createdAt: Date.now(),
  };
}

function titleFromMessage(text) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > 34 ? trimmed.slice(0, 34) + '…' : trimmed || 'New conversation';
}

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');

    * { box-sizing: border-box; }

    .vsper-scroll::-webkit-scrollbar { width: 8px; }
    .vsper-scroll::-webkit-scrollbar-track { background: transparent; }
    .vsper-scroll::-webkit-scrollbar-thumb {
      background: rgba(243,239,231,0.12);
      border-radius: 8px;
    }

    .vsper-sidebar-item {
      position: relative;
      transition: background 0.15s ease, padding-left 0.15s ease;
    }
    .vsper-sidebar-item:hover {
      background: rgba(243,239,231,0.05);
    }
    .vsper-sidebar-item .vsper-delete {
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .vsper-sidebar-item:hover .vsper-delete {
      opacity: 1;
    }

    .vsper-new-chat {
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    .vsper-new-chat:hover {
      color: #F3EFE7;
      border-color: rgba(227,147,106,0.6);
    }

    .vsper-send {
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .vsper-send:not(:disabled):hover {
      transform: translateY(-1px);
    }

    .vsper-textarea::placeholder {
      color: #6C6F92;
    }

    .vsper-prose p { margin: 0 0 0.75em 0; }
    .vsper-prose p:last-child { margin-bottom: 0; }
    .vsper-prose code {
      background: rgba(243,239,231,0.08);
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .vsper-prose pre {
      background: rgba(0,0,0,0.25);
      padding: 12px 14px;
      border-radius: 10px;
      overflow-x: auto;
    }
    .vsper-prose a { color: #E3936A; }
    .vsper-prose, .vsper-prose * {
      text-align: left;
    }
    .vsper-prose ul, .vsper-prose ol {
      padding-left: 1.3em;
      margin: 0 0 0.75em 0;
    }
  `}</style>
);

export default function App() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
    }
    return [makeConversation()];
  });

  const [activeId, setActiveId] = useState(() => conversations[0].id);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const activeConversation =
    conversations.find((c) => c.id === activeId) || conversations[0];
  const messages = activeConversation.messages;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversations', e);
    }
  }, [conversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeId]);

  const updateActiveMessages = (updater) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages:
                typeof updater === 'function' ? updater(c.messages) : updater,
            }
          : c
      )
    );
  };

  const setActiveTitle = (title) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, title } : c))
    );
  };

  const newChat = () => {
    const conv = makeConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setPrompt('');
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      const next = filtered.length > 0 ? filtered : [makeConversation()];
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const askAI = async () => {
    if (!prompt.trim() || loading) return;

    const userMessage = { role: 'user', content: prompt };
    const isFirstMessage = messages.length === 0;

    const conversation = [
      {
        role: 'system',
        content:
          'You are a warm, helpful AI assistant. Keep answers clear and friendly.',
      },
      ...messages,
      userMessage,
    ];

    updateActiveMessages((prev) => [...prev, userMessage]);
    if (isFirstMessage) setActiveTitle(titleFromMessage(prompt));

    setPrompt('');
    setLoading(true);

    updateActiveMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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

        updateActiveMessages((prev) => {
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

      updateActiveMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong reaching the model. Try again in a moment.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => updateActiveMessages([]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#12142B',
        color: '#F3EFE7',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        textAlign: 'left',
      }}
    >
      <GlobalStyle />

      {/* Sidebar */}
      <div
        style={{
          width: 272,
          minWidth: 272,
          background: 'linear-gradient(180deg, #14162E 0%, #191C3A 100%)',
          borderRight: '1px solid rgba(243,239,231,0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '22px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            padding: '0 10px',
            marginBottom: 26,
          }}
        >
          <span style={{ fontSize: 18, color: '#E3936A' }}>☾</span>
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '1.35rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            Vsper
          </span>
        </div>

        <button
          onClick={newChat}
          className="vsper-new-chat"
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid rgba(243,239,231,0.18)',
            background: 'transparent',
            color: '#B9BCDA',
            cursor: 'pointer',
            fontSize: 13.5,
            fontWeight: 500,
            marginBottom: 18,
            textAlign: 'left',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          + New conversation
        </button>

        <div
          className="vsper-scroll"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="vsper-sidebar-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px 10px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  borderLeft: active
                    ? '2px solid #E3936A'
                    : '2px solid transparent',
                  background: active ? 'rgba(227,147,106,0.08)' : 'transparent',
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 13.5,
                    color: active ? '#F3EFE7' : '#9497B8',
                  }}
                >
                  {c.title}
                </span>
                <button
                  onClick={(e) => deleteChat(c.id, e)}
                  className="vsper-delete"
                  title="Delete conversation"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6C6F92',
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '24px 24px 24px 64px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '2rem',
                fontWeight: 500,
                maxWidth: 480,
                lineHeight: 1.3,
                marginBottom: 10,
              }}
            >
              What's on your mind this evening?
            </div>
            <div style={{ color: '#9497B8', fontSize: 14.5, maxWidth: 380 }}>
              Ask a question, work through a problem, or just think out loud.
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="vsper-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '36px 24px 12px',
            }}
          >
            <div style={{ maxWidth: 680, marginLeft: 0 }}>
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginBottom: 22,
                    }}
                  >
                    {isUser ? (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: '14px 14px 3px 14px',
                          background: '#282259',
                          color: '#F3EFE7',
                          maxWidth: '78%',
                          fontSize: 15,
                          lineHeight: 1.6,
                          textAlign: 'left',
                        }}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 12, maxWidth: '88%' }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(227,147,106,0.15)',
                            color: '#E3936A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          ☾
                        </div>
                        <div
                          className="vsper-prose"
                          style={{
                            fontSize: 15,
                            lineHeight: 1.7,
                            color: '#E7E4DC',
                          }}
                        >
                          <ReactMarkdown>{msg.content || '…'}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div
          style={{
            borderTop: '1px solid rgba(243,239,231,0.08)',
            padding: '16px 24px 20px',
          }}
        >
          <div
            style={{
              maxWidth: 680,
              marginLeft: 0,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              background: 'rgba(243,239,231,0.04)',
              border: '1px solid rgba(243,239,231,0.1)',
              borderRadius: 14,
              padding: '10px 10px 10px 16px',
            }}
          >
            <textarea
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  askAI();
                }
              }}
              placeholder="Ask anything…"
              className="vsper-textarea"
              style={{
                flex: 1,
                background: 'transparent',
                color: '#F3EFE7',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 15,
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.5,
                maxHeight: 140,
                padding: '6px 0',
              }}
            />

            <button
              onClick={clearChat}
              title="Clear this conversation"
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: '#6C6F92',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Clear
            </button>

            <button
              onClick={askAI}
              disabled={loading || !prompt.trim()}
              className="vsper-send"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: 'none',
                background:
                  loading || !prompt.trim() ? 'rgba(227,147,106,0.25)' : '#E3936A',
                color: '#14162E',
                cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {loading ? '···' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}