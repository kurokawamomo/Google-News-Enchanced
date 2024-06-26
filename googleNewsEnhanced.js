(async () => {
    const GEMINI_API_KEY = 'PASTE YOUR GOOGLE GENERATIVE LANGUAGE API KEY HERE';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const getDecodedURL = (href) => {
        hrefParam = href.replace('./articles/', '').split('?')[0].split('_')[1];
        href = href.replace('./articles/', '').split('?')[0].split('_')[0];
        try {
            let decoded = hrefParam ? atob(href) + '?' + atob(hrefParam) : atob(href);
            const indexOfStartString = decoded.indexOf('http');
            const indexOfEndChar = decoded.indexOf('Ò') === -1 ? decoded.length : decoded.indexOf('Ò');
            if (indexOfEndChar < 5) return null;
            return decoded.substring(indexOfStartString, indexOfEndChar);
        } catch (e) {
            document.querySelector('#gemini-ticker').style.opacity = '0';
            return null;
        }
    };
    
    // ########## Forecast ##########
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            } else {
                reject(new Error("Geolocation is not supported by this browser."));
            }
        });
    }

    function getCityFromCoordinates(latitude, longitude) {
        const apiUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ja`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => data.city)
            .catch(error => {
                console.error('Error fetching the city data:', error);
                throw error;
            });
    }

    async function getCity(position) {
        try {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const city = await getCityFromCoordinates(latitude, longitude);
            return city;
        } catch (error) {
            document.querySelector('#gemini-ticker').style.opacity = '0';
            console.error('Error getting position or city:', error);
            throw error;
        }
    }


    const insertForecastElement = async (forecastLink) => {
        if (forecastLink) {
            const forecast = document.createElement('div');
            forecast.id = 'gemini-forecast';
            forecast.style.maxWidth = '320px';
            forecast.style.marginLeft = '16px';
            forecastLink.parentElement.parentElement.appendChild(forecast);
        }
    };

    const processForecast = async () => {
        const forecastLink = document.querySelector('a[href*="https://weathernews.jp/"]') || 
            document.querySelector('a[href*="https://weather.com/"]');
        if (!forecastLink) return;
        const position = await getCurrentPosition();
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        let geo = '全国' ;
        try {
            geo = await getCity(position);
        } catch (error) {
            geo = '全国' ;
        }
        console.log(`forecast: ${geo}`)
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                document.querySelector('#gemini-ticker').style.opacity = '1';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `URLに対し、次の手順に従ってステップバイステップで実行してください。
                            1 URLにアクセス出来なかった場合、結果を出力しない
                            2 ${(new Date).toString()}の天気に関する情報を抽出
                            3 どのように過ごすべきかを含め、200字程度に具体的に要約
                            4 結果のみ出力
                            ${geo}の情報: https://weathernews.jp/onebox/${latitude}/${longitude}/`
                            }],
                        }]
                    }),
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const reader = response.body.getReader();
                let result = '', done = false, decoder = new TextDecoder();
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) result += decoder.decode(value, { stream: true });
                }
                result += decoder.decode();

                const data = JSON.parse(result);
                let summary = (data.candidates[0]?.content?.parts[0]?.text || '').replace(/\*\*/g, '').replace(/##/g, '');
                if (summary.length < 80) {
                    console.error('Summary is too short');
                    return;
                } 
                console.log(`forecast: ${summary}`);

                insertForecastElement(forecastLink);
                let targetElement = document.querySelector('#gemini-forecast');
                if (!targetElement) {
                    console.error('No target element found for summary insertion');
                    return;
                }

                let displayText = targetElement.textContent + ' ';
                for (const char of summary) {
                    document.querySelector('#gemini-ticker').style.opacity = '1';
                    displayText += char + '●';
                    targetElement.textContent = displayText;
                    await delay(2);
                    displayText = displayText.slice(0, -1);
                    document.querySelector('#gemini-ticker').style.opacity = '0';
                }
                targetElement.textContent = displayText;
                return;
            } catch (error) {
                document.querySelector('#gemini-ticker').style.opacity = '0';
                await delay(5000);
                console.error('Error:', error);
            }
        }
    };

    // ########## Highlight ##########
    const insertHighlightElement = () => {
        const cWizElements = document.querySelectorAll('main>c-wiz>c-wiz, main>div>c-wiz, main>div>div>c-wiz');
        const validHolders = Array.from(document.querySelectorAll('c-wiz>section, c-wiz>section>div>div')).filter(element => {
            const backgroundColor = getComputedStyle(element).backgroundColor;
            return backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent';         
        });
        if (cWizElements.length >= 2) {
            const targetInsertPosition = cWizElements[1];
            const backgroundColor = getComputedStyle(validHolders[0]).backgroundColor;
            const cWizElement = document.createElement('c-wiz');
            cWizElement.id = 'gemini-highlight';
            cWizElement.style.marginTop = '10px';
            cWizElement.style.marginBottom = '50px';
            cWizElement.style.width = '100%';
            cWizElement.innerHTML = `
                <section>
                    <div style='
                        font-size: 1.5em; 
                        margin-bottom: 10px; 
                        -webkit-background-clip: text!important; 
                        -webkit-text-fill-color: transparent; 
                        background: linear-gradient(to right, #4698e2, #c6657b); 
                        width: fit-content;' id='gemini-highlight-header'>
                        ✦ Geminiによるハイライト
                    </div>
                     <div style='
                        background-color: ${backgroundColor}; 
                        padding: 16px; 
                        border-radius: 15px;' id='gemini-highlight-content'>
                    </div>
                </section>`;
            targetInsertPosition.parentElement.insertBefore(cWizElement, targetInsertPosition);
        }
    };

    const processHighlight = async (urls) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                document.querySelector('#gemini-ticker').style.opacity = '1';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `次に示す最新のニュースの中から最も重要なニュース1つに対し5文で深堀りをどうぞ。 ${urls}`
                            }],
                        }]
                    }),
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const reader = response.body.getReader();
                let result = '', done = false, decoder = new TextDecoder();
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) result += decoder.decode(value, { stream: true });
                }
                result += decoder.decode();

                const data = JSON.parse(result);
                let summary = (data.candidates[0]?.content?.parts[0]?.text || '').replace(/\*\*/g, '').replace(/##/g, '');
                console.log(`highlights: ${summary}`);

                insertHighlightElement();
                let targetElement = document.querySelector('#gemini-highlight-content');
                if (!targetElement) {
                    console.error('No target element found for summary insertion');
                    return;
                }
            
                let displayText = targetElement.textContent + ' ';
                for (const char of summary) {
                    document.querySelector('#gemini-ticker').style.opacity = '1';
                    displayText += char + '●';
                    targetElement.textContent = displayText;
                    await delay(2);
                    displayText = displayText.slice(0, -1);
                    document.querySelector('#gemini-ticker').style.opacity = '0';
                }
                targetElement.textContent = displayText;
                return;
            } catch (error) {
                document.querySelector('#gemini-ticker').style.opacity = '0';
                await delay(5000);
                console.error('Error:', error);
            }
        }
    };

    // ########## Article ##########
    const processArticle = async (article, links, title, url) => {
        try {
            document.querySelector('#gemini-ticker').style.opacity = '1';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `URLに対し、次の手順に従ってステップバイステップで実行してください。
                            1 URLにアクセス出来なかった場合、結果を出力しない
                            2 200字程度に学者のように具体的に要約
                            3 結果のみを出力
                            ${title}のURL: ${url}`
                        }],
                    }]
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            let result = '', done = false, decoder = new TextDecoder();
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) result += decoder.decode(value, { stream: true });
            }
            result += decoder.decode();

            const data = JSON.parse(result);
            let summary = (data.candidates[0]?.content?.parts[0]?.text || '').replace(/\*\*/g, '').replace(/##/g, '');
            console.log(`summary: ${summary}`);

            let targetElement = article.querySelector('time') || article.querySelector('span');
            if (!targetElement || (targetElement.tagName !== 'TIME' && targetElement.tagName !== 'SPAN')) return;
            if (targetElement.tagName === 'TIME') {
                targetElement.style.whiteSpace = 'wrap';
                targetElement.style.alignSelf = 'end';
                targetElement.style.marginRight = '3px';
                targetElement.parentElement.style.height = 'auto';
            } else {
                targetElement.style.marginRight = '-60px';
            }
            links.forEach(link => link.setAttribute('href', url));

            let displayText = targetElement.textContent + ' ';
            for (const char of summary) {
                document.querySelector('#gemini-ticker').style.opacity = '1';
                displayText += char + '●';
                targetElement.textContent = displayText;
                await delay(2);
                displayText = displayText.slice(0, -1);
                document.querySelector('#gemini-ticker').style.opacity = '0';
            }
            targetElement.textContent = displayText;
        } catch (error) {
            document.querySelector('#gemini-ticker').style.opacity = '0';
            await delay(5000);
            console.error('Error:', error);
        }
    };

    const throttledProcessArticle = async (article, links, title, url, interval) => {
        await delay(interval);
        return processArticle(article, links, title, url);
    };

    // ########## Ticker ##########
    const insertTickerElement = () => {
        if (document.querySelector('#gemini-ticker')) return;
        const ticker = document.createElement('div');
        ticker.id = 'gemini-ticker';
        ticker.style.position = 'fixed';
        ticker.style.right = '20px';
        ticker.style.bottom = '10px';
        ticker.style.fontSize = '1.5em';
        ticker.style.color = '#77777777';
        ticker.style.transition = 'opacity .3s';
        ticker.style.zIndex = '100';
        ticker.innerHTML = '✦';
        document.querySelector('body').appendChild(ticker);
    };

    // ########## Main ##########
    await delay(1000);
    insertTickerElement();
    for (let j = 0; j < 30 ; j++) {
        console.log(`######## attempt: ${j+1} ########`)
        document.querySelector('#gemini-ticker').style.opacity = '1';
        const articles = Array.from(document.querySelectorAll('article'));
        
        if (!document.querySelector('#gemini-forecast')) {
            await processForecast();
            await delay(1000);
        }
        
        const allLinks = Array.from(document.querySelectorAll('a[href*="./articles/"]'));
        if (allLinks.length == 0) break;

        const promises = articles.map((article, i) => {
            const links = Array.from(article.querySelectorAll('a[href*="./articles/"]'));
            const targetLink = links.length > 1 ? links[links.length - 1] : links[0];
            if (!targetLink) return Promise.resolve();

            const href = targetLink.getAttribute('href');
            const title = targetLink.textContent;
            const url = getDecodedURL(href);
            console.log(`title: ${title}`);
            console.log(`url: ${url}`);
            if (!url) return Promise.resolve();

            return throttledProcessArticle(article, links, title, url, i * 1000);
        });

        await Promise.all(promises);
        
        if (!document.querySelector('#gemini-highlight')) {
            const urls = articles.map(article => {
                const links = Array.from(article.querySelectorAll('a[href*="./articles/"]'));
                const targetLink = links.length > 1 ? links[links.length - 1] : links[0];
                if (!targetLink) return null;
                const href = targetLink.getAttribute('href');
                const title = targetLink.textContent;
                const url = getDecodedURL(href);
                return `${title}: ${url}`;
            }).filter(Boolean).join(' ');
            console.log(`highlight: ${urls}`)
            await processHighlight(urls);
            await delay(1000);
        }

        document.querySelector('#gemini-ticker').style.opacity = '0';
        await delay(1000);
    }
    document.querySelector('#gemini-ticker').style.opacity = '0';
    console.log('######## Ended up all ########')
})();
