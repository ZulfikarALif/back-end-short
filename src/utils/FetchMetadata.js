// src/utils/FetchMetadata.js
import axios from "axios";
import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

export const fetchMetadata = async (url) => {
  console.log(`\n🔍 Fetching metadata dari: ${url}`);

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        Referer: "https://www.google.com/",
      },
    });

    return await processHTML(response.data, url);

  } catch (error) {
    console.warn("❌ Axios gagal, mencoba Puppeteer:", error.message);

    let browser;

    try {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({ headless: true });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      );

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 20000,
      });

      const html = await page.content();
      console.log("✅ Berhasil ambil HTML via Puppeteer");

      return await processHTML(html, url);

    } catch (puppeteerError) {
      console.warn("❌ Puppeteer juga gagal:", puppeteerError.message);

      return getErrorFallback(url);

    } finally {
      if (browser) await browser.close();
    }
  }
};

// ================== HELPER FUNCTION ==================

const processHTML = async (html, url) => {
  const $ = cheerio.load(html);

  // IMAGE
  let image =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[property="og:image:secure_url"]').attr("content") ||
    null;

  if (image) {
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) {
      const urlObj = new URL(url);
      image = urlObj.origin + image;
    }
  }

  // KEYWORDS
  let keywords = $('meta[name="keywords"]').attr("content") || "";
  keywords = keywords.replace(/,/g, " ").replace(/\s+/g, " ").trim();

  console.log(`📋 Meta Keywords: ${keywords || "(kosong)"}`);

  // ===== ARTICLE EXTRACTOR =====
  try {
    console.log("🤖 Article Extractor...");
    const article = await extract(html);

    if (article && article.title) {
      let bodyText = "";

      if (article.content) {
        const content$ = cheerio.load(article.content);
        bodyText = content$.text().replace(/\s+/g, " ").trim();
      }

      if (bodyText.length > 3000) {
        bodyText = bodyText.substring(0, 3000) + "...";
      }

      if (!image) {
        const domain = new URL(url).hostname.replace(/^www\./, "");
        image = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
      }

      return {
        title: article.title || "No Title",
        description: article.description || article.excerpt || "",
        keywords,
        bodyText,
        image,
      };
    }
  } catch {
    console.warn("⚠️ Extractor gagal → fallback cheerio");
  }

  // ===== CHEERIO FALLBACK =====
  let title =
    $("title").text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    "No Title";

  let description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  $("script, style, noscript").remove();

  let bodyText = $("body").text().replace(/\s+/g, " ").trim();

  if (bodyText.length > 3000) {
    bodyText = bodyText.substring(0, 3000) + "...";
  }

  if (!image) {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    image = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  }

  return {
    title,
    description,
    keywords,
    bodyText,
    image,
  };
};

// ===== ERROR FALLBACK =====
const getErrorFallback = (url) => {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return {
      title: "Error Fetching",
      description: "Tidak dapat mengambil konten",
      keywords: "",
      bodyText: "Error Fetching",
      image: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    };
  } catch {
    return {
      title: "Error Fetching",
      description: "Tidak dapat mengambil konten",
      keywords: "",
      bodyText: "Error Fetching",
      image: null,
    };
  }
};