import React, { useState, useEffect, useRef } from "react";
import { useRive } from "@rive-app/react-canvas";
import animationFile1 from "./cleankeygeneration9.riv";
import animationFile2 from "./cleankeygeneration10.riv";
import "./SliderAnimation1.css"; // ← import the styles

export default function SliderAnimation1() {
  const ANIMATION_DURATION = 80;
  const SNAP_POINTS = [11, 19, 29, 39, 51, 59];
  const SNAP_THRESHOLD = 0.8;
  const SNAP_DELAY = 100;

  const animationSources = [
    { src: animationFile1, label: "Key Generation v1" },
    { src: animationFile2, label: "Key Generation v2" },
  ];

  const [fileIndex, setFileIndex] = useState(0);
  const [slider, setSlider] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const timeoutRef = useRef(null);

  const { rive, RiveComponent } = useRive({
    src: animationSources[fileIndex].src,
    autoplay: false,
    animations: ["Timeline 1"],
    onLoad: () => {
      if (rive) {
        rive.pause("Timeline 1");
        rive.scrub("Timeline 1", 0);
      }
    },
  });

  useEffect(() => {
    if (rive) {
      rive.scrub("Timeline 1", slider);
    }
  }, [slider, rive]);

  const handleSliderChange = (e) => {
    const value = Number(e.target.value);
    if (isSnapping) return;
    const snap = SNAP_POINTS.find((point) => Math.abs(point - value) <= SNAP_THRESHOLD);
    if (snap !== undefined) {
      setIsSnapping(true);
      setSlider(snap);
      timeoutRef.current = setTimeout(() => {
        setIsSnapping(false);
      }, SNAP_DELAY);
    } else {
      setSlider(value);
    }
  };

  const handleChangeFile = () => {
    const nextIndex = (fileIndex + 1) % animationSources.length;
    setSlider(0);
    setIsSnapping(false);
    setFileIndex(nextIndex);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto text-white">
      <div className="mb-2">Now showing: {animationSources[fileIndex].label}</div>

      <div className="animation-container">
        <div
          className="animation-slide-wrapper"
          style={{ transform: `translateX(-${fileIndex * 100}%)` }}
        >
          {animationSources.map((_, index) => (
            <div className="animation-slide" key={index}>
              {fileIndex === index && (
                <RiveComponent
                  key={index}
                  style={{ width: "100%", height: "100%" }}
                />
              )}
            </div>
          ))}
        </div>

        <button className="arrow-button" onClick={handleChangeFile}>
          ➤
        </button>
      </div>

      <div className="relative w-full my-4">
        <input
          type="range"
          min="0"
          max={ANIMATION_DURATION}
          step="0.01"
          value={slider}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer transition-all duration-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full"
        />

        <div className="absolute left-0 right-0 top-full flex justify-between mt-1 pointer-events-none">
          {SNAP_POINTS.map((point, idx) => {
            const labels = ["One", "Two", "Three", "Four", "Five", "Six"];
            return (
              <div
                key={point}
                style={{
                  left: `${(point / ANIMATION_DURATION) * 100}%`,
                  transform: "translateX(-50%) rotate(35deg)",
                  transformOrigin: "left",
                  position: "absolute",
                  color: "#fff",
                  fontSize: slider === point ? "1.5rem" : "1rem",
                  whiteSpace: "nowrap",
                  fontWeight: slider === point ? "bold" : "normal",
                }}
              >
                {labels[idx]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
