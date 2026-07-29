Model used: gpt-4.1-mini
Made API call to client.chat.completions.create({
    model: //modelName,
    messages: [{ role: 'user', content: prompt }]
})
Simple QnA is supported, no history retained.
/////
Added streaming option, set stream: true
When a chunk is received, it is appended to the existing response