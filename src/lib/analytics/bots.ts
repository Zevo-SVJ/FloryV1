/**
 * Telling a crawler from a person, imperfectly and on purpose.
 *
 * Two layers, and the first one does most of the work without any code here.
 *
 * A page view is recorded by a small script in the visitor's browser, and
 * almost nothing that crawls the web runs JavaScript. Googlebot does; the link
 * preview fetchers behind Instagram, X, Facebook, Discord, Slack and WhatsApp
 * do not — they read the HTML for an Open Graph tag and leave. That single
 * architectural choice removes the largest source of phantom views before this
 * file is consulted.
 *
 * The list below is the second layer, and it is what protects the click
 * endpoint, which is a plain link and therefore reachable without a browser.
 * It is deliberately a short list of unambiguous self-identification rather
 * than a heuristic: something calling itself a bot is one, and something
 * pretending not to be will get through. Chasing the second group is a
 * different product.
 *
 * The consequence is a mild undercount rather than an overcount, which is the
 * right way round — a creator making a decision on inflated numbers is worse
 * off than one making it on slightly conservative ones.
 */

const BOT = new RegExp(
  [
    // Anything that says so.
    "bot\\b",
    "\\bbots\\b",
    "spider",
    "crawler",
    "crawling",
    // Link preview fetchers, which are the ones that would otherwise land on
    // every page the moment a creator shares it.
    "facebookexternalhit",
    "facebookcatalog",
    "twitterbot",
    "slackbot",
    "slack-imgproxy",
    "discordbot",
    "telegrambot",
    "whatsapp",
    "linkedinbot",
    "pinterest",
    "redditbot",
    "skypeuripreview",
    "embedly",
    "quora link preview",
    "vkshare",
    "flipboard",
    "tumblr",
    "nuzzel",
    "bitlybot",
    "iframely",
    // Search and monitoring.
    "google-inspectiontool",
    "googleother",
    "adsbot",
    "mediapartners",
    "bingpreview",
    "yandex",
    "baiduspider",
    "duckduckgo",
    "applebot",
    "petalbot",
    "ahrefs",
    "semrush",
    "mj12",
    "dotbot",
    "screaming frog",
    // Tools and libraries, which are never a person reading a page.
    "curl/",
    "wget/",
    "python-requests",
    "python-urllib",
    "go-http-client",
    "java/",
    "okhttp",
    "axios/",
    "node-fetch",
    "got/",
    "headlesschrome",
    "phantomjs",
    "playwright",
    "puppeteer",
    "lighthouse",
    "pingdom",
    "uptimerobot",
    "monitoring",
    "preview",
    "scanner",
  ].join("|"),
  "i",
);

/**
 * Whether this request should count as a human visit.
 *
 * A missing user agent counts as a bot. Every real browser sends one, and the
 * requests that do not are overwhelmingly scripts — treating the absence as a
 * person is how an empty analytics table fills up with nothing.
 */
export function isBot(userAgent: string | null | undefined): boolean {
  const ua = userAgent?.trim();
  if (!ua) return true;
  return BOT.test(ua);
}
