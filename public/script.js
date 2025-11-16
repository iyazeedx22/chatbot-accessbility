const chatEl      = document.getElementById('chat');
const inputEl     = document.getElementById('prompt');
const sendBtn     = document.getElementById('send');
const toggle      = document.getElementById('toggle-dark');
const newChatBtn  = document.getElementById('new-chat');
const startBtn    = document.getElementById('start-chat');
const homeScreen  = document.getElementById('home');
const chatWrapper = document.getElementById('chat-wrapper');
const imageInput  = document.getElementById('image-input');

// تاريخ المحادثة
const conversation = [];

// نخزن الصورة المرفوعة هنا (data URL)
let attachedImage = null;

function addMessage(text, who = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  chatEl.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// تفعيل/إلغاء الوضع الداكن
toggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
});

// شاشة البداية → إظهار الشات وإخفاء الهوم
startBtn.addEventListener('click', () => {
  // أخفي الهوم تمامًا
  homeScreen.classList.add('hidden');
  homeScreen.style.display = 'none';

  // أظهر الشات
  chatWrapper.classList.remove('hidden');
  chatWrapper.style.display = 'flex';

  // رسالة ترحيب
  addMessage(
    'Hi! You can ask me anything about accessibility, or upload an image for accessibility feedback.',
    'bot'
  );

  // نرجع لأعلى الصفحة
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// رفع صورة → نخزنها كـ base64
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) {
    attachedImage = null;
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    attachedImage = reader.result; // data:image/..;base64,...
    addMessage('Image attached. I will consider it in my next answer.', 'bot');
  };
  reader.readAsDataURL(file);
});

async function sendMessage() {
  const text = inputEl.value.trim();

  // لو ما فيه نص ولا صورة لا ترسل
  if (!text && !attachedImage) return;

  if (text) {
    addMessage(text, 'user');
    conversation.push({ role: 'user', content: text });
  } else {
    // لو بس صورة بدون نص
    addMessage('[Image sent]', 'user');
    conversation.push({ role: 'user', content: '[Image sent]' });
  }

  inputEl.value = '';

  const typing = document.createElement('div');
  typing.className = 'msg bot';
  typing.textContent = '…';
  chatEl.appendChild(typing);
  typing.scrollIntoView({ behavior: 'smooth', block: 'end' });

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text,
        history: conversation,
        image: attachedImage // ممكن تكون null أو data URL
      })
    });

    const data = await res.json();
    typing.remove();

    if (data.error) {
      addMessage(`Error: ${data.error}`, 'bot');
      return;
    }

    const reply = data.output;
    addMessage(reply, 'bot');
    conversation.push({ role: 'assistant', content: reply });

  } catch (err) {
    typing.remove();
    addMessage('Error: failed to connect to server', 'bot');
    console.error(err);
  } finally {
    // بعد الإرسال نمسح الصورة المختارة
    attachedImage = null;
    imageInput.value = '';
  }
}

sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) sendMessage();
});

// New Chat → يمسح كل شيء
newChatBtn.addEventListener('click', () => {
  chatEl.innerHTML = '';
  conversation.length = 0;
  inputEl.value = '';
  attachedImage = null;
  imageInput.value = '';

  addMessage('New chat started. Ask me anything about accessibility.', 'bot');
});
