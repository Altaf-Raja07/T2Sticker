// imageGen.js
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import sharp from "sharp";

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

import { createCanvas, loadImage } from "canvas";
import { removeBackgroundFromImageFile } from "remove.bg";

/**
 * Converts an uploaded image into a cool sticker with custom text.
 * @param {string} imagePath - Path to the uploaded image file.
 * @param {string} customText - Text to overlay on the sticker.
 * @returns {Object} - Paths for PNG & WEBP sticker.
 */
export async function imageToSticker(imagePath, customText) {
  try {
    console.log(`🖼️ Creating cool sticker from: ${imagePath}`);

    // Step 1: Remove background using remove.bg API
    console.log("🪄 Removing background...");
    const bgRemovedPath = path.join("outputs", `bg_removed_${Date.now()}.png`);
    await removeBackgroundFromImageFile({
      path: imagePath,
      apiKey: process.env.REMOVE_BG_API_KEY,
      size: "auto",
      type: "auto",
      outputFile: bgRemovedPath,
    });

    // Step 2: Load image into canvas
    const size = 512;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, size, size);
    const img = await loadImage(bgRemovedPath);

    // Draw subject
    ctx.drawImage(img, 0, 0, size, size);

    // Step 3: Add white outline
    ctx.lineWidth = 8;
    ctx.strokeStyle = "white";
    ctx.strokeRect(0, 0, size, size);

    // Step 4: Add custom text
    ctx.font = "bold 40px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeText(customText, size / 2, size - 20);
    ctx.fillText(customText, size / 2, size - 20);

    // Step 5: Save PNG
    const outputPath = path.join("outputs", `cool_sticker_${Date.now()}.png`);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    console.log(`✅ PNG sticker saved to: ${outputPath}`);

    // Step 6: Convert PNG → WEBP
    const webpPath = outputPath.replace(".png", ".webp");
    await sharp(outputPath)
      .webp({ lossless: true })
      .toFile(webpPath);
    console.log(`✅ WhatsApp-ready WEBP saved to: ${webpPath}`);

    return {
      png: path.join("outputs", path.basename(outputPath)),
      webp: path.join("outputs", path.basename(webpPath))
    };

  } catch (error) {
    console.error("❌ Error creating cool sticker:", error);
  }
}



