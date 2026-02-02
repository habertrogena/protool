import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';

export interface Lead {
  name: string;
  category: string;
  phone: string;
  location: string;
  website: string | null;
}

@Injectable()
export class GoogleMapsService {
  async scrape(query: string): Promise<Lead[]> {
    console.log(`🔍 Starting scrape for: "${query}"`);

    const browser = await chromium.launch({
      headless: false, // change to true in production
      slowMo: 50,
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    try {
      console.log('🌐 Navigating to Google Maps...');
      await page.goto(
        `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
        { waitUntil: 'domcontentloaded', timeout: 90000 },
      );

      // Accept cookies if present
      const acceptBtn = await page.$('button[aria-label="Accept all"]');
      if (acceptBtn) {
        await acceptBtn.click();
        console.log('🍪 Accepted cookies');
        await page.waitForTimeout(2000);
      }

      // Wait for first results
      await page.waitForSelector('[role="article"]', { timeout: 30000 });
      console.log('📍 First results loaded');

      // ===== IMPROVED SCROLLING LOGIC =====
      console.log('🔄 Starting aggressive scrolling to load more results...');

      let previousCount = 0;
      let sameCount = 0;
      let scrollAttempts = 0;
      const MAX_SCROLL_ATTEMPTS = 25; // Increased to 25 attempts

      while (sameCount < 5 && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
        const cards = await page.$$('[role="article"]');
        console.log(
          `   📍 Attempt ${scrollAttempts + 1}: Found ${cards.length} results so far...`,
        );

        if (cards.length === previousCount) {
          sameCount++;
          console.log(
            `   ⏳ No new results (same count for ${sameCount}/5 attempts)`,
          );
        } else {
          sameCount = 0;
          previousCount = cards.length;
          console.log(`   📈 New results! Total: ${previousCount}`);
        }

        // If we already have 100+ results, we can stop early
        if (cards.length >= 100) {
          console.log(`   🎯 Reached target of 100+ results!`);
          break;
        }

        // Scroll multiple times per attempt for better loading
        for (let i = 0; i < 3; i++) {
          await page.mouse.wheel(0, 3000); // Scroll 3000 pixels each time
          await page.waitForTimeout(1500); // Wait for content to load
        }

        scrollAttempts++;

        // Occasionally scroll up a bit to trigger loading
        if (scrollAttempts % 4 === 0) {
          await page.mouse.wheel(0, -1000);
          await page.waitForTimeout(1000);
          console.log(`   ↩️  Scrolled up briefly to trigger loading`);
        }

        // Try to click "More places" button if it appears
        try {
          const morePlacesBtn = await page.$('button:has-text("More places")');
          if (morePlacesBtn) {
            await morePlacesBtn.click();
            console.log('   📍 Clicked "More places" button');
            await page.waitForTimeout(3000);
            sameCount = 0; // Reset counter since new content loaded
          }
        } catch (e) {
          // Ignore if button not found or not clickable
        }

        // Wait a bit longer between major attempts
        await page.waitForTimeout(2000);
      }

      console.log(
        `📊 Finished scrolling after ${scrollAttempts} attempts, found ${previousCount} total results`,
      );
      // ===== END OF IMPROVED SCROLLING =====

      console.log('🔍 Extracting leads...');

      const leads = await page.evaluate(() => {
        // Try multiple selectors to catch all results
        const selectors = [
          '[role="article"]',
          '.Nv2PK', // Newer Google Maps class
          '.V0h1Ob-haAclf', // Another common class
          '.qBF1Pd', // Another selector
          '.section-result', // Older selector
        ];

        let cards: Element[] = [];
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            console.log(
              `Found ${elements.length} elements with selector: ${selector}`,
            );
            cards = elements;
            break;
          }
        }

        if (cards.length === 0) {
          // Fallback: get all divs with certain attributes
          cards = Array.from(
            document.querySelectorAll('div[jsaction][jscontroller]'),
          );
        }

        const leadArray: {
          name: string;
          category: string;
          phone: string;
          location: string;
          website: string | null;
        }[] = [];

        cards.forEach((card, index) => {
          try {
            // Try multiple selectors for name
            const nameSelectors = [
              '.fontHeadlineSmall',
              '.qBF1Pd',
              '.section-result-title',
              'h3',
              '[aria-label*="place"]',
              '.fontHeadlineSmall',
            ];

            let name = '';
            for (const selector of nameSelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent?.trim()) {
                name = el.textContent.trim();
                break;
              }
            }

            if (!name) {
              // Try to get name from aria-label or other attributes
              const ariaLabel = card.getAttribute('aria-label');
              if (ariaLabel) {
                name = ariaLabel.split('·')[0]?.trim() || '';
              }
            }

            // Try multiple selectors for category
            const categorySelectors = [
              '.fontBodyMedium',
              '.W4Efsd',
              '.section-result-details',
              '.UaQhfb-fontBodyMedium',
            ];

            let category = 'Unknown';
            for (const selector of categorySelectors) {
              const el = card.querySelector(selector);
              if (el?.textContent?.trim()) {
                category = el.textContent.trim();
                break;
              }
            }

            const text = card.textContent || '';

            // Kenya phone numbers - improved regex
            const phoneRegex =
              /(\+254\s?[17]\d{1,2}\s?\d{3}\s?\d{3}|0[17]\d{1,2}\s?\d{3}\s?\d{3}|\(0\d{2}\)\s?\d{3}\s?\d{3})/g;
            const phoneMatches = text.match(phoneRegex);
            const phone = phoneMatches
              ? phoneMatches[0].replace(/\s/g, '')
              : '';

            // Location detection - improved
            const locationRegex =
              /(\d+\s+[\w\s]+(?:St|Ave|Rd|Blvd|Way|Dr|Street|Avenue|Road)\.?)|([A-Za-z\s]+,\s*[A-Za-z\s]+)/i;
            const locationMatch = text.match(locationRegex);
            const location = locationMatch ? locationMatch[0] : 'Unknown';

            // Website detection - improved
            let website: string | null = null;
            const linkEls = card.querySelectorAll('a[href^="http"]');

            for (const link of Array.from(linkEls)) {
              const href = (link as HTMLAnchorElement).href;
              if (
                href &&
                !href.includes('google.com/maps') &&
                !href.includes('google.com/search') &&
                !href.includes('google.com/url') &&
                !href.includes('maps.google.com')
              ) {
                website = href;
                break;
              }
            }

            if (name && name.length > 1) {
              leadArray.push({
                name: name.substring(0, 200),
                category: category.substring(0, 200),
                phone: phone.substring(0, 20),
                location: location.substring(0, 200),
                website,
              });
            }
          } catch (error) {
            console.log(`Error processing card ${index}:`, error);
          }
        });

        // Remove duplicates by name (case insensitive)
        const uniqueLeads = Array.from(
          new Map(leadArray.map((l) => [l.name.toLowerCase(), l])).values(),
        );

        console.log(
          `Extracted ${uniqueLeads.length} unique leads from ${cards.length} cards`,
        );
        return uniqueLeads;
      });

      await browser.close();

      console.log(`✅ Extracted ${leads.length} unique leads`);

      // Log some sample leads
      if (leads.length > 0) {
        console.log('\n📋 Sample of first 5 leads:');
        leads.slice(0, 5).forEach((lead, i) => {
          console.log(`${i + 1}. ${lead.name} - ${lead.category}`);
        });
      }

      return leads;
    } catch (error) {
      console.error('❌ Error during scraping:', error);
      // Take screenshot for debugging
      try {
        await page.screenshot({ path: 'error-screenshot.png' });
        console.log('📸 Screenshot saved to error-screenshot.png');
      } catch (screenshotError) {
        console.log('Could not save screenshot:', screenshotError);
      }

      await browser.close();
      return [];
    }
  }
}
