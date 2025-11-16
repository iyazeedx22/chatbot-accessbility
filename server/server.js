// Load .env and FORCE it to override any OS-level env vars
import { config } from 'dotenv';
config({ override: true });

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;

console.log('Key prefix:', (process.env.OPENAI_API_KEY_LOCAL || '').slice(0, 12));

app.use(cors());
app.use(express.json({ limit: '10mb' })); // عشان الصور base64
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  const userPrompt = (req.body?.prompt || '').toString().slice(0, 4000);
  const history    = Array.isArray(req.body?.history) ? req.body.history : [];
  const image      = req.body?.image || null; // هنا تجينا الصورة (base64)

  try {
    const messages = [
      {
        role: 'system',
        content: `
You are an accessibility-focused assistant.

LANGUAGE RULES:
- If the user writes in ENGLISH → answer 100% in ENGLISH ONLY.
- If the user writes in ARABIC → answer in ARABIC.
- If the user mixes both, prefer the dominant language.

ACCESSIBILITY SCOPE:
- You ONLY answer questions related to accessibility (a11y, WCAG, inclusive design, screen readers, disabilities, UX access, color contrast, ARIA, alt text, captions, physical accessibility, assistive technology).
- If the question is clearly NOT related to accessibility:
   - Arabic users → reply: "أنا شات بوت متخصص في الوصولية (Accessibility) فقط. اسألني عن شيء يتعلق بالوصولية."
   - English users → reply: "I am an accessibility-focused chatbot. Please ask me something related to accessibility."
- If the question MIGHT be related to accessibility → treat it AS related and answer normally.

IMAGE RULE:
- If the user sends an image, describe it from an accessibility point of view:
  - What is visible in the image?
  - What would be a good alt text?
  - Are there any accessibility issues (e.g., low contrast, tiny text, confusing layout)?

TYPO & SPELLING:
- Understand user text even with heavy spelling mistakes (accebilty, acessbilty, etc. → accessibility).
`
      },
      ...history
    ];

    // لو فيه صورة مرفوعة نستخدم فورمات vision (input_text + input_image)
    if (image) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'input_text',
            text:
              userPrompt ||
              'Please describe this image and give accessibility-focused feedback.'
          },
          {
            type: 'input_image',
            // value زي "data:image/png;base64,...."
            image_url: image
          }
        ]
      });
    } else {
      // بدون صورة → رسالة نصية عادية
      messages.push({ role: 'user', content: userPrompt });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY_LOCAL}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // يدعم الصور
        messages,
        temperature: 0.4
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || 'No response';

    res.json({ output: reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
