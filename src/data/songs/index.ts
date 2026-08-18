import type { SongDefinition } from '../../types/song';
import { pulseDrive } from './pulseDrive';
import { neonStatic } from './neonStatic';
import { binarySunset } from './binarySunset';
import { redline } from './redline';
import { overclock } from './overclock';

export const songs: SongDefinition[] = [pulseDrive, neonStatic, binarySunset, redline, overclock];

export function getSongById(id: string): SongDefinition | undefined {
  return songs.find((s) => s.id === id);
}
