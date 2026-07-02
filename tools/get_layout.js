const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://designbymanvir.com/#case-amazon', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const styles = await page.evaluate(() => {
    const getS = (el) => {
      if (!el) return null;
      const c = window.getComputedStyle(el);
      return {
        padding: c.padding, margin: c.margin, width: c.width, maxWidth: c.maxWidth,
        display: c.display, gridTemplateColumns: c.gridTemplateColumns, gap: c.gap,
        boxSizing: c.boxSizing
      };
    };
    
    return {
      panel: getS(document.querySelector('.cs-panel') || document.querySelector('.case-study') || document.querySelector('article')),
      hero: getS(document.querySelector('.cs-panel header') || document.querySelector('.case-study header') || document.querySelector('header')),
      title: getS(document.querySelector('h1')),
      notesWrap: getS(document.querySelector('.grid') || document.querySelector('.notes')),
      note: getS(document.querySelector('.note') || document.querySelector('.grid > div'))
    };
  });

  fs.writeFileSync('layout.json', JSON.stringify(styles, null, 2));
  await browser.close();
})();
