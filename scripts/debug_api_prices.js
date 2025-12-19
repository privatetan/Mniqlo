
const QUERY_PRODUCT_ID_URL = 'https://d.uniqlo.cn/p/hmall-sc-service/search/searchWithDescriptionAndConditions/zh_CN';

async function main() {
    const code = '478153';
    const body = {
        belongTo: 'pc',
        description: code,
        insiteDescription: code,
        pageInfo: { page: 1, pageSize: 24, withSideBar: 'Y' },
        priceRange: { low: 0, high: 0 },
        rank: 'overall',
        searchFlag: true,
    };

    try {
        const res = await fetch(QUERY_PRODUCT_ID_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(body),
        });

        const text = await res.text();
        console.log('Response status:', res.status);

        try {
            const data = JSON.parse(text);
            console.log('Is JSON: Yes');

            // Log the structure to find originPrice and minPrice
            const product = data.resp[1].searchList[0]; // Assuming structure based on typical Uniqlo API
            console.log('Product Data keys:', Object.keys(data));
            if (data.resp && data.resp[1] && data.resp[1].productList) {
                const p = data.resp[1].productList[0];
                console.log('Found product in productList');
                console.log('Product keys:', Object.keys(p));
                console.log('minPrice:', p.minPrice);
                console.log('originPrice:', p.originPrice);
                console.log('prices:', p.prices);
            } else {
                console.log('Could not navigate to product list. Dumping top level keys and resp array');
                if (data.resp) {
                    data.resp.forEach((item, index) => {
                        console.log(`resp[${index}] keys:`, Object.keys(item));
                        if (item.productList) {
                            console.log(`resp[${index}].productList[0] keys:`, Object.keys(item.productList[0]));
                            console.log(`Example item:`, JSON.stringify(item.productList[0], null, 2));
                        }
                    });
                }
            }

        } catch (e) {
            console.log('Is JSON: No');
            console.log('Response excerpt:', text.substring(0, 500));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
