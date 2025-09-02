import { useEffect, useState } from "react";

export function useStoredNumber(key: string, initial: number) {
  const [val, setVal] = useState<number>(() => {
    const v = localStorage.getItem(key);
    return v === null ? initial : Number(v);
  });
  useEffect(() => { localStorage.setItem(key, String(val)); }, [key, val]);
  return [val, setVal] as const;
}