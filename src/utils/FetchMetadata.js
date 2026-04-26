// src/utils/FetchMetadata.js (VERSI UPGRADE + KEYWORDS + LOGGING + BETTER HEADERS)
import axios from "axios";
import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

/**
 * Mengambil metadata lengkap: title, description, keywords, bodyText, dan IMAGE (og:image + fallback favicon)
 * Dengan logging untuk memahami sumber data
 */
export const fetchMetadata = async (url) => {
  console.log(`\n🔍 Fetching metadata dari: ${url}`);

  try {
    // HEADER YANG DITINGKATKAN (Ini satu-satunya perubahan)
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        "Referer": "https://www.google.com/",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Ekstrak og:image dulu
    let image = $('meta[property="og:image"]').attr("content") || $('meta[property="og:image:secure_url"]').attr("content") || null;
    if (image) {
      if (image.startsWith("//")) image = "https:" + image;
      else if (image.startsWith("/")) {
        const urlObj = new URL(url);
        image = urlObj.origin + image;
      }
    }

    // Ekstrak keywords
    let keywords = $('meta[name="keywords"]').attr("content") || "";
    keywords = keywords.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

    console.log(`📋 Meta Keywords ditemukan: ${keywords || "(kosong)"}`);

    // Prioritas 1: Article extractor
    try {
      console.log("🤖 Mencoba Article Extractor...");
      const article = await extract(html);

      if (article && article.title) {
        console.log("✅ BERHASIL menggunakan ARTICLE EXTRACTOR");

        let bodyText = "";
        if (article.content) {
          const content$ = cheerio.load(article.content);
          bodyText = content$.text().replace(/\s+/g, " ").trim();
        }

        if (bodyText.length > 3000) {
          bodyText = bodyText.substring(0, 3000) + "... [truncated]";
        }

        // Fallback favicon
        if (!image) {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace(/^www\./, "");
          image = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
        }

        console.log(`📌 Title       : ${article.title}`);
        console.log(`📌 Description : ${article.description || article.excerpt || "(kosong)"}`);
        console.log(`📌 Body Text   : ${bodyText ? "Ada (" + bodyText.length + " karakter)" : "(kosong)"}`);

        return {
          title: article.title.trim() || "No Title Found",
          description: (article.description || article.excerpt || "No Description Found").trim(),
          keywords: keywords || "",
          bodyText: bodyText || "No Body Text Found",
          image: image,
        };
      }
    } catch (extractError) {
      console.warn("⚠️ Article extractor gagal, fallback ke cheerio:", extractError.message);
    }

    // ==================== FALLBACK 2: Cheerio Manual ====================
    console.log("🔄 Menggunakan fallback Cheerio manual...");

    let title = $("title").text().trim();
    if (!title) title = $('meta[property="og:title"]').attr("content") || "No Title Found";

    let description = $('meta[name="description"]').attr("content") || "";
    if (!description) description = $('meta[property="og:description"]').attr("content") || "";

    if (!description) {
      const firstP = $("p").first().text().trim();
      if (firstP.length > 50) {
        description = firstP.substring(0, 200);
        console.log("📌 Description diambil dari paragraf pertama");
      }
    }

    // Body Text fallback
    $("script, style, noscript, header, footer, nav, aside").remove();
    let bodyText = $("body").text().replace(/\s+/g, " ").trim();
    if (bodyText.length > 3000) {
      bodyText = bodyText.substring(0, 3000) + "... [truncated]";
    }

    // Fallback favicon
    if (!image) {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");
      image = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    }

    console.log(`📌 Title       : ${title}`);
    console.log(`📌 Description : ${description || "(kosong)"}`);
    console.log(`📌 Body Text   : ${bodyText ? "Ada (" + bodyText.length + " karakter)" : "(kosong)"}`);

    return {
      title: title || "No Title Found",
      description: description || "No Description Found",
      keywords: keywords || "",
      bodyText: bodyText || "No Body Text Found",
      image: image,
    };

  } catch (error) {
    console.warn(`❌ Gagal mengambil metadata dari ${url}:`, error.message);

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");
      return {
        title: "Error Fetching - Check URL",
        description: "Error Fetching - Check URL",
        keywords: "",
        bodyText: "Error Fetching - Check URL",
        image: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      };
    } catch {
      return {
        title: "Error Fetching - Check URL",
        description: "Error Fetching - Check URL",
        keywords: "",
        bodyText: "Error Fetching - Check URL",
        image: null,
      };
    }
  }
};