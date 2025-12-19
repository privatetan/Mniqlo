export type FavoriteItem = {
    key: string;
    productId: string;
    code: string;
    name: string;
    color: string;
    size: string;
    price: number;
    timestamp: number;
};

export type StockItem = {
    type: 'BPL' | 'SKU' | 'EXPRESS';
    stock: number;
    size: string;
    style: string;
};
