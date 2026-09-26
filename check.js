const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
    let executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (!fs.existsSync(executablePath)) {
        executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    
    console.log("Using browser at:", executablePath);
    
    const browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: true
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
