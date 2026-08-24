import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Mic } from 'lucide-react';

interface AudioMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isMine: boolean;
  senderPhotoURL?: string;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  isMine,
  senderPhotoURL,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = audioUrl;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate simulated or reactive waveform bars
  const progressRatio = totalDuration > 0 ? currentTime / totalDuration : 0;
  const barHeights = [40, 65, 30, 85, 50, 95, 70, 45, 90, 60, 35, 75, 55, 80, 40, 65, 30, 85];

  return (
    <div className="flex items-center gap-3 p-1.5 min-w-[220px] sm:min-w-[260px]">
      {/* Sender Avatar with Mic badge */}
      {senderPhotoURL && (
        <div className="relative flex-shrink-0">
          <img
            src={senderPhotoURL}
            alt="Audio Sender"
            className="w-9 h-9 rounded-full object-cover border border-white/20"
          />
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-[#18191a] flex items-center justify-center text-white">
            <Mic className="w-2.5 h-2.5" />
          </span>
        </div>
      )}

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 shadow-md ${
          isMine
            ? 'bg-white text-[#0084FF] hover:bg-zinc-100'
            : 'bg-[#0084FF] text-white hover:bg-[#0073e6]'
        }`}
        title={isPlaying ? 'Pausar áudio' : 'Ouvir mensagem de voz'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0 relative">
        <div className="flex items-center gap-0.5 h-6">
          {barHeights.map((h, idx) => {
            const isPlayed = idx / barHeights.length <= progressRatio;
            return (
              <div
                key={idx}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? isMine
                      ? 'bg-white'
                      : 'bg-[#0084FF]'
                    : isMine
                    ? 'bg-white/40'
                    : 'bg-zinc-600'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        {/* Hidden Range Slider for interactive scrub */}
        <input
          type="range"
          min={0}
          max={totalDuration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-4 opacity-0 -mt-2 cursor-pointer absolute top-1 left-0 z-10 touch-pan-x"
        />

        {/* Time and Speed */}
        <div className="flex items-center justify-between text-[10px] font-mono opacity-90 select-none">
          <span>{formatTime(currentTime > 0 ? currentTime : totalDuration)}</span>
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className={`px-1.5 py-0.2 rounded font-bold text-[9px] transition-colors ${
              isMine
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            }`}
            title="Velocidade de reprodução"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
