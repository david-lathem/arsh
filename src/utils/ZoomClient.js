const Zoom = require("@h3mul/zoom-api").default;
const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const zoom = Zoom({
  account_id: process.env.ZOOM_ACCOUNT_ID,
  client_id: process.env.ZOOM_CLIENT_ID,
  client_secret: process.env.ZOOM_CLIENT_SECRET,
});

function chunkString(str, maxLength = 4000) {
  const chunks = [];
  let start = 0;
  while (start < str.length) {
    chunks.push(str.slice(start, start + maxLength));
    start += maxLength;
  }
  return chunks;
}

const cleanTranscript = (str) => {
  return str
    .split("\n")
    .filter((line) => line.trim() !== "")
    .filter((line, idx) => idx !== 0) // remove "WEBVTT"
    .filter((line) => Number.isNaN(Number(line.trim()))) // remove lines with only numbers
    .join("\n");
};

async function startMeetingJob(client) {
  cron.schedule("10 20 * * *", async () => {
    try {
      console.log("Creating Meeting");

      const meeting = await zoom.createMeeting({
        topic: "Your Muscle Shop",
        type: 1,
      });

      const message = `@everyone Join the weekly meeting of Your Muscle Shop to discuss our weekly progress and other stuff. [Hop In](${meeting.join_url})`;

      const channel = client.channels.cache.get(process.env.MEETING_CHANNEL_ID);

      await channel.send(message);

      console.log(meeting);

      let attempts = 0;
      const maxAttempts = 180; //  3hrs max

      const interval = setInterval(async () => {
        try {
          attempts++;

          if (attempts > maxAttempts) {
            clearInterval(interval);
            console.log("Transcript not ready after max attempts");
            return;
          }

          const recordings = await zoom.getMeetingRecordings(meeting.id);

          console.log(recordings);

          const file = recordings.recording_files.find(
            (r) => r.file_type === "TRANSCRIPT" && r.status === "completed"
          );

          if (!file) return console.log("File not found transcript");

          clearInterval(interval);

          const res = await fetch(file.download_url, {
            headers: {
              Authorization: `Bearer ${recordings.download_access_token}`,
            },
          });

          const arrayBuffer = await res.arrayBuffer();

          // Convert ArrayBuffer → Node Buffer
          const str = Buffer.from(arrayBuffer).toString();

          console.log(`Before transcript length ${str.length}`);
          //   const cleaned = cleanTranscript(str);
          const cleaned = cleanTranscript(str);

          console.log(`After: ${cleaned.length}`);

          // Optionally truncate for GPT-4.1-mini input to ~1M tokens
          // Rough estimate: 1 token ≈ 4 chars => 1M tokens ≈ 4M chars
          const maxGPTInputChars = 3_000_000;
          const truncated = cleaned.slice(0, maxGPTInputChars);

          const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "user",
                content: `You are an expert meeting analyst. Summarize the following transcript for a gym, fitness, and supplement brand team meeting. Produce a clear, structured, easy-to-read summary.

STRICT FORMAT:

### 1. High-Level Overview (3–4 lines)
Provide a short, clear summary describing the main purpose of the meeting and the main topics discussed.

### 2. Participant Breakdown
For each person who spoke:
- Mention their name (or "Participant X" if missing)
- Summarize what they discussed
- Capture ideas, concerns, updates, or suggestions they shared

### 3. Key Fitness & Training Insights
List any important points related to:
- Gym training methods
- Workout plans
- Diet/supplement strategies
- Customer behavior or fitness challenges
- Product usage in training

### 4. Brand & Business Topics
Highlight anything about:
- Product sales or performance
- Marketing ideas (reels, ads, content)
- Customer support feedback
- Operations, fulfillment, inventory
- Team communication, coordination, workflow issues

### 5. Action Items / Decisions
List all decisions, instructions, next steps, and responsibilities mentioned.

### 6. Opportunities & Recommendations (AI-generated)
Based on the transcript, offer 3–5 improvement suggestions for:
- Team workflow
- Product presentation
- Customer experience
- Community engagement
- Training-based content ideas

Keep everything clean, professional, concise, and well-formatted.

TRANSCRIPT BELOW:
${truncated}`,
              },
            ],
          });

          const summary = summaryResponse.choices[0].message.content;

          const chunks = chunkString(summary, 4000);

          for (const chunk of chunks) {
            const embed = new EmbedBuilder()
              .setDescription(chunk)
              .setTitle("🐛 Meeting Summary ");
            await channel.send({ embeds: [embed] });
          }
        } catch (err) {
          console.log(err);

          console.error(err.response?.statusCode);
          console.error(err.response?.body);
        }
      }, 1000 * 60);
    } catch (err) {
      console.log(err);

      console.error(err.response?.statusCode);
      console.error(err.response?.body);
    }
  });
}

module.exports = startMeetingJob;
