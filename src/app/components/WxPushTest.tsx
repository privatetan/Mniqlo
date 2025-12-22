'use client';
import { useState } from 'react';

export default function WxPushTest() {
    const [title, setTitle] = useState('测试通知标题');
    const [content, setContent] = useState('这是一条测试内容，用于验证接口的消息发送功能');
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [wxUserId, setWxUserId] = useState('');
    const [username, setUsername] = useState('');
    const [notifyFrequency, setNotifyFrequency] = useState('60');

    const handleSaveWxUserId = async () => {
        if (!username) {
            alert('Username is required');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    wxUserId,
                    notifyFrequency: notifyFrequency ? parseInt(notifyFrequency, 10) : 60
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Saved successfully');
            } else {
                alert('Save failed: ' + data.message);
            }
        } catch (e) {
            alert('Error: ' + e);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const res = await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, username: username || undefined })
            });
            const data = await res.json();
            if (data.success) {
                setStatus(data.skipped ? `Skipped: ${data.message}` : 'Success: Message sent!');
            } else {
                setStatus(`Error: ${JSON.stringify(data)}`);
            }
        } catch (e) {
            setStatus(`Error: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 border rounded max-w-md mx-auto mt-10 bg-white shadow flex flex-col gap-6">
            <section>
                <h2 className="text-xl font-bold mb-4">Set User Wx Notification Config</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin"
                        className="w-full border p-2 rounded"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">WxUserID (Puid)</label>
                    <input
                        type="text"
                        value={wxUserId}
                        onChange={(e) => setWxUserId(e.target.value)}
                        placeholder="Paste puid here"
                        className="w-full border p-2 rounded"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Notify Frequency (Minutes)</label>
                    <input
                        type="number"
                        value={notifyFrequency}
                        onChange={(e) => setNotifyFrequency(e.target.value)}
                        placeholder="60"
                        className="w-full border p-2 rounded"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">每个商品的通知间隔（分钟）。默认 60。</p>
                </div>
                <button
                    onClick={handleSaveWxUserId}
                    disabled={loading}
                    className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                    Save Config to DB
                </button>
            </section>

            <hr />

            <section>
                <h2 className="text-xl font-bold mb-4">Test Send (via DB lookup)</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border p-2 rounded"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full border p-2 rounded h-24"
                    />
                </div>
                <button
                    onClick={handleSend}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Sending...' : 'Send Notification'}
                </button>
                {status && (
                    <div className={`mt-4 p-2 rounded ${status.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {status}
                    </div>
                )}
            </section>
        </div>
    );
}
