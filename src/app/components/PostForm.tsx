"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PostForm(){
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent){
    e.preventDefault()
    setLoading(true)
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    })
    setTitle('')
    setContent('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="form-row">
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
      <input placeholder="Content" value={content} onChange={e => setContent(e.target.value)} />
      <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add'}</button>
    </form>
  )
}
