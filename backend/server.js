require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { Groq } = require('groq-sdk');
const axios = require('axios');
const { toolDefinitions, executeTool } = require('./tools');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'kSc1ZpU3lU6hmLdJjQm6';

// Model to use — qwen3-32b has best tool-calling reliability on Groq
const MODEL = 'qwen/qwen3-32b';

// Basic heartbeat to check if Kyrax is online
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', groqConnected: !!process.env.GROQ_API_KEY });
});

// System prompt — very strict to prevent hallucinated tools and multi-calls
const getSystemPrompt = () => `You are Kyrax, a helpful AI assistant on a Windows PC. Be concise.
Current time: ${new Date().toLocaleString('en-IN')}

TOOL RULES (follow strictly):
1. You ONLY have these tools: open_website, open_application, close_application, close_specific_tab, set_volume, get_system_info, send_whatsapp_message, spotify_control, list_directory, manage_files.
2. NEVER invent or call any tool not in the list above. If you cannot do something with these tools, just say so in text.
3. Call ONLY ONE tool per user request unless the request explicitly asks for multiple separate actions.
4. For "open YouTube and search X": call open_website ONCE with https://www.youtube.com/results?search_query=X (URL-encoded). Do NOT also open youtube.com separately.
5. For "open Chrome and search X" or "search X on Google": call open_website ONCE with https://www.google.com/search?q=X.
6. For "open YouTube" (no search): call open_website ONCE with https://www.youtube.com.
7. For "open [app]" (not a website): call open_application with the app name.
8. For "close [app]": call close_application.
9. For "close [website] tab" (e.g. "close YouTube"): call close_specific_tab with the target_phrase (e.g. "YouTube"). Do NOT call close_application for websites/tabs.
10. For volume controls (e.g., "set volume to 30", "half volume", "mute"): call set_volume.
11. To check laptop/PC specs, configuration, RAM, CPU, or OS: call get_system_info.
12. For ANY Spotify request: call spotify_control. Use action="open" to just open Spotify, action="search" with a query to search, action="play" with a query to play a song/artist/playlist. NEVER use open_website or open_application for Spotify.
13. For directory questions: call list_directory.
14. For file/folder creation: call manage_files.
15. For WhatsApp: call send_whatsapp_message.
16. For normal questions (no action needed): just answer in text. Do NOT call any tool.
17. After a tool executes and returns a result, summarize what happened in 1-2 short sentences. Do NOT call additional tools unless asked.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    console.log(`\n[Kyrax] Received: "${message}"`);

    let messages = [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: message }
    ];

    let replyText = 'Done.';
    let maxRounds = 3; // Strict limit to prevent infinite loops

    while (maxRounds > 0) {
      maxRounds--;

      let chatCompletion;
      try {
        chatCompletion = await groq.chat.completions.create({
          messages,
          model: MODEL,
          tools: toolDefinitions,
          tool_choice: 'auto',
          parallel_tool_calls: false,
          max_tokens: 1024,
        });
      } catch (apiErr) {
        // Groq returns 400 when LLM hallucinates a tool — catch and reply gracefully
        console.error(`[Kyrax] Groq API error:`, apiErr.message);
        if (apiErr.status === 400 && apiErr.message.includes('tool_use_failed')) {
          replyText = 'I tried to use an unsupported action. Let me just answer directly.';
          // Retry WITHOUT tools so we get a plain text answer
          try {
            const fallback = await groq.chat.completions.create({
              messages: [
                { role: 'system', content: 'You are Kyrax, a helpful AI assistant. Answer concisely.' },
                { role: 'user', content: message }
              ],
              model: MODEL,
              max_tokens: 1024,
            });
            replyText = fallback.choices[0]?.message?.content || replyText;
          } catch (_) {}
          break;
        }
        throw apiErr; // Re-throw non-tool errors
      }

      const responseMessage = chatCompletion.choices[0]?.message;
      if (!responseMessage) break;

      messages.push(responseMessage);

      // If the LLM wants to call tools
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          let toolResult;
          try {
            const fnName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`[Kyrax Tool] ${fnName}(${JSON.stringify(args)})`);
            toolResult = await executeTool(fnName, args);
            console.log(`[Kyrax Tool] Result: ${toolResult}`);
          } catch (e) {
            toolResult = `Error: ${e.message}`;
            console.error(`[Kyrax Tool] Error:`, e.message);
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: String(toolResult)
          });
        }
        // Continue loop so LLM can read the tool results and produce a text reply
      } else {
        // Plain text reply — we're done
        replyText = responseMessage.content || 'Done.';
        break;
      }
    }

    console.log(`[Kyrax] Reply: "${replyText?.substring(0, 120)}..."`);

    // ── Text to Speech via ElevenLabs ──
    let audioBase64 = null;
    if (ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID) {
      try {
        const ttsResponse = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
          {
            text: replyText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          },
          {
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg'
            },
            responseType: 'arraybuffer'
          }
        );
        audioBase64 = Buffer.from(ttsResponse.data, 'binary').toString('base64');
        console.log('[Kyrax] TTS generated.');
      } catch (err) {
        console.error('[Kyrax] TTS error:', err.response?.status, err.response?.data?.toString?.() || err.message);
      }
    }

    res.json({ text: replyText, audioBase64 });

  } catch (error) {
    console.error('[Kyrax] Internal Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`[Kyrax Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Kyrax Backend] Model: ${MODEL}`);
  console.log(`[Kyrax Backend] Tools: ${toolDefinitions.map(t => t.function.name).join(', ')}`);
});
