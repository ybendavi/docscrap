const puppeteer = require('puppeteer');
const fs = require('fs');
const os = require('os');
const { disconnect } = require('process');

let datas = {};

(async () => {
    const osPlatform = os.platform(); // possible values are: 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
    console.log('Scraper running on platform: ', osPlatform);
    let executablePath;

    // launch browser
    if (/^win/i.test(osPlatform)) {
      executablePath = '';
    } else if (/^linux/i.test(osPlatform)) {
      executablePath = '/usr/bin/google-chrome';
    }
        const browser = await puppeteer.launch({
            executablePath: executablePath,
            headless: false
        });
    // new page
    const page = await browser.newPage();
    // get cookies
    if (fs.existsSync('cookies.json')) {
	    cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
	    if (cookies) { await page.setCookie(...cookies) };
	  }
    // navigate to doctolib
    page.goto('https://pro.doctolib.fr');
    // trigger navigations
    page.on('framenavigated', async frame => {
      let url = frame.url();
      const input = await page.$('input[name="password"]');
    // look for the page to scrap
      if (url.startsWith('https://pro.doctolib.fr/calendar/today/mont') && !input) {

    await page.setRequestInterception(true);

      page.on('request', interceptedRequest => {
    // verify if the request is a json
    if (interceptedRequest.resourceType() === 'xhr' && interceptedRequest.headers().accept.includes('application/json')) {
      interceptedRequest.continue();
        } else {
      interceptedRequest.abort();
        }
    });

  page.on('response', async response => {
    //verify if the response is json
    const contentType = response.headers()['content-type'];
    if (contentType && contentType.includes('application/json')) {
      const answer = await response.json();
      if (answer.data && Array.isArray(answer.data)) {
        const data = answer.data[0];
    // verify if the data is about a patient
        if (data.patient && typeof data.patient === 'object') {
    // save it
            datas[data.id] = data;
        }
      }
    }
  });
  const timeout = 6000;
  setTimeout(async () => {
    // write data into file before sending it
    fs.writeFile('output.json', JSON.stringify(datas, null, 2), (err) => {
        if (err) {
                console.error('Erreur lors de l\'écriture du fichier :', err);
            return;
        }
        console.log('Les données ont été enregistrées dans output.json');
      });
      await browser.close();
  }, timeout);

}

});

 
})();
