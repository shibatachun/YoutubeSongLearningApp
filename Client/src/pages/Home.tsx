import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Cue, Video } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Home(){
  const [list, setList] = useState<Video[]>([]);
  const [vid, setVid] = useState('');
  const nav = useNavigate();

  useEffect(()=>{ api.list().then(setList); }, []);

  const onAdd = async () => {
    if (!vid.trim()) return;
    const v = await api.create({ id: vid.trim() });
    setList(prev => prev.some(x=>x.id===v.id) ? prev : [v, ...prev]);
    setVid('');
  };

  return (
    <div style={{padding:24}}>
      <h2>Video + Subtitles</h2>
      <input value={vid} onChange={e=>setVid(e.target.value)} placeholder="YouTube videoId (如 dQw4w9WgXcQ)" />
      <button onClick={onAdd} style={{marginLeft:8}}>添加</button>

      <ul style={{marginTop:16}}>
        {list.map(v =>
          <li key={v.id}>
            <a onClick={()=>nav(`/v/${v.id}`)} style={{cursor:'pointer'}}>{v.id}</a>
          </li>
        )}
        {list.length===0 && <p>暂时没有视频，先添加一个吧。</p>}
      </ul>
    </div>
  );
}