const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs-extra');

async function generateVoice(text, outputFile = 'output.mp3', voice = 'en-US-EmmaNeural', refFile = null) {
  console.log(`🎙️ Generating voice with ${voice}${refFile ? ' (with reference style)' : ''}...`);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  // Simple cloning simulation using SSML
  let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">`;
  
  if (refFile && fs.existsSync(refFile)) {
    // Light style adjustment based on reference (you can tune these numbers)
    ssml += `<prosody rate="1.08" pitch="+8st" volume="+10%">`;
    console.log(`   → Applying light cloning style from: ${refFile}`);
  }

  ssml += text;
  if (refFile && fs.existsSync(refFile)) ssml += `</prosody>`;
  ssml += `</speak>`;

  try {
    const { audioStream } = tts.toStream(ssml);
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    await fs.writeFile(outputFile, audioBuffer);
    console.log(`✅ Voice saved: ${outputFile}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// CLI usage
const text = process.argv[2] || "Hello! This is my voice with simple cloning style applied.";
const output = process.argv[3] || 'output.mp3';
const voice = process.argv[4] || 'en-US-EmmaNeural';
const ref = process.argv[5];   // optional: path to reference audio file

generateVoice(text, output, voice, ref);
