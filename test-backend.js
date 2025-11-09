// Quick backend endpoint tester
const BACKEND = 'https://swayamshetkar-human-ai-backend.hf.space';
const testPayload = {
  query: 'Hello, test message',
  metadata: {
    emotion: 'neutral',
    emotionConfidence: 0.6,
    emotionSource: 'text',
    skill: 'moderate_learner'
  }
};

const routes = ['/ask_stream', '/ask', '/code_assist', '/refactor', '/train'];

async function testRoute(route) {
  try {
    const response = await fetch(`${BACKEND}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    console.log(`${route}: ${response.status} ${response.ok ? '✅' : '❌'}`);
    if (response.ok) {
      const text = await response.text();
      console.log(`  Sample: ${text.substring(0, 80)}...`);
    }
  } catch (e) {
    console.log(`${route}: ERROR - ${e.message}`);
  }
}

console.log('Testing backend routes...\n');
for (const route of routes) {
  await testRoute(route);
}
