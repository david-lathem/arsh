const UserConversation = require("../../models/UserConversation");

const OpenAI = require("openai").default;
module.exports = async (client, message) => {
  try {
    // Only respond to DMs and ignore bots
    if (!message.guild && !message.author.bot) {
      const userId = message.author.id;
      const content = message.content;

      // Fetch or create conversation for this user
      let convo = await UserConversation.findOne({ userId });
      if (!convo) {
        convo = await UserConversation.create({ userId });
      }

      // Append user's message
      convo.messages.push({ role: "user", content });

      // Limit conversation history to last 20 messages to save tokens
      const history = convo.messages.slice(-20).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // OpenAI Client
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Call OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `
You are a highly intelligent, helpful assistant specialized in assisting users with daily tasks.
Your capabilities include:
• Summarizing texts or conversations
• Rewriting messages or emails in different tones
• Drafting professional emails or messages
• Providing suggestions or ideas for work, study, or personal tasks
• Acting as a general assistant for anything the user asks

Always:
• Keep context from previous messages in this conversation
• Be concise, clear, and professional when required
• Maintain the user's preferred tone if specified
• Avoid repeating instructions

Use the conversation history to provide personalized responses and help the user efficiently.
    `.trim(),
          },
          ...history,
        ],
      });

      const reply = response.choices[0].message.content;

      // Save assistant's response
      convo.messages.push({ role: "assistant", content: reply });
      await convo.save();

      // Reply to user
      await message.channel.send(reply);
    }
  } catch (err) {
    console.error("❌ DM AI Error:", err);
  }
};
