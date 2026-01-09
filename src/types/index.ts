export type FavoriteItem = {
    id?: number;
    key: string;
    productId: string;
    code: string;
    name: string;
    color: string;
    size: string;
    price: number;
    timestamp: string | number;
};

export type StockItem = {
    type: 'BPL' | 'SKU' | 'EXPRESS';
    stock: number;
    size: string;
    style: string;
};

export interface CrawledItem {
    product_id: string;
    code: string;
    name: string;
    color: string;
    size: string;
    price: string;
    min_price: string;
    origin_price?: string;
    stock: number;
    stock_status?: string;
    gender: string;
    sku_id: string;
}
