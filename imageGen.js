// imageGen.js
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateImage(prompt) {
  try {
    console.log(`🎨 Generating image (OpenAI) for: "${prompt}"...`);

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      size: "1024x1024", // OpenAI supported size
      background: "transparent"
    });

    const imageUrl = result.data[0].url;
    const outputPath = path.join("outputs", `sticker_${Date.now()}.png`);
    const imageData = await fetch(imageUrl).then(res => res.arrayBuffer());
    fs.writeFileSync(outputPath, Buffer.from(imageData));

    console.log(`✅ Image saved to: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.warn("⚠️ OpenAI failed. Falling back to Hugging Face...", error.message);
    return await generateImageHuggingFace(prompt);
  }
}

// Hugging Face fallback
async function generateImageHuggingFace(prompt) {
  try {
    const API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${await response.text()}`);
    }

    const buffer = await response.arrayBuffer();
    const outputPath = path.join("outputs", `hf_sticker_${Date.now()}.png`);
    fs.writeFileSync(outputPath, Buffer.from(buffer));

    console.log(`✅ Hugging Face image saved to: ${outputPath}`);
    return outputPath;

  } catch (err) {
    console.error("❌ Hugging Face generation failed:", err);
  }
}
