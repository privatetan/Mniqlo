
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

        const data = await res.json();

        if (data.resp && data.resp[1] && data.resp[1].length > 0) {
            const product = data.resp[1][0];
            console.log('Product Found:');
            console.log('code:', product.code);
            console.log('productCode:', product.productCode);
            console.log('name:', product.name);
        } else {
            console.log('Product not found in resp[1]');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
