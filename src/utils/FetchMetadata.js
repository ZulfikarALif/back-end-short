// src/utils/FetchMetadata.js (VERSI UPGRADE)
import axios from "axios";
import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

/**
 * Mengambil metadata lengkap: title, description, bodyText, dan IMAGE (og:image + fallback favicon)
 */
export const fetchMetadata = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Ekstrak og:image dulu
    let image = $('meta[property="og:image"]').attr("content") || $('meta[property="og:image:secure_url"]').attr("content") || null;
    if (image) {
      // Pastikan absolute URL
      if (image.startsWith("//")) image = "https:" + image;
      else if (image.startsWith("/")) {
        const urlObj = new URL(url);
        image = urlObj.origin + image;
      }
    }

    // Prioritas 1: Article extractor
    try {
      const article = await extract(html);

      if (article && article.title) {
        let bodyText = "";
        if (article.content) {
          const content$ = cheerio.load(article.content);
          bodyText = content$.text().replace(/\s+/g, " ").trim();
        }

        if (bodyText.length > 3000) {
          bodyText = bodyText.substring(0, 3000) + "... [truncated]";
        }

        // Fallback favicon kalau og:image gak ada
        if (!image) {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace(/^www\./, "");
          image = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
        }

        return {
          title: article.title.trim() || "No Title Found",
          description: (article.description || article.excerpt || "No Description Found").trim(),
          bodyText: bodyText || "No Body Text Found",
          image: image, // ← BARU: og:image atau favicon
        };
      }
    } catch (extractError) {
      console.warn("Article extractor gagal, fallback ke cheerio:", extractError.message);
    }

    // Fallback 2: Cheerio manual
    let title = $("title").text().trim();
    if (!title) title = $('meta[property="og:title"]').attr("content") || "No Title Found";

    let description = $('meta[name="description"]').attr("content") || "";
    if (!description) description = $('meta[property="og:description"]').attr("content") || "";
    if (!description) {
      const firstP = $("p").first().text().trim();
      if (firstP.length > 50) description = firstP.substring(0, 200);
    }

    $("script, style, noscript, header, footer, nav, aside").remove();
    let bodyText = $("body").text().replace(/\s+/g, " ").trim();
    if (bodyText.length > 3000) {
      bodyText = bodyText.substring(0, 3000) + "... [truncated]";
    }

    // Fallback favicon kalau og:image masih kosong
    if (!image) {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");
      image = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    }

    return {
      title: title || "No Title Found",
      description: description || "No Description Found",
      bodyText: bodyText || "No Body Text Found",
      image: image, // ← Pasti ada gambar sekarang!
    };
  } catch (error) {
    console.warn(`Gagal mengambil metadata dari ${url}:`, error.message);
    // Bahkan saat error, kasih favicon dari domain
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");
      return {
        title: "Error Fetching - Check URL",
        description: "Error Fetching - Check URL",
        bodyText: "Error Fetching - Check URL",
        image: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      };
    } catch {
      return {
        title: "Error Fetching - Check URL",
        description: "Error Fetching - Check URL",
        bodyText: "Error Fetching - Check URL",
        image: null,
      };
    }
  }
};