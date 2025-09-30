export interface Cue { start: number; end: number; text: string }
export interface TimedText { lang: string; name?: string }
export interface Video {
  id: string;
  title?: string;
  thumb?: string;
  channel?: string;
  vttUrl?: string;
  cues?: Cue[];
  timedtext?: TimedText;
}