'use client';

import { useState } from 'react';

export default function CrawlerPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCrawl = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch('/api/crawl', {
                method: 'POST',
            });
            const data = await res.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || 'Failed to crawl');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during crawling');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-8">
                        <h1 className="text-3xl font-extrabold text-white">Uniqlo Crawler Dashboard</h1>
                        <p className="mt-2 text-indigo-100 italic">Fetch and update in-stock products from Uniqlo</p>
                    </div>

                    <div className="p-8">
                        <div className="flex flex-col items-center">
                            <button
                                onClick={handleCrawl}
                                disabled={loading}
                                className={`w-full max-w-xs flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-xl text-white shadow-sm transition-all duration-200 ${loading
                                        ? 'bg-indigo-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Crawling In Progress...
                                    </>
                                ) : 'Start Uniqlo Crawl'}
                            </button>

                            <p className="mt-4 text-sm text-gray-500">
                                This will fetch product codes from the config JSON and update details & stock.
                            </p>
                        </div>

                        {error && (
                            <div className="mt-8 bg-red-50 border-l-4 border-red-400 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="mt-8 bg-green-50 border-l-4 border-green-400 p-4 animate-fadeIn">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-green-800">Crawl Successful!</h3>
                                        <div className="mt-2 text-sm text-green-700">
                                            <p>{result.message}</p>
                                            <p className="mt-1 font-semibold">Total Items with Stock Saved: {result.count}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-100 px-6 py-4 flex justify-between items-center text-xs text-gray-400">
                        <span>Antigravity Crawler Engine v1.0</span>
                        <span>Built for Mniqlo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
