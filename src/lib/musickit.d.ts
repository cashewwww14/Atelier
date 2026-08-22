/**
 * The slice of MusicKit JS v3 this site actually uses.
 *
 * Apple ships no types for the CDN build, and pulling in a community package
 * for six methods would be more surface than it is worth.
 */
declare namespace MusicKit {
  interface Artwork {
    url: string;
    width?: number;
    height?: number;
  }

  interface MediaItem {
    id: string;
    title?: string;
    artistName?: string;
    albumName?: string;
    artwork?: Artwork;
    playbackDuration?: number;
  }

  /** 2 = playing, 3 = paused, per MusicKit's PlaybackStates enum. */
  type PlaybackState = number;

  interface MusicKitInstance {
    isAuthorized: boolean;
    nowPlayingItem: MediaItem | null;
    playbackState: PlaybackState;
    currentPlaybackTime: number;
    currentPlaybackDuration: number;
    authorize(): Promise<string>;
    unauthorize(): Promise<void>;
    setQueue(options: Record<string, unknown>): Promise<unknown>;
    play(): Promise<void>;
    pause(): Promise<void>;
    skipToNextItem(): Promise<void>;
    skipToPreviousItem(): Promise<void>;
    addEventListener(name: string, handler: () => void): void;
    removeEventListener(name: string, handler: () => void): void;
  }

  function configure(options: {
    developerToken: string;
    app: { name: string; build: string };
  }): Promise<MusicKitInstance>;

  function getInstance(): MusicKitInstance;

  /** Turns an artwork template URL into a concrete one. */
  function formatArtworkURL(artwork: Artwork, width: number, height: number): string;
}

interface Window {
  MusicKit?: typeof MusicKit;
}
