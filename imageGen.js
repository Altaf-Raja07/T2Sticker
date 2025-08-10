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

    // Step 2: Load image and create canvas
    const size = 512;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    const img = await loadImage(bgRemovedPath);

    // Step 3: Create shape-following outline
    const outlineCanvas = createCanvas(size, size);
    const outlineCtx = outlineCanvas.getContext("2d");

    // Draw the subject in solid white for outline base
    outlineCtx.drawImage(img, 0, 0, size, size);
    const imageData = outlineCtx.getImageData(0, 0, size, size);

    // Convert non-transparent pixels to white
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) { // alpha > 0 means visible pixel
        imageData.data[i] = 255;     // R
        imageData.data[i + 1] = 255; // G
        imageData.data[i + 2] = 255; // B
        imageData.data[i + 3] = 255; // A
      }
    }
    outlineCtx.putImageData(imageData, 0, 0);

    // Draw the outline slightly bigger multiple times for thickness
    ctx.imageSmoothingEnabled = true;
    const outlineSize = 10; // thickness of the border
    for (let x = -outlineSize; x <= outlineSize; x++) {
      for (let y = -outlineSize; y <= outlineSize; y++) {
        ctx.drawImage(outlineCanvas, x, y, size, size);
      }
    }

    // Step 4: Draw the original image on top
    ctx.drawImage(img, 0, 0, size, size);

    // Step 5: Add custom text safely with wrapping
const maxWidth = size - 40; // max width before wrapping
let fontSize = 38; // fixed font size for visibility
ctx.font = `bold ${fontSize}px Arial`;
ctx.fillStyle = "white";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.strokeStyle = "black";
ctx.lineWidth = 4;

// Function to split text into multiple lines
function getWrappedLines(context, text, maxWidth) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

// Get lines first
const lines = getWrappedLines(ctx, customText, maxWidth);
const linesCount = lines.length;

// Calculate starting Y so multi-line text is centered vertically near bottom
const lineHeight = fontSize + 4;
const startY = size - (linesCount * lineHeight) - 20;

// Draw each line
lines.forEach((line, i) => {
  const y = startY + i * lineHeight;
  ctx.strokeText(line, size / 2, y);
  ctx.fillText(line, size / 2, y);
});



    // Step 6: Save PNG
    const outputPath = path.join("outputs", `cool_sticker_${Date.now()}.png`);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    console.log(`✅ PNG sticker saved to: ${outputPath}`);

    // Step 7: Convert PNG → WEBP
    const webpPath = outputPath.replace(".png", ".webp");
    await sharp(outputPath)
      .webp({ lossless: true })
      .toFile(webpPath);
    console.log(`✅ WhatsApp-ready WEBP saved to: ${webpPath}`);

    return {
      png: path.join("outputs", path.basename(outputPath)),
      webp: path.join("outputs", path.basename(webpPath)),
    };
  } catch (error) {
    console.error("❌ Error creating cool sticker:", error);
  }
}




