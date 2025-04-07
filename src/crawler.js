import { storePageData } from "./db.js";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { URL } from "url";

// Configuration for crawling
const DEFAULT_CONFIG = {
  maxDepth: 3, // Maximum depth to crawl
  maxPagesPerSite: 50, // Maximum pages to crawl per website
  followExternalLinks: false, // Whether to follow links to external domains
  ignoreUrlPatterns: [
    // URL patterns to ignore
    /\.(jpg|jpeg|png|gif|svg|webp|css|js|pdf|zip|rar|xml|mp4|mp3|avi)$/i,
    /\?|\&(utm_|source=|ref=)/i,
    /#.*/,
  ],
  delayBetweenRequests: 1000, // Delay between requests in milliseconds
};

/**
 * Main function to crawl a list of websites
 * @param {string[]} websites - List of root website URLs to crawl
 * @param {Object} options - Optional configuration
 */
export async function crawlWebsites(websites, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  for (const url of websites) {
    console.log(`[Crawler] Starting deep crawl of ${url}`);
    try {
      await crawlWebsite(url, config);
    } catch (err) {
      console.error(`[Crawler] Failed to crawl ${url}:`, err.message);
    }
  }
}

/**
 * Deep crawl a single website
 * @param {string} startUrl - Root URL to start crawling from
 * @param {Object} config - Crawl configuration
 */
async function crawlWebsite(startUrl, config) {
  // Set to track visited URLs to avoid duplicates
  const visitedUrls = new Set();

  // Queue of URLs to crawl with their depth
  const urlQueue = [{ url: startUrl, depth: 0 }];

  // Counter for pages crawled in this site
  let pagesCrawled = 0;

  // Get the base domain to determine if links are internal or external
  const baseDomain = new URL(startUrl).hostname;

  while (urlQueue.length > 0 && pagesCrawled < config.maxPagesPerSite) {
    const { url, depth } = urlQueue.shift();

    // Skip if we've already visited this URL
    if (visitedUrls.has(url)) continue;

    // Mark as visited
    visitedUrls.add(url);

    try {
      // Add delay to be respectful to the website
      if (pagesCrawled > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.delayBetweenRequests)
        );
      }

      // Fetch the page
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; P2PCrawler/1.0; +https://github.com/noxtton/p2p-crawler)",
        },
      });

      // Skip non-HTML responses
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        console.log(`[Crawler] Skipping non-HTML content: ${url}`);
        continue;
      }

      const html = await res.text();

      // Store the page data
      await storePageData(url, html);
      pagesCrawled++;
      console.log(
        `[Crawler] Stored (${pagesCrawled}/${config.maxPagesPerSite}) ${url}`
      );

      // Don't extract links if we've reached max depth
      if (depth >= config.maxDepth) continue;

      // Extract links from the page
      const links = extractLinks(html, url);

      // Add valid links to the queue
      for (const link of links) {
        try {
          const linkUrl = new URL(link, url);
          const linkUrlString = linkUrl.href;

          // Skip already visited URLs
          if (visitedUrls.has(linkUrlString)) continue;

          // Skip URLs matching ignore patterns
          if (
            config.ignoreUrlPatterns.some((pattern) =>
              pattern.test(linkUrlString)
            )
          ) {
            continue;
          }

          // Check if external link
          const isExternalLink = linkUrl.hostname !== baseDomain;
          if (isExternalLink && !config.followExternalLinks) {
            continue;
          }

          // Add to queue
          urlQueue.push({
            url: linkUrlString,
            depth: depth + 1,
          });
        } catch (err) {
          // Invalid URL, skip it
        }
      }
    } catch (err) {
      console.error(`[Crawler] Failed to crawl ${url}:`, err.message);
    }
  }

  console.log(
    `[Crawler] Completed crawling ${startUrl} - Crawled ${pagesCrawled} pages`
  );
}

/**
 * Extract links from HTML content
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {string[]} Array of links
 */
function extractLinks(html, baseUrl) {
  try {
    const dom = new JSDOM(html);
    const links = Array.from(dom.window.document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter(
        (href) =>
          href && !href.startsWith("javascript:") && !href.startsWith("mailto:")
      );

    return links;
  } catch (err) {
    console.error(
      `[Crawler] Error extracting links from ${baseUrl}:`,
      err.message
    );
    return [];
  }
}
