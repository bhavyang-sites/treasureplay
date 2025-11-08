import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const FilteredVideoPlayer = () => {
  const videoRef = useRef(null);

  const [videoMetadata, setVideoMetadata] = useState([]); // 📦 All video entries
  const [selectedVideo, setSelectedVideo] = useState(null); // 🎯 Currently selected video
  const [skipMap, setSkipMap] = useState([]); // ⏭️ Filter segments
  const [showPlayer, setShowPlayer] = useState(false); // 🎬 Modal open flag
  const [familyMode, setFamilyMode] = useState(true); // 👨‍👩‍👧‍👦 Filter toggle
  const [showPlayPrompt, setShowPlayPrompt] = useState(true); // ▶️ Overlay state

  const familyFilterEnabledVideos = ['adult', 'rapid_merged']; // ✅ Videos that support Family Mode

  // 🧲 Load metadata (once)
  useEffect(() => {
    fetch('/video_metadata.json')
      .then(res => res.json())
      .then(data => setVideoMetadata(data))
      .catch(err => console.error('Failed to load video metadata:', err));
  }, []);

  // 📦 Load skip map when video is selected
  useEffect(() => {
    if (!selectedVideo) return;

    fetch(selectedVideo.skipMapUrl)
      .then(res => res.json())
      .then(map => setSkipMap(map))
      .catch(err => console.error('Failed to load skip map:', err));
  }, [selectedVideo]);

  useEffect(() => {
  // 🚫 Disable background scroll when fullscreen player is active
  if (showPlayer) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }

  // 🧹 Cleanup when component unmounts
  return () => {
    document.body.style.overflow = 'auto';
  };
}, [showPlayer]);


  // ⏭️ Scene filtering logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !familyMode) return;

    const onTimeUpdate = () => {
      const currentTime = video.currentTime;
      for (const segment of skipMap) {
        if (currentTime >= segment.start && currentTime < segment.end) {
          video.currentTime = segment.end;
          break;
        }
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [skipMap, familyMode]);

  return (
    <>
      {/* 🎞️ Thumbnail gallery */}
      <div className="p-4">
        <h1 className="text-4xl font-bold mb-6">Filtered Video Player</h1>
        <div className="flex flex-wrap gap-4 mb-6">
          {videoMetadata.map((video) => (
            <div
              key={video.id}
              className="cursor-pointer text-center"
              onClick={() => {
                setSelectedVideo(video);
                setShowPlayer(true);
                setShowPlayPrompt(true);
              }}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                width="200"
                className="rounded shadow hover:scale-105 transition-transform"
              />
              <p className="mt-2">{video.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 🎬 Fullscreen Modal using portal */}
      {showPlayer && selectedVideo && createPortal(
  <div
    // 🖼️ Fullscreen overlay container centered using Flexbox
    className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-90 z-[9999] flex items-center justify-center"
  >
    {/* ❌ Close Button */}
    <button
      onClick={() => setShowPlayer(false)}
      className="absolute top-4 right-6 text-white text-3xl font-bold z-50"
    >
      ✖
    </button>

    {/* 🎬 Responsive Video Container */}
    <div className="relative w-[90vw] max-w-[960px] max-h-[80vh]">
      <video
        key={selectedVideo.id}
        ref={videoRef}
        controls
        className="w-full h-auto max-h-[80vh] rounded shadow-lg"
      >
        <source src={selectedVideo.videoUrl} type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>

      {/* ▶️ Overlay Play Prompt */}
      {showPlayPrompt && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded">
          <button
            onClick={() => {
              setShowPlayPrompt(false);
              videoRef.current?.play();
            }}
            className="bg-white text-black w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-md hover:bg-gray-200 transition"
          >
            ▶
          </button>
        </div>
      )}

      {/* 👨‍👩‍👧‍👦 Family Mode Toggle (for eligible videos only) */}
      {familyFilterEnabledVideos.includes(selectedVideo.id) && (
        <div className="mt-4 text-white text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={familyMode}
            onChange={(e) => setFamilyMode(e.target.checked)}
          />
          <span>Family Mode {familyMode ? 'ON' : 'OFF'}</span>
        </div>
      )}
    </div>
  </div>,
  document.body
)}
    </>
  );
};

export default FilteredVideoPlayer;
